// Shared visual Material-icon picker.
// attachIconPicker(fieldEl) adds a live icon preview + "Browse" button next to
// any <input> or <select> that holds a Material icon name. Picking an icon
// sets the field's value (adding an <option> to selects when needed) and
// fires a 'change' event.
//
// The curated list mirrors the old Apps Script getIconClasses(); the search
// box also accepts any other Material icon name (live-previewed before use).

export const MATERIAL_ICONS = [
  'link', 'description', 'folder', 'home', 'article', 'book', 'menu_book',
  'school', 'class', 'library_books', 'auto_stories', 'chrome_reader_mode',
  'apps', 'dashboard', 'widgets', 'extension', 'build', 'settings',
  'computer', 'laptop', 'phone_iphone', 'tablet', 'devices',
  'cloud', 'cloud_upload', 'cloud_download', 'cloud_done', 'backup',
  'storage', 'folder_open', 'folder_shared', 'create_new_folder',
  'edit', 'create', 'save', 'delete', 'add_circle', 'remove_circle',
  'check_circle', 'cancel', 'error', 'warning', 'info', 'help',
  'search', 'find_in_page', 'zoom_in', 'zoom_out', 'filter_list',
  'person', 'people', 'group', 'account_circle', 'supervisor_account',
  'email', 'chat', 'message', 'comment', 'forum', 'feedback',
  'notifications', 'calendar_today', 'event', 'schedule', 'alarm',
  'print', 'picture_as_pdf', 'slideshow', 'grid_on', 'table_chart',
  'insert_chart', 'pie_chart', 'bar_chart', 'analytics', 'assessment',
  'code', 'terminal', 'data_object', 'integration_instructions', 'api',
  'bug_report', 'security', 'lock', 'vpn_key', 'admin_panel_settings',
  'verified_user', 'gavel', 'account_balance', 'assignment', 'assignment_turned_in',
  'work', 'business', 'store', 'shopping_cart', 'payment',
  'lightbulb', 'stars', 'favorite', 'bookmark', 'flag',
  'visibility', 'language', 'translate', 'public', 'travel_explore',
  'map', 'place', 'navigation', 'explore', 'my_location',
  'video_library', 'videocam', 'movie', 'theaters', 'live_tv',
  'music_note', 'headset', 'mic', 'volume_up', 'speaker',
  'image', 'photo', 'photo_library', 'collections', 'camera_alt',
  'campaign', 'announcement', 'record_voice_over', 'support_agent', 'call',
  'wifi', 'router', 'dns', 'monitor', 'smart_display', 'badge', 'key',
  'monitor_heart', 'network_check', 'troubleshoot', 'insights', 'speed', 'sensors'
];

const STYLE = `
.icon-picker-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.icon-picker-row > input,
.icon-picker-row > select {
  flex: 1;
  min-width: 0;
}
.icon-picker-preview {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  border-radius: 8px;
  background: linear-gradient(135deg, #2d3f69 0%, #1d2a5d 100%);
  color: white;
  flex-shrink: 0;
}
.icon-picker-preview .material-icons { font-size: 24px; }
.icon-picker-browse {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: #f5f5f5;
  color: #2d3f69;
  border: 2px solid #e0e0e0;
  border-radius: 6px;
  padding: 9px 12px;
  font-family: 'Lexend', sans-serif;
  font-size: 0.85em;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s;
}
.icon-picker-browse:hover { background: #e8eaf1; border-color: #2d3f69; }
.icon-picker-overlay {
  display: none;
  position: fixed;
  inset: 0;
  z-index: 11000;
  background: rgba(0, 0, 0, 0.7);
  align-items: center;
  justify-content: center;
}
.icon-picker-overlay.show { display: flex; }
.icon-picker-dialog {
  background: white;
  border-radius: 12px;
  padding: 24px;
  width: 92%;
  max-width: 560px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  font-family: 'Lexend', sans-serif;
}
.icon-picker-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
  padding-bottom: 12px;
  border-bottom: 2px solid #e0e0e0;
}
.icon-picker-head h3 { color: #2d3f69; font-size: 1.25em; margin: 0; }
.icon-picker-close {
  font-size: 26px;
  font-weight: bold;
  color: #999;
  cursor: pointer;
  line-height: 1;
  background: none;
  border: none;
}
.icon-picker-close:hover { color: #333; }
.icon-picker-search {
  width: 100%;
  padding: 11px 12px;
  border: 2px solid #e0e0e0;
  border-radius: 6px;
  font-family: 'Lexend', sans-serif;
  font-size: 0.92em;
  margin-bottom: 14px;
  box-sizing: border-box;
}
.icon-picker-search:focus { outline: none; border-color: #2d3f69; }
.icon-picker-grid {
  overflow-y: auto;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(76px, 1fr));
  gap: 8px;
  padding: 2px;
}
.icon-picker-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  padding: 10px 4px;
  border: 2px solid transparent;
  border-radius: 8px;
  cursor: pointer;
  background: #f8f9fa;
  transition: all 0.15s;
}
.icon-picker-item:hover { background: #e8eaf1; border-color: #2d3f69; }
.icon-picker-item.selected { border-color: #ad2122; background: #fbeaea; }
.icon-picker-item .material-icons { font-size: 28px; color: #2d3f69; }
.icon-picker-item span:last-child {
  font-size: 0.62em;
  color: #666;
  text-align: center;
  word-break: break-all;
  line-height: 1.2;
}
.icon-picker-empty { color: #666; font-size: 0.9em; text-align: center; padding: 24px 0; }
`;

