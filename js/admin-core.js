/**
 * ADMIN CORE FRAMEWORK
 * Shared client utilities for private administration:
 * - Session verification & CSRF management
 * - Authenticated API wrapper
 * - Toast notification service
 * - Confirmation dialog helper
 * - Sidebar & mobile drawer controllers
 */

const AdminCore = (function () {
  'use strict';

  let csrfToken = null;

  /**
   * Show toast notification
   */
  function showToast(message, type = 'info') {
    let container = document.getElementById('admin-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'admin-toast-container';
      container.style.position = 'fixed';
      container.style.top = '1.5rem';
      container.style.right = '1.5rem';
      container.style.zIndex = '9999';
      container.style.display = 'flex';
      container.style.flexDirection = 'column';
      container.style.gap = '0.5rem';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `admin-toast toast-${type}`;
    toast.style.background = type === 'error' ? 'var(--accent-crimson, #ef4444)' : type === 'success' ? 'var(--accent-emerald, #10b981)' : 'var(--bg-surface-elevated)';
    toast.style.color = '#ffffff';
    toast.style.padding = '0.75rem 1.25rem';
    toast.style.borderRadius = 'var(--radius-md)';
    toast.style.fontSize = 'var(--text-sm)';
    toast.style.fontWeight = '500';
    toast.style.boxShadow = 'var(--shadow-lg)';
    toast.style.display = 'flex';
    toast.style.alignItems = 'center';
    toast.style.gap = '0.5rem';
    toast.style.transition = 'all 0.3s ease';
    toast.style.border = '1px solid rgba(255, 255, 255, 0.15)';
    toast.textContent = message;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-10px)';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  /**
   * Standardized fetch wrapper attaching CSRF token and handling 401
   */
  async function apiFetch(endpoint, options = {}) {
    options.headers = options.headers || {};
    if (!options.headers['Content-Type'] && !(options.body instanceof FormData) && !options.isRaw) {
      options.headers['Content-Type'] = 'application/json';
    }

    if (csrfToken && ['POST', 'PUT', 'DELETE', 'PATCH'].includes((options.method || 'GET').toUpperCase())) {
      options.headers['x-csrf-token'] = csrfToken;
    }

    try {
      const response = await fetch(endpoint, options);

      if (response.status === 401) {
        // Session expired or unauthenticated
        showToast('Session expired. Redirecting to login...', 'error');
        setTimeout(() => {
          window.location.href = `/admin/login?redirect=${encodeURIComponent(window.location.pathname)}`;
        }, 1000);
        throw new Error('Authentication required');
      }

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || `HTTP error ${response.status}`);
      }

      return data;
    } catch (err) {
      throw err;
    }
  }

  /**
   * Confirmation dialog helper for destructive actions
   */
  function confirmDestructive({ title, message, confirmText = 'Delete', onConfirm }) {
    let backdrop = document.getElementById('admin-confirm-backdrop');
    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.id = 'admin-confirm-backdrop';
      backdrop.className = 'admin-modal-backdrop';
      backdrop.innerHTML = `
        <div class="admin-modal" style="max-width: 440px;">
          <div class="admin-modal-header">
            <h3 id="confirm-modal-title" class="admin-modal-title" style="color: #ef4444;"></h3>
            <button type="button" class="btn-icon" data-cancel-confirm>&times;</button>
          </div>
          <div class="admin-modal-body">
            <p id="confirm-modal-msg" style="color: var(--text-secondary); font-size: var(--text-sm);"></p>
          </div>
          <div class="admin-modal-footer">
            <button type="button" class="btn btn-secondary btn-sm" data-cancel-confirm>Cancel</button>
            <button type="button" id="confirm-modal-action-btn" class="btn btn-primary btn-sm" style="background-color: #ef4444; border-color: #ef4444;"></button>
          </div>
        </div>
      `;
      document.body.appendChild(backdrop);

      backdrop.querySelectorAll('[data-cancel-confirm]').forEach(btn => {
        btn.addEventListener('click', () => backdrop.classList.remove('active'));
      });
    }

    document.getElementById('confirm-modal-title').textContent = title || 'Confirm Action';
    document.getElementById('confirm-modal-msg').textContent = message || 'Are you sure you want to proceed?';
    const actionBtn = document.getElementById('confirm-modal-action-btn');
    actionBtn.textContent = confirmText;

    actionBtn.onclick = async () => {
      backdrop.classList.remove('active');
      if (onConfirm) await onConfirm();
    };

    backdrop.classList.add('active');
  }

  /**
   * Initialize admin environment on page load
   */
  async function init() {
    // Check session status and retrieve CSRF token
    try {
      const status = await fetch('/api/auth/status').then(r => r.json());
      if (!status.authenticated) {
        // If not authenticated and not on login page, redirect
        if (!window.location.pathname.includes('/admin/login')) {
          window.location.href = `/admin/login?redirect=${encodeURIComponent(window.location.pathname)}`;
          return;
        }
      } else {
        csrfToken = status.csrfToken;
        // Update user display if elements present
        const ownerNameEl = document.getElementById('admin-sidebar-owner-name');
        if (ownerNameEl && status.user) ownerNameEl.textContent = status.user.name || 'J Raghavendra';
      }
    } catch (err) {
      console.warn('[AdminCore] Status check failed:', err);
    }

    // Set active link in sidebar
    const currentPath = window.location.pathname.replace(/\.html$/, '');
    document.querySelectorAll('.admin-nav-link').forEach(link => {
      const href = link.getAttribute('href')?.replace(/\.html$/, '');
      if (href && (href === currentPath || (currentPath === '/admin' && href === '/admin/dashboard'))) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });

    // Mobile drawer toggle
    const toggleBtn = document.querySelector('.admin-mobile-toggle');
    const sidebar = document.querySelector('.admin-sidebar');
    if (toggleBtn && sidebar) {
      toggleBtn.addEventListener('click', () => {
        sidebar.classList.toggle('open');
      });
      // Close on clicking outside
      document.addEventListener('click', (e) => {
        if (sidebar.classList.contains('open') && !sidebar.contains(e.target) && !toggleBtn.contains(e.target)) {
          sidebar.classList.remove('open');
        }
      });
    }

    // Logout button handler
    const logoutBtn = document.getElementById('admin-logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        try {
          await fetch('/api/auth/logout', { method: 'POST' });
          window.location.href = '/admin/login';
        } catch (err) {
          window.location.href = '/admin/login';
        }
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  return {
    showToast,
    apiFetch,
    confirmDestructive,
    getCsrfToken: () => csrfToken
  };
})();
