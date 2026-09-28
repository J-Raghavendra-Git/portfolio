/**
 * THEME CONTROLLER
 * Manages dark-first default theme and optional light theme with localStorage persistence
 * and OS media query synchronization.
 */

(function () {
  const THEME_STORAGE_KEY = 'portfolio_theme_preference';
  const root = document.documentElement;

  function getPreferredTheme() {
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    if (savedTheme) {
      return savedTheme;
    }
    // Default is dark mode for engineering aesthetic, but respect explicit OS light if user prefers
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
      return 'light';
    }
    return 'dark';
  }

  function applyTheme(theme) {
    if (theme === 'light') {
      root.setAttribute('data-theme', 'light');
    } else {
      root.removeAttribute('data-theme');
    }
    localStorage.setItem(THEME_STORAGE_KEY, theme);
    updateThemeToggleUI(theme);
  }

  function updateThemeToggleUI(theme) {
    const toggleBtns = document.querySelectorAll('.theme-toggle-btn');
    toggleBtns.forEach(btn => {
      const sunIcon = btn.querySelector('.icon-sun');
      const moonIcon = btn.querySelector('.icon-moon');
      const label = btn.querySelector('.theme-toggle-label');
      
      if (theme === 'light') {
        if (sunIcon) sunIcon.style.display = 'none';
        if (moonIcon) moonIcon.style.display = 'block';
        if (label) label.textContent = 'Dark Mode';
        btn.setAttribute('aria-label', 'Switch to dark theme');
      } else {
        if (sunIcon) sunIcon.style.display = 'block';
        if (moonIcon) moonIcon.style.display = 'none';
        if (label) label.textContent = 'Light Mode';
        btn.setAttribute('aria-label', 'Switch to light theme');
      }
    });
  }

  // Initialize theme immediately to prevent flashing
  const currentTheme = getPreferredTheme();
  applyTheme(currentTheme);

  document.addEventListener('DOMContentLoaded', () => {
    updateThemeToggleUI(currentTheme);

    // Bind theme toggle buttons
    const toggleBtns = document.querySelectorAll('.theme-toggle-btn');
    toggleBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const activeTheme = root.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
        const newTheme = activeTheme === 'light' ? 'dark' : 'light';
        applyTheme(newTheme);
      });
    });

    // Listen to OS theme changes if user has not explicitly locked preference
    if (window.matchMedia) {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
        if (!localStorage.getItem(THEME_STORAGE_KEY)) {
          applyTheme(e.matches ? 'dark' : 'light');
        }
      });
    }
  });
})();
