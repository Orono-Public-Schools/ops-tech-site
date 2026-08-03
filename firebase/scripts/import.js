/**
 * One-time Google Sheets -> Firestore import for the OPS Tech site migration.
 *
 * Usage:
 *   node import.js [--wipe] [--dry-run]
 *
 * Auth: uses `gcloud auth print-access-token`. Sign in first with:
 *   gcloud auth login joel.mellor@orono.k12.mn.us --enable-gdrive-access
 * (drive scope covers the Sheets reads; cloud-platform covers Firestore writes)
 *
 * --wipe     delete existing docs in the target collections before importing
 * --dry-run  read + transform + print counts, but write nothing
 *
 * No npm dependencies (Node 18+ built-in fetch).
 */

const { execSync } = require('child_process');

const PROJECT_ID = 'ops-tech-ed432';
const MAIN_SHEET_ID = '12COE6cTBRL_HSW9rhC8fvXFth7mhh5BgwqR1gUacJRw';
const NEWSLETTER_SHEET_ID = '1TZegmAUGXNUy6VIDAFWB2kWAhn8Ej0mjHAIvhfbp6_o';
const DOC_ROOT = `projects/${PROJECT_ID}/databases/(default)/documents`;
const FS_BASE = `https://firestore.googleapis.com/v1/${DOC_ROOT}`;
const SORT_GAP = 1000;

const WIPE = process.argv.includes('--wipe');
const DRY_RUN = process.argv.includes('--dry-run');

let cachedToken = null;
function token() {
  if (!cachedToken) {
    cachedToken = execSync('gcloud auth print-access-token', { encoding: 'utf8' }).trim();
  }
  return cachedToken;
}

async function api(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token()}`,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  if (!res.ok) {
    throw new Error(`${options.method || 'GET'} ${url} -> ${res.status}: ${(await res.text()).slice(0, 500)}`);
  }
  return res.json();
}

// ---------- Sheets ----------

async function sheetsBatchGet(spreadsheetId, ranges) {
  const qs = ranges.map(r => 'ranges=' + encodeURIComponent(r)).join('&');
  const data = await api(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchGet?${qs}&valueRenderOption=FORMATTED_VALUE`
  );
  return data.valueRanges.map(vr => vr.values || []);
}

// ---------- Firestore value encoding ----------

function fsValue(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (v instanceof Date) return { timestampValue: v.toISOString() };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') {
    return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  }
  return { stringValue: String(v) };
}

function fsFields(obj) {
  const fields = {};
  for (const [k, v] of Object.entries(obj)) fields[k] = fsValue(v);
  return fields;
}

// ---------- Firestore ops ----------

async function listAllDocNames(colName) {
  const names = [];
  let pageToken = '';
  do {
    const url = `${FS_BASE}/${colName}?pageSize=300&mask.fieldPaths=__name__` +
      (pageToken ? `&pageToken=${pageToken}` : '');
    const data = await api(url);
    (data.documents || []).forEach(d => names.push(d.name));
    pageToken = data.nextPageToken || '';
  } while (pageToken);
  return names;
}

async function batchWrite(writes) {
  for (let i = 0; i < writes.length; i += 400) {
    const chunk = writes.slice(i, i + 400);
    const data = await api(`${FS_BASE}:batchWrite`, {
      method: 'POST',
      body: JSON.stringify({ writes: chunk })
    });
    const failures = (data.status || []).filter(s => s.code && s.code !== 0);
    if (failures.length) {
      throw new Error('batchWrite failures: ' + JSON.stringify(failures.slice(0, 3)));
    }
  }
}

async function wipeCollection(colName) {
  const names = await listAllDocNames(colName);
  if (names.length) {
    await batchWrite(names.map(name => ({ delete: name })));
  }
  console.log(`  wiped ${colName}: ${names.length} docs deleted`);
}

function insertWrites(colName, docs) {
  // Random-suffix doc ids, like addDoc()
  return docs.map((d, i) => ({
    update: {
      name: `${DOC_ROOT}/${colName}/${colName.slice(0, 4)}-${Date.now().toString(36)}-${i.toString(36).padStart(3, '0')}`,
      fields: fsFields(d)
    }
  }));
}

// ---------- Transformations ----------

const cell = (row, i) => (row && row[i] !== undefined && row[i] !== null ? String(row[i]).trim() : '');
const truthy = v => /^true$/i.test(String(v).trim());

function parseSheetDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

function withSortKeys(rows) {
  return rows.map((r, i) => ({ ...r, sortKey: (i + 1) * SORT_GAP }));
}

