/**
 * OWNER SECURITY CENTER JAVASCRIPT CONTROLLER
 * Powers /admin/security with session management, security event stream,
 * defensive health audits, and security posture monitoring.
 */

document.addEventListener('DOMContentLoaded', () => {
  initSecurityCenter();
});

let currentCsrfToken = '';

async function initSecurityCenter() {
  try {
    // 1. Verify authentication status and extract CSRF token
    const authRes = await fetch('/api/auth/status');
    const authData = await authRes.json();
    if (!authData.authenticated) {
      window.location.href = '/admin/login?redirect=' + encodeURIComponent(window.location.pathname);
      return;
    }
    currentCsrfToken = authData.csrfToken || '';

    // 2. Load all initial security center components
    await Promise.all([
      loadSecurityOverview(),
      loadDefensiveAudit(),
      loadSessions(),
      loadSecurityEvents('ALL')
    ]);

    // 3. Attach interactive listeners
    setupEventListeners();

  } catch (err) {
    console.error('Failed to initialize security center:', err);
    if (window.AdminCore?.showToast) {
      window.AdminCore.showToast('Error connecting to security services', 'error');
    }
  }
}

/**
 * Load overview metrics
 */
async function loadSecurityOverview() {
  try {
    const res = await fetch('/api/admin/security/overview');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    const scoreEl = document.getElementById('stat-score');
    if (scoreEl) scoreEl.textContent = `${data.postureScore}%`;

    const sessionsEl = document.getElementById('stat-sessions');
    if (sessionsEl) sessionsEl.textContent = data.activeSessionCount || 1;

    const failedEl = document.getElementById('stat-failed-logins');
    if (failedEl) failedEl.textContent = data.failedLoginsRecent || 0;

    const eventsCountEl = document.getElementById('stat-events-count');
    if (eventsCountEl) eventsCountEl.textContent = data.totalEventsCount || 0;

  } catch (err) {
    console.warn('Could not load security overview:', err);
  }
}

/**
 * Load defensive health checklist
 */
async function loadDefensiveAudit(triggerAudit = false) {
  const container = document.getElementById('checklist-container');
  if (!container) return;

  try {
    let data;
    if (triggerAudit) {
      const res = await fetch('/api/admin/security/audit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': currentCsrfToken
        }
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      data = await res.json();
      if (window.AdminCore?.showToast) {
        window.AdminCore.showToast(`Defensive audit complete: ${data.passingCount}/${data.totalChecks} checks verified.`, 'success');
      }
    } else {
      // Run audit to get current state
      const res = await fetch('/api/admin/security/audit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': currentCsrfToken
        }
      });
      data = await res.json();
    }

    const badgeEl = document.getElementById('checklist-pass-badge');
    if (badgeEl) {
      badgeEl.textContent = `${data.passingCount}/${data.totalChecks} Verified`;
    }

    if (!data.checks || data.checks.length === 0) {
      container.innerHTML = '<div style="padding: 16px; color: var(--text-tertiary);">No checks returned.</div>';
      return;
    }

    container.innerHTML = data.checks.map(c => `
      <div class="sec-checklist-item">
        <div style="margin-top: 2px;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </div>
        <div style="flex: 1;">
          <div class="sec-item-title">
            <span>${escapeHtml(c.title)}</span>
            <span class="sec-badge-pass">${escapeHtml(c.status)}</span>
          </div>
          <div class="sec-item-desc">${escapeHtml(c.description)}</div>
          <div class="sec-item-verification">// ${escapeHtml(c.verification)}</div>
        </div>
      </div>
    `).join('');

  } catch (err) {
    console.error('Error loading audit checklist:', err);
    container.innerHTML = `<div style="padding: 16px; color: #ef4444;">Failed to run defensive audit: ${escapeHtml(err.message)}</div>`;
  }
}

/**
 * Load active sessions
 */