let overlay = null;
let activeField = null;
let activePreview = null;

function ensureDialog() {
  if (overlay) return;

  const style = document.createElement('style');
  style.textContent = STYLE;
  document.head.appendChild(style);

  overlay = document.createElement('div');
  overlay.className = 'icon-picker-overlay';
  overlay.innerHTML = `
    <div class="icon-picker-dialog">
      <div class="icon-picker-head">
        <h3>Choose an Icon</h3>
        <button type="button" class="icon-picker-close">&times;</button>
      </div>
      <input type="text" class="icon-picker-search"
             placeholder="Search icons (or type any Material icon name)...">
      <div class="icon-picker-grid"></div>
    </div>`;
  document.body.appendChild(overlay);

  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  overlay.querySelector('.icon-picker-close').addEventListener('click', close);
  overlay.querySelector('.icon-picker-search').addEventListener('input', (e) => {
    renderGrid(e.target.value.trim().toLowerCase());
  });
}

function renderGrid(filter) {
  const grid = overlay.querySelector('.icon-picker-grid');
  const current = activeField ? String(activeField.value || '') : '';
  let names = filter
    ? MATERIAL_ICONS.filter(n => n.includes(filter.replace(/\s+/g, '_')))
    : MATERIAL_ICONS;

  // A typed name outside the curated list still works — offer it first.
  const custom = filter.replace(/\s+/g, '_');
  const showCustom = custom && !MATERIAL_ICONS.includes(custom);
  let html = '';
  if (showCustom) {
    html += `
      <div class="icon-picker-item" data-icon="${custom}" title="Use '${custom}'">
        <span class="material-icons">${custom}</span>
        <span>${custom}</span>
      </div>`;
  }
  html += names.map(n => `
    <div class="icon-picker-item ${n === current ? 'selected' : ''}" data-icon="${n}">
      <span class="material-icons">${n}</span>
      <span>${n}</span>
    </div>`).join('');

  grid.innerHTML = html || '<div class="icon-picker-empty">No matching icons</div>';

  grid.querySelectorAll('.icon-picker-item').forEach(item => {
    item.addEventListener('click', () => pick(item.dataset.icon));
  });
}

function pick(icon) {
  if (activeField) {
    if (activeField.tagName === 'SELECT'
        && ![...activeField.options].some(o => o.value === icon)) {
      const opt = document.createElement('option');
      opt.value = icon;
      opt.textContent = icon;
      activeField.appendChild(opt);
    }
    activeField.value = icon;
    activeField.dispatchEvent(new Event('change', { bubbles: true }));
    if (activePreview) {
      activePreview.querySelector('.material-icons').textContent = icon || 'folder';
    }
  }
  close();
}

function close() {
  overlay.classList.remove('show');
  activeField = null;
  activePreview = null;
}

export function attachIconPicker(field) {
  if (!field || field.dataset.iconPicker) return;
  field.dataset.iconPicker = '1';
  ensureDialog();

  const row = document.createElement('div');
  row.className = 'icon-picker-row';
  field.parentNode.insertBefore(row, field);
  row.appendChild(field);

  const preview = document.createElement('div');
  preview.className = 'icon-picker-preview';
  preview.innerHTML = `<span class="material-icons">${field.value || 'folder'}</span>`;
  row.appendChild(preview);

  const browse = document.createElement('button');
  browse.type = 'button';
  browse.className = 'icon-picker-browse';
  browse.innerHTML = '<span class="material-icons" style="font-size:16px;">apps</span> Browse';
  row.appendChild(browse);

  field.addEventListener('input', () => {
    preview.querySelector('.material-icons').textContent = field.value || 'folder';
  });
  field.addEventListener('change', () => {
    preview.querySelector('.material-icons').textContent = field.value || 'folder';
  });

  browse.addEventListener('click', () => {
    activeField = field;
    activePreview = preview;
    overlay.classList.add('show');
    const search = overlay.querySelector('.icon-picker-search');
    search.value = '';
    renderGrid('');
    search.focus();
  });
}
