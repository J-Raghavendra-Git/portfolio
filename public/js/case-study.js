/**
 * CASE STUDY DYNAMIC HYDRATION & INTERACTIVE CONTROLLER
 * Dynamically maps project data from PORTFOLIO_DATA.projects based on URL slug (?project=[slug]).
 * Handles multi-view hero showcase tabs and gallery inspection modal.
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Resolve active project from URL parameter or clean pathname (/projects/[slug])
  const urlParams = new URLSearchParams(window.location.search);
  const pathMatch = window.location.pathname.match(/\/projects\/([a-zA-Z0-9_-]+)/);
  const pathSlug = (pathMatch && pathMatch[1] !== 'index') ? pathMatch[1] : null;
  const requestedSlug = urlParams.get('project') || urlParams.get('slug') || pathSlug || 'traceflow';

  const projects = (window.PORTFOLIO_DATA && window.PORTFOLIO_DATA.projects) || [];
  let project = projects.find(p => p.slug === requestedSlug || p.id === requestedSlug);

  if (!project && projects.length > 0) {
    project = projects[0];
    if (requestedSlug && requestedSlug !== 'traceflow') {
      setTimeout(() => {
        if (window.FormController && window.FormController.showToast) {
          window.FormController.showToast(`Case study "${requestedSlug}" not found. Displaying featured project: ${project.title}`, 'info');
        }
      }, 600);
    }
  }

  if (project) {
    hydrateCaseStudy(project);
  }

  // 2. Multi-view tabs switcher
  initShowcaseTabs();

  // 3. Product Gallery modal inspector
  initGalleryModal();
});

/**
 * Hydrates all 14 case study sections dynamically from the project data model
 */
