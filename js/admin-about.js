/**
 * ADMIN ABOUT CONTROLLER
 * Loads about story, 5-pillar philosophy, focus, career direction, and handles updates.
 */

(function () {
  'use strict';

  let aboutData = {};
  const form = document.getElementById('about-form');
  const introInput = document.getElementById('abt-intro');
  const chipsInput = document.getElementById('abt-chips');
  const storyInput = document.getElementById('abt-story');
  const focusInput = document.getElementById('abt-focus');
  const careerInput = document.getElementById('abt-career');
  const pillarsContainer = document.getElementById('philosophy-pillars-container');

  async function loadAbout() {
    try {
      aboutData = await AdminCore.apiFetch('/api/admin/about');

      if (introInput) introInput.value = aboutData.introduction?.summary || '';
      if (chipsInput) chipsInput.value = (aboutData.introduction?.areasOfInterest || []).join(', ');
      if (storyInput) storyInput.value = (aboutData.story || []).join('\n\n');
      if (focusInput) focusInput.value = aboutData.currentFocus || '';
      if (careerInput) careerInput.value = aboutData.careerDirection || '';

      renderPillars(aboutData.philosophy || []);
    } catch (err) {
      console.error('[About] Failed to load:', err);
      AdminCore.showToast('Failed to load about data', 'error');
    }
  }

  function renderPillars(pillars) {
    if (!pillarsContainer) return;

    pillarsContainer.innerHTML = pillars.map((pillar, idx) => `
      <div class="admin-card" style="padding: 1.25rem; margin-bottom: 1rem; background: var(--bg-surface-elevated);" data-index="${idx}">
        <div style="font-family: var(--font-mono); font-size: 11px; color: var(--accent-primary); font-weight: 700; margin-bottom: 8px;">
          // PILLAR 0${idx + 1}: ${pillar.topic || 'Engineering Pillar'}
        </div>
        <div class="admin-form-grid">
          <div class="admin-form-group">
            <label class="admin-form-label">Domain Topic</label>
            <input type="text" class="admin-form-input pillar-topic" value="${pillar.topic || ''}">
          </div>
          <div class="admin-form-group">
            <label class="admin-form-label">Core Principle Title</label>
            <input type="text" class="admin-form-input pillar-title" value="${pillar.title || ''}">
          </div>
          <div class="admin-form-group full-width">
            <label class="admin-form-label">Philosophical Approach Description</label>
            <textarea class="admin-form-textarea pillar-desc" style="min-height: 60px;">${pillar.desc || ''}</textarea>
          </div>
        </div>
      </div>
    `).join('');
  }

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const chips = (chipsInput.value || '')
        .split(',')
        .map(c => c.trim())
        .filter(Boolean);

      const storyParagraphs = (storyInput.value || '')
        .split(/\n{2,}/)
        .map(p => p.trim())
        .filter(Boolean);

      const updatedPillars = [];
      pillarsContainer.querySelectorAll('[data-index]').forEach(card => {
        const topic = card.querySelector('.pillar-topic')?.value || '';
        const title = card.querySelector('.pillar-title')?.value || '';
        const desc = card.querySelector('.pillar-desc')?.value || '';
        if (title) {
          updatedPillars.push({ topic, title, desc });
        }
      });

      const payload = {
        introduction: {
          title: aboutData.introduction?.title || 'Systems & Distributed Infrastructure Engineer',
          summary: (introInput.value || '').trim(),
          areasOfInterest: chips
        },
        story: storyParagraphs,
        currentFocus: (focusInput.value || '').trim(),
        careerDirection: (careerInput.value || '').trim(),
        philosophy: updatedPillars,
        quickFacts: aboutData.quickFacts || []
      };

      try {
        await AdminCore.apiFetch('/api/admin/about', {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
        AdminCore.showToast('About page successfully updated and published!', 'success');
        await loadAbout();
      } catch (err) {
        AdminCore.showToast(`Failed to update about page: ${err.message}`, 'error');
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadAbout);
  } else {
    loadAbout();
  }
})();
