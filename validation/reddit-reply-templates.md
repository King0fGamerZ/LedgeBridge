# Reply templates

## When someone describes manual CSV rework

> A lot of folks split each Stripe row into gross + fee lines for the bank register, and normalize dates to MM/DD/YYYY before QBO will accept the upload. The Balance transactions export is usually easier than the Payments summary for that.

## When they ask for a tool

> I built a small browser tool that does the fee split + date format locally (nothing uploaded to a server). Happy to DM the link if you want to try it on a test client file.

## Disclosure

> Disclosure: I'm working on LedgerBridge for this exact Stripe→QBO CSV step — still early, looking for bookkeeper feedback on fee handling.
