// js/theme.js
// -----------------------------------------------------------------------
// Single source of truth for light/dark theme across EVERY portal (main
// app, shipping, tailor, ai-team, files). Previously this same ~20 lines
// of logic was duplicated independently in js/app.js, shipping/app.js,
// and tailor/app.js — three copies that could drift out of sync — while
// ai-team and files had no theme handling at all and always rendered
// dark regardless of what the user picked elsewhere.
//
// Load this ONE file in every portal's <head>, right after config.js and
// before any portal-specific app.js. It applies the saved/preferred theme
// immediately (before first paint) and wires up a button with
// id="btn-theme-toggle" if one exists on the page.
//
// Storage: localStorage key 'pc_theme' ('light' | 'dark'), shared across
// all portals since they're same-origin — set it once anywhere, every
// portal respects it.
// -----------------------------------------------------------------------
(function () {
  function getStoredTheme() {
    try { return localStorage.getItem('pc_theme'); } catch (e) { return null; }
  }
  function setStoredTheme(theme) {
    try { localStorage.setItem('pc_theme', theme); } catch (e) {}
  }
  function prefersDark() {
    return !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    setStoredTheme(theme);
    var btn = document.getElementById('btn-theme-toggle');
    if (btn) btn.innerHTML = theme === 'dark' ? '<i class="ph ph-sun"></i>' : '<i class="ph ph-moon"></i>';
  }

  function initTheme() {
    var saved = getStoredTheme();
    var theme = saved || (prefersDark() ? 'dark' : 'light');
    // Apply directly (not via applyTheme) on init so we don't re-write
    // localStorage just from opening a page with no explicit choice yet —
    // only a genuine toggle click should "commit" a preference.
    document.documentElement.setAttribute('data-theme', theme);
    var btn = document.getElementById('btn-theme-toggle');
    if (btn) {
      btn.innerHTML = theme === 'dark' ? '<i class="ph ph-sun"></i>' : '<i class="ph ph-moon"></i>';
      btn.addEventListener('click', function () {
        var current = document.documentElement.getAttribute('data-theme') || 'dark';
        applyTheme(current === 'dark' ? 'light' : 'dark');
      });
    }

    // If the user has never made an explicit choice, keep following the
    // OS-level preference live (e.g. their system switches to dark at
    // sunset). Once they click the toggle once, that stops — their
    // explicit choice wins from then on, everywhere.
    if (window.matchMedia) {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function (e) {
        if (!getStoredTheme()) {
          document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light');
          var b = document.getElementById('btn-theme-toggle');
          if (b) b.innerHTML = e.matches ? '<i class="ph ph-sun"></i>' : '<i class="ph ph-moon"></i>';
        }
      });
    }
  }

  // Apply as early as possible to avoid a flash of the wrong theme —
  // don't wait for DOMContentLoaded for the attribute itself.
  (function applyEarly() {
    var saved = getStoredTheme();
    var theme = saved || (prefersDark() ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', theme);
  })();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTheme);
  } else {
    initTheme();
  }
})();
