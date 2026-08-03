/**
 * Server-side status notification emails (subscriber notices + monitoring
 * alerts). Mirrors the client-side banner-D template on status.html:
 * gradient banner with ghost torch + wordmark, severity pill, details card,
 * red pill CTA, bordered footer.
 */

'use strict';

const SITE = 'https://ops-tech.web.app';

const STATUS_META = {
  operational: { label: 'Operational', color: '#1e7e34' },
  degraded: { label: 'Degraded Performance', color: '#9c6f00' },
  partial: { label: 'Partial Outage', color: '#c05600' },
  maintenance: { label: 'Maintenance', color: '#117a8b' },
  down: { label: 'Major Outage', color: '#b02a37' }
};

function esc(text) {
  return String(text == null ? '' : text)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Cloud Functions run in UTC; render district-local times.
function fmtWhen(d) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Chicago',
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
  }).format(d);
}

function textToHtml(text) {
  if (!text) return '';
  return '<p style="margin:0 0 10px 0;line-height:1.65;">' +
    esc(text).replace(/\n/g, '<br>') + '</p>';
}

/**
 * Banner-D notification email.
 * opts: { color, colorDeep, title, noteHtml, systems[], pill:{text,color},
 *         pillNote, windowText, ctaUrl, ctaText, footerNote }
 */
function statusEmailHtml(opts) {
  const GRAY = '#4a4a4a';
  const deep = opts.colorDeep || opts.color;
  const ctaUrl = opts.ctaUrl || (SITE + '/status-embed');
  const ctaText = opts.ctaText || 'View Live Status';

  const rows = [];
  if (opts.systems && opts.systems.length) {
    rows.push(['Affected systems',
      '<span style="color:#333; font-size:14px; font-weight:bold;">' + esc(opts.systems.join(', ')) + '</span>']);
  }
  if (opts.windowText) {
    rows.push(['Window',
      '<span style="color:#333; font-size:14px; font-weight:bold;">' + esc(opts.windowText) + '</span>']);
  }
  const rowsHtml = rows.map((r, i) =>
    '<div style="' + (i > 0 ? 'border-top:1px solid #e8eaf1; margin-top:13px; padding-top:13px;' : '') + '">'
    + '<div style="color:#8b93a9; font-size:10.5px; font-weight:bold; letter-spacing:1.2px; text-transform:uppercase; margin-bottom:5px;">' + r[0] + '</div>'
    + '<div style="line-height:1.5;">' + r[1] + '</div>'
    + '</div>').join('');

  return '<div style="font-family: Arial, Helvetica, sans-serif; background:#eef0f5; padding:28px 16px;">'
    + '<table width="100%" cellpadding="0" cellspacing="0" style="max-width:640px; margin:0 auto; border-collapse:collapse;"><tr><td>'

    // ── Banner (style D: ghost torch watermark, pill under title) ──
    + '<div style="background-color:' + opts.color + '; background-image:url(' + SITE + '/img/torch-ghost.png), linear-gradient(135deg,' + opts.color + ' 0%,' + deep + ' 100%); background-repeat:no-repeat, no-repeat; background-position:right 20px center, left top; background-size:100px 100px, cover; color:#ffffff; padding:24px 34px 26px; border-radius:14px 14px 0 0;">'
    + '<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse; margin-bottom:20px;"><tr>'
    + '<td style="vertical-align:middle;"><img src="' + SITE + '/img/wordmark.png" alt="Orono Technology" height="14" style="height:14px; display:block;"></td>'
    + '<td style="vertical-align:middle; text-align:right; color:#ffffff; font-size:12px; opacity:0.7; white-space:nowrap;">Posted ' + esc(fmtWhen(new Date())) + '</td>'
    + '</tr></table>'
    + '<h1 style="margin:0; font-size:26px; line-height:1.25; max-width:82%;">' + esc(opts.title) + '</h1>'
    + (opts.pill
        ? '<div style="margin-top:12px;">'
          + '<span style="display:inline-block; background:#ffffff; color:' + opts.pill.color + '; font-size:12px; font-weight:bold; padding:4px 14px; border-radius:999px; vertical-align:middle;">' + esc(opts.pill.text) + '</span>'
          + (opts.pillNote ? '<span style="margin-left:10px; font-size:13px; color:#ffffff; opacity:0.85; vertical-align:middle;">' + esc(opts.pillNote) + '</span>' : '')
          + '</div>'
        : '')
    + '</div>'

    // ── Body ──
    + '<div style="background:#ffffff; padding:28px 34px 26px; border-radius:0 0 14px 14px;">'
    + (opts.noteHtml ? '<div style="color:' + GRAY + '; font-size:15px; margin:0 0 4px;">' + opts.noteHtml + '</div>' : '')
    + (rowsHtml
        ? '<div style="background:#f7f8fb; border:1px solid #e8eaf1; border-radius:10px; padding:14px 22px; margin-top:18px;">' + rowsHtml + '</div>'
        : '')
    + '<div style="text-align:center; margin-top:28px;">'
    + '<a href="' + ctaUrl + '" style="display:inline-block; padding:13px 32px; background:#ad2122; color:#ffffff; text-decoration:none; border-radius:999px; font-weight:bold; font-size:14px;">' + esc(ctaText) + '</a>'
    + '</div>'
    + '<div style="border-top:1px solid #edeef4; margin-top:28px; padding-top:18px; text-align:center; color:#9aa0b0; font-size:12px;">'
    + 'Orono Technology Department &nbsp;&bull;&nbsp; <a href="' + SITE + '" style="color:#9aa0b0; text-decoration:underline;">ops-tech.web.app</a>'
    + (opts.footerNote ? '<br><span style="font-size:11px;">' + opts.footerNote + '</span>' : '')
    + '</div>'
    + '</div>'

    + '</td></tr></table></div>';
}

