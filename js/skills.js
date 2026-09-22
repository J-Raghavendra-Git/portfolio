/**
 * SKILLS & TECHNOLOGIES CONTROLLER
 * Route: /skills
 * Dynamically renders grouped technical capabilities across 8 categories.
 * No arbitrary percentage bars: clean chips, levels, project counts & official docs links.
 * Public view only: zero edit/delete/administrative controls exposed.
 */

(function () {
  'use strict';

  function initSkillsPage() {
    if (typeof PORTFOLIO_DATA === 'undefined' || !PORTFOLIO_DATA.skills) {
      console.error('PORTFOLIO_DATA.skills not found.');
      return;
    }

    const skillsData = PORTFOLIO_DATA.skills;
    const allItems = skillsData.items || [];
    const filterContainer = document.getElementById('skills-filter-bar');
    const searchInput = document.getElementById('skills-search-input');
    const categoriesContainer = document.getElementById('skills-categories-container');
    const emptyState = document.getElementById('skills-empty-state');

    if (!categoriesContainer) return;

    // Defined 8 Technical Categories
    const categoryDefinitions = [
      { id: 'all', label: 'All Skills', icon: 'M4 6h16M4 12h16M4 18h16' },
      { id: 'Programming Languages', label: 'Programming Languages', icon: 'M16 18l6-6-6-6M8 6l-6 6 6 6' },
      { id: 'Frontend', label: 'Frontend', icon: 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5' },
      { id: 'Backend', label: 'Backend', icon: 'M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z M4 9h16' },
      { id: 'Databases', label: 'Databases', icon: 'M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5 M3 12c0 1.66 4 3 9 3s9-1.34 9-3' },
      { id: 'AI / Machine Learning', label: 'AI / Machine Learning', icon: 'M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm1 14.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm-1-4a1 1 0 0 1-1-1V7a1 1 0 0 1 2 0v4.5a1 1 0 0 1-1 1z' },
      { id: 'Cloud / DevOps', label: 'Cloud / DevOps', icon: 'M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z' },
      { id: 'Tools', label: 'Tools', icon: 'M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z' },
      { id: 'Other', label: 'Other Technical Skills', icon: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z' }
    ];

    let currentCategory = 'all';
    let searchQuery = '';

    // Render Filter Tabs
    if (filterContainer) {
      filterContainer.innerHTML = '';
      categoryDefinitions.forEach(cat => {
        const count = cat.id === 'all'
          ? allItems.length
          : allItems.filter(i => i.category.toLowerCase() === cat.id.toLowerCase()).length;

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `skills-filter-tab ${cat.id === currentCategory ? 'active' : ''}`;
        btn.setAttribute('role', 'tab');
        btn.setAttribute('aria-selected', cat.id === currentCategory ? 'true' : 'false');
        btn.innerHTML = `
          <span>${cat.label}</span>
          <span class="skills-filter-count">${count}</span>
        `;
        btn.addEventListener('click', () => {
          if (currentCategory === cat.id) return;
          currentCategory = cat.id;

          filterContainer.querySelectorAll('.skills-filter-tab').forEach(b => {
            b.classList.remove('active');
            b.setAttribute('aria-selected', 'false');
          });
          btn.classList.add('active');
          btn.setAttribute('aria-selected', 'true');

          renderSkills();
        });
        filterContainer.appendChild(btn);
      });
    }

    // Search Input Listener
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.trim().toLowerCase();
        renderSkills();
      });
    }

    // Render Grouped Categories
    function renderSkills() {
      // 1. Filter items
      let filtered = allItems;

      if (currentCategory !== 'all') {
        filtered = filtered.filter(i => i.category.toLowerCase() === currentCategory.toLowerCase());
      }

      if (searchQuery) {
        filtered = filtered.filter(i =>
          i.name.toLowerCase().includes(searchQuery) ||
          i.category.toLowerCase().includes(searchQuery) ||
          (i.level && i.level.toLowerCase().includes(searchQuery))
        );
      }

      if (filtered.length === 0) {
        categoriesContainer.innerHTML = '';
        if (emptyState) emptyState.classList.add('visible');
        return;
      }

      if (emptyState) emptyState.classList.remove('visible');

      // Group filtered items by category
      const targetCategories = currentCategory === 'all'
        ? categoryDefinitions.slice(1) // all 8 categories
        : categoryDefinitions.filter(c => c.id.toLowerCase() === currentCategory.toLowerCase());

      const groupsHtml = targetCategories.map(cat => {
        const catItems = filtered.filter(i => i.category.toLowerCase() === cat.id.toLowerCase());
        if (catItems.length === 0) return '';

        const chipsHtml = catItems.map(item => {
          const levelClass = (item.level || 'core').toLowerCase();
          const dotHtml = `<span class="tech-indicator-dot ${levelClass}" title="Proficiency: ${item.level || 'Core'}"></span>`;
          
          const projectsTag = item.projectsCount
            ? `<span class="tech-projects-tag">${item.projectsCount} project${item.projectsCount > 1 ? 's' : ''}</span>`
            : '';

          const externalIcon = item.officialUrl
            ? `<svg class="tech-external-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="7" y1="17" x2="17" y2="7"></line><polyline points="7 7 17 7 17 17"></polyline></svg>`
            : '';

          const tagElement = item.officialUrl ? 'a' : 'div';
          const linkAttrs = item.officialUrl
            ? `href="${item.officialUrl}" target="_blank" rel="noopener noreferrer" title="View official ${item.name} documentation"`
            : '';

          return `
            <${tagElement} class="tech-item-card" ${linkAttrs}>
              <div class="tech-item-left">
                ${dotHtml}
                <div class="tech-name-col">
                  <span class="tech-name">
                    ${item.name}
                    ${item.featured ? '<span style="color:var(--accent-amber); font-size:10px;" title="Core Production Focus">★</span>' : ''}
                  </span>
                  <div class="tech-meta-row">
                    <span class="tech-level-tag">${item.level || 'Core'}</span>
                    ${projectsTag ? '<span>•</span>' : ''}
                    ${projectsTag}
                  </div>
                </div>
              </div>
              ${externalIcon}
            </${tagElement}>
          `;
        }).join('');

        return `
          <section class="skill-category-group" data-category="${cat.id}">
            <div class="skill-cat-header">
              <div class="skill-cat-title-wrap">
                <svg class="skill-cat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="${cat.icon}"></path>
                </svg>
                <h2 class="skill-cat-title">${cat.label}</h2>
              </div>
              <span class="skill-cat-badge">${catItems.length} technologie${catItems.length > 1 ? 's' : ''}</span>
            </div>

            <div class="skill-items-grid">
              ${chipsHtml}
            </div>
          </section>
        `;
      }).filter(Boolean).join('');

      categoriesContainer.innerHTML = groupsHtml;
    }

    renderSkills();
  }

  // Initialize once DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSkillsPage);
  } else {
    initSkillsPage();
  }
})();
