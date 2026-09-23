// Draft folder manager — a self-contained modal shared by compose.html and
// communications.html. Lets a user create folders, rename them, share them
// with other communications editors (folder members), and delete them.
//
//   import { openFolderManager } from './js/draft-folders.js';
//   openFolderManager({ user, onChange });   // onChange(folders) after any edit
//
// Folder access rules (firestore.rules): the owner + `members` can read and
// edit every draft inside; only the owner can rename / share / delete.

import {
  getMyFolders, createFolder, updateFolder, deleteFolder, getCollaborators
} from './data.js';

const STYLE = `
  .dfm-modal { display:none; position:fixed; inset:0; z-index:10010; background:rgba(29,42,93,0.55);
    backdrop-filter:blur(3px); align-items:center; justify-content:center; padding:16px; }
  .dfm-modal.show { display:flex; }
  .dfm-card { background:#fff; border-radius:18px; width:100%; max-width:760px; max-height:90vh;
    display:flex; flex-direction:column; box-shadow:0 20px 60px rgba(0,0,0,0.3); overflow:hidden;
    font-family:'Lexend',sans-serif; }
  .dfm-head { display:flex; align-items:center; gap:12px; padding:20px 24px; border-bottom:1.5px solid #eef0f5; }
  .dfm-head h2 { margin:0; font-size:1.2em; color:#1d2a5d; display:flex; align-items:center; gap:8px; flex:1; }
  .dfm-head h2 .material-icons { color:#ad2122; }
  .dfm-close { border:none; background:none; font-size:28px; line-height:1; color:#888; cursor:pointer; }
  .dfm-close:hover { color:#ad2122; }
  .dfm-body { padding:20px 24px; overflow:auto; }
  .dfm-list { display:flex; flex-direction:column; gap:10px; }
  .dfm-row { border:1.5px solid #e8eaf1; border-radius:12px; padding:14px 16px; background:#f8f9fc;
    display:flex; align-items:center; gap:12px; flex-wrap:wrap; }
  .dfm-row .material-icons.fic { color:#ad2122; }
  .dfm-row .name { font-weight:700; color:#1d2a5d; flex:1; min-width:140px; }
  .dfm-row .sub { font-size:0.8em; color:#666; display:flex; gap:6px; flex-wrap:wrap; width:100%; padding-left:36px; }
  .dfm-chip { display:inline-flex; align-items:center; gap:4px; padding:2px 10px; border-radius:999px;
    background:#eef1f7; color:#2d3f69; font-size:0.85em; }
  .dfm-chip .material-icons { font-size:14px; }
  .dfm-actions { display:flex; gap:6px; }
  .dfm-btn { display:inline-flex; align-items:center; gap:6px; padding:7px 14px; border-radius:999px;
    border:1.5px solid #c9d2e6; background:#fff; color:#2d3f69; font-family:inherit; font-size:0.82em;
    font-weight:600; cursor:pointer; transition:all .2s; }
  .dfm-btn .material-icons { font-size:16px; }
  .dfm-btn:hover { border-color:#2d3f69; }
  .dfm-btn.primary { background:#ad2122; border-color:#ad2122; color:#fff; }
  .dfm-btn.primary:hover { background:#8f1b1c; }
  .dfm-btn.danger { color:#ad2122; border-color:rgba(173,33,34,0.4); }
  .dfm-btn.danger:hover { background:#ad2122; color:#fff; border-color:#ad2122; }
  .dfm-btn[disabled] { opacity:.5; cursor:default; }
  .dfm-editor { border:1.5px solid #c9d2e6; border-radius:12px; padding:16px; margin-top:16px; background:#fff; }
  .dfm-editor h3 { margin:0 0 12px; font-size:1em; color:#1d2a5d; }
  .dfm-editor label { display:block; font-size:0.8em; font-weight:600; color:#2d3f69; margin:10px 0 4px; }
  .dfm-editor input[type=text] { width:100%; padding:10px 12px; border:1.5px solid #dde2ec; border-radius:10px;
    font-family:inherit; font-size:0.95em; box-sizing:border-box; }
  .dfm-members { display:grid; grid-template-columns:repeat(auto-fill,minmax(230px,1fr)); gap:6px; max-height:220px; overflow:auto; }
  .dfm-members label { display:flex; align-items:center; gap:8px; margin:0; padding:6px 8px; border-radius:8px;
    font-weight:500; cursor:pointer; }
  .dfm-members label:hover { background:#f3f5fa; }
  .dfm-members input { accent-color:#ad2122; }
  .dfm-editor .foot { display:flex; gap:8px; justify-content:flex-end; margin-top:14px; }
  .dfm-empty { color:#666; font-size:0.9em; padding:6px 0; }
  .dfm-err { color:#ad2122; font-size:0.85em; margin-top:8px; }
`;

