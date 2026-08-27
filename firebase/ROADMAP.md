# OPS Tech Site — Remaining Steps

Live site: **https://ops-tech.web.app** (also ops-tech-ed432.web.app) · Firebase project: `ops-tech-ed432`
Migration from Apps Script completed 2026-07-13; site is fully functional, secured, and styled (card style "G", button style "B").

## Joel's list (do at your own pace)

1. **Populate content** using the site's own Add buttons:
   - Home page cards (dashed "Add Page Card" bar)
   - Links, Documentation, Images (red pill buttons; old spreadsheet is the reference and remains untouched)
   - Status → Manage Systems → Bulk Import for monitored systems (prefer RSS/Atom feed URLs)
2. **Add teammates**: Admin page → Site Access → add email, then pick a role
   (Admin / Editor / Tech Specialist view-only, or fine-tune with the checkboxes).
   New users start as view-only Tech Specialists.

## ✅ Cutover — COMPLETE 2026-07-23

- Old Apps Script web app (`doGet`) now redirects to ops-tech.web.app (deployment @169);
  legacy routing kept below the redirect, unreachable. Old spreadsheet stays as
  read-only backup.
- CLAUDE.md rewritten for the Firebase workflow (deploy commands, layout, gotchas).
- The 6 leftover Dec-2025 functions deleted by Joel; `functions:list` confirms only the
  five current ones remain (statusCheck, checkNow, sendEmail, sendPreviewEmail,
  processScheduledEmails). Combined `firebase deploy` runs now finish cleanly.
- Optional check remains: script.google.com → old project → Triggers — delete any
  leftover time-based triggers if some exist.

## Done since launch

- 2026-07-20: Image uploads via Cloud Storage (Image Library, link icons, admin favicon) with
  allowlist-gated storage.rules; square favicon + admin favicon setting; per-image preview
  background color; image tags with filter pills + Jump to Category nav panel
- 2026-07-23: Four new email layouts (Split / Showcase / Grid / Digest — 7 total);
  role presets on Site Access (Admin / Editor / Tech Specialist view-only, derived from
  perms, vestigial Status perm removed, new users default view-only); site-wide nav
  reworked to hamburger + right-side sidebar (admin-gated Admin item, user chip +
  sign out) with polished top bar (page chip) and restored full footer
- 2026-07-23: Incident ↔ Communications integration — publishing an incident/maintenance
  (and resolving one) opens a Notify-by-Email modal: editable subject/heading/status-note,
  Quill rich-text message, group pickers, live preview of the branded notice (ghost-torch
  banner, severity pill, details card), Skip/Send. Sent notices archive to Communications
  as Incident/Maintenance Notice; all-clears pre-check the originally-notified groups;
  page-level banners click through to the manager for admins. sendEmail accepts
  admin OR communications perm.

## ✅ Status page rework — COMPLETE (2026-07-21)

Shipped: full visual redesign (stat-tiles banner, glow cards, style G/B), uptime history
(7-day strips + % + per-system detail modal with event timeline), category sections with
jump nav / rename / reorder / cross-category drag-drop, custom icon uploads, admin-only
editing, 15-min checks with reset-history tool, incidents & scheduled maintenance
(admin-created, shown on both pages, auto-resolving maintenance windows), and a public
view-only embed (/status-embed) with admin-configurable branding for the district site:
`<iframe src="https://ops-tech.web.app/status-embed" style="width:100%;height:900px;border:0;"></iframe>`

Remaining for Joel: finish populating monitored systems (prefer RSS/Atom feed URLs —
for Statuspage-hosted vendors append /history.rss).

## ✅ Email / Communications rework — COMPLETE (shipped 2026-07-21, sending verified 2026-07-23)

Joel's picks: Compose = tabbed workspace (C), Archive = style-G cards (A), features =
upload-from-computer + reusable snippets + scheduled sending.

