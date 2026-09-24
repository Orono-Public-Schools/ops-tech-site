// Incident / maintenance notes: rich-text sanitising + the update timeline,
// shared by status.html (admin) and status-embed.html (public).
//
// Incident doc fields:
//   note      plain text of the latest update (kept for the status sweep's
//             overlay details and anything else that wants plain text)
//   noteHtml  sanitised HTML of the latest update
//   updates   [{ stage, html, text, at }] oldest first
// Older docs only have `note`; they render as a single untitled update.

export const INCIDENT_STAGES = {
  investigating: 'Investigating',
  identified: 'Identified',
  monitoring: 'Monitoring',
  update: 'Update'
};

export const MAINT_STAGES = {
  scheduled: 'Scheduled',
  in_progress: 'In Progress',
  update: 'Update'
};

const STAGE_LABELS = { ...INCIDENT_STAGES, ...MAINT_STAGES, resolved: 'Resolved', completed: 'Completed' };

const ALLOWED = new Set(['P', 'BR', 'STRONG', 'B', 'EM', 'I', 'U', 'S', 'UL', 'OL', 'LI', 'A']);
const DROP = new Set(['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'TEMPLATE', 'NOSCRIPT']);
const EMPTY_HTML = /^(<p>(<br>|&nbsp;|\s)*<\/p>\s*)*$/;

function esc(t) {
  const d = document.createElement('div');
  d.textContent = t == null ? '' : String(t);
  return d.innerHTML;
}

// Keep only basic formatting (bold/italic/underline, lists, links).
export function sanitizeNoteHtml(html) {
  if (!html) return '';
  const doc = new DOMParser().parseFromString('<div>' + html + '</div>', 'text/html');
  const root = doc.body.firstElementChild;
  (function clean(node) {
    Array.from(node.childNodes).forEach(child => {
      if (child.nodeType === 3) return;
      if (child.nodeType !== 1 || DROP.has(child.tagName)) { child.remove(); return; }
      clean(child);
      if (!ALLOWED.has(child.tagName)) {
        child.replaceWith(...child.childNodes);
        return;
      }
      const href = child.tagName === 'A' ? (child.getAttribute('href') || '').trim() : '';
      Array.from(child.attributes).forEach(a => child.removeAttribute(a.name));
      if (child.tagName === 'A') {
        if (/^(https?:|mailto:)/i.test(href)) {
          child.setAttribute('href', href);
          child.setAttribute('target', '_blank');
          child.setAttribute('rel', 'noopener');
        } else {
          child.replaceWith(...child.childNodes);
        }
      }
    });
  })(root);
  const out = root.innerHTML.trim();
  return EMPTY_HTML.test(out) ? '' : out;
}

export function isEmptyNoteHtml(html) {
  return !html || EMPTY_HTML.test(String(html).trim());
}

export function textToNoteHtml(text) {
  const t = String(text || '').trim();
  if (!t) return '';
  return t.split(/\n{2,}/).map(p => '<p>' + esc(p).replace(/\n/g, '<br>') + '</p>').join('');
}

export function noteHtmlToText(html) {
  if (!html) return '';
  const doc = new DOMParser().parseFromString(
    String(html).replace(/<\/(p|li)>/gi, '$&\n').replace(/<br\s*\/?>/gi, '\n'), 'text/html');
  return (doc.body.textContent || '').replace(/\n{3,}/g, '\n\n').trim();
}

// Latest note as sanitised HTML (falls back to the plain-text note).
export function latestNoteHtml(inc) {
  return inc.noteHtml ? sanitizeNoteHtml(inc.noteHtml) : textToNoteHtml(inc.note);
}

function toDate(ts) {
  if (!ts) return null;
  if (typeof ts.toDate === 'function') return ts.toDate();
  const d = new Date(ts);
  return isNaN(d) ? null : d;
}

function fmtWhen(d) {
  if (!d) return '';
  const sameDay = new Date().toDateString() === d.toDateString();
  return sameDay
    ? d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    : d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

// Timeline entries, oldest first.
export function updatesOf(inc) {
  if (Array.isArray(inc.updates) && inc.updates.length) return inc.updates;
  const html = latestNoteHtml(inc);
  return html ? [{ stage: '', html: html, at: inc.createdAt || null }] : [];
}

// A new timeline entry from editor HTML.
export function makeUpdate(stage, html) {
  const clean = sanitizeNoteHtml(html);
  return { stage: stage || 'update', html: clean, text: noteHtmlToText(clean), at: new Date() };
}

function entryHtml(u) {
  const label = STAGE_LABELS[u.stage] || '';
  const at = toDate(u.at);
  return '<div class="nt-entry">'
    + '<div class="nt-meta">'
    + (label ? '<span class="nt-stage nt-' + esc(u.stage) + '">' + esc(label) + '</span>' : '')
    + (at ? '<span class="nt-at">' + esc(fmtWhen(at)) + '</span>' : '')
    + '</div>'
    + '<div class="nt-body">' + sanitizeNoteHtml(u.html || textToNoteHtml(u.text)) + '</div>'
    + '</div>';
}

// Latest update in full, earlier ones in a collapsible "N earlier updates".
export function renderNotes(inc) {
  const list = updatesOf(inc).filter(u => u && (u.html || u.text));
  if (!list.length) return '';
  const latest = list[list.length - 1];
  const earlier = list.slice(0, -1).reverse();
  return '<div class="nt-notes">'
    + entryHtml(latest)
    + (earlier.length
        ? '<details class="nt-history"><summary>' + earlier.length + ' earlier update' + (earlier.length > 1 ? 's' : '') + '</summary>'
          + earlier.map(entryHtml).join('') + '</details>'
        : '')
    + '</div>';
}

const STYLE = `
  .nt-notes { margin-top: 10px; position: relative; }
  .nt-entry + .nt-entry { border-top: 1px dashed rgba(45,63,105,0.18); margin-top: 10px; padding-top: 10px; }
  .nt-meta { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
  .nt-stage { font-size: 0.72em; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em;
    color: #2d3f69; background: rgba(45,63,105,0.09); padding: 2px 9px; border-radius: 999px; }
  .nt-stage.nt-investigating { color: #ad2122; background: rgba(173,33,34,0.09); }
  .nt-stage.nt-identified { color: #b35900; background: rgba(253,126,20,0.12); }
  .nt-stage.nt-monitoring { color: #117a8b; background: rgba(23,162,184,0.12); }
  .nt-stage.nt-in_progress { color: #117a8b; background: rgba(23,162,184,0.12); }
  .nt-at { font-size: 0.74em; color: #8b93a9; }
  .nt-body { font-size: 0.9em; color: #3d4560; line-height: 1.6; overflow-wrap: anywhere; }
  .nt-body p { margin: 0 0 6px; }
  .nt-body p:last-child { margin-bottom: 0; }
  .nt-body ul, .nt-body ol { margin: 4px 0 6px; padding-left: 22px; }
  .nt-body li { margin: 2px 0; }
  .nt-body a { color: #ad2122; font-weight: 600; }
  .nt-history { margin-top: 10px; }
  .nt-history summary { cursor: pointer; font-size: 0.78em; font-weight: 600; color: #2d3f69;
    list-style: none; display: inline-flex; align-items: center; gap: 4px; }
  .nt-history summary::-webkit-details-marker { display: none; }
  .nt-history summary::before { content: '\\25B8'; transition: transform 0.2s; display: inline-block; }
  .nt-history[open] summary::before { transform: rotate(90deg); }
  .nt-history .nt-entry { opacity: 0.85; border-top: 1px dashed rgba(45,63,105,0.18); margin-top: 10px; padding-top: 10px; }
`;

let styled = false;
export function ensureNoteStyles() {
  if (styled) return;
  styled = true;
  const s = document.createElement('style');
  s.textContent = STYLE;
  document.head.appendChild(s);
}
