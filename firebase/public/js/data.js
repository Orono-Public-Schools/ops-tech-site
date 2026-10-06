// Firestore data layer — replaces the old google.script.run backend calls.
// Collections: links, documentation, homePages, images, emailGroups,
// communications, monitoredSystems, config/app, statusResults,
// draftFolders/{id}/drafts, users/{uid}/prefs, staff, config/staffSync.

import { db } from './firebase-init.js';
import {
  collection, doc, getDoc, getDocs, getDocsFromCache, addDoc, setDoc, updateDoc,
  deleteDoc, query, where, orderBy, limit, writeBatch, serverTimestamp, onSnapshot, Timestamp,
  deleteField
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

// Archive / restore a sent email (rules allow only these keys to change).
export async function setCommunicationArchived(id, archived, byEmail) {
  await updateDoc(doc(db, 'communications', id), archived
    ? { archived: true, archivedBy: byEmail || '', archivedAt: serverTimestamp() }
    : { archived: false, archivedBy: deleteField(), archivedAt: deleteField() });
}

export function stripHtml(html) {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return (tmp.textContent || tmp.innerText || '').replace(/\s+/g, ' ').trim();
}

// ---------- Legacy per-user drafts (users/{uid}/drafts) ----------
// Only used by migrateLegacyDrafts(); new drafts live in draftFolders.

function legacyDraftsCol(uid) {
  return collection(db, 'users', uid, 'drafts');
}

async function getLegacyDrafts(uid) {
  return mapSnap(await getDocs(query(legacyDraftsCol(uid), orderBy('updatedAt', 'desc'))));
}

// ---------- Draft folders + collaborative drafts ----------
// draftFolders/{folderId}: { name, personal, ownerUid, ownerEmail, members: [emails] }
// draftFolders/{folderId}/drafts/{draftId}: the compose form, one Firestore
// field per editable control (topics keyed by id + topicOrder) so several
// people can edit different fields at once; `presence.{uid}` shows who is
// in which field.

export const personalFolderId = uid => 'personal_' + uid;

export async function ensurePersonalFolder(uid, email) {
  const ref = doc(db, 'draftFolders', personalFolderId(uid));
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      name: 'My Drafts', personal: true, ownerUid: uid,
      ownerEmail: (email || '').toLowerCase(), members: [],
      createdAt: serverTimestamp(), updatedAt: serverTimestamp()
    });
  }
  return personalFolderId(uid);
}

// Folders I own plus folders shared with me: personal first, then by name.
export async function getMyFolders(uid, email) {
  const me = (email || '').toLowerCase();
  const owned = await getDocs(query(collection(db, 'draftFolders'), where('ownerUid', '==', uid)));
  let shared = [];
  try {
    shared = mapSnap(await getDocs(query(collection(db, 'draftFolders'), where('members', 'array-contains', me))));
  } catch (e) {
    console.warn('Shared-folder query failed (owned folders still listed):', e);
  }
  const seen = new Map();
  mapSnap(owned).concat(shared).forEach(f => seen.set(f.id, f));
  return [...seen.values()].sort((a, b) => {
    if (!!a.personal !== !!b.personal) return a.personal ? -1 : 1;
    const ao = a.ownerUid === uid, bo = b.ownerUid === uid;
    if (ao !== bo) return ao ? -1 : 1;
    return (a.name || '').localeCompare(b.name || '');
  });
}

export async function createFolder(uid, email, name, members) {
  const ref = await addDoc(collection(db, 'draftFolders'), {
    name: String(name || 'Untitled folder').trim(), personal: false,
    ownerUid: uid, ownerEmail: (email || '').toLowerCase(),
    members: normaliseEmails(members),
    createdAt: serverTimestamp(), updatedAt: serverTimestamp()
  });
  return ref.id;
}

export async function updateFolder(folderId, values) {
  const patch = { ...values, updatedAt: serverTimestamp() };
  if (patch.members) patch.members = normaliseEmails(patch.members);
  await updateDoc(doc(db, 'draftFolders', folderId), patch);
}

// Deletes the folder and everything in it.
export async function deleteFolder(folderId) {
  const drafts = await getDocs(collection(db, 'draftFolders', folderId, 'drafts'));
  const batch = writeBatch(db);
  drafts.docs.forEach(d => batch.delete(d.ref));
  batch.delete(doc(db, 'draftFolders', folderId));
  await batch.commit();
}

function normaliseEmails(list) {
  return [...new Set((list || []).map(e => String(e || '').trim().toLowerCase()).filter(Boolean))];
}

export async function getFolderDrafts(folderId) {
  return mapSnap(await getDocs(
    query(collection(db, 'draftFolders', folderId, 'drafts'), orderBy('updatedAt', 'desc'))));
}

export function draftDocRef(folderId, draftId) {
  return doc(db, 'draftFolders', folderId, 'drafts', draftId);
}

