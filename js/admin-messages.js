/**
 * ADMIN MESSAGES CONTROLLER
 * Manages private recruiter inquiries, filtering, detail viewing, read status, archiving, and deletion.
 */

document.addEventListener('DOMContentLoaded', async () => {
  const session = await AdminCore.init();
  if (!session) return;

  const tbody = document.getElementById('messages-tbody');
  const countAll = document.getElementById('count-all');
  const countUnread = document.getElementById('count-unread');
  const countArchived = document.getElementById('count-archived');
  const filterTabs = document.querySelectorAll('.filter-tab');

  const modal = document.getElementById('message-detail-modal');
  const btnCloseModal = document.getElementById('btn-close-msg-modal');
  const detailSubject = document.getElementById('msg-detail-subject');
  const detailSender = document.getElementById('msg-detail-sender');
  const detailEmail = document.getElementById('msg-detail-email');
  const detailDate = document.getElementById('msg-detail-date');
  const detailStatus = document.getElementById('msg-detail-status');
  const detailBody = document.getElementById('msg-detail-body');
  const btnReplyEmail = document.getElementById('btn-reply-email');
  const btnToggleRead = document.getElementById('btn-toggle-read');
  const btnToggleArchive = document.getElementById('btn-toggle-archive');
  const btnDeleteMsg = document.getElementById('btn-delete-msg');

  let allMessages = [];
  let currentFilter = 'all';
  let activeMessage = null;

  async function loadMessages() {
    try {
      const messages = await AdminCore.apiFetch('/api/admin/messages');
      allMessages = Array.isArray(messages) ? messages : [];
      updateCounts();
      renderTable();
    } catch (err) {
      AdminCore.showToast(err.message || 'Failed to load inquiries', 'error');
    }
  }

  function updateCounts() {
    const unread = allMessages.filter(m => !m.read && !m.archived).length;
    const archived = allMessages.filter(m => m.archived).length;
    const all = allMessages.filter(m => !m.archived).length;

    if (countAll) countAll.textContent = all;
    if (countUnread) countUnread.textContent = unread;
    if (countArchived) countArchived.textContent = archived;

    const sidebarBadge = document.getElementById('sidebar-unread-badge');
    if (sidebarBadge) {
      if (unread > 0) {
        sidebarBadge.textContent = unread;
        sidebarBadge.style.display = 'inline-block';
      } else {
        sidebarBadge.style.display = 'none';
      }
    }
  }

  function renderTable() {
    if (!tbody) return;

    let filtered = [];
    if (currentFilter === 'all') {
      filtered = allMessages.filter(m => !m.archived);
    } else if (currentFilter === 'unread') {
      filtered = allMessages.filter(m => !m.read && !m.archived);
    } else if (currentFilter === 'archived') {
      filtered = allMessages.filter(m => m.archived);
    }

    if (filtered.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align: center; color: var(--text-tertiary); padding: 3rem 1rem;">
            <div style="font-weight: 500; margin-bottom: 0.25rem;">No inquiries in this folder</div>
            <div style="font-size: var(--text-xs);">When recruiters contact you, their messages will appear here securely.</div>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = filtered.map(msg => {
      const isUnread = !msg.read;
      const statusPill = isUnread 
        ? '<span class="admin-pill pill-blue">Unread</span>' 
        : (msg.archived ? '<span class="admin-pill pill-gray">Archived</span>' : '<span class="admin-pill pill-green">Read</span>');
      
      const dateStr = msg.createdAt ? new Date(msg.createdAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      }) : 'Recently';

      return `
        <tr style="${isUnread ? 'background: rgba(59, 130, 246, 0.04); font-weight: 500;' : ''}">
          <td style="text-align: center;">
            ${isUnread ? '<span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: var(--accent-primary);"></span>' : ''}
          </td>
          <td>
            <div style="color: var(--text-primary); font-weight: 600;">${escapeHtml(msg.name || 'Anonymous')}</div>
            <div style="font-size: var(--text-xs); color: var(--text-tertiary); font-family: var(--font-mono);">${escapeHtml(msg.email || '')}</div>
          </td>
          <td>
            <div style="color: var(--text-primary); max-width: 320px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
              ${escapeHtml(msg.subject || 'Inquiry')}
            </div>
            <div style="font-size: var(--text-xs); color: var(--text-tertiary); max-width: 320px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
              ${escapeHtml(msg.message || '')}
            </div>
          </td>
          <td style="font-size: var(--text-xs); color: var(--text-tertiary); white-space: nowrap;">
            ${dateStr}
          </td>
          <td style="text-align: right; white-space: nowrap;">
            <button type="button" class="admin-action-btn view-msg-btn" data-id="${msg.id}" title="View Details">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
            </button>
            <button type="button" class="admin-action-btn archive-msg-btn" data-id="${msg.id}" title="${msg.archived ? 'Unarchive' : 'Archive'}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="21 8 21 21 3 21 3 8"></polyline><rect x="1" y="3" width="22" height="5"></rect><line x1="10" y1="12" x2="14" y2="12"></line></svg>
            </button>
            <button type="button" class="admin-action-btn delete-msg-btn" data-id="${msg.id}" title="Delete">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
          </td>
        </tr>
      `;
    }).join('');

    // Attach row button events
    tbody.querySelectorAll('.view-msg-btn').forEach(btn => {
      btn.addEventListener('click', () => openMessageDetail(btn.dataset.id));
    });

    tbody.querySelectorAll('.archive-msg-btn').forEach(btn => {
      btn.addEventListener('click', () => toggleArchive(btn.dataset.id));
    });

    tbody.querySelectorAll('.delete-msg-btn').forEach(btn => {
      btn.addEventListener('click', () => deleteMessage(btn.dataset.id));
    });
  }

  async function openMessageDetail(id) {
    const msg = allMessages.find(m => m.id === id);
    if (!msg) return;
    activeMessage = msg;

    if (detailSubject) detailSubject.textContent = msg.subject || 'Inquiry';
    if (detailSender) detailSender.textContent = msg.name || 'Anonymous Recruiter';
    if (detailEmail) detailEmail.textContent = msg.email || '';
    if (detailDate) detailDate.textContent = msg.createdAt ? new Date(msg.createdAt).toLocaleString() : '';
    if (detailBody) detailBody.textContent = msg.message || '';

    if (detailStatus) {
      detailStatus.className = msg.archived 
        ? 'admin-pill pill-gray' 
        : (msg.read ? 'admin-pill pill-green' : 'admin-pill pill-blue');
      detailStatus.textContent = msg.archived ? 'Archived' : (msg.read ? 'Read' : 'Unread');
    }

    if (btnToggleRead) {
      btnToggleRead.textContent = msg.read ? 'Mark as Unread' : 'Mark as Read';
    }

    if (btnToggleArchive) {
      btnToggleArchive.textContent = msg.archived ? 'Unarchive' : 'Archive';
    }

    if (btnReplyEmail && msg.email) {
      btnReplyEmail.href = `mailto:${encodeURIComponent(msg.email)}?subject=Re: ${encodeURIComponent(msg.subject || 'Your Portfolio Inquiry')}`;
    }

    // Automatically mark as read if currently unread
    if (!msg.read) {
      try {
        await AdminCore.apiFetch(`/api/admin/messages/${msg.id}`, {
          method: 'PUT',
          body: JSON.stringify({ read: true })
        });
        msg.read = true;
        if (detailStatus) {
          detailStatus.className = 'admin-pill pill-green';
          detailStatus.textContent = 'Read';
        }
        if (btnToggleRead) btnToggleRead.textContent = 'Mark as Unread';
        updateCounts();
        renderTable();
      } catch (err) {
        console.error('Error marking read:', err);
      }
    }

    if (modal) modal.style.display = 'flex';
  }

  function closeDetailModal() {
    if (modal) modal.style.display = 'none';
    activeMessage = null;
  }

  if (btnCloseModal) {
    btnCloseModal.addEventListener('click', closeDetailModal);
  }

  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeDetailModal();
    });
  }

  // Toggle Read in Modal
  if (btnToggleRead) {
    btnToggleRead.addEventListener('click', async () => {
      if (!activeMessage) return;
      try {
        const newReadStatus = !activeMessage.read;
        await AdminCore.apiFetch(`/api/admin/messages/${activeMessage.id}`, {
          method: 'PUT',
          body: JSON.stringify({ read: newReadStatus })
        });
        activeMessage.read = newReadStatus;
        btnToggleRead.textContent = newReadStatus ? 'Mark as Unread' : 'Mark as Read';
        if (detailStatus) {
          detailStatus.className = newReadStatus ? 'admin-pill pill-green' : 'admin-pill pill-blue';
          detailStatus.textContent = newReadStatus ? 'Read' : 'Unread';
        }
        AdminCore.showToast(`Marked as ${newReadStatus ? 'read' : 'unread'}`, 'info');
        updateCounts();
        renderTable();
      } catch (err) {
        AdminCore.showToast(err.message || 'Error updating status', 'error');
      }
    });
  }

  // Toggle Archive in Modal
  if (btnToggleArchive) {
    btnToggleArchive.addEventListener('click', async () => {
      if (!activeMessage) return;
      await toggleArchive(activeMessage.id);
      closeDetailModal();
    });
  }

  // Delete in Modal
  if (btnDeleteMsg) {
    btnDeleteMsg.addEventListener('click', async () => {
      if (!activeMessage) return;
      const id = activeMessage.id;
      closeDetailModal();
      await deleteMessage(id);
    });
  }

  async function toggleArchive(id) {
    const msg = allMessages.find(m => m.id === id);
    if (!msg) return;

    try {
      const newArchiveStatus = !msg.archived;
      await AdminCore.apiFetch(`/api/admin/messages/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ archived: newArchiveStatus })
      });
      msg.archived = newArchiveStatus;
      AdminCore.showToast(`Inquiry ${newArchiveStatus ? 'archived' : 'restored to inbox'}`, 'info');
      updateCounts();
      renderTable();
    } catch (err) {
      AdminCore.showToast(err.message || 'Error updating archive state', 'error');
    }
  }

  async function deleteMessage(id) {
    const msg = allMessages.find(m => m.id === id);
    const sender = msg ? msg.name : 'this message';

    AdminCore.confirmAction({
      title: 'Delete Recruiter Inquiry',
      message: `Are you sure you want to permanently delete the inquiry from "${sender}"? This action cannot be undone.`,
      confirmText: 'Delete Inquiry',
      danger: true,
      onConfirm: async () => {
        try {
          await AdminCore.apiFetch(`/api/admin/messages/${id}`, {
            method: 'DELETE'
          });
          allMessages = allMessages.filter(m => m.id !== id);
          AdminCore.showToast('Inquiry permanently deleted', 'success');
          updateCounts();
          renderTable();
        } catch (err) {
          AdminCore.showToast(err.message || 'Failed to delete message', 'error');
        }
      }
    });
  }

  // Filter tab events
  filterTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      filterTabs.forEach(t => {
        t.classList.remove('active', 'btn-primary');
        t.classList.add('btn-secondary');
      });
      tab.classList.add('active', 'btn-primary');
      tab.classList.remove('btn-secondary');
      currentFilter = tab.dataset.filter || 'all';
      renderTable();
    });
  });

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  await loadMessages();
});
