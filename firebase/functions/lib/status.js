/**
 * System status check logic, ported from Code.gs
 * (checkSystemStatus / scrapeFeedStatus / scrapeGoogleWorkspaceStatus /
 * checkInternalSystem / scrapeStatusPage / checkExternalSystem).
 *
 * CommonJS module for Node 22 Cloud Functions. No dependencies beyond the
 * firebase-admin Firestore instance the caller passes in (native fetch is
 * used for HTTP).
 *
 * Statuses: 'operational' | 'degraded' | 'partial' | 'maintenance' | 'down'
 */

'use strict';

const GOOGLE_WORKSPACE_FEED = 'https://www.google.com/appsstatus/dashboard/en/feed.atom';
const GOOGLE_WORKSPACE_DASHBOARD = 'https://www.google.com/appsstatus/dashboard/';

const FETCH_TIMEOUT_MS = 15000; // old code used UrlFetchApp timeout: 15 (seconds)

// Some status pages (Statuspage.io etc.) return 403 to non-browser agents.
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

/**
 * fetch with a 15s AbortController timeout and browser-like headers.
 * Returns { status: <http code>, text: <body> }. Throws on network error
 * or timeout (callers map that to 'down', like the old try/catch did).
 */
const FETCH_RETRY_DELAY_MS = 2500;

// Consecutive unreachable checks required before a system is marked down
// (2 checks × 15-minute schedule = ~30 minutes). A single blip — a timeout
// or a momentary 404 from a vendor's CDN — keeps the previous status.
const UNREACHABLE_CONFIRM_CHECKS = 2;

async function fetchText(url) {
  try {
    return await fetchTextOnce(url);
  } catch (firstError) {
    // Transient network failures (aborts, resets, DNS hiccups) usually clear
    // within seconds — try once more before reporting a problem.
    await new Promise(r => setTimeout(r, FETCH_RETRY_DELAY_MS));
    try {
      return await fetchTextOnce(url);
    } catch (secondError) {
      throw secondError;
    }
  }
}

async function fetchTextOnce(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method: 'GET',
      redirect: 'follow', // old code: followRedirects: true
      signal: controller.signal,
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    });
    const text = await response.text();
    return { status: response.status, text: text };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Generic RSS/Atom feed status checker.
 * Faithful port of scrapeFeedStatus() from Code.gs:
 *  - parses RSS <item> or Atom <entry> blocks via regex
 *  - skips resolved incidents and incidents older than 48 hours
 *  - keyword-classifies the 5 most recent unresolved items
 *  - priority: down > partial > degraded (maintenance returns early
 *    only when nothing worse has been seen yet)
 */
