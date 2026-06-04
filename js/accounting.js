/* ============================================================
   POOJA'S COUTURE — Accounting Module
   Invoices, Expenses, GST reporting, and reports
   ============================================================ */

const Accounting = (() => {
  let activeTab = 'dashboard';

  function init() {
    activeTab = 'dashboard';
    render();
  }

  function render() {
    const container = Utils.$('#main-content-area');
    if (!container) return;

    container.innerHTML = `
      <div class="page-header animate-fade-in">
        <div>
          <h1 class="page-title">Financial Ledger & Invoicing</h1>
          <p class="page-subtitle">Track boutique sales invoices, business expenses, GST BAS reporting and profit statements</p>
        </div>
        <div class="page-actions" id="accounting-page-actions">
          <!-- Action buttons filled by JS -->
        </div>
      </div>

      <div class="tabs animate-fade-in stagger-1">
        <button class="tab-btn ${activeTab === 'dashboard' ? 'active' : ''}" data-tab="dashboard">Overview</button>
        <button class="tab-btn ${activeTab === 'invoices' ? 'active' : ''}" data-tab="invoices">Invoices</button>
        <button class="tab-btn ${activeTab === 'expenses' ? 'active' : ''}" data-tab="expenses">Expenses</button>
        <button class="tab-btn ${activeTab === 'gst' ? 'active' : ''}" data-tab="gst">GST BAS Report</button>
        <button class="tab-btn ${activeTab === 'reports' ? 'active' : ''}" data-tab="reports">Financial Reports</button>
      </div>

      <div id="accounting-tab-content" class="animate-fade-in stagger-2">
        <!-- Sub-tab content dynamically rendered -->
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
    const actionContainer = Utils.$('#accounting-page-actions');
    const contentContainer = Utils.$('#accounting-tab-content');
    if (!contentContainer || !actionContainer) return;

    actionContainer.innerHTML = '';
    contentContainer.innerHTML = '';

    if (activeTab === 'dashboard') {
      renderDashboard(contentContainer, actionContainer);
    } else if (activeTab === 'invoices') {
      renderInvoices(contentContainer, actionContainer);
    } else if (activeTab === 'expenses') {
      renderExpenses(contentContainer, actionContainer);
    } else if (activeTab === 'gst') {
      renderGST(contentContainer, actionContainer);
    } else if (activeTab === 'reports') {
      renderReports(contentContainer, actionContainer);
    }
  }

  // ==========================================
  // FINANCIAL OVERVIEW (DASHBOARD)
  // ==========================================

  function renderDashboard(container, actions) {
    // Financial summaries
    const invoices = Store.getAll(Store.COLLECTIONS.INVOICES);
    const expenses = Store.getAll(Store.COLLECTIONS.EXPENSES);

    const paidInvoices = invoices.filter(i => i.status === 'Paid');
    const sentInvoices = invoices.filter(i => i.status === 'Sent');
    const outstandingInvoices = invoices.filter(i => i.status === 'Sent' || i.status === 'Overdue');

    const totalRevenue = paidInvoices.reduce((sum, i) => sum + i.total, 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const outstandingAmount = outstandingInvoices.reduce((sum, i) => sum + i.total, 0);

    const netProfit = totalRevenue - totalExpenses;

    // GST collected vs paid
    const gstCollected = invoices.filter(i => i.status === 'Paid' || i.status === 'Sent').reduce((sum, i) => sum + i.gstTotal, 0);
    const gstPaid = expenses.reduce((sum, e) => sum + e.gst, 0);
    const netGstLiability = gstCollected - gstPaid;

    container.innerHTML = `
      <!-- Stats widgets row -->
      <div class="widgets-grid animate-fade-in stagger-1">
        <div class="stat-card">
          <div class="stat-card-header">
            <span class="stat-card-icon green">💰</span>
            <span class="stat-card-trend up">+$${Utils.formatCompact(totalRevenue)}</span>
          </div>
          <div class="stat-card-value">${Utils.formatCurrency(totalRevenue)}</div>
          <div class="stat-card-label">Total Revenue (Cash-basis)</div>
        </div>

        <div class="stat-card">
          <div class="stat-card-header">
            <span class="stat-card-icon red">💸</span>
            <span class="stat-card-trend down">-$${Utils.formatCompact(totalExpenses)}</span>
          </div>
          <div class="stat-card-value">${Utils.formatCurrency(totalExpenses)}</div>
          <div class="stat-card-label">Total Expenses Logged</div>
        </div>

        <div class="stat-card">
          <div class="stat-card-header">
            <span class="stat-card-icon gold">⚖️</span>
            <span class="stat-card-trend ${netProfit >= 0 ? 'up' : 'down'}">
              ${netProfit >= 0 ? 'Profit' : 'Loss'}
            </span>
          </div>
          <div class="stat-card-value ${netProfit >= 0 ? 'text-success' : 'text-danger'}">${Utils.formatCurrency(netProfit)}</div>
          <div class="stat-card-label">Net Profit / Loss Position</div>
        </div>

        <div class="stat-card">
          <div class="stat-card-header">
            <span class="stat-card-icon amber">🔔</span>
            <span class="badge badge-warning">${outstandingInvoices.length} Pending</span>
          </div>
          <div class="stat-card-value">${Utils.formatCurrency(outstandingAmount)}</div>
          <div class="stat-card-label">Outstanding Invoices (Accrual)</div>
        </div>
      </div>

      <!-- Financial charts grid -->
      <div class="content-grid animate-fade-in stagger-2">
        <div class="card p-6">
          <div class="card-title mb-4">Cashflow Analysis (Last 6 Months)</div>
          <div class="chart-container">
            <canvas id="cashflow-bar-chart"></canvas>
          </div>
          <div class="chart-legend">
            <div class="chart-legend-item"><div class="chart-legend-dot" style="background: #34D399;"></div>Revenue</div>
            <div class="chart-legend-item"><div class="chart-legend-dot" style="background: #F87171;"></div>Expenses</div>
          </div>
        </div>

        <div class="card p-6">
          <div class="card-title mb-4">Expense Distribution by Category</div>
          <div class="d-grid gap-4" style="grid-template-columns: 1.2fr 1fr;">
            <div class="chart-container" style="height: 180px;">
              <canvas id="expense-donut-chart"></canvas>
            </div>
            <div class="d-flex flex-col gap-2 justify-center" id="expense-category-breakdown">
              <!-- Dynamically populated -->
            </div>
          </div>
        </div>
      </div>
    `;

    // Render Canvas Charts (wait a frame for setup)
    requestAnimationFrame(() => {
      // Bar Chart: Cashflow
      const months = ['Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May'];
      // Sample mock histories
      const cashflowData = {
        labels: months,
        datasets: [
          { label: 'Revenue', data: [7500, 9800, 12000, 14500, 8900, totalRevenue], color: '#34D399' },
          { label: 'Expenses', data: [5100, 6200, 6800, 7200, 11400, totalExpenses], color: '#F87171' }
        ]
      };
      Charts.Bar('cashflow-bar-chart', cashflowData, {
        yFormatter: val => '$' + Utils.formatCompact(val)
      });

      // Donut Chart: Expenses categories
      const categoriesMap = {};
      expenses.forEach(e => {
        categoriesMap[e.category] = (categoriesMap[e.category] || 0) + e.amount;
      });

      const donutData = Object.entries(categoriesMap).map(([label, value], idx) => ({
        label,
        value,
        color: Utils.getChartColor(idx)
      }));

      Charts.Donut('expense-donut-chart', donutData, {
        centerText: {
          value: '$' + Utils.formatCompact(totalExpenses),
          label: 'Total Expenses'
        }
      });

      // Populate text list breakdown next to donut
      const legendContainer = Utils.$('#expense-category-breakdown');
      legendContainer.innerHTML = '';
      if (donutData.length === 0) {
        legendContainer.innerHTML = '<div class="text-xs text-muted">No expenses logged.</div>';
      } else {
        // Sort highest first
        donutData.sort((a,b) => b.value - a.value);
        donutData.forEach(item => {
          legendContainer.innerHTML += `
            <div class="d-flex justify-between items-center text-xs">
              <span class="d-flex items-center gap-2">
                <div class="chart-legend-dot" style="background: ${item.color};"></div>
                ${item.label}
              </span>
              <span class="font-mono font-semibold">${Utils.formatCurrency(item.value)}</span>
            </div>
          `;
        });
      }
    });
  }

  // ==========================================
  // INVOICES SUB-TAB
  // ==========================================

  function renderInvoices(container, actions) {
    actions.innerHTML = `
      <button class="btn btn-primary" id="btn-add-invoice">
        <span style="font-size: 16px;">+</span> Create Invoice
      </button>
    `;

    Utils.$('#btn-add-invoice').addEventListener('click', () => showInvoiceModal());

    container.innerHTML = `
      <div class="card p-0">
        <div class="card-header flex-wrap gap-4">
          <div class="filter-bar m-0">
            <select id="invoice-filter-status" class="form-select">
              <option value="all">All Invoices</option>
              <option value="Draft">Drafts</option>
              <option value="Sent">Sent</option>
              <option value="Partially Paid">Partially Paid</option>
              <option value="Paid">Paid</option>
              <option value="Overdue">Overdue</option>
            </select>
          </div>
          <div class="text-muted text-sm font-mono" id="invoice-count">0 invoices</div>
        </div>
        <div class="table-container" style="border: none; border-radius: 0;">
          <table class="data-table">
            <thead>
              <tr>
                <th>Invoice Number</th>
                <th>Client Name</th>
                <th>Issue Date</th>
                <th>Due Date</th>
                <th>GST Included</th>
                <th>Total (inc GST)</th>
                <th>Paid</th>
                <th>Balance</th>
                <th>Status</th>
                <th style="width: 120px; text-align: right;">Action</th>
              </tr>
            </thead>
            <tbody id="invoices-table-body">
              <!-- Filled JS -->
            </tbody>
          </table>
        </div>
      </div>
    `;

    const statusFilter = Utils.$('#invoice-filter-status');

    const refreshTable = () => {
      const status = statusFilter.value;
      const invoices = Store.getAll(Store.COLLECTIONS.INVOICES);

      // Sort by issue date desc
      invoices.sort((a,b) => new Date(b.issueDate) - new Date(a.issueDate));

      const filtered = invoices.filter(i => status === 'all' || i.status === status);

      Utils.$('#invoice-count').textContent = `Showing ${filtered.length} of ${invoices.length} invoices`;

      const tbody = Utils.$('#invoices-table-body');
      tbody.innerHTML = '';

      if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="10" class="text-center p-8 text-muted">No invoices found.</td></tr>`;
        return;
      }

      filtered.forEach(i => {
        // Paid amount: use recorded value; for legacy 'Paid' invoices with no
        // recorded payment, treat as fully paid so the balance doesn't lie.
        const paid = (i.amountPaid != null && i.amountPaid !== '')
          ? i.amountPaid
          : (i.status === 'Paid' ? i.total : 0);
        const balance = Math.round((i.total - paid) * 100) / 100;

        const badgeClass =
          i.status === 'Paid' ? 'badge-success'
          : i.status === 'Partially Paid' ? 'badge-warning'
          : i.status === 'Sent' ? 'badge-info'
          : i.status === 'Overdue' ? 'badge-danger'
          : 'badge-muted';

        const tr = Utils.createElement('tr');
        tr.innerHTML = `
          <td class="font-mono font-semibold">${i.invoiceNumber}</td>
          <td class="font-medium">${Utils.sanitizeHTML(i.clientName)}</td>
          <td class="font-mono">${Utils.formatDate(i.issueDate)}</td>
          <td class="font-mono">${Utils.formatDate(i.dueDate)}</td>
          <td class="font-mono">${Utils.formatCurrency(i.gstTotal)}</td>
          <td class="font-mono font-bold text-gold">${Utils.formatCurrency(i.total)}</td>
          <td class="font-mono text-success">${Utils.formatCurrency(paid)}</td>
          <td class="font-mono ${balance > 0 ? 'text-danger font-semibold' : 'text-muted'}">${Utils.formatCurrency(balance)}</td>
          <td>
            <span class="badge ${badgeClass}">${i.status}</span>
          </td>
          <td>
            <div class="table-actions justify-end">
              <button class="btn btn-icon btn-ghost sm" title="View & Print Invoice" onclick="Accounting.viewInvoicePreview('${i.id}')">📄</button>
              ${i.status !== 'Paid' ? `<button class="btn btn-icon btn-ghost sm text-success" title="Mark Fully Paid" onclick="Accounting.markInvoicePaid('${i.id}')">✓</button>` : ''}
              <button class="btn btn-icon btn-ghost sm text-danger" title="Delete" onclick="Accounting.deleteInvoice('${i.id}')">🗑️</button>
            </div>
          </td>
        `;
        tbody.appendChild(tr);
      });
    };

    statusFilter.addEventListener('change', refreshTable);
    refreshTable();
  }

  function showInvoiceModal(invoiceId = null) {
    const isEdit = !!invoiceId;
    const inv = isEdit ? Store.getById(Store.COLLECTIONS.INVOICES, invoiceId) : null;
    const clients = Store.getAll(Store.COLLECTIONS.CLIENTS);

    const modalHTML = `
      <form id="invoice-form" class="animate-fade-in-scale">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Select Client <span class="required">*</span></label>
            <select name="clientId" class="form-select" required>
              <option value="">-- Select Client --</option>
              ${clients.map(c => `<option value="${c.id}" ${inv && inv.clientId === c.id ? 'selected' : ''}>${Utils.sanitizeHTML(c.name)}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Invoice Number <span class="required">*</span></label>
            <input type="text" name="invoiceNumber" class="form-input font-mono" required value="${inv ? inv.invoiceNumber : 'INV-' + new Date().getFullYear() + '-' + Utils.randomBetween(100, 999)}">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Issue Date <span class="required">*</span></label>
            <input type="date" name="issueDate" class="form-input" required value="${inv ? inv.issueDate : new Date().toISOString().split('T')[0]}">
          </div>
          <div class="form-group">
            <label class="form-label">Due Date <span class="required">*</span></label>
            <input type="date" name="dueDate" class="form-input" required value="${inv ? inv.dueDate : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}">
          </div>
        </div>

        <div style="border-top: 1px solid var(--pc-border); padding-top: 16px; margin-top: 16px;">
          <h4 class="text-sm font-semibold text-gold mb-2">Invoice Line Items</h4>
          <div id="invoice-items-list" class="d-flex flex-col gap-3">
            <!-- Dynamically populated or new lines -->
          </div>
          <button type="button" class="btn btn-secondary btn-sm mt-3" id="btn-add-item-row">+ Add Line Item</button>
        </div>

        <div class="form-group mt-4">
          <label class="form-label">Invoice Memo / Notes</label>
          <textarea name="notes" class="form-textarea" placeholder="Payment instructions, bank details, bridal orders reference...">${inv ? Utils.sanitizeHTML(inv.notes || '') : 'Direct deposit payment info:\nBank: Commonwealth Bank of Australia\nBSB: 062-900 BSB\nAccount: 1045 9827'}</textarea>
        </div>
      </form>
    `;

    App.showModal({
      title: isEdit ? 'Edit Tax Invoice' : 'Create Tax Invoice',
      content: modalHTML,
      submitText: isEdit ? 'Save Invoice' : 'Issue Invoice',
      onSubmit: (modalEl) => {
        const form = Utils.$('#invoice-form', modalEl);
        if (!form.checkValidity()) {
          form.reportValidity();
          return false;
        }

        const formData = new FormData(form);
        const selClientId = formData.get('clientId');
        const selectedClient = Store.getById(Store.COLLECTIONS.CLIENTS, selClientId);

        // Map line items inputs
        const items = [];
        let subtotal = 0;
        let gstTotal = 0;

        const rows = Utils.$$('.invoice-item-row', modalEl);
        rows.forEach(row => {
          const desc = Utils.$('.row-desc', row).value;
          const qty = parseFloat(Utils.$('.row-qty', row).value) || 0;
          const rate = parseFloat(Utils.$('.row-rate', row).value) || 0;
          const isGst = Utils.$('.row-gst', row).checked;

          if (desc) {
            const lineSub = qty * rate;
            const lineGst = isGst ? Math.round(lineSub * 0.1 * 100) / 100 : 0;
            const lineTotal = lineSub + lineGst;

            items.push({
              description: desc,
              quantity: qty,
              unitPrice: rate,
              gst: lineGst,
              amount: lineTotal
            });

            subtotal += lineSub;
            gstTotal += lineGst;
          }
        });

        if (items.length === 0) {
          Utils.showToast('Please add at least one line item.', 'error');
          return false;
        }

        const invoiceData = {
          clientId: selClientId,
          clientName: selectedClient ? selectedClient.name : 'Unknown Client',
          invoiceNumber: formData.get('invoiceNumber'),
          issueDate: formData.get('issueDate'),
          dueDate: formData.get('dueDate'),
          notes: formData.get('notes'),
          items: items,
          subtotal: Math.round(subtotal * 100) / 100,
          gstTotal: Math.round(gstTotal * 100) / 100,
          total: Math.round((subtotal + gstTotal) * 100) / 100,
          status: inv ? inv.status : 'Draft',
          // Always set amountPaid so payment gate reads correctly.
          // Preserve existing value on edit; default to 0 on create.
          amountPaid: inv ? (inv.amountPaid != null ? inv.amountPaid : 0) : 0,
          // orderId is null for manually created invoices (not linked to a CRM order).
          orderId: inv ? (inv.orderId || null) : null
        };

        if (isEdit) {
          Store.update(Store.COLLECTIONS.INVOICES, invoiceId, invoiceData);
          Utils.showToast('Tax invoice saved.');
        } else {
          Store.create(Store.COLLECTIONS.INVOICES, invoiceData);
          Utils.showToast('Tax invoice generated successfully.');
        }

        renderSubTab();
        return true;
      }
    });

    // Populate rows handler
    const itemsList = Utils.$('#invoice-items-list');

    function addRow(item = null) {
      const row = Utils.createElement('div', { className: 'invoice-item-row d-flex gap-2 items-center' });
      row.innerHTML = `
        <input type="text" class="form-input row-desc" placeholder="Apparel/Custom service description" required style="flex: 2;" value="${item ? Utils.sanitizeHTML(item.description) : ''}">
        <input type="number" class="form-input row-qty" placeholder="Qty" required style="width: 70px;" min="1" value="${item ? item.quantity : 1}">
        <input type="number" class="form-input row-rate" placeholder="Rate (ex GST)" required style="width: 110px;" min="0" value="${item ? item.unitPrice : ''}">
        <label class="d-flex items-center gap-1 text-xs text-muted" style="width: 80px; flex-shrink:0;">
          <input type="checkbox" class="row-gst" ${!item || item.gst > 0 ? 'checked' : ''}> Add GST
        </label>
        <button type="button" class="btn btn-icon btn-ghost sm text-danger" onclick="this.parentElement.remove()">🗑️</button>
      `;
      itemsList.appendChild(row);
    }

    Utils.$('#btn-add-item-row').addEventListener('click', () => addRow());

    // Pre-populate if edit, else add one blank row
    if (inv && inv.items) {
      inv.items.forEach(item => addRow(item));
    } else {
      addRow();
    }
  }

  function viewInvoicePreview(id) {
    const inv = Store.getById(Store.COLLECTIONS.INVOICES, id);
    if (!inv) return;

    const settings = Store.getSettings();

    const paidAmt = (inv.amountPaid != null && inv.amountPaid !== '') ? inv.amountPaid : (inv.status === 'Paid' ? inv.total : 0);
    const balanceDue = Math.round((inv.total - paidAmt) * 100) / 100;

    const modalHTML = `
      <div class="invoice-preview animate-fade-in p-8" style="background: #fff; color: #111; font-family: sans-serif; border-radius: var(--radius-lg)">
        <div class="d-flex justify-between items-start" style="border-bottom: 2px solid #ECB676; padding-bottom: var(--sp-5); margin-bottom: var(--sp-6)">
          <div>
            <h2 style="margin: 0; color: #111; font-family: serif; font-size: 24px;">${settings.companyName}</h2>
            <div style="font-size: 11px; color: #666; margin-top: 4px;">ABN: ${settings.abn}</div>
            <div style="font-size: 11px; color: #666;">${settings.companyAddress}</div>
            <div style="font-size: 11px; color: #666;">Email: ${settings.companyEmail} | Phone: ${settings.companyPhone}</div>
          </div>
          <div class="text-right">
            <h3 style="margin: 0; color: #ECB676; text-transform: uppercase; font-size: 18px;">Tax Invoice</h3>
            <div style="font-size: 13px; font-weight: bold; margin-top: 6px; font-family: monospace;">Invoice #: ${inv.invoiceNumber}</div>
            <div style="font-size: 11px; color: #666; margin-top: 2px;">Status: <span style="text-transform: uppercase; font-weight:bold; color: ${inv.status === 'Paid' ? '#10B981' : '#F59E0B'}">${inv.status}</span></div>
          </div>
        </div>

        <div style="margin-bottom: var(--sp-6); font-size: 12px;">
          <div style="font-weight: bold; color: #555; text-transform: uppercase; margin-bottom: 4px;">Bill To:</div>
          <div style="font-size: 14px; font-weight: bold;">${Utils.sanitizeHTML(inv.clientName)}</div>
          ${inv.projectId ? `<div style="font-size: 11px; color: #888; margin-top: 2px;">Project Invoice</div>` : ''}
        </div>

        <table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 20px;">
          <thead>
            <tr style="background: #fdfaf6;">
              <th style="padding: 8px; text-align: left; border-bottom: 2px solid #ECB676; color: #111;">Description</th>
              <th style="padding: 8px; text-align: center; border-bottom: 2px solid #ECB676; color: #111; width: 60px;">Qty</th>
              <th style="padding: 8px; text-align: right; border-bottom: 2px solid #ECB676; color: #111; width: 100px;">Unit Rate</th>
              <th style="padding: 8px; text-align: right; border-bottom: 2px solid #ECB676; color: #111; width: 80px;">GST</th>
              <th style="padding: 8px; text-align: right; border-bottom: 2px solid #ECB676; color: #111; width: 110px;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${inv.items.map(item => `
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #eee;">${Utils.sanitizeHTML(item.description)}</td>
                <td style="padding: 8px; text-align: center; border-bottom: 1px solid #eee; font-family: monospace;">${item.quantity}</td>
                <td style="padding: 8px; text-align: right; border-bottom: 1px solid #eee; font-family: monospace;">${Utils.formatCurrency(item.unitPrice)}</td>
                <td style="padding: 8px; text-align: right; border-bottom: 1px solid #eee; font-family: monospace; color: #888;">${Utils.formatCurrency(item.gst)}</td>
                <td style="padding: 8px; text-align: right; border-bottom: 1px solid #eee; font-family: monospace; font-weight: bold;">${Utils.formatCurrency(item.amount)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="d-flex justify-end" style="margin-top: 20px; font-size: 13px;">
          <div style="width: 240px;">
            <div class="d-flex justify-between" style="padding: 4px 0;">
              <span style="color: #666;">Subtotal (excl GST):</span>
              <span style="font-family: monospace;">${Utils.formatCurrency(inv.subtotal)}</span>
            </div>
            <div class="d-flex justify-between" style="padding: 4px 0; border-bottom: 1px solid #eee;">
              <span style="color: #666;">Total GST (10%):</span>
              <span style="font-family: monospace;">${Utils.formatCurrency(inv.gstTotal)}</span>
            </div>
            <div class="d-flex justify-between" style="padding: 8px 0; font-weight: bold; font-size: 15px; color: #ECB676;">
              <span>Total (inc GST):</span>
              <span style="font-family: monospace;">${Utils.formatCurrency(inv.total)}</span>
            </div>
            <div class="d-flex justify-between" style="padding: 4px 0; color: #10B981;">
              <span>Amount Paid:</span>
              <span style="font-family: monospace;">${Utils.formatCurrency(paidAmt)}</span>
            </div>
            <div class="d-flex justify-between" style="padding: 8px 0; font-weight: bold; font-size: 15px; border-top: 1px solid #eee; color: #111;">
              <span>Balance Due:</span>
              <span style="font-family: monospace;">${Utils.formatCurrency(balanceDue)}</span>
            </div>
          </div>
        </div>

        ${inv.milestones && inv.milestones.length ? `
        <div style="margin-top: 20px; font-size: 12px;">
          <div style="font-weight: bold; color: #ECB676; text-transform: uppercase; margin-bottom: 8px;">Payment Milestones</div>
          ${inv.milestones.map(m => `
            <div style="display:flex; justify-content:space-between; padding:6px 0; border-bottom:1px solid #eee;">
              <div>
                <div style="font-weight:600;">${Utils.sanitizeHTML(m.label)}</div>
              </div>
              <div style="text-align:right;">
                <div style="font-family:monospace; font-weight:bold;">${Utils.formatCurrency(m.amount)}</div>
                <div style="font-size:10px; color:${m.paid ? '#10B981' : '#F59E0B'};">${m.paid ? '✓ Paid' : 'Pending'}</div>
              </div>
            </div>`).join('')}
        </div>` : ''}
        <div style="margin-top: 40px; font-size: 11px; color: #666; border-top: 1px solid #eee; padding-top: 12px; white-space: pre-line;">
          <div style="font-weight: bold; margin-bottom: 4px; text-transform: uppercase;">Payment Terms / Note:</div>
          ${Utils.sanitizeHTML(inv.notes || '')}
        </div>
      </div>
    `;

    App.showModal({
      title: `Invoice Advice — ${inv.invoiceNumber}`,
      content: modalHTML,
      submitText: 'Print Invoice',
      onSubmit: () => {
        // Mock print - open window and trigger print
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
          <html>
            <head>
              <title>Print Invoice ${inv.invoiceNumber}</title>
              <style>
                body { font-family: sans-serif; padding: 40px; }
                .d-flex { display: flex; }
                .justify-between { justify-content: space-between; }
                .text-right { text-align: right; }
                .justify-end { justify-content: flex-end; }
              </style>
            </head>
            <body>
              ${modalHTML}
              <script>window.onload = function() { window.print(); window.close(); }</script>
            </body>
          </html>
        `);
        printWindow.document.close();
        return true;
      }
    });
  }

  function markInvoicePaid(id) {
    const inv = Store.getById(Store.COLLECTIONS.INVOICES, id);
    if (!inv) return;
    Store.update(Store.COLLECTIONS.INVOICES, id, { status: 'Paid', amountPaid: inv.total });
    Utils.showToast('Invoice marked as fully paid.');
    renderSubTab();
  }

  function deleteInvoice(id) {
    App.showConfirm({
      title: 'Delete Invoice',
      text: 'Are you sure you want to delete this invoice record from history?',
      confirmText: 'Delete Invoice',
      onConfirm: () => {
        Store.delete(Store.COLLECTIONS.INVOICES, id);
        Utils.showToast('Invoice record deleted.', 'info');
        renderSubTab();
      }
    });
  }

  // ==========================================
  // EXPENSES SUB-TAB
  // ==========================================

  function renderExpenses(container, actions) {
    actions.innerHTML = `
      <button class="btn btn-primary" id="btn-add-expense">
        <span style="font-size: 16px;">+</span> Log Expense
      </button>
    `;

    Utils.$('#btn-add-expense').addEventListener('click', () => showExpenseModal());

    container.innerHTML = `
      <div class="card p-0">
        <div class="card-header flex-wrap gap-4">
          <div class="filter-bar m-0">
            <select id="expense-filter-cat" class="form-select">
              <option value="all">All Categories</option>
              <option value="Fabric">Fabric / Materials</option>
              <option value="Rent">Showroom Rent</option>
              <option value="Utilities">Utilities</option>
              <option value="Marketing">Marketing / Ads</option>
              <option value="Salary">Salary / Wages</option>
              <option value="Equipment">Equipment / Tools</option>
              <option value="Other">Other Expenses</option>
            </select>
          </div>
          <div class="text-muted text-sm font-mono" id="expense-count">0 expenses</div>
        </div>
        <div class="table-container" style="border: none; border-radius: 0;">
          <table class="data-table">
            <thead>
              <tr>
                <th>Expense Date</th>
                <th>Category</th>
                <th>Paid To / Vendor</th>
                <th>Description</th>
                <th>GST Paid</th>
                <th>Total (inc GST)</th>
                <th style="width: 100px; text-align: right;">Action</th>
              </tr>
            </thead>
            <tbody id="expenses-table-body">
              <!-- Loaded dynamically -->
            </tbody>
          </table>
        </div>
      </div>
    `;

    const catFilter = Utils.$('#expense-filter-cat');

    const refreshTable = () => {
      const cat = catFilter.value;
      const expenses = Store.getAll(Store.COLLECTIONS.EXPENSES);

      expenses.sort((a,b) => new Date(b.expenseDate) - new Date(a.expenseDate));

      const filtered = expenses.filter(e => cat === 'all' || e.category === cat);

      Utils.$('#expense-count').textContent = `Showing ${filtered.length} of ${expenses.length} expenses`;

      const tbody = Utils.$('#expenses-table-body');
      tbody.innerHTML = '';

      if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center p-8 text-muted">No expenses found.</td></tr>`;
        return;
      }

      filtered.forEach(e => {
        const tr = Utils.createElement('tr');
        tr.innerHTML = `
          <td class="font-mono">${Utils.formatDate(e.expenseDate)}</td>
          <td>
            <span class="badge ${e.category === 'Fabric' ? 'badge-gold' : e.category === 'Salary' ? 'badge-info' : e.category === 'Rent' ? 'badge-purple' : 'badge-muted'}">
              ${e.category}
            </span>
          </td>
          <td class="font-medium">${Utils.sanitizeHTML(e.vendor)}</td>
          <td class="text-muted truncate" style="max-width: 250px;" title="${Utils.sanitizeHTML(e.notes || '')}">
            ${Utils.sanitizeHTML(e.notes || '—')}
          </td>
          <td class="font-mono text-muted">${Utils.formatCurrency(e.gst)}</td>
          <td class="font-mono font-bold text-danger">-${Utils.formatCurrency(e.amount)}</td>
          <td>
            <div class="table-actions justify-end">
              <button class="btn btn-icon btn-ghost sm" title="Edit" onclick="Accounting.editExpense('${e.id}')">✏️</button>
              <button class="btn btn-icon btn-ghost sm text-danger" title="Delete" onclick="Accounting.deleteExpense('${e.id}')">🗑️</button>
            </div>
          </td>
        `;
        tbody.appendChild(tr);
      });
    };

    catFilter.addEventListener('change', refreshTable);
    refreshTable();
  }

  function showExpenseModal(expId = null) {
    const isEdit = !!expId;
    const exp = isEdit ? Store.getById(Store.COLLECTIONS.EXPENSES, expId) : null;

    const modalHTML = `
      <form id="expense-form" class="animate-fade-in-scale">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Expense Category <span class="required">*</span></label>
            <select name="category" class="form-select" required>
              <option value="Fabric" ${exp && exp.category === 'Fabric' ? 'selected' : ''}>Fabric / Materials</option>
              <option value="Rent" ${exp && exp.category === 'Rent' ? 'selected' : ''}>Showroom Rent</option>
              <option value="Utilities" ${exp && exp.category === 'Utilities' ? 'selected' : ''}>Utilities</option>
              <option value="Marketing" ${exp && exp.category === 'Marketing' ? 'selected' : ''}>Marketing / Ads</option>
              <option value="Salary" ${exp && exp.category === 'Salary' ? 'selected' : ''}>Salary / Wages</option>
              <option value="Equipment" ${exp && exp.category === 'Equipment' ? 'selected' : ''}>Equipment / Tools</option>
              <option value="Other" ${exp && exp.category === 'Other' ? 'selected' : ''}>Other</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Paid to / Vendor <span class="required">*</span></label>
            <input type="text" name="vendor" class="form-input" required placeholder="e.g. Banaras Fabrics Ltd" value="${exp ? Utils.sanitizeHTML(exp.vendor) : ''}">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Date of Payment <span class="required">*</span></label>
            <input type="date" name="date" class="form-input" required value="${exp ? exp.expenseDate : new Date().toISOString().split('T')[0]}">
          </div>
          <div class="form-group">
            <label class="form-label">Total Paid Amount (inc GST) <span class="required">*</span></label>
            <input type="number" name="amount" class="form-input" min="0" step="0.01" required value="${exp ? exp.amount : ''}">
          </div>
        </div>
        <div class="form-group">
          <label class="d-flex items-center gap-2 text-sm text-muted">
            <input type="checkbox" name="gstRegistered" id="expense-gst-registered" ${!exp || exp.gst > 0 ? 'checked' : ''}> Include 10% GST Claim (Wages are GST exempt)
          </label>
        </div>
        <div class="form-group m-0">
          <label class="form-label">Expense Log Notes</label>
          <textarea name="notes" class="form-textarea" placeholder="Details of fabric materials, invoice attachments references...">${exp ? Utils.sanitizeHTML(exp.notes || '') : ''}</textarea>
        </div>
      </form>
    `;

    App.showModal({
      title: isEdit ? 'Edit Ledger Expense' : 'Log Business Expense',
      content: modalHTML,
      submitText: isEdit ? 'Save Changes' : 'Log Expense',
      onSubmit: (modalEl) => {
        const form = Utils.$('#expense-form', modalEl);
        if (!form.checkValidity()) {
          form.reportValidity();
          return false;
        }

        const formData = new FormData(form);
        const amount = parseFloat(formData.get('amount'));
        const hasGst = Utils.$('#expense-gst-registered', modalEl).checked;

        // Australian GST represents 1/11th of total paid amount if GST registered
        const gst = hasGst ? Math.round((amount / 11) * 100) / 100 : 0;

        const expData = {
          category: formData.get('category'),
          vendor: formData.get('vendor'),
          expenseDate: formData.get('date'),
          amount: amount,
          gst: gst,
          notes: formData.get('notes'),
          isRecurring: false
        };

        if (isEdit) {
          Store.update(Store.COLLECTIONS.EXPENSES, expId, expData);
          Utils.showToast('Expense log updated.');
        } else {
          Store.create(Store.COLLECTIONS.EXPENSES, expData);
          Utils.showToast('Business expense registered.');
        }

        renderSubTab();
        return true;
      }
    });
  }

  function editExpense(id) {
    showExpenseModal(id);
  }

  function deleteExpense(id) {
    App.showConfirm({
      title: 'Remove Expense',
      text: 'Are you sure you want to delete this expense record from the ledger?',
      confirmText: 'Delete Expense',
      onConfirm: () => {
        Store.delete(Store.COLLECTIONS.EXPENSES, id);
        Utils.showToast('Expense record deleted.', 'info');
        renderSubTab();
      }
    });
  }

  // ==========================================
  // GST BAS REPORT
  // ==========================================

  function renderGST(container, actions) {
    const invoices = Store.getAll(Store.COLLECTIONS.INVOICES);
    const expenses = Store.getAll(Store.COLLECTIONS.EXPENSES);
    const settings = Store.getSettings();

    // Summarize quarterly
    // Q1: Jul-Sep, Q2: Oct-Dec, Q3: Jan-Mar, Q4: Apr-Jun (AU Financial Year starts July)
    const quarters = [
      { name: 'Q1 (Jul - Sep)', months: [6, 7, 8], collected: 0, paid: 0 },
      { name: 'Q2 (Oct - Dec)', months: [9, 10, 11], collected: 0, paid: 0 },
      { name: 'Q3 (Jan - Mar)', months: [0, 1, 2], collected: 0, paid: 0 },
      { name: 'Q4 (Apr - Jun)', months: [3, 4, 5], collected: 0, paid: 0 }
    ];

    // Filter invoices by paid/sent status (BAS is cash/accrual basis, let's do accrual: sent + paid)
    invoices.filter(i => i.status === 'Paid' || i.status === 'Sent').forEach(i => {
      const date = new Date(i.issueDate);
      const m = date.getMonth();
      quarters.forEach(q => {
        if (q.months.includes(m)) q.collected += i.gstTotal;
      });
    });

    expenses.forEach(e => {
      const date = new Date(e.expenseDate);
      const m = date.getMonth();
      quarters.forEach(q => {
        if (q.months.includes(m)) q.paid += e.gst;
      });
    });

    // Total GST liability
    const totalCollected = quarters.reduce((sum, q) => sum + q.collected, 0);
    const totalPaid = quarters.reduce((sum, q) => sum + q.paid, 0);
    const netGst = totalCollected - totalPaid;

    container.innerHTML = `
      <div class="d-grid gap-6" style="grid-template-columns: 1fr 2fr;">
        <!-- BAS Info Card -->
        <div class="d-flex flex-col gap-4">
          <div class="card p-5">
            <h3 class="font-display text-sm mb-3">GST Liability Summary</h3>
            <div class="d-flex flex-col gap-3">
              <div>
                <div class="text-xs text-muted">GST Collected (Sales)</div>
                <div class="text-md font-mono font-semibold text-success">${Utils.formatCurrency(totalCollected)}</div>
              </div>
              <div>
                <div class="text-xs text-muted">GST Paid (Expenses)</div>
                <div class="text-md font-mono font-semibold text-danger">-${Utils.formatCurrency(totalPaid)}</div>
              </div>
              <div style="border-top: 1px solid var(--pc-border); padding-top: 12px; margin-top: 4px;">
                <div class="text-xs text-muted">Net Refund / Liability (ATO Payment)</div>
                <div class="text-lg font-mono font-bold ${netGst >= 0 ? 'text-gold' : 'text-success'}">
                  ${Utils.formatCurrency(Math.abs(netGst))} ${netGst >= 0 ? 'Due' : 'Refund'}
                </div>
              </div>
            </div>
          </div>

          <div class="card p-5">
            <h4 class="text-xs font-semibold text-gold mb-2">Australian ATO Compliance</h4>
            <p class="text-xs text-muted font-light m-0">
              Pooja's Couture is registered for GST (ABN: ${settings.abn}). BAS statements must be submitted quarterly.
              GST collected represents 10% on tax invoices. GST paid represents 1/11th of eligible business purchases.
            </p>
          </div>
        </div>

        <!-- Quarterly breakdown Table -->
        <div class="card p-0">
          <div class="card-header">
            <div class="card-title">Business Activity Statement (BAS) Quarters</div>
          </div>
          <div class="table-container" style="border: none; border-radius: 0;">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Financial Quarter</th>
                  <th>GST Collected (G1)</th>
                  <th>GST Paid (1B)</th>
                  <th>Net Position</th>
                </tr>
              </thead>
              <tbody>
                ${quarters.map(q => {
                  const qNet = q.collected - q.paid;
                  return `
                    <tr>
                      <td class="font-medium">${q.name}</td>
                      <td class="font-mono text-success">${Utils.formatCurrency(q.collected)}</td>
                      <td class="font-mono text-danger">-${Utils.formatCurrency(q.paid)}</td>
                      <td class="font-mono font-semibold ${qNet >= 0 ? 'text-gold' : 'text-success'}">
                        ${qNet >= 0 ? 'Due: ' : 'Refund: '}${Utils.formatCurrency(Math.abs(qNet))}
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  // ==========================================
  // FINANCIAL REPORTS
  // ==========================================

  function renderReports(container, actions) {
    const invoices = Store.getAll(Store.COLLECTIONS.INVOICES).filter(i => i.status === 'Paid');
    const expenses = Store.getAll(Store.COLLECTIONS.EXPENSES);

    // Sum revenue and expenses
    const totalRev = invoices.reduce((sum, i) => sum + i.subtotal, 0); // Profit is calculated on subtotal (ex GST)
    const totalExp = expenses.reduce((sum, e) => sum + (e.amount - e.gst), 0); // Expense excl GST
    const operatingProfit = totalRev - totalExp;

    // Categorized expense lists
    const categoriesMap = {};
    expenses.forEach(e => {
      categoriesMap[e.category] = (categoriesMap[e.category] || 0) + (e.amount - e.gst);
    });

    container.innerHTML = `
      <div class="card p-8 max-w-xl mx-auto" style="max-width: 680px; margin: 0 auto;">
        <div class="text-center mb-6" style="border-bottom: 2px solid var(--pc-gold); padding-bottom: 16px;">
          <h2 class="font-display">Pooja's Couture</h2>
          <p class="text-xs text-gold text-uppercase mt-1">Profit & Loss Statement (Cash-Basis)</p>
          <p class="text-xs text-muted mt-1">For Period: 01 Jul 2025 to 30 Jun 2026</p>
        </div>

        <div class="d-flex flex-col gap-4">
          <!-- Revenues section -->
          <div>
            <div class="d-flex justify-between items-center text-sm font-semibold text-gold" style="border-bottom: 1px solid var(--pc-border); padding-bottom: 6px;">
              <span>1. OPERATING REVENUE</span>
              <span>EX GST</span>
            </div>
            <div class="d-flex justify-between text-xs p-2 mt-2">
              <span class="text-muted">Couture Sales & Design Fees</span>
              <span class="font-mono">${Utils.formatCurrency(totalRev)}</span>
            </div>
            <div class="d-flex justify-between text-xs font-semibold p-2" style="background: rgba(255,255,255,0.01);">
              <span>Total Revenue</span>
              <span class="font-mono">${Utils.formatCurrency(totalRev)}</span>
            </div>
          </div>

          <!-- Expenses section -->
          <div>
            <div class="d-flex justify-between items-center text-sm font-semibold text-gold" style="border-bottom: 1px solid var(--pc-border); padding-bottom: 6px;">
              <span>2. OPERATING EXPENSES</span>
              <span>EX GST</span>
            </div>

            ${Object.entries(categoriesMap).map(([cat, val]) => `
              <div class="d-flex justify-between text-xs p-2">
                <span class="text-muted">${cat} Expenses</span>
                <span class="font-mono">${Utils.formatCurrency(val)}</span>
              </div>
            `).join('')}

            ${Object.keys(categoriesMap).length === 0 ? `
              <div class="text-xs text-muted p-2">No expenses logged.</div>
            ` : ''}

            <div class="d-flex justify-between text-xs font-semibold p-2" style="background: rgba(255,255,255,0.01); border-top: 1px solid var(--pc-border);">
              <span>Total Operating Expenses</span>
              <span class="font-mono">${Utils.formatCurrency(totalExp)}</span>
            </div>
          </div>

          <!-- Totals summary -->
          <div class="mt-4" style="border-top: 2px solid var(--pc-border); border-bottom: 2px solid var(--pc-border); padding: 12px 0;">
            <div class="d-flex justify-between items-center font-bold text-md">
              <span class="text-gold">NET OPERATING PROFIT / LOSS</span>
              <span class="font-mono ${operatingProfit >= 0 ? 'text-success' : 'text-danger'}">
                ${Utils.formatCurrency(operatingProfit)}
              </span>
            </div>
          </div>
        </div>

        <div class="d-flex justify-end gap-2 mt-6">
          <button class="btn btn-secondary btn-sm" onclick="window.print()">🖨️ Print Statement</button>
        </div>
      </div>
    `;
  }

  return {
    init,
    viewInvoicePreview,
    markInvoicePaid,
    deleteInvoice,
    editExpense,
    deleteExpense
  };
})();
