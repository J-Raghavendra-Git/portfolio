/**
 * ADMIN SKILLS CONTROLLER
 * Full CRUD, category filtering, and featured toggling for skills matrix.
 */

(function () {
  'use strict';

  let skillsData = { items: [] };
  const tbody = document.getElementById('skills-table-body');
  const countDisplay = document.getElementById('skills-count-display');
  const categoryFilter = document.getElementById('skill-category-filter');
  const modalBackdrop = document.getElementById('skill-modal-backdrop');
  const form = document.getElementById('skill-form');
  const modalTitle = document.getElementById('skill-modal-title');

  const skId = document.getElementById('sk-id');
  const skName = document.getElementById('sk-name');
  const skCategory = document.getElementById('sk-category');
  const skLevel = document.getElementById('sk-level');
  const skProjects = document.getElementById('sk-projects');
  const skUrl = document.getElementById('sk-url');
  const skFeatured = document.getElementById('sk-featured');

  function openModal(isEdit = false, item = null) {
    modalTitle.textContent = isEdit ? 'Edit Skill Item' : 'Add New Skill';
    if (isEdit && item) {
      skId.value = item.id || '';
      skName.value = item.name || '';
      skCategory.value = item.category || 'Programming Languages';
      skLevel.value = item.level || 'Proficient';
      skProjects.value = item.projectsCount ?? 1;
      skUrl.value = item.officialDocUrl || '';
      skFeatured.checked = Boolean(item.featured);
    } else {
      form.reset();
      skId.value = '';
      skProjects.value = 1;
    }
    modalBackdrop.classList.add('active');
  }

  function closeModal() {
    modalBackdrop.classList.remove('active');
  }

  async function loadSkills() {
    try {
      skillsData = await AdminCore.apiFetch('/api/admin/skills');
      skillsData.items = skillsData.items || [];
      renderSkills();
    } catch (err) {
      console.error('[Skills] Failed to load:', err);
      AdminCore.showToast('Failed to load skills matrix', 'error');
    }
  }

  function renderSkills() {
    const items = skillsData.items || [];
    if (countDisplay) countDisplay.textContent = items.length;

    const selectedCategory = categoryFilter?.value || 'ALL';
    const filtered = selectedCategory === 'ALL'
      ? items
      : items.filter(s => s.category === selectedCategory);

    if (filtered.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; color: var(--text-tertiary); padding: 2rem;">
            No skills found in selected category.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = filtered.map(item => {
      const levelPillClass = item.level === 'Core' ? 'pill-blue' : item.level === 'Proficient' ? 'pill-green' : 'pill-gray';
      const featuredBadge = item.featured ? `<span class="admin-pill pill-blue">★ Featured</span>` : `<span class="admin-pill pill-gray">Standard</span>`;

      return `
        <tr data-id="${item.id}">
          <td>
            <strong style="color: var(--text-primary); font-size: 14px;">${item.name}</strong>
          </td>
          <td><span class="admin-pill pill-gray">${item.category}</span></td>
          <td><span class="admin-pill ${levelPillClass}">${item.level}</span></td>
          <td style="font-family: var(--font-mono); font-size: 12px;">${item.projectsCount || 1} projects</td>
          <td>${featuredBadge}</td>
          <td>
            ${item.officialDocUrl ? `<a href="${item.officialDocUrl}" target="_blank" rel="noopener noreferrer" style="font-size: 11px; color: var(--accent-primary); text-decoration: none;">Doc Link ↗</a>` : '<span style="color: var(--text-muted); font-size: 11px;">None</span>'}
          </td>
          <td style="text-align: right;">
            <div style="display: inline-flex; gap: 4px;">
              <button type="button" class="admin-action-btn btn-edit" data-id="${item.id}" title="Edit Skill">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
              </button>
              <button type="button" class="admin-action-btn btn-danger btn-delete" data-id="${item.id}" title="Delete Skill">
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
        const item = skillsData.items.find(s => s.id === id);
        if (item) openModal(true, item);
      });
    });

    tbody.querySelectorAll('.btn-delete').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const item = skillsData.items.find(s => s.id === id);
        if (!item) return;

        AdminCore.confirmDestructive({
          title: `Delete Skill "${item.name}"?`,
          message: 'This will remove this technology from your skills matrix.',
          confirmText: 'Delete Skill',
          onConfirm: async () => {
            try {
              await AdminCore.apiFetch(`/api/admin/skills/${id}`, { method: 'DELETE' });
              AdminCore.showToast(`Deleted skill "${item.name}"`, 'success');
              await loadSkills();
            } catch (err) {
              AdminCore.showToast(`Delete failed: ${err.message}`, 'error');
            }
          }
        });
      });
    });
  }

  if (categoryFilter) {
    categoryFilter.addEventListener('change', () => renderSkills());
  }

  // Modal handlers
  const createBtn = document.getElementById('btn-create-skill');
  if (createBtn) createBtn.addEventListener('click', () => openModal(false));

  const closeBtn = document.getElementById('btn-close-skill-modal');
  if (closeBtn) closeBtn.addEventListener('click', closeModal);

  const cancelBtn = document.getElementById('btn-cancel-skill-modal');
  if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const name = (skName.value || '').trim();
      if (!name) {
        AdminCore.showToast('Technology name is required.', 'error');
        return;
      }

      const id = skId.value;
      const isEdit = Boolean(id);

      const payload = {
        name: name,
        category: skCategory.value,
        level: skLevel.value,
        projectsCount: parseInt(skProjects.value, 10) || 1,
        officialDocUrl: (skUrl.value || '').trim(),
        featured: skFeatured.checked
      };

      try {
        if (isEdit) {
          await AdminCore.apiFetch(`/api/admin/skills/${id}`, {
            method: 'PUT',
            body: JSON.stringify(payload)
          });
          AdminCore.showToast(`Updated skill "${name}"`, 'success');
        } else {
          await AdminCore.apiFetch('/api/admin/skills', {
            method: 'POST',
            body: JSON.stringify(payload)
          });
          AdminCore.showToast(`Added skill "${name}"`, 'success');
        }

        closeModal();
        await loadSkills();
      } catch (err) {
        AdminCore.showToast(`Save failed: ${err.message}`, 'error');
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadSkills);
  } else {
    loadSkills();
  }
})();
