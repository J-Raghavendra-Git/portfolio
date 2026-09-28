/**
 * ACHIEVEMENTS & DISTINCTIONS CONTROLLER
 * Route: /achievements
 * Dynamically renders verified honors, awards, hackathons, and publications.
 * Public view only: zero edit/delete/administrative controls exposed.
 */

(function () {
  'use strict';

  function initAchievementsPage() {
    if (typeof PORTFOLIO_DATA === 'undefined' || !PORTFOLIO_DATA.achievements) {
      console.error('PORTFOLIO_DATA.achievements not found.');
      return;
    }

    const achievements = PORTFOLIO_DATA.achievements;
    const filterContainer = document.getElementById('achievements-filter-bar');
    const gridContainer = document.getElementById('achievements-grid');
    const emptyState = document.getElementById('achievements-empty-state');

    if (!gridContainer) return;

    // Defined Filter Categories
    const categories = [
      { id: 'all', label: 'All Distinctions', filterFn: () => true },
      { id: 'hackathons', label: 'Hackathons', filterFn: (item) => item.category.toLowerCase().includes('hackathon') },
      { id: 'competitive', label: 'Competitive Programming', filterFn: (item) => item.category.toLowerCase().includes('competitive') },
      { id: 'open-source', label: 'Open Source', filterFn: (item) => item.category.toLowerCase().includes('open-source') },
      { id: 'academic', label: 'Academic & Leadership', filterFn: (item) => item.category.toLowerCase().includes('academic') || item.category.toLowerCase().includes('leadership') },
      { id: 'certifications', label: 'Certifications', filterFn: (item) => item.category.toLowerCase().includes('certification') },
      { id: 'publications', label: 'Publications', filterFn: (item) => item.category.toLowerCase().includes('publication') }
    ];

    let currentFilter = 'all';

    // Get Category Icon / Emoji
    function getCategoryEmoji(cat) {
      const lower = (cat || '').toLowerCase();
      if (lower.includes('hackathon')) return '🏆';
      if (lower.includes('competitive')) return '⚡';
      if (lower.includes('open-source')) return '🌐';
      if (lower.includes('cert')) return '📜';
      if (lower.includes('publication')) return '📄';
      if (lower.includes('leadership')) return '👥';
      if (lower.includes('academic')) return '🎓';
      return '🎖️';
    }

    // Render Filter Tabs
    if (filterContainer) {
      filterContainer.innerHTML = '';
      categories.forEach(cat => {
        const count = achievements.filter(cat.filterFn).length;
        if (count === 0 && cat.id !== 'all') return;

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `ach-filter-tab ${cat.id === currentFilter ? 'active' : ''}`;
        btn.setAttribute('role', 'tab');
        btn.setAttribute('aria-selected', cat.id === currentFilter ? 'true' : 'false');
        btn.innerHTML = `
          <span>${cat.label}</span>
          <span class="ach-filter-count">${count}</span>
        `;
        btn.addEventListener('click', () => {
          if (currentFilter === cat.id) return;
          currentFilter = cat.id;

          filterContainer.querySelectorAll('.ach-filter-tab').forEach(b => {
            b.classList.remove('active');
            b.setAttribute('aria-selected', 'false');
          });
          btn.classList.add('active');
          btn.setAttribute('aria-selected', 'true');

          renderGrid();
        });
        filterContainer.appendChild(btn);
      });
    }

    // Render Grid Items
    function renderGrid() {
      const activeCat = categories.find(c => c.id === currentFilter) || categories[0];
      const filtered = achievements.filter(activeCat.filterFn);

      if (filtered.length === 0) {
        gridContainer.innerHTML = '';
        if (emptyState) emptyState.classList.add('visible');
        return;
      }

      if (emptyState) emptyState.classList.remove('visible');

      gridContainer.innerHTML = filtered.map(item => {
        const emoji = getCategoryEmoji(item.category);

        const verifyButton = item.credentialUrl
          ? `
            <a href="${item.credentialUrl}" target="_blank" rel="noopener noreferrer" class="ach-verify-link">
              <span>Verify Credential</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="7" y1="17" x2="17" y2="7"></line><polyline points="7 7 17 7 17 17"></polyline></svg>
            </a>
          `
          : `
            <span class="ach-verified-tag">
              <span class="ach-verified-dot"></span>
              <span>Institutionally Verified</span>
            </span>
          `;

        return `
          <article class="ach-card" data-category="${item.category}">
            <div>
              <div class="ach-card-top">
                <span class="ach-category-badge">
                  <span>${emoji}</span>
                  <span>${item.category}</span>
                </span>
                <span class="ach-date-badge">${item.date}</span>
              </div>

              <h2 class="ach-card-title">${item.title}</h2>
              <div class="ach-org-name">${item.organization}</div>
              <p class="ach-card-desc">${item.description}</p>
            </div>

            <div class="ach-card-bottom">
              ${verifyButton}
              ${item.featured ? '<span style="font-family:var(--font-mono); font-size:10px; color:var(--accent-amber); font-weight:700;">HIGHLIGHT</span>' : ''}
            </div>
          </article>
        `;
      }).join('');
    }

    renderGrid();
  }

  // Initialize once DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAchievementsPage);
  } else {
    initAchievementsPage();
  }
})();