let state = { user: null, onChange: null, folders: [], collaborators: null, editing: null, busy: false };
let root = null;

function esc(t) {
  const d = document.createElement('div');
  d.textContent = t == null ? '' : String(t);
  return d.innerHTML;
}

function ensureDom() {
  if (root) return root;
  const style = document.createElement('style');
  style.textContent = STYLE;
  document.head.appendChild(style);
  root = document.createElement('div');
  root.className = 'dfm-modal';
  root.innerHTML = `
    <div class="dfm-card" role="dialog" aria-modal="true">
      <div class="dfm-head">
        <h2><span class="material-icons">folder_shared</span>Draft Folders</h2>
        <button type="button" class="dfm-btn primary" data-act="new"><span class="material-icons">create_new_folder</span>New folder</button>
        <button type="button" class="dfm-close" data-act="close">&times;</button>
      </div>
      <div class="dfm-body">
        <div class="dfm-list" id="dfmList"></div>
        <div id="dfmEditor"></div>
      </div>
    </div>`;
  document.body.appendChild(root);
  root.addEventListener('click', onClick);
  root.addEventListener('submit', e => e.preventDefault());
  return root;
}

export async function openFolderManager(opts) {
  state.user = opts.user;
  state.onChange = opts.onChange || null;
  state.editing = null;
  ensureDom().classList.add('show');
  await refresh();
  if (opts.editFolderId) startEdit(opts.editFolderId);
}

export function closeFolderManager() {
  if (root) root.classList.remove('show');
}

async function refresh() {
  state.folders = await getMyFolders(state.user.uid, state.user.email);
  if (!state.collaborators) {
    try { state.collaborators = await getCollaborators(); } catch (e) { state.collaborators = []; }
  }
  renderList();
  renderEditor();
}

function isOwner(f) { return f.ownerUid === state.user.uid; }

function renderList() {
  const list = root.querySelector('#dfmList');
  const rows = state.folders.filter(f => !f.personal);
  if (!rows.length) {
    list.innerHTML = '<div class="dfm-empty">No shared folders yet. Create one to collaborate on drafts with someone.</div>';
    return;
  }
  list.innerHTML = rows.map(f => {
    const mine = isOwner(f);
    const members = (f.members || []);
    return `
      <div class="dfm-row" data-id="${esc(f.id)}">
        <span class="material-icons fic">${mine ? 'folder' : 'folder_shared'}</span>
        <span class="name">${esc(f.name)}</span>
        <div class="dfm-actions">
          ${mine ? `
            <button type="button" class="dfm-btn" data-act="edit"><span class="material-icons">group_add</span>Share / rename</button>
            <button type="button" class="dfm-btn danger" data-act="delete"><span class="material-icons">delete</span></button>`
          : `<span class="dfm-chip"><span class="material-icons">person</span>shared by ${esc(f.ownerEmail || 'a teammate')}</span>`}
        </div>
        <div class="sub">
          ${members.length
            ? members.map(m => `<span class="dfm-chip"><span class="material-icons">person</span>${esc(m)}</span>`).join('')
            : '<span class="dfm-chip"><span class="material-icons">lock</span>only you</span>'}
        </div>
      </div>`;
  }).join('');
}

