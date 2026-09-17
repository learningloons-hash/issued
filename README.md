# Issued

Professional Singapore quotes and invoices — with GST and a PayNow QR — generated entirely in the browser.

Issued is for solo businesses: tutors, cleaners, property agents, and home bakers. You can send a proper invoice in about two minutes. There is no login, no database, and no server-side payment flow in v1.

## What v1 is

- Mobile-first web app
- Three templates: Tuition invoice, Cleaning quote, General invoice
- Seller, client, and line items in SGD (2 decimals)
- Optional logo, kept in the browser
- GST 9% toggle
  - On: PDF is labelled **Tax Invoice**, shows GST Reg No, subtotal, GST, and total
  - Off: **Invoice** or **Quote** matching the template. Issued will not invent a GST number
- Document number default `INV-YYYYMMDD-xxx` (quotes use `QUO-…`). Editable
- PayNow SGQR (EMV) that Singapore bank apps can scan — seller proxy + amount + invoice reference. This is **not** a URL QR
  - Mobile proxies are encoded as `+65…`
  - UEN proxies are not prefixed with `+65`
- PDF generated in the browser with [pdfme](https://pdfme.com/) (MIT)
- Preview, download PDF, and copy WhatsApp text (total, PayNow proxy, invoice number)
- Seller fields persist in `localStorage` on this device
- Client data is never persisted. Switching templates clears the client

Footer on every document:

> Generated with Issued. Not IRAS-certified software.

## What v1 is not

- Not IRAS-certified invoicing software
- Not an accounting system
- No accounts, authentication, or multi-user access
- No database and no backend API
- No Stripe or other card payments
- No WhatsApp Business API — copy the message and paste it yourself
- No payment tracking or “mark as paid”
- No extra templates beyond the three above
- Nothing is uploaded. If you clear the browser site data, saved seller details are gone

## Run locally

You need Node.js 20+ and npm.

```bash
git clone https://github.com/learningloons-hash/issued.git
cd issued
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

```bash
npm run build    # production build
npm start        # serve the production build
npm test         # PayNow SGQR payload checks
```

## Deploy on Vercel from this GitHub repo

1. Push this repository to GitHub (this repo: `learningloons-hash/issued`).
2. In [Vercel](https://vercel.com), click **Add New… → Project** and import the GitHub repo.
3. Framework Preset should be **Next.js**. Leave the build command as `next build` / `npm run build`.
4. No environment variables are required.
5. Deploy. Later pushes to `main` (or your chosen production branch) will redeploy automatically.

The app is static on the server: every PDF and QR is created on the user’s device.

## Learning Loons site

The public blog rebuild lives in [`site/`](site/README.md). From the repo root:

```bash
cd site
npm install
npm run dev
```

## How PayNow QR works

Issued builds a merchant-presented EMV payload that includes `000201` and `SG.PAYNOW`, a CRC-16/CCITT-FALSE checksum, the PayNow proxy, the SGD amount, and the document number as the reference. The QR on the preview and PDF encodes that payload — not a website.

If generation fails, Issued shows a clear error instead of a broken QR.
