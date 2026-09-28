/**
 * FILTER CONTROLLER
 * Manages category filtering for the technical skills matrix and optional project filtering
 */

const FilterController = (function () {
  function initSkillsFilter() {
    const filterButtons = document.querySelectorAll('.skills-filter-nav .filter-btn');
    const skillCards = document.querySelectorAll('.skill-category-card');

    if (!filterButtons.length || !skillCards.length) return;

    filterButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        // Toggle active button state
        filterButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const selectedGroup = btn.getAttribute('data-filter');

        skillCards.forEach(card => {
          const cardGroup = card.getAttribute('data-group');
          if (selectedGroup === 'all' || cardGroup === selectedGroup) {
            card.style.display = 'flex';
            // Trigger quick subtle fade-in
            card.style.opacity = '0';
            requestAnimationFrame(() => {
              card.style.transition = 'opacity 200ms ease';
              card.style.opacity = '1';
            });
          } else {
            card.style.display = 'none';
          }
        });
      });
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    initSkillsFilter();
  });

  return {
    initSkillsFilter
  };
})();
