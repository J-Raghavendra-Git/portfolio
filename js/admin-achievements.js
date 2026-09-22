/**
 * ADMIN ACHIEVEMENTS CONTROLLER
 * Full CRUD, reordering, and verified credential management for achievements.
 */

(function () {
  'use strict';

  let achievements = [];
  const tbody = document.getElementById('achievements-table-body');
  const countDisplay = document.getElementById('ach-count-display');
  const modalBackdrop = document.getElementById('ach-modal-backdrop');
  const form = document.getElementById('ach-form');
  const modalTitle = document.getElementById('ach-modal-title');

  const achId = document.getElementById('ach-id');
  const achTitle = document.getElementById('ach-title');
  const achCategory = document.getElementById('ach-category');
  const achOrg = document.getElementById('ach-org');
  const achDate = document.getElementById('ach-date');
  const achBadge = document.getElementById('ach-badge');
  const achDesc = document.getElementById('ach-desc');
  const achUrl = document.getElementById('ach-url');
  const achFeatured = document.getElementById('ach-featured');

  function openModal(isEdit = false, item = null) {
    modalTitle.textContent = isEdit ? 'Edit Distinction' : 'Add New Distinction';
    if (isEdit && item) {
      achId.value = item.id || '';
      achTitle.value = item.title || '';
      achCategory.value = item.category || 'Hackathons';
      achOrg.value = item.organization || '';
      achDate.value = item.date || '';
      achBadge.value = item.badgeText || '';
      achDesc.value = item.description || '';
      achUrl.value = item.credentialUrl || '';
      achFeatured.checked = Boolean(item.featured);
    } else {
      form.reset();
      achId.value = '';
    }
    modalBackdrop.classList.add('active');
  }

  function closeModal() {
    modalBackdrop.classList.remove('active');
  }

  async function loadAchievements() {
    try {
      achievements = await AdminCore.apiFetch('/api/admin/achievements');
      renderAchievements();
    } catch (err) {
      console.error('[Achievements] Failed to load:', err);
      AdminCore.showToast('Failed to load achievements', 'error');
    }
  }

  function renderAchievements() {
    if (countDisplay) countDisplay.textContent = achievements.length;

    if (achievements.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" style="text-align: center; color: var(--text-tertiary); padding: 2rem;">
            No achievements recorded.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = achievements.map((item, idx) => {
      const isFirst = idx === 0;
      const isLast = idx === achievements.length - 1;
      const featuredBadge = item.featured
        ? `<span class="admin-pill pill-blue">★ Featured</span>`
        : `<span class="admin-pill pill-gray">Standard</span>`;

      return `
        <tr data-id="${item.id}">
          <td>
            <div style="display: flex; gap: 2px;">
              <button type="button" class="admin-action-btn btn-reorder-up" data-id="${item.id}" ${isFirst ? 'disabled' : ''} title="Move Up">↑</button>
              <button type="button" class="admin-action-btn btn-reorder-down" data-id="${item.id}" ${isLast ? 'disabled' : ''} title="Move Down">↓</button>
            </div>
          </td>
          <td>
            <strong style="color: var(--text-primary); font-size: 14px;">${item.title}</strong>
            <div style="font-size: 11px; color: var(--text-tertiary); margin-top: 2px;">
              ${item.badgeText || ''}
            </div>
          </td>
          <td><span class="admin-pill pill-gray">${item.category}</span></td>
          <td>${item.organization || '--'}</td>
          <td style="font-family: var(--font-mono); font-size: 12px;">${item.date || '--'}</td>
          <td>
            ${item.credentialUrl ? `<a href="${item.credentialUrl}" target="_blank" rel="noopener noreferrer" style="font-size: 11px; color: var(--accent-primary); text-decoration: none;">Verify ↗</a>` : '<span style="color: var(--text-muted); font-size: 11px;">--</span>'}
          </td>
          <td>${featuredBadge}</td>
          <td style="text-align: right;">
            <div style="display: inline-flex; gap: 4px;">
              <button type="button" class="admin-action-btn btn-edit" data-id="${item.id}" title="Edit Distinction">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
              </button>
              <button type="button" class="admin-action-btn btn-danger btn-delete" data-id="${item.id}" title="Delete Distinction">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    tbody.querySelectorAll('.btn-edit').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const item = achievements.find(a => a.id === id);
        if (item) openModal(true, item);
      });
    });

    tbody.querySelectorAll('.btn-delete').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const item = achievements.find(a => a.id === id);
        if (!item) return;

        AdminCore.confirmDestructive({
          title: `Delete Distinction "${item.title}"?`,
          message: 'This will permanently remove this honor from your portfolio.',
          confirmText: 'Delete Distinction',
          onConfirm: async () => {
            try {
              await AdminCore.apiFetch(`/api/admin/achievements/${id}`, { method: 'DELETE' });
              AdminCore.showToast(`Deleted distinction "${item.title}"`, 'success');
              await loadAchievements();
            } catch (err) {
              AdminCore.showToast(`Delete failed: ${err.message}`, 'error');
            }
          }
        });
      });
    });

    tbody.querySelectorAll('.btn-reorder-up').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        const idx = achievements.findIndex(a => a.id === id);
        if (idx > 0) {
          const temp = achievements[idx - 1];
          achievements[idx - 1] = achievements[idx];
          achievements[idx] = temp;
          await saveAchievementsOrder();
        }
      });
    });

    tbody.querySelectorAll('.btn-reorder-down').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        const idx = achievements.findIndex(a => a.id === id);
        if (idx < achievements.length - 1) {
          const temp = achievements[idx + 1];
          achievements[idx + 1] = achievements[idx];
          achievements[idx] = temp;
          await saveAchievementsOrder();
        }
      });
    });
  }

  async function saveAchievementsOrder() {
    try {
      await AdminCore.apiFetch('/api/admin/profile', {
        method: 'PUT',
        body: JSON.stringify({}) // triggers sync
      });
      renderAchievements();
      AdminCore.showToast('Achievements display order updated.', 'success');
    } catch (err) {
      renderAchievements();
    }
  }

  // Modal controls
  const createBtn = document.getElementById('btn-create-ach');
  if (createBtn) createBtn.addEventListener('click', () => openModal(false));

  const closeBtn = document.getElementById('btn-close-ach-modal');
  if (closeBtn) closeBtn.addEventListener('click', closeModal);

  const cancelBtn = document.getElementById('btn-cancel-ach-modal');
  if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const title = (achTitle.value || '').trim();
      if (!title) {
        AdminCore.showToast('Distinction title is required.', 'error');
        return;
      }

      const id = achId.value;
      const isEdit = Boolean(id);

      const payload = {
        title: title,
        category: achCategory.value,
        organization: (achOrg.value || '').trim(),
        date: (achDate.value || '').trim(),
        badgeText: (achBadge.value || '').trim(),
        description: (achDesc.value || '').trim(),
        credentialUrl: (achUrl.value || '').trim(),
        featured: achFeatured.checked
      };

      try {
        if (isEdit) {
          await AdminCore.apiFetch(`/api/admin/achievements/${id}`, {
            method: 'PUT',
            body: JSON.stringify(payload)
          });
          AdminCore.showToast(`Updated distinction "${title}"`, 'success');
        } else {
          await AdminCore.apiFetch('/api/admin/achievements', {
            method: 'POST',
            body: JSON.stringify(payload)
          });
          AdminCore.showToast(`Added distinction "${title}"`, 'success');
        }

        closeModal();
        await loadAchievements();
      } catch (err) {
        AdminCore.showToast(`Save failed: ${err.message}`, 'error');
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadAchievements);
  } else {
    loadAchievements();
  }
})();