export async function loadDraft(folderId, draftId) {
  const snap = await getDoc(draftDocRef(folderId, draftId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function createDraft(folderId, data, ownerUid, ownerEmail) {
  const ref = await addDoc(collection(db, 'draftFolders', folderId, 'drafts'), {
    ...data, ownerUid, ownerEmail: (ownerEmail || '').toLowerCase(),
    lastEditedBy: (ownerEmail || '').toLowerCase(),
    presence: {}, archived: false,
    createdAt: serverTimestamp(), updatedAt: serverTimestamp()
  });
  return ref.id;
}

// Field-level patch: keys are Firestore dot paths (e.g. 'topics.t1.title').
// Pass DELETE_FIELD as a value to remove a key.
export const DELETE_FIELD = deleteField();

export async function patchDraft(folderId, draftId, patch, byEmail) {
  await updateDoc(draftDocRef(folderId, draftId), {
    ...patch, updatedAt: serverTimestamp(), lastEditedBy: (byEmail || '').toLowerCase()
  });
}

// Presence writes deliberately don't bump updatedAt.
export async function setDraftPresence(folderId, draftId, uid, info) {
  await updateDoc(draftDocRef(folderId, draftId), {
    ['presence.' + uid]: info ? { ...info, at: serverTimestamp() } : deleteField()
  });
}

export function watchDraft(folderId, draftId, callback) {
  return onSnapshot(draftDocRef(folderId, draftId), snap => {
    callback(snap.exists() ? { id: snap.id, ...snap.data() } : null, snap.metadata.hasPendingWrites);
  });
}

export async function deleteDraft(folderId, draftId) {
  await deleteDoc(draftDocRef(folderId, draftId));
}

export async function setDraftArchived(folderId, draftId, archived) {
  await updateDoc(draftDocRef(folderId, draftId), { archived: !!archived, updatedAt: serverTimestamp() });
}

// Move a draft to another folder, keeping its id (copy + delete in one batch).
export async function moveDraft(fromFolderId, draftId, toFolderId) {
  if (fromFolderId === toFolderId) return draftId;
  const snap = await getDoc(draftDocRef(fromFolderId, draftId));
  if (!snap.exists()) throw new Error('Draft not found');
  const batch = writeBatch(db);
  batch.set(draftDocRef(toFolderId, draftId), { ...snap.data(), presence: {}, updatedAt: serverTimestamp() });
  batch.delete(snap.ref);
  await batch.commit();
  return draftId;
}

// One-time move of a user's legacy drafts into their personal folder.
// Legacy drafts stored topics as an array; convert to the keyed form.
export async function migrateLegacyDrafts(uid, email) {
  let legacy = [];
  try { legacy = await getLegacyDrafts(uid); } catch (e) { return 0; }
  if (!legacy.length) return 0;
  const folderId = await ensurePersonalFolder(uid, email);
  for (const d of legacy) {
    const { id, ...data } = d;
    const converted = { ...data, ...topicsToKeyed(data.topics) };
    await setDoc(draftDocRef(folderId, id), {
      ...converted, ownerUid: uid, ownerEmail: (email || '').toLowerCase(),
      presence: {}, archived: false, migratedAt: serverTimestamp(),
      updatedAt: data.updatedAt || serverTimestamp()
    });
    await deleteDoc(doc(db, 'users', uid, 'drafts', id));
  }
  return legacy.length;
}

export function newTopicId() {
  return 't' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

export function topicsToKeyed(topics) {
  if (!Array.isArray(topics)) return { topics: topics || {}, topicOrder: [] };
  const map = {}, order = [];
  topics.forEach(t => {
    const id = newTopicId();
    map[id] = t; order.push(id);
  });
  return { topics: map, topicOrder: order };
}

// Team members who can be given access to a shared folder.
export async function getCollaborators() {
  const users = mapSnap(await getDocs(query(collection(db, 'allowedUsers'), orderBy('email'))));
  return users.filter(u => u.perms && u.perms.communications);
}

// ---------- Staff directory (synced from the OneSync sheet; see Admin) ----------

export async function getStaff() {
  const rows = mapSnap(await cachedQuery(query(collection(db, 'staff'))));
  return rows.sort((a, b) =>
    (a.familyName || '').localeCompare(b.familyName || '') ||
    (a.givenName || '').localeCompare(b.givenName || ''));
}

export async function getStaffSyncConfig() {
  const snap = await getDoc(doc(db, 'config', 'staffSync'));
  return snap.exists() ? snap.data() : {};
}

export async function saveStaffSyncConfig(values) {
  await setDoc(doc(db, 'config', 'staffSync'), values, { merge: true });
}

// ---------- Per-user preferences (users/{uid}/prefs/compose) ----------
// e.g. { typography: {...} } — the compose page's personal typography defaults.

export async function getUserPrefs(uid) {
  const snap = await getDoc(doc(db, 'users', uid, 'prefs', 'compose'));
  return snap.exists() ? snap.data() : {};
}

export async function saveUserPrefs(uid, values) {
  await setDoc(doc(db, 'users', uid, 'prefs', 'compose'),
    { ...values, updatedAt: serverTimestamp() }, { merge: true });
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