async function scrapeFeedStatus(feedUrl) {
  try {
    const response = await fetchText(feedUrl);

    if (response.status !== 200) {
      return {
        status: 'down',
        details: 'Unable to access status feed (HTTP ' + response.status + ')',
        unreachable: true
      };
    }

    const xml = response.text;

    // Parse both RSS <item> tags and Atom <entry> tags
    const itemMatches = xml.match(/<item>[\s\S]*?<\/item>/gi);
    const entryMatches = xml.match(/<entry>[\s\S]*?<\/entry>/gi);
    const items = itemMatches || entryMatches;

    if (!items || items.length === 0) {
      // No items/entries means no incidents - all services operational
      return {
        status: 'operational',
        details: 'All services operational (no incidents in feed)'
      };
    }

    // Check the most recent items for active issues
    let hasActiveIssue = false;
    let hasPartialIssue = false;
    let hasDegradedService = false;
    let latestIssue = '';

    // Feeds publish several entries per incident (Google: "UPDATE:" then
    // "RESOLVED:" sharing one incident link; Statuspage: one item per
    // update). Feeds are newest-first, so the FIRST entry seen for an
    // incident is its current state — later (older) entries for the same
    // incident are ignored, which stops a resolved incident's earlier
    // "UPDATE" from being read as still active.
    const seenIncidents = new Set();

    for (let i = 0; i < Math.min(items.length, 12); i++) {
      const item = items[i];

      const incidentKey = incidentKeyFor(item);
      if (incidentKey) {
        if (seenIncidents.has(incidentKey)) continue;
        seenIncidents.add(incidentKey);
      }

      // Extract title (try both CDATA and plain text formats; titles can
      // span lines in Google's atom feed)
      let titleMatch = item.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/i);
      if (!titleMatch) {
        titleMatch = item.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
      }

      // Extract summary/description/content
      let summaryMatch = item.match(/<summary[^>]*>(.*?)<\/summary>/is);
      if (!summaryMatch) {
        summaryMatch = item.match(/<description[^>]*><!\[CDATA\[(.*?)\]\]><\/description>/is);
      }
      if (!summaryMatch) {
        summaryMatch = item.match(/<description[^>]*>(.*?)<\/description>/is);
      }
      if (!summaryMatch) {
        summaryMatch = item.match(/<content[^>]*>(.*?)<\/content>/is);
      }

      const title = titleMatch ? titleMatch[1] : '';
      const summary = summaryMatch ? summaryMatch[1] : '';

      // Check if incident is resolved
      const isResolved = summary.match(/ended\s+at\s+\d{4}-\d{2}-\d{2}/i) ||
                         summary.match(/issue\s+(has\s+been\s+)?resolved/i) ||
                         summary.match(/is\s+now\s+complete/i) ||
                         summary.match(/has\s+been\s+fixed/i) ||
                         summary.match(/resolved/i) ||
                         title.match(/resolved/i) ||
                         title.match(/^\s*\[?(completed|closed|fixed)\]?\s*:?/i) ||
                         title.match(/postmortem|post-mortem|incident report/i);

      // Skip resolved incidents
      if (isResolved) {
        continue;
      }

      // Extract date to check if recent (works for both RSS pubDate and Atom updated)
      let dateMatch = item.match(/<updated>(.*?)<\/updated>/i);
      if (!dateMatch) {
        dateMatch = item.match(/<published>(.*?)<\/published>/i);
      }
      if (!dateMatch) {
        dateMatch = item.match(/<pubDate>(.*?)<\/pubDate>/i);
      }

      if (dateMatch) {
        const itemDate = new Date(dateMatch[1]);
        const now = new Date();
        const hoursSinceUpdate = (now - itemDate) / (1000 * 60 * 60);

        // Only consider incidents updated in the last 48 hours as potentially active
        if (hoursSinceUpdate > 48) {
          continue;
        }
      }

      // Check for service disruption indicators in unresolved, recent incidents
      if (title.match(/service\s+(outage|disruption)/i) ||
          title.match(/not\s+available/i) ||
          title.match(/down/i) ||
          title.match(/major\s+(outage|incident)/i) ||
          summary.match(/service\s+(outage|disruption)/i)) {
        hasActiveIssue = true;
        if (!latestIssue) latestIssue = title.substring(0, 100);
      }

      // Check for partial outages
      if (title.match(/some\s+users/i) ||
          title.match(/limited\s+availability/i) ||
          title.match(/intermittent/i) ||
          title.match(/partial\s+(outage|disruption)/i) ||
          summary.match(/some\s+users/i)) {
        hasPartialIssue = true;
        if (!latestIssue) latestIssue = title.substring(0, 100);
      }

      // Check for degraded performance
      if (title.match(/degraded\s+performance/i) ||
          title.match(/slow/i) ||
          title.match(/delays/i) ||
          summary.match(/degraded\s+performance/i)) {
        hasDegradedService = true;
        if (!latestIssue) latestIssue = title.substring(0, 100);
      }

      // Check for maintenance
      if (title.match(/maintenance/i) ||
          title.match(/scheduled\s+work/i) ||
          summary.match(/maintenance/i)) {
        // Only count as maintenance if not already marked as something worse
        if (!hasActiveIssue && !hasPartialIssue && !hasDegradedService) {
          return {
            status: 'maintenance',
            details: 'Scheduled maintenance: ' + title.substring(0, 100)
          };
        }
      }
    }

    // Return status based on what we found (priority: down > partial > degraded)
    if (hasActiveIssue) {
      return {
        status: 'down',
        details: 'Service issue: ' + (latestIssue || 'Active incident reported')
      };
    }

    if (hasPartialIssue) {
      return {
        status: 'partial',
        details: 'Partial outage: ' + (latestIssue || 'Some users affected')
      };
    }

    if (hasDegradedService) {
      return {
        status: 'degraded',
        details: 'Degraded service: ' + (latestIssue || 'Performance issues reported')
      };
    }

    // No active issues found - all resolved or old
    return {
      status: 'operational',
      details: 'All services operational'
    };

  } catch (error) {
    return {
      status: 'down',
      details: 'Unable to check status feed: ' + String(error)
    };
  }
}

/**
 * Scrapes Google Workspace Status using the public Atom feed.
 * Port of scrapeGoogleWorkspaceStatus().
 */
