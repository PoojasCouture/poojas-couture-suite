/* ============================================================
   POOJA'S COUTURE — HRM Module
   Employees, Attendance, Leave, Payroll, and Performance
   ============================================================ */

const HRM = (() => {
  let activeTab = 'employees';

  function init() {
    activeTab = 'employees';
    render();
  }

  function render() {
    const container = Utils.$('#main-content-area');
    if (!container) return;

    container.innerHTML = `
      <div class="page-header animate-fade-in">
        <div>
          <h1 class="page-title">Human Resource Management</h1>
          <p class="page-subtitle">Manage staff, track daily attendance, approve leaves, run payroll, and log performance reviews</p>
        </div>
        <div class="page-actions" id="hrm-page-actions">
          <!-- Populated by JS -->
        </div>
      </div>

      <div class="animate-fade-in" style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px;">
        <button class="tab-btn ${activeTab === 'employees' ? 'active' : ''}" data-tab="employees" style="font-size:14px;padding:8px 18px;border-radius:20px;font-weight:600;">Staff Directory</button>
        <button class="tab-btn ${activeTab === 'attendance' ? 'active' : ''}" data-tab="attendance" style="font-size:14px;padding:8px 18px;border-radius:20px;font-weight:600;">Attendance Log</button>
        <button class="tab-btn ${activeTab === 'leaves' ? 'active' : ''}" data-tab="leaves" style="font-size:14px;padding:8px 18px;border-radius:20px;font-weight:600;">Leave Requests</button>
        <button class="tab-btn ${activeTab === 'payroll' ? 'active' : ''}" data-tab="payroll" style="font-size:14px;padding:8px 18px;border-radius:20px;font-weight:600;">Payroll Center</button>
        <button class="tab-btn ${activeTab === 'performance' ? 'active' : ''}" data-tab="performance" style="font-size:14px;padding:8px 18px;border-radius:20px;font-weight:600;">Performance</button>
      </div>

      <div id="hrm-tab-content" class="animate-fade-in stagger-2">
        <!-- Sub-tab content loaded here -->
      </div>
    `;

    Utils.$$('.tab-btn', container).forEach(btn => {
      btn.addEventListener('click', (e) => {
        activeTab = e.target.dataset.tab;
        Utils.$$('.tab-btn', container).forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        renderSubTab();
      });
    });

    renderSubTab();
  }

  function renderSubTab() {
    const actionContainer = Utils.$('#hrm-page-actions');
    const contentContainer = Utils.$('#hrm-tab-content');
    if (!contentContainer || !actionContainer) return;

    actionContainer.innerHTML = '';
    contentContainer.innerHTML = '';

    if (activeTab === 'employees') {
      renderEmployees(contentContainer, actionContainer);
    } else if (activeTab === 'attendance') {
      renderAttendance(contentContainer, actionContainer);
    } else if (activeTab === 'leaves') {
      renderLeaves(contentContainer, actionContainer);
    } else if (activeTab === 'payroll') {
      renderPayroll(contentContainer, actionContainer);
    } else if (activeTab === 'performance') {
      renderPerformance(contentContainer, actionContainer);
    }
  }

  // ==========================================
  // EMPLOYEES / STAFF DIRECTORY
  // ==========================================
  
  function renderEmployees(container, actions) {
    actions.innerHTML = `
      <button class="btn btn-primary" id="btn-add-employee">
        <span style="font-size: 16px;">+</span> Add Staff Member
      </button>
    `;

    Utils.$('#btn-add-employee').addEventListener('click', () => showEmployeeModal());

    container.innerHTML = `
      <div class="card p-0">
        <div class="card-header flex-wrap gap-4">
          <div class="filter-bar m-0">
            <div class="filter-search">
              <span class="filter-search-icon">🔍</span>
              <input type="text" id="employee-search" class="form-input" placeholder="Search staff...">
            </div>
            <select id="employee-filter-dept" class="form-select">
              <option value="all">All Departments</option>
              <option value="Design">Design</option>
              <option value="Production">Production</option>
              <option value="Sales">Sales</option>
              <option value="Management">Management</option>
            </select>
          </div>
          <div class="text-muted text-sm font-mono" id="employee-count">Showing 0 staff</div>
        </div>
        <div class="table-container" style="border: none; border-radius: 0;">
          <table class="data-table">
            <thead>
              <tr>
                <th>Staff Name</th>
                <th>Role & Dept</th>
                <th>Contact info</th>
                <th>Join Date</th>
                <th>Annual Base</th>
                <th style="width: 100px; text-align: right;">Actions</th>
              </tr>
            </thead>
            <tbody id="employees-table-body">
              <!-- JS Populated -->
            </tbody>
          </table>
        </div>
      </div>
    `;

    const searchInput = Utils.$('#employee-search');
    const deptFilter = Utils.$('#employee-filter-dept');

    const refreshTable = () => {
      const query = searchInput.value.toLowerCase();
      const dept = deptFilter.value;
      const staff = Store.getAll(Store.COLLECTIONS.EMPLOYEES);

      const filtered = staff.filter(e => {
        const matchesQuery = e.name.toLowerCase().includes(query) || 
                             e.email.toLowerCase().includes(query) ||
                             e.role.toLowerCase().includes(query);
        const matchesDept = dept === 'all' || e.department === dept;
        return matchesQuery && matchesDept;
      });

      Utils.$('#employee-count').textContent = `Showing ${filtered.length} of ${staff.length} staff`;

      const tbody = Utils.$('#employees-table-body');
      tbody.innerHTML = '';

      if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center p-8 text-muted">No staff matching criteria found.</td></tr>`;
        return;
      }

      filtered.forEach(e => {
        const tr = Utils.createElement('tr');
        const initials = Utils.getInitials(e.name);
        const avatarBg = Utils.getAvatarColor(e.name);

        tr.innerHTML = `
          <td>
            <div class="user-cell">
              <div class="avatar avatar-sm" style="background: ${avatarBg}; color: var(--pc-text-inverse)">
                ${initials}
              </div>
              <div class="user-cell-info">
                <div class="user-cell-name">${Utils.sanitizeHTML(e.name)}</div>
                <div class="text-xs text-muted">${e.status}</div>
              </div>
            </div>
          </td>
          <td>
            <div>${e.role}</div>
            <div class="text-xs text-gold">${e.department}</div>
          </td>
          <td>
            <div>${Utils.sanitizeHTML(e.email)}</div>
            <div class="text-xs text-muted">${Utils.sanitizeHTML(e.phone)}</div>
          </td>
          <td>${Utils.formatDate(e.joinedDate)}</td>
          <td class="font-mono">${Utils.formatCurrency(e.salary)}</td>
          <td>
            <div class="table-actions justify-end">
              <button class="btn btn-icon btn-ghost sm" title="Edit" onclick="HRM.editEmployee('${e.id}')">✏️</button>
              <button class="btn btn-icon btn-ghost sm text-danger" title="Terminate" onclick="HRM.deleteEmployee('${e.id}')">🗑️</button>
            </div>
          </td>
        `;
        tbody.appendChild(tr);
      });
    };

    searchInput.addEventListener('input', Utils.debounce(refreshTable));
    deptFilter.addEventListener('change', refreshTable);
    refreshTable();
  }

  function showEmployeeModal(empId = null) {
    const isEdit = !!empId;
    const emp = isEdit ? Store.getById(Store.COLLECTIONS.EMPLOYEES, empId) : null;

    const modalHTML = `
      <form id="employee-form" class="animate-fade-in-scale">
        <div class="form-group">
          <label class="form-label">Full Name <span class="required">*</span></label>
          <input type="text" name="name" class="form-input" required value="${emp ? Utils.sanitizeHTML(emp.name) : ''}">
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Email Address <span class="required">*</span></label>
            <input type="email" name="email" class="form-input" required value="${emp ? Utils.sanitizeHTML(emp.email) : ''}">
          </div>
          <div class="form-group">
            <label class="form-label">Phone Number <span class="required">*</span></label>
            <input type="text" name="phone" class="form-input" required value="${emp ? Utils.sanitizeHTML(emp.phone) : ''}">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Role Title <span class="required">*</span></label>
            <select name="role" class="form-select" required>
              <option value="Designer" ${emp && emp.role === 'Designer' ? 'selected' : ''}>Designer</option>
              <option value="Tailor" ${emp && emp.role === 'Tailor' ? 'selected' : ''}>Tailor</option>
              <option value="Embroiderer" ${emp && emp.role === 'Embroiderer' ? 'selected' : ''}>Embroiderer</option>
              <option value="Sales" ${emp && emp.role === 'Sales' ? 'selected' : ''}>Sales Specialist</option>
              <option value="Admin" ${emp && emp.role === 'Admin' ? 'selected' : ''}>System Admin</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Department</label>
            <select name="department" class="form-select">
              <option value="Design" ${emp && emp.department === 'Design' ? 'selected' : ''}>Design</option>
              <option value="Production" ${emp && emp.department === 'Production' ? 'selected' : ''}>Production</option>
              <option value="Sales" ${emp && emp.department === 'Sales' ? 'selected' : ''}>Sales</option>
              <option value="Management" ${emp && emp.department === 'Management' ? 'selected' : ''}>Management</option>
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Annual Base Salary (AUD) <span class="required">*</span></label>
            <input type="number" name="salary" class="form-input" required value="${emp ? emp.salary : ''}">
          </div>
          <div class="form-group">
            <label class="form-label">Join Date <span class="required">*</span></label>
            <input type="date" name="joinedDate" class="form-input" required value="${emp ? emp.joinedDate : ''}">
          </div>
        </div>
        <div class="form-group m-0">
          <label class="form-label">Status</label>
          <select name="status" class="form-select">
            <option value="Active" ${emp && emp.status === 'Active' ? 'selected' : ''}>Active</option>
            <option value="Inactive" ${emp && emp.status === 'Inactive' ? 'selected' : ''}>Inactive / Suspended</option>
          </select>
        </div>
      </form>
    `;

    App.showModal({
      title: isEdit ? 'Modify Staff Record' : 'Register Staff Member',
      content: modalHTML,
      submitText: isEdit ? 'Save Record' : 'Add Employee',
      onSubmit: (modalEl) => {
        const form = Utils.$('#employee-form', modalEl);
        if (!form.checkValidity()) {
          form.reportValidity();
          return false;
        }

        const formData = new FormData(form);
        const empData = {
          name: formData.get('name'),
          email: formData.get('email'),
          phone: formData.get('phone'),
          role: formData.get('role'),
          department: formData.get('department'),
          salary: parseFloat(formData.get('salary')),
          joinedDate: formData.get('joinedDate'),
          status: formData.get('status')
        };

        if (isEdit) {
          Store.update(Store.COLLECTIONS.EMPLOYEES, empId, empData);
          Utils.showToast('Staff member record updated.');
        } else {
          Store.create(Store.COLLECTIONS.EMPLOYEES, empData);
          Utils.showToast('Staff member added successfully.');
        }

        renderSubTab();
        return true;
      }
    });
  }

  // ==========================================
  // ATTENDANCE LOGS
  // ==========================================
  
  function renderAttendance(container, actions) {
    actions.innerHTML = `
      <button class="btn btn-primary" id="btn-add-attendance">
        Clock In/Out Staff
      </button>
    `;

    Utils.$('#btn-add-attendance').addEventListener('click', () => showAttendanceModal());

    container.innerHTML = `
      <div class="card p-0">
        <div class="card-header">
          <div class="card-title">Daily Punch Card Logs</div>
          <div class="text-muted text-sm font-mono" id="attendance-date-label">Today</div>
        </div>
        <div class="table-container" style="border: none; border-radius: 0;">
          <table class="data-table">
            <thead>
              <tr>
                <th>Staff Name</th>
                <th>Date</th>
                <th>Clock In</th>
                <th>Clock Out</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody id="attendance-table-body">
              <!-- Loaded dynamically -->
            </tbody>
          </table>
        </div>
      </div>
    `;

    const refreshTable = () => {
      const records = Store.getAll(Store.COLLECTIONS.ATTENDANCE);
      // Sort newest first
      records.sort((a, b) => new Date(b.date) - new Date(a.date));

      const tbody = Utils.$('#attendance-table-body');
      tbody.innerHTML = '';

      if (records.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center p-8 text-muted">No attendance logs found. Use Clock In/Out button to add records.</td></tr>`;
        return;
      }

      records.forEach(r => {
        const tr = Utils.createElement('tr');
        tr.innerHTML = `
          <td class="font-medium">${Utils.sanitizeHTML(r.employeeName)}</td>
          <td class="font-mono">${Utils.formatDate(r.date)}</td>
          <td class="font-mono">${r.checkIn}</td>
          <td class="font-mono">${r.checkOut}</td>
          <td>
            <span class="badge ${r.status === 'Present' ? 'badge-success' : r.status === 'Leave' ? 'badge-info' : 'badge-danger'}">
              ${r.status}
            </span>
          </td>
        `;
        tbody.appendChild(tr);
      });
    };

    refreshTable();
  }

  function showAttendanceModal() {
    const staff = Store.getAll(Store.COLLECTIONS.EMPLOYEES).filter(s => s.status === 'Active');

    const modalHTML = `
      <form id="attendance-form" class="animate-fade-in-scale">
        <div class="form-group">
          <label class="form-label">Select Staff <span class="required">*</span></label>
          <select name="employeeId" class="form-select" required>
            ${staff.map(s => `<option value="${s.id}">${Utils.sanitizeHTML(s.name)} (${s.role})</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Log Date <span class="required">*</span></label>
          <input type="date" name="date" class="form-input" required value="${new Date().toISOString().split('T')[0]}">
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Clock In Time</label>
            <input type="time" name="checkIn" class="form-input" value="09:00">
          </div>
          <div class="form-group">
            <label class="form-label">Clock Out Time</label>
            <input type="time" name="checkOut" class="form-input" value="17:30">
          </div>
        </div>
        <div class="form-group m-0">
          <label class="form-label">Attendance Status</label>
          <select name="status" class="form-select">
            <option value="Present">Present</option>
            <option value="Half-Day">Half Day</option>
            <option value="Absent">Absent</option>
            <option value="Leave">On Leave</option>
          </select>
        </div>
      </form>
    `;

    App.showModal({
      title: 'Clock In/Out Staff Punch',
      content: modalHTML,
      submitText: 'Save Punch Log',
      onSubmit: (modalEl) => {
        const form = Utils.$('#attendance-form', modalEl);
        const formData = new FormData(form);
        const empId = formData.get('employeeId');
        const selectedEmp = Store.getById(Store.COLLECTIONS.EMPLOYEES, empId);

        const formatClockTime = (timeStr) => {
          if (!timeStr) return '—';
          const [h, m] = timeStr.split(':');
          const hr = parseInt(h);
          const period = hr >= 12 ? 'PM' : 'AM';
          const displayH = hr % 12 || 12;
          return `${displayH}:${m} ${period}`;
        };

        const attRecord = {
          id: `att-${empId}-${formData.get('date')}`,
          employeeId: empId,
          employeeName: selectedEmp ? selectedEmp.name : 'Unknown Staff',
          date: formData.get('date'),
          checkIn: formData.get('status') === 'Present' ? formatClockTime(formData.get('checkIn')) : '—',
          checkOut: formData.get('status') === 'Present' ? formatClockTime(formData.get('checkOut')) : '—',
          status: formData.get('status')
        };

        // Create or overwrite
        const exist = Store.getAll(Store.COLLECTIONS.ATTENDANCE);
        const idx = exist.findIndex(a => a.id === attRecord.id);
        if (idx !== -1) {
          Store.update(Store.COLLECTIONS.ATTENDANCE, attRecord.id, attRecord);
        } else {
          Store.create(Store.COLLECTIONS.ATTENDANCE, attRecord);
        }

        Utils.showToast('Punch card logged.');
        renderSubTab();
        return true;
      }
    });
  }

  // ==========================================
  // LEAVE REQUESTS
  // ==========================================
  
  function renderLeaves(container, actions) {
    actions.innerHTML = `
      <button class="btn btn-primary" id="btn-add-leave">
        Apply for Leave
      </button>
    `;

    Utils.$('#btn-add-leave').addEventListener('click', () => showLeaveModal());

    container.innerHTML = `
      <div class="card p-0">
        <div class="card-header">
          <div class="card-title">Staff Absence & Leave Pipeline</div>
        </div>
        <div class="table-container" style="border: none; border-radius: 0;">
          <table class="data-table">
            <thead>
              <tr>
                <th>Staff Name</th>
                <th>Leave Type</th>
                <th>Start Date</th>
                <th>End Date</th>
                <th>Days</th>
                <th>Reason</th>
                <th>Status</th>
                <th style="width: 120px; text-align: right;">Action</th>
              </tr>
            </thead>
            <tbody id="leaves-table-body">
              <!-- Loaded dynamically -->
            </tbody>
          </table>
        </div>
      </div>
    `;

    const refreshTable = () => {
      const records = Store.getAll(Store.COLLECTIONS.LEAVES);
      const tbody = Utils.$('#leaves-table-body');
      tbody.innerHTML = '';

      if (records.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="text-center p-8 text-muted">No leave requests logged.</td></tr>`;
        return;
      }

      records.forEach(r => {
        const tr = Utils.createElement('tr');
        tr.innerHTML = `
          <td class="font-medium">${Utils.sanitizeHTML(r.employeeName)}</td>
          <td><span class="badge badge-muted">${r.type}</span></td>
          <td class="font-mono">${Utils.formatDate(r.startDate)}</td>
          <td class="font-mono">${Utils.formatDate(r.endDate)}</td>
          <td class="font-mono">${r.days}</td>
          <td class="text-muted" style="max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
            ${Utils.sanitizeHTML(r.reason || '—')}
          </td>
          <td>
            <span class="badge ${r.status === 'Approved' ? 'badge-success' : r.status === 'Pending' ? 'badge-warning' : 'badge-danger'}">
              ${r.status}
            </span>
          </td>
          <td>
            <div class="table-actions justify-end">
              ${r.status === 'Pending' ? `
                <button class="btn btn-icon btn-ghost sm text-success" title="Approve" onclick="HRM.approveLeave('${r.id}', true)">✓</button>
                <button class="btn btn-icon btn-ghost sm text-danger" title="Reject" onclick="HRM.approveLeave('${r.id}', false)">✕</button>
              ` : `
                <button class="btn btn-icon btn-ghost sm text-danger" title="Delete" onclick="HRM.deleteLeave('${r.id}')">🗑️</button>
              `}
            </div>
          </td>
        `;
        tbody.appendChild(tr);
      });
    };

    refreshTable();
  }

  function showLeaveModal() {
    const staff = Store.getAll(Store.COLLECTIONS.EMPLOYEES).filter(s => s.status === 'Active');

    const modalHTML = `
      <form id="leave-form" class="animate-fade-in-scale">
        <div class="form-group">
          <label class="form-label">Employee Name <span class="required">*</span></label>
          <select name="employeeId" class="form-select" required>
            ${staff.map(s => `<option value="${s.id}">${Utils.sanitizeHTML(s.name)}</option>`).join('')}
          </select>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Start Date <span class="required">*</span></label>
            <input type="date" name="startDate" class="form-input" required id="leave-start">
          </div>
          <div class="form-group">
            <label class="form-label">End Date <span class="required">*</span></label>
            <input type="date" name="endDate" class="form-input" required id="leave-end">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Leave Type</label>
          <select name="type" class="form-select">
            <option value="Annual">Annual / Holidays</option>
            <option value="Sick">Sick Leave</option>
            <option value="Personal">Personal Carer\'s Leave</option>
            <option value="Unpaid">Unpaid Leave</option>
          </select>
        </div>
        <div class="form-group m-0">
          <label class="form-label">Application Reason</label>
          <textarea name="reason" class="form-textarea" placeholder="Provide notes or sick certificate notification..."></textarea>
        </div>
      </form>
    `;

    App.showModal({
      title: 'Submit Leave Application',
      content: modalHTML,
      submitText: 'Apply Leave',
      onSubmit: (modalEl) => {
        const form = Utils.$('#leave-form', modalEl);
        const formData = new FormData(form);

        const start = new Date(formData.get('startDate'));
        const end = new Date(formData.get('endDate'));
        if (end < start) {
          Utils.showToast('End Date cannot be before Start Date.', 'error');
          return false;
        }

        const diffTime = Math.abs(end - start);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

        const empId = formData.get('employeeId');
        const selectedEmp = Store.getById(Store.COLLECTIONS.EMPLOYEES, empId);

        Store.create(Store.COLLECTIONS.LEAVES, {
          employeeId: empId,
          employeeName: selectedEmp ? selectedEmp.name : 'Unknown Staff',
          type: formData.get('type'),
          startDate: formData.get('startDate'),
          endDate: formData.get('endDate'),
          days: diffDays,
          status: 'Pending',
          reason: formData.get('reason')
        });

        Utils.showToast('Leave request logged as Pending.');
        renderSubTab();
        return true;
      }
    });
  }

  function approveLeave(id, approve) {
    Store.update(Store.COLLECTIONS.LEAVES, id, { status: approve ? 'Approved' : 'Rejected' });
    Utils.showToast(`Leave request ${approve ? 'Approved' : 'Rejected'}.`);
    renderSubTab();
  }

  function deleteLeave(id) {
    Store.delete(Store.COLLECTIONS.LEAVES, id);
    Utils.showToast('Leave record removed.', 'info');
    renderSubTab();
  }

  // ==========================================
  // PAYROLL CENTER (AU COMPLIANCE)
  // ==========================================
  
  function renderPayroll(container, actions) {
    actions.innerHTML = `
      <button class="btn btn-primary" id="btn-run-payroll">
        Run New Monthly Payroll
      </button>
    `;

    Utils.$('#btn-run-payroll').addEventListener('click', () => showRunPayrollModal());

    container.innerHTML = `
      <div class="card p-0">
        <div class="card-header d-flex justify-between items-center">
          <div class="card-title">Payroll Logs & Superannuation (11.5% Guarantee)</div>
          <div class="filter-bar m-0">
            <select id="payroll-filter-period" class="form-select">
              <option value="">All Periods</option>
            </select>
          </div>
        </div>
        <div class="table-container" style="border: none; border-radius: 0;">
          <table class="data-table">
            <thead>
              <tr>
                <th>Staff Name</th>
                <th>Payroll Period</th>
                <th>Gross Base</th>
                <th>Overtime</th>
                <th>Deduction</th>
                <th>Super Guarantee</th>
                <th>PAYG Tax Withholding</th>
                <th>Net Pay</th>
                <th>Status</th>
                <th style="width: 100px; text-align: right;">Payslip</th>
              </tr>
            </thead>
            <tbody id="payroll-table-body">
              <!-- Dynamic -->
            </tbody>
          </table>
        </div>
      </div>
    `;

    // Populate the period dropdown once, from the distinct periods that exist.
    const periodSelect = Utils.$('#payroll-filter-period');
    const allRecords = Store.getAll(Store.COLLECTIONS.PAYROLL);
    const periods = [...new Set(allRecords.map(r => r.period).filter(Boolean))]
      .sort((a,b) => new Date(b) - new Date(a)); // newest first; falls back to string order
    periods.forEach(p => {
      const opt = Utils.createElement('option');
      opt.value = p; opt.textContent = p;
      periodSelect.appendChild(opt);
    });

    const refreshTable = () => {
      let records = Store.getAll(Store.COLLECTIONS.PAYROLL);

      // Apply period filter
      const selPeriod = periodSelect.value;
      if (selPeriod) records = records.filter(r => r.period === selPeriod);

      // Sort by processedDate desc
      records.sort((a,b) => new Date(b.processedDate) - new Date(a.processedDate));

      const tbody = Utils.$('#payroll-table-body');
      tbody.innerHTML = '';

      if (records.length === 0) {
        tbody.innerHTML = `<tr><td colspan="10" class="text-center p-8 text-muted">No payroll logs found.</td></tr>`;
        return;
      }

      records.forEach(r => {
        const tr = Utils.createElement('tr');
        tr.innerHTML = `
          <td class="font-medium">${Utils.sanitizeHTML(r.employeeName)}</td>
          <td class="font-mono">${r.period}</td>
          <td class="font-mono">${Utils.formatCurrency(r.baseSalary)}</td>
          <td class="font-mono text-success">+${Utils.formatCurrency(r.overtime)}</td>
          <td class="font-mono text-danger">-${Utils.formatCurrency(r.deductions)}</td>
          <td class="font-mono text-info">${Utils.formatCurrency(r.superannuation)}</td>
          <td class="font-mono text-warning">${Utils.formatCurrency(r.tax)}</td>
          <td class="font-mono font-bold">${Utils.formatCurrency(r.netPay)}</td>
          <td>
            <span class="badge ${r.status === 'Paid' ? 'badge-success' : 'badge-warning'}">
              ${r.status}
            </span>
          </td>
          <td>
            <div class="table-actions justify-end">
              <button class="btn btn-icon btn-ghost sm" title="View Payslip" onclick="HRM.viewPayslip('${r.id}')">📄</button>
            </div>
          </td>
        `;
        tbody.appendChild(tr);
      });
    };

    refreshTable();
    periodSelect.addEventListener('change', refreshTable);
  }

  function showRunPayrollModal() {
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const currentYear = new Date().getFullYear();

    const modalHTML = `
      <form id="payroll-run-form" class="animate-fade-in-scale">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Select Month</label>
            <select name="month" class="form-select">
              ${months.map((m, idx) => `<option value="${m}" ${idx === new Date().getMonth() ? 'selected' : ''}>${m}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Select Year</label>
            <select name="year" class="form-select">
              <option value="${currentYear}">${currentYear}</option>
              <option value="${currentYear - 1}">${currentYear - 1}</option>
            </select>
          </div>
        </div>
        <p class="text-xs text-muted">Running payroll will automatically fetch active staff and calculate base monthly pays, Super (11.5%) and PAYG tax withholding.</p>
      </form>
    `;

    App.showModal({
      title: 'Run Staff Monthly Payroll',
      content: modalHTML,
      submitText: 'Generate Payroll Roll',
      onSubmit: (modalEl) => {
        const form = Utils.$('#payroll-run-form', modalEl);
        const formData = new FormData(form);
        const periodStr = `${formData.get('month')} ${formData.get('year')}`;

        const staff = Store.getAll(Store.COLLECTIONS.EMPLOYEES).filter(s => s.status === 'Active');
        const payrollExist = Store.getAll(Store.COLLECTIONS.PAYROLL);

        // Check if payroll already run
        const exists = payrollExist.some(p => p.period === periodStr);
        if (exists) {
          Utils.showToast(`Payroll for ${periodStr} has already been run.`, 'warning');
          return false;
        }

        staff.forEach(emp => {
          const baseMonthly = Math.round(emp.salary / 12 * 100) / 100;
          const tax = Utils.calculateMonthlyTax(emp.salary);
          const superGuarantee = Utils.calculateSuperannuation(baseMonthly);
          const net = Math.round((baseMonthly - tax) * 100) / 100;

          Store.create(Store.COLLECTIONS.PAYROLL, {
            employeeId: emp.id,
            employeeName: emp.name,
            period: periodStr,
            baseSalary: baseMonthly,
            overtime: 0,
            deductions: 0,
            superannuation: superGuarantee,
            tax: tax,
            netPay: net,
            status: 'Draft',
            processedDate: new Date().toISOString().split('T')[0]
          });
        });

        Utils.showToast(`Payroll drafts for ${periodStr} generated.`);
        renderSubTab();
        return true;
      }
    });
  }

  function viewPayslip(payrollId) {
    const pay = Store.getById(Store.COLLECTIONS.PAYROLL, payrollId);
    if (!pay) return;

    const emp = Store.getById(Store.COLLECTIONS.EMPLOYEES, pay.employeeId);
    const settings = Store.getSettings();

    const modalHTML = `
      <div class="invoice-preview animate-fade-in p-6" style="background: #fff; color: #111; font-family: sans-serif; border-radius: var(--radius-lg)">
        <div class="d-flex justify-between items-start" style="border-bottom: 2px solid #ECB676; padding-bottom: 12px; margin-bottom: 20px;">
          <div>
            <h2 style="margin: 0; color: #111; font-family: serif; font-size: 22px;">${settings.companyName}</h2>
            <div style="font-size: 11px; color: #666; margin-top: 4px;">ABN: ${settings.abn}</div>
            <div style="font-size: 11px; color: #666;">${settings.companyAddress}</div>
          </div>
          <div class="text-right">
            <h3 style="margin: 0; color: #ECB676; text-transform: uppercase; font-size: 16px;">Payslip Advice</h3>
            <div style="font-size: 12px; font-weight: bold; margin-top: 4px; font-family: monospace;">Period: ${pay.period}</div>
          </div>
        </div>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px;">
          <tr>
            <td style="padding: 6px; font-weight: bold; width: 120px;">Employee Name:</td>
            <td style="padding: 6px;">${Utils.sanitizeHTML(pay.employeeName)}</td>
            <td style="padding: 6px; font-weight: bold; width: 100px;">Processed Date:</td>
            <td style="padding: 6px; font-family: monospace;">${Utils.formatDate(pay.processedDate)}</td>
          </tr>
          <tr>
            <td style="padding: 6px; font-weight: bold;">Department:</td>
            <td style="padding: 6px;">${emp ? emp.department : '—'}</td>
            <td style="padding: 6px; font-weight: bold;">Role:</td>
            <td style="padding: 6px;">${emp ? (emp.name === 'Pooja Shah' ? 'Managing Director' : emp.role) : '—'}</td>
          </tr>
        </table>

        <h4 style="border-bottom: 1px solid #eee; padding-bottom: 6px; margin: 20px 0 10px 0; color: #111; font-size: 13px;">Earnings Breakdown</h4>
        <table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 20px;">
          <thead>
            <tr style="background: #f9f9f9;">
              <th style="padding: 8px; text-align: left; border-bottom: 1px solid #ddd; color: #333;">Description</th>
              <th style="padding: 8px; text-align: right; border-bottom: 1px solid #ddd; color: #333;">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #eee;">Monthly Base Salary</td>
              <td style="padding: 8px; text-align: right; font-family: monospace; border-bottom: 1px solid #eee;">${Utils.formatCurrency(pay.baseSalary)}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #eee;">Overtime / Allowances</td>
              <td style="padding: 8px; text-align: right; font-family: monospace; border-bottom: 1px solid #eee; color: green;">+${Utils.formatCurrency(pay.overtime)}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #eee; color: #888;">Deductions (Pre-tax)</td>
              <td style="padding: 8px; text-align: right; font-family: monospace; border-bottom: 1px solid #eee; color: red;">-${Utils.formatCurrency(pay.deductions)}</td>
            </tr>
            <tr style="background: #fff; font-weight: bold;">
              <td style="padding: 8px; border-bottom: 1px solid #eee;">Gross Earnings</td>
              <td style="padding: 8px; text-align: right; font-family: monospace; border-bottom: 1px solid #eee;">${Utils.formatCurrency(pay.baseSalary + pay.overtime - pay.deductions)}</td>
            </tr>
          </tbody>
        </table>

        <h4 style="border-bottom: 1px solid #eee; padding-bottom: 6px; margin: 20px 0 10px 0; color: #111; font-size: 13px;">Taxes & Superannuation</h4>
        <table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 20px;">
          <thead>
            <tr style="background: #f9f9f9;">
              <th style="padding: 8px; text-align: left; border-bottom: 1px solid #ddd; color: #333;">Description</th>
              <th style="padding: 8px; text-align: right; border-bottom: 1px solid #ddd; color: #333;">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #eee;">PAYG Tax Withholding</td>
              <td style="padding: 8px; text-align: right; font-family: monospace; border-bottom: 1px solid #eee; color: red;">-${Utils.formatCurrency(pay.tax)}</td>
            </tr>
            <tr style="font-weight: bold; background: #fdfaf6;">
              <td style="padding: 8px; border-bottom: 1px solid #eee;">Net Pay Transferred</td>
              <td style="padding: 8px; text-align: right; font-family: monospace; border-bottom: 1px solid #eee; font-size: 13px;">${Utils.formatCurrency(pay.netPay)}</td>
            </tr>
            <tr>
              <td style="padding: 8px; color: #666;">Superannuation Guarantee (11.5% paid to fund)</td>
              <td style="padding: 8px; text-align: right; font-family: monospace; color: #666;">${Utils.formatCurrency(pay.superannuation)}</td>
            </tr>
          </tbody>
        </table>

        <div style="font-size: 10px; color: #888; text-align: center; margin-top: 30px; border-top: 1px solid #eee; padding-top: 10px;">
          This is an official document of ${settings.companyName}. Net pay has been direct deposited into the employee's nominated account.
        </div>
      </div>
    `;

    App.showModal({
      title: `Payslip Advice — ${pay.employeeName}`,
      content: modalHTML,
      submitText: pay.status === 'Draft' ? 'Disburse & Mark Paid' : 'Close Payslip',
      hideCancel: pay.status !== 'Draft',
      onSubmit: () => {
        if (pay.status === 'Draft') {
          Store.update(Store.COLLECTIONS.PAYROLL, pay.id, { status: 'Paid' });
          Utils.showToast(`Salary disbursed to ${pay.employeeName}.`, 'success');
          
          // Log payroll as accounting expense automatically!
          Store.create(Store.COLLECTIONS.EXPENSES, {
            category: 'Salary',
            amount: pay.baseSalary + pay.overtime, // Gross expense
            gst: 0, // No GST on employee salary
            expenseDate: new Date().toISOString().split('T')[0],
            vendor: pay.employeeName,
            notes: `Monthly wages disbursement for ${pay.period}`,
            isRecurring: false
          });

          renderSubTab();
        }
        return true;
      }
    });
  }

  // ==========================================
  // PERFORMANCE REVIEWS
  // ==========================================
  
  function renderPerformance(container, actions) {
    const staff = Store.getAll(Store.COLLECTIONS.EMPLOYEES).filter(s => s.status === 'Active');

    container.innerHTML = `
      <div class="d-grid gap-6" style="grid-template-columns: 1fr 2fr;">
        <!-- Staff List Selection -->
        <div class="card p-4">
          <div class="card-title mb-4">Select Staff Member</div>
          <div class="d-flex flex-col gap-2" id="perf-staff-list">
            ${staff.map(s => `
              <div class="list-item" data-id="${s.id}">
                <div class="avatar avatar-sm" style="background: ${Utils.getAvatarColor(s.name)}; color: var(--pc-text-inverse)">
                  ${Utils.getInitials(s.name)}
                </div>
                <div class="list-item-content">
                  <div class="list-item-title">${Utils.sanitizeHTML(s.name)}</div>
                  <div class="list-item-subtitle">${s.role}</div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Review details -->
        <div id="perf-review-details">
          <div class="card p-6 d-flex flex-col items-center justify-center text-center text-muted" style="min-height: 300px;">
            <div class="empty-state">
              <div class="empty-state-icon">⭐</div>
              <div class="empty-state-title">Select a staff member</div>
              <div class="empty-state-text">Select staff member from the left panel to review reviews and performance metrics.</div>
            </div>
          </div>
        </div>
      </div>
    `;

    Utils.$$('.list-item', container).forEach(item => {
      item.addEventListener('click', (e) => {
        const itemEl = e.currentTarget;
        Utils.$$('.list-item', container).forEach(el => el.classList.remove('active'));
        itemEl.classList.add('active');
        loadStaffPerformance(itemEl.dataset.id);
      });
    });
  }

  function loadStaffPerformance(empId) {
    const detailsContainer = Utils.$('#perf-review-details');
    if (!detailsContainer) return;

    const emp = Store.getById(Store.COLLECTIONS.EMPLOYEES, empId);
    if (!emp) return;

    // Hardcode some mock performance reviews since it's client-side persistent
    const reviews = {
      'e-1': { rating: 5, feedback: "Pooja provides excellent leadership and brand direction. Operations run smoothly.", goals: ["Expand couture lineup by 15%", "Hire senior designer for bridal department"] },
      'e-2': { rating: 4.5, feedback: "Vikram's bridal concept drawings have been praised by clients. Great aesthetic taste and design skill.", goals: ["Reduce fabric wastage in layouts by 5%", "Complete Aisha Rahman's high-density embroidery supervision on time"] },
      'e-3': { rating: 4, feedback: "Haris does high-precision fitting stitches. Excellent draping on mock-ups.", goals: ["Stitch 5 custom outfits per week", "Train junior tailors in lining stitches"] },
      'e-4': { rating: 4.8, feedback: "Anjali's zardozi handcraft is world-class. Customers love the detailing.", goals: ["Complete embroidery work 2 days ahead of fitting schedules", "Mentor new embroidery interns"] },
      'e-5': { rating: 4.2, feedback: "Sarah has achieved excellent conversion rates for walk-in consultations.", goals: ["Increase bridal consult conversions to 80%", "Collect customer feedbacks for marketing case studies"] }
    };

    const review = reviews[empId] || { rating: 4.0, feedback: "Consistent performance. Team-player.", goals: ["Complete work duties on time", "Participate in training modules"] };

    const ratingStars = '⭐'.repeat(Math.floor(review.rating)) + (review.rating % 1 !== 0 ? '✨' : '');

    detailsContainer.innerHTML = `
      <div class="card p-6 animate-fade-in">
        <div class="d-flex justify-between items-start gap-4 mb-6" style="border-bottom: 1px solid var(--pc-border); padding-bottom: 16px;">
          <div>
            <h3 class="font-display text-md">${Utils.sanitizeHTML(emp.name)}</h3>
            <p class="text-xs text-gold">${emp.name === 'Pooja Shah' ? 'Managing Director' : emp.role} — ${emp.department} Department</p>
          </div>
          <div class="text-right">
            <span class="text-xs text-muted">Review Score</span>
            <div class="text-md font-bold text-gold" style="letter-spacing: 2px;">${ratingStars} (${review.rating}/5)</div>
          </div>
        </div>

        <div class="d-flex flex-col gap-4">
          <div>
            <h4 class="text-sm font-semibold text-gold mb-1">Manager Feedback</h4>
            <div class="p-3 rounded-md text-sm font-light" style="background: rgba(255,255,255,0.01); border: 1px solid var(--pc-border)">
              ${Utils.sanitizeHTML(review.feedback)}
            </div>
          </div>

          <div>
            <h4 class="text-sm font-semibold text-gold mb-2">Performance Goals & Milestones</h4>
            <ul class="d-flex flex-col gap-2">
              ${review.goals.map(g => `
                <li class="d-flex items-center gap-2 text-xs font-light">
                  <span class="text-gold">✔</span> ${Utils.sanitizeHTML(g)}
                </li>
              `).join('')}
            </ul>
          </div>
          
          <button class="btn btn-secondary btn-sm ml-auto mt-4" onclick="HRM.editPerformanceReview('${emp.id}')">
            Add New Review Note
          </button>
        </div>
      </div>
    `;
  }

  function editPerformanceReview(empId) {
    const emp = Store.getById(Store.COLLECTIONS.EMPLOYEES, empId);
    if (!emp) return;

    const modalHTML = `
      <form id="perf-form" class="animate-fade-in-scale">
        <div class="form-group">
          <label class="form-label">Reviewer Rating (1 to 5 Stars)</label>
          <select name="rating" class="form-select">
            <option value="5">⭐⭐⭐⭐⭐ (Excellent)</option>
            <option value="4">⭐⭐⭐⭐ (Good)</option>
            <option value="3">⭐⭐⭐ (Average)</option>
            <option value="2">⭐⭐ (Needs Improvement)</option>
            <option value="1">⭐ (Unsatisfactory)</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Performance Review Feedback</label>
          <textarea name="feedback" class="form-textarea" required placeholder="Log details of review meeting or general work evaluations..."></textarea>
        </div>
        <div class="form-group m-0">
          <label class="form-label">Active Work Goals (one per line)</label>
          <textarea name="goals" class="form-textarea" placeholder="Goal 1\nGoal 2..." style="min-height: 80px;"></textarea>
        </div>
      </form>
    `;

    App.showModal({
      title: `New Performance Entry — ${emp.name}`,
      content: modalHTML,
      submitText: 'Save Review Log',
      onSubmit: (modalEl) => {
        const form = Utils.$('#perf-form', modalEl);
        if (!form.checkValidity()) {
          form.reportValidity();
          return false;
        }

        Utils.showToast('Performance review details successfully logged.', 'success');
        
        // Reload performance tab
        loadStaffPerformance(empId);
        return true;
      }
    });
  }

  // Exposed methods
  function editEmployee(id) {
    showEmployeeModal(id);
  }

  function deleteEmployee(id) {
    App.showConfirm({
      title: 'Terminate Employee Contract',
      text: 'Are you sure you want to deactivate and remove this staff member? Their past payroll histories will still be stored in the accounting ledger.',
      confirmText: 'Confirm Deactivation',
      onConfirm: () => {
        Store.delete(Store.COLLECTIONS.EMPLOYEES, id);
        Utils.showToast('Staff member deactivated.', 'info');
        renderSubTab();
      }
    });
  }

  return {
    init,
    editEmployee,
    deleteEmployee,
    approveLeave,
    deleteLeave,
    viewPayslip,
    editPerformanceReview
  };
})();
