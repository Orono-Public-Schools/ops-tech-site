# Claude Code Instructions — OPS Tech Site

The site runs on **Firebase** (project `ops-tech-ed432`), live at **https://ops-tech.web.app**
(the second hosting target `ops-tech-ed432.web.app` serves the same site). All active code
lives in the `firebase/` folder.

The old Apps Script web app lives in `legacy-apps-script/` — it now just redirects
to ops-tech.web.app (cutover 2026-07-23). Don't develop there; only touch `Code.gs`/clasp if
the redirect itself needs changing (from inside `legacy-apps-script/`: `clasp push --force`, then
`clasp deploy --deploymentId AKfycbz2w7Le3BFViUITPqWklg9AAWNLAc6knBmJd8KC7jH1l1w4Bg_cFL7VDUbvxRxywzjlkw -d "..."`).
The old bound spreadsheet (`12COE6cTBRL_HSW9rhC8fvXFth7mhh5BgwqR1gUacJRw`) is a read-only
backup — never modify it.

## Layout

- `firebase/public/` — static site (vanilla HTML/JS, no bundler; Firebase ESM SDK from gstatic CDN)
  - `js/layout.js` — shared top bar + sidebar + footer (`renderLayout(page)`), `SITE_VERSION`
  - `js/auth.js` — auth gate (Google sign-in, @orono.k12.mn.us + allowlist); `authReady`,
    `permsReady`, `gateEditing(key)`, `requirePerm(key)`. Importing it runs the gate —
    signin.html imports from `domain.js` instead.
  - `js/data.js` — all Firestore reads/writes
  - `js/upload.js` — `attachImageUpload(field)` Cloud Storage upload widget
  - `css/site.css` — shared chrome. Body top offset lives HERE
    (`padding-top: 88px !important`) — adjust it here, not per page.
- `firebase/functions/` — Cloud Functions (Node 22, us-central1): `statusCheck` (15-min
  status sweep), `checkNow`, `sendEmail`, `sendPreviewEmail`, `processScheduledEmails`
  (5-min scheduled-email queue sweep). Email functions use secret `GMAIL_SA_KEY`
  (DWD service account, sends as `config/app.senderEmail`).
- `firebase/firestore.rules`, `firebase/storage.rules` — security rules. Permissions come
  from `allowedUsers/{email}.perms` (homePages/links/documentation/images/communications/admin);
  the Admin page assigns them via role presets (Admin / Editor / Tech Specialist view-only).

## Deploying

Always deploy from the `firebase/` folder with `--project ops-tech-ed432`:

```bash
cd firebase
firebase deploy --only hosting                 # site changes (most common)
firebase deploy --only firestore:rules         # rules changes
firebase deploy --only "functions:sendEmail,functions:statusCheck,..."   # by name
```

**Gotchas learned the hard way:**
- If a combined deploy (`hosting,...,functions`) errors at the end, hosting may have
  uploaded but NOT released — rerun `firebase deploy --only hosting` to release it.
- If a functions deploy fails with "User code failed to load ... Timeout after 10000", it is
  usually the discovery timeout, not the code: rerun with `FUNCTIONS_DISCOVERY_TIMEOUT=60`
  set in the environment.
- After editing an HTML page's inline `<script type="module">`, syntax-check it before
  deploying (extract the script block and `node --check`).
- Hidden `<select id="template">` on compose.html must list every template value the
  segmented buttons use, or `select.value = x` silently becomes `''`.

## Conventions

- Styling: card style "G" (white tile, red duotone icon chip, ghost watermark, red
  underline sweep) and button style "B" (solid red pills, `#ad2122`; navy `#2d3f69`).
  Font Lexend, Material Icons.
- Version: bump `SITE_VERSION` in `js/layout.js` for notable feature releases
  (major.minor.patch — no deployment-number coupling anymore).
- Edit affordances: gate with `gateEditing(key)` + the `.edit-only` class
  (hidden until `body.can-edit`); rules enforce server-side regardless.
- Project docs: `firebase/ROADMAP.md` tracks remaining/optional work.
