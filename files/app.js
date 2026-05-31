/* ============================================================
   POOJA'S COUTURE — Main Application Controller
   Routing, navigation, modal manager, settings & overview dashboard
   ============================================================ */
// Global error handler to catch uncaught errors and show toast
window.addEventListener('error', (event) => {
  console.error('Uncaught error:', event.error);
  if (window.Utils && typeof Utils.showToast === 'function') {
    Utils.showToast('An unexpected error occurred. Please check console.', 'error');
  }
});

const App = (() => {
  let currentRoute = 'dashboard';

  async function init() {
    // 0. Show a loading state while we fetch data from Supabase
    const area = Utils.$('#main-content-area');
    if (area) area.innerHTML = '<div style="padding:60px;text-align:center;color:var(--pc-text-muted)">Loading your studio data...</div>';

    // 1. Initialize data layer — load all data from Supabase into cache.
    try {
      await Store.ready();
    } catch (err) {
      console.error('Failed to load data from Supabase:', err);
      if (area) area.innerHTML = '<div style="padding:60px;text-align:center;color:#F87171">Could not connect to the database. Check config.js (your publishable key) and your internet connection, then refresh.</div>';
      return;
    }

    // 2. Setup Clock
    startClock();

    // 3. Setup Navigation & Layout Events
    setupNavigation();
    setupMobileSidebar();

    // 4. Setup Notifications Alert Bell click
    Utils.$('#btn-notifications').addEventListener('click', showNotificationsSummary);

    // 5. Setup Authentication & Session Check
    setupAuthListeners();
    checkAuthSession();
  }

  // ---------- Live Clock ----------
  function startClock() {
    const clockEl = Utils.$('#topbar-clock');
    if (!clockEl) return;
    const updateTime = () => {
      clockEl.textContent = Utils.formatDateTime(new Date());
    };
    updateTime();
    setInterval(updateTime, 1000);
  }

  // ---------- Navigation Routing ----------
  function setupNavigation() {
    Utils.$$('.sidebar-link').forEach(link => {
      link.addEventListener('click', (e) => {
        const route = e.currentTarget.dataset.route;
        if (route) {
          navigate(route);
          // Auto close mobile sidebar
          Utils.$('#sidebar').classList.remove('open');
          Utils.$('#sidebar-overlay').classList.remove('active');
        }
      });
    });
  }

  function setupMobileSidebar() {
    const toggleBtn = Utils.$('#sidebar-toggle');
    const sidebar = Utils.$('#sidebar');
    const overlay = Utils.$('#sidebar-overlay');

    if (toggleBtn && sidebar && overlay) {
      toggleBtn.addEventListener('click', () => {
        sidebar.classList.toggle('open');
        overlay.classList.toggle('active');
      });

      overlay.addEventListener('click', () => {
        sidebar.classList.remove('open');
        overlay.classList.remove('active');
      });
    }
  }

  function navigate(route) {
    currentRoute = route;

    // Check routing permissions
    const user = Store.getCurrentUser();
    const perms = user ? user.permissions : null;
    if (user && perms) {
      if (route === 'crm' && !perms.crm) { showAccessDenied(); return; }
      if (route === 'hrm' && !perms.hrm) { showAccessDenied(); return; }
      if (route === 'accounting' && !perms.accounting) { showAccessDenied(); return; }
      if (route === 'admin' && !perms.admin) { showAccessDenied(); return; }
    }

    // Update active class in sidebar
    Utils.$$('.sidebar-link').forEach(link => {
      if (link.dataset.route === route) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });

    // Update breadcrumb
    const breadcrumbLabel = Utils.$('#topbar-breadcrumb-active');
    const routesMap = {
      dashboard: 'Overview Dashboard',
      crm: 'CRM Center',
      hrm: 'HRM Center',
      accounting: 'Accounting Portal',
      settings: 'Boutique Settings',
      admin: 'Admin Center'
    };
    if (breadcrumbLabel) {
      breadcrumbLabel.textContent = routesMap[route] || 'System Panel';
    }

    // Render screen content
    if (route === 'dashboard') {
      renderDashboard();
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
    }
  }

  // ==========================================
  // OVERVIEW DASHBOARD SCREEN
  // ==========================================
  
  function renderDashboard() {
    const container = Utils.$('#main-content-area');
    if (!container) return;

    // Fetch metric values
    const clients = Store.getAll(Store.COLLECTIONS.CLIENTS);
    const orders = Store.getAll(Store.COLLECTIONS.ORDERS);
    const appts = Store.getAll(Store.COLLECTIONS.APPOINTMENTS);
    const invoices = Store.getAll(Store.COLLECTIONS.INVOICES);
    const employees = Store.getAll(Store.COLLECTIONS.EMPLOYEES);

    const totalBrides = clients.filter(c => c.type === 'Bride').length;
    const activeOrders = orders.filter(o => o.status !== 'Delivered');
    const pendingInvoices = invoices.filter(i => i.status === 'Sent' || i.status === 'Overdue');
    const upcomingAppts = appts.filter(a => a.status === 'Scheduled');

    const totalOutstanding = pendingInvoices.reduce((sum, i) => sum + i.total, 0);

    container.innerHTML = `
      <div class="page-header animate-fade-in">
        <div>
          <h1 class="page-title">Welcome back, Pooja</h1>
          <p class="page-subtitle">Here is what is happening at Pooja's Couture today</p>
        </div>
      </div>

      <!-- Quick Metrics Grid -->
      <div class="widgets-grid animate-fade-in stagger-1">
        <div class="stat-card">
          <div class="stat-card-header">
            <span class="stat-card-icon gold">👑</span>
            <span class="badge badge-gold">${totalBrides} Registered</span>
          </div>
          <div class="stat-card-value">${totalBrides}</div>
          <div class="stat-card-label">Active Brides</div>
        </div>

        <div class="stat-card">
          <div class="stat-card-header">
            <span class="stat-card-icon blue">🧵</span>
            <span class="badge badge-info">${activeOrders.length} In Production</span>
          </div>
          <div class="stat-card-value">${activeOrders.length}</div>
          <div class="stat-card-label">Active Custom Orders</div>
        </div>

        <div class="stat-card">
          <div class="stat-card-header">
            <span class="stat-card-icon green">💰</span>
            <span class="badge badge-success">${pendingInvoices.length} Unpaid</span>
          </div>
          <div class="stat-card-value">${Utils.formatCurrency(totalOutstanding)}</div>
          <div class="stat-card-label">Outstanding Invoices</div>
        </div>

        <div class="stat-card">
          <div class="stat-card-header">
            <span class="stat-card-icon purple">📅</span>
            <span class="badge badge-purple">${upcomingAppts.length} Scheduled</span>
          </div>
          <div class="stat-card-value">${upcomingAppts.length}</div>
          <div class="stat-card-label">Upcoming Consultations</div>
        </div>
      </div>

      <!-- Primary Content Row -->
      <div class="content-grid-3 animate-fade-in stagger-2">
        
        <!-- Upcoming Sessions & Fitting Lists -->
        <div class="card p-6">
          <div class="card-header p-0 pb-4 mb-4">
            <div class="card-title">📅 Upcoming Consultations & Fittings (Next 7 Days)</div>
            <button class="btn btn-secondary btn-sm" onclick="App.quickRoute('crm', 'appointments')">View All</button>
          </div>
          <div class="table-container" style="border: none;">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Session Date</th>
                  <th>Session Type</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody id="dash-appt-tbody">
                <!-- Populated by JS -->
              </tbody>
            </table>
          </div>
        </div>

        <!-- Recent Activities Feed -->
        <div class="card p-6">
          <div class="card-title mb-4">🔔 Live Operations Alerts</div>
          <div class="d-flex flex-col gap-3" id="dash-alerts-feed">
            <!-- Populated by JS -->
          </div>
        </div>

      </div>
    `;

    // Populate appointments
    const tbody = Utils.$('#dash-appt-tbody');
    tbody.innerHTML = '';
    
    // Sort upcoming chronologically
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

    // Populate Operation Alerts
    const feed = Utils.$('#dash-alerts-feed');
    feed.innerHTML = '';
    const alerts = [];

    // Check 1: Overdue Invoices
    invoices.forEach(i => {
      if (i.status === 'Sent' && new Date(i.dueDate) < new Date()) {
        alerts.push({
          type: 'danger',
          title: `Overdue Invoice: ${i.invoiceNumber}`,
          desc: `Client: ${i.clientName} | Total: ${Utils.formatCurrency(i.total)}`,
          actionLabel: 'Remind',
          action: () => quickRoute('accounting', 'invoices')
        });
      }
    });

    // Check 2: Overdue Custom Orders deadlines
    orders.forEach(o => {
      if (o.status !== 'Delivered' && new Date(o.deadline) < new Date()) {
        alerts.push({
          type: 'warning',
          title: `Overdue Order Deadline!`,
          desc: `${o.title} (${o.clientName}) passed target date.`,
          actionLabel: 'View pipeline',
          action: () => quickRoute('crm', 'orders')
        });
      }
    });

    // Check 3: Upcoming Staff Leave pending review
    const pendingLeaves = Store.getAll(Store.COLLECTIONS.LEAVES).filter(l => l.status === 'Pending');
    pendingLeaves.forEach(pl => {
      alerts.push({
        type: 'info',
        title: `Pending Leave Request`,
        desc: `${pl.employeeName} requests ${pl.days} days starting ${Utils.formatDateShort(pl.startDate)}`,
        actionLabel: 'Review',
        action: () => quickRoute('hrm', 'leaves')
      });
    });

    if (alerts.length === 0) {
      feed.innerHTML = `
        <div class="text-center p-6 text-muted text-xs">
          ✅ All operational pipelines are on schedule. No alerts!
        </div>
      `;
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

  // Helper to trigger route changes to subtabs directly from other modules
  function quickRoute(route, subtab = null) {
    navigate(route);
    
    // Trigger specific tab if loaded
    if (subtab) {
      setTimeout(() => {
        const tabBtn = Utils.$(`.tab-btn[data-tab="${subtab}"]`);
        if (tabBtn) tabBtn.click();
      }, 50);
    }
  }

  // ==========================================
  // CONFIGURATION & SETTINGS SCREEN
  // ==========================================
  
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

          <!-- Data Backups & Reset Utilities -->
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

    // Hook forms submit
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

    // Hook data utility buttons
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

  // ---------- Backup & Restore logic ----------
  
  function exportSandboxData() {
    const backup = {};
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('pc_suite_')) {
        backup[key] = localStorage.getItem(key);
      }
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
        Object.entries(backup).forEach(([key, val]) => {
          localStorage.setItem(key, val);
        });
        Utils.showToast('Database restored. Reloading operations dashboard.', 'success');
        setTimeout(() => navigate('dashboard'), 1000);
      } catch (err) {
        console.error(err);
        Utils.showToast('Invalid backup file formatting.', 'error');
      }
    };
    reader.readAsText(file);
  }

  // ==========================================
  // DYNAMIC MODALS MANAGER
  // ==========================================
  
  function showModal({ title, content, submitText = 'Submit', cancelText = 'Cancel', hideCancel = false, modalSize = '', onSubmit }) {
    // Clean existing modals
    closeModal();

    const overlay = Utils.createElement('div', {
      className: `modal-overlay active`
    });

    overlay.innerHTML = `
      <div class="modal ${modalSize}">
        <div class="modal-header">
          <div class="modal-title">${Utils.sanitizeHTML(title)}</div>
          <button class="modal-close" id="modal-close-btn">×</button>
        </div>
        <div class="modal-body">
          ${content}
        </div>
        <div class="modal-footer">
          ${hideCancel ? '' : `<button class="btn btn-secondary" id="modal-cancel-btn">${cancelText}</button>`}
          <button class="btn btn-primary" id="modal-submit-btn">${submitText}</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    // Event listeners
    const close = () => closeModal();
    Utils.$('#modal-close-btn', overlay).addEventListener('click', close);
    if (!hideCancel) {
      Utils.$('#modal-cancel-btn', overlay).addEventListener('click', close);
    }

    const submit = Utils.$('#modal-submit-btn', overlay);
    submit.addEventListener('click', () => {
      if (onSubmit) {
        const success = onSubmit(overlay);
        if (success !== false) {
          close();
        }
      } else {
        close();
      }
    });

    // Close on clicking overlay outside modal container
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        close();
      }
    });
  }

  function closeModal() {
    const overlays = Utils.$$('.modal-overlay');
    overlays.forEach(overlay => {
      overlay.classList.remove('active');
      // Delay removal to allow zoom animations to complete
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
      onSubmit: () => {
        if (onConfirm) onConfirm();
        return true;
      }
    });
  }

  function showNotificationsSummary() {
    const invoices = Store.getAll(Store.COLLECTIONS.INVOICES);
    const overdue = invoices.filter(i => i.status === 'Sent' && new Date(i.dueDate) < new Date());

    const contentHTML = `
      <div class="d-flex flex-col gap-3">
        <h4 class="text-sm font-semibold text-gold mb-1">Overdue Invoices (${overdue.length})</h4>
        ${overdue.length === 0 ? `
          <div class="text-xs text-muted p-4 text-center rounded-md" style="background: rgba(255,255,255,0.01); border: 1px dashed var(--pc-border)">
            No overdue invoices at this time.
          </div>
        ` : `
          <div class="d-flex flex-col gap-2">
            ${overdue.map(i => `
              <div class="p-3 rounded-md d-flex justify-between items-center text-xs" style="background: rgba(248,113,113,0.03); border: 1px solid var(--pc-border)">
                <div>
                  <div class="font-semibold text-gold">${i.invoiceNumber}</div>
                  <div class="text-muted mt-1 font-light">${Utils.sanitizeHTML(i.clientName)} | Due: ${Utils.formatDate(i.dueDate)}</div>
                </div>
                <div class="font-mono font-bold text-danger">${Utils.formatCurrency(i.total)}</div>
              </div>
            `).join('')}
          </div>
        `}
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

  // ---------- Employee Authentication ----------
  function checkAuthSession() {
    const user = Store.getCurrentUser();
    const loginOverlay = Utils.$('#login-overlay');
    if (user) {
      loginOverlay.classList.remove('active');
      applySidebarPermissions(user);
      navigate('dashboard');
    } else {
      loginOverlay.classList.add('active');
    }
  }

  function setupAuthListeners() {
    // Login form submission
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
          checkAuthSession();
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

    // Logout click trigger on sidebar footer profile
    const userTrigger = Utils.$('#sidebar-user-trigger');
    if (userTrigger) {
      userTrigger.addEventListener('click', () => {
        showConfirm({
          title: 'Sign Out Operations',
          text: 'Are you sure you want to end your current dashboard session?',
          confirmText: 'Sign Out',
          onConfirm: () => {
            Store.logout();
            location.reload();
          }
        });
      });
    }
  }

  function applySidebarPermissions(user) {
    const perms = user.permissions || { crm: true, hrm: true, accounting: true, admin: true };
    
    // Hide sections that the user does not have access to
    Utils.$$('.sidebar-section').forEach(section => {
      const links = Utils.$$('.sidebar-link', section);
      if (links.length > 0) {
        const route = links[0].dataset.route;
        if (route === 'crm' && !perms.crm) section.style.display = 'none';
        else if (route === 'hrm' && !perms.hrm) section.style.display = 'none';
        else if (route === 'accounting' && !perms.accounting) section.style.display = 'none';
        else if (route === 'admin' && !perms.admin) section.style.display = 'none';
        else section.style.display = 'block';
      }
    });

    // Populate sidebar user avatar details
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
    if (roleEl) roleEl.textContent = user.role;
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

  return {
    init,
    navigate,
    quickRoute,
    showModal,
    closeModal,
    showConfirm
  };
})();

// Execute application initialization when DOM loaded
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
