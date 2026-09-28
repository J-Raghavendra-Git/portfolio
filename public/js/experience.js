/**
 * EXPERIENCE PAGE CONTROLLER
 * Route: /experience
 * Dynamically loads and filters work history from PORTFOLIO_DATA.experience.
 * Public view only: zero edit/delete/administrative controls exposed.
 */

(function () {
  'use strict';

  function initExperiencePage() {
    if (typeof PORTFOLIO_DATA === 'undefined' || !PORTFOLIO_DATA.experience) {
      console.error('PORTFOLIO_DATA.experience not found.');
      return;
    }

    const experiences = PORTFOLIO_DATA.experience;
    const filterContainer = document.getElementById('experience-filter-bar');
    const timelineContainer = document.getElementById('experience-timeline');
    const emptyState = document.getElementById('experience-empty-state');

    if (!timelineContainer) return;

    // Filter categories
    const categories = [
      { id: 'all', label: 'All Experience', filterFn: () => true },
      { id: 'internship', label: 'Industry Internships', filterFn: (item) => item.employmentType.toLowerCase() === 'internship' },
      { id: 'research', label: 'Research', filterFn: (item) => item.employmentType.toLowerCase() === 'research' }
    ];

    let currentFilter = 'all';

    // Render filter buttons
    if (filterContainer) {
      filterContainer.innerHTML = '';
      categories.forEach(cat => {
        const count = experiences.filter(cat.filterFn).length;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `exp-filter-tab ${cat.id === currentFilter ? 'active' : ''}`;
        btn.setAttribute('role', 'tab');
        btn.setAttribute('aria-selected', cat.id === currentFilter ? 'true' : 'false');
        btn.setAttribute('data-filter', cat.id);
        btn.innerHTML = `
          <span>${cat.label}</span>
          <span class="exp-filter-count">${count}</span>
        `;
        btn.addEventListener('click', () => {
          if (currentFilter === cat.id) return;
          currentFilter = cat.id;

          filterContainer.querySelectorAll('.exp-filter-tab').forEach(b => {
            b.classList.remove('active');
            b.setAttribute('aria-selected', 'false');
          });
          btn.classList.add('active');
          btn.setAttribute('aria-selected', 'true');

          renderTimeline();
        });
        filterContainer.appendChild(btn);
      });
    }

    // Generate Monogram from Organization Name
    function getMonogram(name) {
      if (!name) return 'EXP';
      const words = name.split(' ');
      if (words.length === 1) return words[0].substring(0, 2).toUpperCase();
      return (words[0][0] + (words[1] ? words[1][0] : '')).toUpperCase();
    }

    // Render Timeline Items
    function renderTimeline() {
      const activeCat = categories.find(c => c.id === currentFilter) || categories[0];
      const filtered = experiences.filter(activeCat.filterFn);

      if (filtered.length === 0) {
        timelineContainer.innerHTML = '';
        if (emptyState) emptyState.classList.add('visible');
        return;
      }

      if (emptyState) emptyState.classList.remove('visible');

      timelineContainer.innerHTML = filtered.map(item => {
        const monogram = getMonogram(item.organization);
        
        // Responsibilities list HTML
        const respHtml = (item.responsibilities && item.responsibilities.length > 0)
          ? `
            <div class="exp-responsibilities-container">
              <div class="exp-section-label">Core Responsibilities</div>
              <ul class="exp-responsibilities-list">
                ${item.responsibilities.map(r => `<li>${r}</li>`).join('')}
              </ul>
            </div>
          `
          : '';

        // Measurable Achievements HTML (prioritizing quantifiable data)
        const achHtml = (item.achievements && item.achievements.length > 0)
          ? `
            <div class="exp-achievements-container">
              <div class="exp-section-label">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                <span>Quantifiable Technical Wins & Impact</span>
              </div>
              <ul class="exp-achievements-list">
                ${item.achievements.map(a => `<li>${a}</li>`).join('')}
              </ul>
            </div>
          `
          : '';

        // Tech chips HTML
        const techHtml = (item.technologies && item.technologies.length > 0)
          ? `
            <div class="exp-tech-row">
              <span class="exp-tech-label">Stack:</span>
              ${item.technologies.map(t => `<span class="badge-tag">${t}</span>`).join('')}
            </div>
          `
          : '';

        // External Organization Link
        const orgLinkHtml = item.organizationUrl
          ? `
            <a href="${item.organizationUrl}" target="_blank" rel="noopener noreferrer" class="exp-org-name" title="Visit ${item.organization}">
              <span>${item.organization}</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="7" y1="17" x2="17" y2="7"></line><polyline points="7 7 17 7 17 17"></polyline></svg>
            </a>
          `
          : `<span class="exp-org-name">${item.organization}</span>`;

        return `
          <div class="exp-item" data-id="${item.id}">
            <div class="exp-node" aria-hidden="true">
              <div class="exp-node-inner"></div>
            </div>
            
            <article class="exp-card">
              <div class="exp-card-header">
                <div>
                  <div class="exp-org-block">
                    <div class="exp-logo-monogram" aria-hidden="true">${monogram}</div>
                    <div>
                      ${orgLinkHtml}
                      <h2 class="exp-role-title">${item.role}</h2>
                    </div>
                  </div>
                </div>

                <div class="exp-meta-badges">
                  <span class="exp-type-badge">${item.employmentType}</span>
                  <span class="exp-date-badge">${item.startDate} – ${item.endDate}</span>
                </div>
              </div>

              <div class="exp-location-tag">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                <span>${item.location}</span>
              </div>

              <p class="exp-desc">${item.description}</p>

              ${achHtml}
              ${respHtml}
              ${techHtml}

              ${item.organizationUrl ? `
                <div style="margin-top: var(--space-2);">
                  <a href="${item.organizationUrl}" target="_blank" rel="noopener noreferrer" class="exp-link-btn">
                    <span>Visit ${item.organization}</span>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                  </a>
                </div>
              ` : ''}
            </article>
          </div>
        `;
      }).join('');
    }

    renderTimeline();
  }

  // Initialize once DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initExperiencePage);
  } else {
    initExperiencePage();
  }
})();
