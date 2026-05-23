# Web converter

100% client-side — safe for client data (nothing uploaded).

## Run locally

```bash
npx serve .
```

Open http://localhost:3000 and drop `../samples/stripe-balance-sample.csv`.

## Deploy free

- **Cloudflare Pages:** upload `web/` folder
- **GitHub Pages:** enable Pages on `/web`
- **Vercel:** set root to `web`

## Test

Expected output matches `../samples/expected-qbo-output.csv` with default options (split fees, MM/DD/YYYY).
