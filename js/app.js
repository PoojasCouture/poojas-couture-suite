/* ============================================================
   POOJA'S COUTURE — Main Application Controller
   Routing, navigation, modal manager, settings & overview dashboard
   ============================================================ */
window.addEventListener('error', (event) => {
  console.error('Uncaught error:', event.error);
  if (window.Utils && typeof Utils.showToast === 'function') {
    Utils.showToast('An unexpected error occurred. Please check console.', 'error');
  }
});

const App = (() => {
  let currentRoute = 'dashboard';

  async function init() {
    // Hide login overlay immediately if session already cached — prevents flash on back-navigation
    const _cachedUser = (() => {
      try { return JSON.parse(localStorage.getItem('pc_current_user')); } catch(e) { return null; }
    })();
    const _loginOverlay = Utils.$('#login-overlay');
    if (_cachedUser && _loginOverlay) _loginOverlay.classList.remove('active');

    const area = Utils.$('#main-content-area');
    if (area) area.innerHTML = '<div style="padding:60px;text-align:center;color:var(--pc-text-muted)">Loading your studio data...</div>';

    try {
      await Store.ready();
      Store.subscribeRealtime();
    } catch (err) {
      console.error('Failed to load data from Supabase:', err);
      if (area) area.innerHTML = '<div style="padding:60px;text-align:center;color:#F87171">Could not connect to the database. Check config.js (your publishable key) and your internet connection, then refresh.</div>';
      return;
    }

    startClock();
    setupNavigation();
    Utils.$('#btn-notifications').addEventListener('click', showNotificationsSummary);
    setupAuthListeners();
    await checkAuthSession();
  }

  function startClock() {
    const clockEl = Utils.$('#topbar-clock');
    if (!clockEl) return;
    const updateTime = () => { clockEl.textContent = Utils.formatDateTime(new Date()); };
    updateTime();
    setInterval(updateTime, 1000);
  }

  function setupNavigation() {
    Utils.$$('.sidebar-link').forEach(link => {
      link.addEventListener('click', (e) => {
        const route = e.currentTarget.dataset.route;
        if (route) {
          navigate(route);
          Utils.$('#sidebar').classList.remove('open');
          Utils.$('#sidebar-overlay').classList.remove('active');
        }
      });
    });
  }

  (function wireSidebarCollapse() {
    const sidebar = document.getElementById('sidebar');
    const brand   = sidebar ? sidebar.querySelector('.sidebar-brand') : null;
    if (!sidebar || !brand) return;
    sidebar.querySelectorAll('.sidebar-link').forEach(btn => {
      const text = btn.querySelector('.sidebar-link-text');
      if (text) btn.setAttribute('data-tooltip', text.textContent.trim());
    });
    const saved = localStorage.getItem('pc-sidebar-collapsed');
    if (saved === 'true') sidebar.classList.add('collapsed');
    brand.addEventListener('click', () => {
      const isCollapsed = sidebar.classList.toggle('collapsed');
      localStorage.setItem('pc-sidebar-collapsed', isCollapsed);
    });
  })();

  function navigate(route) {
    currentRoute = route;
    try { localStorage.setItem('pc_last_route', route); } catch(e) {}

    const user = Store.getCurrentUser();
    if (user) {
      const role = user.appRole || user.app_role || 'admin';
      const hasCrmPerm = !!(user.permissions && user.permissions.crm);
      const hasSocialCrmPerm = !!(user.permissions && user.permissions.socialCrm);
      const ACCESS = {
        admin:      { dashboard:true,  products:true,  crm:true,  hrm:true,  accounting:true,  admin:true,  settings:true,  'ai-team':true  },
        operations: { dashboard:true,  products:true,  crm:true,  hrm:true,  accounting:false, admin:false, settings:false, 'ai-team':false },
        social_crm: { dashboard:hasCrmPerm, products:hasCrmPerm, crm:hasCrmPerm, hrm:false, accounting:false, admin:false, settings:false, 'ai-team':hasSocialCrmPerm },
        tailor:     { dashboard:false, products:false, crm:false, hrm:false, accounting:false, admin:false, settings:false, 'ai-team':false },
        logistics:  { dashboard:false, products:false, crm:false, hrm:false, accounting:false, admin:false, settings:false, 'ai-team':false }
      };
      // Deny-all default for any unrecognized role — previously fell back
      // to full admin access, which is a fail-open security gap: any
      // app_role string that didn't exactly match one of the 5 known
      // roles silently granted every tab, including Admin Center.
      const DENY_ALL = { dashboard:false, products:false, crm:false, hrm:false, accounting:false, admin:false, settings:false, 'ai-team':false };
      const access = ACCESS[role] || DENY_ALL;
      if (['dashboard','products','crm','hrm','accounting','admin','settings','ai-team'].includes(route) && access[route] !== true) {
        showAccessDenied();
        return;
      }
    }

    Utils.$$('.sidebar-link').forEach(link => {
      if (link.dataset.route === route) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });

    const breadcrumbLabel = Utils.$('#topbar-breadcrumb-active');
    const routesMap = {
      dashboard:  'Overview Dashboard',
      crm:        'Sales Dashboard',
      products:   'Stock & Inventory',
      accounting: 'Accounting & Finance',
      hrm:        'Human Capital',
      admin:      'Admin Center',
      settings:   'Boutique Settings',
      'ai-team':  'Social CRM Studio',
    };
    if (breadcrumbLabel) breadcrumbLabel.textContent = routesMap[route] || 'System Panel';

    if (route === 'dashboard') {
      renderDashboard();
    } else if (route === 'products') {
      Products.init();
    } else if (route === 'crm') {
      CRM.init();
    } else if (route === 'hrm') {
      HRM.init();
    } else if (route === 'accounting') {
      Accounting.init();
    } else if (route === 'settings') {
      renderSettings();
    } else if (route === 'admin') {
      Admin.init();
    } else if (route === 'ai-team') {
      window.location.href = '/ai-team/';
    } else if (route === 'workstation-tailor') {
      renderWorkstationHolding('tailor');
    } else if (route === 'workstation-logistics') {
      renderWorkstationHolding('logistics');
    }
  }

  function renderWorkstationHolding(kind) {
    const container = Utils.$('#main-content-area');
    if (!container) return;
    const user = Store.getCurrentUser() || {};
    const isTailor = kind === 'tailor';
    const portalName = isTailor ? 'Karigar Workstation' : 'Logistics Workstation';
    const portalHref = isTailor ? 'tailor/index.html' : 'shipping/index.html';
    const icon = isTailor ? '🧵' : '✈️';
    container.innerHTML = `
      <div class="card p-8 text-center animate-fade-in" style="max-width:520px;margin:60px auto">
        <div style="font-size:52px;margin-bottom:16px">${icon}</div>
        <h2 class="font-display text-gold">Welcome, ${Utils.sanitizeHTML(user.name || 'there')}</h2>
        <p class="text-muted mt-2">Opening your ${portalName}…</p>
        <p class="text-xs text-muted mt-4">If it does not open automatically,
          <a href="${portalHref}" style="color:var(--pc-gold,#d4af37);text-decoration:underline;">click here</a>.</p>
      </div>
    `;
    const bc = Utils.$('#topbar-breadcrumb-active');
    if (bc) bc.textContent = portalName;
    setTimeout(() => { window.location.href = portalHref; }, 1500);
  }

  function renderDashboard() {
    const container = Utils.$('#main-content-area');
    if (!container) return;

    const _dashUser = Store.getCurrentUser();
    const _firstName = _dashUser && _dashUser.name ? _dashUser.name.split(' ')[0] : 'there';
    const _hour = new Date().getHours();
    const _greeting = _hour < 12 ? 'Good morning' : _hour < 17 ? 'Good afternoon' : 'Good evening';

    const clients = Store.getAll(Store.COLLECTIONS.CLIENTS);
    const orders = Store.getAll(Store.COLLECTIONS.ORDERS);
    const appts = Store.getAll(Store.COLLECTIONS.APPOINTMENTS);
    const invoices = Store.getAll(Store.COLLECTIONS.INVOICES);

    const totalBrides = clients.filter(c => c.type === 'Bride').length;
    const activeOrders = orders.filter(o => !['Delivered', 'Completed'].includes(o.status));
    const pendingInvoices = invoices.filter(i => ['Partially Paid', 'Sent', 'Draft'].includes(i.status));
    const upcomingAppts = appts.filter(a => a.status === 'Scheduled');
    const totalOutstanding = pendingInvoices.reduce((sum, i) => {
      const paid = (i.amountPaid != null && i.amountPaid !== '') ? parseFloat(i.amountPaid) : 0;
      return sum + Math.max(0, (i.total || 0) - paid);
    }, 0);

    container.innerHTML = `
      <div class="page-header animate-fade-in">
        <div>
          <h1 class="page-title">${_greeting}, ${_firstName} 👋</h1>
          <p class="page-subtitle">Here is what is happening at Pooja's Couture today</p>
        </div>
      </div>

      <div class="widgets-grid animate-fade-in stagger-1">
        <div class="stat-card" style="cursor:pointer" onclick="App.showDashReport('brides')">
          <div class="stat-card-header">
            <span class="stat-card-icon gold">👑</span>
            <span class="badge badge-gold">${totalBrides} Registered</span>
          </div>
          <div class="stat-card-value">${totalBrides}</div>
          <div class="stat-card-label">Active Brides</div>
        </div>
        <div class="stat-card" style="cursor:pointer" onclick="App.showDashReport('orders')">
          <div class="stat-card-header">
            <span class="stat-card-icon blue">🧵</span>
            <span class="badge badge-info">${activeOrders.length} In Production</span>
          </div>
          <div class="stat-card-value">${activeOrders.length}</div>
          <div class="stat-card-label">Active Custom Orders</div>
        </div>
        <div class="stat-card" style="cursor:pointer" onclick="App.showDashReport('outstanding')">
          <div class="stat-card-header">
            <span class="stat-card-icon green">💰</span>
            <span class="badge badge-success">${pendingInvoices.length} Unpaid</span>
          </div>
          <div class="stat-card-value">${Utils.formatCurrency(totalOutstanding)}</div>
          <div class="stat-card-label">Outstanding Invoices</div>
        </div>
        <div class="stat-card" style="cursor:pointer" onclick="App.showDashReport('appointments')">
          <div class="stat-card-header">
            <span class="stat-card-icon purple">📅</span>
            <span class="badge badge-purple">${upcomingAppts.length} Scheduled</span>
          </div>
          <div class="stat-card-value">${upcomingAppts.length}</div>
          <div class="stat-card-label">Upcoming Consultations</div>
        </div>
      </div>

      <div class="content-grid-3 animate-fade-in stagger-2">
        <div class="card p-6">
          <div class="card-header p-0 pb-4 mb-4">
            <div class="card-title">📅 Upcoming Consultations & Fittings (Next 7 Days)</div>
            <button class="btn btn-secondary btn-sm" onclick="App.quickRoute('crm', 'appointments')">View All</button>
          </div>
          <div class="table-container" style="border: none;">
            <table class="data-table">
              <thead><tr><th>Client</th><th>Session Date</th><th>Session Type</th><th>Notes</th></tr></thead>
              <tbody id="dash-appt-tbody"></tbody>
            </table>
          </div>
        </div>
        <div class="card p-6">
          <div class="card-title mb-4">🔔 Live Operations Alerts</div>
          <div class="d-flex flex-col gap-3" id="dash-alerts-feed"></div>
        </div>
      </div>
    `;

    const tbody = Utils.$('#dash-appt-tbody');
    tbody.innerHTML = '';
    const next7DaysAppts = appts
      .filter(a => a.status === 'Scheduled' && Utils.daysFromNow(a.date) >= 0 && Utils.daysFromNow(a.date) <= 7)
      .sort((a,b) => new Date(a.date) - new Date(b.date));

    if (next7DaysAppts.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4" class="text-center p-6 text-muted text-xs">No appointments scheduled for the next 7 days.</td></tr>`;
    } else {
      next7DaysAppts.forEach(a => {
        const tr = Utils.createElement('tr');
        tr.innerHTML = `
          <td class="font-medium">${Utils.sanitizeHTML(a.clientName)}</td>
          <td class="font-mono text-xs">${Utils.formatDateTime(a.date)}</td>
          <td><span class="badge ${a.type === 'Fitting' ? 'badge-purple' : 'badge-gold'}">${a.type}</span></td>
          <td class="text-muted text-xs truncate" style="max-width: 180px;">${Utils.sanitizeHTML(a.notes || '—')}</td>
        `;
        tbody.appendChild(tr);
      });
    }

    const feed = Utils.$('#dash-alerts-feed');
    feed.innerHTML = '';
    const alerts = [];

    invoices.forEach(i => {
      if (i.status === 'Sent' && new Date(i.dueDate) < new Date()) {
        alerts.push({
          type: 'danger',
          title: `Overdue Invoice: ${i.invoiceNumber}`,
          desc: `Client: ${i.clientName} | Total: ${Utils.formatCurrency(i.total)}`,
          action: () => quickRoute('accounting', 'invoices')
        });
      }
    });

    orders.forEach(o => {
      if (!['Delivered', 'Completed'].includes(o.status) && new Date(o.deadline) < new Date()) {
        alerts.push({
          type: 'warning',
          title: `Overdue Order Deadline!`,
          desc: `${o.title} (${o.clientName}) passed target date.`,
          action: () => quickRoute('crm', 'orders')
        });
      }
    });

    const pendingLeaves = Store.getAll(Store.COLLECTIONS.LEAVES).filter(l => l.status === 'Pending');
    pendingLeaves.forEach(pl => {
      alerts.push({
        type: 'info',
        title: `Pending Leave Request`,
        desc: `${pl.employeeName} requests ${pl.days} days starting ${Utils.formatDateShort(pl.startDate)}`,
        action: () => quickRoute('hrm', 'leaves')
      });
    });

    if (alerts.length === 0) {
      feed.innerHTML = `<div class="text-center p-6 text-muted text-xs">✅ All operational pipelines are on schedule. No alerts!</div>`;
    } else {
      alerts.slice(0, 5).forEach(alert => {
        const item = Utils.createElement('div', {
          className: 'p-3 rounded-md d-flex justify-between items-start gap-2',
          style: `background: rgba(255,255,255,0.01); border-left: 3px solid var(--pc-${alert.type === 'danger' ? 'danger' : alert.type === 'warning' ? 'warning' : 'info'}); border-top: 1px solid var(--pc-border); border-right: 1px solid var(--pc-border); border-bottom: 1px solid var(--pc-border);`
        });
        item.innerHTML = `
          <div>
            <div class="text-xs font-semibold text-gold">${Utils.sanitizeHTML(alert.title)}</div>
            <div class="text-xs text-muted mt-1 font-light">${Utils.sanitizeHTML(alert.desc)}</div>
          </div>
          <button class="btn btn-secondary btn-sm" style="font-size: 10px; padding: 2px 6px;">Manage</button>
        `;
        Utils.$('button', item).addEventListener('click', alert.action);
        feed.appendChild(item);
      });
    }
  }

  function quickRoute(route, subtab = null) {
    navigate(route);
    if (subtab) {
      setTimeout(() => {
        const tabBtn = Utils.$(`.tab-btn[data-tab="${subtab}"]`);
        if (tabBtn) tabBtn.click();
      }, 50);
    }
  }

  function renderSettings() {
    const container = Utils.$('#main-content-area');
    if (!container) return;
    const settings = Store.getSettings();
    container.innerHTML = `
      <div class="card max-w-xl mx-auto" style="max-width: 600px; margin: 0 auto;">
        <div class="card-header">
          <div class="card-title">Studio Business Details & Data Utility</div>
        </div>
        <div class="card-body">
          <form id="settings-form" class="animate-fade-in">
            <div class="form-group">
              <label class="form-label">Showroom Business Name</label>
              <input type="text" name="companyName" class="form-input font-medium" required value="${Utils.sanitizeHTML(settings.companyName)}">
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Australian ABN</label>
                <input type="text" name="abn" class="form-input font-mono" required value="${Utils.sanitizeHTML(settings.abn)}">
              </div>
              <div class="form-group">
                <label class="form-label">GST Tax Percentage (%)</label>
                <input type="number" name="gstRate" class="form-input font-mono" readonly value="10">
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Contact Email</label>
                <input type="email" name="companyEmail" class="form-input" required value="${Utils.sanitizeHTML(settings.companyEmail)}">
              </div>
              <div class="form-group">
                <label class="form-label">Contact Phone</label>
                <input type="text" name="companyPhone" class="form-input" required value="${Utils.sanitizeHTML(settings.companyPhone)}">
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Studio/Boutique Address</label>
              <input type="text" name="companyAddress" class="form-input" required value="${Utils.sanitizeHTML(settings.companyAddress)}">
            </div>
            <div class="d-flex justify-end mb-6" style="border-bottom: 1px solid var(--pc-border); padding-bottom: var(--sp-5);">
              <button type="submit" class="btn btn-primary">Save Boutique Settings</button>
            </div>
          </form>
          <div>
            <h4 class="text-sm font-semibold text-gold mb-3">Local Sandbox Administration</h4>
            <div class="d-flex flex-wrap gap-2">
              <button class="btn btn-secondary btn-sm" id="btn-export-data">📥 Export JSON Backup</button>
              <button class="btn btn-secondary btn-sm" id="btn-import-trigger">📤 Import JSON Restore</button>
              <input type="file" id="import-file-input" style="display: none;" accept=".json">
              <button class="btn btn-danger btn-sm" id="btn-reset-db">🚨 Factory Reset Sandbox</button>
            </div>
            <p class="text-xs text-muted mt-2 font-light">Exporting downloads a local .json file containing all client, order, payroll and accounting transactions for storage.</p>
          </div>
        </div>
      </div>
    `;

    Utils.$('#settings-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const form = e.target;
      const formData = new FormData(form);
      Store.updateSettings({
        companyName: formData.get('companyName'),
        abn: formData.get('abn'),
        companyEmail: formData.get('companyEmail'),
        companyPhone: formData.get('companyPhone'),
        companyAddress: formData.get('companyAddress')
      });
      Utils.showToast('Boutique details saved successfully.');
    });

    Utils.$('#btn-export-data').addEventListener('click', exportSandboxData);
    const fileInput = Utils.$('#import-file-input');
    Utils.$('#btn-import-trigger').addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => importSandboxData(e.target.files[0]));
    Utils.$('#btn-reset-db').addEventListener('click', () => {
      showConfirm({
        title: 'Factory Reset Operations',
        text: 'This will purge all local client data, orders, financial records, and payrolls, returning the boutique sandbox to default seed values. This cannot be undone!',
        confirmText: 'Yes, Factory Reset',
        onConfirm: () => {
          Utils.showToast('Factory reset is disabled in the cloud database version. Manage data via Supabase.', 'info');
        }
      });
    });
  }

  function exportSandboxData() {
    const backup = {};
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('pc_suite_')) backup[key] = localStorage.getItem(key);
    });
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backup));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `poojas_couture_backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    Utils.showToast('Backup JSON file downloaded.');
  }

  function importSandboxData(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const backup = JSON.parse(e.target.result);
        Object.entries(backup).forEach(([key, val]) => { localStorage.setItem(key, val); });
        Utils.showToast('Database restored. Reloading operations dashboard.', 'success');
        setTimeout(() => navigate('dashboard'), 1000);
      } catch (err) {
        console.error(err);
        Utils.showToast('Invalid backup file formatting.', 'error');
      }
    };
    reader.readAsText(file);
  }

  function showModal({ title, content, submitText = 'Submit', cancelText = 'Cancel', hideCancel = false, modalSize = '', onSubmit }) {
    closeModal();
    const overlay = Utils.createElement('div', { className: `modal-overlay active` });
    overlay.innerHTML = `
      <div class="modal ${modalSize}">
        <div class="modal-header">
          <div class="modal-title">${Utils.sanitizeHTML(title)}</div>
          <button class="modal-close" id="modal-close-btn">×</button>
        </div>
        <div class="modal-body">${content}</div>
        <div class="modal-footer">
          ${hideCancel ? '' : `<button class="btn btn-secondary" id="modal-cancel-btn">${cancelText}</button>`}
          <button class="btn btn-primary" id="modal-submit-btn">${submitText}</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    const close = () => closeModal();
    Utils.$('#modal-close-btn', overlay).addEventListener('click', close);
    if (!hideCancel) Utils.$('#modal-cancel-btn', overlay).addEventListener('click', close);
    const submit = Utils.$('#modal-submit-btn', overlay);
    submit.addEventListener('click', () => {
      if (onSubmit) {
        const success = onSubmit(overlay);
        if (success !== false) close();
      } else {
        close();
      }
    });
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  }

  function closeModal() {
    const overlays = Utils.$$('.modal-overlay');
    overlays.forEach(overlay => {
      overlay.classList.remove('active');
      setTimeout(() => overlay.remove(), 250);
    });
  }

  function showConfirm({ title, text, confirmText = 'Confirm', cancelText = 'Cancel', onConfirm }) {
    const contentHTML = `
      <div class="confirm-dialog animate-fade-in-scale">
        <div class="confirm-dialog-icon">⚠</div>
        <h3 class="confirm-dialog-title">${Utils.sanitizeHTML(title)}</h3>
        <p class="confirm-dialog-text">${Utils.sanitizeHTML(text)}</p>
      </div>
    `;
    showModal({
      title: 'Action Confirmation Required',
      content: contentHTML,
      submitText: confirmText,
      cancelText: cancelText,
      modalSize: 'modal-sm',
      onSubmit: () => { if (onConfirm) onConfirm(); return true; }
    });
  }

  function showNotificationsSummary() {
    const invoices = Store.getAll(Store.COLLECTIONS.INVOICES);
    const overdue = invoices.filter(i => i.status === 'Sent' && new Date(i.dueDate) < new Date());
    const contentHTML = `
      <div class="d-flex flex-col gap-3">
        <h4 class="text-sm font-semibold text-gold mb-1">Overdue Invoices (${overdue.length})</h4>
        ${overdue.length === 0
          ? `<div class="text-xs text-muted p-4 text-center rounded-md" style="background: rgba(255,255,255,0.01); border: 1px dashed var(--pc-border)">No overdue invoices at this time.</div>`
          : `<div class="d-flex flex-col gap-2">${overdue.map(i => `
              <div class="p-3 rounded-md d-flex justify-between items-center text-xs" style="background: rgba(248,113,113,0.03); border: 1px solid var(--pc-border)">
                <div>
                  <div class="font-semibold text-gold">${i.invoiceNumber}</div>
                  <div class="text-muted mt-1 font-light">${Utils.sanitizeHTML(i.clientName)} | Due: ${Utils.formatDate(i.dueDate)}</div>
                </div>
                <div class="font-mono font-bold text-danger">${Utils.formatCurrency(i.total)}</div>
              </div>`).join('')}</div>`}
      </div>
    `;
    showModal({
      title: 'Active Operations System Notifications',
      content: contentHTML,
      submitText: 'Close Notifications',
      hideCancel: true,
      onSubmit: () => true
    });
  }

  function landingRouteFor(user) {
    const role = user.appRole || user.app_role || 'admin';
    if (role === 'tailor') return 'workstation-tailor';
    if (role === 'logistics') return 'workstation-logistics';
    if (role === 'social_crm') {
      const hasCrmPerm = !!(user.permissions && user.permissions.crm);
      const hasSocialCrmPerm = !!(user.permissions && user.permissions.socialCrm);
      // Send socialCrm-only users straight to the Social CRM Studio
      // instead of 'dashboard' — landing on 'dashboard' with no crm
      // permission triggered a full app load followed by an Access
      // Denied screen (the redirect to /ai-team/ only happens after
      // navigate() runs, so the denial flashed first).
      if (!hasCrmPerm && hasSocialCrmPerm) return 'ai-team';
    }
    return 'dashboard';
  }

  async function checkAuthSession() {
    const loginOverlay = Utils.$('#login-overlay');
    let user = Store.getCurrentUser();

    if (!user && typeof Store.reconcileUser === 'function') {
      try { user = await Store.reconcileUser(); } catch (e) { user = null; }
    }

    if (user) {
      const role = (user.appRole || user.app_role || '').toLowerCase();
      if (role === 'tailor')    { window.location.replace('tailor/index.html');   return; }
      if (role === 'logistics') { window.location.replace('shipping/index.html'); return; }
      loginOverlay.classList.remove('active');
      applySidebarPermissions(user);
      // On reload/direct-URL-load, respect whatever route the user was
      // last on (or is trying to reach) instead of always jumping to a
      // "safe" default. This lets navigate()'s own permission check run
      // against the ACTUAL requested route and show Access Denied when
      // appropriate, rather than silently bouncing every reload to a
      // default landing page and never exercising that check at all.
      const CHECKED_ROUTES = ['dashboard','products','crm','hrm','accounting','admin','settings','ai-team'];
      let lastRoute = null;
      try { lastRoute = localStorage.getItem('pc_last_route'); } catch (e) {}
      const target = CHECKED_ROUTES.includes(lastRoute) ? lastRoute : landingRouteFor(user);
      navigate(target);
    } else {
      loginOverlay.classList.add('active');
    }
  }

  function setupAuthListeners() {
    const loginForm = Utils.$('#login-form');
    if (loginForm) {
      loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
          const email = Utils.$('#login-email').value;
          const password = Utils.$('#login-password').value;
          const user = await Store.login(email, password);
          if (user) {
            console.log('Login successful:', user);
            await checkAuthSession();
            Utils.showToast(`Welcome back, ${user.name}!`);
          } else {
            console.log('Login failed for', email);
            Utils.showToast('Invalid email or password.', 'error');
          }
        } catch (err) {
          console.error('Login error:', err);
          Utils.showToast('An unexpected error occurred during login.', 'error');
        }
      });
    }

    const userTrigger = Utils.$('#sidebar-user-trigger');
    if (userTrigger) {
      userTrigger.addEventListener('click', () => {
        showUserMenu();
      });
    }
  }

  function showUserMenu() {
    showModal({
      title: 'Account',
      hideCancel: true,
      content: `
        <div class="d-flex flex-column gap-2">
          <button type="button" class="btn btn-secondary" id="user-menu-change-pw-btn">Change Password</button>
          <button type="button" class="btn btn-danger" id="user-menu-signout-btn">Sign Out</button>
        </div>
      `
    });
    // This modal is an action menu, not a form — the two buttons above
    // ARE the actions. The generic modal-footer "Submit" button that
    // showModal always renders has no purpose here and did nothing when
    // clicked, which is confusing. Hide it for this specific modal.
    const footer = document.querySelector('.modal-overlay.active .modal-footer');
    if (footer) footer.style.display = 'none';

    const pwBtn = Utils.$('#user-menu-change-pw-btn');
    const signOutBtn = Utils.$('#user-menu-signout-btn');
    if (pwBtn) pwBtn.addEventListener('click', () => { closeModal(); setTimeout(showChangePasswordModal, 200); });
    if (signOutBtn) signOutBtn.addEventListener('click', () => {
      closeModal();
      setTimeout(() => {
        showConfirm({
          title: 'Sign Out Operations',
          text: 'Are you sure you want to end your current dashboard session?',
          confirmText: 'Sign Out',
          onConfirm: async () => { await Store.logout(); location.reload(); }
        });
      }, 200);
    });
  }

  function showChangePasswordModal() {
    showModal({
      title: 'Change Password',
      content: `
        <div class="text-xs text-muted mb-3" style="padding:10px 12px;border:1px solid var(--pc-border);border-radius:8px;background:rgba(255,255,255,0.02)">
          ⚠️ Changing your password will sign you out immediately. You'll need to log in again with the new password.
        </div>
        <form id="change-password-form" class="animate-fade-in-scale">
          <div class="form-group">
            <label class="form-label">New Password <span class="required">*</span></label>
            <input type="password" name="newPassword" class="form-input" required minlength="8" autocomplete="new-password">
          </div>
          <div class="form-group">
            <label class="form-label">Confirm New Password <span class="required">*</span></label>
            <input type="password" name="confirmPassword" class="form-input" required minlength="8" autocomplete="new-password">
          </div>
          <div id="change-password-error" class="text-xs" style="color: var(--pc-danger, #c85a5a); display:none;"></div>
        </form>
      `,
      submitText: 'Update Password',
      // Note: showModal's onSubmit is not awaited by the caller, so this
      // handler always returns false (never auto-closes) and closes the
      // modal itself once the async update actually resolves.
      onSubmit: (overlay) => {
        const form = Utils.$('#change-password-form', overlay);
        const errBox = Utils.$('#change-password-error', overlay);
        const submitBtn = Utils.$('#modal-submit-btn', overlay);
        const fd = new FormData(form);
        const newPassword = fd.get('newPassword') || '';
        const confirmPassword = fd.get('confirmPassword') || '';

        errBox.style.display = 'none';

        if (newPassword.length < 8) {
          errBox.textContent = 'Password must be at least 8 characters.';
          errBox.style.display = 'block';
          return false;
        }
        if (newPassword !== confirmPassword) {
          errBox.textContent = 'Passwords do not match.';
          errBox.style.display = 'block';
          return false;
        }

        const client = Store.getClient();
        if (!client) {
          errBox.textContent = 'Supabase client not available.';
          errBox.style.display = 'block';
          return false;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = 'Updating…';

        client.auth.updateUser({ password: newPassword }).then(({ error }) => {
          if (error) {
            errBox.textContent = error.message || 'Failed to update password.';
            errBox.style.display = 'block';
            submitBtn.disabled = false;
            submitBtn.textContent = 'Update Password';
            return;
          }
          // updateUser() does NOT invalidate the current session token by
          // itself — the old session would otherwise stay valid until it
          // naturally expires, letting the user (or anyone with access to
          // this browser) keep working under the OLD password's session
          // as if nothing changed. Force an explicit sign-out so the new
          // password is the only way back in, immediately.
          closeModal();
          Utils.showToast('Password changed. Please log in again with your new password.', 'success');
          setTimeout(async () => {
            try { await Store.logout(); } catch (e) {}
            location.reload();
          }, 1200);
        }).catch((e) => {
          errBox.textContent = 'Network error: ' + e.message;
          errBox.style.display = 'block';
          submitBtn.disabled = false;
          submitBtn.textContent = 'Update Password';
        });

        return false;
      }
    });
  }

  function applySidebarPermissions(user) {
    const appRole = user.appRole || user.app_role || 'admin';
    const hasCrmPerm = !!(user.permissions && user.permissions.crm);
    const hasSocialCrmPerm = !!(user.permissions && user.permissions.socialCrm);
    const ACCESS = {
      admin:      { dashboard:true,  products:true,  crm:true,  hrm:true,  accounting:true,  admin:true,  settings:true,  tailorPortal:true,  logisticsPortal:true,  aiTeam:true  },
      operations: { dashboard:true,  products:true,  crm:true,  hrm:true,  accounting:false, admin:false, settings:false, tailorPortal:true,  logisticsPortal:true,  aiTeam:false },
      social_crm: { dashboard:hasCrmPerm, products:hasCrmPerm, crm:hasCrmPerm, hrm:false, accounting:false, admin:false, settings:false, tailorPortal:false, logisticsPortal:false, aiTeam:hasSocialCrmPerm },
      tailor:     { dashboard:false, products:false, crm:false, hrm:false, accounting:false, admin:false, settings:false, tailorPortal:true,  logisticsPortal:false, aiTeam:false },
      logistics:  { dashboard:false, products:false, crm:false, hrm:false, accounting:false, admin:false, settings:false, tailorPortal:false, logisticsPortal:true,  aiTeam:false }
    };
    // Deny-all default for unrecognized roles -- see navigate() for why
    // falling back to admin access was a real security gap.
    const DENY_ALL = { dashboard:false, products:false, crm:false, hrm:false, accounting:false, admin:false, settings:false, tailorPortal:false, logisticsPortal:false, aiTeam:false };
    const access = ACCESS[appRole] || DENY_ALL;
    const routeKeyMap = { 'ai-team': 'aiTeam' };

    Utils.$$('.sidebar-section').forEach(section => {
      const buttons = Utils.$$('.sidebar-link[data-route]', section);
      const anchors = Utils.$$('a.sidebar-link', section);

      if (buttons.length > 0) {
        const route = buttons[0].dataset.route;
        const key = routeKeyMap[route] || (route === 'dashboard' ? 'dashboard' : route);
        const allowed = access[key] === true;
        section.style.display = allowed ? 'block' : 'none';
        return;
      }

      if (anchors.length > 0) {
        let anyVisible = false;
        anchors.forEach(a => {
          const href = a.getAttribute('href') || '';
          let show = true;
          if (href.includes('tailor'))   show = access.tailorPortal;
          if (href.includes('shipping')) show = access.logisticsPortal;
          a.style.display = show ? '' : 'none';
          if (show) anyVisible = true;
        });
        section.style.display = anyVisible ? 'block' : 'none';
      }
    });

    const initials = Utils.getInitials(user.name);
    const avatar = Utils.$('.sidebar-user-avatar');
    if (avatar) {
      avatar.textContent = initials;
      avatar.style.backgroundColor = Utils.getAvatarColor(user.name);
      avatar.style.color = 'var(--pc-text-inverse)';
    }

    const nameEl = Utils.$('.sidebar-user-name');
    if (nameEl) nameEl.textContent = user.name;

    const roleEl = Utils.$('.sidebar-user-role');
    if (roleEl) {
      const roleTitles = {
        admin:      'Operations Director',
        operations: 'Operations Manager',
        social_crm: 'CRM & Social',
        tailor:     'Master Tailor',
        logistics:  'Logistics Manager'
      };
      const appRoleKey = (user.appRole || user.app_role || user.role || '').toLowerCase();
      const displayName = (user.name || '').toLowerCase();
      if (displayName.includes('pooja')) {
        roleEl.textContent = 'Managing Director';
      } else {
        roleEl.textContent = roleTitles[appRoleKey] || user.role;
      }
    }
  }

  function showAccessDenied() {
    const container = Utils.$('#main-content-area');
    if (!container) return;
    container.innerHTML = `
      <div class="card p-8 text-center animate-fade-in" style="max-width: 480px; margin: 40px auto;">
        <div style="font-size: 48px; margin-bottom: 20px;">🔒</div>
        <h2 class="font-display text-gold">Access Denied</h2>
        <p class="text-muted mt-2">You do not have administrative clearance to access this module.</p>
        <button class="btn btn-primary mt-4" onclick="App.navigate('dashboard')">Return to Dashboard</button>
      </div>
    `;
  }

  window.addEventListener('pc:datachange', Utils.debounce(() => {
    const dataModules = ['crm','accounting','hrm','admin','products'];
    if (dataModules.includes(currentRoute)) navigate(currentRoute);
  }, 500));

  document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState === 'visible') {
      try {
        await Promise.all([
          Store.refresh('orders'),
          Store.refresh('invoices'),
          Store.refresh('order_projects'),
          Store.refresh('clients'),
          Store.refresh('appointments')
        ]);
        if (currentRoute) navigate(currentRoute);
      } catch (e) { /* ignore */ }
    }
  });

  function showDashReport(type) {
    const allClients  = Store.getAll(Store.COLLECTIONS.CLIENTS);
    const allOrders   = Store.getAll(Store.COLLECTIONS.ORDERS);
    const invoices    = Store.getAll(Store.COLLECTIONS.INVOICES);
    const appts       = Store.getAll(Store.COLLECTIONS.APPOINTMENTS);
    const now         = new Date();
    let title = '', content = '';

    if (type === 'brides') {
      title = '👑 Active Bridal Clients';
      const brides = allClients.filter(c => c.type === 'Bride');
      content = brides.length === 0
        ? '<div class="text-center p-6 text-muted">No bridal clients registered yet.</div>'
        : '<div class="table-container" style="border:none"><table class="data-table"><thead><tr><th>Bride</th><th>Wedding Date</th><th>Orders</th><th>Contact</th></tr></thead><tbody>' +
          brides.sort((a,b)=>(a.name||'').localeCompare(b.name||'')).map(c => {
            const cnt = allOrders.filter(o=>o.clientId===c.id).length;
            return '<tr><td class="font-semibold text-xs">' + Utils.sanitizeHTML(c.name) + '</td>' +
              '<td class="text-xs">' + Utils.formatDate(c.weddingDate||c.eventDate||'') + '</td>' +
              '<td class="font-mono text-xs">' + cnt + '</td>' +
              '<td class="text-xs text-muted">' + Utils.sanitizeHTML(c.email||c.phone||'\u2014') + '</td></tr>';
          }).join('') + '</tbody></table></div>';
    } else if (type === 'orders') {
      title = '🧵 Active Custom Orders';
      const active = allOrders.filter(o => !['Delivered', 'Completed'].includes(o.status));
      content = '<div class="table-container" style="border:none"><table class="data-table"><thead><tr><th>Code</th><th>Client</th><th>Garment</th><th>Stage</th><th>Deadline</th></tr></thead><tbody>' +
        active.sort((a,b)=>new Date(a.deadline||0)-new Date(b.deadline||0)).map(o => {
          const over = o.deadline && new Date(o.deadline) < now;
          return '<tr>' +
            '<td class="font-mono text-gold text-xs">' + Utils.sanitizeHTML(o.orderCode||'\u2014') + '</td>' +
            '<td class="text-xs">' + Utils.sanitizeHTML(o.clientName) + '</td>' +
            '<td class="text-xs">' + Utils.sanitizeHTML(o.title) + '</td>' +
            '<td><span class="badge badge-gold text-xs">' + o.status + '</span></td>' +
            '<td class="text-xs ' + (over?'text-danger font-bold':'text-muted') + '">' + Utils.formatDate(o.deadline) + '</td></tr>';
        }).join('') + '</tbody></table></div>';
    } else if (type === 'outstanding') {
      title = '💰 Outstanding Invoices';
      const unpaid = invoices.filter(i => (i.total||0) > (parseFloat(i.amountPaid)||0));
      content = unpaid.length === 0
        ? '<div class="text-center p-6 text-success font-semibold">All invoices are paid!</div>'
        : '<div class="table-container" style="border:none"><table class="data-table"><thead><tr><th>Invoice</th><th>Client</th><th>Total</th><th>Paid</th><th>Balance</th></tr></thead><tbody>' +
          unpaid.sort((a,b)=>((b.total||0)-(parseFloat(b.amountPaid)||0))-((a.total||0)-(parseFloat(a.amountPaid)||0))).map(inv => {
            const paid = parseFloat(inv.amountPaid)||0;
            const bal  = Math.round((inv.total-paid)*100)/100;
            return '<tr><td class="font-mono text-gold text-xs">' + Utils.sanitizeHTML(inv.invoiceNumber||'\u2014') + '</td>' +
              '<td class="text-xs">' + Utils.sanitizeHTML(inv.clientName||'\u2014') + '</td>' +
              '<td class="font-mono text-xs">' + Utils.formatCurrency(inv.total) + '</td>' +
              '<td class="font-mono text-xs text-success">' + Utils.formatCurrency(paid) + '</td>' +
              '<td class="font-mono text-xs font-bold text-danger">' + Utils.formatCurrency(bal) + '</td></tr>';
          }).join('') + '</tbody></table></div>';
    } else if (type === 'appointments') {
      title = '📅 Upcoming Consultations';
      const upcoming = appts.filter(a => a.status === 'Scheduled').sort((a,b)=>new Date(a.date||0)-new Date(b.date||0));
      content = upcoming.length === 0
        ? '<div class="text-center p-6 text-muted">No upcoming appointments scheduled.</div>'
        : '<div class="table-container" style="border:none"><table class="data-table"><thead><tr><th>Client</th><th>Type</th><th>Date</th><th>Notes</th></tr></thead><tbody>' +
          upcoming.map(a =>
            '<tr><td class="font-semibold text-xs">' + Utils.sanitizeHTML(a.clientName||'\u2014') + '</td>' +
            '<td class="text-xs">' + Utils.sanitizeHTML(a.type||'\u2014') + '</td>' +
            '<td class="text-xs">' + Utils.formatDate(a.date) + '</td>' +
            '<td class="text-xs text-muted">' + Utils.sanitizeHTML(a.notes||'\u2014') + '</td></tr>'
          ).join('') + '</tbody></table></div>';
    }
    showModal({
      title, content: '<div style="max-height:60vh;overflow-y:auto;">' + content + '</div>',
      submitText: 'Close', hideCancel: true, onSubmit: () => true, modalSize: 'modal-lg'
    });
  }

  return {
    init,
    navigate,
    showDashReport,
    quickRoute,
    showModal,
    closeModal,
    showConfirm
  };
})();

document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
