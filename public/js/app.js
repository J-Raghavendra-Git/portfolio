/**
 * APP BOOTSTRAP & DYNAMIC RENDERER
 * Coordinates data integration, case study modal binding, and resume preview
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Setup Case Study Modal Trigger Handlers
  const caseStudyButtons = document.querySelectorAll('[data-case-study]');
  const caseStudyDialog = document.getElementById('case-study-dialog');

  caseStudyButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const projectId = btn.getAttribute('data-case-study');
      const project = PORTFOLIO_DATA.projects.find(p => p.id === projectId);

      if (project && caseStudyDialog) {
        populateCaseStudyModal(project);
        ModalController.open('case-study-dialog', btn);
      }
    });
  });

  function populateCaseStudyModal(project) {
    const titleEl = document.getElementById('case-study-title');
    const taglineEl = document.getElementById('case-study-tagline');
    const problemEl = document.getElementById('case-study-problem');
    const archEl = document.getElementById('case-study-arch');
    const challengesEl = document.getElementById('case-study-challenges');
    const tradeoffsEl = document.getElementById('case-study-tradeoffs');
    const resultsEl = document.getElementById('case-study-results');
    const metricsGrid = document.getElementById('case-study-metrics');
    const techStackWrap = document.getElementById('case-study-tech');
    const githubBtn = document.getElementById('case-study-github');
    const demoBtn = document.getElementById('case-study-demo');

    if (titleEl) titleEl.textContent = `${project.name} — Technical Case Study`;
    if (taglineEl) taglineEl.textContent = project.tagline;
    if (problemEl) problemEl.textContent = project.problem;

    if (archEl && project.caseStudy) archEl.textContent = project.caseStudy.architecture;
    if (challengesEl && project.caseStudy) challengesEl.textContent = project.caseStudy.technicalChallenges;
    if (tradeoffsEl && project.caseStudy) tradeoffsEl.textContent = project.caseStudy.tradeoffs;
    if (resultsEl && project.caseStudy) resultsEl.textContent = project.caseStudy.results;

    // Metrics
    if (metricsGrid && project.metrics) {
      metricsGrid.innerHTML = project.metrics.map(m => `
        <div class="case-study-meta-item">
          <span class="metric-label">${m.label}</span>
          <span class="metric-value">${m.value}</span>
        </div>
      `).join('');
    }

    // Tech Stack Chips
    if (techStackWrap && project.techStack) {
      techStackWrap.innerHTML = project.techStack.map(tech => `
        <span class="badge-tag highlight">${tech}</span>
      `).join('');
    }

    // Links
    if (githubBtn) githubBtn.href = project.githubUrl;
    if (demoBtn) demoBtn.href = project.liveDemoUrl;
  }

  // 2. Setup Resume Preview Modal Trigger Handlers
  const resumeModalTriggers = document.querySelectorAll('[data-open-resume]');
  resumeModalTriggers.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      ModalController.open('resume-dialog', btn);
    });
  });

  // 3. Print Resume button inside modal
  const printResumeBtn = document.getElementById('print-resume-btn');
  if (printResumeBtn) {
    printResumeBtn.addEventListener('click', () => {
      window.print();
    });
  }

  // 4. Interactive Terminal Preview tab click simulation (for project 3)
  const terminalTabs = document.querySelectorAll('.terminal-tab');
  if (terminalTabs.length) {
    terminalTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        terminalTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
      });
    });
  }

  // Console Easter Egg for Recruiters & Engineering Managers
  console.log(
    "%c⚡ Welcome to J Raghavendra's Portfolio ⚡\n%cLooking under the hood? I appreciate engineers who inspect source code.\nStack: Vanilla HTML5, Modern CSS (Design Tokens, light-dark, grid), Clean Modular JS.\nReach out directly at: raghavendraraghu71537@gmail.com",
    "font-size: 14px; font-weight: bold; color: #38bdf8;",
    "font-size: 12px; color: #94a3b8;"
  );
});
