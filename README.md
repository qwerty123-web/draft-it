# Draft It

**“Ok done 👍” is not a contract. Draft It turns it into one.**

Draft It turns informal small-business deals (WhatsApp chats, voice notes, bills and photos) into clear agreements that both sides sign, with every record fingerprinted so tampering shows up. Built for Indian small businesses, in English, Hindi, Marathi, Telugu, Tamil and Kannada.

Built for Srujana Tech Fest 2026, Legal Services theme, problem LS-06 “From Handshake to Contract”.

**Live app:** https://qwerty123-web.github.io/draft-it/

## What it does

- **Evidence in, untouched.** Paste a chat or upload a WhatsApp export, a voice note (with recording consent), a PDF or a photo. Originals are kept word for word with uploader, upload time, source time and a SHA-256 fingerprint.
- **Points to settle.** Reads the chat and shows each deal point as agreed, proposed, unclear or missing, with links back to the exact messages and a ready WhatsApp message to settle each gap.
- **Indian laws and standards check.** Guesses the business category (printing, food, medicine, digital, electronics, textiles, construction) and checks the deal against the relevant Indian rules: Contract Act, GST invoice rules, the ₹2 lakh cash limit, MSME 45-day payment, FSSAI packaging, Legal Metrology, Copyright and Trade Marks Acts, and more. Flags bill-skipping or untraceable cash.
- **Agreement both sides edit.** Suggest, accept or reject changes clause by clause, then lock a version. Each version is sealed with a SHA-256 hash chained to the one before it.
- **E-signature.** Aadhaar eSign flow (demo) or a drawn signature. Each signature is bound to that version’s fingerprint and has a certificate.
- **Formal agreement and quotation.** A court-style English agreement with schedules, logos, seals and witness blocks, plus a GST quotation with the amount in words. Both download as files.
- **Compare agreements.** Upload the other side’s purchase order or contract and see, point by point, which is better for you and what is risky.
- **Tamper check.** Re-checks every fingerprint and shows what a single changed word looks like.
- **Lawyer check, scam report, dispute routes, live deal chat, calendar, read aloud** in all six languages.

## Use it on your phone or computer

The live link works in any modern browser. To install it like an app:

- **Android (Chrome):** open the link, tap the menu (⋮), then **Install app** or **Add to Home screen**.
- **iPhone or iPad (Safari):** open the link, tap **Share**, then **Add to Home Screen**.
- **Windows, Mac or Linux (Chrome or Edge):** open the link and click the install icon in the address bar, or menu → **Install Draft It**.

Draft It runs online. With online storage switched on (below), every account's deals, signatures and settings are saved to the cloud, so you can log in on any phone or computer and pick up where you left off.

### Turn on the AI features (optional)

Without a key, Draft It reads chats with simple rules on the device. For full chat reading, translation of new content, photo reading and agreement comparison, open **Settings → Claude AI**, paste an Anthropic API key and tap **Save key**. The key is stored only in your browser and is sent only to `api.anthropic.com`.

## Switch on online accounts and storage (Supabase, free)

Draft It stores accounts and data in [Supabase](https://supabase.com), a hosted Postgres database with email login. Each account can only read and write its own data (row-level security). Live deal chat between two phones also runs through Supabase Realtime.

1. **Create a project.** Sign up at supabase.com, click **New project**, give it a name (for example `draft-it`), set a database password, and pick the region **South Asia (Mumbai)** so data stays in India. Wait about two minutes for it to start.
2. **Create the table.** Open **SQL Editor → New query**, paste the whole of [`supabase/schema.sql`](supabase/schema.sql) and click **Run**.
3. **Send login codes by email.** Open **Authentication → Emails → Templates**. In both **Magic Link** and **Confirm signup**, replace the body with:

   ```html
   <h2>Your Draft It login code</h2>
   <p style="font-size:28px;letter-spacing:6px"><b>{{ .Token }}</b></p>
   <p>It works once and expires in an hour.</p>
   ```

4. **Set the site address.** Open **Authentication → URL Configuration** and set **Site URL** to your app's link, for example `https://qwerty123-web.github.io/draft-it/`.
5. **Copy two keys.** Open **Project Settings → API** and copy the **Project URL** and the **anon public** key.
6. **Paste them into `config.js`** in this repository:

   ```js
   window.DRAFTIT_CONFIG = {
     supabaseUrl: 'https://YOUR-PROJECT.supabase.co',
     supabaseAnonKey: 'YOUR-ANON-PUBLIC-KEY'
   };
   ```

   Commit the change. The anon key is designed to be public; the security rules from step 2 keep each account private. Never put the **service_role** key in this file.

Supabase's built-in email sender allows only a few login emails per hour. For a public launch, add your own SMTP sender under **Authentication → Emails → SMTP Settings** (Brevo, Resend and Amazon SES all have free tiers).

Until `config.js` has keys, Draft It still runs, but data stays in the browser of each device and the demo accounts are the main way in.

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

Then open http://localhost:8000. Use a local server rather than opening `index.html` directly, so `config.js` and the Supabase library load.

## Change the code

The page is built from the files in `src/`:

| File | What it holds |
| --- | --- |
| `src/app.js` | The whole app: parsing, analysis, agreements, hashing, signing, rooms, exports |
| `src/style.css` | Styles (navy and white, one light theme) |
| `src/i18n*.js` | Interface text in six languages |
| `src/seed_tr.js` | Translations of the sample deal content |
| `src/audio.js` | The sample voice notes |
| `config.js` | Your Supabase project URL and anon key |
| `supabase/schema.sql` | Database table, security rules and account deletion |
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
- Draft It is not a law firm and its output is not legal advice. Have important agreements reviewed by an advocate.