async function loadSessions() {
  const container = document.getElementById('sessions-container');
  if (!container) return;

  try {
    const res = await fetch('/api/admin/security/sessions');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const sessions = await res.json();

    if (!Array.isArray(sessions) || sessions.length === 0) {
      container.innerHTML = '<div style="padding: 16px; color: var(--text-tertiary);">No active sessions found.</div>';
      return;
    }

    container.innerHTML = `
      <table style="width: 100%; border-collapse: collapse; font-size: 0.82rem; text-align: left;">
        <thead>
          <tr style="border-bottom: 1px solid var(--border-subtle); color: var(--text-tertiary); font-family: var(--font-mono); font-size: 0.72rem;">
            <th style="padding: 8px 12px;">CLIENT / DEVICE</th>
            <th style="padding: 8px 12px;">IP</th>
            <th style="padding: 8px 12px;">CREATED</th>
            <th style="padding: 8px 12px;">LAST ACTIVE</th>
            <th style="padding: 8px 12px; text-align: right;">ACTION</th>
          </tr>
        </thead>
        <tbody>
          ${sessions.map(s => `
            <tr style="border-bottom: 1px solid var(--border-subtle);">
              <td style="padding: 10px 12px;">
                <div style="font-weight: 600; color: var(--text-primary); display: flex; align-items: center; gap: 6px;">
                  <span>${escapeHtml(s.device)}</span>
                  ${s.isCurrent ? '<span class="sec-badge-info" style="font-size: 10px; padding: 1px 5px;">CURRENT</span>' : ''}
                </div>
                <div style="font-family: var(--font-mono); font-size: 0.7rem; color: var(--text-muted);">
                  ID: ${escapeHtml(s.id)}
                </div>
              </td>
              <td style="padding: 10px 12px; font-family: var(--font-mono); color: var(--text-secondary);">
                ${escapeHtml(s.ip)}
              </td>
              <td style="padding: 10px 12px; color: var(--text-secondary); font-size: 0.75rem;">
                ${formatTimestamp(s.createdAt)}
              </td>
              <td style="padding: 10px 12px; color: var(--text-secondary); font-size: 0.75rem;">
                ${formatTimestamp(s.lastActivity)}
              </td>
              <td style="padding: 10px 12px; text-align: right;">
                ${s.isCurrent ? `
                  <button class="btn btn-ghost btn-sm" disabled style="opacity: 0.5; font-size: 11px;">Current</button>
                ` : `
                  <button class="btn btn-danger btn-sm revoke-btn" data-session-id="${escapeHtml(s.id)}" style="font-size: 11px; padding: 4px 8px;">
                    Revoke
                  </button>
                `}
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;

    // Attach revoke buttons
    container.querySelectorAll('.revoke-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const sessionId = btn.getAttribute('data-session-id');
        if (!sessionId) return;
        if (!confirm(`Revoke active session ${sessionId}?`)) return;
        await revokeSession(sessionId);
      });
    });

  } catch (err) {
    console.error('Error loading sessions:', err);
    container.innerHTML = `<div style="padding: 16px; color: #ef4444;">Failed to load sessions.</div>`;
  }
}

/**
 * Revoke individual session
 */
async function revokeSession(sessionId) {
  try {
    const res = await fetch('/api/admin/security/sessions/revoke', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-csrf-token': currentCsrfToken
      },
      body: JSON.stringify({ sessionId })
    });

    const data = await res.json();
    if (res.ok && data.success) {
      if (window.AdminCore?.showToast) {
        window.AdminCore.showToast(`Session ${sessionId} successfully revoked.`, 'success');
      }
      await loadSessions();
      await loadSecurityOverview();
      await loadSecurityEvents('ALL');
    } else {
      alert(`Failed to revoke session: ${data.error || 'Unknown error'}`);
    }
  } catch (err) {
    alert(`Revoke error: ${err.message}`);
  }
}

/**
 * Revoke all other sessions
 */
