/**
 * PROJECTS PAGE DISCOVERY ENGINE
 * Handles dynamic project rendering, category filter tabs, and case study linking.
 */

document.addEventListener('DOMContentLoaded', () => {
  const gridContainer = document.getElementById('projects-grid');
  const emptyState = document.getElementById('projects-empty-state');
  const filterTabsContainer = document.getElementById('projects-filter-bar');

  if (!gridContainer || !window.PORTFOLIO_DATA) return;

  const projects = PORTFOLIO_DATA.projects || [];

  // 1. Categories configuration
  const categories = [
    { id: 'all', label: 'All' },
    { id: 'ai-ml', label: 'AI / ML', match: 'AI / ML' },
    { id: 'full-stack', label: 'Full Stack', match: 'Full Stack' },
    { id: 'frontend', label: 'Frontend', match: 'Frontend' },
    { id: 'backend', label: 'Backend', match: 'Backend' },
    { id: 'systems', label: 'Systems', match: 'Systems' },
    { id: 'other', label: 'Other', match: 'Other' }
  ];

  // 2. Render Filter Tabs with Counts
  function renderFilterTabs() {
    if (!filterTabsContainer) return;

    filterTabsContainer.innerHTML = categories.map(cat => {
      let count = 0;
      if (cat.id === 'all') {
        count = projects.length;
      } else {
        count = projects.filter(p => p.category === cat.match).length;
      }

      return `
        <button type="button" class="proj-filter-tab ${cat.id === 'all' ? 'active' : ''}" data-category="${cat.id}">
          <span>${cat.label}</span>
          <span class="proj-filter-count">${count}</span>
        </button>
      `;
    }).join('');

    // Attach click events to tabs
    const tabs = filterTabsContainer.querySelectorAll('.proj-filter-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const catId = tab.getAttribute('data-category');
        filterProjects(catId);
      });
    });
  }

  // 3. Render Project Cards
  function renderProjectCards(items) {
    gridContainer.innerHTML = items.map(p => {
      const caseStudyUrl = `case-study.html?project=${encodeURIComponent(p.slug || p.id)}`;
      const techTags = (p.technologies || []).slice(0, 4).map(t => `
        <span class="badge-tag">${t}</span>
      `).join('');

      // Generate a clean technical thumbnail graphic based on project slug
      let thumbnailMarkup = '';
      if (p.slug === 'traceflow') {
        thumbnailMarkup = `
          <div class="code-line"><span class="code-accent">TraceFlow::WASM</span> ➔ 250k spans/s</div>
          <div class="code-line">OTLP Ingress ➔ Kafka ➔ ClickHouse</div>
          <div style="height: 4px; width: 85%; background: var(--accent-primary); border-radius: 2px; margin-top: 8px;"></div>
        `;
      } else if (p.slug === 'aurakv') {
        thumbnailMarkup = `
          <div class="code-line"><span class="code-accent">AuraKV::Raft</span> ➔ Quorum 3/5</div>
          <div class="code-line">MemTable (SkipList) ➔ WAL (mmap)</div>
          <div style="height: 4px; width: 75%; background: var(--accent-emerald); border-radius: 2px; margin-top: 8px;"></div>
        `;
      } else if (p.slug === 'hyperproxy') {
        thumbnailMarkup = `
          <div class="code-line"><span class="code-accent">eBPF/XDP</span> ➔ Kernel Socket Dispatch</div>
          <div class="code-line">140k conns • 1.4ms P99 Latency</div>
          <div style="height: 4px; width: 65%; background: var(--accent-indigo); border-radius: 2px; margin-top: 8px;"></div>
        `;
      } else if (p.slug === 'vllm-router') {
        thumbnailMarkup = `
          <div class="code-line"><span class="code-accent">NeuralRouter</span> ➔ Speculative Decode</div>
          <div class="code-line">Quantized 7B Draft ➔ Frontier 70B</div>
          <div style="height: 4px; width: 60%; background: #f59e0b; border-radius: 2px; margin-top: 8px;"></div>
        `;
      } else if (p.slug === 'omnidash') {
        thumbnailMarkup = `
          <div class="code-line"><span class="code-accent">WebGL Orderbook</span> ➔ 60fps depth</div>
          <div class="code-line">OffscreenCanvas • Worker Memory Ring</div>
          <div style="height: 4px; width: 90%; background: #38bdf8; border-radius: 2px; margin-top: 8px;"></div>
        `;
      } else if (p.slug === 'nexus-db') {
        thumbnailMarkup = `
          <div class="code-line"><span class="code-accent">NexusDB::MVCC</span> ➔ 2PC Commit</div>
          <div class="code-line">Serializable Snapshot Isolation</div>
          <div style="height: 4px; width: 70%; background: #10b981; border-radius: 2px; margin-top: 8px;"></div>
        `;
      } else {
        thumbnailMarkup = `
          <div class="code-line"><span class="code-accent">DevTunnel::WireGuard</span> ➔ P2P Tunnel</div>
          <div class="code-line">Encrypted NAT Traversal • 940Mbps</div>
          <div style="height: 4px; width: 80%; background: #818cf8; border-radius: 2px; margin-top: 8px;"></div>
        `;
      }

      return `
        <article class="proj-card" data-category="${p.category}" data-slug="${p.slug}">
          <div>
            <div class="proj-card-media" aria-label="${p.title} Preview">
              <div class="proj-card-media-inner">
                ${thumbnailMarkup}
              </div>
            </div>

            <div class="proj-card-body">
              <div class="proj-card-top">
                <span class="proj-category-pill">${p.category}</span>
                ${p.featured ? '<span class="proj-featured-pill">Featured</span>' : ''}
              </div>

              <h2 class="proj-card-title">${p.title}</h2>
              <p class="proj-card-desc">${p.shortDescription || p.description}</p>

              ${p.impact ? `
                <div class="proj-impact-badge">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
                  <span>${p.impact}</span>
                </div>
              ` : ''}

              <div class="proj-tech-row">
                ${techTags}
              </div>
            </div>
          </div>

          <div style="padding: 0 var(--space-6) var(--space-6) var(--space-6);">
            <div class="proj-card-actions">
              <a href="${caseStudyUrl}" class="btn btn-primary btn-sm">
                <span>View Case Study</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
              </a>

              <div style="display: flex; gap: var(--space-2);">
                ${p.githubUrl ? `
                  <a href="${p.githubUrl}" target="_blank" rel="noopener noreferrer" class="btn-icon" aria-label="${p.title} GitHub">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path></svg>
                  </a>
                ` : ''}

                ${p.liveUrl ? `
                  <a href="${p.liveUrl}" target="_blank" rel="noopener noreferrer" class="btn-icon" aria-label="${p.title} Live Demo">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                  </a>
                ` : ''}
              </div>
            </div>
          </div>
        </article>
      `;
    }).join('');
  }

  // 4. Filtering Logic
  function filterProjects(categoryId) {
    const selectedCat = categories.find(c => c.id === categoryId);
    let filtered = projects;

    if (selectedCat && selectedCat.id !== 'all') {
      filtered = projects.filter(p => p.category === selectedCat.match);
    }

    if (filtered.length === 0) {
      gridContainer.style.display = 'none';
      if (emptyState) emptyState.classList.add('visible');
    } else {
      gridContainer.style.display = 'grid';
      if (emptyState) emptyState.classList.remove('visible');
      renderProjectCards(filtered);

      // Trigger subtle fade-in
      gridContainer.style.opacity = '0';
      requestAnimationFrame(() => {
        gridContainer.style.transition = 'opacity 200ms ease';
        gridContainer.style.opacity = '1';
      });
    }
  }

  // 5. Check URL parameters for pre-selected category
  const urlParams = new URLSearchParams(window.location.search);
  const initialCategory = urlParams.get('category');

  renderFilterTabs();
  if (initialCategory && categories.some(c => c.id === initialCategory)) {
    const matchingTab = filterTabsContainer.querySelector(`[data-category="${initialCategory}"]`);
    if (matchingTab) {
      matchingTab.click();
    } else {
      renderProjectCards(projects);
    }
  } else {
    renderProjectCards(projects);
  }
});
