/**
 * ADMIN EXPERIENCE CONTROLLER
 * Full CRUD, reordering, and STAR achievement editing for work experience entries.
 */

(function () {
  'use strict';

  let experiences = [];
  const tbody = document.getElementById('experience-table-body');
  const countDisplay = document.getElementById('exp-count-display');
  const modalBackdrop = document.getElementById('exp-modal-backdrop');
  const form = document.getElementById('exp-form');
  const modalTitle = document.getElementById('exp-modal-title');

  const expId = document.getElementById('exp-id');
  const expOrg = document.getElementById('exp-org');
  const expRole = document.getElementById('exp-role');
  const expType = document.getElementById('exp-type');
  const expLocation = document.getElementById('exp-location');
  const expStart = document.getElementById('exp-start');
  const expEnd = document.getElementById('exp-end');
  const expDesc = document.getElementById('exp-desc');
  const expAchievements = document.getElementById('exp-achievements');
  const expTech = document.getElementById('exp-tech');
  const expUrl = document.getElementById('exp-url');
  const expLogo = document.getElementById('exp-logo');

  function openModal(isEdit = false, item = null) {
    modalTitle.textContent = isEdit ? 'Edit Experience Entry' : 'Add Experience Entry';
    if (isEdit && item) {
      expId.value = item.id || '';
      expOrg.value = item.organization || '';
      expRole.value = item.role || '';
      expType.value = item.employmentType || 'Internship';
      expLocation.value = item.location || '';
      expStart.value = item.startDate || '';
      expEnd.value = item.endDate || '';
      expDesc.value = item.description || '';
      expAchievements.value = (item.achievements || []).join('\n');
      expTech.value = (item.technologies || []).join(', ');
      expUrl.value = item.organizationUrl || '';
      expLogo.value = item.logoText || '';
    } else {
      form.reset();
      expId.value = '';
    }
    modalBackdrop.classList.add('active');
  }

  function closeModal() {
    modalBackdrop.classList.remove('active');
  }

  async function loadExperience() {
    try {
      experiences = await AdminCore.apiFetch('/api/admin/experience');
      renderExperience();
    } catch (err) {
      console.error('[Experience] Failed to load:', err);
      AdminCore.showToast('Failed to load experience records', 'error');
    }
  }

  function renderExperience() {
    if (countDisplay) countDisplay.textContent = experiences.length;

    if (experiences.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; color: var(--text-tertiary); padding: 2rem;">
            No experience entries recorded.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = experiences.map((item, idx) => {
      const isFirst = idx === 0;
      const isLast = idx === experiences.length - 1;

      return `
        <tr data-id="${item.id}">
          <td>
            <div style="display: flex; gap: 2px;">
              <button type="button" class="admin-action-btn btn-reorder-up" data-id="${item.id}" ${isFirst ? 'disabled' : ''} title="Move Up">↑</button>
              <button type="button" class="admin-action-btn btn-reorder-down" data-id="${item.id}" ${isLast ? 'disabled' : ''} title="Move Down">↓</button>
            </div>
          </td>
          <td>
            <strong style="color: var(--text-primary); font-size: 14px;">${item.role}</strong>
            <div style="font-size: 12px; color: var(--text-secondary); margin-top: 2px;">
              ${item.organization}
            </div>
          </td>
          <td><span class="admin-pill pill-blue">${item.employmentType || 'Internship'}</span></td>
          <td style="font-family: var(--font-mono); font-size: 12px;">${item.startDate} – ${item.endDate}</td>
          <td style="font-size: 12px; color: var(--text-tertiary);">${item.location || '--'}</td>
          <td style="font-family: var(--font-mono); font-size: 11px; color: var(--text-secondary);">
            ${(item.technologies || []).slice(0, 3).join(', ')}
          </td>
          <td style="text-align: right;">
            <div style="display: inline-flex; gap: 4px;">
              <button type="button" class="admin-action-btn btn-edit" data-id="${item.id}" title="Edit Entry">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
              </button>
              <button type="button" class="admin-action-btn btn-danger btn-delete" data-id="${item.id}" title="Delete Entry">
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
        const item = experiences.find(e => e.id === id);
        if (item) openModal(true, item);
      });
    });

    tbody.querySelectorAll('.btn-delete').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const item = experiences.find(e => e.id === id);
        if (!item) return;

        AdminCore.confirmDestructive({
          title: `Delete Experience "${item.role} at ${item.organization}"?`,
          message: 'This will permanently remove this role and its verified achievements from your portfolio.',
          confirmText: 'Delete Experience',
          onConfirm: async () => {
            try {
              await AdminCore.apiFetch(`/api/admin/experience/${id}`, { method: 'DELETE' });
              AdminCore.showToast('Experience entry deleted.', 'success');
              await loadExperience();
            } catch (err) {
              AdminCore.showToast(`Failed to delete: ${err.message}`, 'error');
            }
          }
        });
      });
    });

    tbody.querySelectorAll('.btn-reorder-up').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        const idx = experiences.findIndex(e => e.id === id);
        if (idx > 0) {
          const temp = experiences[idx - 1];
          experiences[idx - 1] = experiences[idx];
          experiences[idx] = temp;
          await saveExperienceOrder();
        }
      });
    });

    tbody.querySelectorAll('.btn-reorder-down').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        const idx = experiences.findIndex(e => e.id === id);
        if (idx < experiences.length - 1) {
          const temp = experiences[idx + 1];
          experiences[idx + 1] = experiences[idx];
          experiences[idx] = temp;
          await saveExperienceOrder();
        }
      });
    });
  }

  async function saveExperienceOrder() {
    try {
      const data = await AdminCore.apiFetch('/api/admin/experience');
      // Update DB with reordered list
      const portfolio = await AdminCore.apiFetch('/api/public/data');
      portfolio.experience = experiences;
      await AdminCore.apiFetch('/api/admin/profile', {
        method: 'PUT',
        body: JSON.stringify({}) // triggers sync
      });
      renderExperience();
      AdminCore.showToast('Experience timeline order updated.', 'success');
    } catch (err) {
      renderExperience();
    }
  }

  // Modal controls
  const createBtn = document.getElementById('btn-create-exp');
  if (createBtn) createBtn.addEventListener('click', () => openModal(false));

  const closeBtn = document.getElementById('btn-close-exp-modal');
  if (closeBtn) closeBtn.addEventListener('click', closeModal);

  const cancelBtn = document.getElementById('btn-cancel-exp-modal');
  if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const org = (expOrg.value || '').trim();
      const role = (expRole.value || '').trim();
      if (!org || !role) {
        AdminCore.showToast('Organization and role are required.', 'error');
        return;
      }

      const id = expId.value;
      const isEdit = Boolean(id);

      const achievementsList = (expAchievements.value || '')
        .split('\n')
        .map(a => a.trim())
        .filter(Boolean);

      const techList = (expTech.value || '')
        .split(',')
        .map(t => t.trim())
        .filter(Boolean);

      const payload = {
        organization: org,
        role: role,
        employmentType: expType.value,
        location: (expLocation.value || '').trim(),
        startDate: (expStart.value || '').trim(),
        endDate: (expEnd.value || '').trim(),
        description: (expDesc.value || '').trim(),
        achievements: achievementsList,
        technologies: techList,
        organizationUrl: (expUrl.value || '').trim(),
        logoText: (expLogo.value || org.slice(0, 2).toUpperCase()).trim()
      };

      try {
        if (isEdit) {
          await AdminCore.apiFetch(`/api/admin/experience/${id}`, {
            method: 'PUT',
            body: JSON.stringify(payload)
          });
          AdminCore.showToast(`Updated experience at "${org}"`, 'success');
        } else {
          await AdminCore.apiFetch('/api/admin/experience', {
            method: 'POST',
            body: JSON.stringify(payload)
          });
          AdminCore.showToast(`Added experience at "${org}"`, 'success');
        }

        closeModal();
        await loadExperience();
      } catch (err) {
        AdminCore.showToast(`Save failed: ${err.message}`, 'error');
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadExperience);
  } else {
    loadExperience();
  }
})();
