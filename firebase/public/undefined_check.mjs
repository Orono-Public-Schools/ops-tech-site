
    import { renderLayout } from './js/layout.js';
    import { authReady, gateEditing } from './js/auth.js';
    import {
      getCommunications, getAllDrafts, deleteDraft,
      getScheduledEmails, cancelScheduledEmail
    } from './js/data.js';

    renderLayout('communications');
    gateEditing('communications');

    // Communications data for the view modal, loaded from Firestore.
    let communicationsData = [];
    let scheduledData = [];
    let currentUser = null;
    let activeFilter = 'All';
    let searchTerm = '';

    function escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text == null ? '' : String(text);
      return div.innerHTML;
    }

    // sentAt / updatedAt are Firestore Timestamps; guard for odd values.
    function toDate(value) {
      if (!value) return null;
      if (typeof value.toDate === 'function') return value.toDate();
      const d = new Date(value);
      return isNaN(d.getTime()) ? null : d;
    }

    // "hero Layout" / "Hero Layout" / "Manual" -> "Hero" / "Manual"
    function templateLabel(templateUsed) {
      const raw = String(templateUsed || '').replace(/\s*layout\s*$/i, '').trim();
      if (!raw) return 'Custom';
      return raw.charAt(0).toUpperCase() + raw.slice(1);
    }

    // ========== TOOLBAR (search + template filter pills) ==========
    function buildToolbar() {
      const labels = new Set();
      communicationsData.forEach(c => labels.add(templateLabel(c.templateUsed)));
      const pills = ['All', ...[...labels].sort()];

      const wrap = document.getElementById('filterPills');
      wrap.innerHTML = pills.map(label =>
        `<button type="button" class="filter-pill${label === activeFilter ? ' active' : ''}" data-filter="${escapeHtml(label)}">${escapeHtml(label)}</button>`
      ).join('');

      wrap.querySelectorAll('.filter-pill').forEach(btn => {
        btn.addEventListener('click', () => {
          activeFilter = btn.dataset.filter;
          wrap.querySelectorAll('.filter-pill').forEach(b =>
            b.classList.toggle('active', b === btn));
          render();
        });
      });

      document.getElementById('toolbar').style.display =
        communicationsData.length ? 'flex' : 'none';
    }

    document.getElementById('searchInput').addEventListener('input', function() {
      searchTerm = this.value.trim().toLowerCase();
      render();
    });

    function visibleCommunications() {
      return communicationsData.filter(c => {
        if (activeFilter !== 'All' && templateLabel(c.templateUsed) !== activeFilter) return false;
        if (searchTerm) {
          const hay = [c.subject, c.previewText, c.recipients, c.sentBy]
            .map(v => String(v || '').toLowerCase()).join(' ');
          if (!hay.includes(searchTerm)) return false;
        }
        return true;
      });
    }

    // ========== RENDER (style G cards) ==========
    function render() {
      const content = document.getElementById('content');

      if (!communicationsData.length) {
        document.getElementById('resultCount').textContent = '';
        content.innerHTML = `
          <div class="empty-state">
            <span class="material-icons">mail_outline</span>
            <h2>No Communications Yet</h2>
            <p>Sent emails will appear here once you compose and send your first message.</p>
            <a href="compose.html" class="action-pill edit-only" style="display: inline-flex;">
              <span class="material-icons">edit</span>
              <span>Compose Your First Email</span>
            </a>
          </div>`;
        return;
      }

      const visible = visibleCommunications();
      document.getElementById('resultCount').textContent =
        visible.length === communicationsData.length
          ? communicationsData.length + ' sent'
          : visible.length + ' of ' + communicationsData.length;

      if (!visible.length) {
        content.innerHTML = `
          <div class="empty-state">
            <span class="material-icons">search_off</span>
            <h2>No Matches</h2>
            <p>No sent emails match your search or filter.</p>
          </div>`;
        return;
      }

      content.innerHTML = '<div class="post-grid">' + visible.map(comm => {
        const index = communicationsData.indexOf(comm);
        const date = toDate(comm.sentAt);
        const dateStr = date
          ? date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
          : 'Date unavailable';
        const tpl = templateLabel(comm.templateUsed);
        return `
          <div class="post-card" onclick="viewEmail(${index})">
            <span class="watermark material-icons">mail</span>
            <div class="icon-chip"><span class="material-icons">${comm.source === 'scheduled' ? 'schedule_send' : 'mail'}</span></div>
            <h3 class="post-subject">${escapeHtml(comm.subject)}</h3>
            <p class="post-preview">${escapeHtml(comm.previewText)}</p>
            <div class="meta-chips">
              <span class="mchip"><span class="material-icons">event</span>${escapeHtml(dateStr)}</span>
              <span class="mchip red"><span class="material-icons">label</span>${escapeHtml(tpl)}</span>
              <span class="mchip" title="${escapeHtml(comm.recipients || '')}"><span class="material-icons">group</span>${escapeHtml(comm.recipients || '—')}</span>
            </div>
          </div>`;
      }).join('') + '</div>';
    }

    // ========== VIEW MODAL ==========
    window.viewEmail = function(index) {
      const comm = communicationsData[index];
      if (!comm) return;
      openViewModal(comm);
    };

    function openViewModal(comm) {
      document.getElementById('modalSubject').textContent = comm.subject || '';

      const date = toDate(comm.sentAt);
      const chips = [];
      chips.push(chip('event', date
        ? date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
        : 'Date unavailable'));
      if (comm.recipients) chips.push(chip('group', comm.recipients));
      chips.push(chip('label', templateLabel(comm.templateUsed), true));
      if (comm.sentBy) chips.push(chip('person', comm.sentBy));
      if (comm.source === 'scheduled') chips.push(chip('schedule_send', 'Scheduled send', true));

      document.getElementById('modalMeta').innerHTML = chips.join('');
      // Newsletters and regular emails alike store their full HTML in bodyHtml.
      document.getElementById('modalBody').innerHTML = comm.bodyHtml || '';
      document.getElementById('viewModal').classList.add('show');
    }

    function chip(icon, text, red) {
      return `<span class="mchip${red ? ' red' : ''}"><span class="material-icons">${icon}</span>${escapeHtml(text)}</span>`;
    }

    window.closeViewModal = function() {
      document.getElementById('viewModal').classList.remove('show');
    };

    // ========== SCHEDULED QUEUE ==========
    async function loadScheduled() {
      const panel = document.getElementById('scheduledPanel');
      try {
        scheduledData = (await getScheduledEmails())
          .filter(s => s.status === 'pending' || s.status === 'error');
      } catch (err) {
        // No communications permission (or offline) — just hide the panel.
        scheduledData = [];
      }
      if (!scheduledData.length) {
        panel.style.display = 'none';
        return;
      }
      panel.style.display = 'block';
      document.getElementById('scheduledList').innerHTML = scheduledData.map(s => {
        const when = toDate(s.sendAt);
        const whenStr = when
          ? when.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
          : '—';
        const isError = s.status === 'error';
        return `
          <div class="scheduled-item">
            <span class="when${isError ? ' error' : ''}">
              <span class="material-icons">${isError ? 'error' : 'schedule'}</span>
              ${isError ? 'Failed' : escapeHtml(whenStr)}
            </span>
            <span class="subj" onclick="viewScheduled('${escapeHtml(s.id)}')">${escapeHtml(s.subject || 'Untitled')}</span>
            <span class="to" title="${escapeHtml(describeScheduledRecipients(s))}">${escapeHtml(describeScheduledRecipients(s))}</span>
            <button type="button" class="cancel-btn" onclick="cancelScheduled('${escapeHtml(s.id)}')">
              <span class="material-icons">close</span>${isError ? 'Dismiss' : 'Cancel'}
            </button>
          </div>`;
      }).join('');
    }

    function describeScheduledRecipients(s) {
      const parts = [];
      const groups = Array.isArray(s.groupIds) ? s.groupIds.length : 0;
      if (groups) parts.push(groups + ' group' + (groups > 1 ? 's' : ''));
      const indiv = s.individualRecipients || {};
      const n = ['to', 'cc', 'bcc'].reduce((sum, k) =>
        sum + (Array.isArray(indiv[k]) ? indiv[k].length : 0), 0);
      if (n) parts.push(n + ' recipient' + (n > 1 ? 's' : ''));
      return parts.join(' + ') || '—';
    }

    window.viewScheduled = function(id) {
      const s = scheduledData.find(x => x.id === id);
      if (!s) return;
      openViewModal({
        subject: s.subject,
        sentAt: s.sendAt,
        recipients: describeScheduledRecipients(s) + (s.status === 'error' ? ' — failed: ' + (s.error || 'unknown error') : ''),
        templateUsed: s.templateUsed,
        sentBy: s.createdBy,
        bodyHtml: s.bodyHtml,
        source: 'scheduled'
      });
    };

    window.cancelScheduled = async function(id) {
      const s = scheduledData.find(x => x.id === id);
      const label = s && s.status === 'error' ? 'Dismiss this failed email?' : 'Cancel this scheduled email?';
      if (!confirm(label)) return;
      try {
        await cancelScheduledEmail(id);
        loadScheduled();
      } catch (err) {
        alert('Failed to cancel: ' + err.message);
      }
    };

    // Close modal when clicking outside
    window.addEventListener('click', function(event) {
      const modal = document.getElementById('viewModal');
      if (event.target === modal) {
        closeViewModal();
      }
    });

    // ========== DRAFTS MODAL ==========
    window.openDraftsModal = async function() {
      const modal = document.getElementById('draftsModal');
      const loading = document.getElementById('draftsLoading');
      const container = document.getElementById('draftsContainer');

      modal.classList.add('show');
      loading.style.display = 'block';
      container.innerHTML = '';

      try {
        const drafts = await getAllDrafts(currentUser.uid);
        loading.style.display = 'none';
        renderDrafts(drafts);
      } catch (error) {
        loading.style.display = 'none';
        container.innerHTML = '<div style="text-align: center; padding: 40px; color: #ad2122;">Error loading drafts: ' + escapeHtml(error.message) + '</div>';
      }
    };

    window.closeDraftsModal = function() {
      document.getElementById('draftsModal').classList.remove('show');
    };

    function renderDrafts(drafts) {
      const container = document.getElementById('draftsContainer');

      if (!drafts || drafts.length === 0) {
        container.innerHTML = `
          <div class="drafts-empty">
            <span class="material-icons">inbox</span>
            <h3>No Drafts Found</h3>
            <p>Saved email drafts will appear here</p>
          </div>
        `;
        return;
      }

      container.innerHTML = '';

      drafts.forEach(function(draft) {
        const draftEl = document.createElement('div');
        draftEl.className = 'draft-item';

        const date = toDate(draft.updatedAt);
        const dateStr = date
          ? date.toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })
          : 'Date unavailable';

        draftEl.innerHTML = `
          <div class="draft-subject">${escapeHtml(draft.preview || 'Untitled Draft')}</div>
          <div class="draft-meta">
            <span class="mchip"><span class="material-icons">schedule</span>${escapeHtml(dateStr)}</span>
            <span class="mchip red"><span class="material-icons">label</span>${escapeHtml(templateLabel(draft.template))}</span>
          </div>
          <div class="draft-actions">
            <button class="draft-btn draft-btn-load" onclick="loadDraftAndNavigate('${escapeHtml(draft.id)}')">
              <span class="material-icons">open_in_new</span>
              Load Draft
            </button>
            <button class="draft-btn draft-btn-delete" onclick="deleteDraftItem('${escapeHtml(draft.id)}')">
              <span class="material-icons">delete</span>
              Delete
            </button>
          </div>
        `;

        container.appendChild(draftEl);
      });
    }

    window.loadDraftAndNavigate = function(draftId) {
      // Navigate to compose page with draft ID
      window.open('compose.html?draftId=' + encodeURIComponent(draftId), '_top');
    };

    window.deleteDraftItem = async function(draftId) {
      if (!confirm('Are you sure you want to delete this draft?')) {
        return;
      }

      try {
        await deleteDraft(currentUser.uid, draftId);
        // Reload drafts list
        openDraftsModal();
      } catch (error) {
        alert('Error deleting draft: ' + error.message);
      }
    };

    // Close drafts modal when clicking outside
    window.addEventListener('click', function(event) {
      const draftsModal = document.getElementById('draftsModal');
      if (event.target === draftsModal) {
        closeDraftsModal();
      }
    });

    async function init() {
      currentUser = await authReady;

      const loadingOverlay = document.getElementById('loadingOverlay');
      loadingOverlay.classList.add('hidden');
      setTimeout(function() {
        loadingOverlay.style.display = 'none';
      }, 300);

      try {
        communicationsData = await getCommunications();
      } catch (err) {
        console.error('Failed to load communications:', err);
        communicationsData = [];
      }

      buildToolbar();
      render();
      loadScheduled();

      // Hide skeleton and show actual content
      const skeletonLoader = document.getElementById('skeletonLoader');
      const content = document.getElementById('content');
      skeletonLoader.classList.add('hidden');
      content.style.display = 'block';
      setTimeout(function() {
        skeletonLoader.style.display = 'none';
      }, 300);

      // ?drafts=1 — deep link from the Compose page's "Drafts" pill
      if (new URLSearchParams(window.location.search).get('drafts')) {
        openDraftsModal();
      }
    }

    init();
  