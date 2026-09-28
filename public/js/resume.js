/**
 * RESUME PAGE CONTROLLER
 * Route: /resume
 * Dynamically renders ATS-optimized paper preview, download controls,
 * print-friendly trigger, and metadata from PORTFOLIO_DATA.
 * Public view only: zero edit/delete/administrative controls exposed.
 */

(function () {
  'use strict';

  function initResumePage() {
    if (typeof PORTFOLIO_DATA === 'undefined') {
      console.error('PORTFOLIO_DATA not found.');
      return;
    }

    const resumeData = PORTFOLIO_DATA.resume || {};
    const profile = PORTFOLIO_DATA.profile || {};
    const experience = PORTFOLIO_DATA.experience || [];
    const projects = PORTFOLIO_DATA.projects || [];
    const skills = PORTFOLIO_DATA.skills || { items: [] };
    const achievements = PORTFOLIO_DATA.achievements || [];

    // 1. Hydrate Metadata Bar
    const fileNameEl = document.getElementById('resume-filename');
    if (fileNameEl && resumeData.fileName) fileNameEl.textContent = resumeData.fileName;

    const versionEl = document.getElementById('resume-version');
    if (versionEl && resumeData.version) versionEl.textContent = resumeData.version;

    const updatedEl = document.getElementById('resume-updated');
    if (updatedEl && resumeData.lastUpdated) updatedEl.textContent = resumeData.lastUpdated;

    const sizeEl = document.getElementById('resume-filesize');
    if (sizeEl && resumeData.fileSize) sizeEl.textContent = resumeData.fileSize;

    // 2. Hydrate Experience Section
    const expContainer = document.getElementById('resume-experience-list');
    if (expContainer) {
      expContainer.innerHTML = experience.map(exp => `
        <article class="resume-paper-item">
          <div class="resume-paper-item-header">
            <span class="resume-paper-item-role">${exp.role}</span>
            <span class="resume-paper-item-date">${exp.startDate} – ${exp.endDate}</span>
          </div>
          <div class="resume-paper-item-subhead">
            <span>${exp.organization}</span>
            <span class="resume-paper-item-location">${exp.location}</span>
          </div>
          <ul class="resume-paper-bullets">
            ${exp.achievements ? exp.achievements.map(a => `<li>${a}</li>`).join('') : ''}
          </ul>
        </article>
      `).join('');
    }

    // 3. Hydrate Featured Engineering Projects
    const projContainer = document.getElementById('resume-projects-list');
    if (projContainer) {
      // Pick top 3 featured projects
      const featuredProjects = projects.filter(p => p.featured).slice(0, 3);
      projContainer.innerHTML = featuredProjects.map(proj => `
        <article class="resume-paper-item">
          <div class="resume-paper-item-header">
            <span class="resume-paper-item-role">${proj.title} — ${proj.tagline || proj.shortDescription}</span>
            <span class="resume-paper-item-date">${proj.metadata ? proj.metadata.timeline : ''}</span>
          </div>
          <div class="resume-paper-item-subhead">
            <span>Core Stack: ${proj.technologies ? proj.technologies.slice(0, 6).join(', ') : ''}</span>
            <span class="resume-paper-item-location">${proj.status || 'Production'}</span>
          </div>
          <ul class="resume-paper-bullets">
            <li>${proj.problem}</li>
            <li>${proj.solution}</li>
            <li><strong>Impact:</strong> ${proj.impact}</li>
          </ul>
        </article>
      `).join('');
    }

    // 4. Hydrate Technical Skills Grouping
    const skillsContainer = document.getElementById('resume-skills-group');
    if (skillsContainer && skills.items) {
      const grouped = {};
      skills.items.forEach(item => {
        if (!grouped[item.category]) grouped[item.category] = [];
        grouped[item.category].push(item.name);
      });

      const displayOrder = [
        'Programming Languages',
        'Backend',
        'Databases',
        'Cloud / DevOps',
        'Frontend',
        'Tools'
      ];

      skillsContainer.innerHTML = displayOrder.map(cat => {
        const list = grouped[cat] || [];
        if (list.length === 0) return '';
        return `
          <div class="resume-skill-line">
            <span class="resume-skill-label">${cat}:</span>
            <span class="resume-skill-value">${list.join(', ')}</span>
          </div>
        `;
      }).join('');
    }

    // 5. Print Button Handler
    const printBtn = document.getElementById('btn-print-resume');
    if (printBtn) {
      printBtn.addEventListener('click', (e) => {
        e.preventDefault();
        window.print();
      });
    }

    // 6. Download Button Handler
    const downloadBtn = document.getElementById('btn-download-resume');
    if (downloadBtn) {
      downloadBtn.addEventListener('click', (e) => {
        // Trigger download of standard PDF or fallback
        const link = document.createElement('a');
        link.href = resumeData.pdfUrl || 'assets/Alex_Rivera_Software_Engineer_Resume.pdf';
        link.download = resumeData.fileName || 'Alex_Rivera_Software_Engineer_Resume.pdf';
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        link.remove();
      });
    }
  }

  // Initialize once DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initResumePage);
  } else {
    initResumePage();
  }
})();
