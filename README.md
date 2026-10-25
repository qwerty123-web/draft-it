# DraftIt

**“Ok done 👍” is not a contract. DraftIt turns it into one.**

DraftIt turns informal small-business deals (WhatsApp chats, voice notes, bills and photos) into clear agreements that both sides sign, with every record fingerprinted so tampering shows up. Built for Indian small businesses, in English, Hindi, Marathi, Telugu, Tamil and Kannada.

Built for Srujana Tech Fest 2026, Legal Services theme, problem LS-06 “From Handshake to Contract”.

**Live app:** https://qwerty123-web.github.io/draft-it/

## What it does

- **Voice notes to text.** Upload a voice note or call recording (MP3, M4A, OPUS, WAV, MP4) and DraftIt turns the speech into an editable transcript on the device, using Whisper in six languages. The speech library (transformers.js 4.3.0) loads from jsDelivr and the Whisper model downloads once from Hugging Face, then stays cached.
- **Reads snips and photos.** Screenshots and photos are read on the device (Tesseract.js, loaded from jsDelivr) into one message per chat bubble. After DraftIt reads the deal, the lines it used are underlined in dark blue on the picture, with amounts, dates and key words shaded.
- **Evidence in, untouched.** Paste a chat or upload a WhatsApp export, a voice note (with recording consent), a PDF or a photo. Originals are kept word for word with uploader, upload time, source time and a SHA-256 fingerprint.
- **Points to settle.** Reads the chat and shows each deal point as agreed, proposed, unclear or missing, with links back to the exact messages and a ready WhatsApp message to settle each gap.
- **Indian laws and standards check.** Guesses the business category (printing, food, medicine, digital, electronics, textiles, construction) and checks the deal against the relevant Indian rules: Contract Act, GST invoice rules, the ₹2 lakh cash limit, MSME 45-day payment, FSSAI packaging, Legal Metrology, Copyright and Trade Marks Acts, and more. Flags bill-skipping or untraceable cash.
- **Agreement both sides edit.** Suggest, accept or reject changes clause by clause, then lock a version. Each version is sealed with a SHA-256 hash chained to the one before it.
- **E-signature.** Aadhaar eSign flow (demo) or a drawn signature. Each signature is bound to that version’s fingerprint and has a certificate.
- **Formal agreement and quotation.** A court-style English agreement with schedules, logos, seals and witness blocks, plus a GST quotation with the amount in words. Both download as files.
- **Compare agreements.** Upload the other side’s purchase order or contract and see, point by point, which is better for you and what is risky.
- **Tamper check.** Re-checks every fingerprint and shows what a single changed word looks like.
- **Snip tool.** Add the Snip from Home and a button stays on every screen. On a laptop it grabs any window (WhatsApp Web, email, a PDF), you drag a box around the messages, and it uploads straight into the deal with an "Uploaded" tick. In Chrome or Edge it can float on top of other apps. On a phone, pick or paste a screenshot, or share one to the installed app.
- **Calendar that fills itself.** Deal deliveries, payments and deadlines, plus GST return dates (GSTR-1 on the 11th, GSTR-3B on the 20th), quarterly TDS returns, advance tax instalments and national holidays.
- **Laptop layout.** On wider screens DraftIt switches to a side menu, a two-column deal grid, a month-plus-agenda calendar and centred dialogs. Settings → Screen layout switches back to the phone size if you prefer.
- **Lawyer check, scam report, dispute routes, live deal chat, read aloud** in all six languages.

## Use it on your phone or computer