function scrapeGoogleWorkspaceStatus() {
  return scrapeFeedStatus(GOOGLE_WORKSPACE_FEED);
}

/**
 * Scrapes a status page to determine operational status.
 * Faithful port of scrapeStatusPage() from Code.gs — Statuspage.io CSS-class
 * indicators plus operational/outage/maintenance keyword patterns, falling
 * back to plain reachability ("page accessible" => operational).
 */
async function scrapeStatusPage(url) {
  try {
    const response = await fetchText(url);

    if (response.status !== 200) {
      return {
        status: 'down',
        details: 'Status page unavailable (HTTP ' + response.status + ')',
        source: 'http_error'
      };
    }

    const html = response.text;

    // Pattern 1: Statuspage.io - Check for "All Systems Operational" or similar
    if (html.match(/all\s+systems?\s+(operational|running|up)/i)) {
      return {
        status: 'operational',
        details: 'All systems operational',
        source: 'statuspage_headline'
      };
    }

    // Pattern 2: Statuspage.io - Check for status indicators
    if (html.match(/class="[^"]*status-red[^"]*"/i) || html.match(/class="[^"]*impact-critical[^"]*"/i)) {
      return {
        status: 'down',
        details: 'Major outage reported',
        source: 'statuspage_indicator'
      };
    }

    if (html.match(/class="[^"]*status-orange[^"]*"/i) || html.match(/class="[^"]*impact-major[^"]*"/i)) {
      return {
        status: 'partial',
        details: 'Partial outage reported',
        source: 'statuspage_indicator'
      };
    }

    if (html.match(/class="[^"]*status-yellow[^"]*"/i) || html.match(/class="[^"]*impact-minor[^"]*"/i)) {
      return {
        status: 'degraded',
        details: 'Performance issues reported',
        source: 'statuspage_indicator'
      };
    }

    if (html.match(/class="[^"]*status-blue[^"]*"/i) || html.match(/class="[^"]*maintenance[^"]*"/i)) {
      return {
        status: 'maintenance',
        details: 'Scheduled maintenance in progress',
        source: 'statuspage_indicator'
      };
    }

    // Pattern 3: Check for common operational phrases
    if (html.match(/currently\s+(operational|running|available)/i) ||
        html.match(/no\s+(known\s+)?issues/i) ||
        html.match(/everything\s+(is\s+)?(running|working)/i)) {
      return {
        status: 'operational',
        details: 'Service operational',
        source: 'text_pattern'
      };
    }

    // Pattern 4: Check for outage/incident keywords
    if (html.match(/major\s+(outage|incident)/i) ||
        html.match(/service\s+(outage|unavailable|down)/i)) {
      return {
        status: 'down',
        details: 'Service outage reported',
        source: 'text_pattern'
      };
    }

    if (html.match(/partial\s+outage/i) ||
        html.match(/some\s+services\s+(affected|unavailable)/i)) {
      return {
        status: 'partial',
        details: 'Partial outage reported',
        source: 'text_pattern'
      };
    }

    if (html.match(/degraded\s+(performance|service)/i) ||
        html.match(/investigating\s+(an\s+)?issue/i) ||
        html.match(/performance\s+issues/i)) {
      return {
        status: 'degraded',
        details: 'Service degradation reported',
        source: 'text_pattern'
      };
    }

    if (html.match(/scheduled\s+maintenance/i) ||
        html.match(/maintenance\s+(window|in\s+progress)/i) ||
        html.match(/under\s+maintenance/i)) {
      return {
        status: 'maintenance',
        details: 'Scheduled maintenance in progress',
        source: 'text_pattern'
      };
    }

    // Pattern 5: Statuspage.io - Check for green status (most reliable)
    if (html.match(/class="[^"]*status-green[^"]*"/i) || html.match(/class="[^"]*impact-none[^"]*"/i)) {
      return {
        status: 'operational',
        details: 'All components operational',
        source: 'statuspage_indicator'
      };
    }

    // If we can't determine status, assume operational but note uncertainty
    // (the page was reachable — this is the old checkExternalSystem fallback).
    return {
      status: 'operational',
      details: 'Status page accessible (unable to parse status)',
      source: 'unknown'
    };

  } catch (error) {
    return {
      status: 'down',
      details: 'Unable to access status page: ' + String(error),
      source: 'error',
      unreachable: true
    };
  }
}

