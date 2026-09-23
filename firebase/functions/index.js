/**
 * Cloud Functions for the OPS Tech site.
 *  - statusCheck: scheduled (every 15 min) system status sweep -> Firestore
 *  - checkNow:    callable manual sweep (debounced to 60s)
 *  - sendEmail:   callable, sends dept email via DWD Gmail + archives
 *  - sendPreviewEmail: callable, sends preview to the caller only
 *  - processScheduledEmails: scheduled (every 5 min) sweep of the
 *    scheduledEmails queue -> sends due emails + archives them
 */

'use strict';

const { onCall, onRequest, HttpsError } = require('firebase-functions/v2/https');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { defineSecret } = require('firebase-functions/params');
const { setGlobalOptions } = require('firebase-functions/v2');
const admin = require('firebase-admin');
const crypto = require('node:crypto');

const { google } = require('googleapis');

const { runAllChecks } = require('./lib/status');
const { sendGmail } = require('./lib/gmail');
const { buildIncidentEmail, buildAlertEmail, buildVerifyEmail } = require('./lib/notify');

setGlobalOptions({ region: 'us-central1' });

admin.initializeApp();
const db = admin.firestore();

const GMAIL_SA_KEY = defineSecret('GMAIL_SA_KEY');

// permKey may be a single key or an array (any one of them grants access).
async function assertAllowed(auth, permKey) {
  const email = (auth && auth.token && auth.token.email) || '';
  // ClassLink SAML assertions don't set email_verified, but ClassLink is the
  // district's own IdP so its emails are authoritative.
  const viaClassLink = !!(auth && auth.token && auth.token.firebase &&
    auth.token.firebase.sign_in_provider === 'saml.classlink');
  if (!/@orono\.k12\.mn\.us$/i.test(email) ||
      (auth.token.email_verified !== true && !viaClassLink)) {
    throw new HttpsError('permission-denied', 'This action is limited to Orono staff.');
  }
  const entry = await db.doc('allowedUsers/' + email.toLowerCase()).get();
  if (!entry.exists) {
    throw new HttpsError('permission-denied', 'Your account is not on the site access list.');
  }
  if (permKey) {
    const perms = entry.get('perms') || {};
    const keys = Array.isArray(permKey) ? permKey : [permKey];
    if (!keys.some(k => perms[k] === true)) {
      throw new HttpsError('permission-denied', 'You do not have the "' + keys.join('" or "') + '" permission.');
    }
  }
  return email;
}

