# Google Apps Script version ($0)

For bookkeepers who live in Google Sheets.

## Setup

1. Open a new Google Sheet
2. **Extensions → Apps Script**
3. Paste `Code.gs` → Save
4. Reload the sheet → menu **LedgerBridge** appears
5. Paste or import Stripe CSV into Sheet1 → **LedgerBridge → Convert Stripe sheet to QBO format**

Output sheet: `QBO Import YYYY-MM-DD` with Date, Description, Amount columns.

## Export for QuickBooks

File → Download → CSV, then import in QBO.

## Optional web app deploy

Deploy → New deployment → Web app → use for internal team bookmark (no public listing required).