/**
 * Checks one system, mirroring the dispatch in the old checkSystemStatus():
 *  1. statusOverride short-circuit
 *  2. url === 'INTERNAL' => Google Workspace feed (checkInternalSystem)
 *  3. feedUrl set => RSS/Atom feed parsing (checkExternalSystem branch 1)
 *  4. otherwise => status-page HTML scrape (checkExternalSystem branch 2)
 *
 * Returns { status, details, url } (url may be rewritten for INTERNAL
 * Workspace checks, matching the old dashboard-link behavior).
 */
async function checkSystem(system) {
  // 1. Manual status override
  if (system.statusOverride && String(system.statusOverride).trim() !== '') {
    return {
      status: system.statusOverride,
      details: 'Status manually set to ' + system.statusOverride,
      url: system.url || ''
    };
  }

  // 2. Internal Google Workspace checks
  if (system.url === 'INTERNAL') {
    const lowerName = String(system.name || '').toLowerCase();
    if (lowerName.indexOf('workspace') >= 0 ||
        lowerName.indexOf('gmail') >= 0 ||
        lowerName.indexOf('drive') >= 0) {
      const statusResult = await scrapeGoogleWorkspaceStatus();
      return {
        status: statusResult.status,
        details: statusResult.details,
        unreachable: !!statusResult.unreachable,
        url: GOOGLE_WORKSPACE_DASHBOARD
      };
    }
    // Generic internal check — always operational (as in the old code)
    return {
      status: 'operational',
      details: 'Internal system operational',
      url: system.url
    };
  }

  // 2b. Google Workspace dashboard URLs: always use the Atom feed. The
  // dashboard HTML contains legend text like "Service outage", which the
  // HTML scraper misreads as a real outage.
  if (String(system.url || '').indexOf('google.com/appsstatus') >= 0) {
    const statusResult = await scrapeGoogleWorkspaceStatus();
    return {
      status: statusResult.status,
      details: statusResult.details,
      unreachable: !!statusResult.unreachable,
      url: GOOGLE_WORKSPACE_DASHBOARD
    };
  }

  // 3. RSS/Atom feed if provided (more reliable than HTML scraping)
  if (system.feedUrl && String(system.feedUrl).trim() !== '') {
    const statusResult = await scrapeFeedStatus(String(system.feedUrl).trim());
    return {
      status: statusResult.status,
      details: statusResult.details,
      unreachable: !!statusResult.unreachable,
      url: system.url || ''
    };
  }

  // 4. Status-page HTML scrape with reachability fallback
  const statusResult = await scrapeStatusPage(system.url);
  return {
    status: statusResult.status,
    details: statusResult.details,
    unreachable: !!statusResult.unreachable,
    url: system.url || ''
  };
}

const HISTORY_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const HOURS_KEPT = 168; // 7 days of hourly uptime buckets
const MAX_EVENTS = 20;  // status-change timeline entries kept on the doc

const SEVERITY = { operational: 0, maintenance: 1, degraded: 2, partial: 3, down: 4 };

function worseOf(a, b) {
  if (!a) return b;
  if (!b) return a;
  return (SEVERITY[b] || 0) > (SEVERITY[a] || 0) ? b : a;
}

/**
 * One-time rebuild of hourly buckets + status-change events from the raw
 * history subcollection (used for systems that predate these fields, so the
 * 7-day strip isn't empty on first deploy).
 */
async function backfillFromHistory(docRef, cutoffMs) {
  const snap = await docRef.collection('history')
    .where('checkedAt', '>=', new Date(cutoffMs))
    .orderBy('checkedAt', 'asc')
    .get();

  const hourly = {};
  const events = [];
  let lastStatus = null;
  let statusSince = null;

  snap.docs.forEach(d => {
    const status = d.get('status') || 'down';
    const at = d.get('checkedAt').toDate();
    const hourKey = String(Math.floor(at.getTime() / 3600000));
    hourly[hourKey] = worseOf(hourly[hourKey], status);
    if (status !== lastStatus) {
      events.push({ status: status, details: d.get('details') || '', at: at });
      lastStatus = status;
      statusSince = at;
    }
  });

  return {
    hourly: hourly,
    events: events.slice(-MAX_EVENTS),
    lastStatus: lastStatus,
    statusSince: statusSince
  };
}

/**
 * Runs all checks for enabled monitored systems and writes results to
 * Firestore.
 *
 * @param {FirebaseFirestore.Firestore} db - firebase-admin Firestore instance
 * @return {Promise<Array>} results: [{ id, name, status, details, url, icon,
 *   category, checkedAt, ... }]
 *
 * Writes, per system (one batch):
 *  - statusResults/{systemId}: {
 *      name, status, details, url, icon, category, description, checkedAt,
 *      statusSince,          // when the current status value began
 *      hourly,               // { "<epochHour>": worst status that hour } (7 days)
 *      events                // last MAX_EVENTS status changes [{status, details, at}]
 *    }
 *  - statusResults/{systemId}/history/{autoId}: { status, details, checkedAt, expireAt }
 */
