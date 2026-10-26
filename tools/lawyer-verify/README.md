# Lawyer check: Karnataka State Bar Council

A small Python tool that confirms an advocate is on the Karnataka State Bar Council (KSBC) roll. It opens the [KSBC website](https://ksbc.org.in) in a hidden browser, searches the **MEMBERSHIP DETAILS** box by roll (enrolment) number, and checks the name on the record against the name the lawyer gave. It does not change anything in the DraftIt app.

## Set up (once)

```bash
pip install -r requirements.txt
playwright install chromium
```

## Use

```bash
# one lawyer
python verify_ksbc.py --roll "KAR/1234/2016" --name "Meera Iyer"

# many lawyers from a CSV with columns: name, roll
python verify_ksbc.py --csv lawyers_sample.csv --out results.csv

# watch the browser instead of running hidden
python verify_ksbc.py --show --roll "KAR/1234/2016" --name "Meera Iyer"
```

| Result | Meaning |
| --- | --- |
| `VERIFIED` | The roll number is on the KSBC roll and the name matches (score 0.85 or more) |
| `NAME_MISMATCH` | The roll number exists but belongs to a different name |
| `NOT_FOUND` | No record with that roll number |
| `ERROR` | Bad roll number format, the site is down, or the search box could not be found |

Each found record is saved as a full-page screenshot in `proof/`, with its SHA-256 in the results file, so the check can be shown later.

## How it works

1. Opens `ksbc.org.in` in headless Chromium (Playwright).
2. Finds the **Roll No** box and the **Search** button by their visible labels, so small changes to the site do not break it.
3. Searches the roll number as given, then common variants (`KAR/0042/2010`, `KAR/42/10`, `42`).
4. Reads the result table (on the same page or in a new tab) and keeps only rows whose Roll No matches.
5. Compares names: titles such as Adv., Sri and Smt are ignored, initials match a full name with the same first letter, and other words must be nearly identical (Iyer vs Iyyer passes; Iyer vs Iyengar does not).
6. Waits 3 seconds between lawyers so the portal is not flooded.

## If the KSBC site changes

```bash
python verify_ksbc.py --discover
```

prints every form field on the page and which box and button the tool picked, and saves the page as `ksbc_home.html`. Put exact CSS selectors in `SELECTORS` at the top of `verify_ksbc.py` if needed.

## Testing without the internet

`mock/index.html` is a copy of the search form with three made-up advocates:

```bash
python -m http.server 8799 --directory mock
python verify_ksbc.py --csv lawyers_sample.csv --portal http://localhost:8799/index.html
```

## Limits

- Tested against the mock copy only; the first run on the live KSBC site should be done with `--show` or `--discover` to confirm the fields.
- If the site adds a CAPTCHA, the tool reports `ERROR` rather than trying to get around it.
- It confirms the roll number and name only; a valid Certificate of Practice or a suspension is not checked yet.
- Only the public directory is read; nothing is submitted or changed on the site.
