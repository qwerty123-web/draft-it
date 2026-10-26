#!/usr/bin/env python3
"""
DraftIt lawyer check: Karnataka State Bar Council (KSBC) member directory.

Opens the KSBC website in a hidden (headless) browser, searches the
"MEMBERSHIP DETAILS" box by roll (enrolment) number, reads the result and
checks that the name on the record matches the name the lawyer gave us.

  python verify_ksbc.py --roll "KAR/1234/2016" --name "Meera Iyer"
  python verify_ksbc.py --csv lawyers.csv --out results.csv
  python verify_ksbc.py --discover          # print the search form's fields
  python verify_ksbc.py --show ...          # watch the browser instead of hiding it

Result per lawyer: VERIFIED, NAME_MISMATCH, NOT_FOUND or ERROR, with the
record found, a name-match score, and a screenshot of the result page as proof
(its SHA-256 is printed, like evidence in DraftIt).

The tool only reads the public directory. It waits between searches and makes
one search per lawyer.
"""
import argparse, asyncio, csv, datetime as dt, difflib, hashlib, json, os, re, sys
from pathlib import Path

try:
    from playwright.async_api import async_playwright, TimeoutError as PWTimeout
except ImportError:  # pragma: no cover
    sys.exit("Playwright is missing. Run:  pip install playwright  then  playwright install chromium")

PORTAL = "https://ksbc.org.in/index.php"

# Where the search box lives. The tool finds fields by their visible labels, so it keeps
# working if the site renames its inputs. If the site changes, run --discover and put the
# exact CSS selectors here (leave a value as None to keep finding it by label).
SELECTORS = {
    "roll_input": None,      # e.g. "input[name='rollno']"
    "name_input": None,      # e.g. "input[name='name']"
    "search_button": None,   # e.g. "input[type='submit'][value='Search']"
}
ROLL_LABEL = re.compile(r"roll\s*no", re.I)
NAME_LABEL = re.compile(r"^\s*name\s*$", re.I)
SEARCH_TEXT = re.compile(r"search", re.I)

WAIT_BETWEEN = 3.0   # seconds between lawyers, to be polite to the portal
TIMEOUT_MS = 20000
UA = "DraftIt-LawyerCheck/1.0 (+https://github.com/qwerty123-web/draft-it)"

# ---------------------------------------------------------------------------- names
TITLES = {"ADV", "ADVOCATE", "SRI", "SHRI", "SMT", "KUM", "KUMARI", "MR", "MRS", "MS", "DR", "MISS"}

def norm_name(s: str) -> list[str]:
    s = re.sub(r"[^A-Za-z\s]", " ", s or "").upper()
    return [w for w in s.split() if w not in TITLES]

def name_score(given: str, found: str) -> float:
    """0 to 1. Full words must match closely; a single letter matches a word with that initial."""
    a, b = norm_name(given), norm_name(found)
    if not a or not b:
        return 0.0
    def word_match(w, pool):
        best = 0.0
        for p in pool:
            if len(w) == 1 or len(p) == 1:
                best = max(best, 1.0 if w[0] == p[0] else 0.0)
            else:
                r = difflib.SequenceMatcher(None, w, p).ratio()
                best = max(best, r if r >= 0.85 else 0.0)  # IYER vs IYENGAR is a different person; small typos are fine
        return best
    full_a = [w for w in a if len(w) > 1]
    full_b = [w for w in b if len(w) > 1]
    if not full_a or not full_b:
        return 0.0
    # every full word the lawyer gave must be on the record, and most record words must be covered
    cover_a = sum(word_match(w, b) for w in full_a) / len(full_a)
    cover_b = sum(word_match(w, a) for w in full_b) / len(full_b)
    return round(min(cover_a, 1.0) * 0.6 + min(cover_b, 1.0) * 0.4, 3)