async function runAllChecks(db) {
  const snap = await db.collection('monitoredSystems')
    .where('enabled', '==', true)
    .get();

  const systems = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  // Active incidents / maintenance windows override the automated check
  // for their affected systems. Maintenance past its window auto-resolves.
  const nowMs0 = Date.now();
  const incidents = [];
  try {
    const incSnap = await db.collection('incidents')
      .where('status', '==', 'active').get();
    for (const d of incSnap.docs) {
      const inc = { id: d.id, ...d.data() };
      if (inc.type === 'maintenance' && inc.endAt &&
          inc.endAt.toMillis() < nowMs0) {
        await d.ref.update({ status: 'resolved', resolvedAt: new Date() });
        continue;
      }
      incidents.push(inc);
    }
  } catch (e) {
    console.warn('Could not load incidents: ' + e);
  }

  // Worst applicable overlay for one system (incident beats maintenance).
  function overlayFor(systemId) {
    let best = null;
    for (const inc of incidents) {
      if (!Array.isArray(inc.systemIds) || inc.systemIds.indexOf(systemId) < 0) continue;
      if (inc.type === 'maintenance') {
        const started = !inc.startAt || inc.startAt.toMillis() <= nowMs0;
        const notEnded = !inc.endAt || inc.endAt.toMillis() >= nowMs0;
        if (started && notEnded && !best) {
          best = {
            status: 'maintenance',
            details: 'Scheduled maintenance: ' + (inc.title || '') +
              (inc.note ? ' — ' + inc.note : '')
          };
        }
      } else {
        const sev = SEVERITY[inc.severity] != null ? inc.severity : 'down';
        if (!best || best.status === 'maintenance' ||
            (SEVERITY[sev] || 0) > (SEVERITY[best.status] || 0)) {
          best = {
            status: sev,
            details: 'Incident: ' + (inc.title || '') +
              (inc.note ? ' — ' + inc.note : '')
          };
        }
      }
    }
    return best;
  }

  // Previous results, for statusSince / events / hourly continuity.
  const prevSnap = await db.collection('statusResults').get();
  const prevById = {};
  prevSnap.docs.forEach(d => { prevById[d.id] = d.data(); });

  // Results for systems that were deleted or disabled are removed — the
  // public embed reads statusResults directly and would otherwise keep
  // showing them. Plain doc delete (not recursive): the history
  // subcollection stays, so re-enabling a system restores its 7-day strip
  // via the backfill.
  const liveIds = new Set(systems.map(s => s.id));
  const orphanRefs = prevSnap.docs.filter(d => !liveIds.has(d.id)).map(d => d.ref);

  if (systems.length === 0) {
    if (orphanRefs.length > 0) {
      const cleanup = db.batch();
      orphanRefs.forEach(ref => cleanup.delete(ref));
      await cleanup.commit();
    }
    return [];
  }

  const settled = await Promise.allSettled(systems.map(s => checkSystem(s)));

  const checkedAt = new Date();
  const nowMs = checkedAt.getTime();
  const hourKey = Math.floor(nowMs / 3600000);
  const oldestKeptHour = hourKey - (HOURS_KEPT - 1);
  const expireAt = new Date(nowMs + HISTORY_TTL_MS);

  const batch = db.batch();
  const results = [];
  // Check-driven transitions into a problem state (down/partial/degraded).
  // Overlay-driven changes are excluded — admins caused those themselves by
  // publishing an incident. Consumed by the monitoring-alert email.
  const alertTransitions = [];

  orphanRefs.forEach(ref => batch.delete(ref));

  for (let i = 0; i < systems.length; i++) {
    const system = systems[i];
    const outcome = settled[i];
    const check = outcome.status === 'fulfilled'
      ? outcome.value
      : {
          status: 'down',
          details: 'Error checking system: ' +
            ((outcome.reason && outcome.reason.message) || String(outcome.reason)),
          url: system.url || '',
          unreachable: true
        };

    const overlay = overlayFor(system.id);
    let status = overlay ? overlay.status : (check.status || 'down');
    if (overlay) check.details = overlay.details;
    const docRef = db.collection('statusResults').doc(system.id);
    let prev = prevById[system.id] || null;

    // Debounce unreachable results: hold the previous status until the
    // failure repeats UNREACHABLE_CONFIRM_CHECKS times in a row.
    const failStreak = check.unreachable ? ((prev && prev.failStreak) || 0) + 1 : 0;
    if (!overlay && check.unreachable && failStreak < UNREACHABLE_CONFIRM_CHECKS
        && prev && prev.status && !isProblemStatus(prev.status)) {
      status = prev.status;
      check.details = 'Status page temporarily unreachable (' + shortReason(check.details)
        + ') — will re-check before reporting a problem';
    }

    // Systems that predate hourly buckets: rebuild from raw history once.
    if (!prev || !prev.hourly) {
      try {
        const bf = await backfillFromHistory(docRef, nowMs - HISTORY_TTL_MS);
        prev = Object.assign({}, prev || {}, {
          hourly: bf.hourly,
          events: bf.events,
          status: bf.lastStatus || (prev && prev.status) || null,
          statusSince: bf.statusSince || (prev && prev.checkedAt) || null
        });
      } catch (e) {
        console.warn('History backfill failed for ' + system.id + ': ' + e);
        prev = Object.assign({ hourly: {} }, prev || {});
      }
    }

    // Hourly buckets: worst status seen in each hour, last 7 days.
    const hourly = {};
    Object.keys(prev.hourly || {}).forEach(k => {
      if (Number(k) >= oldestKeptHour) hourly[k] = prev.hourly[k];
    });
    hourly[String(hourKey)] = worseOf(hourly[String(hourKey)], status);

    // Status transitions -> statusSince + events timeline.
    let statusSince = prev.statusSince || checkedAt;
    let events = Array.isArray(prev.events) ? prev.events.slice() : [];
    if (prev.status !== status) {
      statusSince = checkedAt;
      events.push({ status: status, details: check.details || '', at: checkedAt });
      if (events.length > MAX_EVENTS) events = events.slice(-MAX_EVENTS);
      if (!overlay && (status === 'down' || status === 'partial' || status === 'degraded')) {
        alertTransitions.push({
          id: system.id,
          name: system.name || system.id,
          from: prev.status || null,
          to: status,
          details: check.details || ''
        });
      }
    }

    const result = {
      name: system.name || '',
      status: status,
      details: check.details || '',
      url: check.url || '',
      icon: system.icon || 'language',
      imageUrl: system.imageUrl || '',
      category: system.category || '',
      description: system.description || '',
      sortKey: system.sortKey || 0,
      checkedAt: checkedAt,
      statusSince: statusSince,
      hourly: hourly,
      events: events,
      failStreak: failStreak
    };

    batch.set(docRef, result);
    batch.set(docRef.collection('history').doc(), {
      status: result.status,
      details: result.details,
      checkedAt: checkedAt,
      expireAt: expireAt
    });

    results.push({ id: system.id, ...result });
  }

  await batch.commit();
  results.alertTransitions = alertTransitions;
  return results;
}

