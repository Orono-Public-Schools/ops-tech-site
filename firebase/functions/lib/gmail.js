/**
 * Gmail sending via a domain-wide-delegated service account.
 * The JWT impersonates the fixed department sender address (config/app.senderEmail);
 * DWD must be granted in the Workspace Admin console for scope gmail.send.
 */

'use strict';

const { google } = require('googleapis');

// RFC 2047 encoded-word for non-ASCII headers (subject, display name).
function encodeHeader(text) {
  if (!/[^\x20-\x7E]/.test(text)) return text;
  return '=?UTF-8?B?' + Buffer.from(text, 'utf8').toString('base64') + '?=';
}

function buildMime({ senderName, senderEmail, to, cc, bcc, subject, html, text }) {
  const boundary = 'ops-tech-' + Date.now().toString(36);
  const lines = [
    `From: "${encodeHeader(senderName)}" <${senderEmail}>`,
    `To: ${to.join(', ')}`
  ];
  if (cc.length) lines.push(`Cc: ${cc.join(', ')}`);
  if (bcc.length) lines.push(`Bcc: ${bcc.join(', ')}`);
  lines.push(
    `Subject: ${encodeHeader(subject)}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 7bit',
    '',
    text || 'This email requires HTML support.',
    '',
    `--${boundary}`,
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    Buffer.from(html, 'utf8').toString('base64').replace(/(.{76})/g, '$1\r\n'),
    '',
    `--${boundary}--`
  );
  return lines.join('\r\n');
}

/**
 * Send an HTML email as the department sender.
 * @param {object} opts { saKeyJson, senderEmail, senderName, to[], cc[], bcc[], subject, html }
 */
async function sendGmail(opts) {
  const key = JSON.parse(opts.saKeyJson);
  const jwt = new google.auth.JWT({
    email: key.client_email,
    key: key.private_key,
    scopes: ['https://www.googleapis.com/auth/gmail.send'],
    subject: opts.senderEmail // DWD impersonation of the dept mailbox
  });

  const gmail = google.gmail({ version: 'v1', auth: jwt });
  const mime = buildMime({
    senderName: opts.senderName || 'Orono Tech Department',
    senderEmail: opts.senderEmail,
    to: opts.to || [],
    cc: opts.cc || [],
    bcc: opts.bcc || [],
    subject: opts.subject,
    html: opts.html
  });

  await gmail.users.messages.send({
    userId: 'me',
    requestBody: {
      raw: Buffer.from(mime, 'utf8').toString('base64url')
    }
  });
}

module.exports = { sendGmail };