function renderEditor() {
  const box = root.querySelector('#dfmEditor');
  const ed = state.editing;
  if (!ed) { box.innerHTML = ''; return; }
  const me = (state.user.email || '').toLowerCase();
  const people = (state.collaborators || []).filter(u => (u.email || '').toLowerCase() !== me);
  const selected = new Set((ed.members || []).map(m => m.toLowerCase()));
  // Keep members that aren't in the collaborator list (e.g. perm removed) visible.
  const extra = [...selected].filter(m => !people.some(u => (u.email || '').toLowerCase() === m));
  box.innerHTML = `
    <form class="dfm-editor">
      <h3>${ed.id ? 'Edit folder' : 'New folder'}</h3>
      <label for="dfmName">Folder name</label>
      <input type="text" id="dfmName" value="${esc(ed.name || '')}" placeholder="e.g. Fall newsletters" maxlength="80" autocomplete="off">
      <label>Share with</label>
      ${people.length || extra.length ? `
        <div class="dfm-members">
          ${people.map(u => `
            <label><input type="checkbox" value="${esc(u.email)}" ${selected.has((u.email || '').toLowerCase()) ? 'checked' : ''}>
              <span>${esc(u.name || u.email)}${u.name ? ' <small style="color:#888">' + esc(u.email) + '</small>' : ''}</span></label>`).join('')}
          ${extra.map(m => `<label><input type="checkbox" value="${esc(m)}" checked><span>${esc(m)}</span></label>`).join('')}
        </div>`
      : '<div class="dfm-empty">No other communications editors are on the allow list yet.</div>'}
      <div class="dfm-err" id="dfmErr"></div>
      <div class="foot">
        <button type="button" class="dfm-btn" data-act="cancel">Cancel</button>
        <button type="button" class="dfm-btn primary" data-act="save"><span class="material-icons">check</span>${ed.id ? 'Save' : 'Create'}</button>
      </div>
    </form>`;
  box.querySelector('#dfmName').focus();
}

function startEdit(id) {
  const f = state.folders.find(x => x.id === id);
  if (!f || !isOwner(f) || f.personal) return;
  state.editing = { id: f.id, name: f.name, members: f.members || [] };
  renderEditor();
  root.querySelector('#dfmEditor').scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

async function onClick(e) {
  const btn = e.target.closest('[data-act]');
  if (!btn) { if (e.target === root) closeFolderManager(); return; }
  if (state.busy) return;
  const act = btn.dataset.act;
  const row = btn.closest('.dfm-row');
  const id = row ? row.dataset.id : null;
  try {
    if (act === 'close') closeFolderManager();
    else if (act === 'new') { state.editing = { id: null, name: '', members: [] }; renderEditor(); }
    else if (act === 'cancel') { state.editing = null; renderEditor(); }
    else if (act === 'edit') startEdit(id);
    else if (act === 'delete') {
      const f = state.folders.find(x => x.id === id);
      if (!f) return;
      if (!confirm('Delete the folder "' + f.name + '" and every draft inside it? This cannot be undone.')) return;
      state.busy = true;
      await deleteFolder(id);
      state.busy = false;
      if (state.editing && state.editing.id === id) state.editing = null;
      await refresh();
      if (state.onChange) state.onChange(state.folders);
    }
    else if (act === 'save') {
      const name = root.querySelector('#dfmName').value.trim();
      const err = root.querySelector('#dfmErr');
      if (!name) { err.textContent = 'Give the folder a name.'; return; }
      const members = [...root.querySelectorAll('.dfm-members input:checked')].map(i => i.value);
      state.busy = true;
      btn.disabled = true;
      if (state.editing.id) await updateFolder(state.editing.id, { name, members });
      else await createFolder(state.user.uid, state.user.email, name, members);
      state.busy = false;
      state.editing = null;
      await refresh();
      if (state.onChange) state.onChange(state.folders);
    }
  } catch (ex) {
    state.busy = false;
    console.error('Folder manager:', ex);
    const err = root.querySelector('#dfmErr');
    if (err) err.textContent = 'Something went wrong: ' + (ex.message || ex);
    else alert('Something went wrong: ' + (ex.message || ex));
  }
}
