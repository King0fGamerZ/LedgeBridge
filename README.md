# LedgerBridge — Stripe CSV → QuickBooks Online Import

Fix the Stripe → QBO import headache in one click. Upload a Stripe export CSV, download a QuickBooks-ready file with correct dates, fee splits, and column layout.

**$0 to run:** processing happens in your browser (no upload to our servers).

## Quick start

```bash
cd web
npx serve .
# Open http://localhost:3000
```

Or open `web/index.html` directly in Chrome/Edge.

## Project layout

| Path | Purpose |
|------|---------|
| `web/` | Client-side converter (drag & drop) |
| `google-apps-script/` | Optional Sheets add-on / web app ($0 hosting) |
| `validation/` | Reddit validation posts (r/Accounting) |
| `launch/` | Stripe pricing & distribution |

## How it works

1. Export **Balance transactions** or **Payments** CSV from Stripe Dashboard.
2. Drop file on LedgerBridge.
3. Download `qbo-import-YYYY-MM-DD.csv` formatted for QuickBooks bank register import.
4. In QBO: **Settings → Import data → Bank data** (or Transactions → Upload).

## Monetization (when ready)

- Free: 5 conversions / month (localStorage counter)
- Pro $19/mo: unlimited (Stripe — see `launch/stripe-setup.md`)