def roll_variants(roll: str) -> list[str]:
    """KAR/1234/2016 is also searched as KAR/1234/16 and 1234, since sites differ."""
    roll = re.sub(r"\s+", "", roll.upper())
    out = [roll]
    m = re.match(r"^([A-Z]{1,4})/(\d{1,6})(?:/([A-Z]))?/(\d{2,4})$", roll)
    if m:
        st, num, mid, yr = m.groups()
        mid = f"/{mid}" if mid else ""
        n0, n4 = num.lstrip("0") or "0", num.lstrip("0").zfill(4)
        for n in dict.fromkeys([num, n4, n0]):
            out.append(f"{st}/{n}{mid}/{yr}")
            if len(yr) == 4:
                out.append(f"{st}/{n}{mid}/{yr[2:]}")
        out.append(n0)
    return list(dict.fromkeys(out))

def _flat(s: str) -> str:
    """Upper case, no spaces, no leading zeros inside a roll number (KAR/0042/2010 = KAR/42/2010)."""
    return re.sub(r"/0+(\d)", r"/\1", re.sub(r"\s+", "", (s or "").upper()))

def roll_in_text(roll: str, text: str) -> bool:
    """Full roll number (KAR/1234/2016 or KAR/1234/16) anywhere in the text. A bare number alone never counts."""
    t = _flat(text)
    return any(_flat(v) in t for v in roll_variants(roll) if not v.isdigit())

def roll_in_row(roll: str, rec: dict) -> bool:
    """A table row holds this lawyer if a cell shows the full roll number, or a cell is exactly the number."""
    cells = [_flat(v) for v in rec.values()]
    full = [v for v in roll_variants(roll) if not v.isdigit()]
    bare = [v for v in roll_variants(roll) if v.isdigit()]
    return any(any(_flat(f) in c for f in full) for c in cells) or any(c.lstrip("0") in bare for c in cells)

# ---------------------------------------------------------------------------- page helpers
async def field_after_label(page, label_re, kind="input"):
    """The first text box that follows a visible label matching label_re."""
    for el in await page.query_selector_all("label, td, th, span, div, p, b, strong"):
        try:
            txt = (await el.inner_text()).strip()
        except Exception:
            continue
        if not txt or len(txt) > 40 or not label_re.search(txt):
            continue
        fid = await el.get_attribute("for")
        if fid:
            target = await page.query_selector(f"#{fid}")
            if target:
                return target
        h = await el.evaluate_handle("""(el) => {
            const ok = n => n && n.matches && n.matches("input:not([type=hidden]):not([type=submit]):not([type=button]):not([type=checkbox]):not([type=radio]), textarea");
            let n = el.querySelector("input, textarea"); if (ok(n)) return n;
            const all = [...document.querySelectorAll("input, textarea")];
            return all.find(i => ok(i) && (el.compareDocumentPosition(i) & Node.DOCUMENT_POSITION_FOLLOWING)) || null; }""")
        target = h.as_element()
        if target:
            return target
    return None

async def search_button_after(page, anchor):
    h = await anchor.evaluate_handle("""(a) => {
        const re = /search/i;
        const all = [...document.querySelectorAll("button, input[type=submit], input[type=button], a")];
        return all.find(b => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING)
            && re.test((b.innerText || "") + " " + (b.value || ""))) || null; }""")
    return h.as_element()

async def read_records(page):
    """Every table row on the page as {header: cell}, plus the page text."""
    rows = await page.evaluate("""() => {
        const out = [];
        for (const t of document.querySelectorAll("table")) {
            const trs = [...t.querySelectorAll("tr")]; if (trs.length < 2) continue;
            let head = [...trs[0].querySelectorAll("th,td")].map(c => c.innerText.trim());
            for (const tr of trs.slice(1)) {
                const cells = [...tr.querySelectorAll("td,th")].map(c => c.innerText.trim());
                if (!cells.some(Boolean)) continue;
                const rec = {};
                cells.forEach((c, i) => rec[head[i] || ("col" + (i + 1))] = c);
                out.push(rec);
            }
        }
        return out; }""")
    text = await page.inner_text("body")
    return rows, text