function stripHtml(html) {
  return String(html).replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

// Resolve emailGroups doc ids + individual to/cc/bcc lists into concrete
// addresses and a human-readable recipient summary for the archive.
async function resolveRecipients(groupIds, indiv) {
  const toEmails = [];
  const recipientNames = [];
  for (const id of groupIds) {
    const g = await db.collection('emailGroups').doc(String(id)).get();
    if (g.exists && g.get('email')) {
      toEmails.push(g.get('email'));
      recipientNames.push(g.get('name') || g.get('email'));
    }
  }
  const indivTo = Array.isArray(indiv.to) ? indiv.to.filter(Boolean) : [];
  const ccEmails = Array.isArray(indiv.cc) ? indiv.cc.filter(Boolean) : [];
  const bccEmails = Array.isArray(indiv.bcc) ? indiv.bcc.filter(Boolean) : [];
  if (indivTo.length) {
    toEmails.push(...indivTo);
    recipientNames.push(indivTo.join(', '));
  }
  if (ccEmails.length) recipientNames.push('Cc: ' + ccEmails.join(', '));
  if (bccEmails.length) recipientNames.push('Bcc: ' + bccEmails.join(', '));
  return { toEmails, ccEmails, bccEmails, recipientNames };
}

async function getSenderConfig() {
  const snap = await db.doc('config/app').get();
  const cfg = snap.exists ? snap.data() : {};
  return {
    senderEmail: cfg.senderEmail || '',
    senderName: cfg.senderName || 'Orono Tech Department'
  };
}

// ---------- Status monitoring ----------

// Email the configured admin list about check-driven transitions into a
// problem state (config/app.statusAlertEmails, comma/space separated).
async function maybeSendAlerts(transitions) {
  if (!Array.isArray(transitions) || !transitions.length) return;
  try {
    const cfg = await getSenderConfig();
    const snap = await db.doc('config/app').get();
    const raw = (snap.exists && snap.get('statusAlertEmails')) || '';
    const recipients = String(raw).split(/[\s,;]+/).filter(e => /.+@.+/.test(e));
    if (!recipients.length || !cfg.senderEmail) return;

    const email = buildAlertEmail(transitions);
    await sendGmail({
      saKeyJson: GMAIL_SA_KEY.value(),
      senderEmail: cfg.senderEmail,
      senderName: cfg.senderName,
      to: recipients,
      cc: [],
      bcc: [],
      subject: email.subject,
      html: email.html
    });
    console.log(`Monitoring alert sent to ${recipients.length} recipient(s) for ${transitions.length} transition(s)`);
  } catch (error) {
    console.error('Monitoring alert failed:', error);
  }
}

exports.statusCheck = onSchedule(
  { schedule: 'every 15 minutes', timeoutSeconds: 120, secrets: [GMAIL_SA_KEY] },
  async () => {
    const results = await runAllChecks(db);
    console.log(`Status check complete: ${results.length} systems checked`);
    await maybeSendAlerts(results.alertTransitions);
  }
);

exports.checkNow = onCall({ secrets: [GMAIL_SA_KEY] }, async (req) => {
  await assertAllowed(req.auth);

  // Optional: wipe one system's uptime history (statusResults doc + its
  // history subcollection) before re-checking — recovers from a period of
  // misconfigured checks poisoning the 7-day stats. Requires status perm.
  const resetId = req.data && req.data.resetId;
  if (resetId) {
    await assertAllowed(req.auth, 'admin');
    await db.recursiveDelete(db.collection('statusResults').doc(String(resetId)));
    const results = await runAllChecks(db);
    await maybeSendAlerts(results.alertTransitions);
    return { skipped: false, checked: results.length, reset: true };
  }

  // force: admin-only bypass of the debounce (used after creating or
  // resolving incidents so statuses update immediately).
  const force = !!(req.data && req.data.force);
  if (force) {
    await assertAllowed(req.auth, 'admin');
  } else {
    // Debounce: skip if the newest result is under 60 seconds old.
    const latest = await db.collection('statusResults')
      .orderBy('checkedAt', 'desc').limit(1).get();
    if (!latest.empty) {
      const last = latest.docs[0].get('checkedAt');
      if (last && Date.now() - last.toMillis() < 60000) {
        return { skipped: true, message: 'Checked less than a minute ago.' };
      }
    }
  }

  const results = await runAllChecks(db);
  await maybeSendAlerts(results.alertTransitions);
  return { skipped: false, checked: results.length };
});

// ---------- Status subscriber notices (public, double-opt-in) ----------

const SUBSCRIPTION_ACTION_URL =
  'https://us-central1-ops-tech-ed432.cloudfunctions.net/statusSubscriptionAction';
const MAX_SUBSCRIBERS = 3000;

function subscriptionUrl(action, email, token) {
  return SUBSCRIPTION_ACTION_URL + '?action=' + action +
    '&email=' + encodeURIComponent(email) + '&token=' + encodeURIComponent(token);
}

// Called (unauthenticated) from the public status embed. Creates a pending
// subscription and sends a confirmation email — nothing is sent to the
// address until its owner clicks the confirm link.
exports.statusSubscribe = onCall({ secrets: [GMAIL_SA_KEY] }, async (req) => {
  const email = String((req.data && req.data.email) || '').trim().toLowerCase();
  if (!/^[a-z0-9._%+-]+@orono\.k12\.mn\.us$/.test(email)) {
    return { success: false, message: 'Enter your @orono.k12.mn.us email address.' };
  }

  const ref = db.collection('statusSubscribers').doc(email);
  const existing = await ref.get();
  if (existing.exists && existing.get('verified') === true) {
    return { success: true, message: 'You are already subscribed!' };
  }

  const countSnap = await db.collection('statusSubscribers').count().get();
  if (countSnap.data().count >= MAX_SUBSCRIBERS) {
    return { success: false, message: 'The subscription list is full — contact the Tech Department.' };
  }

  const cfg = await getSenderConfig();
  if (!cfg.senderEmail) {
    return { success: false, message: 'Email is not configured yet — try again later.' };
  }

  const token = crypto.randomUUID();
  await ref.set({
    email: email,
    verified: false,
    token: token,
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  });

  const verify = buildVerifyEmail(subscriptionUrl('confirm', email, token));
  await sendGmail({
    saKeyJson: GMAIL_SA_KEY.value(),
    senderEmail: cfg.senderEmail,
    senderName: cfg.senderName,
    to: [email],
    cc: [],
    bcc: [],
    subject: verify.subject,
    html: verify.html
  });
  return { success: true, message: 'Almost done — check your inbox for a confirmation email!' };
});

// Confirm / unsubscribe links from emails land here (GET).
exports.statusSubscriptionAction = onRequest(async (req, res) => {
  const page = (icon, title, body) =>
    '<!DOCTYPE html><html><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1.0">' +
    '<title>' + title + ' - OPS Technology</title>' +
    '<link href="https://fonts.googleapis.com/css2?family=Lexend:wght@300;400;500;700&display=swap" rel="stylesheet">' +
    '<style>body{font-family:Lexend,Arial,sans-serif;display:flex;justify-content:center;align-items:center;' +
    'min-height:100vh;margin:0;background:linear-gradient(135deg,#2d3f69 0%,#1d2a5d 100%);}' +
    '.card{background:#fff;padding:40px 44px;border-radius:16px;box-shadow:0 18px 50px rgba(0,0,0,.35);' +
    'text-align:center;max-width:420px;margin:20px;}' +
    '.card img{height:52px;margin-bottom:14px;}' +
    'h1{color:#2d3f69;font-size:1.3em;margin:0 0 6px;padding-bottom:12px;position:relative;display:inline-block;}' +
    'h1:after{content:"";position:absolute;left:50%;transform:translateX(-50%);bottom:0;width:46px;height:3px;' +
    'background:#ad2122;border-radius:2px;}' +
    'p{color:#6a7288;font-size:.9em;line-height:1.65;margin:12px 0 0;}</style></head>' +
    '<body><div class="card"><img src="https://ops-tech.web.app/img/favicon.png" alt="">' +
    '<h1>' + title + '</h1><p>' + body + '</p></div></body></html>';

  const action = String(req.query.action || '');
  const email = String(req.query.email || '').trim().toLowerCase();
  const token = String(req.query.token || '');

  const ref = db.collection('statusSubscribers').doc(email);
  const snap = await ref.get();
  if (!email || !token || !snap.exists || snap.get('token') !== token) {
    res.status(400).send(page('error', 'Link not valid',
      'This link is invalid or has expired. You can subscribe again from the status page.'));
    return;
  }

  if (action === 'confirm') {
    await ref.update({ verified: true, verifiedAt: admin.firestore.FieldValue.serverTimestamp() });
    res.send(page('check', 'You\'re subscribed!',
      'You\'ll get an email whenever the Orono Tech Department posts a service incident ' +
      'or scheduled maintenance. Every email includes an unsubscribe link.'));
  } else if (action === 'unsubscribe') {
    await ref.delete();
    res.send(page('bye', 'Unsubscribed',
      'You\'ll no longer receive status update emails. You can re-subscribe any time ' +
      'from the status page.'));
  } else {
    res.status(400).send(page('error', 'Unknown action', 'This link is not valid.'));
  }
});

// When an incident or maintenance window is created, automatically email
// every VERIFIED subscriber — individually, so each email carries that
// person's own unsubscribe link.
exports.notifyStatusSubscribers = onDocumentCreated(
  { document: 'incidents/{id}', secrets: [GMAIL_SA_KEY], timeoutSeconds: 300 },
  async (event) => {
    const inc = event.data && event.data.data();
    if (!inc || (inc.type !== 'incident' && inc.type !== 'maintenance')) return;

    const subsSnap = await db.collection('statusSubscribers')
      .where('verified', '==', true).get();
    const subscribers = subsSnap.docs
      .map(d => ({ email: d.get('email') || d.id, token: d.get('token') || '' }))
      .filter(s => /.+@.+/.test(s.email));
    if (!subscribers.length) {
      console.log('No verified status subscribers — skipping notice.');
      return;
    }

    const cfg = await getSenderConfig();
    if (!cfg.senderEmail) {
      console.warn('No sender address configured — cannot send subscriber notice.');
      return;
    }

    let sent = 0;
    const CHUNK = 10;
    for (let i = 0; i < subscribers.length; i += CHUNK) {
      await Promise.all(subscribers.slice(i, i + CHUNK).map(async (sub) => {
        try {
          const email = buildIncidentEmail(inc, subscriptionUrl('unsubscribe', sub.email, sub.token));
          await sendGmail({
            saKeyJson: GMAIL_SA_KEY.value(),
            senderEmail: cfg.senderEmail,
            senderName: cfg.senderName,
            to: [sub.email],
            cc: [],
            bcc: [],
            subject: email.subject,
            html: email.html
          });
          sent++;
        } catch (error) {
          console.error('Subscriber notice failed for ' + sub.email + ':', error);
        }
      }));
    }
    console.log(`Subscriber notices sent: ${sent}/${subscribers.length}`);
  }
);

// ---------- Email ----------

exports.sendEmail = onCall({ secrets: [GMAIL_SA_KEY] }, async (req) => {
  // Admins may send too (incident/maintenance notices from the Status page).
  const userEmail = await assertAllowed(req.auth, ['communications', 'admin']);
  const data = req.data || {};
  const subject = data.subject;
  const bodyHtml = data.bodyHtml;
  const groupIds = Array.isArray(data.groupIds) ? data.groupIds : [];
  const indiv = data.individualRecipients || {};
  const templateUsed = data.templateUsed || 'Custom';

  if (!subject || !bodyHtml) {
    return { success: false, message: 'Subject and body are required.' };
  }

  try {
    const { toEmails, ccEmails, bccEmails, recipientNames } =
      await resolveRecipients(groupIds, indiv);

    if (!toEmails.length && !ccEmails.length && !bccEmails.length) {
      return { success: false, message: 'No valid recipients selected.' };
    }

    const cfg = await getSenderConfig();
    if (!cfg.senderEmail) {
      return { success: false, message: 'No sender address configured. Set senderEmail on the Admin page.' };
    }

    await sendGmail({
      saKeyJson: GMAIL_SA_KEY.value(),
      senderEmail: cfg.senderEmail,
      senderName: cfg.senderName,
      to: toEmails,
      cc: ccEmails,
      bcc: bccEmails,
      subject: subject,
      html: bodyHtml
    });

    await db.collection('communications').add({
      sentAt: admin.firestore.FieldValue.serverTimestamp(),
      subject: subject,
      recipients: recipientNames.join(', '),
      templateUsed: templateUsed,
      previewText: stripHtml(bodyHtml).substring(0, 200),
      bodyHtml: bodyHtml,
      source: 'archive',
      sentBy: userEmail
    });

    return { success: true, message: 'Email sent successfully!' };
  } catch (error) {
    console.error('sendEmail failed:', error);
    return { success: false, message: 'Error: ' + (error.message || String(error)) };
  }
});

// ---------- Staff directory sync (OneSync Google Sheet -> staff/{email}) ----------
// Same sheet and column order that PaperPal and OronoHR sync from:
//   OneSync ID | Building Initials | Username | Email | Employee ID | Last Name | First Name | Title
// The sheet must be shared (Viewer) with the functions' runtime service account.

const STAFF_SHEET_DEFAULT = '1uvr4MN3DhNyHKxxZuVeT_Tag3U6EpkRxr3s82plIqbU';
const STAFF_SHEET_RANGE_DEFAULT = 'A:H';
const STAFF_SA_HINT = '770722055544-compute@developer.gserviceaccount.com';

function parseStaffRows(rows) {
  const out = [];
  for (const row of rows) {
    const building   = (row[1] || '').trim();
    const username   = (row[2] || '').trim();
    const email      = (row[3] || '').trim().toLowerCase();
    const employeeId = (row[4] || '').trim();
    const familyName = (row[5] || '').trim();
    const givenName  = (row[6] || '').trim();
    const title      = (row[7] || '').trim();
    // Skips the header row and any blank/garbage rows in one go
    if (!email || !/@orono\.k12\.mn\.us$/.test(email)) continue;
    out.push({
      email,
      displayName: [givenName, familyName].filter(Boolean).join(' ') || email,
      givenName, familyName, username, building, title, employeeId
    });
  }
  return out;
}

async function performStaffSync(source, triggeredBy) {
  const cfgRef = db.doc('config/staffSync');
  const cfgSnap = await cfgRef.get();
  const cfg = cfgSnap.exists ? cfgSnap.data() : {};
  const sheetId = (cfg.sheetId || '').trim() || STAFF_SHEET_DEFAULT;
  const range = (cfg.range || '').trim() || STAFF_SHEET_RANGE_DEFAULT;

  try {
    const auth = new google.auth.GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
    });
    const sheets = google.sheets({ version: 'v4', auth });
    let rows;
    try {
      const res = await sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range });
      rows = res.data.values || [];
    } catch (err) {
      throw new HttpsError('internal',
        'Sheets API error: ' + (err.message || String(err)) +
        '. Share the sheet with ' + STAFF_SA_HINT + ' as a Viewer and make sure the Google Sheets API is enabled for this project.');
    }

    const staff = parseStaffRows(rows);
    if (!staff.length) {
      throw new HttpsError('failed-precondition',
        'No staff rows parsed from ' + rows.length + ' sheet rows. Check the sheet ID and range (expected columns A:H, email in column D).');
    }

    const writer = db.bulkWriter();
    const seen = new Set();
    const now = admin.firestore.FieldValue.serverTimestamp();
    for (const s of staff) {
      seen.add(s.email);
      writer.set(db.collection('staff').doc(s.email), { ...s, syncedAt: now });
    }
    await writer.close();

    // Drop anyone no longer on the sheet so autocomplete never offers stale staff
    const existing = await db.collection('staff').listDocuments();
    const deleter = db.bulkWriter();
    let removed = 0;
    for (const ref of existing) {
      if (!seen.has(ref.id)) { deleter.delete(ref); removed++; }
    }
    await deleter.close();

    await cfgRef.set({
      lastSyncedAt: now, lastSource: source, lastTriggeredBy: triggeredBy || null,
      count: staff.length, lastRemoved: removed, lastError: null
    }, { merge: true });
    console.log(`Staff sync (${source}): ${staff.length} synced, ${removed} removed`);
    return { synced: staff.length, removed };
  } catch (err) {
    await cfgRef.set({
      lastError: err.message || String(err),
      lastErrorAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true }).catch(() => {});
    throw err;
  }
}

