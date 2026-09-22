/**
 * ABOUT PAGE CONTROLLER
 * Route: /about
 * Dynamically loads professional story, 5-pillar philosophy,
 * current focus, career direction, and quick facts from PORTFOLIO_DATA.
 * Public view only: zero edit/delete/administrative controls exposed.
 */

(function () {
  'use strict';

  function initAboutPage() {
    if (typeof PORTFOLIO_DATA === 'undefined' || !PORTFOLIO_DATA.about) {
      console.error('PORTFOLIO_DATA.about not found.');
      return;
    }

    const aboutData = PORTFOLIO_DATA.about;
    const profile = PORTFOLIO_DATA.profile || {};

    // 1. Hydrate Areas of Interest Chips
    const chipsContainer = document.getElementById('about-interest-chips');
    if (chipsContainer && aboutData.introduction && aboutData.introduction.areasOfInterest) {
      chipsContainer.innerHTML = aboutData.introduction.areasOfInterest.map(item => `
        <span class="interest-chip">
          <span style="color:var(--accent-primary);">#</span>
          <span>${item}</span>
        </span>
      `).join('');
    }

    // 2. Hydrate Story Article
    const storyContainer = document.getElementById('about-story-paragraphs');
    if (storyContainer && aboutData.story) {
      storyContainer.innerHTML = aboutData.story.map(p => `<p>${p}</p>`).join('');
    }

    // 3. Hydrate Quick Facts
    const quickFactsContainer = document.getElementById('about-quickfacts-list');
    if (quickFactsContainer && aboutData.quickFacts) {
      quickFactsContainer.innerHTML = aboutData.quickFacts.map(fact => `
        <div class="quickfact-item">
          <span class="quickfact-label">${fact.label}</span>
          <span class="quickfact-value">${fact.value}</span>
        </div>
      `).join('');
    }

    // 4. Hydrate 5 Philosophy Pillars
    const philosophyContainer = document.getElementById('about-philosophy-grid');
    if (philosophyContainer && aboutData.philosophy) {
      philosophyContainer.innerHTML = aboutData.philosophy.map((item, idx) => `
        <article class="philosophy-card-item">
          <span class="philosophy-topic-badge">${item.topic || `Pillar 0${idx + 1}`}</span>
          <h3 class="philosophy-card-title">${item.title}</h3>
          <p class="philosophy-card-desc">${item.desc}</p>
        </article>
      `).join('');
    }

    // 5. Hydrate Current Focus
    const focusContainer = document.getElementById('about-current-focus-text');
    if (focusContainer && aboutData.currentFocus) {
      focusContainer.textContent = aboutData.currentFocus;
    }

    // 6. Hydrate Career Direction
    const careerContainer = document.getElementById('about-career-direction-text');
    if (careerContainer && aboutData.careerDirection) {
      careerContainer.textContent = aboutData.careerDirection;
    }
  }

  // Initialize once DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAboutPage);
  } else {
    initAboutPage();
  }
})();