function hydrateCaseStudy(project) {
  // Document Title & Meta
  document.title = `${project.title} Technical Case Study | J Raghavendra`;

  // Header Elements
  const headerCat = document.querySelector('.cs-badges-row .badge-tag');
  if (headerCat) headerCat.textContent = (project.category || 'SYSTEMS').toUpperCase();

  const headerStatus = document.querySelector('.status-badge span:last-child');
  if (headerStatus && project.status) headerStatus.textContent = project.status;

  const headerTitle = document.querySelector('.cs-title');
  if (headerTitle) headerTitle.textContent = project.title;

  const headerTagline = document.querySelector('.cs-tagline');
  if (headerTagline) headerTagline.textContent = project.shortDescription || project.description;

  // Metadata Row
  const metaValues = document.querySelectorAll('.cs-metadata-grid .cs-meta-value');
  if (metaValues.length >= 4 && project.metadata) {
    metaValues[0].textContent = project.metadata.role || 'Software Engineer';
    metaValues[1].textContent = project.metadata.timeline || '3 Months';
    metaValues[2].textContent = project.metadata.teamSize || '1–2 Engineers';
    metaValues[3].textContent = project.metadata.coreTech || (project.technologies || []).slice(0, 4).join(', ');
  }

  // Header Links
  const headerActions = document.querySelector('.cs-header-actions');
  if (headerActions) {
    const githubLink = headerActions.querySelector('a[href*="github"]');
    if (githubLink && project.githubUrl) githubLink.href = project.githubUrl;

    const liveDemoLink = headerActions.querySelectorAll('a')[1];
    if (liveDemoLink) {
      if (project.liveUrl) {
        liveDemoLink.href = project.liveUrl;
        liveDemoLink.style.display = 'inline-flex';
      } else {
        liveDemoLink.style.display = 'none';
      }
    }
  }

  // The Problem & The Solution
  const proseDiv = document.querySelector('.cs-editorial-split .cs-prose');
  if (proseDiv) {
    const problemP = proseDiv.querySelector('p');
    if (problemP && project.problem) problemP.textContent = project.problem;

    const solutionPs = proseDiv.querySelectorAll('p');
    if (solutionPs.length >= 3 && project.solution) {
      solutionPs[solutionPs.length - 1].textContent = project.solution;
    }
  }

  // Problem -> Solution -> Outcome Flow Diagram
  const flowItems = document.querySelectorAll('.flow-diagram .flow-step-item');
  if (flowItems.length >= 3) {
    if (project.problem) {
      const pDesc = flowItems[0].querySelector('div div:last-child');
      if (pDesc) pDesc.textContent = project.problem;
    }
    if (project.solution) {
      const sDesc = flowItems[1].querySelector('div div:last-child');
      if (sDesc) sDesc.textContent = project.solution;
    }
    if (project.impact) {
      const oDesc = flowItems[2].querySelector('div div:last-child');
      if (oDesc) oDesc.textContent = project.impact;
    }
  }

  // Key Features
  if (project.features && project.features.length) {
    const featuresGrid = document.querySelector('.cs-features-grid');
    if (featuresGrid) {
      featuresGrid.innerHTML = project.features.map(f => `
        <div class="cs-feature-card">
          <div class="cs-feature-icon-box">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>
          </div>
          <h3 class="cs-feature-title">${f.title}</h3>
          <p class="cs-feature-desc">${f.desc}</p>
        </div>
      `).join('');
    }
  }

  // System Architecture Pipeline
  if (project.architecture && project.architecture.nodes) {
    const archContainer = document.querySelector('.architecture-pipeline');
    if (archContainer) {
      archContainer.innerHTML = project.architecture.nodes.map((node, index, arr) => `
        <div class="arch-node">
          <div class="arch-node-left">
            <div class="arch-node-icon">${node.step}</div>
            <div class="arch-node-title">${node.title}</div>
          </div>
          <div class="arch-node-desc">${node.desc}</div>
        </div>
        ${index < arr.length - 1 ? '<div class="arch-arrow">↓ Direct Data Pipeline Flow</div>' : ''}
      `).join('');
    }
  }

  // Engineering Decisions
  if (project.engineeringDecisions && project.engineeringDecisions.length) {
    const decisionsGrid = document.querySelector('.decisions-grid');
    if (decisionsGrid) {
      decisionsGrid.innerHTML = project.engineeringDecisions.map(d => `
        <div class="decision-card">
          <div class="decision-header">
            <span class="badge-tag highlight" style="margin-bottom: 6px;">${d.domain}</span>
            <h3 class="decision-title">${d.decision}</h3>
          </div>
          <div class="decision-field">
            <span class="decision-field-label">Why I Chose It:</span>
            <p class="decision-field-val">${d.why}</p>
          </div>
          <div class="decision-field">
            <span class="decision-field-label">Alternative Considered:</span>
            <p class="decision-field-val">${d.alternative}</p>
          </div>
          <div class="decision-field">
            <span class="decision-field-label">Trade-Off Incurred:</span>
            <p class="decision-field-val">${d.tradeoff}</p>
          </div>
        </div>
      `).join('');
    }
  }

  // Personal Contribution
  if (project.contribution && project.contribution.length) {
    const contribList = document.querySelector('.contribution-list');
    if (contribList) {
      contribList.innerHTML = project.contribution.map(c => `
        <div class="contribution-item">
          <span class="contribution-bullet">▹</span>
          <div class="contribution-text">${c}</div>
        </div>
      `).join('');
    }
  }

  // Measurable Results
  if (project.results && project.results.length) {
    const resultsStrip = document.querySelector('.cs-results-strip');
    if (resultsStrip) {
      resultsStrip.innerHTML = project.results.map(r => `
        <div class="cs-result-box">
          <span class="cs-result-num">${r.num}</span>
          <span class="cs-result-title">${r.title}</span>
          <span class="cs-result-desc">${r.desc}</span>
        </div>
      `).join('');
    }
  }

  // Technical Challenges
  if (project.challenges && project.challenges.length) {
    const challengesStack = document.querySelector('.challenges-stack');
    if (challengesStack) {
      challengesStack.innerHTML = project.challenges.map((c, i) => `
        <div class="challenge-box">
          <div class="challenge-left">
            <span class="challenge-left-num">// CHALLENGE 0${i + 1}</span>
            <h3 class="challenge-left-title">${c.title}</h3>
          </div>
          <div class="challenge-right-grid">
            <div class="challenge-step">
              <span class="challenge-step-title">Challenge:</span>
              <p class="challenge-step-content">${c.challenge}</p>
            </div>
            <div class="challenge-step">
              <span class="challenge-step-title">Approach:</span>
              <p class="challenge-step-content">${c.approach}</p>
            </div>
            <div class="challenge-step">
              <span class="challenge-step-title">Result:</span>
              <p class="challenge-step-content">${c.result}</p>
            </div>
            <div class="challenge-step">
              <span class="challenge-step-title">What I Learned:</span>
              <p class="challenge-step-content">${c.learnings}</p>
            </div>
          </div>
        </div>
      `).join('');
    }
  }

  // Retrospective Learnings
  if (project.learnings) {
    const learningTexts = document.querySelectorAll('.learnings-grid .learning-item-text');
    if (learningTexts.length >= 2) {
      if (project.learnings.technical) learningTexts[0].textContent = project.learnings.technical;
      if (project.learnings.product) learningTexts[1].textContent = project.learnings.product;
    }
  }

  // Footer Links
  const footerCard = document.querySelector('.cs-next-steps-card');
  if (footerCard) {
    const githubBtn = footerCard.querySelector('a[href*="github"]');
    if (githubBtn && project.githubUrl) githubBtn.href = project.githubUrl;

    const liveBtn = footerCard.querySelectorAll('a')[1];
    if (liveBtn) {
      if (project.liveUrl) {
        liveBtn.href = project.liveUrl;
        liveBtn.style.display = 'inline-flex';
      } else {
        liveBtn.style.display = 'none';
      }
    }
  }

  // Customize Hero Showcase Pane per Project
  customizeShowcaseVisual(project);
}

