/* ============================================================
   UNCANNY WIKI — Core JS Module
   Header Injection, Search Engine & Boot Sequence
   ============================================================ */

(function () {
  'use strict';

  // ---- Path Helper ---------------------------------------------------
  function getRootPath() {
    if (document.body && document.body.dataset.root) {
      return document.body.dataset.root;
    }
    const pathname = window.location.pathname;
    if (pathname.includes('/pages/')) {
      return '../';
    }
    return './';
  }

  // ---- Dynamic Topbar Injection --------------------------------------
  function injectHeader() {
    const root = getRootPath();
    const currentPath = window.location.pathname.toLowerCase();
    const isHome = currentPath.endsWith('index.html') || currentPath.endsWith('/') || !currentPath.includes('.html');
    const isSample = currentPath.includes('sample.html');

    const headerHTML = `
      <header class="site-header-group">
        <div class="header-inner">
          <!-- Left: Logo & Title -->
          <a href="${root}index.html" class="header-brand" id="site-brand">
            <div class="site-header__logo">
              <img src="${root}assets/mainlogo.png" alt="Uncanny Wiki">
            </div>
            <span class="site-header__title" id="site-title">UNCANNY UDARNIK</span>
          </a>

          <!-- Center: Navigation Categories -->
          <nav class="main-nav" id="main-nav">
            <a href="${root}index.html" class="${isHome ? 'active' : ''}">Home</a>
            <a href="${root}pages/sample.html" class="${isSample ? 'active' : ''}">N/A</a>
            <a href="#">N/A</a>
            <a href="#">N/A</a>
            <a href="#">N/A</a>
          </nav>

          <!-- Right: Search -->
          <div class="header-actions">
            <a href="#" data-action="open-search" class="search-trigger" aria-label="Search">⌕ Search</a>
          </div>
        </div>
      </header>
    `;

    let target = document.getElementById('wiki-header') || document.querySelector('.site-header-group');
    if (target) {
      target.outerHTML = headerHTML;
    } else {
      const breadcrumbs = document.getElementById('breadcrumbs') || document.getElementById('main-content');
      if (breadcrumbs) {
        breadcrumbs.insertAdjacentHTML('beforebegin', headerHTML);
      } else {
        document.body.insertAdjacentHTML('afterbegin', headerHTML);
      }
    }
  }

  // ---- Dynamic Search Modal Injection --------------------------------
  function injectSearchModal() {
    if (document.getElementById('search-overlay')) return;
    const modalHTML = `
      <div class="search-overlay" id="search-overlay">
        <div class="search-modal" role="dialog" aria-label="Search">
          <div class="search-modal__input-wrap">
            <span class="search-modal__icon">⌕</span>
            <input type="text" id="search-input" class="search-modal__input" placeholder="Search pages…" autocomplete="off">
          </div>
          <div class="search-modal__results" id="search-results">
            <div class="search-modal__empty">Type to search…</div>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
  }

  // ---- Terminal Boot Sequence Overlay --------------------------------
  function initBootScreen() {
    // Only run full boot sequence once per session (unless force reboot requested)
    if (sessionStorage.getItem('wiki_booted') === 'true') {
      return;
    }

    const root = getRootPath();
    const bootHTML = `
      <div class="boot-overlay" id="boot-overlay">
        <div class="boot-container">
          <img src="${root}assets/ust.png" alt="Uncanny Udarnik" class="boot-logo">
          <div class="boot-progress-wrap">
            <div class="boot-progress-bar" id="boot-bar"></div>
            <div class="boot-progress-text" id="boot-text">0%</div>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', bootHTML);

    const overlay = document.getElementById('boot-overlay');
    const bar = document.getElementById('boot-bar');
    const text = document.getElementById('boot-text');
    let progress = 0;
    let completed = false;

    function dismissBoot() {
      if (completed) return;
      completed = true;
      sessionStorage.setItem('wiki_booted', 'true');
      overlay.classList.add('hidden');
      setTimeout(() => {
        if (overlay && overlay.parentNode) {
          overlay.parentNode.removeChild(overlay);
        }
      }, 500);
    }

    const interval = setInterval(() => {
      if (completed) {
        clearInterval(interval);
        return;
      }

      progress += 1;

      if (bar) bar.style.width = progress + '%';
      if (text) text.textContent = `${progress}%`;

      if (progress >= 100) {
        clearInterval(interval);
        setTimeout(dismissBoot, 400);
      }
    }, 100);
  }

  // ---- Page Change CRT Glitch Transition -----------------------------
  function initPageTransitions() {
    const transitionHTML = `
      <div class="crt-transition-overlay" id="crt-transition-overlay">
        <div class="crt-transition-line"></div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', transitionHTML);

    const overlay = document.getElementById('crt-transition-overlay');

    document.addEventListener('click', e => {
      const link = e.target.closest('a');
      if (!link) return;

      const href = link.getAttribute('href');
      const target = link.getAttribute('target');

      // Ignore non-navigation links, JS actions, or external tabs
      if (!href || href.startsWith('#') || href.startsWith('javascript:') || target === '_blank') {
        return;
      }

      // Trigger CRT transition flash
      e.preventDefault();
      if (overlay) overlay.classList.add('active');

      setTimeout(() => {
        window.location.href = href;
      }, 180);
    });
  }

  // ---- Search Engine -------------------------------------------------
  let PAGE_INDEX = [];

  async function loadIndex() {
    const rootPath = getRootPath();
    try {
      const res = await fetch(rootPath + 'data/pages.json');
      if (res.ok) {
        PAGE_INDEX = await res.json();
        PAGE_INDEX = PAGE_INDEX.map(p => ({
          ...p,
          url: rootPath + p.url.replace(/^\.\//, '')
        }));
      }
    } catch (_) {
      if (window.WIKI_PAGES) {
        PAGE_INDEX = window.WIKI_PAGES;
      }
    }
  }

  function getOverlay()  { return document.getElementById('search-overlay'); }
  function getInput()    { return document.getElementById('search-input'); }
  function getResults()  { return document.getElementById('search-results'); }

  function openSearch() {
    const overlay = getOverlay();
    if (!overlay) return;
    overlay.classList.add('open');
    const input = getInput();
    if (input) { input.value = ''; input.focus(); }
    renderResults('');
  }

  function closeSearch() {
    const overlay = getOverlay();
    if (overlay) overlay.classList.remove('open');
  }

  function search(query) {
    if (!query || query.length < 1) return PAGE_INDEX.slice(0, 8);

    const q = query.toLowerCase();
    const scored = PAGE_INDEX.map(page => {
      let score = 0;
      const title = page.title.toLowerCase();
      const snippet = (page.snippet || '').toLowerCase();

      if (title === q) score += 100;
      else if (title.startsWith(q)) score += 60;
      else if (title.includes(q)) score += 40;

      if (snippet.includes(q)) score += 20;

      return { ...page, score };
    })
    .filter(p => p.score > 0)
    .sort((a, b) => b.score - a.score);

    return scored.slice(0, 12);
  }

  function highlightMatch(text, query) {
    if (!query) return text;
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return text;
    return text.slice(0, idx) +
      '<mark>' + text.slice(idx, idx + query.length) + '</mark>' +
      text.slice(idx + query.length);
  }

  function renderResults(query) {
    const container = getResults();
    if (!container) return;

    const results = search(query);

    if (results.length === 0) {
      container.innerHTML = '<div class="search-modal__empty">No pages found.</div>';
      return;
    }

    container.innerHTML = results.map(page => `
      <a class="search-result" href="${page.url}">
        <div class="search-result__title">${highlightMatch(page.title, query)}</div>
        <div class="search-result__snippet">${highlightMatch(page.snippet || '', query)}</div>
      </a>
    `).join('');
  }

  // ---- Event Binding -------------------------------------------------
  function init() {
    injectHeader();
    injectSearchModal();
    initBootScreen();
    initPageTransitions();
    loadIndex();
    // Search trigger links
    document.body.addEventListener('click', e => {
      const trigger = e.target.closest('[data-action="open-search"]');
      if (trigger) {
        e.preventDefault();
        openSearch();
      }
      const closeTrigger = e.target.closest('[data-action="close-search"]');
      if (closeTrigger) {
        closeSearch();
      }
    });

    // Close on overlay background click
    document.addEventListener('click', e => {
      const overlay = getOverlay();
      if (overlay && e.target === overlay) closeSearch();
    });

    // Escape closes the search overlay.
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') closeSearch();
    });

    // Search input typing
    document.addEventListener('input', e => {
      if (e.target && e.target.id === 'search-input') {
        renderResults(e.target.value);
      }
    });
  }

  // ---- Collapsible Blocks --------------------------------------------
  function initCollapsibles() {
    document.addEventListener('click', e => {
      const toggle = e.target.closest('.collapsible__toggle');
      if (toggle) {
        toggle.closest('.collapsible').classList.toggle('open');
      }
    });
  }

  // ---- Tab Groups ----------------------------------------------------
  function initTabs() {
    document.addEventListener('click', e => {
      const btn = e.target.closest('.tab-group__btn');
      if (btn) {
        const group = btn.closest('.tab-group');
        if (!group) return;
        const btns = group.querySelectorAll('.tab-group__btn');
        const panels = group.querySelectorAll('.tab-group__panel');
        btns.forEach(b => b.classList.remove('active'));
        panels.forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        const target = group.querySelector(`#${btn.dataset.tab}`);
        if (target) target.classList.add('active');
      }
    });
  }

  // ---- Boot ----------------------------------------------------------
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { init(); initCollapsibles(); initTabs(); });
  } else {
    init(); initCollapsibles(); initTabs();
  }
})();
