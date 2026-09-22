/**
 * ADMIN DASHBOARD CONTROLLER
 * Hydrates the executive overview with real system statistics and recent messages.
 */

(function () {
  'use strict';

  async function loadDashboard() {
    try {
      const data = await AdminCore.apiFetch('/api/admin/dashboard');
      const stats = data.stats || {};
      const recentMessages = data.recentMessages || [];

      // Hydrate Metric Cards
      const projectsEl = document.getElementById('stat-projects-count');
      if (projectsEl) projectsEl.textContent = stats.projectsCount ?? '--';

      const featuredEl = document.getElementById('stat-featured-projects');
      if (featuredEl) featuredEl.textContent = `${stats.featuredProjectsCount || 0} featured on home`;

      const expEl = document.getElementById('stat-exp-count');
      if (expEl) expEl.textContent = stats.experienceCount ?? '--';

      const skillsEl = document.getElementById('stat-skills-count');
      if (skillsEl) skillsEl.textContent = stats.skillsCount ?? '--';

      const achEl = document.getElementById('stat-achievements-count');
      if (achEl) achEl.textContent = stats.achievementsCount ?? '--';

      const msgEl = document.getElementById('stat-messages-count');
      if (msgEl) msgEl.textContent = stats.totalMessages ?? '--';

      const unreadPill = document.getElementById('stat-unread-pill');
      if (unreadPill) {
        unreadPill.textContent = `${stats.unreadMessages || 0} Unread`;
        unreadPill.className = stats.unreadMessages > 0 ? 'admin-pill pill-amber' : 'admin-pill pill-blue';
      }

      const sidebarUnread = document.getElementById('sidebar-unread-badge');
      if (sidebarUnread) {
        if (stats.unreadMessages > 0) {
          sidebarUnread.textContent = stats.unreadMessages;
          sidebarUnread.style.display = 'inline-block';
        } else {
          sidebarUnread.style.display = 'none';
        }
      }

      const resumeVerEl = document.getElementById('stat-resume-version');
      if (resumeVerEl) resumeVerEl.textContent = stats.resumeVersion || 'v1.0';

      const resumeUpEl = document.getElementById('stat-resume-updated');
      if (resumeUpEl) resumeUpEl.textContent = stats.resumeLastUpdated || 'Updated recently';

      const updateEl = document.getElementById('stat-last-content-update');
      if (updateEl && stats.lastContentUpdate) {
        const d = new Date(stats.lastContentUpdate);
        updateEl.textContent = `Last Content Update: ${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      }

      // Hydrate Recent Messages Table
      const tbody = document.getElementById('dashboard-recent-messages-tbody');
      if (tbody) {
        if (recentMessages.length === 0) {
          tbody.innerHTML = `
            <tr>
              <td colspan="5" style="text-align: center; color: var(--text-tertiary); padding: 2rem;">
                No contact inquiries received yet.
              </td>
            </tr>
          `;
        } else {
          tbody.innerHTML = recentMessages.map(msg => {
            const date = new Date(msg.createdAt).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric'
            });
            const unreadDot = !msg.read
              ? `<span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:#3b82f6;"></span>`
              : `<span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:var(--text-muted);"></span>`;

            return `
              <tr>
                <td>${unreadDot}</td>
                <td>
                  <strong style="color: var(--text-primary);">${msg.name}</strong>
                  <div style="font-size: 11px; color: var(--text-tertiary);">${msg.email}</div>
                </td>
                <td>
                  <span style="font-weight: 500;">${msg.subject}</span>
                  <div style="font-size: 12px; color: var(--text-tertiary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 400px;">
                    ${msg.message}
                  </div>
                </td>
                <td style="font-family: var(--font-mono); font-size: 12px;">${date}</td>
                <td style="text-align: right;">
                  <a href="/admin/messages?id=${msg.id}" class="btn btn-secondary btn-sm" style="padding: 4px 10px; font-size: 12px;">View</a>
                </td>
              </tr>
            `;
          }).join('');
        }
      }
    } catch (err) {
      console.error('[Dashboard] Failed to load data:', err);
      AdminCore.showToast('Failed to load dashboard metrics', 'error');
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadDashboard);
  } else {
    loadDashboard();
  }
})();
