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
// Default behavior (no explicit user choice yet): time-based, not
// OS-preference-based. 7:00am-5:59pm local clock time = light, otherwise
// dark. Checked every minute so it flips automatically at those
// boundaries without a reload, until the user clicks the toggle once —
// after that, their explicit choice wins everywhere, same as before.
//
// Storage: localStorage key 'pc_theme' ('light' | 'dark'), shared across
// all portals since they're same-origin — set it once anywhere, every
// portal respects it.
// -----------------------------------------------------------------------
(function () {
  var DAY_START_HOUR = 7;   // 7:00am
  var DAY_END_HOUR = 18;    // 6:00pm (exclusive — 17:59 is still day)

  function getStoredTheme() {
    try { return localStorage.getItem('pc_theme'); } catch (e) { return null; }
  }
  function setStoredTheme(theme) {
    try { localStorage.setItem('pc_theme', theme); } catch (e) {}
  }
  function timeBasedTheme() {
    var h = new Date().getHours();
    return (h >= DAY_START_HOUR && h < DAY_END_HOUR) ? 'light' : 'dark';
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    setStoredTheme(theme);
    var btn = document.getElementById('btn-theme-toggle');
    if (btn) btn.innerHTML = theme === 'dark' ? '<i class="ph ph-sun"></i>' : '<i class="ph ph-moon"></i>';
  }

  function initTheme() {
    var saved = getStoredTheme();
    var theme = saved || timeBasedTheme();
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
    // 7am/6pm boundary live — check once a minute so the theme flips on
    // its own at those times without needing a reload. Once they click
    // the toggle once, this stops — their explicit choice wins from then
    // on, everywhere.
    setInterval(function () {
      if (!getStoredTheme()) {
        var t = timeBasedTheme();
        if (document.documentElement.getAttribute('data-theme') !== t) {
          document.documentElement.setAttribute('data-theme', t);
          var b = document.getElementById('btn-theme-toggle');
          if (b) b.innerHTML = t === 'dark' ? '<i class="ph ph-sun"></i>' : '<i class="ph ph-moon"></i>';
        }
      }
    }, 60 * 1000);
  }

  // Apply as early as possible to avoid a flash of the wrong theme —
  // don't wait for DOMContentLoaded for the attribute itself.
  (function applyEarly() {
    var saved = getStoredTheme();
    var theme = saved || timeBasedTheme();
    document.documentElement.setAttribute('data-theme', theme);
  })();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTheme);
  } else {
    initTheme();
  }
})();