exports.syncStaff = onCall({ timeoutSeconds: 240, memory: '512MiB' }, async (req) => {
  const email = await assertAllowed(req.auth, 'admin');
  return performStaffSync('manual', email);
});

exports.scheduledStaffSync = onSchedule(
  { schedule: 'every day 04:00', timeZone: 'America/Chicago', timeoutSeconds: 240, memory: '512MiB' },
  async () => {
    const cfg = await db.doc('config/staffSync').get();
    if (!cfg.exists || cfg.get('enabled') !== true) return;
    await performStaffSync('scheduled', null);
  }
);

// Sweep the scheduledEmails queue: anything pending and past its sendAt time
// is sent, archived to communications, and marked sent (or error).
exports.processScheduledEmails = onSchedule(
  { schedule: 'every 5 minutes', timeoutSeconds: 300, secrets: [GMAIL_SA_KEY] },
  async () => {
    const pending = await db.collection('scheduledEmails')
      .where('status', '==', 'pending').get();
    const now = Date.now();
    let sent = 0;

    for (const docSnap of pending.docs) {
      const d = docSnap.data();
      if (!d.sendAt || d.sendAt.toMillis() > now) continue;

      try {
        const { toEmails, ccEmails, bccEmails, recipientNames } =
          await resolveRecipients(
            Array.isArray(d.groupIds) ? d.groupIds : [],
            d.individualRecipients || {});
        if (!toEmails.length && !ccEmails.length && !bccEmails.length) {
          throw new Error('No valid recipients.');
        }

        const cfg = await getSenderConfig();
        if (!cfg.senderEmail) {
          throw new Error('No sender address configured on the Admin page.');
        }

        await sendGmail({
          saKeyJson: GMAIL_SA_KEY.value(),
          senderEmail: cfg.senderEmail,
          senderName: cfg.senderName,
          to: toEmails,
          cc: ccEmails,
          bcc: bccEmails,
          subject: d.subject,
          html: d.bodyHtml
        });

        await db.collection('communications').add({
          sentAt: admin.firestore.FieldValue.serverTimestamp(),
          subject: d.subject,
          recipients: recipientNames.join(', '),
          templateUsed: d.templateUsed || 'Custom',
          previewText: stripHtml(d.bodyHtml).substring(0, 200),
          bodyHtml: d.bodyHtml,
          source: 'scheduled',
          sentBy: d.createdBy || ''
        });

        await docSnap.ref.update({
          status: 'sent',
          sentAt: admin.firestore.FieldValue.serverTimestamp()
        });
        sent++;
      } catch (error) {
        console.error('Scheduled send failed for', docSnap.id, error);
        await docSnap.ref.update({
          status: 'error',
          error: String((error && error.message) || error)
        });
      }
    }

    console.log(`Scheduled email sweep: ${pending.size} pending, ${sent} sent`);
  }
);

exports.sendPreviewEmail = onCall({ secrets: [GMAIL_SA_KEY] }, async (req) => {
  const userEmail = await assertAllowed(req.auth, 'communications');
  const data = req.data || {};
  if (!data.subject || !data.bodyHtml) {
    return { success: false, message: 'Subject and body are required.' };
  }

  try {
    const cfg = await getSenderConfig();
    if (!cfg.senderEmail) {
      return { success: false, message: 'No sender address configured. Set senderEmail on the Admin page.' };
    }

    await sendGmail({
      saKeyJson: GMAIL_SA_KEY.value(),
      senderEmail: cfg.senderEmail,
      senderName: cfg.senderName,
      to: [userEmail],
      cc: [],
      bcc: [],
      subject: data.subject,
      html: data.bodyHtml
    });

    return { success: true, message: 'Preview email sent to ' + userEmail + '!' };
  } catch (error) {
    console.error('sendPreviewEmail failed:', error);
    return { success: false, message: 'Error: ' + (error.message || String(error)) };
  }
});