/**
 * Renders technical visualization appropriate to the project in the Hero Showcase
 */
function customizeShowcaseVisual(project) {
  const pane1 = document.getElementById('view-waterfall');
  const tab1 = document.querySelector('.cs-showcase-tab[data-view="view-waterfall"]');

  if (!pane1 || !tab1) return;

  if (project.slug === 'aurakv') {
    tab1.querySelector('span').textContent = 'Raft Consensus State Machine';
    pane1.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255, 255, 255, 0.1); padding-bottom: 12px; margin-bottom: 16px; font-family: var(--font-mono); font-size: 12px;">
        <div>
          <span style="color: var(--accent-primary); font-weight: 700;">CLUSTER STATUS:</span>
          <span style="color: #f8fafc;"> Leader: Node-01 (Term 42)</span>
        </div>
        <div style="display: flex; gap: 16px;">
          <span style="color: #94a3b8;">Active Quorum: <strong>3/5 Nodes</strong></span>
          <span style="color: var(--accent-emerald);">Commit Index: <strong>1,849,204</strong></span>
          <span style="color: #38bdf8;">P99 Replication: <strong>3.8ms</strong></span>
        </div>
      </div>
      <div style="display: flex; flex-direction: column; gap: 10px; font-family: var(--font-mono); font-size: 11px;">
        <div style="background: rgba(255, 255, 255, 0.04); padding: 12px; border-radius: 6px; border: 1px solid rgba(255, 255, 255, 0.08);">
          <span style="color: var(--accent-primary); font-weight: 700;">[Node-01 Leader]</span> Proposal Broadcast ➔ Log Index #1849204 ➔ WAL mmap write
        </div>
        <div style="background: rgba(255, 255, 255, 0.04); padding: 12px; border-radius: 6px; border: 1px solid rgba(255, 255, 255, 0.08); margin-left: 20px;">
          <span style="color: var(--accent-emerald); font-weight: 700;">[Node-02 Follower]</span> AppendEntries ACK received in 1.4ms
        </div>
        <div style="background: rgba(255, 255, 255, 0.04); padding: 12px; border-radius: 6px; border: 1px solid rgba(255, 255, 255, 0.08); margin-left: 20px;">
          <span style="color: var(--accent-emerald); font-weight: 700;">[Node-03 Follower]</span> AppendEntries ACK received in 1.9ms (Quorum Achieved)
        </div>
      </div>
    `;
  } else if (project.slug === 'hyperproxy') {
    tab1.querySelector('span').textContent = 'eBPF Ingress Tail Latency';
    pane1.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255, 255, 255, 0.1); padding-bottom: 12px; margin-bottom: 16px; font-family: var(--font-mono); font-size: 12px;">
        <div>
          <span style="color: var(--accent-primary); font-weight: 700;">SOCKET CONCURRENCY:</span>
          <span style="color: #f8fafc;"> 140,000 Active Connections</span>
        </div>
        <div style="display: flex; gap: 16px;">
          <span style="color: var(--accent-emerald);">P99 Latency: <strong>1.4ms</strong></span>
          <span style="color: #38bdf8;">Memory RSS: <strong>44MB</strong></span>
        </div>
      </div>
      <div style="display: flex; flex-direction: column; gap: 12px; font-family: var(--font-mono); font-size: 11px;">
        <div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px; color: var(--accent-primary);">
            <span>HyperProxy (eBPF XDP Dispatch)</span>
            <span>1.4ms P99</span>
          </div>
          <div style="background: rgba(255,255,255,0.05); height: 16px; border-radius: 4px; overflow: hidden;">
            <div style="background: var(--accent-primary); width: 32%; height: 100%;"></div>
          </div>
        </div>
        <div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px; color: #94a3b8;">
            <span>Standard NGINX (Epoll loop)</span>
            <span>2.8ms P99</span>
          </div>
          <div style="background: rgba(255,255,255,0.05); height: 16px; border-radius: 4px; overflow: hidden;">
            <div style="background: #64748b; width: 64%; height: 100%;"></div>
          </div>
        </div>
      </div>
    `;
  }
}

