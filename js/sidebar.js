/**
 * js/sidebar.js
 *
 * Shared mobile sidebar toggle — the ONE place this logic lives.
 * Loaded by every portal that has a sidebar (main CRM, Files, AI Team).
 *
 * Markup contract this depends on (must be present in the portal's HTML):
 *   #sidebar          the sidebar panel itself
 *   #sidebar-toggle   the hamburger button that opens/closes it
 *   #sidebar-overlay  the backdrop that dims the page and closes on click
 *
 * Behavior:
 *   - Click #sidebar-toggle  -> toggle #sidebar.open + #sidebar-overlay.active
 *   - Click #sidebar-overlay -> close both
 *   - Click a nav link/button inside #sidebar while narrow (<=1024px)
 *     -> close both, so navigating doesn't leave the drawer open
 *
 * This module does NOT touch the desktop collapse feature (.collapsed) —
 * that stays portal-owned since each portal's collapse trigger/icon differs
 * slightly (main app: click the logo; AI Team: dedicated chevron button).
 *
 * Safe to load on any page: if the expected elements aren't present,
 * it does nothing.
 */
(function () {
  function initMobileSidebarToggle() {
    var sidebar = document.getElementById('sidebar');
    var toggle = document.getElementById('sidebar-toggle');
    var overlay = document.getElementById('sidebar-overlay');

    if (!sidebar) return; // portal has no sidebar at all — nothing to do

    function openSidebar() {
      sidebar.classList.add('open');
      if (overlay) overlay.classList.add('active');
    }

    function closeSidebar() {
      sidebar.classList.remove('open');
      if (overlay) overlay.classList.remove('active');
    }

    if (toggle) {
      toggle.addEventListener('click', function (e) {
        e.preventDefault();
        if (sidebar.classList.contains('open')) {
          closeSidebar();
        } else {
          openSidebar();
        }
      });
    }

    if (overlay) {
      overlay.addEventListener('click', closeSidebar);
    }

    // Close the drawer after tapping a nav item on mobile/tablet widths,
    // so the user isn't left staring at the drawer after navigating.
    sidebar.addEventListener('click', function (e) {
      var target = e.target.closest('a, button');
      if (!target) return;
      if (window.innerWidth <= 1024) {
        closeSidebar();
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMobileSidebarToggle);
  } else {
    initMobileSidebarToggle();
  }
})();