def pick_name(rec: dict) -> str:
    for k, v in rec.items():
        lk = k.lower()
        if "name" in lk and not any(x in lk for x in ("father", "husband", "guardian", "place", "bar")):
            return v
    return max(rec.values(), key=lambda v: len(re.findall(r"[A-Za-z]{2,}", v or "")), default="")

# ---------------------------------------------------------------------------- one lawyer
async def verify_one(ctx, roll: str, name: str, proof_dir: Path, portal: str) -> dict:
    res = {"roll": roll, "name_given": name, "status": "ERROR", "name_found": "", "score": 0.0,
           "record": {}, "portal": portal, "checked_at": dt.datetime.now().isoformat(timespec="seconds"),
           "proof": "", "proof_sha256": "", "note": ""}
    async def open_form():
        pg = await ctx.new_page()
        await pg.goto(portal, wait_until="domcontentloaded", timeout=TIMEOUT_MS)
        box = (await pg.query_selector(SELECTORS["roll_input"])) if SELECTORS["roll_input"] else await field_after_label(pg, ROLL_LABEL)
        b = None
        if box:
            b = (await pg.query_selector(SELECTORS["search_button"])) if SELECTORS["search_button"] else await search_button_after(pg, box)
        return pg, box, b
    try:
        for variant in roll_variants(roll):
            page, roll_box, btn = await open_form()
            if not roll_box:
                res["note"] = "Could not find the Roll No box. Run --discover and set SELECTORS."
                return res
            if not btn:
                res["note"] = "Could not find the Search button. Run --discover and set SELECTORS."
                return res
            await roll_box.fill(variant)
            pages_before = len(ctx.pages)
            try:
                async with page.expect_navigation(wait_until="domcontentloaded", timeout=8000):
                    await btn.click()
            except PWTimeout:
                pass  # results may load in place or in a new tab
            await page.wait_for_timeout(1500)
            target = ctx.pages[-1] if len(ctx.pages) > pages_before else page
            try:
                await target.wait_for_load_state("networkidle", timeout=8000)
            except PWTimeout:
                pass
            rows, text = await read_records(target)
            hits = [r for r in rows if roll_in_row(roll, r)]
            if hits or roll_in_text(roll, text):
                shot = proof_dir / f"ksbc_{re.sub(r'[^A-Za-z0-9]+', '_', roll)}_{dt.datetime.now():%Y%m%d_%H%M%S}.png"
                await target.screenshot(path=str(shot), full_page=True)
                res["proof"] = str(shot)
                res["proof_sha256"] = hashlib.sha256(shot.read_bytes()).hexdigest()
                rec = hits[0] if hits else {}
                found = pick_name(rec) if rec else ""
                if not found:  # no table: take the line that holds the roll number
                    for line in text.splitlines():
                        if roll_in_text(roll, line):
                            found = line.strip(); break
                res.update(record=rec, name_found=found, score=name_score(name, found))
                res["status"] = "VERIFIED" if res["score"] >= 0.85 else "NAME_MISMATCH"
                if res["status"] == "NAME_MISMATCH":
                    res["note"] = "Roll number exists, but the name on the record does not match."
                return res
            for pg in list(ctx.pages):
                await pg.close()
        res["status"] = "NOT_FOUND"
        res["note"] = "No record with this roll number in the KSBC directory."
        return res
    except Exception as e:  # network down, site changed, captcha, etc.
        res["note"] = f"{type(e).__name__}: {e}"[:300]
        return res
    finally:
        for p in ctx.pages:
            await p.close()

