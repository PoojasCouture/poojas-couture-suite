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
          </div>
      </div>

      <div class="animate-fade-in" style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px;">
        <button class="tab-btn ${activeTab === 'dashboard' ? 'active' : ''}" data-tab="dashboard" style="font-size:14px;padding:8px 18px;border-radius:20px;font-weight:600;">Overview</button>
        <button class="tab-btn ${activeTab === 'invoices' ? 'active' : ''}" data-tab="invoices" style="font-size:14px;padding:8px 18px;border-radius:20px;font-weight:600;">Invoices</button>
        <button class="tab-btn ${activeTab === 'expenses' ? 'active' : ''}" data-tab="expenses" style="font-size:14px;padding:8px 18px;border-radius:20px;font-weight:600;">Expenses</button>
        <button class="tab-btn ${activeTab === 'gst' ? 'active' : ''}" data-tab="gst" style="font-size:14px;padding:8px 18px;border-radius:20px;font-weight:600;">GST BAS Report</button>
        <button class="tab-btn ${activeTab === 'reports' ? 'active' : ''}" data-tab="reports" style="font-size:14px;padding:8px 18px;border-radius:20px;font-weight:600;">Financial Reports</button>
      </div>

      <div id="accounting-tab-content" class="animate-fade-in stagger-2">
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
    const invoices = Store.getAll(Store.COLLECTIONS.INVOICES);
    const expenses = Store.getAll(Store.COLLECTIONS.EXPENSES);

    const paidInvoices = invoices.filter(i => i.status === 'Paid');
    const outstandingInvoices = invoices.filter(i => i.status === 'Sent' || i.status === 'Overdue');

    const totalRevenue = paidInvoices.reduce((sum, i) => sum + i.total, 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const outstandingAmount = outstandingInvoices.reduce((sum, i) => sum + i.total, 0);
    const netProfit = totalRevenue - totalExpenses;

    container.innerHTML = `
      <div class="widgets-grid animate-fade-in stagger-1">
        <div class="stat-card" style="cursor:pointer" onclick="Accounting.showReport('revenue')">
          <div class="stat-card-header">
            <span class="stat-card-icon green">💰</span>
            <span class="stat-card-trend up">+$${Utils.formatCompact(totalRevenue)}</span>
          </div>
          <div class="stat-card-value">${Utils.formatCurrency(totalRevenue)}</div>
          <div class="stat-card-label">Total Revenue (Cash-basis)</div>
        </div>
        <div class="stat-card" style="cursor:pointer" onclick="Accounting.showReport('expenses')">
          <div class="stat-card-header">
            <span class="stat-card-icon red">💸</span>
            <span class="stat-card-trend down">-$${Utils.formatCompact(totalExpenses)}</span>
          </div>
          <div class="stat-card-value">${Utils.formatCurrency(totalExpenses)}</div>
          <div class="stat-card-label">Total Expenses Logged</div>
        </div>
        <div class="stat-card" style="cursor:pointer" onclick="Accounting.showReport('profit')">
          <div class="stat-card-header">
            <span class="stat-card-icon gold">⚖️</span>
            <span class="stat-card-trend ${netProfit >= 0 ? 'up' : 'down'}">${netProfit >= 0 ? 'Profit' : 'Loss'}</span>
          </div>
          <div class="stat-card-value ${netProfit >= 0 ? 'text-success' : 'text-danger'}">${Utils.formatCurrency(netProfit)}</div>
          <div class="stat-card-label">Net Profit / Loss Position</div>
        </div>
        <div class="stat-card" style="cursor:pointer" onclick="Accounting.showReport('outstanding')">
          <div class="stat-card-header">
            <span class="stat-card-icon amber">🔔</span>
            <span class="badge badge-warning">${outstandingInvoices.length} Pending</span>
          </div>
          <div class="stat-card-value">${Utils.formatCurrency(outstandingAmount)}</div>
          <div class="stat-card-label">Outstanding Invoices (Accrual)</div>
        </div>
      </div>

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
            <div class="d-flex flex-col gap-2 justify-center" id="expense-category-breakdown"></div>
          </div>
        </div>
      </div>
    `;

    requestAnimationFrame(() => {
      const months = ['Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May'];
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

      const categoriesMap = {};
      expenses.forEach(e => {
        categoriesMap[e.category] = (categoriesMap[e.category] || 0) + e.amount;
      });

      const donutData = Object.entries(categoriesMap).map(([label, value], idx) => ({
        label, value, color: Utils.getChartColor(idx)
      }));

      Charts.Donut('expense-donut-chart', donutData, {
        centerText: { value: '$' + Utils.formatCompact(totalExpenses), label: 'Total Expenses' }
      });

      const legendContainer = Utils.$('#expense-category-breakdown');
      legendContainer.innerHTML = '';
      if (donutData.length === 0) {
        legendContainer.innerHTML = '<div class="text-xs text-muted">No expenses logged.</div>';
      } else {
        donutData.sort((a, b) => b.value - a.value);
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
                <th style="width: 140px; text-align: right;">Action</th>
              </tr>
            </thead>
            <tbody id="invoices-table-body"></tbody>
          </table>
        </div>
      </div>
    `;

    const statusFilter = Utils.$('#invoice-filter-status');

    const refreshTable = () => {
      const status = statusFilter.value;
      const invoices = Store.getAll(Store.COLLECTIONS.INVOICES);
      invoices.sort((a, b) => new Date(b.issueDate) - new Date(a.issueDate));
      const filtered = invoices.filter(i => status === 'all' || i.status === status);

      Utils.$('#invoice-count').textContent = `Showing ${filtered.length} of ${invoices.length} invoices`;

      const tbody = Utils.$('#invoices-table-body');
      tbody.innerHTML = '';

      if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="10" class="text-center p-8 text-muted">No invoices found.</td></tr>`;
        return;
      }

      filtered.forEach(i => {
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

        const hasMilestones = i.milestones && i.milestones.length && i.status !== 'Paid';

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
          <td><span class="badge ${badgeClass}">${i.status}</span></td>
          <td>
            <div class="table-actions justify-end">
              <button class="btn btn-icon btn-ghost sm" title="View & Print Invoice" onclick="Accounting.viewInvoicePreview('${i.id}')">📄</button>
              ${hasMilestones ? `<button class="btn btn-icon btn-ghost sm text-gold" title="Record Milestone Payment" onclick="Accounting.recordMilestonePayment('${i.id}')">💳</button>` : ''}
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
          <div id="invoice-items-list" class="d-flex flex-col gap-3"></div>
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
        if (!form.checkValidity()) { form.reportValidity(); return false; }

        const formData = new FormData(form);
        const selClientId = formData.get('clientId');
        const selectedClient = Store.getById(Store.COLLECTIONS.CLIENTS, selClientId);

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
            items.push({ description: desc, quantity: qty, unitPrice: rate, gst: lineGst, amount: lineTotal });
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
          items,
          subtotal: Math.round(subtotal * 100) / 100,
          gstTotal: Math.round(gstTotal * 100) / 100,
          total: Math.round((subtotal + gstTotal) * 100) / 100,
          status: inv ? inv.status : 'Draft',
          amountPaid: inv ? (inv.amountPaid != null ? inv.amountPaid : 0) : 0,
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
              <div><div style="font-weight:600;">${Utils.sanitizeHTML(m.label)}</div></div>
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
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
          <html>
            <head>
              <title>Print Invoice ${inv.invoiceNumber}</title>
              <style>
                * { box-sizing: border-box; }
                body { font-family: sans-serif; padding: 40px; color: #111; background: #fff; }
                .d-flex { display: flex; }
                .justify-between { justify-content: space-between; }
                .justify-end { justify-content: flex-end; }
                .text-right { text-align: right; }
                .items-center { align-items: center; }
                .items-start { align-items: flex-start; }
                .font-bold { font-weight: bold; }
                .font-semibold { font-weight: 600; }
                .font-mono { font-family: monospace; }
                .text-xs { font-size: 11px; }
                .text-sm { font-size: 12px; }
                .text-md { font-size: 14px; }
                .text-muted { color: #666; }
                .text-success { color: #10B981; }
                .text-danger { color: #EF4444; }
                .text-gold { color: #ECB676; }
                .mt-1 { margin-top: 4px; }
                .mt-2 { margin-top: 8px; }
                .mb-1 { margin-bottom: 4px; }
                .mb-2 { margin-bottom: 8px; }
                .mb-3 { margin-bottom: 12px; }
                .p-2 { padding: 8px; }
                .p-3 { padding: 12px; }
                .gap-2 { gap: 8px; }
                .rounded-md { border-radius: 6px; }
                .invoice-preview { background: #fff; }
                @media print { body { padding: 20px; } button { display: none !important; } }
              </style>
            </head>
            <body>
              ${modalHTML}
              <script>window.onload = function() { window.print(); window.close(); }<\/script>
            </body>
          </html>
        `);
        printWindow.document.close();
        return false;
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
            <tbody id="expenses-table-body"></tbody>
          </table>
        </div>
      </div>
    `;

    const catFilter = Utils.$('#expense-filter-cat');

    const refreshTable = () => {
      const cat = catFilter.value;
      const expenses = Store.getAll(Store.COLLECTIONS.EXPENSES);
      expenses.sort((a, b) => new Date(b.date) - new Date(a.date));
      const filtered = expenses.filter(e => cat === 'all' || e.category === cat);

      Utils.$('#expense-count').textContent = `Showing ${filtered.length} of ${expenses.length} expenses`;

      const tbody = Utils.$('#expenses-table-body');
      tbody.innerHTML = '';

      if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center p-8 text-muted">No expenses recorded.</td></tr>`;
        return;
      }

      filtered.forEach(e => {
        const tr = Utils.createElement('tr');
        tr.innerHTML = `
          <td class="font-mono">${Utils.formatDate(e.date)}</td>
          <td><span class="badge badge-muted">${e.category}</span></td>
          <td class="font-medium">${Utils.sanitizeHTML(e.vendor || '')}</td>
          <td class="text-muted text-sm">${Utils.sanitizeHTML(e.description || '')}</td>
          <td class="font-mono text-muted">${Utils.formatCurrency(e.gst || 0)}</td>
          <td class="font-mono font-semibold text-danger">${Utils.formatCurrency(e.amount)}</td>
          <td>
            <div class="table-actions justify-end">
              <button class="btn btn-icon btn-ghost sm text-gold" title="Edit Expense" onclick="Accounting.showExpenseModal('${e.id}')">✏️</button>
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

  function showExpenseModal(expenseId = null) {
    const isEdit = !!expenseId;
    const exp = isEdit ? Store.getById(Store.COLLECTIONS.EXPENSES, expenseId) : null;

    const modalHTML = `
      <form id="expense-form" class="animate-fade-in-scale">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Expense Date <span class="required">*</span></label>
            <input type="date" name="date" class="form-input" required value="${exp ? exp.date : new Date().toISOString().split('T')[0]}">
          </div>
          <div class="form-group">
            <label class="form-label">Category <span class="required">*</span></label>
            <select name="category" class="form-select" required>
              <option value="">-- Choose Category --</option>
              <option value="Fabric" ${exp && exp.category === 'Fabric' ? 'selected' : ''}>Fabric / Materials</option>
              <option value="Rent" ${exp && exp.category === 'Rent' ? 'selected' : ''}>Showroom Rent</option>
              <option value="Utilities" ${exp && exp.category === 'Utilities' ? 'selected' : ''}>Utilities</option>
              <option value="Marketing" ${exp && exp.category === 'Marketing' ? 'selected' : ''}>Marketing / Ads</option>
              <option value="Salary" ${exp && exp.category === 'Salary' ? 'selected' : ''}>Salary / Wages</option>
              <option value="Equipment" ${exp && exp.category === 'Equipment' ? 'selected' : ''}>Equipment / Tools</option>
              <option value="Other" ${exp && exp.category === 'Other' ? 'selected' : ''}>Other Expenses</option>
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Paid To / Vendor <span class="required">*</span></label>
            <input type="text" name="vendor" class="form-input" required placeholder="e.g., Textile Wholesalers Pty Ltd" value="${exp ? Utils.sanitizeHTML(exp.vendor) : ''}">
          </div>
          <div class="form-group">
            <label class="form-label">Total Amount (inc GST) <span class="required">*</span></label>
            <input type="number" step="0.01" name="amount" id="expense-amount" class="form-input font-mono" required placeholder="0.00" value="${exp ? exp.amount : ''}">
          </div>
        </div>
        <div class="form-row items-center pt-2">
          <label class="d-flex items-center gap-2 text-sm" style="cursor: pointer;">
            <input type="checkbox" id="expense-has-gst" ${!exp || exp.gst > 0 ? 'checked' : ''}> This transaction included standard GST (1/11th of total)
          </label>
          <div class="text-xs text-muted font-mono" style="margin-left: auto;">
            Calculated GST Component: <span id="expense-gst-preview">$0.00</span>
          </div>
        </div>
        <div class="form-group mt-4">
          <label class="form-label">Description / Remarks</label>
          <textarea name="description" class="form-textarea" placeholder="Itemize details, raw materials list, or reference order IDs...">${exp ? Utils.sanitizeHTML(exp.description || '') : ''}</textarea>
        </div>
      </form>
    `;

    App.showModal({
      title: isEdit ? 'Modify Logged Expense' : 'Log Business Expense',
      content: modalHTML,
      submitText: isEdit ? 'Save Changes' : 'Record Transaction',
      onReady: (modalEl) => {
        const amtInput = Utils.$('#expense-amount', modalEl);
        const gstCheck = Utils.$('#expense-has-gst', modalEl);
        const gstPreview = Utils.$('#expense-gst-preview', modalEl);

        const updateGstPreview = () => {
          const total = parseFloat(amtInput.value) || 0;
          if (gstCheck.checked && total > 0) {
            const calculatedGst = Math.round((total / 11) * 100) / 100;
            gstPreview.textContent = Utils.formatCurrency(calculatedGst);
          } else {
            gstPreview.textContent = '$0.00';
          }
        };

        amtInput.addEventListener('input', updateGstPreview);
        gstCheck.addEventListener('change', updateGstPreview);
        updateGstPreview();
      },
      onSubmit: (modalEl) => {
        const form = Utils.$('#expense-form', modalEl);
        if (!form.checkValidity()) { form.reportValidity(); return false; }

        const formData = new FormData(form);
        const totalAmount = parseFloat(formData.get('amount')) || 0;
        const hasGst = Utils.$('#expense-has-gst', modalEl).checked;
        const calculatedGst = hasGst ? Math.round((totalAmount / 11) * 100) / 100 : 0;

        const expenseData = {
          date: formData.get('date'),
          category: formData.get('category'),
          vendor: formData.get('vendor'),
          amount: Math.round(totalAmount * 100) / 100,
          gst: calculatedGst,
          description: formData.get('description')
        };

        if (isEdit) {
          Store.update(Store.COLLECTIONS.EXPENSES, expenseId, expenseData);
          Utils.showToast('Expense entry updated.');
        } else {
          Store.create(Store.COLLECTIONS.EXPENSES, expenseData);
          Utils.showToast('Expense transaction recorded safely.');
        }

        renderSubTab();
        return true;
      }
    });
  }

  function deleteExpense(id) {
    App.showConfirm({
      title: 'Purge Expense Record',
      text: 'Are you certain you wish to erase this expense entry from your balance sheets?',
      confirmText: 'Remove Entry',
      onConfirm: () => {
        Store.delete(Store.COLLECTIONS.EXPENSES, id);
        Utils.showToast('Expense record permanently deleted.', 'info');
        renderSubTab();
      }
    });
  }

  // ==========================================
  // GST BAS REPORT ENGINE
  // ==========================================

  function renderGST(container, actions) {
    const invoices = Store.getAll(Store.COLLECTIONS.INVOICES);
    const expenses = Store.getAll(Store.COLLECTIONS.EXPENSES);

    // Calculate Cash Basis BAS allocations
    const cashInvoices = invoices.filter(i => i.status === 'Paid');
    const totalG1Sales = cashInvoices.reduce((sum, i) => sum + i.total, 0);
    const total1ACollected = cashInvoices.reduce((sum, i) => sum + i.gstTotal, 0);

    const total1BPaid = expenses.reduce((sum, e) => sum + (e.gst || 0), 0);
    const netGstPosition = total1ACollected - total1BPaid;

    container.innerHTML = `
      <div class="card p-6 mb-6 alert-banner ${netGstPosition >= 0 ? 'bg-amber-soft' : 'bg-green-soft'}">
        <h3 class="font-semibold text-md mb-2">Quarterly Activity Statement Summary (Estimated)</h3>
        <p class="text-sm text-muted">
          Calculations below reflect values matching the <strong>Australian Taxation Office (ATO)</strong> continuous cash accounting model format.
        </p>
      </div>

      <div class="content-grid" style="grid-template-columns: 1.5fr 1fr; gap: 24px;">
        <div class="card p-0">
          <div class="card-header"><span class="font-bold text-gold">BAS Fields Breakdown</span></div>
          <div class="p-6 d-flex flex-col gap-4">
            <div class="d-flex justify-between items-center pb-2" style="border-bottom: 1px dashed var(--pc-border);">
              <div>
                <span class="font-mono font-bold bg-muted p-1 rounded text-xs">G1</span>
                <span class="text-sm font-medium ml-2">Total Gross Sales (inc GST)</span>
              </div>
              <span class="font-mono font-bold">${Utils.formatCurrency(totalG1Sales)}</span>
            </div>
            <div class="d-flex justify-between items-center pb-2" style="border-bottom: 1px dashed var(--pc-border);">
              <div>
                <span class="font-mono font-bold bg-muted p-1 rounded text-xs">1A</span>
                <span class="text-sm font-medium ml-2">GST Collected from Clients</span>
              </div>
              <span class="font-mono font-bold text-warning">${Utils.formatCurrency(total1ACollected)}</span>
            </div>
            <div class="d-flex justify-between items-center pb-2" style="border-bottom: 1px dashed var(--pc-border);">
              <div>
                <span class="font-mono font-bold bg-muted p-1 rounded text-xs">1B</span>
                <span class="text-sm font-medium ml-2">GST Paid on Business Outlays</span>
              </div>
              <span class="font-mono font-bold text-success">${Utils.formatCurrency(total1BPaid)}</span>
            </div>
          </div>
        </div>

        <div class="card text-center p-6 d-flex flex-col justify-center items-center" style="background: var(--pc-bg-light);">
          <div class="text-xs font-semibold text-muted text-transform-uppercase tracking-wider mb-2">Net ATO Settlement Payable</div>
          <div class="text-3xl font-mono font-bold ${netGstPosition >= 0 ? 'text-warning' : 'text-success'}" style="font-size:32px; margin: 12px 0;">
            ${Utils.formatCurrency(Math.abs(netGstPosition))}
          </div>
          <div class="text-xs text-muted">
            ${netGstPosition >= 0 ? '⚠️ Budget this amount for your upcoming quarterly BAS return.' : '✅ Expected refund asset configuration generated.'}
          </div>
        </div>
      </div>
    `;
  }

  // ==========================================
  // FINANCIAL PERFORMANCE REPORT GENERATOR
  // ==========================================

  function renderReports(container, actions) {
    const invoices = Store.getAll(Store.COLLECTIONS.INVOICES);
    const expenses = Store.getAll(Store.COLLECTIONS.EXPENSES);

    const revenue = invoices.filter(i => i.status === 'Paid').reduce((sum, i) => sum + i.total, 0);
    const costOfGoods = expenses.filter(e => e.category === 'Fabric' || e.category === 'Equipment').reduce((sum, e) => sum + e.amount, 0);
    const operatingExpenses = expenses.filter(e => e.category !== 'Fabric' && e.category !== 'Equipment').reduce((sum, e) => sum + e.amount, 0);

    const grossProfit = revenue - costOfGoods;
    const netProfit = grossProfit - operatingExpenses;

    container.innerHTML = `
      <div class="card p-8 font-serif" style="background:#fff; color:#222; border-radius: var(--radius-lg); box-shadow: var(--shadow-md);">
        <div class="text-center mb-6">
          <h2 style="margin:0; font-size:22px; color:#111;">POOJA'S COUTURE</h2>
          <div style="font-size:12px; color:#666; font-family:sans-serif; margin-top:4px;">Profit & Loss Year-to-Date Statement</div>
          <div style="font-size:10px; color:#999; font-family:sans-serif;">Generated via cash flow clearing metrics</div>
        </div>

        <div style="font-family:sans-serif; font-size:13px; margin-top:24px;">
          <div class="d-flex justify-between font-bold" style="border-bottom: 2px solid #111; padding-bottom:4px; font-size:14px;">
            <span>Account Description</span>
            <span>YTD Balance ($)</span>
          </div>

          <div class="d-flex justify-between font-semibold mt-3" style="padding-left: 0;">
            <span>Operating Revenue (Gross Sales Cleared)</span>
            <span class="font-mono">${Utils.formatCurrency(revenue)}</span>
          </div>

          <div class="d-flex justify-between text-muted mt-2" style="padding-left: var(--sp-4); font-style: italic;">
            <span>Less: Cost of Goods Sold (COGS — Fabrics/Tools)</span>
            <span class="font-mono">(${Utils.formatCurrency(costOfGoods)})</span>
          </div>

          <div class="d-flex justify-between font-bold mt-2" style="border-top:1px solid #ccc; border-bottom:1px solid #ccc; padding: 4px 0;">
            <span>Gross Operating Profit Margin</span>
            <span class="font-mono">${Utils.formatCurrency(grossProfit)}</span>
          </div>

          <div class="d-flex justify-between font-semibold mt-4">
            <span>Operating Expenditures (OPEX)</span>
            <span></span>
          </div>

          <div class="d-flex justify-between text-muted mt-1" style="padding-left: var(--sp-4);">
            <span>Rent & Commercial Real Estate Allocations</span>
            <span class="font-mono">${Utils.formatCurrency(expenses.filter(e => e.category === 'Rent').reduce((s, e) => s + e.amount, 0))}</span>
          </div>
          <div class="d-flex justify-between text-muted mt-1" style="padding-left: var(--sp-4);">
            <span>Marketing Campaigns & Digital Outreach</span>
            <span class="font-mono">${Utils.formatCurrency(expenses.filter(e => e.category === 'Marketing').reduce((s, e) => s + e.amount, 0))}</span>
          </div>
          <div class="d-flex justify-between text-muted mt-1" style="padding-left: var(--sp-4);">
            <span>Staff Remuneration & Discretionary Compensation</span>
            <span class="font-mono">${Utils.formatCurrency(expenses.filter(e => e.category === 'Salary').reduce((s, e) => s + e.amount, 0))}</span>
          </div>
          <div class="d-flex justify-between text-muted mt-1" style="padding-left: var(--sp-4);">
            <span>Utilities & Ancillary Operations Overhead</span>
            <span class="font-mono">${Utils.formatCurrency(expenses.filter(e => e.category === 'Utilities' || e.category === 'Other').reduce((s, e) => s + e.amount, 0))}</span>
          </div>

          <div class="d-flex justify-between font-bold mt-4" style="border-top: 2px solid #111; border-bottom: 4px double #111; padding: 6px 0; font-size:15px; color:${netProfit >= 0 ? '#10B981' : '#EF4444'}">
            <span>NET INCOME POSITION (Net Profit / Loss)</span>
            <span class="font-mono">${Utils.formatCurrency(netProfit)}</span>
          </div>
        </div>
      </div>
    `;
  }

  // Bind Globally Accessible Interventions
  return {
    init,
    showExpenseModal,
    deleteExpense,
    viewInvoicePreview,
    markInvoicePaid,
    deleteInvoice,
    showReport: (type) => {
      activeTab = (type === 'outstanding' || type === 'revenue') ? 'invoices' : (type === 'expenses' ? 'expenses' : 'reports');
      render();
    }
  };
})();
