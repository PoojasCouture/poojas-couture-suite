/* ============================================================
   POOJA'S COUTURE — Admin Module
   System Users, Permissions, Audit Logs, and Storage Diagnostics
   ============================================================ */

const Admin = (() => {
  let activeTab = 'users';

  function init() {
    try { activeTab = localStorage.getItem('pc_tab_admin') || 'users'; } catch(e) { activeTab = 'users'; }
    render();
  }

  function render() {
    const container = Utils.$('#main-content-area');
    if (!container) return;

    container.innerHTML = `
      <div class="page-header animate-fade-in">
        <div>
          <h1 class="page-title">Admin Center</h1>
          <p class="page-subtitle">Configure system users, review activity audit logs, and monitor database statistics</p>
        </div>
        <div class="page-actions" id="admin-page-actions">
          <!-- Actions filled dynamically -->
        </div>
      </div>

      <div class="animate-fade-in" style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px;">
        <button class="tab-btn ${activeTab === 'users' ? 'active' : ''}" data-tab="users" style="font-size:14px;padding:8px 18px;border-radius:20px;font-weight:600;">System Users</button>
        <button class="tab-btn ${activeTab === 'logs' ? 'active' : ''}" data-tab="logs" style="font-size:14px;padding:8px 18px;border-radius:20px;font-weight:600;">Audit Logs</button>
        <button class="tab-btn ${activeTab === 'metrics' ? 'active' : ''}" data-tab="metrics" style="font-size:14px;padding:8px 18px;border-radius:20px;font-weight:600;">System Diagnostics</button>
      </div>

      <div id="admin-tab-content" class="animate-fade-in stagger-2">
        <!-- Subtab loaded dynamically -->
      </div>
    `;

    Utils.$$('.tab-btn', container).forEach(btn => {
      btn.addEventListener('click', (e) => {
        activeTab = e.target.dataset.tab;
          try { localStorage.setItem('pc_tab_admin', activeTab); } catch(e) {}
        Utils.$$('.tab-btn', container).forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        renderSubTab();
      });
    });

    renderSubTab();
  }

  function renderSubTab() {
    const actionContainer = Utils.$('#admin-page-actions');
    const contentContainer = Utils.$('#admin-tab-content');
    if (!contentContainer || !actionContainer) return;

    actionContainer.innerHTML = '';
    contentContainer.innerHTML = '';

    if (activeTab === 'users') {
      renderUsers(contentContainer, actionContainer);
    } else if (activeTab === 'logs') {
      renderLogs(contentContainer, actionContainer);
    } else if (activeTab === 'metrics') {
      renderMetrics(contentContainer, actionContainer);
    }
  }

  // ==========================================
  // SYSTEM USERS & PERMISSIONS
  // ==========================================
  
  function renderUsers(container, actions) {
    container.innerHTML = `
      <div class="card p-0">
        <div class="card-header">
          <div class="card-title">Staff Portal Permissions</div>
        </div>
        <div class="table-container" style="border: none; border-radius: 0;">
          <table class="data-table">
            <thead>
              <tr>
                <th>User Details</th>
                <th>Role</th>
                <th style="text-align: center;">CRM Access</th>
                <th style="text-align: center;">HRM Access</th>
                <th style="text-align: center;">Accounting Access</th>
                <th style="text-align: center;">Admin Panel</th>
                <th style="text-align: center;">Social CRM Studio</th>
                <th style="width: 100px; text-align: right;">Save</th>
              </tr>
            </thead>
            <tbody id="admin-users-tbody">
              <!-- Populated by JS -->
            </tbody>
          </table>
        </div>
      </div>
    `;

    const employees = Store.getAll(Store.COLLECTIONS.EMPLOYEES);
    const tbody = Utils.$('#admin-users-tbody', container);
    tbody.innerHTML = '';

    employees.forEach(emp => {
      const tr = Utils.createElement('tr');
      const initials = Utils.getInitials(emp.name);
      const avatarBg = Utils.getAvatarColor(emp.name);

      // Default permissions if missing
      const perms = emp.permissions || { crm: false, hrm: false, accounting: false, admin: false, socialCrm: false };

      tr.innerHTML = `
        <td>
          <div class="user-cell">
            <div class="avatar avatar-sm" style="background: ${avatarBg}; color: var(--pc-text-inverse)">
              ${initials}
            </div>
            <div class="user-cell-info">
              <div class="user-cell-name">${Utils.sanitizeHTML(emp.name)}</div>
              <div class="text-xs text-muted">${Utils.sanitizeHTML(emp.email)}</div>
            </div>
          </div>
        </td>
        <td>
          <div>${emp.role}</div>
          <div class="text-xs text-muted">${emp.department}</div>
        </td>
        <td style="text-align: center;">
          <input type="checkbox" class="perm-chk" data-emp="${emp.id}" data-perm="crm" ${perms.crm ? 'checked' : ''} ${emp.id === 'e-1' ? 'disabled' : ''}>
        </td>
        <td style="text-align: center;">
          <input type="checkbox" class="perm-chk" data-emp="${emp.id}" data-perm="hrm" ${perms.hrm ? 'checked' : ''} ${emp.id === 'e-1' ? 'disabled' : ''}>
        </td>
        <td style="text-align: center;">
          <input type="checkbox" class="perm-chk" data-emp="${emp.id}" data-perm="accounting" ${perms.accounting ? 'checked' : ''} ${emp.id === 'e-1' ? 'disabled' : ''}>
        </td>
        <td style="text-align: center;">
          <input type="checkbox" class="perm-chk" data-emp="${emp.id}" data-perm="admin" ${perms.admin ? 'checked' : ''} ${emp.id === 'e-1' ? 'disabled' : ''}>
        </td>
        <td style="text-align: center;">
          <input type="checkbox" class="perm-chk" data-emp="${emp.id}" data-perm="socialCrm" ${perms.socialCrm ? 'checked' : ''} ${emp.id === 'e-1' ? 'disabled' : ''}>
        </td>
        <td>
          <div class="table-actions justify-end">
            <button class="btn btn-secondary btn-sm" onclick="Admin.savePermissions('${emp.id}')" ${emp.id === 'e-1' ? 'disabled' : ''}>
              Save
            </button>
          </div>
        </td>
      `;

      tbody.appendChild(tr);
    });
  }

  async function savePermissions(empId) {
    const checkBoxes = Utils.$$(`.perm-chk[data-emp="${empId}"]`);
    const newPerms = {};

    checkBoxes.forEach(chk => {
      newPerms[chk.dataset.perm] = chk.checked;
    });

    const emp = Store.getById(Store.COLLECTIONS.EMPLOYEES, empId);
    if (!emp) return;

    const result = await Store.update(Store.COLLECTIONS.EMPLOYEES, empId, { permissions: newPerms });
    if (!result) {
      Utils.showToast(`Failed to save permissions for ${emp.name}. Check Supabase column exists.`, 'error');
      return;
    }

    // If the updated user is the currently logged-in user, refresh their session
    const currentUser = Store.getCurrentUser();
    if (currentUser && currentUser.id === empId) {
      Store.setCurrentUser({ ...currentUser, permissions: newPerms });
    }

    Utils.showToast(`Permissions updated for ${emp.name}.`, 'success');

    // Log the audit action
    const permString = Object.entries(newPerms)
      .map(([k, v]) => `${k.toUpperCase()}:${v ? 'Yes' : 'No'}`)
      .join(', ');

    Store.logAction(
      'Updated Permissions',
      'System',
      `Modified system access rights for ${emp.name}: [${permString}]`
    );
  }

  // ==========================================
  // AUDIT LOGS TIMELINE
  // ==========================================
  
  function renderLogs(container, actions) {
    actions.innerHTML = `
      <button class="btn btn-danger btn-sm" id="btn-clear-logs">
        🗑️ Clear Audit Trail
      </button>
    `;

    Utils.$('#btn-clear-logs').addEventListener('click', () => {
      App.showConfirm({
        title: 'Clear System Logs',
        text: 'Are you sure you want to delete the audit trail history? This action is permanent and is logged itself.',
        confirmText: 'Yes, Delete Logs',
        onConfirm: () => {
          // Log clearing logs first, then purge but keep the log of the purge!
          const purgeEntry = {
            id: 'log-' + Utils.generateId(),
            timestamp: new Date().toISOString(),
            user: 'Pooja Shah',
            category: 'System',
            action: 'Audit Log Cleared',
            details: 'The system audit logs history was manually cleared by the administrator.'
          };
          localStorage.setItem('pc_suite_audit_logs', JSON.stringify([purgeEntry]));
          Utils.showToast('Audit trail purged.');
          renderSubTab();
        }
      });
    });

    container.innerHTML = `
      <div class="card p-0">
        <div class="card-header flex-wrap gap-4">
          <div class="filter-bar m-0">
            <div class="filter-search">
              <span class="filter-search-icon">🔍</span>
              <input type="text" id="log-search" class="form-input" placeholder="Search audit logs...">
            </div>
            <select id="log-filter-cat" class="form-select">
              <option value="all">All Categories</option>
              <option value="CRM">CRM operations</option>
              <option value="HRM">HRM operations</option>
              <option value="Accounting">Accounting operations</option>
              <option value="System">System configuration</option>
            </select>
            <input type="date" id="log-filter-from" class="form-input" title="From date">
            <input type="date" id="log-filter-to" class="form-input" title="To date">
            <button class="btn btn-ghost btn-sm" id="log-filter-clear" title="Clear date range">Clear dates</button>
          </div>
          <div class="text-muted text-sm font-mono" id="log-count">0 logs found</div>
        </div>

        <div class="table-container" style="border: none; border-radius: 0;">
          <table class="data-table">
            <thead>
              <tr>
                <th style="width: 160px;">Timestamp</th>
                <th style="width: 120px;">Operator</th>
                <th style="width: 120px;">Module</th>
                <th style="width: 180px;">Operation</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody id="admin-logs-tbody">
              <!-- Logs loaded dynamically -->
            </tbody>
          </table>
        </div>
      </div>
    `;

    const searchInput = Utils.$('#log-search', container);
    const catFilter = Utils.$('#log-filter-cat', container);
    const fromInput = Utils.$('#log-filter-from', container);
    const toInput = Utils.$('#log-filter-to', container);

    const refreshLogs = () => {
      const query = searchInput.value.toLowerCase();
      const cat = catFilter.value;
      const logs = Store.getAll(Store.COLLECTIONS.AUDIT_LOGS);

      // Sort logs newest first
      logs.sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));

      // Date range (inclusive). 'to' extends to end-of-day so that day is included.
      const fromTs = fromInput.value ? new Date(fromInput.value + 'T00:00:00').getTime() : null;
      const toTs = toInput.value ? new Date(toInput.value + 'T23:59:59').getTime() : null;

      const filtered = logs.filter(l => {
        const matchesQuery = l.action.toLowerCase().includes(query) ||
                             l.details.toLowerCase().includes(query) ||
                             l.user.toLowerCase().includes(query);
        const matchesCat = cat === 'all' || l.category === cat;
        const t = new Date(l.timestamp).getTime();
        const matchesFrom = fromTs === null || t >= fromTs;
        const matchesTo = toTs === null || t <= toTs;
        return matchesQuery && matchesCat && matchesFrom && matchesTo;
      });

      Utils.$('#log-count').textContent = `Showing ${filtered.length} of ${logs.length} operations`;

      const tbody = Utils.$('#admin-logs-tbody', container);
      tbody.innerHTML = '';

      if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center p-8 text-muted">No audit logs found matching criteria.</td></tr>`;
        return;
      }

      filtered.forEach(l => {
        const tr = Utils.createElement('tr');
        
        let catBadge = 'badge-muted';
        if (l.category === 'CRM') catBadge = 'badge-gold';
        else if (l.category === 'HRM') catBadge = 'badge-info';
        else if (l.category === 'Accounting') catBadge = 'badge-success';
        else if (l.category === 'System') catBadge = 'badge-purple';

        tr.innerHTML = `
          <td class="font-mono text-xs text-muted">${Utils.formatDateTime(l.timestamp)}</td>
          <td class="font-medium">${Utils.sanitizeHTML(l.user)}</td>
          <td><span class="badge ${catBadge}">${l.category}</span></td>
          <td class="font-semibold text-gold">${Utils.sanitizeHTML(l.action)}</td>
          <td class="font-light text-xs text-muted" style="white-space: pre-line;">${Utils.sanitizeHTML(l.details)}</td>
        `;
        tbody.appendChild(tr);
      });
    };

    searchInput.addEventListener('input', Utils.debounce(refreshLogs));
    catFilter.addEventListener('change', refreshLogs);
    fromInput.addEventListener('change', refreshLogs);
    toInput.addEventListener('change', refreshLogs);
    Utils.$('#log-filter-clear', container).addEventListener('click', () => {
      fromInput.value = ''; toInput.value = ''; refreshLogs();
    });
    refreshLogs();
  }

  // ==========================================
  // SYSTEM DIAGNOSTICS & METRICS
  // ==========================================
  
  function renderMetrics(container, actions) {
    // 1. Calculate localStorage Usage
    let totalBytes = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      totalBytes += key.length + localStorage.getItem(key).length;
    }
    const kbUsed = (totalBytes / 1024).toFixed(2);
    // Typical localStorage limit is 5MB (5,242,880 bytes)
    const pctUsed = (totalBytes / (5 * 1024 * 1024) * 100).toFixed(4);

    // 2. Fetch collection counts
    const collections = [
      { name: 'Brides & Clients', count: Store.getAll(Store.COLLECTIONS.CLIENTS).length, icon: '👤', key: 'clients' },
      { name: 'Consultations', count: Store.getAll(Store.COLLECTIONS.APPOINTMENTS).length, icon: '📅', key: 'appointments' },
      { name: 'Custom Outfits Orders', count: Store.getAll(Store.COLLECTIONS.ORDERS).length, icon: '🧵', key: 'orders' },
      { name: 'Staff Employees', count: Store.getAll(Store.COLLECTIONS.EMPLOYEES).length, icon: '👥', key: 'employees' },
      { name: 'Absence Leaves', count: Store.getAll(Store.COLLECTIONS.LEAVES).length, icon: '✈️', key: 'leaves' },
      { name: 'Wages Payrolls', count: Store.getAll(Store.COLLECTIONS.PAYROLL).length, icon: '📄', key: 'payroll' },
      { name: 'Sales Invoices', count: Store.getAll(Store.COLLECTIONS.INVOICES).length, icon: '💰', key: 'invoices' },
      { name: 'Wages & Material Expenses', count: Store.getAll(Store.COLLECTIONS.EXPENSES).length, icon: '💸', key: 'expenses' },
      { name: 'Security Audit Logs', count: Store.getAll(Store.COLLECTIONS.AUDIT_LOGS).length, icon: '🔒', key: 'audit_logs' }
    ];

    container.innerHTML = `
      <div class="d-grid gap-6" style="grid-template-columns: 1fr 2fr;">
        <!-- Left Column: Storage Usage Gauge -->
        <div class="d-flex flex-col gap-4">
          <div class="card p-6 text-center">
            <h3 class="font-display text-sm mb-4">LocalStorage Sandbox Space</h3>
            
            <div style="position: relative; width: 140px; height: 140px; margin: 0 auto 16px auto;">
              <!-- Circle Progress Draw SVG -->
              <svg viewBox="0 0 36 36" style="width: 100%; height: 100%;">
                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#222230" stroke-width="3" />
                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="url(#goldGradient)" stroke-width="3" stroke-dasharray="${pctUsed * 5 > 100 ? 100 : pctUsed * 5}, 100" />
                
                <defs>
                  <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color="#ECB676" />
                    <stop offset="100%" stop-color="#CA8F55" />
                  </linearGradient>
                </defs>
              </svg>
              <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center;">
                <div class="font-mono text-sm font-semibold text-gold">${pctUsed}%</div>
                <div class="text-xs text-muted">Used</div>
              </div>
            </div>

            <div class="text-xs font-mono mt-2">
              <div>Bytes Used: ${totalBytes.toLocaleString()} B</div>
              <div class="text-muted mt-1">Kilobytes: ${kbUsed} KB / 5,120 KB</div>
            </div>
          </div>

          <div class="card p-5">
            <h4 class="text-xs font-semibold text-gold mb-2">Browser Storage Sandbox info</h4>
            <p class="text-xs text-muted font-light m-0">
              Web browser localStorage handles key-value databases on device disks. Clearing cache in browser history will dump this database unless backup files are exported via Configuration settings regularly.
            </p>
          </div>
        </div>

        <!-- Right Column: Collection Record Counts -->
        <div class="card p-6">
          <div class="card-title mb-4">Sandbox Database Counts</div>
          <div class="d-grid gap-4" style="grid-template-columns: 1fr 1fr; grid-row-gap: var(--sp-4);">
            ${collections.map(c => `
              <div class="d-flex items-center gap-3 p-3 rounded-md" style="background: rgba(255,255,255,0.01); border: 1px solid var(--pc-border);">
                <div class="avatar avatar-sm badge-gold" style="font-size: 16px;">${c.icon}</div>
                <div>
                  <div class="text-xs text-muted font-light">${c.name}</div>
                  <div class="font-mono font-bold text-md mt-1">${c.count} records</div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  }

  return {
    init,
    savePermissions
  };
})();