// Stable per-incident key for a feed entry: the incident link (Google puts
// the incident URL on every update), else the <id> with its per-update
// suffix stripped, else the title minus any UPDATE:/RESOLVED: prefix.
function incidentKeyFor(item) {
  const link = item.match(/<link[^>]*href="([^"]+)"/i);
  if (link && /incident/i.test(link[1])) return link[1].replace(/[?#].*$/, '');
  const id = item.match(/<id>([^<]+)<\/id>/i) || item.match(/<guid[^>]*>([^<]+)<\/guid>/i);
  if (id) return id[1].trim().replace(/\.[A-Za-z0-9_-]+$/, '');
  const title = item.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (title) return title[1].replace(/^\s*(update|resolved|investigating|monitoring|identified)\s*:\s*/i, '').trim().toLowerCase();
  return '';
}

function isProblemStatus(st) {
  return st === 'down' || st === 'partial' || st === 'degraded';
}
// "Unable to access status page: AbortError: This operation was aborted"
//   -> "timed out"; HTTP codes stay as-is; anything else is trimmed.
function shortReason(details) {
  const d = String(details || '');
  if (/AbortError|aborted|timeout/i.test(d)) return 'timed out';
  const m = /HTTP (\d{3})/.exec(d);
  if (m) return 'HTTP ' + m[1];
  return d.replace(/^Unable to access status (page|feed): /i, '').replace(/^Error checking system: /i, '').slice(0, 80) || 'network error';
}

module.exports = { runAllChecks, scrapeFeedStatus };