# ---------------------------------------------------------------------------- discover
async def discover(ctx, portal):
    page = await ctx.new_page()
    await page.goto(portal, wait_until="domcontentloaded", timeout=TIMEOUT_MS)
    info = await page.evaluate("""() => [...document.forms].map((f, i) => ({form: i, action: f.action, method: f.method,
        fields: [...f.elements].map(e => ({tag: e.tagName.toLowerCase(), type: e.type, name: e.name, id: e.id,
            placeholder: e.placeholder || "", value: (e.value || "").slice(0, 30),
            label: (e.labels && e.labels[0] ? e.labels[0].innerText : "").trim()}))}))""")
    print(json.dumps(info, indent=2))
    box = await field_after_label(page, ROLL_LABEL)
    if box:
        desc = await box.evaluate("e => e.outerHTML")
        print("\nRoll No box found by label:", desc[:200])
        btn = await search_button_after(page, box)
        if btn:
            print("Search button found:", (await btn.evaluate("e => e.outerHTML"))[:200])
    Path("ksbc_home.html").write_text(await page.content(), encoding="utf-8")
    print("\nSaved the page as ksbc_home.html. Put exact selectors in SELECTORS if needed.")

# ---------------------------------------------------------------------------- main
async def main():
    ap = argparse.ArgumentParser(description="Verify Karnataka advocates in the KSBC member directory.")
    ap.add_argument("--roll", help="Enrolment / roll number, e.g. KAR/1234/2016")
    ap.add_argument("--name", help="Name as the lawyer gave it")
    ap.add_argument("--csv", help="CSV with columns: name, roll")
    ap.add_argument("--out", default="ksbc_results.csv", help="Where to write CSV results")
    ap.add_argument("--json", action="store_true", help="Print results as JSON")
    ap.add_argument("--discover", action="store_true", help="Print the portal's form fields and exit")
    ap.add_argument("--show", action="store_true", help="Show the browser window")
    ap.add_argument("--portal", default=PORTAL, help=argparse.SUPPRESS)  # for testing against a copy
    ap.add_argument("--proof-dir", default="proof", help="Folder for result screenshots")
    a = ap.parse_args()

    proof = Path(a.proof_dir); proof.mkdir(exist_ok=True)
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=not a.show)
        ctx = await browser.new_context(user_agent=UA, viewport={"width": 1280, "height": 900})
        try:
            if a.discover:
                await discover(ctx, a.portal); return
            todo = []
            if a.csv:
                with open(a.csv, newline="", encoding="utf-8") as f:
                    for r in csv.DictReader(f):
                        todo.append(((r.get("roll") or r.get("enrolment") or "").strip(), (r.get("name") or "").strip()))
            elif a.roll and a.name:
                todo.append((a.roll.strip(), a.name.strip()))
            else:
                ap.error("give --roll and --name, or --csv, or --discover")
            results = []
            for i, (roll, name) in enumerate(todo):
                if not re.match(r"^[A-Za-z]{1,4}\s*/\s*\d{1,6}\s*/(\s*[A-Za-z]\s*/)?\s*\d{2,4}$|^\d{1,6}$", roll):
                    results.append({"roll": roll, "name_given": name, "status": "ERROR", "note": "Roll number format looks wrong (expected KAR/1234/2016)."})
                    print(f"[ERR] ERROR         {roll:<16} given: {name!r}  Roll number format looks wrong (expected KAR/1234/2016)."); continue
                if i: await asyncio.sleep(WAIT_BETWEEN)
                r = await verify_one(ctx, roll, name, proof, a.portal)
                results.append(r)
                mark = {"VERIFIED": "OK ", "NAME_MISMATCH": "?? ", "NOT_FOUND": "NO ", "ERROR": "ERR"}[r["status"]]
                print(f"[{mark}] {r['status']:<13} {roll:<16} given: {name!r}  found: {r.get('name_found','')!r}  score {r.get('score',0)}  {r.get('note','')}")
            if a.json:
                print(json.dumps(results, indent=2, ensure_ascii=False))
            cols = ["roll", "name_given", "status", "name_found", "score", "checked_at", "proof", "proof_sha256", "note"]
            with open(a.out, "w", newline="", encoding="utf-8") as f:
                w = csv.DictWriter(f, fieldnames=cols, extrasaction="ignore"); w.writeheader(); w.writerows(results)
            print(f"\nSaved {len(results)} result(s) to {a.out}; screenshots in {proof}/")
        finally:
            await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
