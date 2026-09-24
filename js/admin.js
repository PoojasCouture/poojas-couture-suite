/* ============================================================
   POOJA'S COUTURE — Admin Module
   System Users, Permissions, Audit Logs, and Storage Diagnostics
   ============================================================ */

const Admin = (() => {
  let activeTab = 'users';

  function init() {
    try { activeTab = localStorage.getItem('pc_tab_admin') || 'users'; } catch(e) { activeTab = 'users'; }
    if (!['users','logs','metrics'].includes(activeTab)) activeTab = 'users';
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
        <button class="tab-btn tab-btn-icon ${activeTab === 'users' ? 'active' : ''}" data-tab="users" data-tooltip="System Users"><img src="/assets/01_team_dolls.png" alt="System Users"></button>
        <button class="tab-btn tab-btn-icon ${activeTab === 'logs' ? 'active' : ''}" data-tab="logs" data-tooltip="Audit Logs"><img src="/assets/14_logbook.png" alt="Audit Logs"></button>
        <button class="tab-btn tab-btn-icon ${activeTab === 'metrics' ? 'active' : ''}" data-tab="metrics" data-tooltip="System Diagnostics"><img src="/assets/07_gears.png" alt="System Diagnostics"></button>
      </div>

      <div id="admin-tab-content" class="animate-fade-in stagger-2">
        <!-- Subtab loaded dynamically -->
      </div>
    `;

    Utils.$$('.tab-btn', container).forEach(btn => {
      btn.addEventListener('click', (e) => {
        activeTab = btn.dataset.tab;
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
    actions.innerHTML = `
      <button class="btn btn-primary btn-icon" onclick="Admin.showAddUserModal()" title="Add User">👤</button>
    `;

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
                <th style="text-align: center;" title="Sales Dashboard (CRM)"><span class="perm-header-icon" style="color:rgb(212,168,75);--glow:rgba(212,168,75,0.65)"><i class="ph ph-crown-simple"></i></span></th>
                <th style="text-align: center;" title="Human Capital (HRM)"><span class="perm-header-icon" style="color:rgb(150,110,190);--glow:rgba(150,110,190,0.65)"><i class="ph ph-users-three"></i></span></th>
                <th style="text-align: center;" title="Accounting &amp; Finance"><span class="perm-header-icon" style="color:rgb(70,170,190);--glow:rgba(70,170,190,0.65)"><i class="ph ph-coins"></i></span></th>
                <th style="text-align: center;" title="Admin Center"><span class="perm-header-icon" style="color:rgb(200,90,90);--glow:rgba(200,90,90,0.65)"><i class="ph ph-lock-key"></i></span></th>
                <th style="text-align: center;" title="Social CRM Studio"><span class="perm-header-icon" style="color:rgb(220,140,90);--glow:rgba(220,140,90,0.65)"><i class="ph ph-sparkle"></i></span></th>
                <th style="text-align: center;" title="Tailor Portal"><span class="perm-header-icon" style="color:rgb(200,150,190);--glow:rgba(200,150,190,0.65)"><i class="ph ph-needle"></i></span></th>
                <th style="text-align: center;" title="Shipping Portal"><span class="perm-header-icon" style="color:rgb(90,110,210);--glow:rgba(90,110,210,0.65)"><i class="ph ph-airplane-tilt"></i></span></th>
                <th style="text-align: center;" title="Try-On Kiosk (also auto-granted to Admin &amp; Operations roles)"><span class="perm-header-icon" style="color:rgb(236,182,118);--glow:rgba(236,182,118,0.65)"><i class="ph ph-camera"></i></span></th>
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
      const perms = emp.permissions || { crm: false, hrm: false, accounting: false, admin: false, socialCrm: false, tailor: false, shipping: false, kiosk: false };

      tr.innerHTML = `
        <td>
          <div class="user-cell" style="cursor:pointer" onclick="Admin.showUserDetails('${emp.id}')" title="View details">
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
        <td style="text-align: center;">
          <input type="checkbox" class="perm-chk" data-emp="${emp.id}" data-perm="tailor" ${perms.tailor ? 'checked' : ''} ${emp.id === 'e-1' ? 'disabled' : ''}>
        </td>
        <td style="text-align: center;">
          <input type="checkbox" class="perm-chk" data-emp="${emp.id}" data-perm="shipping" ${perms.shipping ? 'checked' : ''} ${emp.id === 'e-1' ? 'disabled' : ''}>
        </td>
        <td style="text-align: center;">
          <input type="checkbox" class="perm-chk" data-emp="${emp.id}" data-perm="kiosk" ${perms.kiosk ? 'checked' : ''} ${emp.id === 'e-1' ? 'disabled' : ''}>
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

  // Kiosk access is role-based (see js/access.js), not a per-user
  // checkbox like the other columns -- this reads the same table so
  // the Admin Centre display can never disagree with the real gate.
  function hasKioskAccess(emp) {
    const role = (emp.appRole || emp.app_role || '').toLowerCase();
    if (!window.AccessControl) return false;
    const access = AccessControl.getRoleAccess(role, false, false);
    return !!(access && access.kioskPortal);
  }

  async function savePermissions(empId) {
    const checkBoxes = Utils.$$(`.perm-chk[data-emp="${empId}"]`);
    const newPerms = {};

    checkBoxes.forEach(chk => {
      newPerms[chk.dataset.perm] = chk.checked;
    });

    const emp = Store.getById(Store.COLLECTIONS.EMPLOYEES, empId);
    if (!emp) return;

    // Write directly via Supabase client — bypass Store.update to avoid
    // any caching or field-mapping issues, and get the raw error if it fails.
    const supabase = Store.getClient();
    if (!supabase) {
      Utils.showToast('Supabase client not available.', 'error');
      return;
    }

    const { data, error } = await supabase
      .from('employees')
      .update({ permissions: newPerms })
      .eq('id', empId)
      .select('id, permissions')
      .single();

    if (error) {
        console.error('Failed:', error); Utils.showToast('Failed. Please try again.', 'error');
      return;
    }


    // Update local cache so UI reflects change without page reload
    Store.updateCache('employees', empId, { permissions: newPerms });

    // If this is the currently logged-in user, update their live session too
    const currentUser = Store.getCurrentUser();
    if (currentUser && currentUser.id === empId) {
      Store.setCurrentUser({ ...currentUser, permissions: newPerms });
    }

    Utils.showToast(`Permissions saved for ${emp.name}. Changes take effect on their next login.`, 'success');

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
      <button class="btn btn-danger btn-icon" id="btn-clear-logs" title="Clear Audit Trail">🗑️</button>
    `;

    Utils.$('#btn-clear-logs').addEventListener('click', () => {
      App.showConfirm({
        title: 'Clear System Logs',
        text: 'Are you sure you want to permanently delete the audit trail history? This action cannot be undone. A record of this action will be kept.',
        confirmText: 'Yes, Delete Logs',
        onConfirm: async () => {
          try {
            const allLogs = Store.getAll(Store.COLLECTIONS.AUDIT_LOGS);
            const ids = allLogs.map(l => l.id);
            if (ids.length > 0) {
              const c = Store.getClient();
              const { error } = await c.from('audit_logs').delete().in('id', ids);
              if (error) throw error;
            }
            await Store.refresh('audit_logs');
            const currentUser = Store.getCurrentUser();
            await Store.logAction(
              'Audit Log Cleared', 'System',
              `${ids.length} audit log entries were manually cleared by the administrator.`,
              currentUser ? currentUser.name : 'Unknown'
            );
            Utils.showToast('Audit trail purged (' + ids.length + ' entries).');
            renderSubTab();
          } catch (err) {
            console.error('Audit log purge failed:', err);
            console.error('Failed to clear logs:', err); Utils.showToast('Failed to clear logs. Please try again.', 'error');
          }
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
      { name: 'Brides & Clients', count: Store.getAll(Store.COLLECTIONS.CLIENTS).length, icon: '👤', key: 'clients', route: 'crm', subtab: 'clients' },
      { name: 'Consultations', count: Store.getAll(Store.COLLECTIONS.APPOINTMENTS).length, icon: '📅', key: 'appointments', route: 'crm', subtab: 'appointments' },
      { name: 'Custom Outfits Orders', count: Store.getAll(Store.COLLECTIONS.ORDERS).length, icon: '🧵', key: 'orders', route: 'crm', subtab: 'orders' },
      { name: 'Staff Employees', count: Store.getAll(Store.COLLECTIONS.EMPLOYEES).length, icon: '👥', key: 'employees', route: 'hrm', subtab: 'employees' },
      { name: 'Absence Leaves', count: Store.getAll(Store.COLLECTIONS.LEAVES).length, icon: '✈️', key: 'leaves', route: 'hrm', subtab: 'leaves' },
      { name: 'Wages Payrolls', count: Store.getAll(Store.COLLECTIONS.PAYROLL).length, icon: '📄', key: 'payroll', route: 'hrm', subtab: 'payroll' },
      { name: 'Sales Invoices', count: Store.getAll(Store.COLLECTIONS.INVOICES).length, icon: '💰', key: 'invoices', route: 'accounting', subtab: 'invoices' },
      { name: 'Wages & Material Expenses', count: Store.getAll(Store.COLLECTIONS.EXPENSES).length, icon: '💸', key: 'expenses', route: 'accounting', subtab: 'expenses' },
      { name: 'Security Audit Logs', count: Store.getAll(Store.COLLECTIONS.AUDIT_LOGS).length, icon: '🔒', key: 'audit_logs', route: 'admin', subtab: 'logs' }
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
              <div class="d-flex items-center gap-3 p-3 rounded-md" style="cursor:pointer;background: rgba(255,255,255,0.01); border: 1px solid var(--pc-border);" onclick="App.quickRoute('${c.route}','${c.subtab}')">
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

  // ==========================================
  // ADD USER (new login + employee record)
  // ==========================================

  function showAddUserModal() {
    App.showModal({
      title: 'Add User',
      submitText: 'Create User',
      content: `
        <form id="add-user-form" class="animate-fade-in-scale">
          <div class="form-group">
            <label class="form-label">Full Name <span class="required">*</span></label>
            <input type="text" name="name" class="form-input" required>
          </div>
          <div class="form-group">
            <label class="form-label">Email <span class="required">*</span></label>
            <input type="email" name="email" class="form-input" required>
          </div>
          <div class="form-group">
            <label class="form-label">Temporary Password <span class="required">*</span></label>
            <input type="text" name="password" class="form-input" required minlength="8" placeholder="Min 8 characters">
            <div class="text-xs text-muted mt-1">Tell the user to change this after their first login.</div>
          </div>
          <div class="form-group">
            <label class="form-label">Department</label>
            <input type="text" name="department" class="form-input" placeholder="e.g. Operations">
          </div>
          <div class="form-group">
            <label class="form-label">Role Title</label>
            <input type="text" name="role" class="form-input" placeholder="e.g. Social CRM">
          </div>
          <div class="form-group m-0">
            <label class="form-label">Portal Access</label>
            <div class="d-flex flex-wrap gap-3 mt-2">
              <label class="d-flex items-center gap-2"><input type="checkbox" name="perm_crm"> Sales Dashboard (CRM)</label>
              <label class="d-flex items-center gap-2"><input type="checkbox" name="perm_hrm"> Human Capital (HRM)</label>
              <label class="d-flex items-center gap-2"><input type="checkbox" name="perm_accounting"> Accounting</label>
              <label class="d-flex items-center gap-2"><input type="checkbox" name="perm_admin"> Admin Center</label>
              <label class="d-flex items-center gap-2"><input type="checkbox" name="perm_socialCrm"> Social CRM Studio</label>
              <label class="d-flex items-center gap-2"><input type="checkbox" name="perm_tailor"> Tailor Portal</label>
              <label class="d-flex items-center gap-2"><input type="checkbox" name="perm_shipping"> Shipping Portal</label>
              <label class="d-flex items-center gap-2"><input type="checkbox" name="perm_kiosk"> Try-On Kiosk</label>
            </div>
          </div>
          <div id="add-user-error" class="text-xs mt-2" style="color: var(--pc-danger, #c85a5a); display:none;"></div>
        </form>
      `,
      // Note: showModal's onSubmit is not awaited by the caller, so this
      // always returns false (never auto-closes) and closes the modal
      // itself once the async create call actually resolves. Same
      // pattern as App.showChangePasswordModal — keep them in sync.
      onSubmit: (overlay) => {
        submitAddUser(overlay);
        return false;
      }
    });
  }

  async function submitAddUser(overlay) {
    const form = Utils.$('#add-user-form', overlay);
    const errBox = Utils.$('#add-user-error', overlay);
    const submitBtn = Utils.$('#modal-submit-btn', overlay);
    errBox.style.display = 'none';

    const fd = new FormData(form);
    const name = (fd.get('name') || '').trim();
    const email = (fd.get('email') || '').trim();
    const password = fd.get('password') || '';
    const department = (fd.get('department') || '').trim();
    const role = (fd.get('role') || '').trim();

    const permissions = {
      crm: !!fd.get('perm_crm'),
      hrm: !!fd.get('perm_hrm'),
      accounting: !!fd.get('perm_accounting'),
      admin: !!fd.get('perm_admin'),
      socialCrm: !!fd.get('perm_socialCrm'),
      tailor: !!fd.get('perm_tailor'),
      shipping: !!fd.get('perm_shipping'),
      kiosk: !!fd.get('perm_kiosk')
    };

    if (!name || !email || !password) {
      errBox.textContent = 'Name, email, and password are required.';
      errBox.style.display = 'block';
      return;
    }
    if (password.length < 8) {
      errBox.textContent = 'Password must be at least 8 characters.';
      errBox.style.display = 'block';
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Creating…';

    try {
      const client = Store.getClient();
      const { data: sessionData } = await client.auth.getSession();
      const token = sessionData && sessionData.session ? sessionData.session.access_token : null;
      if (!token) {
        errBox.textContent = 'Your session has expired. Please log in again.';
        errBox.style.display = 'block';
        submitBtn.disabled = false;
        submitBtn.textContent = 'Create User';
        return;
      }

      const res = await fetch('/api/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, name, email, password, department, role, permissions })
      });
      const result = await res.json();

      if (!result.ok) {
        errBox.textContent = result.error || 'Failed to create user.';
        errBox.style.display = 'block';
        submitBtn.disabled = false;
        submitBtn.textContent = 'Create User';
        return;
      }

      // Refresh employees cache so the new row shows up immediately
      if (Store.refresh) { try { await Store.refresh('employees'); } catch (e) {} }

      Store.logAction(
        'Created User',
        'System',
        `Created new login for ${name} (${email})`
      );

      Utils.showToast(`User ${name} created.`, 'success');
      App.closeModal();
      renderSubTab();
    } catch (e) {
      errBox.textContent = 'Network error: ' + e.message;
      errBox.style.display = 'block';
      submitBtn.disabled = false;
      submitBtn.textContent = 'Create User';
    }
  }

  // ==========================================
  // USER DETAILS (view-only)
  // ==========================================

  function showUserDetails(empId) {
    const emp = Store.getById(Store.COLLECTIONS.EMPLOYEES, empId);
    if (!emp) return;

    const perms = emp.permissions || {};
    const permLabels = {
      crm: 'Sales Dashboard (CRM)', hrm: 'Human Capital (HRM)', accounting: 'Accounting & Finance',
      admin: 'Admin Center', socialCrm: 'Social CRM Studio', tailor: 'Tailor Portal', shipping: 'Shipping Portal', kiosk: 'Try-On Kiosk'
    };
    const grantedPerms = Object.entries(permLabels)
      .filter(([key]) => perms[key])
      .map(([, label]) => label);
    // Kiosk can also be granted purely by System Role (Admin/Operations
    // always have it -- see hasKioskAccess) even with the checkbox off;
    // note that case separately so real access is never invisible here.
    if (!perms.kiosk && hasKioskAccess(emp)) grantedPerms.push('Try-On Kiosk (via System Role)');

    App.showModal({
      title: 'User Details',
      hideCancel: true,
      submitText: 'Close',
      content: `
        <div class="form-group">
          <label class="form-label">Full Name</label>
          <input type="text" class="form-input" value="${Utils.sanitizeHTML(emp.name)}" disabled>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Email Address</label>
            <input type="email" class="form-input" value="${Utils.sanitizeHTML(emp.email || '')}" disabled>
          </div>
          <div class="form-group">
            <label class="form-label">Phone Number</label>
            <input type="text" class="form-input" value="${Utils.sanitizeHTML(emp.phone || '')}" disabled>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Role Title</label>
            <input type="text" class="form-input" value="${Utils.sanitizeHTML(emp.role || '')}" disabled>
          </div>
          <div class="form-group">
            <label class="form-label">Department</label>
            <input type="text" class="form-input" value="${Utils.sanitizeHTML(emp.department || '')}" disabled>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Location</label>
            <input type="text" class="form-input" value="${Utils.sanitizeHTML(emp.location || '')}" disabled>
          </div>
          <div class="form-group">
            <label class="form-label">Join Date</label>
            <input type="text" class="form-input" value="${emp.joinedDate ? Utils.formatDate(emp.joinedDate) : ''}" disabled>
          </div>
        </div>
        <div class="form-group m-0">
          <label class="form-label">Status</label>
          <input type="text" class="form-input" value="${Utils.sanitizeHTML(emp.status || '')}" disabled>
        </div>
        <div class="form-group m-0 mt-3">
          <label class="form-label">System Role</label>
          <input type="text" class="form-input" value="${Utils.sanitizeHTML(emp.appRole || emp.app_role || '')}" disabled>
        </div>
        <div class="form-group m-0 mt-3">
          <label class="form-label">Portal Access</label>
          ${grantedPerms.length
            ? `<div class="d-flex flex-wrap gap-2 mt-1">${grantedPerms.map(p => `<span class="badge badge-gold">${p}</span>`).join('')}</div>`
            : `<div class="text-xs text-muted mt-1">No portal access granted.</div>`}
        </div>
        <div class="mt-4" style="border-top: 1px solid var(--pc-border); padding-top: 16px;">
          <button type="button" class="btn btn-secondary btn-sm" id="user-details-reset-pw-btn">Reset Password</button>
          <div class="text-xs text-muted mt-1">Sets a new password for this login directly -- no dashboard trip needed.</div>
        </div>
      `,
      onSubmit: () => true
    });

    const resetBtn = document.querySelector('.modal-overlay.active #user-details-reset-pw-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        App.closeModal();
        setTimeout(() => showResetPasswordModal(emp), 200);
      });
    }
  }

  function showResetPasswordModal(emp) {
    App.showModal({
      title: 'Reset Password \u2014 ' + emp.name,
      submitText: 'Set New Password',
      content: `
        <div class="text-xs text-muted mb-3" style="padding:10px 12px;border:1px solid var(--pc-border);border-radius:8px;background:rgba(255,255,255,0.02)">
          \u26a0\ufe0f This immediately replaces ${Utils.sanitizeHTML(emp.name)}'s current password. Tell them the new one directly -- it will not be emailed automatically.
        </div>
        <form id="reset-password-form">
          <div class="form-group">
            <label class="form-label">New Password <span class="required">*</span></label>
            <input type="text" name="newPassword" class="form-input" required minlength="8" placeholder="Min 8 characters">
          </div>
          <div id="reset-password-error" class="text-xs" style="color: var(--pc-danger, #c85a5a); display:none;"></div>
        </form>
      `,
      onSubmit: (overlay) => {
        const form = Utils.$('#reset-password-form', overlay);
        const errBox = Utils.$('#reset-password-error', overlay);
        const submitBtn = Utils.$('#modal-submit-btn', overlay);
        const fd = new FormData(form);
        const newPassword = fd.get('newPassword') || '';

        errBox.style.display = 'none';

        if (newPassword.length < 8) {
          errBox.textContent = 'Password must be at least 8 characters.';
          errBox.style.display = 'block';
          return false;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = 'Setting\u2026';

        (async () => {
          try {
            const client = Store.getClient();
            const { data: sessionData } = await client.auth.getSession();
            const token = sessionData && sessionData.session ? sessionData.session.access_token : null;
            if (!token) {
              errBox.textContent = 'Your session has expired. Please log in again.';
              errBox.style.display = 'block';
              submitBtn.disabled = false;
              submitBtn.textContent = 'Set New Password';
              return;
            }

            const res = await fetch('/api/admin-reset-password', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ token, targetEmail: emp.email, newPassword })
            });
            const result = await res.json();

            if (!result.ok) {
              errBox.textContent = result.error || 'Failed to reset password.';
              errBox.style.display = 'block';
              submitBtn.disabled = false;
              submitBtn.textContent = 'Set New Password';
              return;
            }

            Store.logAction('Reset Password', 'System', `Reset password for ${emp.name} (${emp.email})`);
            Utils.showToast(`Password reset for ${emp.name}.`, 'success');
            App.closeModal();
          } catch (e) {
            errBox.textContent = 'Network error: ' + e.message;
            errBox.style.display = 'block';
            submitBtn.disabled = false;
            submitBtn.textContent = 'Set New Password';
          }
        })();

        return false;
      }
    });
  }

  return {
    init,
    savePermissions,
    showAddUserModal,
    showUserDetails
  };
})();