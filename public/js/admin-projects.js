/**
 * ADMIN PROJECTS CONTROLLER
 * Full CRUD, reordering, duplicate, and featured toggling for portfolio projects.
 */

(function () {
  'use strict';

  let projects = [];
  const tbody = document.getElementById('projects-table-body');
  const countDisplay = document.getElementById('projects-count-display');
  const searchInput = document.getElementById('project-search-input');
  const modalBackdrop = document.getElementById('project-modal-backdrop');
  const form = document.getElementById('project-form');
  const modalTitle = document.getElementById('project-modal-title');

  const pId = document.getElementById('p-id');
  const pTitle = document.getElementById('p-title');
  const pCategory = document.getElementById('p-category');
  const pTagline = document.getElementById('p-tagline');
  const pShortDesc = document.getElementById('p-shortdesc');
  const pImpact = document.getElementById('p-impact');
  const pGithub = document.getElementById('p-github');
  const pLive = document.getElementById('p-live');
  const pTech = document.getElementById('p-tech');
  const pStatus = document.getElementById('p-status');
  const pFeatured = document.getElementById('p-featured');
  const pProblem = document.getElementById('p-problem');
  const pSolution = document.getElementById('p-solution');

  function openModal(isEdit = false, project = null) {
    modalTitle.textContent = isEdit ? 'Edit Engineering Project' : 'Create New Engineering Project';
    if (isEdit && project) {
      pId.value = project.id || '';
      pTitle.value = project.title || '';
      pCategory.value = project.category || 'Distributed Systems';
      pTagline.value = project.tagline || '';
      pShortDesc.value = project.shortDescription || '';
      pImpact.value = project.impact || '';
      pGithub.value = project.githubUrl || '';
      pLive.value = project.liveUrl || '';
      pTech.value = (project.technologies || []).join(', ');
      pStatus.value = project.status || 'Production Verified';
      pFeatured.checked = Boolean(project.featured);
      pProblem.value = project.problem || '';
      pSolution.value = project.solution || '';
    } else {
      form.reset();
      pId.value = '';
      pStatus.value = 'Production Verified';
    }
    modalBackdrop.classList.add('active');
  }

  function closeModal() {
    modalBackdrop.classList.remove('active');
  }

  async function loadProjects() {
    try {
      projects = await AdminCore.apiFetch('/api/admin/projects');
      renderProjects();
    } catch (err) {
      console.error('[Projects] Failed to load projects:', err);
      AdminCore.showToast('Failed to load projects list', 'error');
    }
  }

  function renderProjects() {
    if (countDisplay) countDisplay.textContent = projects.length;

    const query = (searchInput?.value || '').toLowerCase().trim();
    const filtered = query
      ? projects.filter(p => p.title.toLowerCase().includes(query) || (p.technologies || []).some(t => t.toLowerCase().includes(query)))
      : projects;

    if (filtered.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; color: var(--text-tertiary); padding: 2rem;">
            No matching projects found.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = filtered.map((proj, idx) => {
      const isFirst = idx === 0;
      const isLast = idx === filtered.length - 1;
      const featuredBadge = proj.featured
        ? `<span class="admin-pill pill-blue">★ Featured</span>`
        : `<span class="admin-pill pill-gray">Standard</span>`;

      return `
        <tr data-id="${proj.id}">
          <td>
            <div style="display: flex; gap: 2px;">
              <button type="button" class="admin-action-btn btn-reorder-up" data-id="${proj.id}" ${isFirst ? 'disabled' : ''} title="Move Up">↑</button>
              <button type="button" class="admin-action-btn btn-reorder-down" data-id="${proj.id}" ${isLast ? 'disabled' : ''} title="Move Down">↓</button>
            </div>
          </td>
          <td>
            <strong style="color: var(--text-primary); font-size: 14px;">${proj.title}</strong>
            <div style="font-size: 11px; color: var(--text-tertiary); margin-top: 2px; max-width: 280px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
              ${proj.shortDescription || ''}
            </div>
          </td>
          <td><span class="admin-pill pill-gray">${proj.category || 'Systems'}</span></td>
          <td style="font-family: var(--font-mono); font-size: 11px; color: var(--text-secondary);">
            ${(proj.technologies || []).slice(0, 3).join(', ')}${(proj.technologies || []).length > 3 ? '...' : ''}
          </td>
          <td>${featuredBadge}</td>
          <td><span class="admin-pill pill-green">${proj.status || 'Active'}</span></td>
          <td style="text-align: right;">
            <div style="display: inline-flex; gap: 4px;">
              <button type="button" class="admin-action-btn btn-edit" data-id="${proj.id}" title="Edit Project">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
              </button>
              <button type="button" class="admin-action-btn btn-duplicate" data-id="${proj.id}" title="Duplicate Project">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
              </button>
              <button type="button" class="admin-action-btn btn-danger btn-delete" data-id="${proj.id}" title="Delete Project">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    // Attach row events
    tbody.querySelectorAll('.btn-edit').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const proj = projects.find(p => p.id === id);
        if (proj) openModal(true, proj);
      });
    });

    tbody.querySelectorAll('.btn-duplicate').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        const proj = projects.find(p => p.id === id);
        if (!proj) return;
        const copy = JSON.parse(JSON.stringify(proj));
        copy.id = `proj-${Date.now()}`;
        copy.title = `${copy.title} (Copy)`;
        copy.slug = `${copy.slug}-copy-${Date.now().toString().slice(-4)}`;
        copy.featured = false;
        try {
          await AdminCore.apiFetch('/api/admin/projects', {
            method: 'POST',
            body: JSON.stringify(copy)
          });
          AdminCore.showToast(`Duplicated "${proj.title}"`, 'success');
          await loadProjects();
        } catch (err) {
          AdminCore.showToast(`Duplication failed: ${err.message}`, 'error');
        }
      });
    });

    tbody.querySelectorAll('.btn-delete').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const proj = projects.find(p => p.id === id);
        if (!proj) return;

        AdminCore.confirmDestructive({
          title: `Delete Project "${proj.title}"?`,
          message: `This action will permanently delete "${proj.title}" and its case study data from the portfolio. This cannot be undone.`,
          confirmText: 'Permanently Delete',
          onConfirm: async () => {
            try {
              await AdminCore.apiFetch(`/api/admin/projects/${id}`, { method: 'DELETE' });
              AdminCore.showToast(`Deleted "${proj.title}"`, 'success');
              await loadProjects();
            } catch (err) {
              AdminCore.showToast(`Deletion failed: ${err.message}`, 'error');
            }
          }
        });
      });
    });

    tbody.querySelectorAll('.btn-reorder-up').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        const idx = projects.findIndex(p => p.id === id);
        if (idx > 0) {
          const temp = projects[idx - 1];
          projects[idx - 1] = projects[idx];
          projects[idx] = temp;
          await saveReorder();
        }
      });
    });

    tbody.querySelectorAll('.btn-reorder-down').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        const idx = projects.findIndex(p => p.id === id);
        if (idx < projects.length - 1) {
          const temp = projects[idx + 1];
          projects[idx + 1] = projects[idx];
          projects[idx] = temp;
          await saveReorder();
        }
      });
    });
  }

  async function saveReorder() {
    try {
      const ids = projects.map(p => p.id);
      await AdminCore.apiFetch('/api/admin/projects/reorder', {
        method: 'POST',
        body: JSON.stringify({ projectIds: ids })
      });
      renderProjects();
      AdminCore.showToast('Projects display order updated.', 'success');
    } catch (err) {
      AdminCore.showToast('Failed to save display order.', 'error');
    }
  }

  // Search input handler
  if (searchInput) {
    searchInput.addEventListener('input', () => renderProjects());
  }

  // Modal controls
  const createBtn = document.getElementById('btn-create-project');
  if (createBtn) createBtn.addEventListener('click', () => openModal(false));

  const closeBtn = document.getElementById('btn-close-project-modal');
  if (closeBtn) closeBtn.addEventListener('click', closeModal);

  const cancelBtn = document.getElementById('btn-cancel-project-modal');
  if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

  // Form Submit
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const title = (pTitle.value || '').trim();
      if (!title) {
        AdminCore.showToast('Project title is required.', 'error');
        return;
      }

      const id = pId.value;
      const isEdit = Boolean(id);

      const technologies = (pTech.value || '')
        .split(',')
        .map(t => t.trim())
        .filter(Boolean);

      const payload = {
        title: title,
        category: pCategory.value,
        tagline: (pTagline.value || '').trim(),
        shortDescription: (pShortDesc.value || '').trim(),
        impact: (pImpact.value || '').trim(),
        githubUrl: (pGithub.value || '').trim(),
        liveUrl: (pLive.value || '').trim(),
        demoUrl: (pLive.value || '').trim(),
        technologies: technologies,
        status: (pStatus.value || 'Production Verified').trim(),
        featured: pFeatured.checked,
        problem: (pProblem.value || '').trim(),
        solution: (pSolution.value || '').trim()
      };

      try {
        if (isEdit) {
          await AdminCore.apiFetch(`/api/admin/projects/${id}`, {
            method: 'PUT',
            body: JSON.stringify(payload)
          });
          AdminCore.showToast(`Updated "${title}"`, 'success');
        } else {
          await AdminCore.apiFetch('/api/admin/projects', {
            method: 'POST',
            body: JSON.stringify(payload)
          });
          AdminCore.showToast(`Created project "${title}"`, 'success');
        }

        closeModal();
        await loadProjects();
      } catch (err) {
        console.error('[Projects] Save failed:', err);
        AdminCore.showToast(`Save failed: ${err.message}`, 'error');
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadProjects);
  } else {
    loadProjects();
  }
})();