/**
 * Initializes hero visual showcase tab switching
 */
function initShowcaseTabs() {
  const showcaseTabs = document.querySelectorAll('.cs-showcase-tab');
  const viewPanes = document.querySelectorAll('.cs-view-pane');

  showcaseTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetView = tab.getAttribute('data-view');

      showcaseTabs.forEach(t => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
      });
      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');

      viewPanes.forEach(pane => {
        if (pane.id === targetView) {
          pane.classList.add('active');
        } else {
          pane.classList.remove('active');
        }
      });
    });
  });
}

/**
 * Initializes modal inspection for the product gallery
 */
function initGalleryModal() {
  const galleryCards = document.querySelectorAll('.gallery-card');
  const galleryDialog = document.getElementById('gallery-dialog');
  const galleryDialogTitle = document.getElementById('gallery-dialog-title');
  const galleryDialogCaption = document.getElementById('gallery-dialog-caption');
  const galleryDialogContent = document.getElementById('gallery-dialog-content');

  galleryCards.forEach(card => {
    card.addEventListener('click', () => {
      const title = card.getAttribute('data-title');
      const caption = card.getAttribute('data-caption');
      const contentHtml = card.querySelector('.gallery-card-preview').innerHTML;

      if (galleryDialogTitle) galleryDialogTitle.textContent = title;
      if (galleryDialogCaption) galleryDialogCaption.textContent = caption;
      if (galleryDialogContent) galleryDialogContent.innerHTML = contentHtml;

      if (galleryDialog && typeof galleryDialog.showModal === 'function') {
        galleryDialog.showModal();
      }
    });
  });

  if (galleryDialog && !('closedBy' in HTMLDialogElement.prototype)) {
    galleryDialog.addEventListener('click', (e) => {
      if (e.target === galleryDialog) {
        galleryDialog.close();
      }
    });
  }

  if (galleryDialog) {
    const closeBtns = galleryDialog.querySelectorAll('[data-close-modal], .dialog-close-btn');
    closeBtns.forEach(btn => {
      btn.addEventListener('click', () => galleryDialog.close());
    });
  }
}