async function revokeAllOtherSessions() {
  if (!confirm('Are you sure you want to revoke all other active sessions? Only this current browser will remain logged in.')) {
    return;
  }

  try {
    const res = await fetch('/api/admin/security/sessions/revoke-others', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-csrf-token': currentCsrfToken
      }
    });

    const data = await res.json();
    if (res.ok && data.success) {
      if (window.AdminCore?.showToast) {
        window.AdminCore.showToast(`Revoked ${data.revokedCount} other session(s).`, 'success');
      }
      await loadSessions();
      await loadSecurityOverview();
      await loadSecurityEvents('ALL');
    } else {
      alert(`Failed to revoke other sessions: ${data.error || 'Unknown error'}`);
    }
  } catch (err) {
    alert(`Revoke error: ${err.message}`);
  }
}

/**
 * Load security event log
 */
async function loadSecurityEvents(type = 'ALL') {
  const container = document.getElementById('events-container');
  if (!container) return;

  try {
    const url = `/api/admin/security/events?type=${encodeURIComponent(type)}&limit=50`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const events = await res.json();

    if (!Array.isArray(events) || events.length === 0) {
      container.innerHTML = '<div style="padding: 16px; color: var(--text-tertiary); text-align: center;">No security events recorded.</div>';
      return;
    }

    container.innerHTML = events.map(e => {
      let badgeClass = 'sec-badge-info';
      if (e.severity === 'ALERT' || e.type === 'LOGIN_FAILURE') badgeClass = 'sec-badge-alert';
      else if (e.severity === 'WARN' || e.type === 'SESSION_REVOKED') badgeClass = 'sec-badge-warn';
      else if (e.type === 'LOGIN_SUCCESS' || e.type === 'AUDIT_TRIGGERED') badgeClass = 'sec-badge-pass';

      return `
        <div class="sec-event-row">
          <span class="${badgeClass}">${escapeHtml(e.severity || 'INFO')}</span>
          <div style="font-family: var(--font-mono); font-size: 0.72rem; color: var(--text-secondary);">
            ${escapeHtml(e.type)}
          </div>
          <div style="color: var(--text-primary);">
            ${escapeHtml(e.details)}
          </div>
          <div style="text-align: right; font-family: var(--font-mono); font-size: 0.7rem; color: var(--text-muted);">
            ${formatTimeAgo(e.timestamp)}
          </div>
        </div>
      `;
    }).join('');

  } catch (err) {
    console.error('Error loading security events:', err);
    container.innerHTML = `<div style="padding: 16px; color: #ef4444;">Failed to load events.</div>`;
  }
}

function setupEventListeners() {
  const auditBtn = document.getElementById('trigger-audit-btn');
  if (auditBtn) {
    auditBtn.addEventListener('click', async () => {
      auditBtn.disabled = true;
      auditBtn.innerHTML = 'Running audit...';
      await loadDefensiveAudit(true);
      await loadSecurityOverview();
      await loadSecurityEvents('ALL');
      auditBtn.disabled = false;
      auditBtn.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>
        <span>Run Defensive Audit</span>
      `;
    });
  }

  const revokeOthersBtn = document.getElementById('revoke-others-btn');
  if (revokeOthersBtn) {
    revokeOthersBtn.addEventListener('click', revokeAllOtherSessions);
  }

  const filterSelect = document.getElementById('event-filter');
  if (filterSelect) {
    filterSelect.addEventListener('change', () => {
      loadSecurityEvents(filterSelect.value);
    });
  }
}

function formatTimestamp(isoString) {
  if (!isoString) return 'Just now';
  try {
    const d = new Date(isoString);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch (_) {
    return isoString;
  }
}

function formatTimeAgo(isoString) {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    const secAgo = Math.floor((Date.now() - d.getTime()) / 1000);
    if (secAgo < 60) return `${secAgo}s ago`;
    if (secAgo < 3600) return `${Math.floor(secAgo / 60)}m ago`;
    if (secAgo < 86400) return `${Math.floor(secAgo / 3600)}h ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch (_) {
    return isoString;
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
