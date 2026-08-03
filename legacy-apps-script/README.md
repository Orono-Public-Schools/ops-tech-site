# Legacy Apps Script Web App

This folder contains the **original** OPS Tech site, built as a Google Apps Script
web app bound to a spreadsheet. It was replaced by the Firebase site
(**https://ops-tech.web.app**, code in [`../firebase/`](../firebase/)) on 2026-07-23.

The deployed Apps Script now does one thing: **redirect visitors to ops-tech.web.app**
(see `Code.gs`). Everything else here is kept for reference only — do not develop
new features in this folder.

## If the redirect ever needs changing

Run clasp from **this folder** (the `.clasp.json` here points at the script project):

```bash
cd legacy-apps-script
clasp push --force
clasp deploy --deploymentId AKfycbz2w7Le3BFViUITPqWklg9AAWNLAc6knBmJd8KC7jH1l1w4Bg_cFL7VDUbvxRxywzjlkw -d "redirect update"
```

The old bound spreadsheet (`12COE6cTBRL_HSW9rhC8fvXFth7mhh5BgwqR1gUacJRw`) is a
read-only backup of the pre-migration data — never modify it.
