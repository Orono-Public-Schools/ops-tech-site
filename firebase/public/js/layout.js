// Shared site chrome: slim top bar + hamburger sidebar + footer.
// renderLayout(currentPage) injects all three; auth.js fills in the
// signed-in email via setFooterEmail() (now shown in the sidebar).

export const SITE_VERSION = 'v2.6.0';

const NAV_ITEMS = [
  { page: 'home', href: 'index.html', icon: 'home', label: 'Home' },
  { page: 'links', href: 'links.html', icon: 'link', label: 'Links' },
  { page: 'documentation', href: 'documentation.html', icon: 'description', label: 'Documentation' },
  { page: 'communications', href: 'communications.html', icon: 'campaign', label: 'Communications' },
  { page: 'image-library', href: 'image-library.html', icon: 'photo_library', label: 'Image Library' },
  { page: 'status', href: 'status.html', icon: 'monitor_heart', label: 'System Status' },
  { page: 'admin', href: 'admin.html', icon: 'admin_panel_settings', label: 'Admin', adminOnly: true }
];

// Pages that aren't nav items still get a top-bar page chip.
const EXTRA_PAGES = {
  compose: { icon: 'edit', label: 'Compose Email' }
};

function headerHtml(currentPage) {
  const links = NAV_ITEMS.map(item => `
      <a href="${item.href}" class="sidebar-link${currentPage === item.page ? ' active' : ''}${item.adminOnly ? ' admin-only-link' : ''}">
        <span class="material-icons">${item.icon}</span>
        <span>${item.label}</span>
      </a>`).join('');

  const current = NAV_ITEMS.find(i => i.page === currentPage) || EXTRA_PAGES[currentPage];
  const pageChip = current && currentPage !== 'home' ? `
    <span class="nav-divider"></span>
    <span class="nav-page">
      <span class="nav-page-icon"><span class="material-icons">${current.icon}</span></span>
      ${current.label}
    </span>` : '';

  return `
<header class="site-header">
  <nav class="site-nav">
    <a href="index.html" class="site-logo">
      <img src="img/logo.png" alt="Orono Tech Logo">
    </a>${pageChip}
    <button class="menu-toggle" id="menuToggle" type="button" aria-label="Open menu">
      <span class="material-icons">menu</span>
    </button>
  </nav>
</header>
<div class="sidebar-backdrop" id="sidebarBackdrop"></div>
<aside class="sidebar" id="sidebar" aria-label="Site navigation">
  <div class="sidebar-head">
    <img src="img/favicon.png" alt="Orono Tech" class="sidebar-mark">
    <button class="sidebar-close" id="sidebarClose" type="button" aria-label="Close menu">
      <span class="material-icons">close</span>
    </button>
  </div>
  <nav class="sidebar-nav">${links}
  </nav>
  <div class="sidebar-foot">
    <div class="sidebar-user">
      <span class="sidebar-avatar" id="sidebarAvatar">?</span>
      <span class="sidebar-email" id="sidebarEmail">Signed in</span>
    </div>
    <button class="sidebar-signout" id="signOutBtn" type="button">
      <span class="material-icons">logout</span> Sign out
    </button>
  </div>
</aside>`;
}

function footerHtml() {
  return `
<footer class="site-footer">
  <div class="footer-content">
    <span class="footer-text" id="footerUserEmail">Signed in</span>
    <span class="footer-separator">|</span>
    <span class="footer-text">Orono Technology ${new Date().getFullYear()} - ${SITE_VERSION}</span>
    <span class="footer-separator">|</span>
    <a href="status.html" class="footer-link">System Status</a>
    <span class="footer-separator">|</span>
    <a href="admin.html" class="footer-link">Admin</a>
  </div>
</footer>`;
}

// Favicon: square torch by default, overridable from the Admin page
// (config/app.faviconUrl). The last-known override is cached in localStorage
// so it applies instantly on later page loads.
function applyFavicon() {
  let icon = document.querySelector('link[rel="icon"]');
  if (!icon) {
    icon = document.createElement('link');
    icon.rel = 'icon';
    icon.type = 'image/png';
    document.head.appendChild(icon);
  }
  icon.href = localStorage.getItem('faviconUrl') || 'img/favicon.png';

  // Refresh the override once signed in (best-effort; keeps default on failure).
  (async () => {
    try {
      const { authReady } = await import('./auth.js');
      await authReady;
      const { getConfig } = await import('./data.js');
      const cfg = await getConfig();
      if (cfg.faviconUrl) {
        icon.href = cfg.faviconUrl;
        localStorage.setItem('faviconUrl', cfg.faviconUrl);
      } else {
        localStorage.removeItem('faviconUrl');
      }
    } catch (e) { /* signed out or offline — default stays */ }
  })();
}

export function renderLayout(currentPage) {
  applyFavicon();

  document.body.insertAdjacentHTML('afterbegin', headerHtml(currentPage));
  document.body.insertAdjacentHTML('beforeend', footerHtml());

  const sidebar = document.getElementById('sidebar');
  const backdrop = document.getElementById('sidebarBackdrop');

  function openSidebar() {
    sidebar.classList.add('open');
    backdrop.classList.add('show');
    document.body.classList.add('sidebar-open');
  }

  function closeSidebar() {
    sidebar.classList.remove('open');
    backdrop.classList.remove('show');
    document.body.classList.remove('sidebar-open');
  }

  document.getElementById('menuToggle').addEventListener('click', openSidebar);
  document.getElementById('sidebarClose').addEventListener('click', closeSidebar);
  backdrop.addEventListener('click', closeSidebar);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && sidebar.classList.contains('open')) closeSidebar();
  });

  // Sign out (bottom of the sidebar)
  document.getElementById('signOutBtn').addEventListener('click', async () => {
    try {
      const { auth } = await import('./firebase-init.js');
      const { signOut } = await import('https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js');
      await signOut(auth);
    } finally {
      location.replace('signin.html');
    }
  });

  // Reveal the Admin item once the perms map confirms admin capability.
  // (Dynamic import — auth.js statically imports this module.)
  (async () => {
    try {
      const { permsReady } = await import('./auth.js');
      const perms = await permsReady;
      if (perms.admin) sidebar.classList.add('has-admin');
    } catch (e) { /* signed out — item stays hidden */ }
  })();
}

// Called by auth.js once the user is known; fills the footer line and the
// sidebar user chip.
export function setFooterEmail(email) {
  const footerEl = document.getElementById('footerUserEmail');
  if (footerEl) footerEl.textContent = 'Signed in as ' + email;
  const el = document.getElementById('sidebarEmail');
  if (el) el.textContent = email;
  const av = document.getElementById('sidebarAvatar');
  if (av && email) av.textContent = email.charAt(0).toUpperCase();
}