**Android app:** [download DraftIt.apk](https://github.com/qwerty123-web/draft-it/releases/download/android-latest/DraftIt.apk), open it, and allow installing from your browser when Android asks. GitHub builds a fresh APK automatically (see [`android-app/`](android-app/)). The app opens the live site, so it always has the latest features.

The live link also works in any modern browser. To install it from the browser:

- **Android (Chrome):** open the link, tap the menu (⋮), then **Install app** or **Add to Home screen**.
- **iPhone or iPad (Safari):** open the link, tap **Share**, then **Add to Home Screen**.
- **Windows, Mac or Linux (Chrome or Edge):** open the link and click the install icon in the address bar, or menu → **Install DraftIt**. It opens in its own window with the laptop layout.

Once installed on Android, you can share a screenshot or chat export from any app to DraftIt and the Snip tool uploads it to a deal.

DraftIt runs online. With online storage switched on (below), every account's deals, signatures and settings are saved to the cloud, so you can log in on any phone or computer and pick up where you left off.

### Turn on the AI features (optional)

Without a key, DraftIt reads chats with simple rules on the device. For full chat reading, translation of new content, photo reading and agreement comparison, open **Settings → Claude AI**, paste an Anthropic API key and tap **Save key**. The key is stored only in your browser and is sent only to `api.anthropic.com`.

## Online accounts, storage and AI (Supabase, free)

Everything a signed-in account does is stored in [Supabase](https://supabase.com):

| What | Where in Supabase | Rule |
| --- | --- | --- |
| Profile and settings | table `profiles` | only that account |
| Deals (parties, terms, draft, chat, dates) | table `deals` | only that account |
| Evidence (chats, transcripts, fingerprints) | table `evidence` | add or delete only: **no edits** |
| Locked agreement versions | table `versions` | hash and contents can never change |
| Signatures | table `signatures` | add only: **never edited or deleted** |
| Original files (voice notes, snips, photos, PDFs) | private Storage bucket `evidence` | only that account; files cannot be overwritten |
| Claude AI | Edge Function `claude` | signed-in accounts only; the API key stays on the server |
| Live deal chat | Realtime | |

### Setup (about 10 minutes)

1. **Create a project.** Sign up at supabase.com, click **New project**, pick the region **South Asia (Mumbai)**, and wait for it to start.
2. **Create the tables, storage and rules.** Open **SQL Editor → New query**, paste the whole of [`supabase/schema.sql`](supabase/schema.sql) and click **Run**. It is safe to run again after updates; existing accounts move over automatically.
3. **Send login codes by email.** Open **Authentication → Emails → Templates**. In both **Magic Link** and **Confirm signup**, replace the body with:

   ```html
   <h2>Your DraftIt login code</h2>
   <p style="font-size:28px;letter-spacing:6px"><b>{{ .Token }}</b></p>
   <p>It works once and expires in an hour.</p>
   ```

4. **Set the site address.** **Authentication → URL Configuration → Site URL**: `https://qwerty123-web.github.io/draft-it/`.
5. **Turn on Claude for everyone (no key in the browser).**
   - **Edge Functions → Deploy a new function → Via editor**, name it `claude`, paste [`supabase/functions/claude/index.ts`](supabase/functions/claude/index.ts), click **Deploy**.
   - **Edge Functions → Secrets → Add new secret**: name `ANTHROPIC_API_KEY`, value your key from [platform.claude.com/settings/keys](https://platform.claude.com/settings/keys) (choose a workspace when you create it; if you don't, also add `ANTHROPIC_WORKSPACE_ID`). The account needs prepaid credits under Settings → Billing.
   - Signed-in users now get chat reading, translation, photo reading and comparison automatically. Usage is billed to that key.
6. **Copy two keys into `config.js`** (Project Settings → API: **Project URL** and **anon public** key). Never put the **service_role** key in this file.

Supabase's built-in email sender allows only a few login emails per hour. For real users, add your own SMTP sender under **Authentication → Emails → SMTP Settings**.

Until `config.js` has keys, DraftIt still runs, but data stays in the browser of each device.

## Host your own copy

The app is a single static page, so any static host works.

### GitHub Pages (already set up for this repo)

1. Fork or push this repository to your GitHub account.
2. Go to **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**, branch **main**, folder **/ (root)**, then **Save**.
4. Wait a minute. Your app is at `https://<your-username>.github.io/<repo-name>/`.

### Netlify or Vercel

1. Create a new site and import this repository.
2. Leave the build command empty and set the publish directory to the repository root.
3. Deploy. You get an `https://` link that installs the same way.

### Run it on your own computer

```bash
git clone https://github.com/qwerty123-web/draft-it.git
cd draft-it
python3 -m http.server 8000
```

Then open http://localhost:8000. Screen snipping needs `https://` or `localhost`. Use a local server rather than opening `index.html` directly, so `config.js` and the Supabase library load.

## Change the code

The page is built from the files in `src/`:

| File | What it holds |
| --- | --- |
| `src/app.js` | The whole app: parsing, analysis, agreements, hashing, signing, rooms, exports |
| `src/style.css` | Styles (navy and white, one light theme) |
| `src/i18n*.js` | Interface text in six languages |
| `sw.js` | Service worker: no offline cache, only install support and the Android share target |
| `src/seed_tr.js` | Translations of the sample deal content |
| `src/audio.js` | The sample voice notes |
| `config.js` | Your Supabase project URL and anon key |
| `supabase/schema.sql` | Tables, storage bucket, security rules and account deletion |
| `supabase/functions/claude/index.ts` | Edge Function that calls Claude with the server-side key |
| `android-app/` | Android app (Capacitor) and its launcher icons |
| `.github/workflows/android.yml` | Builds `DraftIt.apk` on GitHub and attaches it to the `android-latest` release |
| `vendor/supabase.js` | Supabase browser library (v2.45.4, MIT licence) |

After editing, rebuild `index.html`:

```bash
python3 src/build.py
```

Commit and push; GitHub Pages updates in about a minute.

## Notes

- This is a hackathon demo. OTPs, payments, lawyer accounts and the Aadhaar eSign step are simulated. A live service needs a licensed eSign provider, an e-stamping partner, DPDP Act compliance, an IT Rules grievance officer and CERT-In incident reporting.
- Live chat between two phones runs through Supabase Realtime once `config.js` has keys. Without keys, the chat room works in demo mode on one device.
- Lawyer review across different accounts is simulated: the panel lawyers are demo accounts you can switch into from a deal.
- DraftIt is not a law firm and its output is not legal advice. Have important agreements reviewed by an advocate.