function transformLinks(rows) {
  return withSortKeys(rows.filter(r => cell(r, 0)).map(r => ({
    name: cell(r, 0), url: cell(r, 1), description: cell(r, 2),
    iconClass: cell(r, 3), imageUrl: cell(r, 4), category: cell(r, 5),
    updatedAt: new Date()
  })));
}

function transformDocumentation(rows) {
  return withSortKeys(rows.filter(r => cell(r, 0)).map(r => ({
    title: cell(r, 0), url: cell(r, 1), description: cell(r, 2),
    iconClass: cell(r, 3), imageUrl: cell(r, 4), category: cell(r, 5),
    updatedAt: new Date()
  })));
}

function transformHome(rows) {
  return withSortKeys(rows.filter(r => cell(r, 0)).map(r => ({
    name: cell(r, 0), url: cell(r, 1), description: cell(r, 2),
    iconClass: cell(r, 3), imageUrl: cell(r, 4)
  })));
}

function transformImages(rows) {
  return withSortKeys(rows.filter(r => cell(r, 1)).map(r => ({
    description: cell(r, 0), url: cell(r, 1), category: cell(r, 2)
  })));
}

function transformEmailGroups(rows) {
  return rows.filter(r => cell(r, 0)).map(r => ({
    name: cell(r, 0), email: cell(r, 1), description: cell(r, 2)
  }));
}

function transformCommunications(rows) {
  return rows.filter(r => cell(r, 1)).map(r => ({
    sentAt: parseSheetDate(cell(r, 0)) || new Date(0),
    subject: cell(r, 1),
    recipients: cell(r, 2),
    templateUsed: cell(r, 3),
    previewText: cell(r, 4),
    bodyHtml: r[5] != null ? String(r[5]) : '',
    source: 'archive'
  }));
}

function transformMonitoredSystems(rows) {
  return withSortKeys(rows.filter(r => cell(r, 0)).map(r => ({
    name: cell(r, 0), url: cell(r, 1), description: cell(r, 2),
    icon: cell(r, 3), enabled: truthy(cell(r, 4)), category: cell(r, 5),
    statusOverride: cell(r, 6), feedUrl: cell(r, 7)
  })));
}

function transformConfig(rows) {
  const map = {};
  rows.forEach(r => { if (cell(r, 0)) map[cell(r, 0)] = cell(r, 1); });
  return {
    accessControlEnabled: truthy(map.ACCESS_CONTROL_ENABLED),
    allowedGroupEmail: map.ALLOWED_GROUP_EMAIL || '',
    senderEmail: map.SENDER_EMAIL || '',
    senderName: map.SENDER_NAME || 'Orono Tech Department',
    statusCheckIntervalMinutes: 5
  };
}

// ---------- Newsletter HTML (port of generateNewsletterHTML / convertDriveImageUrl) ----------

function convertDriveImageUrl(url) {
  if (!url || typeof url !== 'string') return '';
  const match = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  return match ? 'https://drive.google.com/uc?export=view&id=' + match[1] : url;
}

function formatNewsletterDate(date) {
  return date.toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric', timeZone: 'America/Chicago'
  });
}

function generateNewsletterHTML(data) {
  let html = '<div style="font-family: Roboto, Arial, sans-serif; max-width: 800px; margin: 0 auto;">';
  html += '<div style="background: linear-gradient(135deg, #2d3f89 0%, #4356a0 100%); color: white; padding: 40px; text-align: center; border-radius: 8px 8px 0 0;">';

  if (data.date) {
    html += '<div style="opacity: 0.9; font-size: 14px; margin-bottom: 12px;">' + formatNewsletterDate(data.date) + '</div>';
  }
  if (data.title) {
    html += '<h1 style="font-size: 32px; margin: 0 0 12px 0;">' + data.title + '</h1>';
  }
  if (data.subtitle) {
    html += '<p style="font-size: 18px; margin: 0; opacity: 0.9;">' + data.subtitle + '</p>';
  }
  html += '</div>';

  const topics = [data.topic1, data.topic2, data.topic3].filter(t => t.title && (t.url || t.description));
  for (const topic of topics) {
    html += '<div style="background: white; padding: 30px; margin: 20px 0; border-radius: 8px; box-shadow: 0 2px 6px rgba(0,0,0,0.1);">';
    html += '<h2 style="color: #2d3f89; font-size: 24px; margin: 0 0 16px 0;">' + topic.title + '</h2>';
    if (topic.url) {
      html += '<img src="' + convertDriveImageUrl(topic.url) + '" alt="' + topic.title + '" style="max-width: 100%; height: auto; border-radius: 6px; margin-bottom: 16px;">';
    }
    if (topic.description) {
      html += '<div style="color: #4a4a4a; line-height: 1.6; margin-bottom: 16px;">' + topic.description + '</div>';
    }
    if (topic.buttonText && topic.buttonUrl) {
      html += '<a href="' + topic.buttonUrl + '" style="display: inline-block; background: #2d3f89; color: white; padding: 10px 22px; border-radius: 4px; text-decoration: none; font-weight: 600;">' + topic.buttonText + '</a>';
    }
    html += '</div>';
  }

  if (data.finalButtonUrl) {
    html += '<div style="background: white; padding: 40px; text-align: center; margin: 20px 0; border-radius: 8px; border-top: 4px solid #ad2122;">';
    html += '<h3 style="color: #2d3f89; margin: 0 0 20px 0;">Ready to Learn More?</h3>';
    html += '<a href="' + data.finalButtonUrl + '" style="display: inline-block; background: #ad2122; color: white; padding: 10px 22px; border-radius: 4px; text-decoration: none; font-weight: 600;">Visit the OPS Digital Learning Hub</a>';
    html += '</div>';
  }

  html += '</div>';
  return html;
}