Shipped:
- **Compose**: full rebuild — hero header with pills, tabbed workspace
  (Setup / Content / Recipients) with the send bar always visible, style G/B chrome,
  segmented layout & banner-color pickers, upload-from-computer + Browse Library on
  every image field, reusable intro/outro snippets (shared `snippets` collection),
  and Schedule Send (modal → `scheduledEmails` queue).
- **Communications**: style-G cards (watermark, icon chip, underline sweep, meta chips),
  search box + template filter pills + result count, restyled detail/drafts modals
  (?drafts=1 deep link), and a Scheduled panel (view/cancel pending, dismiss failed).
- **Backend**: `processScheduledEmails` function (every 5 min, sends due queue items via
  DWD Gmail, archives to communications with source 'scheduled', marks sent/error);
  rules for `snippets` (comms write) and `scheduledEmails` (comms create/delete, no update).

2026-07-23: Joel completed the DWD grant + sender address and verified sending
end-to-end — email received. The site's email pipeline is fully live.

## ✅ ClassLink SAML SSO — COMPLETE & VERIFIED (2026-07-27)

Sign-in page redesigned (split panel: navy brand pane + Google/ClassLink buttons)
and all three flows verified: Google popup, ClassLink popup, and the
`?sso=1` auto-hop. Config notes that must not change:
- Firebase SAML provider `saml.classlink`; Service Provider Entity ID stays
  `https://classlink.com` (ClassLink's generic default audience)
- `authDomain` is `ops-tech.web.app` (same-origin auth handler — fixes
  signInWithRedirect under browser storage partitioning); the GCP OAuth web
  client lists `https://ops-tech.web.app/__/auth/handler` as a redirect URI and
  ClassLink's Consumer Service Url (post) points at the same handler
- ClassLink app: NameID = staff email (must match Google email)
- Never use ClassLink's "IDP Initiate Login URL" — Firebase rejects
  IdP-initiated SAML; the tile must be a plain URL app pointing to
  `https://ops-tech.web.app/signin.html?sso=1`

Remaining for Joel: add that LaunchPad URL-app tile and assign it to staff.

## ✅ Status subscriptions + monitoring alerts (2026-07-27)

- **Public subscriptions on the status embed**: district users enter their
  @orono.k12.mn.us address in the "Get status updates by email" card on
  /status-embed → confirmation email (double-opt-in) → verified subscribers get
  a branded notice automatically whenever an incident or maintenance window is
  published. Emails are sent individually with personal unsubscribe links.
  Subscriber list is Cloud-Function-managed; admins can inspect the
  `statusSubscribers` collection.
- **Monitoring alerts**: when an automated check detects a system transitioning
  into down/partial/degraded (not caused by a declared incident), the addresses
  in Admin → "Status alert emails" get a digest. Blank field = alerts off.

## Compose ideas (next up)

- ✅ **Import a whole communication and map it to sections** — SHIPPED 2026-08-27 as the
  "Import text" bar on the Content tab (paste → split on blank lines → auto-suggested
  mapping → per-block target dropdown → Apply). Google Doc sharing (Docs API) still
  open if plain paste proves insufficient. Original idea: let a
  user paste an entire draft (or share a Google Doc) and then assign each chunk to a
  slot — subject, subheading, intro, topic N title / description / button (text +
  URL + lead-in), outro. Likely shape: an "Import" modal on the Content tab that
  splits the pasted text into blocks (by blank lines / headings), shows them as
  draggable chips, and lets you drop each onto a target field or auto-suggest a
  mapping (first line → title, lines that look like links → buttons). Google Doc
  path would need the Docs API (or "File → Download → HTML" paste) — start with
  bulk paste since it needs no extra auth.

## Optional, anytime

- Custom domain (e.g. tech.orono.k12.mn.us): Hosting → add custom domain + district DNS CNAME + add to Auth authorized domains
- Enable a Firestore TTL policy on `statusResults/*/history` (expireAt field) so old uptime
  history docs stop accumulating
- Claude Design visual-refresh workflow (push components to claude.ai/design and iterate visually)