function subscriberFooter(unsubUrl) {
  return 'You subscribed to Orono Tech status updates. ' +
    '<a href="' + unsubUrl + '" style="color:#9aa0b0; text-decoration:underline;">Unsubscribe</a>.';
}

/**
 * Subscriber notice for a newly created incident or maintenance window.
 * unsubUrl is per-recipient (tokened) — notices are sent individually.
 */
function buildIncidentEmail(inc, unsubUrl) {
  const isMaint = inc.type === 'maintenance';
  if (isMaint) {
    const start = inc.startAt && inc.startAt.toDate ? inc.startAt.toDate() : null;
    const end = inc.endAt && inc.endAt.toDate ? inc.endAt.toDate() : null;
    return {
      subject: '[Planned Maintenance] ' + (inc.title || 'Scheduled maintenance'),
      html: statusEmailHtml({
        color: '#2d3f69',
        colorDeep: '#1d2a5d',
        title: inc.title || 'Scheduled maintenance',
        noteHtml: textToHtml(inc.note),
        systems: inc.systemNames || [],
        pill: { text: 'Scheduled', color: '#117a8b' },
        windowText: (start ? fmtWhen(start) : '?') + ' – ' + (end ? fmtWhen(end) : '?'),
        footerNote: subscriberFooter(unsubUrl)
      })
    };
  }
  const meta = STATUS_META[inc.severity] || STATUS_META.down;
  return {
    subject: '[Tech Alert] ' + (inc.title || 'Service incident'),
    html: statusEmailHtml({
      color: '#ad2122',
      colorDeep: '#7a1718',
      title: inc.title || 'Service incident',
      noteHtml: textToHtml(inc.note),
      systems: inc.systemNames || [],
      pill: { text: meta.label, color: meta.color },
      pillNote: 'We are investigating',
      footerNote: subscriberFooter(unsubUrl)
    })
  };
}

/** Double-opt-in confirmation email for a new subscription request. */
function buildVerifyEmail(confirmUrl) {
  return {
    subject: 'Confirm your Orono Tech status updates subscription',
    html: statusEmailHtml({
      color: '#2d3f69',
      colorDeep: '#1d2a5d',
      title: 'Confirm your subscription',
      noteHtml: '<p style="margin:0 0 10px 0;line-height:1.65;">You (or someone using your ' +
        'email address) asked to receive Orono Tech status updates — emails when a ' +
        'service incident or maintenance window is posted.</p>' +
        '<p style="margin:0 0 10px 0;line-height:1.65;">Click the button below to confirm. ' +
        'If you didn\'t request this, just ignore this email and nothing will be sent.</p>',
      pill: { text: 'Action needed', color: '#ad2122' },
      ctaUrl: confirmUrl,
      ctaText: 'Confirm Subscription'
    })
  };
}

/** Admin digest for monitoring-detected status transitions. */
function buildAlertEmail(transitions) {
  const bad = transitions;
  const first = STATUS_META[bad[0].to] || STATUS_META.down;
  const subject = bad.length === 1
    ? '[Monitoring] ' + bad[0].name + ' — ' + first.label
    : '[Monitoring] ' + bad.length + ' systems reporting problems';

  const rowsHtml = bad.map((t, i) => {
    const meta = STATUS_META[t.to] || STATUS_META.down;
    const fromMeta = STATUS_META[t.from];
    return '<div style="' + (i > 0 ? 'border-top:1px solid #e8eaf1; margin-top:14px; padding-top:14px;' : '') + '">'
      + '<div style="margin-bottom:6px;"><span style="color:#333; font-size:15px; font-weight:bold;">' + esc(t.name) + '</span>'
      + '<span style="display:inline-block; margin-left:10px; background:' + meta.color + '; color:#ffffff; font-size:11px; font-weight:bold; padding:3px 11px; border-radius:999px; vertical-align:middle;">' + esc(meta.label) + '</span>'
      + (fromMeta ? '<span style="margin-left:8px; color:#8b93a9; font-size:12px;">was ' + esc(fromMeta.label) + '</span>' : '')
      + '</div>'
      + (t.details ? '<div style="color:#6a7288; font-size:13px; line-height:1.5;">' + esc(t.details) + '</div>' : '')
      + '</div>';
  }).join('');

  return {
    subject: subject,
    html: statusEmailHtml({
      color: '#ad2122',
      colorDeep: '#7a1718',
      title: bad.length === 1 ? bad[0].name : 'Monitoring detected problems',
      noteHtml: '<div style="background:#f7f8fb; border:1px solid #e8eaf1; border-radius:10px; padding:16px 22px;">' + rowsHtml + '</div>',
      pill: { text: 'Monitoring Alert', color: '#b02a37' },
      pillNote: 'Automated check — not yet triaged',
      ctaUrl: SITE + '/status.html',
      ctaText: 'Open Status Page',
      footerNote: 'Automated monitoring alert — recipients are set on the Admin page.'
    })
  };
}

module.exports = { buildIncidentEmail, buildAlertEmail, buildVerifyEmail };