function transformNewsletters(columns) {
  // columns = array of 5 single-column value arrays (B..F, rows 1-23)
  const docs = [];
  for (const values of columns) {
    const v = i => (values[i] && values[i][0] !== undefined ? String(values[i][0]).trim() : '');
    const date = parseSheetDate(v(0));
    const title = v(1);
    if (!date || !title) continue;

    const data = {
      date, title, subtitle: v(2),
      topic1: { title: v(3), url: v(4), description: v(5), buttonText: v(6), buttonUrl: v(7) },
      topic2: { title: v(8), url: v(9), description: v(10), buttonText: v(11), buttonUrl: v(12) },
      topic3: { title: v(13), url: v(14), description: v(15), buttonText: v(16), buttonUrl: v(17) },
      finalButtonUrl: v(18),
      to: v(19), cc: v(20), bcc: v(21),
      layoutStyle: v(22) || 'Offset'
    };

    const previewParts = [];
    if (data.subtitle) previewParts.push(data.subtitle);
    if (data.topic1.title) previewParts.push(data.topic1.title);

    docs.push({
      sentAt: date,
      subject: title,
      recipients: data.to || 'Newsletter Recipients',
      templateUsed: data.layoutStyle + ' Layout',
      previewText: previewParts.join(' • '),
      bodyHtml: generateNewsletterHTML(data),
      source: 'newsletter'
    });
  }
  return docs;
}

// ---------- Main ----------

async function main() {
  console.log(`Import -> ${PROJECT_ID}${DRY_RUN ? ' (DRY RUN)' : ''}${WIPE ? ' (wipe first)' : ''}`);

  console.log('Reading main spreadsheet...');
  const [links, documentation, home, communications, emailGroups, images, config, systems] =
    await sheetsBatchGet(MAIN_SHEET_ID, [
      'Links!A2:F', 'Documentation!A2:F', 'Home!A2:E', 'Communications!A2:F',
      'EmailGroups!A2:C', 'Image_URLS!A2:C', 'Config!A2:B', "'Monitored Systems'!A2:H"
    ]);

  console.log('Reading newsletter spreadsheet...');
  const newsletterCols = await sheetsBatchGet(NEWSLETTER_SHEET_ID,
    ['B1:B23', 'C1:C23', 'D1:D23', 'E1:E23', 'F1:F23']);

  const payload = {
    links: transformLinks(links),
    documentation: transformDocumentation(documentation),
    homePages: transformHome(home),
    images: transformImages(images),
    emailGroups: transformEmailGroups(emailGroups),
    monitoredSystems: transformMonitoredSystems(systems),
    communications: [
      ...transformCommunications(communications),
      ...transformNewsletters(newsletterCols)
    ]
  };
  const configDoc = transformConfig(config);

  for (const [col, docs] of Object.entries(payload)) {
    console.log(`  ${col}: ${docs.length} docs`);
  }
  console.log('  config/app:', JSON.stringify(configDoc));

  if (DRY_RUN) {
    console.log('Dry run — nothing written.');
    return;
  }

  for (const [col, docs] of Object.entries(payload)) {
    if (WIPE) await wipeCollection(col);
    if (docs.length) await batchWrite(insertWrites(col, docs));
    console.log(`  wrote ${col}: ${docs.length}`);
  }

  await batchWrite([{
    update: { name: `${DOC_ROOT}/config/app`, fields: fsFields(configDoc) }
  }]);
  console.log('  wrote config/app');

  console.log('Import complete.');
}

main().catch(err => {
  console.error('IMPORT FAILED:', err.message);
  process.exit(1);
});
