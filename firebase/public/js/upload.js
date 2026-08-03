// Shared image-upload helper.
// attachImageUpload(field) adds an "Upload from computer" button under any
// URL <input>. The chosen file goes to Cloud Storage (uploads/), and the
// resulting download URL is written into the field (with 'input'/'change'
// events fired so existing preview/validation logic runs unchanged).
//
// Download URLs carry an access token, so they render in <img> tags and
// emails without authentication — same as the lh3 Drive links we already use.

import { app } from './firebase-init.js';
import {
  getStorage, ref, uploadBytesResumable, getDownloadURL
} from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-storage.js';

const storage = getStorage(app);
const MAX_BYTES = 10 * 1024 * 1024; // keep in sync with storage.rules

const STYLE = `
.upload-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 8px;
}
.upload-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: #f5f5f5;
  color: #2d3f69;
  border: 2px solid #e0e0e0;
  border-radius: 6px;
  padding: 9px 14px;
  font-family: 'Lexend', sans-serif;
  font-size: 0.85em;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s;
}
.upload-btn:hover { background: #e8eaf1; border-color: #2d3f69; }
.upload-btn:disabled { opacity: 0.6; cursor: not-allowed; }
.upload-btn .material-icons { font-size: 16px; }
.upload-status {
  font-family: 'Lexend', sans-serif;
  font-size: 0.82em;
  color: #666;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.upload-status.error { color: #ad2122; }
.upload-status.done { color: #2e7d32; }
.upload-progress {
  flex: 1;
  max-width: 140px;
  height: 8px;
  border-radius: 4px;
  background: #e0e0e0;
  overflow: hidden;
  display: none;
}
.upload-progress .upload-progress-fill {
  height: 100%;
  width: 0%;
  background: linear-gradient(135deg, #2d3f69 0%, #ad2122 100%);
  transition: width 0.2s ease;
}
`;

let styleInjected = false;

function ensureStyle() {
  if (styleInjected) return;
  styleInjected = true;
  const style = document.createElement('style');
  style.textContent = STYLE;
  document.head.appendChild(style);
}

function safeName(name) {
  const dot = name.lastIndexOf('.');
  const base = (dot > 0 ? name.slice(0, dot) : name)
    .replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'image';
  const ext = dot > 0 ? name.slice(dot).toLowerCase().replace(/[^a-z0-9.]/g, '') : '';
  return base + ext;
}

// Attach an upload button below a URL input. options:
//   onUploaded({ url, file })  — called after the field is filled in
export function attachImageUpload(field, options = {}) {
  if (!field || field.dataset.uploadAttached) return;
  field.dataset.uploadAttached = '1';
  ensureStyle();

  const row = document.createElement('div');
  row.className = 'upload-row';
  row.innerHTML = `
    <button type="button" class="upload-btn">
      <span class="material-icons">upload</span> Upload from computer
    </button>
    <div class="upload-progress"><div class="upload-progress-fill"></div></div>
    <span class="upload-status"></span>`;

  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'image/*';
  fileInput.style.display = 'none';
  row.appendChild(fileInput);

  // Place the row right after the field (before its <small> hint if any).
  field.insertAdjacentElement('afterend', row);

  const btn = row.querySelector('.upload-btn');
  const progress = row.querySelector('.upload-progress');
  const fill = row.querySelector('.upload-progress-fill');
  const status = row.querySelector('.upload-status');

  function setStatus(text, cls) {
    status.textContent = text;
    status.className = 'upload-status' + (cls ? ' ' + cls : '');
  }

  btn.addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', () => {
    const file = fileInput.files && fileInput.files[0];
    fileInput.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setStatus('Please choose an image file.', 'error');
      return;
    }
    if (file.size > MAX_BYTES) {
      setStatus('Image is too large (max 10 MB).', 'error');
      return;
    }

    const path = 'uploads/' + Date.now() + '-' + safeName(file.name);
    const task = uploadBytesResumable(ref(storage, path), file, {
      contentType: file.type,
      customMetadata: { originalName: file.name }
    });

    btn.disabled = true;
    progress.style.display = 'block';
    fill.style.width = '0%';
    setStatus('Uploading…');

    task.on('state_changed',
      (snap) => {
        const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
        fill.style.width = pct + '%';
        setStatus('Uploading… ' + pct + '%');
      },
      (err) => {
        btn.disabled = false;
        progress.style.display = 'none';
        const denied = err && err.code === 'storage/unauthorized';
        setStatus(denied
          ? 'Upload not allowed for your account.'
          : 'Upload failed: ' + (err && err.code ? err.code : err), 'error');
      },
      async () => {
        try {
          const url = await getDownloadURL(task.snapshot.ref);
          field.value = url;
          field.dispatchEvent(new Event('input', { bubbles: true }));
          field.dispatchEvent(new Event('change', { bubbles: true }));
          setStatus('Uploaded ✓ ' + file.name, 'done');
          if (options.onUploaded) options.onUploaded({ url, file });
        } catch (err) {
          setStatus('Upload finished but URL fetch failed: ' + err, 'error');
        } finally {
          btn.disabled = false;
          progress.style.display = 'none';
        }
      });
  });
}
