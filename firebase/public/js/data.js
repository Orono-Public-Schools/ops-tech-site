// Firestore data layer — replaces the old google.script.run backend calls.
// Collections: links, documentation, homePages, images, emailGroups,
// communications, monitoredSystems, config/app, statusResults,
// users/{uid}/drafts.

import { db } from './firebase-init.js';
import {
  collection, doc, getDoc, getDocs, getDocsFromCache, addDoc, setDoc, updateDoc,
  deleteDoc, query, where, orderBy, limit, writeBatch, serverTimestamp, onSnapshot, Timestamp
} from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js';

const SORT_GAP = 1000;

function mapSnap(snap) {
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// Cache-first query: render instantly from the persistent local cache when
// possible, while a background server read keeps the cache fresh for the
// next visit. Local writes update the cache immediately, so your own edits
// always show right away.
async function cachedQuery(q) {
  try {
    const cached = await getDocsFromCache(q);
    if (!cached.empty) {
      getDocs(q).catch(() => {}); // background refresh
      return cached;
    }
  } catch (e) {
    // cache unavailable (first visit) — fall through to server
  }
  return getDocs(q);
}

async function getBySortKey(colName) {
  return mapSnap(await cachedQuery(query(collection(db, colName), orderBy('sortKey'))));
}

// ---------- Reads ----------

export const getHomePages = () => getBySortKey('homePages');
export const getLinks = () => getBySortKey('links');
export const getDocumentation = () => getBySortKey('documentation');
export const getImages = () => getBySortKey('images');
export const getMonitoredSystems = () => getBySortKey('monitoredSystems');

export async function getEmailGroups() {
  return mapSnap(await cachedQuery(query(collection(db, 'emailGroups'), orderBy('name'))));
}

export async function getCommunications() {
  return mapSnap(await cachedQuery(query(collection(db, 'communications'), orderBy('sentAt', 'desc'))));
}

export async function getConfig() {
  const snap = await getDoc(doc(db, 'config', 'app'));
  return snap.exists() ? snap.data() : {};
}

export async function saveConfig(values) {
  await setDoc(doc(db, 'config', 'app'), values, { merge: true });
}

// Unique, sorted category names from an already-loaded list
// (replaces the old getCategories(sheetName) server call).
export function categoriesOf(items) {
  const cats = new Set();
  items.forEach(item => {
    if (item.category) cats.add(item.category);
  });
  return [...cats].sort();
}

// ---------- Writes ----------

export async function addItem(colName, data) {
  const last = await getDocs(
    query(collection(db, colName), orderBy('sortKey', 'desc'), limit(1)));
  const maxKey = last.empty ? 0 : (last.docs[0].get('sortKey') || 0);
  const ref = await addDoc(collection(db, colName), {
    ...data,
    sortKey: maxKey + SORT_GAP,
    updatedAt: serverTimestamp()
  });
  return ref.id;
}

export async function updateItem(colName, id, data) {
  await updateDoc(doc(db, colName, id), { ...data, updatedAt: serverTimestamp() });
}

export async function deleteItem(colName, id) {
  await deleteDoc(doc(db, colName, id));
}

// Persist a drag-reorder: rewrite sortKey for the whole collection in one batch.
export async function saveOrder(colName, orderedIds) {
  const batch = writeBatch(db);
  orderedIds.forEach((id, index) => {
    batch.update(doc(db, colName, id), { sortKey: (index + 1) * SORT_GAP });
  });
  await batch.commit();
}

// ---------- Incidents & scheduled maintenance ----------
// Admin-created; publicly readable so the embed can show banners.
// type: 'incident' (severity down/partial/degraded, active until resolved)
//    or 'maintenance' (startAt/endAt window; auto-resolved after endAt).

export function onActiveIncidents(callback) {
  const q = query(collection(db, 'incidents'), where('status', '==', 'active'));
  return onSnapshot(q, snap => callback(mapSnap(snap)));
}

export async function addIncident(data) {
  const ref = await addDoc(collection(db, 'incidents'), {
    ...data, status: 'active', createdAt: serverTimestamp()
  });
  return ref.id;
}

export async function resolveIncident(id) {
  await updateDoc(doc(db, 'incidents', id),
    { status: 'resolved', resolvedAt: serverTimestamp() });
}

export async function deleteIncident(id) {
  await deleteDoc(doc(db, 'incidents', id));
}

// ---------- Public status embed branding ----------
// config/publicStatus is publicly gettable (see rules) so the no-auth
// embed can show the district logo/title/descriptor.

export async function getPublicStatusConfig() {
  const snap = await getDoc(doc(db, 'config', 'publicStatus'));
  return snap.exists() ? snap.data() : {};
}

export async function savePublicStatusConfig(values) {
  await setDoc(doc(db, 'config', 'publicStatus'), values, { merge: true });
}

// ---------- Status page category order ----------
// Sentinel doc in monitoredSystems (no sortKey/enabled fields, so the
// ordered queries and the status checker never see it). Writable by
// anyone with the status permission, like the systems themselves.

export async function getStatusCategoryOrder() {
  const snap = await getDoc(doc(db, 'monitoredSystems', '_categoryOrder'));
  return snap.exists() ? (snap.data().categories || []) : [];
}

export async function saveStatusCategoryOrder(categories) {
  await setDoc(doc(db, 'monitoredSystems', '_categoryOrder'), { categories });
}

// ---------- Communications archive ----------

export async function archiveManualEmail(subject, bodyHtml, templateUsed) {
  await addDoc(collection(db, 'communications'), {
    sentAt: serverTimestamp(),
    subject: subject,
    recipients: 'Sent manually from Gmail',
    templateUsed: templateUsed || 'Manual',
    previewText: stripHtml(bodyHtml).substring(0, 200),
    bodyHtml: bodyHtml,
    source: 'archive'
  });
}

export function stripHtml(html) {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return (tmp.textContent || tmp.innerText || '').replace(/\s+/g, ' ').trim();
}

// ---------- Per-user email drafts (replaces PropertiesService) ----------

const MAX_DRAFTS = 10;

function draftsCol(uid) {
  return collection(db, 'users', uid, 'drafts');
}

export async function getAllDrafts(uid) {
  return mapSnap(await getDocs(query(draftsCol(uid), orderBy('updatedAt', 'desc'))));
}

export async function loadDraft(uid, draftId) {
  const snap = await getDoc(doc(db, 'users', uid, 'drafts', draftId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function saveDraft(uid, draftData, draftId) {
  if (draftId) {
    await setDoc(doc(db, 'users', uid, 'drafts', draftId),
      { ...draftData, updatedAt: serverTimestamp() }, { merge: true });
    return draftId;
  }
  const ref = await addDoc(draftsCol(uid), { ...draftData, updatedAt: serverTimestamp() });
  // Cap at MAX_DRAFTS: prune the oldest beyond the limit.
  const all = await getAllDrafts(uid);
  for (const stale of all.slice(MAX_DRAFTS)) {
    await deleteDoc(doc(db, 'users', uid, 'drafts', stale.id));
  }
  return ref.id;
}

export async function deleteDraft(uid, draftId) {
  await deleteDoc(doc(db, 'users', uid, 'drafts', draftId));
}

// ---------- Reusable compose snippets (shared, communications perm) ----------

export async function getSnippets() {
  return mapSnap(await getDocs(query(collection(db, 'snippets'), orderBy('name'))));
}

export async function saveSnippet(name, html, createdBy) {
  await addDoc(collection(db, 'snippets'), {
    name, html, createdBy: createdBy || '', updatedAt: serverTimestamp()
  });
}

export async function deleteSnippet(id) {
  await deleteDoc(doc(db, 'snippets', id));
}

// ---------- Scheduled emails (sent by the processScheduledEmails function) ----------

export async function scheduleEmail(payload, sendAtDate, createdBy) {
  const ref = await addDoc(collection(db, 'scheduledEmails'), {
    ...payload,
    sendAt: Timestamp.fromDate(sendAtDate),
    status: 'pending',
    createdBy: createdBy || '',
    createdAt: serverTimestamp()
  });
  return ref.id;
}

export async function getScheduledEmails() {
  return mapSnap(await getDocs(query(collection(db, 'scheduledEmails'), orderBy('sendAt'))));
}

export async function cancelScheduledEmail(id) {
  await deleteDoc(doc(db, 'scheduledEmails', id));
}

// ---------- Access allowlist (Admin page) ----------

export async function getAllowedUsers() {
  return mapSnap(await getDocs(query(collection(db, 'allowedUsers'), orderBy('email'))));
}

// New users start view-only ("Tech Specialist"): they can browse the site
// but edit nothing until an admin assigns a role on the Admin page.
const DEFAULT_PERMS = {
  homePages: false, links: false, documentation: false, images: false,
  communications: false, admin: false
};

export async function addAllowedUser(email) {
  const id = String(email).trim().toLowerCase();
  await setDoc(doc(db, 'allowedUsers', id),
    { email: id, perms: DEFAULT_PERMS, addedAt: serverTimestamp() }, { merge: true });
  return { ...DEFAULT_PERMS };
}

export async function setAllowedUserPerm(email, key, value) {
  const id = String(email).trim().toLowerCase();
  await updateDoc(doc(db, 'allowedUsers', id), { ['perms.' + key]: !!value });
}

// Replace the whole perms map at once (role preset assignment).
export async function setAllowedUserPerms(email, perms) {
  const id = String(email).trim().toLowerCase();
  await updateDoc(doc(db, 'allowedUsers', id), { perms: perms });
}

export async function removeAllowedUser(email) {
  await deleteDoc(doc(db, 'allowedUsers', String(email).trim().toLowerCase()));
}

// ---------- Status ----------

export function onStatusResults(callback) {
  return onSnapshot(collection(db, 'statusResults'), snap => callback(mapSnap(snap)));
}

// Status-update subscriptions live in statusSubscribers/{email} but are
// managed entirely by Cloud Functions (public embed form + email links).

export { serverTimestamp, Timestamp };
