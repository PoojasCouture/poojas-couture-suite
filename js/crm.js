/* ============================================================
   POOJA'S COUTURE — CRM Module (v2)
   Clients, Appointments, Orders, Bridal Journey, Email Management
   FIXES: syntax errors, missing editAppointment, added Email tab
   ============================================================ */

const CRM = (() => {
  let activeTab = 'clients';

  // EmailJS config — fill in your own keys from emailjs.com (free tier = 200/month)
  const EMAILJS_CONFIG = {
    serviceId: 'YOUR_SERVICE_ID',
    templateId: 'YOUR_TEMPLATE_ID',
    publicKey: 'YOUR_PUBLIC_KEY'
  };

  const EMAIL_TEMPLATES = [
    {
      id: 'fitting_reminder',
      name: 'Fitting Reminder',
      subject: "Your Fitting Appointment at Pooja's Couture — Reminder",
      body: `Dear {{clientName}},

This is a friendly reminder that your fitting appointment is scheduled for {{appointmentDate}} at our Double Bay studio.

Please arrive 10 minutes early and bring any reference photos or fabric swatches you would like us to consider.

If you need to reschedule, please contact us at least 48 hours in advance.

Warm regards,
Pooja Shah
Pooja's Couture
+61 2 9876 5432`
    },
    {
      id: 'order_ready',
      name: 'Order Ready for Collection',
      subject: "Your Order is Ready — Pooja's Couture",
      body: `Dear {{clientName}},

We are thrilled to let you know that your custom outfit "{{orderTitle}}" is ready for collection!

Please visit us at Studio 4, 12-14 Luxury Ave, Double Bay NSW 2028. Studio hours: Mon–Sat, 10 AM – 6 PM.

With love,
Pooja Shah
Pooja's Couture`
    },
    {
      id: 'invoice_reminder',
      name: 'Invoice Payment Reminder',
      subject: 'Invoice {{invoiceNumber}} — Payment Due | Pooja\'s Couture',
      body: `Dear {{clientName}},

This is a gentle reminder that invoice {{invoiceNumber}} for {{invoiceAmount}} is due on {{dueDate}}.

Payment via bank transfer:
BSB: 062-000 | Account: 1234 5678 | Reference: {{invoiceNumber}}

Thank you,
Pooja Shah`
    },
    {
      id: 'welcome',
      name: 'Welcome New Client',
      subject: "Welcome to Pooja's Couture — Your Bridal Journey Begins",
      body: `Dear {{clientName}},

Welcome to Pooja's Couture! We are honoured to be part of your special journey.

Our studio specialises in bespoke South Asian bridal wear — from intricate zardozi lehengas to contemporary fusion gowns. Every piece is crafted with love and precision.

Your dedicated designer will be in touch shortly to schedule your first consultation.

With warmth,
Pooja Shah
poojascouture.com.au`
    },
    {
      id: 'custom',
      name: 'Custom Email',
      subject: '',
      body: ''
    }
  ];

  function init() {
    activeTab = 'clients';
    render();
  }

  function render() {
    const container = Utils.$('#main-content-area');
    if (!container) return;

    container.innerHTML = `
      <div class="page-header animate-fade-in">
        <div>
          <h1 class="page-title">Customer Relationship Management</h1>
          <p class="page-subtitle">Manage bridal clients, consultations, order pipelines, email communications and fitting journeys</p>
        </div>
        <div class="page-actions" id="crm-page-actions"></div>
      </div>
      <div class="tabs animate-fade-in stagger-1">
        <button class="tab-btn ${activeTab==='clients'?'active':''}" data-tab="clients">👑 Clients</button>
        <button class="tab-btn ${activeTab==='appointments'?'active':''}" data-tab="appointments">📅 Appointments</button>
        <button class="tab-btn ${activeTab==='orders'?'active':''}" data-tab="orders">🧵 Order Pipeline</button>
        <button class="tab-btn ${activeTab==='journey'?'active':''}" data-tab="journey">💍 Bridal Journey</button>
        <button class="tab-btn ${activeTab==='email'?'active':''}" data-tab="email">✉️ Email Centre</button>
        <button class="tab-btn ${activeTab==='sales'?'active':''}" data-tab="sales">💵 Sales</button>
      </div>
      <div id="crm-tab-content" class="animate-fade-in stagger-2"></div>
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
    const actionContainer = Utils.$('#crm-page-actions');
    const contentContainer = Utils.$('#crm-tab-content');
    if (!contentContainer || !actionContainer) return;
    actionContainer.innerHTML = '';
    contentContainer.innerHTML = '';
    if (activeTab === 'clients') renderClients(contentContainer, actionContainer);
    else if (activeTab === 'appointments') renderAppointments(contentContainer, actionContainer);
    else if (activeTab === 'orders') renderOrders(contentContainer, actionContainer);
    else if (activeTab === 'journey') renderBridalJourney(contentContainer, actionContainer);
    else if (activeTab === 'email') renderEmailCentre(contentContainer, actionContainer);
    else if (activeTab === 'sales') renderSales(contentContainer, actionContainer);
  }

  // ==========================================
  // CLIENTS
  // ==========================================

  function renderClients(container, actions) {
    actions.innerHTML = `
      <button class="btn btn-secondary" id="btn-export-clients">📥 Export CSV</button>
      <button class="btn btn-primary" id="btn-add-client">+ Add New Client</button>
    `;
    Utils.$('#btn-add-client').addEventListener('click', () => showClientModal());
    Utils.$('#btn-export-clients').addEventListener('click', exportClientsCSV);

    container.innerHTML = `
      <div class="card p-0">
        <div class="card-header flex-wrap gap-4">
          <div class="filter-bar m-0">
            <div class="filter-search">
              <span class="filter-search-icon">🔍</span>
              <input type="text" id="client-search" class="form-input" placeholder="Search by name, email, phone, notes...">
            </div>
            <select id="client-filter-type" class="form-select">
              <option value="all">All Types</option>
              <option value="Bride">Brides</option>
              <option value="Groom">Grooms</option>
              <option value="Family">Family</option>
              <option value="Other">Other</option>
            </select>
            <select id="client-filter-tag" class="form-select">
              <option value="all">All Tags</option>
            </select>
          </div>
          <div class="text-muted text-sm font-mono" id="client-count">Loading...</div>
        </div>
        <div class="table-container" style="border:none;border-radius:0">
          <table class="data-table">
            <thead>
              <tr>
                <th>Client Name</th><th>Contact</th><th>Type</th><th>Tags</th>
                <th>Orders</th><th>Registered</th>
                <th style="width:130px;text-align:right">Actions</th>
              </tr>
            </thead>
            <tbody id="clients-table-body"></tbody>
          </table>
        </div>
      </div>
    `;

    const allClients = Store.getAll(Store.COLLECTIONS.CLIENTS);
    const allTags = [...new Set(allClients.flatMap(c => c.tags || []))].sort();
    const tagFilter = Utils.$('#client-filter-tag');
    allTags.forEach(tag => {
      const opt = document.createElement('option');
      opt.value = tag; opt.textContent = tag;
      tagFilter.appendChild(opt);
    });

    const searchInput = Utils.$('#client-search');
    const typeFilter = Utils.$('#client-filter-type');

    const refreshTable = () => {
      const query = searchInput.value.toLowerCase();
      const type = typeFilter.value;
      const tag = tagFilter.value;
      const clients = Store.getAll(Store.COLLECTIONS.CLIENTS);
      const filtered = clients.filter(c => {
        const matchQ = !query || c.name.toLowerCase().includes(query) ||
          c.email.toLowerCase().includes(query) || c.phone.includes(query) ||
          (c.notes && c.notes.toLowerCase().includes(query));
        return matchQ && (type==='all'||c.type===type) && (tag==='all'||(c.tags||[]).includes(tag));
      });

      Utils.$('#client-count').textContent = `Showing ${filtered.length} of ${clients.length} clients`;
      const tbody = Utils.$('#clients-table-body');
      tbody.innerHTML = '';

      if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center p-8 text-muted">
          <div class="empty-state"><div class="empty-state-icon">👤</div>
          <div class="empty-state-title">No clients found</div></div></td></tr>`;
        return;
      }

      filtered.forEach(c => {
        const orders = Store.query(Store.COLLECTIONS.ORDERS, o => o.clientId === c.id);
        const tr = Utils.createElement('tr', {
          className: 'cursor-pointer',
          onclick: (e) => {
            if (e.target.closest('.table-actions') || e.target.closest('button')) return;
            showClientDetailsModal(c.id);
          }
        });
        tr.innerHTML = `
          <td>
            <div class="user-cell">
              <div class="avatar avatar-sm" style="background:${Utils.getAvatarColor(c.name)};color:var(--pc-text-inverse)">${Utils.getInitials(c.name)}</div>
              <div class="user-cell-info"><div class="user-cell-name">${Utils.sanitizeHTML(c.name)}</div></div>
            </div>
          </td>
          <td>
            <div>${Utils.sanitizeHTML(c.email)}</div>
            <div class="text-xs text-muted">${Utils.sanitizeHTML(c.phone)}</div>
          </td>
          <td><span class="badge ${c.type==='Bride'?'badge-gold':c.type==='Groom'?'badge-purple':'badge-info'}">${c.type}</span></td>
          <td>
            <div class="d-flex flex-wrap gap-1">
              ${(c.tags||[]).slice(0,3).map(t=>`<span class="badge badge-muted text-xs">${Utils.sanitizeHTML(t)}</span>`).join('')}
              ${(c.tags||[]).length>3?`<span class="badge badge-muted text-xs">+${c.tags.length-3}</span>`:''}
            </div>
          </td>
          <td class="font-mono text-xs">${orders.length}</td>
          <td>${Utils.formatDate(c.createdAt)}</td>
          <td>
            <div class="table-actions justify-end">
              <button class="btn btn-icon btn-ghost sm" title="Email" onclick="CRM.quickEmailClient('${c.id}')">✉️</button>
              <button class="btn btn-icon btn-ghost sm" title="Edit" onclick="CRM.editClient('${c.id}')">✏️</button>
              <button class="btn btn-icon btn-ghost sm text-danger" title="Delete" onclick="CRM.deleteClient('${c.id}')">🗑️</button>
            </div>
          </td>
        `;
        tbody.appendChild(tr);
      });
    };

    searchInput.addEventListener('input', Utils.debounce(refreshTable));
    typeFilter.addEventListener('change', refreshTable);
    tagFilter.addEventListener('change', refreshTable);
    refreshTable();
  }

  function exportClientsCSV() {
    const clients = Store.getAll(Store.COLLECTIONS.CLIENTS);
    const rows = [['Name','Email','Phone','Type','Tags','Notes','Registered']];
    clients.forEach(c => rows.push([
      c.name, c.email, c.phone, c.type,
      (c.tags||[]).join('; '),
      (c.notes||'').replace(/\n/g,' '),
      Utils.formatDate(c.createdAt)
    ]));
    const csv = rows.map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
    a.download = `poojas_couture_clients_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    Utils.showToast('Client list exported as CSV.');
  }

  function showClientModal(clientId = null) {
    const isEdit = !!clientId;
    const client = isEdit ? Store.getById(Store.COLLECTIONS.CLIENTS, clientId) : null;
    App.showModal({
      title: isEdit ? 'Edit Client' : 'Add New Client',
      content: `
        <form id="client-form" class="animate-fade-in-scale">
          <div class="form-group">
            <label class="form-label">Client Name <span class="required">*</span></label>
            <input type="text" name="name" class="form-input" required value="${client?Utils.sanitizeHTML(client.name):''}">
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Email <span class="required">*</span></label>
              <input type="email" name="email" class="form-input" required value="${client?Utils.sanitizeHTML(client.email):''}">
            </div>
            <div class="form-group">
              <label class="form-label">Phone <span class="required">*</span></label>
              <input type="text" name="phone" class="form-input" required value="${client?Utils.sanitizeHTML(client.phone):''}">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Client Type</label>
              <select name="type" class="form-select">
                <option value="Bride" ${client&&client.type==='Bride'?'selected':''}>Bride</option>
                <option value="Groom" ${client&&client.type==='Groom'?'selected':''}>Groom</option>
                <option value="Family" ${client&&client.type==='Family'?'selected':''}>Family Outfit</option>
                <option value="Other" ${client&&client.type==='Other'?'selected':''}>Other</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Wedding Date</label>
              <input type="date" name="weddingDate" class="form-input" value="${client&&client.weddingDate?client.weddingDate:''}">
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Tags (comma separated)</label>
            <input type="text" name="tags" class="form-input" placeholder="e.g. Bridal, High-Priority, Lehenga" value="${client?Utils.sanitizeHTML((client.tags||[]).join(', ')):''}">
          </div>
          <div class="form-group m-0">
            <label class="form-label">Notes & Specifications</label>
            <textarea name="notes" class="form-textarea" placeholder="Color palettes, measurements, design preferences...">${client?Utils.sanitizeHTML(client.notes||''):''}</textarea>
          </div>
        </form>`,
      submitText: isEdit ? 'Save Changes' : 'Add Client',
      onSubmit: (modalEl) => {
        const form = Utils.$('#client-form', modalEl);
        if (!form.checkValidity()) { form.reportValidity(); return false; }
        const fd = new FormData(form);
        const clientData = {
          name: fd.get('name'), email: fd.get('email'), phone: fd.get('phone'),
          type: fd.get('type'), weddingDate: fd.get('weddingDate'),
          tags: fd.get('tags') ? fd.get('tags').split(',').map(s=>s.trim()).filter(Boolean) : [],
          notes: fd.get('notes')
        };
        if (isEdit) {
          Store.update(Store.COLLECTIONS.CLIENTS, clientId, clientData);
          Utils.showToast('Client updated.');
        } else {
          Store.create(Store.COLLECTIONS.CLIENTS, clientData);
          Utils.showToast('Client registered.');
        }
        renderSubTab();
        return true;
      }
    });
  }

  function showClientDetailsModal(clientId) {
    const client = Store.getById(Store.COLLECTIONS.CLIENTS, clientId);
    if (!client) return;
    const appointments = Store.query(Store.COLLECTIONS.APPOINTMENTS, a => a.clientId === clientId);
    const orders = Store.query(Store.COLLECTIONS.ORDERS, o => o.clientId === clientId);
    const emails = getClientEmailHistory(clientId);
    const totalSpend = orders.reduce((sum, o) => sum + (o.price||0), 0);

    App.showModal({
      title: `Client Profile — ${client.name}`,
      content: `
        <div class="d-flex flex-col gap-5 animate-fade-in">
          <div class="d-flex items-center gap-4 p-4 rounded-lg" style="background:rgba(255,255,255,0.02);border:1px solid var(--pc-border)">
            <div class="avatar avatar-lg" style="background:${Utils.getAvatarColor(client.name)};color:var(--pc-text-inverse)">${Utils.getInitials(client.name)}</div>
            <div style="flex:1">
              <h3 class="font-display text-lg">${Utils.sanitizeHTML(client.name)}</h3>
              <div class="d-flex items-center gap-2 mt-1 flex-wrap">
                <span class="badge ${client.type==='Bride'?'badge-gold':client.type==='Groom'?'badge-purple':'badge-info'}">${client.type}</span>
                ${client.weddingDate?`<span class="badge badge-success text-xs">💍 Wedding: ${Utils.formatDate(client.weddingDate)}</span>`:''}
                <span class="text-xs text-muted">Registered ${Utils.formatDate(client.createdAt)}</span>
              </div>
            </div>
            <div class="text-right">
              <div class="text-xs text-muted">Total Value</div>
              <div class="font-mono font-bold text-gold">${Utils.formatCurrency(totalSpend)}</div>
            </div>
          </div>
          <div class="d-grid gap-4" style="grid-template-columns:1fr 2fr">
            <div class="d-flex flex-col gap-3">
              <h4 class="text-sm font-semibold text-gold">Contact</h4>
              <div><div class="text-xs text-muted">Email</div><div class="text-sm font-mono">${Utils.sanitizeHTML(client.email)}</div></div>
              <div><div class="text-xs text-muted">Phone</div><div class="text-sm font-mono">${Utils.sanitizeHTML(client.phone)}</div></div>
              <div>
                <div class="text-xs text-muted font-semibold mt-1">Tags</div>
                <div class="d-flex flex-wrap gap-1 mt-1">
                  ${(client.tags||[]).length?(client.tags||[]).map(t=>`<span class="badge badge-muted text-xs">${Utils.sanitizeHTML(t)}</span>`).join(''):'<span class="text-xs text-muted">None</span>'}
                </div>
              </div>
              <button class="btn btn-secondary btn-sm mt-2" onclick="App.closeModal();setTimeout(()=>CRM.quickEmailClient('${clientId}'),200)">✉️ Send Email</button>
            </div>
            <div>
              <h4 class="text-sm font-semibold text-gold mb-2">Design Notes</h4>
              <div class="p-3 rounded-md text-sm" style="background:rgba(0,0,0,0.2);min-height:80px;white-space:pre-line;border:1px solid var(--pc-border)">${Utils.sanitizeHTML(client.notes||'No notes.')}</div>
            </div>
          </div>
          <div>
            <h4 class="text-sm font-semibold text-gold mb-2">Orders (${orders.length})</h4>
            ${orders.length===0?`<div class="text-xs text-muted p-3 text-center rounded-md" style="border:1px dashed var(--pc-border)">No orders yet.</div>`:`
              <div class="table-container" style="max-height:150px">
                <table class="data-table text-xs">
                  <thead><tr><th>Item</th><th>Price</th><th>Status</th><th>Deadline</th></tr></thead>
                  <tbody>${orders.map(o=>`<tr>
                    <td class="font-medium">${Utils.sanitizeHTML(o.title)}</td>
                    <td class="font-mono">${Utils.formatCurrency(o.price)}</td>
                    <td><span class="badge badge-gold">${o.status}</span></td>
                    <td>${Utils.formatDate(o.deadline)}</td>
                  </tr>`).join('')}</tbody>
                </table>
              </div>`}
          </div>
          <div>
            <h4 class="text-sm font-semibold text-gold mb-2">Appointments (${appointments.length})</h4>
            ${appointments.length===0?`<div class="text-xs text-muted p-3 text-center rounded-md" style="border:1px dashed var(--pc-border)">No appointments yet.</div>`:`
              <div class="table-container" style="max-height:150px">
                <table class="data-table text-xs">
                  <thead><tr><th>Date</th><th>Type</th><th>Status</th><th>Notes</th></tr></thead>
                  <tbody>${appointments.map(a=>`<tr>
                    <td class="font-mono">${Utils.formatDateTime(a.date)}</td>
                    <td><span class="badge ${a.type==='Fitting'?'badge-purple':'badge-gold'}">${a.type}</span></td>
                    <td><span class="badge ${a.status==='Completed'?'badge-success':a.status==='Scheduled'?'badge-info':'badge-danger'}">${a.status}</span></td>
                    <td class="text-muted">${Utils.truncateText(a.notes||'—',40)}</td>
                  </tr>`).join('')}</tbody>
                </table>
              </div>`}
          </div>
          <div>
            <h4 class="text-sm font-semibold text-gold mb-2">Email History (${emails.length})</h4>
            ${emails.length===0?`<div class="text-xs text-muted p-3 text-center rounded-md" style="border:1px dashed var(--pc-border)">No emails sent yet.</div>`:`
              <div class="d-flex flex-col gap-2" style="max-height:150px;overflow-y:auto">
                ${emails.slice().reverse().map(e=>`
                  <div class="p-2 rounded-md text-xs" style="background:rgba(255,255,255,0.02);border:1px solid var(--pc-border)">
                    <div class="d-flex justify-between">
                      <span class="font-semibold">${Utils.sanitizeHTML(e.subject)}</span>
                      <span class="text-muted">${Utils.formatDateTime(e.sentAt)}</span>
                    </div>
                    <div class="text-muted mt-1">
                      <span class="badge ${e.status==='Sent'?'badge-success':'badge-muted'} text-xs">${e.status}</span>
                      ${e.templateName?`· ${e.templateName}`:''}
                    </div>
                  </div>`).join('')}
              </div>`}
          </div>
        </div>`,
      submitText: 'Close',
      hideCancel: true,
      modalSize: 'modal-lg',
      onSubmit: () => true
    });
  }

  function editClient(id) { showClientModal(id); }

  function deleteClient(id) {
    App.showConfirm({
      title: 'Delete Client',
      text: 'This will permanently remove this client profile.',
      confirmText: 'Delete',
      onConfirm: () => {
        Store.delete(Store.COLLECTIONS.CLIENTS, id);
        Utils.showToast('Client deleted.', 'info');
        renderSubTab();
      }
    });
  }

  // ==========================================
  // APPOINTMENTS
  // ==========================================

  function renderAppointments(container, actions) {
    actions.innerHTML = `<button class="btn btn-primary" id="btn-add-appt">+ Schedule Appointment</button>`;
    Utils.$('#btn-add-appt').addEventListener('click', () => showAppointmentModal());

    container.innerHTML = `
      <div class="card p-0">
        <div class="card-header flex-wrap gap-4">
          <div class="filter-bar m-0">
            <select id="appt-filter-status" class="form-select">
              <option value="all">All Statuses</option>
              <option value="Scheduled" selected>Scheduled</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
              <option value="No-Show">No-Show</option>
            </select>
            <select id="appt-filter-type" class="form-select">
              <option value="all">All Types</option>
              <option value="Consultation">Consultations</option>
              <option value="Fitting">Fittings</option>
              <option value="Pickup">Pickups</option>
            </select>
          </div>
          <div class="text-muted text-sm font-mono" id="appt-count"></div>
        </div>
        <div class="table-container" style="border:none;border-radius:0">
          <table class="data-table">
            <thead>
              <tr>
                <th>Client</th><th>Date & Time</th><th>Type</th><th>Status</th><th>Notes</th>
                <th style="width:130px;text-align:right">Actions</th>
              </tr>
            </thead>
            <tbody id="appts-table-body"></tbody>
          </table>
        </div>
      </div>
    `;

    const statusFilter = Utils.$('#appt-filter-status');
    const typeFilter = Utils.$('#appt-filter-type');

    const refreshTable = () => {
      const status = statusFilter.value;
      const type = typeFilter.value;
      const appts = Store.getAll(Store.COLLECTIONS.APPOINTMENTS);
      appts.sort((a,b) => new Date(a.date)-new Date(b.date));
      const filtered = appts.filter(a=>(status==='all'||a.status===status)&&(type==='all'||a.type===type));
      Utils.$('#appt-count').textContent = `Showing ${filtered.length} of ${appts.length} appointments`;
      const tbody = Utils.$('#appts-table-body');
      tbody.innerHTML = '';
      if (filtered.length===0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center p-8 text-muted">
          <div class="empty-state"><div class="empty-state-icon">📅</div>
          <div class="empty-state-title">No appointments found</div></div></td></tr>`;
        return;
      }
      filtered.forEach(a => {
        const tr = Utils.createElement('tr');
        tr.innerHTML = `
          <td class="font-medium">${Utils.sanitizeHTML(a.clientName)}</td>
          <td class="font-mono">${Utils.formatDateTime(a.date)}</td>
          <td><span class="badge ${a.type==='Fitting'?'badge-purple':a.type==='Pickup'?'badge-success':'badge-gold'}">${a.type}</span></td>
          <td><span class="badge ${a.status==='Completed'?'badge-success':a.status==='Scheduled'?'badge-info':a.status==='No-Show'?'badge-warning':'badge-danger'}">${a.status}</span></td>
          <td class="text-muted" style="max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${Utils.sanitizeHTML(a.notes||'—')}</td>
          <td>
            <div class="table-actions justify-end">
              ${a.status==='Scheduled'?`<button class="btn btn-icon btn-ghost sm" title="Send Reminder" onclick="CRM.sendFittingReminder('${a.id}')">✉️</button>`:''}
              ${a.status==='Scheduled'?`<button class="btn btn-icon btn-ghost sm" title="Mark Complete" onclick="CRM.completeAppointment('${a.id}')">✓</button>`:''}
              <button class="btn btn-icon btn-ghost sm" title="Edit" onclick="CRM.editAppointment('${a.id}')">✏️</button>
              <button class="btn btn-icon btn-ghost sm text-danger" title="Delete" onclick="CRM.deleteAppointment('${a.id}')">🗑️</button>
            </div>
          </td>
        `;
        tbody.appendChild(tr);
      });
    };

    statusFilter.addEventListener('change', refreshTable);
    typeFilter.addEventListener('change', refreshTable);
    refreshTable();
  }

  function showAppointmentModal(apptId = null) {
    const isEdit = !!apptId;
    const appt = isEdit ? Store.getById(Store.COLLECTIONS.APPOINTMENTS, apptId) : null;
    const clients = Store.getAll(Store.COLLECTIONS.CLIENTS);
    App.showModal({
      title: isEdit ? 'Edit Appointment' : 'Schedule Appointment',
      content: `
        <form id="appt-form" class="animate-fade-in-scale">
          <div class="form-group">
            <label class="form-label">Client <span class="required">*</span></label>
            <select name="clientId" class="form-select" required>
              <option value="">-- Choose Client --</option>
              ${clients.map(c=>`<option value="${c.id}" ${appt&&appt.clientId===c.id?'selected':''}>${Utils.sanitizeHTML(c.name)} (${c.type})</option>`).join('')}
            </select>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Date & Time <span class="required">*</span></label>
              <input type="datetime-local" name="date" class="form-input" required value="${appt?appt.date:''}">
            </div>
            <div class="form-group">
              <label class="form-label">Session Type</label>
              <select name="type" class="form-select">
                <option value="Consultation" ${appt&&appt.type==='Consultation'?'selected':''}>Consultation</option>
                <option value="Fitting" ${appt&&appt.type==='Fitting'?'selected':''}>Fitting</option>
                <option value="Pickup" ${appt&&appt.type==='Pickup'?'selected':''}>Final Pickup</option>
              </select>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Status</label>
            <select name="status" class="form-select">
              <option value="Scheduled" ${!appt||appt.status==='Scheduled'?'selected':''}>Scheduled</option>
              <option value="Completed" ${appt&&appt.status==='Completed'?'selected':''}>Completed</option>
              <option value="Cancelled" ${appt&&appt.status==='Cancelled'?'selected':''}>Cancelled</option>
              <option value="No-Show" ${appt&&appt.status==='No-Show'?'selected':''}>No-Show</option>
            </select>
          </div>
          <div class="form-group m-0">
            <label class="form-label">Session Notes</label>
            <textarea name="notes" class="form-textarea" placeholder="Measurements, fitting instructions...">${appt?Utils.sanitizeHTML(appt.notes||''):''}</textarea>
          </div>
        </form>`,
      submitText: isEdit ? 'Save Changes' : 'Book Session',
      onSubmit: (modalEl) => {
        const form = Utils.$('#appt-form', modalEl);
        if (!form.checkValidity()) { form.reportValidity(); return false; }
        const fd = new FormData(form);
        const selectedClient = Store.getById(Store.COLLECTIONS.CLIENTS, fd.get('clientId'));
        const apptData = {
          clientId: fd.get('clientId'),
          clientName: selectedClient ? selectedClient.name : 'Unknown',
          date: fd.get('date'), type: fd.get('type'),
          status: fd.get('status'), notes: fd.get('notes')
        };
        if (isEdit) {
          Store.update(Store.COLLECTIONS.APPOINTMENTS, apptId, apptData);
          Utils.showToast('Appointment updated.');
        } else {
          Store.create(Store.COLLECTIONS.APPOINTMENTS, apptData);
          Utils.showToast('Appointment scheduled.');
        }
        renderSubTab();
        return true;
      }
    });
  }

  function editAppointment(id) { showAppointmentModal(id); }

  function completeAppointment(id) {
    Store.update(Store.COLLECTIONS.APPOINTMENTS, id, { status: 'Completed' });
    Utils.showToast('Appointment marked as Completed.');
    renderSubTab();
  }

  function deleteAppointment(id) {
    App.showConfirm({
      title: 'Remove Appointment',
      text: 'Remove this appointment record?',
      confirmText: 'Remove',
      onConfirm: () => {
        Store.delete(Store.COLLECTIONS.APPOINTMENTS, id);
        Utils.showToast('Appointment removed.', 'info');
        renderSubTab();
      }
    });
  }

  function sendFittingReminder(apptId) {
    const appt = Store.getById(Store.COLLECTIONS.APPOINTMENTS, apptId);
    if (!appt) return;
    const client = Store.getById(Store.COLLECTIONS.CLIENTS, appt.clientId);
    if (!client) return;
    showComposeModal(client.id, 'fitting_reminder', { appointmentDate: Utils.formatDateTime(appt.date) });
  }

  // ==========================================
  // ORDERS KANBAN
  // ==========================================

  function renderOrders(container, actions) {
    actions.innerHTML = `<button class="btn btn-primary" id="btn-add-order">+ New Order</button>`;
    Utils.$('#btn-add-order').addEventListener('click', () => showOrderModal());

    const stages = [
      { id: 'New',             title: 'New Concept' },
      { id: 'In Design',       title: 'In Design' },
      { id: 'Fabric Sourced',  title: 'Fabric Sourced' },
      { id: 'In Production',   title: 'In Production' },
      { id: 'Fitting',         title: 'Fitting' },
      { id: 'Ready',           title: 'Ready' },
      { id: 'In Transit',      title: 'In Transit' },
      { id: 'Delivered',       title: 'Delivered' }
    ];

    const orders = Store.getAll(Store.COLLECTIONS.ORDERS);
    orders.sort((a, b) => new Date(a.deadline) - new Date(b.deadline));

    const counts = stages.reduce((acc, s) => {
      acc[s.id] = orders.filter(o => o.status === s.id).length;
      return acc;
    }, {});
    const totalValue = orders.reduce((sum, o) => sum + (o.price || 0), 0);

    container.innerHTML = `
      <!-- Summary strip -->
      <div class="d-grid gap-4 mb-5 animate-fade-in" style="grid-template-columns:repeat(auto-fit,minmax(180px,1fr))">
        <div class="stat-card">
          <div class="stat-card-header"><span class="stat-card-icon gold">🧵</span></div>
          <div class="stat-card-value">${orders.length}</div>
          <div class="stat-card-label">Total Orders</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-header"><span class="stat-card-icon blue">💰</span></div>
          <div class="stat-card-value">${Utils.formatCurrency(totalValue)}</div>
          <div class="stat-card-label">Pipeline Value</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-header"><span class="stat-card-icon green">✅</span></div>
          <div class="stat-card-value">${counts['Delivered'] || 0}</div>
          <div class="stat-card-label">Delivered</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-header"><span class="stat-card-icon purple">⚙️</span></div>
          <div class="stat-card-value">${(counts['In Design']||0)+(counts['Fabric Sourced']||0)+(counts['In Production']||0)+(counts['Fitting']||0)}</div>
          <div class="stat-card-label">In Workshop</div>
        </div>
      </div>

      <!-- Filter chips -->
      <div class="card p-4 mb-4 animate-fade-in stagger-1">
        <div class="d-flex flex-wrap gap-2 items-center">
          <button class="btn btn-sm btn-primary order-filter-chip" data-stage="all">
            All <span class="badge badge-muted" style="margin-left:6px">${orders.length}</span>
          </button>
          ${stages.map(s => `
            <button class="btn btn-sm btn-secondary order-filter-chip" data-stage="${s.id}">
              ${s.title} <span class="badge badge-muted" style="margin-left:6px">${counts[s.id] || 0}</span>
            </button>
          `).join('')}
        </div>
      </div>

      <!-- Card grid -->
      <div class="d-grid gap-4 animate-fade-in stagger-2" id="orders-grid"
           style="grid-template-columns:repeat(auto-fill,minmax(280px,1fr))"></div>
    `;

    const grid = Utils.$('#orders-grid');

    const renderCards = (stageFilter) => {
      const list = stageFilter === 'all' ? orders : orders.filter(o => o.status === stageFilter);
      grid.innerHTML = '';

      if (list.length === 0) {
        grid.innerHTML = `
          <div class="card p-8 text-center text-muted" style="grid-column:1/-1">
            <div class="empty-state">
              <div class="empty-state-icon">🧵</div>
              <div class="empty-state-title">No orders in this stage</div>
              <div class="empty-state-text">Select another filter or create a new order.</div>
            </div>
          </div>`;
        return;
      }

      list.forEach(o => {
        const days = Utils.daysFromNow(o.deadline);
        const isDelivered = o.status === 'Delivered';
        const deadlineClass = isDelivered ? 'text-muted'
          : days < 0 ? 'text-danger font-semibold'
          : days < 7 ? 'text-warning font-semibold'
          : 'text-muted';
        const deadlineText = isDelivered ? 'Completed'
          : days === 0 ? 'Due today'
          : days < 0 ? `${Math.abs(days)} days overdue`
          : `${days} days left`;
        const stageColor =
          o.status === 'Delivered' ? 'badge-success'
          : o.status === 'Ready' || o.status === 'In Transit' ? 'badge-info'
          : o.status === 'New' ? 'badge-muted'
          : 'badge-gold';

        const moveOptions = stages.map(s =>
          `<option value="${s.id}" ${s.id===o.status?'selected':''}>${s.title}</option>`
        ).join('');

        const card = Utils.createElement('div', {
          className: 'card p-0 cursor-pointer',
          style: 'overflow:hidden;transition:transform .15s ease, border-color .15s ease',
          onclick: (e) => { if (e.target.closest('select')) return; showOrderDetails(o.id); },
          onmouseenter: function() { this.style.transform = 'translateY(-2px)'; this.style.borderColor = 'var(--pc-gold)'; },
          onmouseleave: function() { this.style.transform = 'none'; this.style.borderColor = ''; }
        });

        card.innerHTML = `
          <!-- Header strip -->
          <div class="d-flex items-center justify-between p-3" style="background:rgba(236,182,118,0.06);border-bottom:1px solid var(--pc-border)">
            <span class="badge ${stageColor}" style="font-size:10px">${o.status}</span>
            <span class="text-xs ${deadlineClass}">📅 ${deadlineText}</span>
          </div>
          <!-- Body -->
          <div class="p-4">
            <div class="font-display text-md mb-1 truncate" title="${Utils.sanitizeHTML(o.title)}">
              ${Utils.sanitizeHTML(o.title)}
            </div>
            <div class="d-flex items-center gap-2 mb-3">
              <div class="avatar avatar-sm" style="background:${Utils.getAvatarColor(o.clientName)};color:var(--pc-text-inverse);width:24px;height:24px;font-size:10px">
                ${Utils.getInitials(o.clientName)}
              </div>
              <span class="text-xs font-semibold text-gold truncate">${Utils.sanitizeHTML(o.clientName)}</span>
            </div>
            <div class="d-flex items-center justify-between" style="padding:8px 0;border-top:1px solid var(--pc-border);border-bottom:1px solid var(--pc-border);margin-bottom:10px">
              <div>
                <div class="text-xs text-muted">Value</div>
                <div class="font-mono text-sm font-bold">${Utils.formatCurrency(o.price)}</div>
              </div>
              <div class="text-right">
                <div class="text-xs text-muted">Deadline</div>
                <div class="font-mono text-xs">${Utils.formatDateShort(o.deadline)}</div>
              </div>
            </div>
            <label class="text-xs text-muted" style="display:block;margin-bottom:4px">Move to stage</label>
            <select class="form-select" style="font-size:11px;padding:4px 24px 4px 8px;width:100%"
                    onclick="event.stopPropagation()"
                    onchange="CRM.moveOrderStage('${o.id}',this.value)">
              ${moveOptions}
            </select>
          </div>
        `;
        grid.appendChild(card);
      });
    };

    // Wire up filter chips
    Utils.$$('.order-filter-chip', container).forEach(btn => {
      btn.addEventListener('click', () => {
        Utils.$$('.order-filter-chip', container).forEach(b => {
          b.classList.remove('btn-primary');
          b.classList.add('btn-secondary');
        });
        btn.classList.remove('btn-secondary');
        btn.classList.add('btn-primary');
        renderCards(btn.dataset.stage);
      });
    });

    renderCards('all');
  }

  function showOrderModal(orderId = null) {
    const isEdit = !!orderId;
    const order = isEdit ? Store.getById(Store.COLLECTIONS.ORDERS, orderId) : null;
    const clients = Store.getAll(Store.COLLECTIONS.CLIENTS);
    App.showModal({
      title: isEdit ? 'Edit Order' : 'New Custom Order',
      content: `
        <form id="order-form" class="animate-fade-in-scale">
          <div class="form-group">
            <label class="form-label">Client <span class="required">*</span></label>
            <select name="clientId" class="form-select" required>
              <option value="">-- Choose Client --</option>
              ${clients.map(c=>`<option value="${c.id}" ${order&&order.clientId===c.id?'selected':''}>${Utils.sanitizeHTML(c.name)} (${c.type})</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Order Title <span class="required">*</span></label>
            <input type="text" name="title" class="form-input" required value="${order?Utils.sanitizeHTML(order.title):''}">
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Price (AUD) <span class="required">*</span></label>
              <input type="number" name="price" class="form-input" min="0" required value="${order?order.price:''}">
            </div>
            <div class="form-group">
              <label class="form-label">Deadline <span class="required">*</span></label>
              <input type="date" name="deadline" class="form-input" required value="${order?order.deadline:''}">
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Status</label>
            <select name="status" class="form-select">
              <option value="New" ${!order||order.status==='New'?'selected':''}>New Concept</option>
              <option value="In Design" ${order&&order.status==='In Design'?'selected':''}>In Design</option>
              <option value="Fabric Sourced" ${order&&order.status==='Fabric Sourced'?'selected':''}>Fabric Sourced</option>
              <option value="In Production" ${order&&order.status==='In Production'?'selected':''}>In Production</option>
              <option value="Fitting" ${order&&order.status==='Fitting'?'selected':''}>Fitting</option>
              <option value="Ready" ${order&&order.status==='Ready'?'selected':''}>Ready</option>
              <option value="Delivered" ${order&&order.status==='Delivered'?'selected':''}>Delivered</option>
            </select>
          </div>
          <div class="form-group m-0">
            <label class="form-label">Measurements & Specs</label>
            <textarea name="notes" class="form-textarea" placeholder="Fabric, embroidery, measurements...">${order?Utils.sanitizeHTML(order.notes||''):''}</textarea>
          </div>
        </form>`,
      submitText: isEdit ? 'Save Order' : 'Create Order',
      onSubmit: (modalEl) => {
        const form = Utils.$('#order-form', modalEl);
        if (!form.checkValidity()) { form.reportValidity(); return false; }
        const fd = new FormData(form);
        const selectedClient = Store.getById(Store.COLLECTIONS.CLIENTS, fd.get('clientId'));
        const price = parseFloat(fd.get('price'));
        const orderData = {
          clientId: fd.get('clientId'),
          clientName: selectedClient ? selectedClient.name : 'Unknown',
          title: fd.get('title'), price,
          deadline: fd.get('deadline'), status: fd.get('status'), notes: fd.get('notes')
        };
        if (isEdit) {
          Store.update(Store.COLLECTIONS.ORDERS, orderId, orderData);
          Utils.showToast('Order updated.');
        } else {
          Store.create(Store.COLLECTIONS.ORDERS, orderData);
          const subtotal = Math.round((price/2)/1.1*100)/100;
          const gst = Math.round((price/2-subtotal)*100)/100;
          Store.create(Store.COLLECTIONS.INVOICES, {
            clientId: fd.get('clientId'),
            clientName: selectedClient?selectedClient.name:'Unknown',
            invoiceNumber: 'INV-'+new Date().getFullYear()+'-'+Utils.randomBetween(100,999),
            issueDate: new Date().toISOString().split('T')[0],
            dueDate: new Date(Date.now()+14*24*60*60*1000).toISOString().split('T')[0],
            subtotal, gstTotal: gst, total: Math.round((price/2)*100)/100,
            status: 'Draft', notes: `50% deposit for: ${orderData.title}`,
            items: [{ description: `${orderData.title} (Deposit)`, quantity:1, unitPrice:subtotal, gst, amount:Math.round((price/2)*100)/100 }]
          });
          Utils.showToast('Order created. Draft deposit invoice generated.', 'info');
        }
        renderSubTab();
        return true;
      }
    });
  }

  function showOrderDetails(orderId) {
    const o = Store.getById(Store.COLLECTIONS.ORDERS, orderId);
    if (!o) return;
    App.showModal({
      title: 'Order Summary',
      content: `
        <div class="d-flex flex-col gap-5 animate-fade-in">
          <div>
            <h3 class="font-display text-lg">${Utils.sanitizeHTML(o.title)}</h3>
            <div class="text-sm font-semibold text-gold mt-1">${Utils.sanitizeHTML(o.clientName)}</div>
          </div>
          <div class="d-grid gap-4" style="grid-template-columns:1fr 1fr">
            <div class="d-flex flex-col gap-2">
              <div><div class="text-xs text-muted">Price</div><div class="font-mono font-bold">${Utils.formatCurrency(o.price)}</div></div>
              <div><div class="text-xs text-muted">Deadline</div><div class="font-mono">${Utils.formatDate(o.deadline)}</div></div>
            </div>
            <div class="d-flex flex-col gap-2">
              <div><div class="text-xs text-muted">Status</div><span class="badge badge-gold mt-1">${o.status}</span></div>
              <div><div class="text-xs text-muted">Created</div><div class="text-xs font-mono">${Utils.formatDate(o.createdAt)}</div></div>
            </div>
          </div>
          <div>
            <h4 class="text-sm font-semibold text-gold mb-1">Specs</h4>
            <div class="p-3 rounded-md text-sm" style="background:rgba(0,0,0,0.2);min-height:60px;white-space:pre-line;border:1px solid var(--pc-border)">${Utils.sanitizeHTML(o.notes||'No specs recorded.')}</div>
          </div>
          <div class="d-flex gap-2 justify-end" style="border-top:1px solid var(--pc-border);padding-top:var(--sp-4)">
            <button class="btn btn-secondary" onclick="CRM.editOrder('${o.id}')">✏️ Edit</button>
            <button class="btn btn-danger" onclick="CRM.deleteOrder('${o.id}')">🗑️ Delete</button>
          </div>
        </div>`,
      hideCancel: true, submitText: 'Close', onSubmit: () => true
    });
  }

  function moveOrderStage(id, status) {
    Store.update(Store.COLLECTIONS.ORDERS, id, { status });
    Utils.showToast(`Order moved to: ${status}`);
    renderSubTab();
  }

  function editOrder(id) { App.closeModal(); setTimeout(() => showOrderModal(id), 200); }

  function deleteOrder(id) {
    App.showConfirm({
      title: 'Delete Order', text: 'Permanently remove this order?', confirmText: 'Delete',
      onConfirm: () => {
        Store.delete(Store.COLLECTIONS.ORDERS, id);
        Utils.showToast('Order deleted.', 'info');
        App.closeModal(); renderSubTab();
      }
    });
  }

  // ==========================================
  // EMAIL CENTRE
  // ==========================================

  function getEmailStore() {
    try { return JSON.parse(localStorage.getItem('pc_suite_emails') || '[]'); }
    catch(e) { return []; }
  }

  function saveEmailStore(emails) {
    localStorage.setItem('pc_suite_emails', JSON.stringify(emails));
  }

  function getClientEmailHistory(clientId) {
    return getEmailStore().filter(e => e.clientId === clientId);
  }

  function logEmail(clientId, clientName, subject, body, templateName, status='Sent') {
    const emails = getEmailStore();
    emails.push({ id: Utils.generateId(), clientId, clientName, subject, body, templateName, status, sentAt: new Date().toISOString() });
    if (emails.length > 500) emails.shift();
    saveEmailStore(emails);
  }

  async function sendEmail(toEmail, toName, templateId, extraVars={}, clientId=null) {
    const template = EMAIL_TEMPLATES.find(t=>t.id===templateId);
    const subject = template ? fillTemplate(template.subject, { clientName:toName, ...extraVars }) : (extraVars.subject||'');
    const body = template ? fillTemplate(template.body, { clientName:toName, ...extraVars }) : (extraVars.body||'');
    const templateName = template ? template.name : 'Custom';

    if (EMAILJS_CONFIG.serviceId === 'YOUR_SERVICE_ID') {
      logEmail(clientId||'unknown', toName, subject, body, templateName, 'Logged (EmailJS not configured)');
      Utils.showToast(`Email logged for ${toName}. Configure EmailJS to enable real sending.`, 'info');
      return;
    }

    try {
      await emailjs.send(EMAILJS_CONFIG.serviceId, EMAILJS_CONFIG.templateId,
        { to_email:toEmail, to_name:toName, subject, message:body }, EMAILJS_CONFIG.publicKey);
      logEmail(clientId||'unknown', toName, subject, body, templateName, 'Sent');
      Utils.showToast(`Email sent to ${toName}.`, 'success');
    } catch(err) {
      console.error('EmailJS error:', err);
      logEmail(clientId||'unknown', toName, subject, body, templateName, 'Failed');
      Utils.showToast(`Email failed for ${toName}.`, 'error');
    }
  }

  function fillTemplate(text, vars) {
    return text.replace(/\{\{(\w+)\}\}/g, (_,key) => vars[key]||'');
  }

  function renderEmailCentre(container, actions) {
    actions.innerHTML = `
      <button class="btn btn-secondary" id="btn-email-bulk">📢 Bulk Email</button>
      <button class="btn btn-primary" id="btn-compose-new">✉️ Compose</button>
    `;
    Utils.$('#btn-compose-new').addEventListener('click', () => showComposeModal());
    Utils.$('#btn-email-bulk').addEventListener('click', () => showBulkEmailModal());

    const emails = getEmailStore().slice().reverse();
    const clients = Store.getAll(Store.COLLECTIONS.CLIENTS);

    container.innerHTML = `
      <div class="d-grid gap-5" style="grid-template-columns:1fr 2fr">
        <div class="d-flex flex-col gap-4">
          <div class="card p-4">
            <h4 class="text-sm font-semibold text-gold mb-3">📊 Email Stats</h4>
            <div class="d-flex flex-col gap-2">
              ${[
                { label:'Total Sent', value:emails.filter(e=>e.status==='Sent').length, color:'badge-success' },
                { label:'Logged/Draft', value:emails.filter(e=>e.status.includes('Logged')).length, color:'badge-muted' },
                { label:'Failed', value:emails.filter(e=>e.status==='Failed').length, color:'badge-danger' },
                { label:'Total', value:emails.length, color:'badge-info' }
              ].map(s=>`
                <div class="d-flex justify-between items-center p-2 rounded-md" style="background:rgba(255,255,255,0.02);border:1px solid var(--pc-border)">
                  <span class="text-xs text-muted">${s.label}</span>
                  <span class="badge ${s.color}">${s.value}</span>
                </div>`).join('')}
            </div>
          </div>
          <div class="card p-4">
            <h4 class="text-sm font-semibold text-gold mb-3">⚡ Quick Templates</h4>
            <div class="d-flex flex-col gap-2">
              ${EMAIL_TEMPLATES.filter(t=>t.id!=='custom').map(t=>`
                <button class="btn btn-secondary btn-sm text-left" style="justify-content:flex-start" onclick="CRM.showComposeModal(null,'${t.id}',{})">${t.name}</button>`).join('')}
            </div>
          </div>
          ${EMAILJS_CONFIG.serviceId==='YOUR_SERVICE_ID'?`
            <div class="card p-4" style="border:1px solid var(--pc-warning);background:rgba(251,191,36,0.04)">
              <h4 class="text-xs font-semibold text-warning mb-2">⚠️ EmailJS Not Configured</h4>
              <p class="text-xs text-muted mb-2">Emails are being logged only. To enable real sending:</p>
              <ol class="text-xs text-muted" style="padding-left:16px;line-height:1.9">
                <li>Sign up free at <strong>emailjs.com</strong></li>
                <li>Create an Email Service (Gmail/Outlook)</li>
                <li>Create a Template with vars: <code>to_email, to_name, subject, message</code></li>
                <li>Paste Service ID, Template ID and Public Key at the top of <code>crm.js</code></li>
              </ol>
            </div>`:''
          }
        </div>
        <div class="card p-0">
          <div class="card-header">
            <div class="card-title">📬 Email History</div>
            <div class="filter-bar m-0">
              <div class="filter-search">
                <span class="filter-search-icon">🔍</span>
                <input type="text" id="email-search" class="form-input" placeholder="Search subject or client...">
              </div>
              <select id="email-filter-client" class="form-select" style="max-width:180px">
                <option value="all">All Clients</option>
                ${clients.map(c=>`<option value="${c.id}">${Utils.sanitizeHTML(c.name)}</option>`).join('')}
              </select>
            </div>
          </div>
          <div id="email-history-list" class="p-4 d-flex flex-col gap-2" style="max-height:520px;overflow-y:auto"></div>
        </div>
      </div>
    `;

    const refreshEmailList = () => {
      const query = Utils.$('#email-search').value.toLowerCase();
      const clientFilter = Utils.$('#email-filter-client').value;
      const list = Utils.$('#email-history-list');
      const filtered = emails.filter(e=>
        (clientFilter==='all'||e.clientId===clientFilter) &&
        (!query||e.subject.toLowerCase().includes(query)||e.clientName.toLowerCase().includes(query))
      );
      list.innerHTML = '';
      if (filtered.length===0) {
        list.innerHTML = `<div class="text-center text-muted text-xs p-8">No emails found.</div>`;
        return;
      }
      filtered.forEach(e => {
        const div = Utils.createElement('div', {
          className: 'p-3 rounded-md cursor-pointer',
          style: 'background:rgba(255,255,255,0.02);border:1px solid var(--pc-border)',
          onclick: () => showEmailDetailModal(e)
        });
        div.innerHTML = `
          <div class="d-flex justify-between items-start gap-2">
            <div style="flex:1;min-width:0">
              <div class="text-sm font-semibold truncate">${Utils.sanitizeHTML(e.subject)}</div>
              <div class="text-xs text-muted mt-1">To: ${Utils.sanitizeHTML(e.clientName)} · ${e.templateName||'Custom'}</div>
            </div>
            <div class="text-right" style="flex-shrink:0">
              <span class="badge ${e.status==='Sent'?'badge-success':e.status==='Failed'?'badge-danger':'badge-muted'} text-xs">${e.status}</span>
              <div class="text-xs text-muted mt-1">${Utils.formatDateTime(e.sentAt)}</div>
            </div>
          </div>`;
        list.appendChild(div);
      });
    };

    Utils.$('#email-search').addEventListener('input', Utils.debounce(refreshEmailList));
    Utils.$('#email-filter-client').addEventListener('change', refreshEmailList);
    refreshEmailList();
  }

  function showEmailDetailModal(email) {
    App.showModal({
      title: `Email — ${email.subject}`,
      content: `
        <div class="d-flex flex-col gap-4">
          <div class="d-flex justify-between items-center">
            <div><div class="text-xs text-muted">To</div><div class="font-semibold">${Utils.sanitizeHTML(email.clientName)}</div></div>
            <div class="text-right"><div class="text-xs text-muted">Sent</div><div class="text-sm font-mono">${Utils.formatDateTime(email.sentAt)}</div></div>
          </div>
          <div><div class="text-xs text-muted">Subject</div><div class="font-semibold mt-1">${Utils.sanitizeHTML(email.subject)}</div></div>
          <div>
            <div class="text-xs text-muted mb-1">Message</div>
            <div class="p-3 rounded-md text-sm" style="background:rgba(0,0,0,0.2);white-space:pre-line;border:1px solid var(--pc-border);max-height:280px;overflow-y:auto">${Utils.sanitizeHTML(email.body)}</div>
          </div>
          <div class="d-flex items-center gap-2">
            <span class="badge ${email.status==='Sent'?'badge-success':email.status==='Failed'?'badge-danger':'badge-muted'}">${email.status}</span>
            ${email.templateName?`<span class="text-xs text-muted">Template: ${email.templateName}</span>`:''}
          </div>
        </div>`,
      submitText: 'Close', hideCancel: true, onSubmit: () => true
    });
  }

  function showComposeModal(clientId=null, templateId='custom', extraVars={}) {
    const clients = Store.getAll(Store.COLLECTIONS.CLIENTS);
    const selectedClient = clientId ? Store.getById(Store.COLLECTIONS.CLIENTS, clientId) : null;
    const template = EMAIL_TEMPLATES.find(t=>t.id===templateId);
    const defaultSubject = template&&templateId!=='custom' ? fillTemplate(template.subject, { clientName:selectedClient?selectedClient.name:'', ...extraVars }) : '';
    const defaultBody = template&&templateId!=='custom' ? fillTemplate(template.body, { clientName:selectedClient?selectedClient.name:'', ...extraVars }) : '';

    App.showModal({
      title: '✉️ Compose Email',
      content: `
        <form id="compose-form" class="animate-fade-in-scale">
          <div class="form-group">
            <label class="form-label">To (Client) <span class="required">*</span></label>
            <select name="clientId" id="compose-client" class="form-select" required>
              <option value="">-- Select Client --</option>
              ${clients.map(c=>`<option value="${c.id}" ${clientId===c.id?'selected':''}>${Utils.sanitizeHTML(c.name)} &lt;${Utils.sanitizeHTML(c.email)}&gt;</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Template</label>
            <select name="templateId" id="compose-template" class="form-select">
              ${EMAIL_TEMPLATES.map(t=>`<option value="${t.id}" ${t.id===templateId?'selected':''}>${t.name}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Subject <span class="required">*</span></label>
            <input type="text" name="subject" id="compose-subject" class="form-input" required value="${Utils.sanitizeHTML(defaultSubject)}">
          </div>
          <div class="form-group m-0">
            <label class="form-label">Message <span class="required">*</span></label>
            <textarea name="body" id="compose-body" class="form-textarea" rows="10" required style="min-height:200px">${Utils.sanitizeHTML(defaultBody)}</textarea>
          </div>
        </form>`,
      submitText: EMAILJS_CONFIG.serviceId==='YOUR_SERVICE_ID' ? '📝 Log Email' : '✉️ Send Email',
      modalSize: 'modal-lg',
      onSubmit: async (modalEl) => {
        const form = Utils.$('#compose-form', modalEl);
        if (!form.checkValidity()) { form.reportValidity(); return false; }
        const fd = new FormData(form);
        const selClientId = fd.get('clientId');
        const selClient = Store.getById(Store.COLLECTIONS.CLIENTS, selClientId);
        if (!selClient) { Utils.showToast('Select a valid client.', 'error'); return false; }
        const subject = fd.get('subject');
        const body = fd.get('body');
        const tplName = EMAIL_TEMPLATES.find(t=>t.id===fd.get('templateId'))?.name||'Custom';
        logEmail(selClientId, selClient.name, subject, body, tplName,
          EMAILJS_CONFIG.serviceId==='YOUR_SERVICE_ID' ? 'Logged (EmailJS not configured)' : 'Sent');
        if (EMAILJS_CONFIG.serviceId!=='YOUR_SERVICE_ID') {
          try {
            await emailjs.send(EMAILJS_CONFIG.serviceId, EMAILJS_CONFIG.templateId,
              { to_email:selClient.email, to_name:selClient.name, subject, message:body }, EMAILJS_CONFIG.publicKey);
            Utils.showToast(`Email sent to ${selClient.name}.`, 'success');
          } catch(err) {
            console.error(err);
            Utils.showToast('Email send failed. Logged anyway.', 'error');
          }
        } else {
          Utils.showToast(`Email logged for ${selClient.name}. Configure EmailJS to send for real.`, 'info');
        }
        return true;
      }
    });

    setTimeout(() => {
      const tplSelect = document.getElementById('compose-template');
      const clientSelect = document.getElementById('compose-client');
      if (!tplSelect) return;
      const autofill = () => {
        const tpl = EMAIL_TEMPLATES.find(t=>t.id===tplSelect.value);
        if (!tpl||tpl.id==='custom') return;
        const c = clientSelect.value ? Store.getById(Store.COLLECTIONS.CLIENTS, clientSelect.value) : null;
        const vars = { clientName:c?c.name:'{{clientName}}', ...extraVars };
        document.getElementById('compose-subject').value = fillTemplate(tpl.subject, vars);
        document.getElementById('compose-body').value = fillTemplate(tpl.body, vars);
      };
      tplSelect.addEventListener('change', autofill);
      clientSelect.addEventListener('change', autofill);
    }, 100);
  }

  function showBulkEmailModal() {
    const clients = Store.getAll(Store.COLLECTIONS.CLIENTS);
    App.showModal({
      title: '📢 Bulk Email',
      content: `
        <form id="bulk-form" class="animate-fade-in-scale">
          <div class="form-group">
            <label class="form-label">Target Segment <span class="required">*</span></label>
            <select name="segment" id="bulk-segment" class="form-select" required>
              <option value="">-- Choose Segment --</option>
              <option value="all">All Clients (${clients.length})</option>
              <option value="Bride">All Brides (${clients.filter(c=>c.type==='Bride').length})</option>
              <option value="Groom">All Grooms (${clients.filter(c=>c.type==='Groom').length})</option>
              <option value="Family">Family (${clients.filter(c=>c.type==='Family').length})</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Template</label>
            <select name="templateId" id="bulk-template" class="form-select">
              ${EMAIL_TEMPLATES.filter(t=>t.id!=='custom').map(t=>`<option value="${t.id}">${t.name}</option>`).join('')}
              <option value="custom">Custom</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Subject <span class="required">*</span></label>
            <input type="text" name="subject" id="bulk-subject" class="form-input" required value="">
          </div>
          <div class="form-group m-0">
            <label class="form-label">Message <span class="required">*</span></label>
            <textarea name="body" id="bulk-body" class="form-textarea" rows="8" required style="min-height:180px" placeholder="Use {{clientName}} to personalise per client."></textarea>
          </div>
          <p class="text-xs text-muted mt-2">Each email is personalised with the client's name via {{clientName}}.</p>
        </form>`,
      submitText: EMAILJS_CONFIG.serviceId==='YOUR_SERVICE_ID' ? '📝 Log All' : '📢 Send Bulk',
      modalSize: 'modal-lg',
      onSubmit: async (modalEl) => {
        const form = Utils.$('#bulk-form', modalEl);
        if (!form.checkValidity()) { form.reportValidity(); return false; }
        const fd = new FormData(form);
        const segment = fd.get('segment');
        if (!segment) { Utils.showToast('Select a segment.', 'error'); return false; }
        let targets = segment==='all' ? clients : clients.filter(c=>c.type===segment);
        const subject = fd.get('subject');
        const body = fd.get('body');
        targets.forEach(client => {
          const ps = fillTemplate(subject, { clientName:client.name });
          const pb = fillTemplate(body, { clientName:client.name });
          logEmail(client.id, client.name, ps, pb, 'Bulk',
            EMAILJS_CONFIG.serviceId==='YOUR_SERVICE_ID' ? 'Logged (EmailJS not configured)' : 'Sent');
        });
        Utils.showToast(`${targets.length} emails ${EMAILJS_CONFIG.serviceId==='YOUR_SERVICE_ID'?'logged':'sent'}.`, 'success');
        return true;
      }
    });

    setTimeout(() => {
      const bt = document.getElementById('bulk-template');
      if (!bt) return;
      bt.addEventListener('change', () => {
        const tpl = EMAIL_TEMPLATES.find(t=>t.id===bt.value);
        if (!tpl||tpl.id==='custom') return;
        document.getElementById('bulk-subject').value = tpl.subject;
        document.getElementById('bulk-body').value = tpl.body;
      });
    }, 100);
  }

  // ==========================================
  // BRIDAL JOURNEY
  // ==========================================

  function renderBridalJourney(container, actions) {
    const clients = Store.query(Store.COLLECTIONS.CLIENTS, c=>c.type==='Bride');
    if (clients.length===0) {
      container.innerHTML = `<div class="card p-8 text-center text-muted">
        <div class="empty-state"><div class="empty-state-icon">👑</div>
        <div class="empty-state-title">No Brides registered</div>
        <div class="empty-state-text">Add a client with type 'Bride' to track their journey.</div></div></div>`;
      return;
    }
    container.innerHTML = `
      <div class="card p-6">
        <div class="form-group" style="max-width:320px">
          <label class="form-label">Select Bridal Profile</label>
          <select id="journey-client-select" class="form-select">
            ${clients.map(c=>`<option value="${c.id}">${Utils.sanitizeHTML(c.name)}</option>`).join('')}
          </select>
        </div>
        <div id="bridal-journey-timeline-wrapper" class="mt-6"></div>
      </div>
    `;
    const selector = Utils.$('#journey-client-select');
    selector.addEventListener('change', () => loadJourneyTimeline(selector.value));
    loadJourneyTimeline(selector.value);
  }

  function loadJourneyTimeline(clientId) {
    const wrapper = Utils.$('#bridal-journey-timeline-wrapper');
    if (!wrapper) return;
    const client = Store.getById(Store.COLLECTIONS.CLIENTS, clientId);
    if (!client) return;
    const orders = Store.query(Store.COLLECTIONS.ORDERS, o=>o.clientId===clientId);

    const milestones = [
      { name:'Design Consultation & Sketching', desc:'Discuss theme, motifs, colour palette and take preliminary measurements.' },
      { name:'Design Board & Embroidery Approval', desc:'Finalise hand-drawn sketches and embroidery fabric swatches.' },
      { name:'Fabric Sourcing & Dyeing', desc:'Procure silks, nets and begin custom hand-dyeing processes.' },
      { name:'Karigari / Hand Embroidery', desc:'Intricate zardozi, dabka and pearl-work done by specialised artisans.' },
      { name:'Canvas / First Mock Fitting', desc:'Stitch basic structure on canvas to verify draping and silhouette.' },
      { name:'Second Fitting (Embroidered Panels)', desc:'Fit semi-stitched panels with embroidery patterns locked.' },
      { name:'Final Finishing & Alterations', desc:'Attach linings, tassels, custom zips and verify final finishing.' },
      { name:'Final Handover', desc:'Quality inspection, steam press, bridal pack and boutique pickup.' }
    ];

    const statusMap = { 'New':1,'In Design':2,'Fabric Sourced':3,'In Production':4,'Fitting':5,'Ready':6,'Delivered':7 };
    const currentStage = orders.length>0 ? (statusMap[orders[0].status]||0) : 0;

    wrapper.innerHTML = `
      <div class="d-flex items-center justify-between mb-6" style="border-bottom:1px solid var(--pc-border);padding-bottom:var(--sp-4)">
        <div>
          <h3 class="font-display text-md text-gold">${Utils.sanitizeHTML(client.name)} — Bridal Journey</h3>
          <p class="text-xs text-muted mt-1">From concept sketch to wedding day</p>
        </div>
        <div class="d-flex items-center gap-3">
          <div class="text-right">
            <span class="text-xs text-muted">Progress</span>
            <div class="text-sm font-semibold text-gold font-mono">${Math.round(currentStage/7*100)}%</div>
          </div>
          <div style="width:120px">
            <div class="progress-bar"><div class="progress-bar-fill" style="width:${currentStage/7*100}%"></div></div>
          </div>
        </div>
      </div>
      <div class="timeline animate-fade-in">
        ${milestones.map((m,idx) => {
          const sc = idx<currentStage?'completed':idx===currentStage?'active':'pending';
          const st = idx<currentStage?'Completed':idx===currentStage?'In Progress':'Planned';
          return `
            <div class="timeline-item">
              <div class="timeline-dot ${sc}"></div>
              <div class="timeline-content ${idx===currentStage?'active-step-highlight':''}">
                <span class="badge ${sc==='completed'?'badge-success':sc==='active'?'badge-gold':'badge-muted'} text-xs mb-1">${st}</span>
                <h4 class="timeline-title text-sm mt-1">${m.name}</h4>
                <p class="timeline-description text-xs mt-2">${m.desc}</p>
              </div>
            </div>`;
        }).join('')}
      </div>
    `;
  }

  // ==========================================
  // SALES (Summary view)
  // ==========================================

  function renderSales(container, actions) {
    actions.innerHTML = `<button class="btn btn-primary" id="btn-add-sale">+ Record Sale</button>`;
    Utils.$('#btn-add-sale').addEventListener('click', () => {
      App.showModal({
        title: 'Record Sale',
        content: '<p class="text-muted text-sm">Sales recording module coming soon. Use Accounting Portal for invoices and payments.</p>',
        submitText: 'Go to Accounting', hideCancel: true,
        onSubmit: () => { App.navigate('accounting'); return true; }
      });
    });

    const orders = Store.query(Store.COLLECTIONS.ORDERS, o=>o.status==='Delivered');
    const invoices = Store.query(Store.COLLECTIONS.INVOICES, i=>i.status==='Paid');
    const totalRevenue = invoices.reduce((sum,i)=>sum+i.total,0);

    container.innerHTML = `
      <div class="d-flex flex-col gap-4">
        <div class="d-grid gap-4" style="grid-template-columns:repeat(3,1fr)">
          <div class="stat-card">
            <div class="stat-card-header"><span class="stat-card-icon green">💰</span></div>
            <div class="stat-card-value">${Utils.formatCurrency(totalRevenue)}</div>
            <div class="stat-card-label">Revenue (Paid Invoices)</div>
          </div>
          <div class="stat-card">
            <div class="stat-card-header"><span class="stat-card-icon gold">📦</span></div>
            <div class="stat-card-value">${orders.length}</div>
            <div class="stat-card-label">Orders Delivered</div>
          </div>
          <div class="stat-card">
            <div class="stat-card-header"><span class="stat-card-icon blue">🧾</span></div>
            <div class="stat-card-value">${invoices.length}</div>
            <div class="stat-card-label">Paid Invoices</div>
          </div>
        </div>
        <div class="card p-4">
          <div class="card-title mb-3">Delivered Orders</div>
          ${orders.length===0?`<div class="text-center text-muted text-xs p-6">No delivered orders yet.</div>`:`
            <div class="table-container" style="border:none">
              <table class="data-table">
                <thead><tr><th>Order</th><th>Client</th><th>Value</th><th>Delivered</th></tr></thead>
                <tbody>
                  ${orders.map(o=>`<tr>
                    <td class="font-medium">${Utils.sanitizeHTML(o.title)}</td>
                    <td>${Utils.sanitizeHTML(o.clientName)}</td>
                    <td class="font-mono">${Utils.formatCurrency(o.price)}</td>
                    <td>${Utils.formatDate(o.updatedAt||o.deadline)}</td>
                  </tr>`).join('')}
                </tbody>
              </table>
            </div>`}
        </div>
      </div>
    `;
  }

  function quickEmailClient(clientId) {
    showComposeModal(clientId, 'custom', {});
  }

  return {
    init,
    editClient,
    deleteClient,
    quickEmailClient,
    completeAppointment,
    editAppointment,
    deleteAppointment,
    sendFittingReminder,
    moveOrderStage,
    editOrder,
    deleteOrder,
    showComposeModal
  };
})();