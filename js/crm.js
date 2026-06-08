/* ============================================================
   POOJA'S COUTURE — CRM Module (v2)
   Clients, Appointments, Orders, Bridal Journey, Email Management
   FIXES: syntax errors, missing editAppointment, added Email tab
   ============================================================ */

const CRM = (() => {
  let activeTab = 'clients';

  // EmailJS config — fill in your own keys from emailjs.com (free tier = 200/month)
  const EMAILJS_CONFIG = {
    serviceId: 'service_w6v2tms',
    templateId: 'template_h8dn3gn',
    publicKey: 'p6cyFWFbulcvknqQ1'
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
    activeTab = 'sales';
    render();
  }

  function render() {
    const container = Utils.$('#main-content-area');
    if (!container) return;

    container.innerHTML = `
      <div class="page-header animate-fade-in">
        <div>
          <h1 class="page-title">Sales Dashboard</h1>
          <p class="page-subtitle">Manage bridal clients, consultations, order pipelines, email communications and fitting journeys</p>
        </div>
        <div class="page-actions" id="crm-page-actions"></div>
      </div>
      <div class="animate-fade-in stagger-1" style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:16px;">
        <button class="tab-btn ${activeTab==='sales'?'active':''}" data-tab="sales" style="font-size:14px;padding:8px 18px;border-radius:20px;font-weight:600;">💵 Sales</button>
        <button class="tab-btn ${activeTab==='clients'?'active':''}" data-tab="clients" style="font-size:14px;padding:8px 18px;border-radius:20px;font-weight:600;">👑 Clients</button>
        <button class="tab-btn ${activeTab==='appointments'?'active':''}" data-tab="appointments" style="font-size:14px;padding:8px 18px;border-radius:20px;font-weight:600;">📅 Appts</button>
        <button class="tab-btn ${activeTab==='orders'?'active':''}" data-tab="orders" style="font-size:14px;padding:8px 18px;border-radius:20px;font-weight:600;">🧵 Pipeline</button>
        <button class="tab-btn ${activeTab==='projects'?'active':''}" data-tab="projects" style="font-size:14px;padding:8px 18px;border-radius:20px;font-weight:600;">📁 Projects</button>
        <button class="tab-btn ${activeTab==='journey'?'active':''}" data-tab="journey" style="font-size:14px;padding:8px 18px;border-radius:20px;font-weight:600;">💍 Journey</button>
        <button class="tab-btn ${activeTab==='email'?'active':''}" data-tab="email" style="font-size:14px;padding:8px 18px;border-radius:20px;font-weight:600;">✉️ Email</button>
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
    else if (activeTab === 'projects') renderProjects(contentContainer, actionContainer);
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
      { id: 'New',                  title: 'New Concept' },
      { id: 'In Design',            title: 'In Design' },
      { id: 'Fabric Sourced',       title: 'Fabric Sourced' },
      { id: 'In Production',        title: 'In Production' },
      { id: 'Fitting',              title: 'Fitting (Early)' },
      { id: 'Ready',                title: 'Ready' },
      { id: 'Shipped to Shashank',  title: 'Shipped to Shashank' },
      { id: 'At Shashank',          title: 'At Shashank' },
      { id: 'In Transit',           title: 'In Transit' },
      { id: 'Awaiting Payment',     title: 'Awaiting Payment' },
      { id: 'Received in Australia', title: 'Received in AU' },
      { id: 'Final Fitting',        title: 'Final Fitting' },
      { id: 'Cleared for Delivery', title: 'Cleared for Delivery' },
      { id: 'Delivered',            title: 'Delivered' }
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
      <div class="card p-4 mb-4 animate-fade-in stagger-1" style="margin-top: 18px;">
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
          : o.status === 'Cleared for Delivery' ? 'badge-success'
          : o.status === 'Ready' || o.status === 'In Transit' ? 'badge-info'
          : o.status === 'Received in Australia' ? 'badge-info'
          : o.status === 'Final Fitting' ? 'badge-purple'
          : o.status === 'Awaiting Payment' ? 'badge-danger'
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
            <div class="d-flex items-center gap-2">
              <span class="badge ${stageColor}" style="font-size:10px">${o.status}</span>
              ${o.orderCode?`<span class="font-mono text-xs text-gold">${o.orderCode}</span>`:''}
            </div>
            <span class="text-xs ${deadlineClass}">📅 ${deadlineText}</span>
          </div>
          ${(()=>{
            if (!o.projectId) return '';
            const proj = Store.getById(Store.COLLECTIONS.ORDER_PROJECTS, o.projectId);
            return proj ? `<div class="px-3 py-1" style="background:rgba(139,92,246,0.08);border-bottom:1px solid var(--pc-border);font-size:10px;color:#a78bfa;">📁 ${Utils.sanitizeHTML(proj.projectName)}</div>` : '';
          })()}
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
                <div class="text-xs text-muted">Value (ex-GST)</div>
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

  // Generate next sequential order code for a product-type prefix.
  // e.g. BLS-000001. Reads the highest existing code for that prefix and +1.
  function generateOrderCode(prefix) {
    const orders = Store.getAll(Store.COLLECTIONS.ORDERS);
    let maxNum = 0;
    orders.forEach(o => {
      if (o.orderCode && o.orderCode.indexOf(prefix + '-') === 0) {
        const n = parseInt(o.orderCode.slice(prefix.length + 1), 10);
        if (!isNaN(n) && n > maxNum) maxNum = n;
      }
    });
    const next = maxNum + 1;
    return prefix + '-' + String(next).padStart(6, '0');
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
          <div class="form-group">
            <label class="form-label">Product Type <span class="required">*</span></label>
            <select name="productType" class="form-select" required>
              <option value="BLS" ${!order||order.productType==='BLS'?'selected':''}>Bridal Lehenga Set (BLS)</option>
              <option value="SAR" ${order&&order.productType==='SAR'?'selected':''}>Saree (SAR)</option>
              <option value="SAL" ${order&&order.productType==='SAL'?'selected':''}>Salwar Suit (SAL)</option>
              <option value="SHE" ${order&&order.productType==='SHE'?'selected':''}>Sherwani (SHE)</option>
              <option value="BSN" ${order&&order.productType==='BSN'?'selected':''}>Bridal Sneakers (BSN)</option>
              <option value="GEN" ${order&&order.productType==='GEN'?'selected':''}>Other (GEN)</option>
            </select>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Price ex-GST (AUD) <span class="required">*</span></label>
              <input type="number" name="price" class="form-input" min="0" required value="${order?order.price:''}">
            </div>
            <div class="form-group">
              <label class="form-label">Deadline <span class="required">*</span></label>
              <input type="date" name="deadline" class="form-input" required value="${order?order.deadline:''}">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Deposit Paid Now (AUD)</label>
              <input type="number" name="depositPaid" class="form-input" min="0" step="0.01" placeholder="0.00" value="">
              <div class="text-xs text-muted mt-1" id="deposit-pct-hint">Optional. Leave blank if no deposit taken yet.</div>
            </div>
            <div class="form-group">
              <!-- spacer -->
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Status</label>
              <select name="status" class="form-select">
                <option value="New" ${!order||order.status==='New'?'selected':''}>New Concept</option>
                <option value="In Design" ${order&&order.status==='In Design'?'selected':''}>In Design</option>
                <option value="Fabric Sourced" ${order&&order.status==='Fabric Sourced'?'selected':''}>Fabric Sourced</option>
                <option value="In Production" ${order&&order.status==='In Production'?'selected':''}>In Production</option>
                <option value="Fitting" ${order&&order.status==='Fitting'?'selected':''}>Fitting</option>
                <option value="Ready" ${order&&order.status==='Ready'?'selected':''}>Ready</option>
                <option value="Shipped to Shashank" ${order&&order.status==='Shipped to Shashank'?'selected':''}>Shipped to Shashank</option>
                <option value="At Shashank" ${order&&order.status==='At Shashank'?'selected':''}>At Shashank</option>
                <option value="In Transit" ${order&&order.status==='In Transit'?'selected':''}>In Transit</option>
                <option value="Awaiting Payment" ${order&&order.status==='Awaiting Payment'?'selected':''}>Awaiting Payment</option>
                <option value="Received in Australia" ${order&&order.status==='Received in Australia'?'selected':''}>Received in Australia</option>
                <option value="Final Fitting" ${order&&order.status==='Final Fitting'?'selected':''}>Final Fitting</option>
                <option value="Cleared for Delivery" ${order&&order.status==='Cleared for Delivery'?'selected':''}>Cleared for Delivery</option>
                <option value="Delivered" ${order&&order.status==='Delivered'?'selected':''}>Delivered</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Delivery Destination <span class="required">*</span></label>
              <select name="deliveryDestination" class="form-select" required>
                <option value="Australia" ${!order||order.deliveryDestination==='Australia'?'selected':''}>To Australia</option>
                <option value="India" ${order&&order.deliveryDestination==='India'?'selected':''}>To India</option>
                <option value="Overseas" ${order&&order.deliveryDestination==='Overseas'?'selected':''}>Overseas (anywhere else)</option>
              </select>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Customer Shipping Contribution <span class="required">*</span></label>
            <select name="shippingAllocation" class="form-select" required>
              <option value="None" ${!order||order.shippingAllocation==='None'?'selected':''}>No shipping charge — we absorb it</option>
              <option value="Half" ${order&&order.shippingAllocation==='Half'?'selected':''}>50/50 split — customer pays half</option>
              <option value="Full" ${order&&order.shippingAllocation==='Full'?'selected':''}>Customer pays full shipping</option>
            </select>
          </div>
          <!-- ── SECTION: Occasion ── -->
          <div class="form-group" style="margin-top:8px;padding-top:12px;border-top:1px solid var(--pc-border)">
            <div class="text-xs font-semibold text-gold" style="text-transform:uppercase;letter-spacing:.6px;margin-bottom:10px;">🎉 Occasion & Event</div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Event / Project Name</label>
                <input type="text" name="eventName" class="form-input" placeholder="e.g. Alyssa Wedding" value="${order?Utils.sanitizeHTML(order.eventName||''):''}">
              </div>
              <div class="form-group">
                <label class="form-label">Event Date</label>
                <input type="date" name="eventDate" class="form-input" value="${order&&order.eventDate?order.eventDate:''}">
              </div>
            </div>
            <div class="form-group m-0">
              <label class="form-label">Look / Outfit Number</label>
              <input type="text" name="lookNumber" class="form-input" placeholder="e.g. Look 1 — Wedding Ceremony" value="${order?Utils.sanitizeHTML(order.lookNumber||''):''}">
            </div>
          </div>

          <!-- ── SECTION: Fabric & Colour ── -->
          <div class="form-group" style="margin-top:8px;padding-top:12px;border-top:1px solid var(--pc-border)">
            <div class="text-xs font-semibold text-gold" style="text-transform:uppercase;letter-spacing:.6px;margin-bottom:10px;">🎨 Fabric & Colour</div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Fabric Type</label>
                <input type="text" name="fabricType" class="form-input" placeholder="e.g. Pure Silk, Shimmer Net, Tissue Silk" value="${order?Utils.sanitizeHTML(order.fabricType||''):''}">
              </div>
              <div class="form-group">
                <label class="form-label">Colour / Colour Ref #</label>
                <input type="text" name="colourRef" class="form-input" placeholder="e.g. Rich Maroon, 252-L" value="${order?Utils.sanitizeHTML(order.colourRef||''):''}">
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Dupatta Details</label>
                <input type="text" name="dupattaDetails" class="form-input" placeholder="e.g. 1x net + 2x organza silk, 4-sided border" value="${order?Utils.sanitizeHTML(order.dupattaDetails||''):''}">
              </div>
              <div class="form-group">
                <label class="form-label">Lining / Underlayer</label>
                <input type="text" name="liningDetails" class="form-input" placeholder="e.g. Satin silk under-layering" value="${order?Utils.sanitizeHTML(order.liningDetails||''):''}">
              </div>
            </div>
          </div>

          <!-- ── SECTION: Measurements (Top Body) ── -->
          <div class="form-group" style="margin-top:8px;padding-top:12px;border-top:1px solid var(--pc-border)">
            <div class="text-xs font-semibold text-gold" style="text-transform:uppercase;letter-spacing:.6px;margin-bottom:10px;">📏 Measurements — Top Body (inches)</div>
            <div class="d-grid gap-3" style="grid-template-columns:repeat(3,1fr)">
              <div class="form-group m-0">
                <label class="form-label">Bust</label>
                <input type="text" name="mBust" class="form-input" placeholder="—" value="${order?Utils.sanitizeHTML(order.mBust||''):''}">
              </div>
              <div class="form-group m-0">
                <label class="form-label">Under Bust</label>
                <input type="text" name="mUnderBust" class="form-input" placeholder="—" value="${order?Utils.sanitizeHTML(order.mUnderBust||''):''}">
              </div>
              <div class="form-group m-0">
                <label class="form-label">Chest</label>
                <input type="text" name="mChest" class="form-input" placeholder="—" value="${order?Utils.sanitizeHTML(order.mChest||''):''}">
              </div>
              <div class="form-group m-0">
                <label class="form-label">Shoulder</label>
                <input type="text" name="mShoulder" class="form-input" placeholder="—" value="${order?Utils.sanitizeHTML(order.mShoulder||''):''}">
              </div>
              <div class="form-group m-0">
                <label class="form-label">Armhole</label>
                <input type="text" name="mArmhole" class="form-input" placeholder="—" value="${order?Utils.sanitizeHTML(order.mArmhole||''):''}">
              </div>
              <div class="form-group m-0">
                <label class="form-label">Blouse Length</label>
                <input type="text" name="mBlouseLength" class="form-input" placeholder="—" value="${order?Utils.sanitizeHTML(order.mBlouseLength||''):''}">
              </div>
              <div class="form-group m-0">
                <label class="form-label">Back Neck</label>
                <input type="text" name="mBackNeck" class="form-input" placeholder="—" value="${order?Utils.sanitizeHTML(order.mBackNeck||''):''}">
              </div>
              <div class="form-group m-0">
                <label class="form-label">Front Neck</label>
                <input type="text" name="mFrontNeck" class="form-input" placeholder="—" value="${order?Utils.sanitizeHTML(order.mFrontNeck||''):''}">
              </div>
              <div class="form-group m-0">
                <label class="form-label">Sleeve Length</label>
                <input type="text" name="mSleeveLength" class="form-input" placeholder="—" value="${order?Utils.sanitizeHTML(order.mSleeveLength||''):''}">
              </div>
              <div class="form-group m-0">
                <label class="form-label">Morrie</label>
                <input type="text" name="mMorrie" class="form-input" placeholder="—" value="${order?Utils.sanitizeHTML(order.mMorrie||''):''}">
              </div>
              <div class="form-group m-0">
                <label class="form-label">Waist</label>
                <input type="text" name="mWaist" class="form-input" placeholder="—" value="${order?Utils.sanitizeHTML(order.mWaist||''):''}">
              </div>
              <div class="form-group m-0">
                <label class="form-label">Wrist</label>
                <input type="text" name="mWrist" class="form-input" placeholder="—" value="${order?Utils.sanitizeHTML(order.mWrist||''):''}">
              </div>
            </div>
          </div>

          <!-- ── SECTION: Measurements (Bottom Body) ── -->
          <div class="form-group" style="margin-top:8px;padding-top:12px;border-top:1px solid var(--pc-border)">
            <div class="text-xs font-semibold text-gold" style="text-transform:uppercase;letter-spacing:.6px;margin-bottom:10px;">📏 Measurements — Bottom Body (inches)</div>
            <div class="d-grid gap-3" style="grid-template-columns:repeat(3,1fr)">
              <div class="form-group m-0">
                <label class="form-label">Lehenga Waist</label>
                <input type="text" name="mLehengaWaist" class="form-input" placeholder="—" value="${order?Utils.sanitizeHTML(order.mLehengaWaist||''):''}">
              </div>
              <div class="form-group m-0">
                <label class="form-label">Lehenga Length</label>
                <input type="text" name="mLehengaLength" class="form-input" placeholder="—" value="${order?Utils.sanitizeHTML(order.mLehengaLength||''):''}">
              </div>
              <div class="form-group m-0">
                <label class="form-label">Hips</label>
                <input type="text" name="mHips" class="form-input" placeholder="—" value="${order?Utils.sanitizeHTML(order.mHips||''):''}">
              </div>
              <div class="form-group m-0">
                <label class="form-label">Knee Split</label>
                <input type="text" name="mKneeSplit" class="form-input" placeholder="e.g. If required for modern style" value="${order?Utils.sanitizeHTML(order.mKneeSplit||''):''}">
              </div>
            </div>
          </div>

          <!-- ── SECTION: Design Notes ── -->
          <div class="form-group" style="margin-top:8px;padding-top:12px;border-top:1px solid var(--pc-border)">
            <div class="text-xs font-semibold text-gold" style="text-transform:uppercase;letter-spacing:.6px;margin-bottom:10px;">✍️ Design Notes</div>
            <div class="form-group">
              <label class="form-label">Key Design Notes</label>
              <textarea name="designNotes" class="form-textarea" rows="3" placeholder="e.g. 3D motifs, zardozi, structured kalis, gold embroidery shading...">${order?Utils.sanitizeHTML(order.designNotes||''):''}</textarea>
            </div>
            <div class="form-group">
              <label class="form-label">Embroidery / Work Details</label>
              <textarea name="embroideryDetails" class="form-textarea" rows="2" placeholder="e.g. Zardozi + 3D motifs, layered textured embroidery, gold work borders...">${order?Utils.sanitizeHTML(order.embroideryDetails||''):''}</textarea>
            </div>
            <div class="form-group m-0">
              <label class="form-label">Silhouette / Cut Notes</label>
              <input type="text" name="silhouetteNotes" class="form-input" placeholder="e.g. Multiple structured kalis, full flair, modern cape drape" value="${order?Utils.sanitizeHTML(order.silhouetteNotes||''):''}">
            </div>
          </div>

          <!-- ── SECTION: Accessories ── -->
          <div class="form-group" style="margin-top:8px;padding-top:12px;border-top:1px solid var(--pc-border)">
            <div class="text-xs font-semibold text-gold" style="text-transform:uppercase;letter-spacing:.6px;margin-bottom:10px;">💎 Accessories & Finishing</div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Blouse Accessories</label>
                <input type="text" name="blouseAccessories" class="form-input" placeholder="e.g. Dangals at back, beaded details at hem" value="${order?Utils.sanitizeHTML(order.blouseAccessories||''):''}">
              </div>
              <div class="form-group">
                <label class="form-label">Latkans / Tassels</label>
                <input type="text" name="latkans" class="form-input" placeholder="e.g. Fancy latkans — confirm personalisation with client" value="${order?Utils.sanitizeHTML(order.latkans||''):''}">
              </div>
            </div>
            <div class="form-group m-0">
              <label class="form-label">Optional Add-Ons / Special Requests</label>
              <textarea name="optionalAddOns" class="form-textarea" rows="2" placeholder="e.g. Personalised latkans, extra beading, knee split if required...">${order?Utils.sanitizeHTML(order.optionalAddOns||''):''}</textarea>
            </div>
          </div>

          <!-- ── SECTION: Internal Notes ── -->
          <div class="form-group m-0" style="margin-top:8px;padding-top:12px;border-top:1px solid var(--pc-border)">
            <div class="text-xs font-semibold text-gold" style="text-transform:uppercase;letter-spacing:.6px;margin-bottom:10px;">📋 Internal Notes</div>
            <textarea name="notes" id="order-notes-field" class="form-textarea" placeholder="Any other internal notes, tailor instructions, reference images...">${order?Utils.sanitizeHTML(order.notes||''):''}</textarea>
          </div>
        </form>`,
      submitText: isEdit ? 'Save Order' : 'Create Order',
      onSubmit: async (modalEl) => {
        const form = Utils.$('#order-form', modalEl);
        if (!form.checkValidity()) { form.reportValidity(); return false; }
        const fd = new FormData(form);
        const selectedClient = Store.getById(Store.COLLECTIONS.CLIENTS, fd.get('clientId'));
        const price = parseFloat(fd.get('price'));
        const productType = fd.get('productType') || 'GEN';
        const orderData = {
          clientId: fd.get('clientId'),
          clientName: selectedClient ? selectedClient.name : 'Unknown',
          title: fd.get('title'), price,
          deadline: fd.get('deadline'), status: fd.get('status'),
          deliveryDestination: fd.get('deliveryDestination'),
          shippingAllocation: fd.get('shippingAllocation'),
          productType: productType,
          // Occasion
          eventName: fd.get('eventName') || '',
          eventDate: fd.get('eventDate') || '',
          lookNumber: fd.get('lookNumber') || '',
          // Fabric & Colour
          fabricType: fd.get('fabricType') || '',
          colourRef: fd.get('colourRef') || '',
          dupattaDetails: fd.get('dupattaDetails') || '',
          liningDetails: fd.get('liningDetails') || '',
          // Measurements — Top
          mBust: fd.get('mBust') || '',
          mUnderBust: fd.get('mUnderBust') || '',
          mChest: fd.get('mChest') || '',
          mShoulder: fd.get('mShoulder') || '',
          mArmhole: fd.get('mArmhole') || '',
          mBlouseLength: fd.get('mBlouseLength') || '',
          mBackNeck: fd.get('mBackNeck') || '',
          mFrontNeck: fd.get('mFrontNeck') || '',
          mSleeveLength: fd.get('mSleeveLength') || '',
          mMorrie: fd.get('mMorrie') || '',
          mWaist: fd.get('mWaist') || '',
          mWrist: fd.get('mWrist') || '',
          // Measurements — Bottom
          mLehengaWaist: fd.get('mLehengaWaist') || '',
          mLehengaLength: fd.get('mLehengaLength') || '',
          mHips: fd.get('mHips') || '',
          mKneeSplit: fd.get('mKneeSplit') || '',
          // Design
          designNotes: fd.get('designNotes') || '',
          embroideryDetails: fd.get('embroideryDetails') || '',
          silhouetteNotes: fd.get('silhouetteNotes') || '',
          // Accessories
          blouseAccessories: fd.get('blouseAccessories') || '',
          latkans: fd.get('latkans') || '',
          optionalAddOns: fd.get('optionalAddOns') || '',
          // Internal notes
          notes: fd.get('notes') || ''
        };
        if (isEdit) {
          Store.update(Store.COLLECTIONS.ORDERS, orderId, orderData);
          Utils.showToast('Order updated.');
        } else {
          // Assign a human-facing order code (UUID stays the primary key).
          orderData.orderCode = generateOrderCode(productType);
          const createdOrder = await Store.create(Store.COLLECTIONS.ORDERS, orderData);
          const depositPaid = parseFloat(fd.get('depositPaid')) || 0;

          // Invoice total = order price (ex-GST) + 10% GST on top.
          // Deposit is a flat amount off the GST-inclusive total.
          const gstTotal     = Math.round((price * 0.10) * 100) / 100;
          const subtotal     = Math.round(price * 100) / 100;
          const invoiceTotal = Math.round((price + gstTotal) * 100) / 100;
          const balance      = Math.round((invoiceTotal - depositPaid) * 100) / 100;

          let invStatus = 'Draft';
          if (depositPaid >= invoiceTotal && invoiceTotal > 0) invStatus = 'Paid';
          else if (depositPaid > 0)                            invStatus = 'Partially Paid';

          await Store.create(Store.COLLECTIONS.INVOICES, {
            orderId: createdOrder ? createdOrder.id : null,
            clientId: fd.get('clientId'),
            clientName: selectedClient ? selectedClient.name : 'Unknown',
            invoiceNumber: 'INV-' + new Date().getFullYear() + '-' + Utils.randomBetween(100, 999),
            issueDate: new Date().toISOString().split('T')[0],
            dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            subtotal: subtotal,
            gstTotal: gstTotal,
            total: invoiceTotal,
            amountPaid: depositPaid,
            status: invStatus,
            notes: depositPaid > 0
              ? `Deposit of ${Utils.formatCurrency(depositPaid)} received. Balance due: ${Utils.formatCurrency(balance)}.`
              : `Full invoice for: ${orderData.title}. No deposit recorded yet.`,
            items: [{
              description: orderData.title,
              quantity: 1,
              unitPrice: subtotal,
              gst: gstTotal,
              amount: invoiceTotal
            }]
          });
          Utils.showToast(
            depositPaid > 0
              ? `Order created. Invoice ${Utils.formatCurrency(invoiceTotal)} inc GST — deposit ${Utils.formatCurrency(depositPaid)} recorded.`
              : `Order created. Invoice ${Utils.formatCurrency(invoiceTotal)} inc GST generated (no deposit yet).`,
            'info'
          );
        }
        renderSubTab();
        return true;
      }
    });

    // Auto-fill order specs from the selected client's notes.
    setTimeout(() => {
      const clientSelect = document.querySelector('#order-form [name="clientId"]');
      const notesField = document.getElementById('order-notes-field');
      if (!clientSelect || !notesField) return;

      let lastClientNotes = notesField.value;

      clientSelect.addEventListener('change', () => {
        const c = clientSelect.value
          ? Store.getById(Store.COLLECTIONS.CLIENTS, clientSelect.value)
          : null;
        const clientNotes = (c && c.notes) ? c.notes : '';
        const boxIsEmpty = notesField.value.trim() === '';
        const boxUnchangedFromLastClient = notesField.value === lastClientNotes;
        if (boxIsEmpty || boxUnchangedFromLastClient) {
          notesField.value = clientNotes;
        }
        lastClientNotes = clientNotes;
      });

      // Deposit hint — shows GST-inclusive total and balance
      const priceField = document.querySelector('#order-form [name="price"]');
      const depField   = document.querySelector('#order-form [name="depositPaid"]');
      const hint       = document.getElementById('deposit-pct-hint');
      if (priceField && depField && hint) {
        const updatePct = () => {
          const p = parseFloat(priceField.value) || 0;
          const d = parseFloat(depField.value) || 0;
          const gstInc = Math.round((p * 1.10) * 100) / 100;
          if (p > 0 && d > 0) {
            hint.textContent = `${Math.round((d / gstInc) * 100)}% of GST-inc total (${Utils.formatCurrency(gstInc)}). Balance due: ${Utils.formatCurrency(gstInc - d)}.`;
          } else if (p > 0) {
            hint.textContent = `Invoice total inc GST: ${Utils.formatCurrency(gstInc)}. Leave blank if no deposit taken yet.`;
          } else {
            hint.textContent = 'Optional. Leave blank if no deposit taken yet.';
          }
        };
        priceField.addEventListener('input', updatePct);
        depField.addEventListener('input', updatePct);
      }
    }, 50);
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
            ${o.orderCode?`<div class="font-mono text-xs text-muted mt-1">${o.orderCode}</div>`:''}
            ${(()=>{
              if (!o.projectId) return '';
              const proj = Store.getById(Store.COLLECTIONS.ORDER_PROJECTS, o.projectId);
              return proj ? `<div class="text-xs mt-1" style="color:#a78bfa;">📁 Project: ${Utils.sanitizeHTML(proj.projectName)}</div>` : '';
            })()}
          </div>
          ${(o.shippingCost && o.shippingAllocation && o.shippingAllocation!=='None')?`
            <div class="p-3 rounded-md" style="background:rgba(236,182,118,0.06);border:1px solid var(--pc-border)">
              <div class="text-xs text-muted mb-2">This order shipped with a customer shipping contribution (${o.shippingAllocation==='Half'?'50/50 split':'customer pays full'}). Add it to the invoice when ready.</div>
              <button class="btn btn-secondary btn-sm" onclick="CRM.addShippingToInvoice('${o.id}')">➕ Add shipping to invoice</button>
            </div>`:''}
          ${o.status==='Awaiting Payment'?`
            <div class="p-3 rounded-md" style="background:rgba(220,38,38,0.08);border:1px solid var(--pc-danger)">
              <div class="text-sm font-semibold text-danger mb-1">💳 Payment Required</div>
              <div class="text-xs text-muted mb-3">This order is held pending payment. Chase the customer, then record payment below to release for delivery.</div>
              <button class="btn btn-primary btn-sm" onclick="CRM.recordPaymentAndClear('${o.id}')">✓ Record Payment & Clear for Delivery</button>
            </div>`:''}
          ${o.status==='Received in Australia'?`
            <div class="p-3 rounded-md" style="background:rgba(59,130,246,0.08);border:1px solid var(--pc-border)">
              <div class="text-sm font-semibold mb-1">📦 Received in Australia</div>
              <div class="text-xs text-muted mb-3">Parcel is with Pooja. Schedule final fitting with client.</div>
              <button class="btn btn-primary btn-sm" onclick="CRM.markFinalFitting('${o.id}')">👗 Begin Final Fitting</button>
            </div>`:''}
          ${o.status==='Final Fitting'?`
            <div class="p-3 rounded-md" style="background:rgba(139,92,246,0.08);border:1px solid var(--pc-border)">
              <div class="text-sm font-semibold mb-1">👗 Final Fitting in Progress</div>
              <div class="text-xs text-muted mb-3">Client is trying on the garment. Once alterations (if any) are done, mark as delivered.</div>
              <button class="btn btn-primary btn-sm" onclick="CRM.markReadyToDeliver('${o.id}')">🚚 Fitting Done — Mark Delivered</button>
            </div>`:''}
          ${o.status==='In Transit' && o.deliveryDestination==='Australia'?`
            <div class="p-3 rounded-md" style="background:rgba(59,130,246,0.08);border:1px solid var(--pc-border)">
              <div class="text-sm font-semibold mb-1">📬 In Transit to Australia</div>
              <div class="text-xs text-muted mb-3">Mark as received once the parcel arrives. Shipping will be auto-added to the invoice.</div>
              <button class="btn btn-secondary btn-sm" onclick="CRM.markReceivedInAustralia('${o.id}')">📬 Mark Received in Australia</button>
            </div>`:''}
          <div class="d-grid gap-4" style="grid-template-columns:1fr 1fr">
            <div class="d-flex flex-col gap-2">
              <div><div class="text-xs text-muted">Price (ex-GST)</div><div class="font-mono font-bold">${Utils.formatCurrency(o.price)}</div></div>
              <div><div class="text-xs text-muted">Deadline</div><div class="font-mono">${Utils.formatDate(o.deadline)}</div></div>
            </div>
            <div class="d-flex flex-col gap-2">
              <div><div class="text-xs text-muted">Status</div><span class="badge badge-gold mt-1">${o.status}</span></div>
              <div><div class="text-xs text-muted">Created</div><div class="text-xs font-mono">${Utils.formatDate(o.createdAt)}</div></div>
            </div>
          </div>
          <div>
            <h4 class="text-sm font-semibold text-gold mb-2">Garment Details</h4>
            <div class="d-grid gap-3" style="grid-template-columns:1fr 1fr;font-size:12px">
              ${o.eventName?`<div><span class="text-muted">Event:</span> ${Utils.sanitizeHTML(o.eventName)}</div>`:''}
              ${o.eventDate?`<div><span class="text-muted">Event Date:</span> ${Utils.formatDate(o.eventDate)}</div>`:''}
              ${o.lookNumber?`<div><span class="text-muted">Look:</span> ${Utils.sanitizeHTML(o.lookNumber)}</div>`:''}
              ${o.fabricType?`<div><span class="text-muted">Fabric:</span> ${Utils.sanitizeHTML(o.fabricType)}</div>`:''}
              ${o.colourRef?`<div><span class="text-muted">Colour Ref:</span> ${Utils.sanitizeHTML(o.colourRef)}</div>`:''}
              ${o.dupattaDetails?`<div style="grid-column:1/-1"><span class="text-muted">Dupatta:</span> ${Utils.sanitizeHTML(o.dupattaDetails)}</div>`:''}
            </div>
            ${(o.mBust||o.mShoulder||o.mLehengaWaist)?`
            <h4 class="text-sm font-semibold text-gold mb-2 mt-3">Measurements (inches)</h4>
            <div class="d-grid gap-2" style="grid-template-columns:repeat(3,1fr);font-size:11px">
              ${o.mBust?`<div><span class="text-muted">Bust:</span> ${Utils.sanitizeHTML(o.mBust)}</div>`:''}
              ${o.mUnderBust?`<div><span class="text-muted">Under Bust:</span> ${Utils.sanitizeHTML(o.mUnderBust)}</div>`:''}
              ${o.mChest?`<div><span class="text-muted">Chest:</span> ${Utils.sanitizeHTML(o.mChest)}</div>`:''}
              ${o.mShoulder?`<div><span class="text-muted">Shoulder:</span> ${Utils.sanitizeHTML(o.mShoulder)}</div>`:''}
              ${o.mArmhole?`<div><span class="text-muted">Armhole:</span> ${Utils.sanitizeHTML(o.mArmhole)}</div>`:''}
              ${o.mBlouseLength?`<div><span class="text-muted">Blouse Length:</span> ${Utils.sanitizeHTML(o.mBlouseLength)}</div>`:''}
              ${o.mBackNeck?`<div><span class="text-muted">Back Neck:</span> ${Utils.sanitizeHTML(o.mBackNeck)}</div>`:''}
              ${o.mFrontNeck?`<div><span class="text-muted">Front Neck:</span> ${Utils.sanitizeHTML(o.mFrontNeck)}</div>`:''}
              ${o.mSleeveLength?`<div><span class="text-muted">Sleeve Length:</span> ${Utils.sanitizeHTML(o.mSleeveLength)}</div>`:''}
              ${o.mMorrie?`<div><span class="text-muted">Morrie:</span> ${Utils.sanitizeHTML(o.mMorrie)}</div>`:''}
              ${o.mWaist?`<div><span class="text-muted">Waist:</span> ${Utils.sanitizeHTML(o.mWaist)}</div>`:''}
              ${o.mWrist?`<div><span class="text-muted">Wrist:</span> ${Utils.sanitizeHTML(o.mWrist)}</div>`:''}
              ${o.mLehengaWaist?`<div><span class="text-muted">Lehenga Waist:</span> ${Utils.sanitizeHTML(o.mLehengaWaist)}</div>`:''}
              ${o.mLehengaLength?`<div><span class="text-muted">Lehenga Length:</span> ${Utils.sanitizeHTML(o.mLehengaLength)}</div>`:''}
              ${o.mHips?`<div><span class="text-muted">Hips:</span> ${Utils.sanitizeHTML(o.mHips)}</div>`:''}
              ${o.mKneeSplit?`<div style="grid-column:1/-1"><span class="text-muted">Knee Split:</span> ${Utils.sanitizeHTML(o.mKneeSplit)}</div>`:''}
            </div>`:''}
            ${o.designNotes?`
            <h4 class="text-sm font-semibold text-gold mb-1 mt-3">Design Notes</h4>
            <div class="p-2 rounded-md text-xs" style="background:rgba(0,0,0,0.2);white-space:pre-line;border:1px solid var(--pc-border)">${Utils.sanitizeHTML(o.designNotes)}</div>`:''}
            ${o.embroideryDetails?`
            <h4 class="text-sm font-semibold text-gold mb-1 mt-3">Embroidery Details</h4>
            <div class="p-2 rounded-md text-xs" style="background:rgba(0,0,0,0.2);white-space:pre-line;border:1px solid var(--pc-border)">${Utils.sanitizeHTML(o.embroideryDetails)}</div>`:''}
            ${(o.blouseAccessories||o.latkans||o.optionalAddOns)?`
            <h4 class="text-sm font-semibold text-gold mb-1 mt-3">Accessories & Add-Ons</h4>
            <div class="text-xs" style="line-height:1.8">
              ${o.blouseAccessories?`<div><span class="text-muted">Blouse:</span> ${Utils.sanitizeHTML(o.blouseAccessories)}</div>`:''}
              ${o.latkans?`<div><span class="text-muted">Latkans:</span> ${Utils.sanitizeHTML(o.latkans)}</div>`:''}
              ${o.optionalAddOns?`<div><span class="text-muted">Optional:</span> ${Utils.sanitizeHTML(o.optionalAddOns)}</div>`:''}
            </div>`:''}
            ${o.notes?`
            <h4 class="text-sm font-semibold text-gold mb-1 mt-3">Internal Notes</h4>
            <div class="p-2 rounded-md text-xs" style="background:rgba(0,0,0,0.2);white-space:pre-line;border:1px solid var(--pc-border)">${Utils.sanitizeHTML(o.notes)}</div>`:''}
            ${!o.mBust&&!o.designNotes&&!o.fabricType&&!o.notes?'<div class="text-xs text-muted">No specs recorded yet.</div>':''}
          </div>
          <div class="d-flex gap-2 justify-end" style="border-top:1px solid var(--pc-border);padding-top:var(--sp-4)">
            <button class="btn btn-secondary" onclick="CRM.editOrder('${o.id}')">✏️ Edit</button>
            <button class="btn btn-danger" onclick="CRM.deleteOrder('${o.id}')">🗑️ Delete</button>
          </div>
        </div>`,
      hideCancel: true, submitText: 'Close', onSubmit: () => true
    });
  }


  // Find invoice for an order — handles both flat orders and project sub-orders
  function _getOrderInvoice(order) {
    if (!order) return null;
    return order.projectId
      ? Store.query(Store.COLLECTIONS.INVOICES, i => i.projectId === order.projectId)[0]
      : Store.query(Store.COLLECTIONS.INVOICES, i => i.orderId === order.id)[0];
  }

  // Get M2 milestone amount from invoice
  function _getM2Amount(invoice) {
    if (!invoice || !invoice.milestones || !invoice.milestones[1]) return null;
    return invoice.milestones[1];
  }

  // Get M3 milestone amount from invoice
  function _getM3Amount(invoice) {
    if (!invoice || !invoice.milestones || !invoice.milestones[2]) return null;
    return invoice.milestones[2];
  }

  // Check if a milestone is paid
  function _milestoneIsPaid(m) {
    if (!m) return true; // no milestone = no gate
    return m.paid || ((m.paidAmount || 0) >= m.amount);
  }
  function moveOrderStage(id, status) {
    const order = Store.getById(Store.COLLECTIONS.ORDERS, id);
    const invoice = _getOrderInvoice(order);

    // ── M2 HARD GATE: block moving to In Design until M2 is paid ──
    if (status === 'In Design' && invoice && invoice.milestones) {
      const m2 = _getM2Amount(invoice);
      if (m2 && !_milestoneIsPaid(m2)) {
        App.showModal({
          title: '🔒 M2 Payment Required',
          content: `
            <div class="d-flex flex-col gap-4">
              <div class="p-3 rounded-md" style="background:rgba(220,38,38,0.08);border:1px solid var(--pc-danger)">
                <div class="text-sm font-semibold text-danger mb-1">⛔ Design & Production Payment Not Received</div>
                <div class="text-xs text-muted">Milestone 2 (40% — Design Approval) of <strong>${Utils.formatCurrency(m2.amount)}</strong> must be paid before this order can move into production.</div>
              </div>
              <div class="text-xs text-muted">Go to the project invoice to record the M2 payment, then move this order to In Design.</div>
            </div>`,
          submitText: 'OK',
          hideCancel: true,
          onSubmit: () => true
        });
        return;
      }
    }

    // ── Delivered gate: warn if balance > 0 ──
    if (status === 'Delivered') {
      if (invoice) {
        const paid = (invoice.amountPaid != null && invoice.amountPaid !== '') ? invoice.amountPaid : 0;
        const balance = Math.round((invoice.total - paid) * 100) / 100;
        if (balance > 0) {
          App.showConfirm({
            title: 'Outstanding Balance',
            text: `This order has an outstanding balance of ${Utils.formatCurrency(balance)}. Mark as Delivered anyway?`,
            confirmText: 'Mark Delivered (Override)',
            onConfirm: () => {
              Store.update(Store.COLLECTIONS.ORDERS, id, { status });
              Utils.showToast(`Order moved to: ${status}`);
              renderSubTab();
            }
          });
          return;
        }
      }
    }

    Store.update(Store.COLLECTIONS.ORDERS, id, { status });
    Utils.showToast(`Order moved to: ${status}`);
    renderSubTab();
  }

  // Add the customer's shipping contribution to their invoice.
  // Shashank enters the ex-GST shipping cost. 10% GST is added on top.
  // Pooja can edit the ex-GST figure before confirming.
  function addShippingToInvoice(orderId) {
    const o = Store.getById(Store.COLLECTIONS.ORDERS, orderId);
    if (!o) return;

    const shipCost = parseFloat(o.shippingCost) || 0;
    const alloc = o.shippingAllocation || 'None';
    if (alloc === 'None' || shipCost <= 0) {
      Utils.showToast('No customer shipping contribution applies to this order.', 'info');
      return;
    }

    const invoice = Store.query(Store.COLLECTIONS.INVOICES, i => i.orderId === orderId)[0];
    if (!invoice) {
      Utils.showToast('No invoice found for this order. Create one first.', 'error');
      return;
    }

    const already = (invoice.items || []).some(it => it.isShipping);
    if (already) {
      Utils.showToast('A shipping contribution line is already on this invoice.', 'info');
      return;
    }

    // Customer's share of the ex-GST shipping cost
    const share = alloc === 'Half'
      ? Math.round((shipCost / 2) * 100) / 100
      : shipCost; // Full

    App.showModal({
      title: 'Add Shipping to Invoice',
      content: `
        <form id="ship-inv-form" class="animate-fade-in-scale">
          <p class="text-sm text-muted mb-3">
            Order shipped for <strong>${Utils.formatCurrency(shipCost)}</strong> (ex-GST).
            Allocation: <strong>${alloc==='Half'?'50/50 split':'Customer pays full'}</strong>.
            The customer's share (+ 10% GST) is added to invoice <strong>${Utils.sanitizeHTML(invoice.invoiceNumber)}</strong>.
          </p>
          <div class="form-group">
            <label class="form-label">Customer Shipping Charge (AUD, ex-GST) <span class="required">*</span></label>
            <input type="number" name="shareAmount" class="form-input" min="0" step="0.01" required value="${share}">
            <div class="text-xs text-muted mt-1">Auto-calculated (ex-GST). 10% GST added on top. Edit if you agreed a different figure.</div>
          </div>
        </form>`,
      submitText: 'Add to Invoice',
      onSubmit: (modalEl) => {
        const form = Utils.$('#ship-inv-form', modalEl);
        if (!form.checkValidity()) { form.reportValidity(); return false; }
        const amount = parseFloat(new FormData(form).get('shareAmount')) || 0;
        if (amount <= 0) { Utils.showToast('Enter a charge greater than zero.', 'error'); return false; }

        // Shipping is ex-GST. Add 10% on top.
        const lineGst   = Math.round((amount * 0.10) * 100) / 100;
        const lineSub   = Math.round(amount * 100) / 100;
        const lineTotal = Math.round((amount + lineGst) * 100) / 100;

        const items = (invoice.items || []).slice();
        items.push({
          description: 'Shipping contribution',
          quantity: 1,
          unitPrice: lineSub,
          gst: lineGst,
          amount: lineTotal,
          isShipping: true
        });

        const newTotal = Math.round((invoice.total + lineTotal) * 100) / 100;
        const newGst   = Math.round((invoice.gstTotal + lineGst) * 100) / 100;
        const newSub   = Math.round((invoice.subtotal + lineSub) * 100) / 100;
        const paid     = (invoice.amountPaid != null && invoice.amountPaid !== '') ? invoice.amountPaid : 0;

        let newStatus = invoice.status;
        if (paid >= newTotal && newTotal > 0) newStatus = 'Paid';
        else if (paid > 0) newStatus = 'Partially Paid';
        else if (newStatus === 'Paid') newStatus = 'Partially Paid';

        Store.update(Store.COLLECTIONS.INVOICES, invoice.id, {
          items: items,
          subtotal: newSub,
          gstTotal: newGst,
          total: newTotal,
          status: newStatus
        });

        Utils.showToast(`Shipping of ${Utils.formatCurrency(lineTotal)} (inc GST) added to ${invoice.invoiceNumber}.`);
        App.closeModal();
        renderSubTab();
        return true;
      }
    });
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
    const clients = Store.getAll(Store.COLLECTIONS.CLIENTS);
    if (clients.length===0) {
      container.innerHTML = `<div class="card p-8 text-center text-muted">
        <div class="empty-state"><div class="empty-state-icon">👑</div>
        <div class="empty-state-title">No clients registered</div>
        <div class="empty-state-text">Add a client to track their bridal journey.</div></div></div>`;
      return;
    }
    container.innerHTML = `
      <div class="card p-6">
        <div class="form-group" style="max-width:320px">
          <label class="form-label">Select Client</label>
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
    orders.sort((a,b) => new Date(b.updatedAt||b.createdAt||0) - new Date(a.updatedAt||a.createdAt||0));

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

    const statusMap = { 'New':1,'In Design':2,'Fabric Sourced':3,'In Production':4,'Fitting':5,'Ready':6,'Shipped to Shashank':7,'At Shashank':8,'In Transit':9,'Awaiting Payment':9,'Cleared for Delivery':9,'Received in Australia':10,'Final Fitting':11,'Delivered':12 };
    const currentStage = orders.length>0 ? (statusMap[orders[0].status]||0) : 0;

    wrapper.innerHTML = `
      <div class="d-flex items-center justify-between mb-6" style="border-bottom:1px solid var(--pc-border);padding-bottom:var(--sp-4)">
        <div>
          <h3 class="font-display text-md text-gold">${Utils.sanitizeHTML(client.name)} — Journey</h3>
          <p class="text-xs text-muted mt-1">${orders.length} garment${orders.length!==1?'s':''} tracked${(()=>{ if(!orders.length||!orders[0].projectId) return ''; const p=Store.getById(Store.COLLECTIONS.ORDER_PROJECTS,orders[0].projectId); return p?' · 📁 '+Utils.sanitizeHTML(p.projectName):''; })()}</p>
        </div>
        <div class="d-flex items-center gap-3">
          <div class="text-right">
            <span class="text-xs text-muted">Progress</span>
            <div class="text-sm font-semibold text-gold font-mono">${Math.round(currentStage/12*100)}%</div>
          </div>
          <div style="width:120px">
            <div class="progress-bar"><div class="progress-bar-fill" style="width:${currentStage/12*100}%"></div></div>
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
      ${orders.length > 1 ? (() => {
        const rows = orders.map(o => { const pct = Math.round((statusMap[o.status]||0)/12*100); return '<div class="d-flex justify-between items-center p-2 rounded-md text-xs mb-1" style="background:rgba(255,255,255,0.02);border:1px solid var(--pc-border)"><div><div class="font-semibold">'+Utils.sanitizeHTML(o.title)+'</div>'+(o.orderCode?'<div class="font-mono text-xs" style="color:#a78bfa">'+Utils.sanitizeHTML(o.orderCode)+'</div>':'')+'</div><div class="text-right"><span class="badge badge-gold text-xs">'+o.status+'</span><div class="text-xs text-muted mt-1">'+pct+'%</div></div></div>'; }).join('');
        return '<div class="mt-4" style="border-top:1px solid var(--pc-border);padding-top:16px"><div class="text-xs font-semibold text-gold mb-2">Individual Garments</div>'+rows+'</div>';
      })() : ''}
    `;
  }

// ==========================================
  // CRM TAB (formerly Sales — now a proper CRM dashboard)
  // ==========================================

  function renderSales(container, actions) {
    const allOrders   = Store.getAll(Store.COLLECTIONS.ORDERS);
    const allClients  = Store.getAll(Store.COLLECTIONS.CLIENTS);
    const invoices    = Store.getAll(Store.COLLECTIONS.INVOICES);
    const appointments = Store.getAll(Store.COLLECTIONS.APPOINTMENTS);
    const now = new Date();

    // ── Revenue metrics ──
    const paidInvoices    = invoices.filter(i => i.status === 'Paid');
    const totalRevenue    = paidInvoices.reduce((s, i) => s + (i.total || 0), 0);
    const outstanding     = invoices.filter(i => ['Partially Paid','Sent','Draft'].includes(i.status));
    const outstandingAmt  = outstanding.reduce((s, i) => {
      const p = (i.amountPaid != null && i.amountPaid !== '') ? parseFloat(i.amountPaid) : 0;
      return s + Math.max(0, (i.total || 0) - p);
    }, 0);

    // ── Order metrics ──
    const deliveredOrders = allOrders.filter(o => o.status === 'Delivered');
    const activeOrders    = allOrders.filter(o => o.status !== 'Delivered');
    const avgOrderValue   = deliveredOrders.length > 0
      ? Math.round((deliveredOrders.reduce((s, o) => s + (o.price || 0), 0) / deliveredOrders.length) * 100) / 100 : 0;

    // ── Fulfillment time (consultation/created → delivered) ──
    const fulfilledWithDates = deliveredOrders.filter(o => o.createdAt && o.updatedAt);
    const avgFulfillDays = fulfilledWithDates.length > 0
      ? Math.round(fulfilledWithDates.reduce((s, o) => {
          return s + (new Date(o.updatedAt) - new Date(o.createdAt)) / (1000 * 60 * 60 * 24);
        }, 0) / fulfilledWithDates.length) : 0;

    // ── Conversion rate (orders → delivered) ──
    const conversionRate = allOrders.length > 0
      ? Math.round((deliveredOrders.length / allOrders.length) * 100) : 0;

    // ── Repeat clients ──
    const clientOrderCount = {};
    allOrders.forEach(o => { clientOrderCount[o.clientId] = (clientOrderCount[o.clientId] || 0) + 1; });
    const repeatClients = Object.values(clientOrderCount).filter(c => c > 1).length;
    const repeatRate = allClients.length > 0 ? Math.round((repeatClients / allClients.length) * 100) : 0;

    // ── Client lifetime value ──
    const clientSpend = {};
    allOrders.forEach(o => {
      if (!clientSpend[o.clientId]) clientSpend[o.clientId] = { name: o.clientName, spend: 0, orders: 0 };
      clientSpend[o.clientId].spend  += (o.price || 0);
      clientSpend[o.clientId].orders += 1;
    });
    const topClients = Object.entries(clientSpend)
      .sort((a, b) => b[1].spend - a[1].spend).slice(0, 5);
    const avgCLTV = Object.keys(clientSpend).length > 0
      ? Math.round(Object.values(clientSpend).reduce((s, c) => s + c.spend, 0) / Object.keys(clientSpend).length) : 0;

    // ── Revenue by product type ──
    const revenueByType = {};
    allOrders.forEach(o => {
      const t = o.productType || 'GEN';
      if (!revenueByType[t]) revenueByType[t] = { revenue: 0, count: 0 };
      revenueByType[t].revenue += (o.price || 0);
      revenueByType[t].count  += 1;
    });

    // ── Revenue by month (last 6 months) ──
    const monthRevenue = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.toLocaleString('en-AU', { month: 'short', year: '2-digit' });
      monthRevenue[key] = 0;
    }
    paidInvoices.forEach(inv => {
      if (!inv.issueDate) return;
      const d = new Date(inv.issueDate);
      const key = d.toLocaleString('en-AU', { month: 'short', year: '2-digit' });
      if (key in monthRevenue) monthRevenue[key] += (inv.total || 0);
    });
    const maxMonthRev = Math.max(...Object.values(monthRevenue), 1);

    // ── Pipeline health ──
    const inWorkshop  = allOrders.filter(o => ['New','In Design','Fabric Sourced','In Production','Fitting'].includes(o.status)).length;
    const inTransit   = allOrders.filter(o => ['Ready','Shipped to Shashank','At Shashank','In Transit'].includes(o.status)).length;
    const awaitingAct = allOrders.filter(o => ['Awaiting Payment','Received in Australia','Final Fitting','Cleared for Delivery'].includes(o.status)).length;

    // ── Upcoming + overdue ──
    const in30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const upcoming = allOrders.filter(o => o.status !== 'Delivered' && o.deadline && new Date(o.deadline) <= in30 && new Date(o.deadline) >= now)
      .sort((a, b) => new Date(a.deadline) - new Date(b.deadline)).slice(0, 5);
    const overdue = allOrders.filter(o => o.status !== 'Delivered' && o.deadline && new Date(o.deadline) < now)
      .sort((a, b) => new Date(a.deadline) - new Date(b.deadline));

    const typeLabels = { BLS: 'Bridal Lehenga', SAR: 'Saree', SAL: 'Salwar Suit', SHE: 'Sherwani', BSN: 'Bridal Sneakers', GEN: 'Other' };

    container.innerHTML = `
      <!-- KPI Strip — single scrollable row, label on top -->
      <div style="overflow-x:auto;margin-bottom:20px;" class="animate-fade-in">
        <div style="display:flex;gap:10px;padding-bottom:6px;min-width:max-content;">
          <div style="display:flex;flex-direction:column;align-items:flex-start;background:var(--pc-card-bg);border:1px solid var(--pc-border);border-radius:10px;padding:10px 14px;min-width:110px;gap:4px;"><div style="font-size:10px;font-weight:700;color:var(--pc-text-muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:2px;">Revenue</div><div style="font-size:11px;margin-bottom:2px;">💰</div><div style="font-size:18px;font-weight:800;color:var(--pc-text);line-height:1.1;">${Utils.formatCurrency(totalRevenue)}</div></div>
          <div style="display:flex;flex-direction:column;align-items:flex-start;background:var(--pc-card-bg);border:1px solid var(--pc-border);border-radius:10px;padding:10px 14px;min-width:110px;gap:4px;"><div style="font-size:10px;font-weight:700;color:var(--pc-text-muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:2px;">Outstanding</div><div style="font-size:11px;margin-bottom:2px;">⏳</div><div style="font-size:18px;font-weight:800;color:var(--pc-text);line-height:1.1;">${Utils.formatCurrency(outstandingAmt)}</div></div>
          <div style="display:flex;flex-direction:column;align-items:flex-start;background:var(--pc-card-bg);border:1px solid var(--pc-border);border-radius:10px;padding:10px 14px;min-width:110px;gap:4px;"><div style="font-size:10px;font-weight:700;color:var(--pc-text-muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:2px;">Avg Order Value</div><div style="font-size:11px;margin-bottom:2px;">📊</div><div style="font-size:18px;font-weight:800;color:var(--pc-text);line-height:1.1;">${Utils.formatCurrency(avgOrderValue)}</div></div>
          <div style="display:flex;flex-direction:column;align-items:flex-start;background:var(--pc-card-bg);border:1px solid var(--pc-border);border-radius:10px;padding:10px 14px;min-width:110px;gap:4px;"><div style="font-size:10px;font-weight:700;color:var(--pc-text-muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:2px;">Avg LTV</div><div style="font-size:11px;margin-bottom:2px;">👑</div><div style="font-size:18px;font-weight:800;color:var(--pc-text);line-height:1.1;">${Utils.formatCurrency(avgCLTV)}</div></div>
          <div style="display:flex;flex-direction:column;align-items:flex-start;background:var(--pc-card-bg);border:1px solid var(--pc-border);border-radius:10px;padding:10px 14px;min-width:110px;gap:4px;"><div style="font-size:10px;font-weight:700;color:var(--pc-text-muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:2px;">Delivered</div><div style="font-size:11px;margin-bottom:2px;">📦</div><div style="font-size:18px;font-weight:800;color:var(--pc-text);line-height:1.1;">${deliveredOrders.length} / ${allOrders.length}</div></div>
          <div style="display:flex;flex-direction:column;align-items:flex-start;background:var(--pc-card-bg);border:1px solid var(--pc-border);border-radius:10px;padding:10px 14px;min-width:110px;gap:4px;"><div style="font-size:10px;font-weight:700;color:var(--pc-text-muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:2px;">Completion</div><div style="font-size:11px;margin-bottom:2px;">🎯</div><div style="font-size:18px;font-weight:800;color:var(--pc-text);line-height:1.1;">${conversionRate}%</div></div>
          <div style="display:flex;flex-direction:column;align-items:flex-start;background:var(--pc-card-bg);border:1px solid var(--pc-border);border-radius:10px;padding:10px 14px;min-width:110px;gap:4px;"><div style="font-size:10px;font-weight:700;color:var(--pc-text-muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:2px;">Avg Fulfillment</div><div style="font-size:11px;margin-bottom:2px;">📅</div><div style="font-size:18px;font-weight:800;color:var(--pc-text);line-height:1.1;">${avgFulfillDays > 0 ? avgFulfillDays + \'d\' : \'—\'}</div></div>
          <div style="display:flex;flex-direction:column;align-items:flex-start;background:var(--pc-card-bg);border:1px solid var(--pc-border);border-radius:10px;padding:10px 14px;min-width:110px;gap:4px;"><div style="font-size:10px;font-weight:700;color:var(--pc-text-muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:2px;">Overdue</div><div style="font-size:11px;margin-bottom:2px;">⚠️</div><div style="font-size:18px;font-weight:800;color:var(--pc-text);line-height:1.1;">${overdue.length}</div></div>
          <div style="display:flex;flex-direction:column;align-items:flex-start;background:var(--pc-card-bg);border:1px solid var(--pc-border);border-radius:10px;padding:10px 14px;min-width:110px;gap:4px;"><div style="font-size:10px;font-weight:700;color:var(--pc-text-muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:2px;">Total Clients</div><div style="font-size:11px;margin-bottom:2px;">👥</div><div style="font-size:18px;font-weight:800;color:var(--pc-text);line-height:1.1;">${allClients.length}</div></div>
          <div style="display:flex;flex-direction:column;align-items:flex-start;background:var(--pc-card-bg);border:1px solid var(--pc-border);border-radius:10px;padding:10px 14px;min-width:110px;gap:4px;"><div style="font-size:10px;font-weight:700;color:var(--pc-text-muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:2px;">Repeat Rate</div><div style="font-size:11px;margin-bottom:2px;">🔁</div><div style="font-size:18px;font-weight:800;color:var(--pc-text);line-height:1.1;">${repeatRate}%</div></div>
          <div style="display:flex;flex-direction:column;align-items:flex-start;background:var(--pc-card-bg);border:1px solid var(--pc-border);border-radius:10px;padding:10px 14px;min-width:110px;gap:4px;"><div style="font-size:10px;font-weight:700;color:var(--pc-text-muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:2px;">Brides</div><div style="font-size:11px;margin-bottom:2px;">💍</div><div style="font-size:18px;font-weight:800;color:var(--pc-text);line-height:1.1;">${allClients.filter(c => c.type === \'Bride\').length}</div></div>
          <div style="display:flex;flex-direction:column;align-items:flex-start;background:var(--pc-card-bg);border:1px solid var(--pc-border);border-radius:10px;padding:10px 14px;min-width:110px;gap:4px;"><div style="font-size:10px;font-weight:700;color:var(--pc-text-muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:2px;">Appointments</div><div style="font-size:11px;margin-bottom:2px;">📋</div><div style="font-size:18px;font-weight:800;color:var(--pc-text);line-height:1.1;">${appointments.length}</div></div>
        </div>
      </div>

            <!-- Pipeline Health -->
      <div class="card p-4 mb-4 animate-fade-in stagger-3">
        <div class="card-title mb-3">📋 Pipeline Health</div>
        <div class="d-grid gap-3" style="grid-template-columns:repeat(auto-fit,minmax(130px,1fr))">
          <div class="p-3 rounded-md text-center" style="background:rgba(139,92,246,0.08);border:1px solid var(--pc-border)">
            <div class="text-lg font-bold" style="color:#a78bfa">${inWorkshop}</div>
            <div class="text-xs text-muted mt-1">In Workshop</div>
          </div>
          <div class="p-3 rounded-md text-center" style="background:rgba(59,130,246,0.08);border:1px solid var(--pc-border)">
            <div class="text-lg font-bold" style="color:#60a5fa">${inTransit}</div>
            <div class="text-xs text-muted mt-1">In Transit / Ready</div>
          </div>
          <div class="p-3 rounded-md text-center" style="background:rgba(236,182,118,0.08);border:1px solid var(--pc-border)">
            <div class="text-lg font-bold text-gold">${awaitingAct}</div>
            <div class="text-xs text-muted mt-1">Awaiting Action</div>
          </div>
          <div class="p-3 rounded-md text-center" style="background:rgba(16,185,129,0.08);border:1px solid var(--pc-border)">
            <div class="text-lg font-bold text-success">${deliveredOrders.length}</div>
            <div class="text-xs text-muted mt-1">Delivered</div>
          </div>
          ${overdue.length > 0 ? `
          <div class="p-3 rounded-md text-center" style="background:rgba(220,38,38,0.08);border:1px solid var(--pc-danger)">
            <div class="text-lg font-bold text-danger">${overdue.length}</div>
            <div class="text-xs text-muted mt-1">Overdue</div>
          </div>` : ''}
        </div>
      </div>

      <!-- Revenue trend + Product type -->
      <div class="d-grid gap-4 mb-4 animate-fade-in stagger-3" style="grid-template-columns:1fr 1fr">

        <!-- Revenue by month bar chart -->
        <div class="card p-5">
          <div class="card-title mb-4">📈 Revenue — Last 6 Months</div>
          <div class="d-flex flex-col gap-2">
            ${Object.entries(monthRevenue).map(([month, rev]) => {
              const pct = Math.round((rev / maxMonthRev) * 100);
              return '<div class="d-flex items-center gap-2">' +
                '<div class="text-xs text-muted font-mono" style="width:48px;flex-shrink:0">' + month + '</div>' +
                '<div style="flex:1;background:rgba(255,255,255,0.05);border-radius:4px;height:18px;overflow:hidden">' +
                  '<div style="height:100%;width:' + pct + '%;background:linear-gradient(90deg,var(--pc-gold),#f59e0b);border-radius:4px;transition:width .3s"></div>' +
                '</div>' +
                '<div class="font-mono text-xs" style="width:72px;text-align:right;flex-shrink:0">' + Utils.formatCurrency(rev) + '</div>' +
              '</div>';
            }).join('')}
          </div>
        </div>

        <!-- Revenue by product type -->
        <div class="card p-5">
          <div class="card-title mb-4">🧵 Revenue by Garment Type</div>
          ${Object.keys(revenueByType).length === 0 ? '<div class="text-xs text-muted text-center p-4">No orders yet.</div>' :
            Object.entries(revenueByType).sort((a, b) => b[1].revenue - a[1].revenue).map(([type, data]) => {
              const totalRev2 = Object.values(revenueByType).reduce((s, d) => s + d.revenue, 0) || 1;
              const pct = Math.round((data.revenue / totalRev2) * 100);
              return '<div class="mb-3">' +
                '<div class="d-flex justify-between text-xs mb-1">' +
                  '<span class="font-semibold">' + (typeLabels[type] || type) + '</span>' +
                  '<span class="text-muted">' + data.count + ' orders · ' + Utils.formatCurrency(data.revenue) + ' (' + pct + '%)</span>' +
                '</div>' +
                '<div class="progress-bar"><div class="progress-bar-fill" style="width:' + pct + '%"></div></div>' +
              '</div>';
            }).join('')}
        </div>
      </div>

      <!-- Top clients + upcoming deadlines -->
      <div class="d-grid gap-4 mb-4 animate-fade-in stagger-4" style="grid-template-columns:1fr 1fr">

        <!-- Top clients -->
        <div class="card p-5">
          <div class="card-title mb-4">🏆 Top Clients by Lifetime Value</div>
          ${topClients.length === 0 ? '<div class="text-xs text-muted text-center p-4">No orders yet.</div>' :
            topClients.map(([clientId, data], idx) =>
              '<div class="d-flex justify-between items-center p-2 rounded-md mb-2" style="background:rgba(255,255,255,0.02);border:1px solid var(--pc-border)">' +
                '<div class="d-flex items-center gap-2">' +
                  '<span class="font-mono text-xs text-muted">#' + (idx+1) + '</span>' +
                  '<div class="avatar avatar-sm" style="background:' + Utils.getAvatarColor(data.name) + ';color:var(--pc-text-inverse);width:26px;height:26px;font-size:10px">' + Utils.getInitials(data.name) + '</div>' +
                  '<div>' +
                    '<div class="text-sm font-semibold">' + Utils.sanitizeHTML(data.name) + '</div>' +
                    '<div class="text-xs text-muted">' + data.orders + ' order' + (data.orders !== 1 ? 's' : '') + '</div>' +
                  '</div>' +
                '</div>' +
                '<span class="font-mono text-sm font-bold text-gold">' + Utils.formatCurrency(data.spend) + '</span>' +
              '</div>'
            ).join('')}
        </div>

        <!-- Upcoming deadlines -->
        <div class="card p-0">
          <div class="card-header"><div class="card-title">📅 Deadlines — Next 30 Days</div></div>
          ${upcoming.length === 0 ?
            '<div class="p-6 text-center text-muted text-xs">No deadlines in the next 30 days. ✅</div>' :
            '<div class="table-container" style="border:none"><table class="data-table"><thead><tr><th>Order</th><th>Client</th><th>Stage</th><th>Due</th></tr></thead><tbody>' +
            upcoming.map(o => {
              const days = Utils.daysFromNow(o.deadline);
              const cls  = days <= 3 ? 'text-danger font-semibold' : days <= 7 ? 'text-warning' : 'text-muted';
              return '<tr>' +
                '<td class="font-medium">' + Utils.sanitizeHTML(o.orderCode || o.title) + '</td>' +
                '<td class="text-xs">' + Utils.sanitizeHTML(o.clientName) + '</td>' +
                '<td><span class="badge badge-gold text-xs">' + o.status + '</span></td>' +
                '<td class="font-mono text-xs ' + cls + '">' + Utils.formatDate(o.deadline) + ' (' + days + 'd)</td>' +
              '</tr>';
            }).join('') +
            '</tbody></table></div>'}
        </div>
      </div>

      <!-- Overdue orders (full width if any) -->
      ${overdue.length > 0 ? `
      <div class="card p-0 animate-fade-in stagger-4" style="border-color:var(--pc-danger)">
        <div class="card-header" style="background:rgba(220,38,38,0.06)">
          <div class="card-title text-danger">⚠️ Overdue Orders (${overdue.length})</div>
        </div>
        <div class="table-container" style="border:none">
          <table class="data-table">
            <thead><tr><th>Order</th><th>Client</th><th>Stage</th><th>Overdue By</th><th>Balance</th></tr></thead>
            <tbody>
              ${overdue.map(o => {
                const days = Math.abs(Utils.daysFromNow(o.deadline));
                const inv  = o.projectId
                  ? Store.query(Store.COLLECTIONS.INVOICES, i => i.projectId === o.projectId)[0]
                  : Store.query(Store.COLLECTIONS.INVOICES, i => i.orderId === o.id)[0];
                const bal  = inv ? Math.max(0, (inv.total || 0) - ((inv.amountPaid != null && inv.amountPaid !== '') ? parseFloat(inv.amountPaid) : 0)) : 0;
                return '<tr>' +
                  '<td class="font-medium">' + Utils.sanitizeHTML(o.orderCode || o.title) + '</td>' +
                  '<td class="text-xs">' + Utils.sanitizeHTML(o.clientName) + '</td>' +
                  '<td><span class="badge badge-gold text-xs">' + o.status + '</span></td>' +
                  '<td class="font-mono text-xs text-danger font-semibold">' + days + ' day' + (days !== 1 ? 's' : '') + '</td>' +
                  '<td class="font-mono text-xs ' + (bal > 0 ? 'text-danger' : 'text-success') + '">' + Utils.formatCurrency(bal) + '</td>' +
                '</tr>';
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>` : ''}
    `;
  }


  // ── STAGE 3: Pooja records payment → Cleared for Delivery ──
  function recordPaymentAndClear(orderId) {
    const o = Store.getById(Store.COLLECTIONS.ORDERS, orderId);
    if (!o) return;
    const invoice = Store.query(Store.COLLECTIONS.INVOICES, i => i.orderId === orderId)[0];
    if (!invoice) {
      Utils.showToast('No invoice found for this order.', 'error');
      return;
    }
    const paid  = (invoice.amountPaid != null && invoice.amountPaid !== '') ? invoice.amountPaid : 0;
    const balance = Math.round((invoice.total - paid) * 100) / 100;

    App.showModal({
      title: '💳 Record Payment — ' + (o.orderCode || o.id),
      content: `
        <form id="pay-clear-form" class="animate-fade-in-scale">
          <div class="p-3 rounded-md mb-4" style="background:rgba(0,0,0,0.2);border:1px solid var(--pc-border)">
            <div class="d-flex justify-between text-sm mb-1">
              <span class="text-muted">Invoice total:</span>
              <span class="font-mono font-bold">${Utils.formatCurrency(invoice.total)}</span>
            </div>
            <div class="d-flex justify-between text-sm mb-1">
              <span class="text-muted">Already paid:</span>
              <span class="font-mono text-success">${Utils.formatCurrency(paid)}</span>
            </div>
            <div class="d-flex justify-between text-sm font-bold" style="border-top:1px solid var(--pc-border);padding-top:8px;margin-top:8px;">
              <span>Balance due:</span>
              <span class="font-mono text-danger">${Utils.formatCurrency(balance)}</span>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Payment Amount Received (AUD) <span class="required">*</span></label>
            <input type="number" name="paymentAmount" class="form-input" min="0" step="0.01"
              value="${balance}" required>
            <div class="text-xs text-muted mt-1">Pre-filled with balance due. Edit if partial payment received.</div>
          </div>
          <div class="form-group m-0">
            <label class="form-label">Payment Method</label>
            <select name="paymentMethod" class="form-select">
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="Cash">Cash</option>
              <option value="Card">Card</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </form>`,
      submitText: '✓ Confirm Payment & Clear for Delivery',
      onSubmit: async (modalEl) => {
        const form = Utils.$('#pay-clear-form', modalEl);
        if (!form.checkValidity()) { form.reportValidity(); return false; }
        const fd = new FormData(form);
        const amount = parseFloat(fd.get('paymentAmount')) || 0;
        if (amount <= 0) { Utils.showToast('Enter a payment amount.', 'error'); return false; }

        const newPaid   = Math.round((paid + amount) * 100) / 100;
        const newBalance = Math.round((invoice.total - newPaid) * 100) / 100;
        const newStatus  = newBalance <= 0 ? 'Paid' : 'Partially Paid';

        // Update invoice
        await Store.update(Store.COLLECTIONS.INVOICES, invoice.id, {
          amountPaid: newPaid,
          status: newStatus,
          notes: (invoice.notes || '') + `
Payment of ${Utils.formatCurrency(amount)} via ${fd.get('paymentMethod')} recorded ${new Date().toLocaleDateString('en-AU')}.`
        });

        // Move order to Cleared for Delivery
        await Store.update(Store.COLLECTIONS.ORDERS, orderId, {
          status: 'Cleared for Delivery',
          clearedForDeliveryDate: new Date().toISOString()
        });

        Utils.showToast(`Payment recorded. Order cleared for delivery.`, 'success');
        App.closeModal();
        renderSubTab();
        return true;
      }
    });
  }

  // ── STAGE 4: Pooja marks parcel received in Australia ────
  // Auto-adds shipping to invoice if applicable, then checks balance
  async function markReceivedInAustralia(orderId) {
    const o = Store.getById(Store.COLLECTIONS.ORDERS, orderId);
    if (!o) return;

    // Step 1: Auto-add shipping contribution to invoice if not already done
    if (o.shippingCost && o.shippingAllocation && o.shippingAllocation !== 'None') {
      const invoice = o.projectId
        ? Store.query(Store.COLLECTIONS.INVOICES, i => i.projectId === o.projectId)[0]
        : Store.query(Store.COLLECTIONS.INVOICES, i => i.orderId === orderId)[0];
      if (invoice) {
        const already = (invoice.items || []).some(it => it.isShipping);
        if (!already) {
          const shipCost = parseFloat(o.shippingCost) || 0;
          const share    = o.shippingAllocation === 'Half'
            ? Math.round((shipCost / 2) * 100) / 100
            : shipCost;
          const lineGst   = Math.round((share * 0.10) * 100) / 100;
          const lineSub   = Math.round(share * 100) / 100;
          const lineTotal = Math.round((share + lineGst) * 100) / 100;

          const items    = (invoice.items || []).slice();
          items.push({
            description: 'Shipping contribution',
            quantity: 1, unitPrice: lineSub, gst: lineGst, amount: lineTotal, isShipping: true
          });

          const newTotal = Math.round((invoice.total + lineTotal) * 100) / 100;
          const newGst   = Math.round((invoice.gstTotal + lineGst) * 100) / 100;
          const newSub   = Math.round((invoice.subtotal + lineSub) * 100) / 100;
          const paidSoFar = (invoice.amountPaid != null && invoice.amountPaid !== '') ? invoice.amountPaid : 0;
          let newInvStatus = invoice.status;
          if (paidSoFar >= newTotal && newTotal > 0) newInvStatus = 'Paid';
          else if (paidSoFar > 0) newInvStatus = 'Partially Paid';
          else if (newInvStatus === 'Paid') newInvStatus = 'Partially Paid';

          await Store.update(Store.COLLECTIONS.INVOICES, invoice.id, {
            items, subtotal: newSub, gstTotal: newGst, total: newTotal, status: newInvStatus
          });
          Utils.showToast(`Shipping ${Utils.formatCurrency(lineTotal)} (inc GST) auto-added to invoice.`, 'info');
        }
      }
    }

    // Step 2: Refresh invoice after possible update, check balance
    const updatedInvoice = o.projectId
      ? Store.query(Store.COLLECTIONS.INVOICES, i => i.projectId === o.projectId)[0]
      : Store.query(Store.COLLECTIONS.INVOICES, i => i.orderId === orderId)[0];
    const paid    = updatedInvoice ? ((updatedInvoice.amountPaid != null && updatedInvoice.amountPaid !== '') ? updatedInvoice.amountPaid : 0) : 0;
    const balance = updatedInvoice ? Math.round((updatedInvoice.total - paid) * 100) / 100 : 0;

    if (balance > 0) {
      // Warn Pooja — she can override
      App.showConfirm({
        title: '⚠️ Outstanding Balance',
        text: `This order has a balance of ${Utils.formatCurrency(balance)} owing. Mark as Received in Australia anyway? You can collect payment before final delivery.`,
        confirmText: 'Yes, Mark Received',
        onConfirm: async () => {
          await Store.update(Store.COLLECTIONS.ORDERS, orderId, {
            status: 'Received in Australia',
            receivedInAustraliaDate: new Date().toISOString()
          });
          Utils.showToast('Marked Received in Australia. Collect payment then proceed to Final Fitting.');
          renderSubTab();
        }
      });
      return;
    }

    // Balance zero — mark received and move straight to Final Fitting
    await Store.update(Store.COLLECTIONS.ORDERS, orderId, {
      status: 'Final Fitting',
      receivedInAustraliaDate: new Date().toISOString()
    });
    Utils.showToast('Marked Received in Australia — ready for Final Fitting.');
    renderSubTab();
  }

  // ── Mark Final Fitting — moves from Received in Australia to Final Fitting ──
  function markFinalFitting(orderId) {
    Store.update(Store.COLLECTIONS.ORDERS, orderId, {
      status: 'Final Fitting',
      finalFittingDate: new Date().toISOString()
    });
    Utils.showToast('Final Fitting started.');
    renderSubTab();
  }

  // ── STAGE 4: Pooja confirms delivery (Route A final step) ─
  function markReadyToDeliver(orderId) {
    const o = Store.getById(Store.COLLECTIONS.ORDERS, orderId);
    if (!o) return;
    const invoice = _getOrderInvoice(o);
    const paid    = invoice ? ((invoice.amountPaid != null && invoice.amountPaid !== '') ? parseFloat(invoice.amountPaid) : 0) : 0;
    const balance = invoice ? Math.round((invoice.total - paid) * 100) / 100 : 0;

    // ── M3 HARD GATE: block delivery until M3 is paid ──
    if (invoice && invoice.milestones) {
      const m3 = _getM3Amount(invoice);
      if (m3 && !_milestoneIsPaid(m3)) {
        App.showModal({
          title: '🔒 Final Payment Required',
          content: `
            <div class="d-flex flex-col gap-4">
              <div class="p-3 rounded-md" style="background:rgba(220,38,38,0.08);border:1px solid var(--pc-danger)">
                <div class="text-sm font-semibold text-danger mb-1">⛔ Final Payment Not Received</div>
                <div class="text-xs text-muted">Milestone 3 (30% — Before Delivery) of <strong>${Utils.formatCurrency(m3.amount)}</strong> must be paid before the garment can be handed over.</div>
              </div>
              <div class="text-xs text-muted">Record the M3 payment from the project invoice, then confirm delivery.</div>
            </div>`,
          submitText: 'OK',
          hideCancel: true,
          onSubmit: () => true
        });
        return;
      }
    }

    if (balance > 0) {
      App.showModal({
        title: '🚚 Confirm Delivery — ' + (o.orderCode || o.id),
        content: `
          <div class="d-flex flex-col gap-4">
            <div class="p-3 rounded-md" style="background:rgba(220,38,38,0.08);border:1px solid var(--pc-danger)">
              <div class="text-sm font-semibold text-danger mb-1">⚠️ Outstanding Balance</div>
              <div class="text-xs text-muted">Balance of <strong>${Utils.formatCurrency(balance)}</strong> is still owing. Record payment before marking delivered, or override.</div>
            </div>
            <div class="form-group m-0">
              <label class="form-label">Payment Amount Received (AUD)</label>
              <input type="number" id="route-a-payment" class="form-input" min="0" step="0.01" value="${balance}" placeholder="0.00">
              <div class="text-xs text-muted mt-1">Leave as 0 to skip payment recording and deliver anyway.</div>
            </div>
          </div>`,
        submitText: '✓ Mark Delivered',
        onSubmit: async (modalEl) => {
          const amount = parseFloat(Utils.$('#route-a-payment', modalEl).value) || 0;
          if (amount > 0 && invoice) {
            const newPaid = Math.round((paid + amount) * 100) / 100;
            const newBal  = Math.round((invoice.total - newPaid) * 100) / 100;
            await Store.update(Store.COLLECTIONS.INVOICES, invoice.id, {
              amountPaid: newPaid,
              status: newBal <= 0 ? 'Paid' : 'Partially Paid'
            });
          }
          await Store.update(Store.COLLECTIONS.ORDERS, orderId, { status: 'Delivered' });
          Utils.showToast('Order delivered.');
          App.closeModal();
          renderSubTab();
          return true;
        }
      });
      return;
    }

    // Balance zero — straight to Delivered
    App.showConfirm({
      title: 'Mark as Delivered',
      text: `Confirm delivery of order ${o.orderCode || o.id} to ${o.clientName}?`,
      confirmText: 'Confirm Delivered',
      onConfirm: async () => {
        await Store.update(Store.COLLECTIONS.ORDERS, orderId, { status: 'Delivered' });
        Utils.showToast('Order delivered.');
        renderSubTab();
      }
    });
  }

  // ============================================================
  // PROJECTS
  // ============================================================

  function generateProjectCode() {
    const projects = Store.getAll(Store.COLLECTIONS.ORDER_PROJECTS);
    const max = projects.reduce((m, p) => {
      if (p.projectCode && p.projectCode.startsWith('PROJ-')) {
        const n = parseInt(p.projectCode.slice(5), 10);
        return isNaN(n) ? m : Math.max(m, n);
      }
      return m;
    }, 0);
    return 'PROJ-' + String(max + 1).padStart(4, '0');
  }

  function renderProjects(container, actions) {
    actions.innerHTML = `<button class="btn btn-primary" id="btn-add-project">+ New Project</button>`;
    Utils.$('#btn-add-project').addEventListener('click', () => showProjectModal());

    const allProjects = Store.getAll(Store.COLLECTIONS.ORDER_PROJECTS);
    const allOrders   = Store.getAll(Store.COLLECTIONS.ORDERS);

    container.innerHTML = `
      <div class="card p-4 mb-4">
        <div class="filter-bar m-0">
          <div class="filter-search">
            <span class="filter-search-icon">🔍</span>
            <input type="text" id="project-search" class="form-input" placeholder="Search project or client...">
          </div>
          <select id="project-filter-status" class="form-select">
            <option value="all">All</option>
            <option value="Active">Active</option>
            <option value="On Hold">On Hold</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
          </select>
          <div class="text-muted text-sm font-mono" id="project-count"></div>
        </div>
      </div>
      <div id="projects-list"></div>
    `;

    const renderList = () => {
      const q = (Utils.$('#project-search').value||'').toLowerCase();
      const s = Utils.$('#project-filter-status').value;
      const projects = allProjects.filter(p =>
        (s==='all'||p.status===s) &&
        (!q||(p.projectName||'').toLowerCase().includes(q)||(p.clientName||'').toLowerCase().includes(q))
      );
      Utils.$('#project-count').textContent = projects.length + ' of ' + allProjects.length;

      // Build HTML using string concatenation to avoid nested template literal browser issues
      let projHTML = '<div class="d-flex flex-col gap-4">';
      if (projects.length === 0) {
        projHTML += '<div class="card p-8 text-center text-muted"><div class="empty-state">' +
          '<div class="empty-state-icon">📁</div>' +
          '<div class="empty-state-title">No projects yet</div>' +
          '<div class="empty-state-text">Create a project to group multiple garment orders under one client event.</div>' +
          '</div></div>';
      } else {
        projects.slice().sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)).forEach(proj => {
          const subOrders = allOrders.filter(o => o.projectId === proj.id);
          const invoice = Store.query(Store.COLLECTIONS.INVOICES, i => i.projectId === proj.id)[0];
          const paid = invoice ? ((invoice.amountPaid != null && invoice.amountPaid !== '') ? parseFloat(invoice.amountPaid) : 0) : 0;
          const balance = invoice ? Math.round((invoice.total - paid) * 100) / 100 : 0;
          const invoiceBtn = !invoice
            ? '<button class="btn btn-primary btn-sm" onclick="CRM.createProjectInvoice(\' + proj.id + \')">🧾 Create Invoice</button>'
            : '<button class="btn btn-secondary btn-sm" onclick="CRM.updateProjectInvoice(\' + proj.id + \')">🔄 Update Invoice</button>';
          const balanceDiv = invoice
            ? '<div class="text-xs ' + (balance > 0 ? 'text-danger' : 'text-success') + '">Balance: ' + Utils.formatCurrency(balance) + '</div>'
            : '<div class="text-xs text-muted">No invoice yet</div>';

          let subOrdersHTML = '';
          if (subOrders.length === 0) {
            subOrdersHTML = '<div class="text-xs text-muted">No garments added yet. Click "+ Add Garment" to add sub-orders.</div>';
          } else {
            let rows = '';
            subOrders.forEach(o => {
              rows += '<tr>' +
                '<td class="font-mono text-gold">' + Utils.sanitizeHTML(o.orderCode || '—') + '</td>' +
                '<td class="font-medium">' + Utils.sanitizeHTML(o.title) + '</td>' +
                '<td class="font-mono">' + Utils.formatCurrency(o.price) + '</td>' +
                '<td><span class="badge badge-gold text-xs">' + o.status + '</span></td>' +
                '<td>' + Utils.formatDate(o.deadline) + '</td>' +
                '</tr>';
            });
            subOrdersHTML = '<div class="table-container" style="border:none;margin:0">' +
              '<table class="data-table text-xs"><thead><tr>' +
              '<th>Code</th><th>Garment</th><th>Price</th><th>Status</th><th>Deadline</th>' +
              '</tr></thead><tbody>' + rows + '</tbody></table></div>';
          }

          projHTML +=
            '<div class="card p-0" style="overflow:hidden">' +
              '<div class="d-flex items-center justify-between p-4" style="background:rgba(139,92,246,0.06);border-bottom:1px solid var(--pc-border)">' +
                '<div>' +
                  '<div class="d-flex items-center gap-2">' +
                    '<span class="font-mono text-xs" style="color:#a78bfa">' + Utils.sanitizeHTML(proj.projectCode || '') + '</span>' +
                    '<span class="badge badge-muted text-xs">' + proj.status + '</span>' +
                  '</div>' +
                  '<div class="font-display text-md mt-1">' + Utils.sanitizeHTML(proj.projectName) + '</div>' +
                  '<div class="text-xs text-muted mt-1">' + Utils.sanitizeHTML(proj.clientName) +
                    (proj.eventName ? ' · ' + Utils.sanitizeHTML(proj.eventName) : '') +
                    (proj.eventDate ? ' · ' + Utils.formatDate(proj.eventDate) : '') +
                  '</div>' +
                '</div>' +
                '<div class="text-right d-flex flex-col gap-1">' +
                  '<div class="font-mono font-bold text-gold">' + Utils.formatCurrency(proj.totalPrice) + '</div>' +
                  balanceDiv +
                  '<div class="d-flex gap-1 justify-end mt-1">' +
                    '<button class="btn btn-secondary btn-sm" onclick="CRM.addSubOrder(\' + proj.id + \')">+ Add Garment</button>' +
                    '<button class="btn btn-secondary btn-sm" onclick="CRM.viewProject(\' + proj.id + \')">View</button>' +
                    invoiceBtn +
                  '</div>' +
                '</div>' +
              '</div>' +
              '<div class="p-4">' + subOrdersHTML + '</div>' +
            '</div>';
        });
      }
      projHTML += '</div>';
      Utils.$('#projects-list').innerHTML = projHTML;
    };
    Utils.$('#project-search').addEventListener('input', Utils.debounce(renderList));
    Utils.$('#project-filter-status').addEventListener('change', renderList);
    renderList();
  }

  function showProjectModal(projectId = null) {
    const isEdit = !!projectId;
    const proj = isEdit ? Store.getById(Store.COLLECTIONS.ORDER_PROJECTS, projectId) : null;
    const clients = Store.getAll(Store.COLLECTIONS.CLIENTS);

    App.showModal({
      title: isEdit ? 'Edit Project' : 'New Project',
      content: `
        <form id="project-form" class="animate-fade-in-scale">
          <div class="form-group">
            <label class="form-label">Client <span class="required">*</span></label>
            <select name="clientId" class="form-select" required>
              <option value="">-- Choose Client --</option>
              ${clients.map(c => `<option value="${c.id}" ${proj&&proj.clientId===c.id?'selected':''}>${Utils.sanitizeHTML(c.name)} (${c.type})</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Project Name <span class="required">*</span></label>
            <input type="text" name="projectName" class="form-input" required placeholder="e.g. Alyssa Wedding 2027" value="${proj?Utils.sanitizeHTML(proj.projectName):''}">
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Event Name</label>
              <input type="text" name="eventName" class="form-input" placeholder="e.g. Alyssa Wedding" value="${proj?Utils.sanitizeHTML(proj.eventName||''):''}">
            </div>
            <div class="form-group">
              <label class="form-label">Event Date</label>
              <input type="date" name="eventDate" class="form-input" value="${proj&&proj.eventDate?proj.eventDate:''}">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Total Project Price ex-GST (AUD) <span class="required">*</span></label>
              <input type="number" name="totalPrice" class="form-input" min="0" step="0.01" required value="${proj?proj.totalPrice:''}">
              <div class="text-xs text-muted mt-1" id="project-gst-hint">Invoice total inc GST will be calculated automatically.</div>
            </div>
            <div class="form-group">
              <label class="form-label">Status</label>
              <select name="status" class="form-select">
                <option value="Active" ${!proj||proj.status==='Active'?'selected':''}>Active</option>
                <option value="On Hold" ${proj&&proj.status==='On Hold'?'selected':''}>On Hold</option>
                <option value="Completed" ${proj&&proj.status==='Completed'?'selected':''}>Completed</option>
                <option value="Cancelled" ${proj&&proj.status==='Cancelled'?'selected':''}>Cancelled</option>
              </select>
            </div>
          </div>
          <div class="form-group m-0">
            <label class="form-label">Project Notes</label>
            <textarea name="notes" class="form-textarea" placeholder="Scope summary, special instructions...">${proj?Utils.sanitizeHTML(proj.notes||''):''}</textarea>
          </div>
        </form>`,
      submitText: isEdit ? 'Save Project' : 'Create Project',
      onSubmit: async (modalEl) => {
        const form = Utils.$('#project-form', modalEl);
        if (!form.checkValidity()) { form.reportValidity(); return false; }
        const fd = new FormData(form);
        const selectedClient = Store.getById(Store.COLLECTIONS.CLIENTS, fd.get('clientId'));
        const projData = {
          clientId: fd.get('clientId'),
          clientName: selectedClient ? selectedClient.name : 'Unknown',
          projectName: fd.get('projectName'),
          eventName: fd.get('eventName') || '',
          eventDate: fd.get('eventDate') || null,
          totalPrice: parseFloat(fd.get('totalPrice')) || 0,
          status: fd.get('status'),
          notes: fd.get('notes') || ''
        };
        if (isEdit) {
          Store.update(Store.COLLECTIONS.ORDER_PROJECTS, projectId, projData);
          Utils.showToast('Project updated.');
        } else {
          projData.projectCode = generateProjectCode();
          const createdProj = await Store.create(Store.COLLECTIONS.ORDER_PROJECTS, projData);
          if (!createdProj) {
            Utils.showToast('Failed to create project. Check your permissions.', 'error');
            return false;
          }
          await Store.refresh('order_projects');
          Utils.showToast('Project created. Now add garments using "+ Add Garment".');
        }
        renderSubTab();
        return true;
      }
    });

    // GST hint
    setTimeout(() => {
      const priceField = document.querySelector('#project-form [name="totalPrice"]');
      const hint = document.getElementById('project-gst-hint');
      if (priceField && hint) {
        priceField.addEventListener('input', () => {
          const p = parseFloat(priceField.value) || 0;
          if (p > 0) {
            hint.textContent = `Invoice total inc GST: ${Utils.formatCurrency(Math.round(p * 1.10 * 100) / 100)}`;
          } else {
            hint.textContent = 'Invoice total inc GST will be calculated automatically.';
          }
        });
      }
    }, 50);
  }

  function addSubOrder(projectId) {
    const proj = Store.getById(Store.COLLECTIONS.ORDER_PROJECTS, projectId);
    if (!proj) return;
    // Open the normal order modal but pre-link to this project
    showOrderModalForProject(projectId, proj);
  }

  function showOrderModalForProject(projectId, proj) {
    const clients = Store.getAll(Store.COLLECTIONS.CLIENTS);
    App.showModal({
      title: `Add Garment — ${proj.projectName}`,
      content: `
        <form id="sub-order-form" class="animate-fade-in-scale">
          <div class="p-3 rounded-md mb-4" style="background:rgba(139,92,246,0.08);border:1px solid var(--pc-border)">
            <div class="text-xs text-muted">Adding garment to project: <strong style="color:#a78bfa">${Utils.sanitizeHTML(proj.projectName)}</strong></div>
            <div class="text-xs text-muted mt-1">Client: <strong>${Utils.sanitizeHTML(proj.clientName)}</strong></div>
          </div>
          <div class="form-group">
            <label class="form-label">Garment Title <span class="required">*</span></label>
            <input type="text" name="title" class="form-input" required placeholder="e.g. Bridal Lehenga — Wedding Ceremony">
          </div>
          <div class="form-group">
            <label class="form-label">Product Type <span class="required">*</span></label>
            <select name="productType" class="form-select" required>
              <option value="BLS">Bridal Lehenga Set (BLS)</option>
              <option value="SAR">Saree (SAR)</option>
              <option value="SAL">Salwar Suit (SAL)</option>
              <option value="SHE">Sherwani (SHE)</option>
              <option value="BSN">Bridal Sneakers (BSN)</option>
              <option value="GEN">Other (GEN)</option>
            </select>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Price ex-GST (AUD) <span class="required">*</span></label>
              <input type="number" name="price" class="form-input" min="0" step="0.01" required>
            </div>
            <div class="form-group">
              <label class="form-label">Deadline <span class="required">*</span></label>
              <input type="date" name="deadline" class="form-input" required>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Delivery Destination</label>
              <select name="deliveryDestination" class="form-select">
                <option value="Australia">To Australia</option>
                <option value="India">To India</option>
                <option value="Overseas">Overseas</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Shipping Allocation</label>
              <select name="shippingAllocation" class="form-select">
                <option value="None">No shipping charge</option>
                <option value="Half">50/50 split</option>
                <option value="Full">Customer pays full</option>
              </select>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Who is this for?</label>
            <input type="text" name="lookNumber" class="form-input" placeholder="e.g. Alyssa — Look 1, Mariam Bridesmaid">
          </div>
          <div class="form-group">
            <label class="form-label">Fabric & Colour</label>
            <input type="text" name="fabricType" class="form-input" placeholder="e.g. Pure Silk, Colour 252-L">
          </div>
          <div class="form-group m-0">
            <label class="form-label">Design Notes</label>
            <textarea name="designNotes" class="form-textarea" rows="2" placeholder="Key design details, embroidery, silhouette..."></textarea>
          </div>
        </form>`,
      submitText: 'Add Garment to Project',
      onSubmit: async (modalEl) => {
        const form = Utils.$('#sub-order-form', modalEl);
        if (!form.checkValidity()) { form.reportValidity(); return false; }
        const fd = new FormData(form);
        const productType = fd.get('productType') || 'GEN';
        const orderData = {
          clientId: proj.clientId,
          clientName: proj.clientName,
          title: fd.get('title'),
          price: parseFloat(fd.get('price')) || 0,
          deadline: fd.get('deadline'),
          status: 'New',
          productType,
          projectId,
          deliveryDestination: fd.get('deliveryDestination'),
          shippingAllocation: fd.get('shippingAllocation'),
          lookNumber: fd.get('lookNumber') || '',
          fabricType: fd.get('fabricType') || '',
          designNotes: fd.get('designNotes') || '',
          notes: ''
        };
        orderData.orderCode = generateOrderCode(productType);
        const createdOrder = await Store.create(Store.COLLECTIONS.ORDERS, orderData);
        if (!createdOrder) {
          Utils.showToast('Failed to add garment. Check your permissions.', 'error');
          return false;
        }

        // Update project total price to sum of all sub-orders
        await Store.refresh(Store.COLLECTIONS.ORDER_PROJECTS);
        const allSubOrders = Store.query(Store.COLLECTIONS.ORDERS, o => o.projectId === projectId);
        const newTotal = allSubOrders.reduce((sum, o) => sum + (o.price || 0), 0);
        await Store.update(Store.COLLECTIONS.ORDER_PROJECTS, projectId, { totalPrice: newTotal });

        // Check if invoice already exists — warn Pooja to update it
        const existingInv = Store.query(Store.COLLECTIONS.INVOICES, i => i.projectId === projectId)[0];
        if (existingInv) {
          Utils.showToast(`Garment added. ⚠️ Invoice exists — click "Update Invoice" to include this garment.`, 'info');
        } else {
          Utils.showToast(`Garment added to ${proj.projectName}.`);
        }
        renderSubTab();
        return true;
      }
    });
  }

  function viewProject(projectId) {
    const proj = Store.getById(Store.COLLECTIONS.ORDER_PROJECTS, projectId);
    if (!proj) return;
    const subOrders = Store.query(Store.COLLECTIONS.ORDERS, o => o.projectId === projectId);
    const invoice = Store.query(Store.COLLECTIONS.INVOICES, i => i.projectId === projectId)[0];
    const paid = invoice ? ((invoice.amountPaid != null && invoice.amountPaid !== '') ? parseFloat(invoice.amountPaid) : 0) : 0;
    const balance = invoice ? Math.round((invoice.total - paid) * 100) / 100 : 0;

    App.showModal({
      title: `📁 ${proj.projectName}`,
      content: `
        <div class="d-flex flex-col gap-4 animate-fade-in">
          <div class="d-grid gap-3" style="grid-template-columns:1fr 1fr;font-size:13px">
            <div><span class="text-muted text-xs">Client:</span><div class="font-semibold">${Utils.sanitizeHTML(proj.clientName)}</div></div>
            <div><span class="text-muted text-xs">Project Code:</span><div class="font-mono text-gold">${Utils.sanitizeHTML(proj.projectCode || '—')}</div></div>
            <div><span class="text-muted text-xs">Event:</span><div>${Utils.sanitizeHTML(proj.eventName || '—')}</div></div>
            <div><span class="text-muted text-xs">Event Date:</span><div>${proj.eventDate ? Utils.formatDate(proj.eventDate) : '—'}</div></div>
            <div><span class="text-muted text-xs">Total (ex-GST):</span><div class="font-mono font-bold">${Utils.formatCurrency(proj.totalPrice)}</div></div>
            <div><span class="text-muted text-xs">Total (inc GST):</span><div class="font-mono font-bold text-gold">${Utils.formatCurrency(Math.round(proj.totalPrice * 1.10 * 100) / 100)}</div></div>
          </div>
          ${invoice ? `
            <div class="p-3 rounded-md" style="background:rgba(0,0,0,0.2);border:1px solid var(--pc-border)">
              <div class="d-flex justify-between items-center mb-3">
                <div class="text-xs font-semibold text-gold">🧾 Invoice ${Utils.sanitizeHTML(invoice.invoiceNumber)}</div>
                <div class="d-flex gap-2">
                  <span class="badge ${invoice.status === 'Paid' ? 'badge-success' : invoice.status === 'Partially Paid' ? 'badge-warning' : 'badge-muted'} text-xs">${invoice.status}</span>
                </div>
              </div>
              <!-- Totals -->
              <div class="d-flex justify-between text-xs mb-1"><span class="text-muted">Invoice Total:</span><span class="font-mono">${Utils.formatCurrency(invoice.total)}</span></div>
              <div class="d-flex justify-between text-xs mb-1"><span class="text-muted">Total Paid:</span><span class="font-mono text-success">${Utils.formatCurrency(paid)}</span></div>
              <div class="d-flex justify-between text-xs font-bold mb-3" style="border-top:1px solid var(--pc-border);padding-top:6px;margin-top:4px">
                <span>Balance Due:</span>
                <span class="font-mono ${balance > 0 ? 'text-danger' : 'text-success'}">${Utils.formatCurrency(balance)}</span>
              </div>
              <!-- Milestones -->
              ${(invoice.milestones && invoice.milestones.length) ? `
              <div class="text-xs font-semibold text-gold mb-2">Payment Milestones</div>
              <div class="d-flex flex-col gap-2">
                ${invoice.milestones.map((m, idx) => {
                  const rolloverDiv = m.rollover > 0 ? '<div class="text-xs" style="color:#a78bfa">Includes ' + Utils.formatCurrency(m.rollover) + ' rolled from previous milestone</div>' : '';
                  const paidDiv = (m.paid && m.paidAmount > 0) ? '<div class="text-xs text-success">✓ Paid: ' + Utils.formatCurrency(m.paidAmount) + '</div>' : '';
                  const actionBtn = !m.paid
                    ? '<button class="btn btn-primary" style="font-size:10px;padding:3px 10px" onclick="App.closeModal();setTimeout(()=>CRM.recordMilestonePayment(\''+proj.id+'\','+idx+'),200)">💳 Record Payment</button>'
                    : '<span class="badge badge-success text-xs">Paid</span>';
                  return '<div class="p-2 rounded-md" style="background:rgba(255,255,255,0.02);border:1px solid var(--pc-border)">' +
                    '<div class="d-flex justify-between items-center">' +
                      '<div>' +
                        '<div class="text-xs font-semibold">' + Utils.sanitizeHTML(m.label) + '</div>' +
                        rolloverDiv + paidDiv +
                      '</div>' +
                      '<div class="text-right d-flex flex-col gap-1 items-end">' +
                        '<span class="font-mono text-xs font-bold">' + Utils.formatCurrency(m.amount) + '</span>' +
                        actionBtn +
                      '</div>' +
                    '</div>' +
                  '</div>';
                }).join('')}
              </div>` : ''}
            </div>` : `
            <div class="p-3 rounded-md text-xs text-muted" style="border:1px dashed var(--pc-border)">
              No invoice yet. Click "Create Invoice" to generate a project invoice with 30/40/30 milestones.
            </div>`}
          <div>
            <div class="text-sm font-semibold text-gold mb-2">Garments (${subOrders.length})</div>
            ${subOrders.length === 0 ? `<div class="text-xs text-muted">No garments added yet.</div>` : `
              <div class="table-container" style="border:none;margin:0">
                <table class="data-table text-xs">
                  <thead><tr><th>Code</th><th>Garment</th><th>Price</th><th>Status</th><th>Deadline</th></tr></thead>
                  <tbody>
                    ${subOrders.map(o => `<tr>
                      <td class="font-mono text-gold">${Utils.sanitizeHTML(o.orderCode || '—')}</td>
                      <td class="font-medium">${Utils.sanitizeHTML(o.title)}</td>
                      <td class="font-mono">${Utils.formatCurrency(o.price)}</td>
                      <td><span class="badge badge-gold text-xs">${o.status}</span></td>
                      <td>${Utils.formatDate(o.deadline)}</td>
                    </tr>`).join('')}
                  </tbody>
                </table>
              </div>`}
          </div>
          ${proj.notes ? `
            <div>
              <div class="text-xs font-semibold text-gold mb-1">Notes</div>
              <div class="p-2 rounded-md text-xs" style="background:rgba(0,0,0,0.2);white-space:pre-line;border:1px solid var(--pc-border)">${Utils.sanitizeHTML(proj.notes)}</div>
            </div>` : ''}
          <div class="d-flex gap-2 justify-end" style="border-top:1px solid var(--pc-border);padding-top:var(--sp-4)">
            <button class="btn btn-secondary" onclick="App.closeModal();setTimeout(()=>CRM.addSubOrder('${proj.id}'),200)">+ Add Garment</button>
            <button class="btn btn-secondary" onclick="App.closeModal();setTimeout(()=>CRM.showProjectModal('${proj.id}'),200)">✏️ Edit Project</button>
            ${!invoice
              ? `<button class="btn btn-primary" onclick="App.closeModal();setTimeout(()=>CRM.createProjectInvoice('${proj.id}'),200)">🧾 Create Invoice</button>`
              : `<button class="btn btn-secondary" onclick="App.closeModal();setTimeout(()=>CRM.updateProjectInvoice('${proj.id}'),200)">🔄 Update Invoice</button>`}
          </div>
        </div>`,
      hideCancel: true, submitText: 'Close', onSubmit: () => true,
      modalSize: 'modal-lg'
    });
  }

  function createProjectInvoice(projectId) {
    const proj = Store.getById(Store.COLLECTIONS.ORDER_PROJECTS, projectId);
    if (!proj) return;
    const subOrders = Store.query(Store.COLLECTIONS.ORDERS, o => o.projectId === projectId);

    if (subOrders.length === 0) {
      Utils.showToast('Add at least one garment before creating an invoice.', 'error');
      return;
    }

    // Check no invoice exists already
    const existing = Store.query(Store.COLLECTIONS.INVOICES, i => i.projectId === projectId)[0];
    if (existing) {
      Utils.showToast('An invoice already exists for this project.', 'info');
      return;
    }

    const exGST    = Math.round(proj.totalPrice * 100) / 100;
    const gst      = Math.round(exGST * 0.10 * 100) / 100;
    const total    = Math.round((exGST + gst) * 100) / 100;

    // 30/40/30 milestones
    const m1 = Math.round(total * 0.30 * 100) / 100; // 30% deposit
    const m2 = Math.round(total * 0.40 * 100) / 100; // 40% design approval
    const m3 = Math.round((total - m1 - m2) * 100) / 100; // 30% before delivery

    App.showModal({
      title: `🧾 Create Project Invoice — ${proj.projectName}`,
      content: `
        <form id="proj-inv-form" class="animate-fade-in-scale">
          <div class="p-3 rounded-md mb-4" style="background:rgba(0,0,0,0.2);border:1px solid var(--pc-border)">
            <div class="d-flex justify-between text-sm mb-1"><span class="text-muted">Project total (ex-GST):</span><span class="font-mono">${Utils.formatCurrency(exGST)}</span></div>
            <div class="d-flex justify-between text-sm mb-1"><span class="text-muted">GST (10%):</span><span class="font-mono">${Utils.formatCurrency(gst)}</span></div>
            <div class="d-flex justify-between text-sm font-bold"><span>Invoice Total (inc GST):</span><span class="font-mono text-gold">${Utils.formatCurrency(total)}</span></div>
          </div>
          <div class="text-xs font-semibold text-gold mb-1">Payment Milestones</div>
          <div class="text-xs text-muted mb-3">Suggested 30/40/30 split. Any shortfall on M1 rolls over to M2 automatically.</div>
          <div class="d-flex flex-col gap-3 mb-4">
            <div class="p-3 rounded-md" style="background:rgba(0,0,0,0.15);border:1px solid var(--pc-border)">
              <div class="d-flex justify-between items-center mb-2">
                <div>
                  <div class="text-xs font-semibold">Milestone 1 — Deposit</div>
                  <div class="text-xs text-muted">Suggested 30%: ${Utils.formatCurrency(m1)} · Due within 7 days</div>
                </div>
              </div>
              <div class="form-group m-0">
                <label class="form-label" style="font-size:10px">Amount paid by customer (AUD)</label>
                <input type="number" name="m1paid" id="m1paid-input" class="form-input" min="0" step="0.01" value="0" placeholder="0.00">
                <div id="m1-rollover-hint" class="text-xs mt-1"></div>
              </div>
            </div>
            <div class="p-3 rounded-md" style="background:rgba(0,0,0,0.15);border:1px solid var(--pc-border)">
              <div class="d-flex justify-between items-center">
                <div>
                  <div class="text-xs font-semibold">Milestone 2 — Design Approval</div>
                  <div class="text-xs text-muted">Due at design approval, before production</div>
                </div>
                <div class="font-mono font-bold" id="m2-display">${Utils.formatCurrency(m2)}</div>
              </div>
            </div>
            <div class="p-3 rounded-md" style="background:rgba(0,0,0,0.15);border:1px solid var(--pc-border)">
              <div class="d-flex justify-between items-center">
                <div>
                  <div class="text-xs font-semibold">Milestone 3 — Before Delivery</div>
                  <div class="text-xs text-muted">Due before final delivery</div>
                </div>
                <div class="font-mono font-bold" id="m3-display">${Utils.formatCurrency(m3)}</div>
              </div>
            </div>
            <div class="p-3 rounded-md" style="background:rgba(236,182,118,0.06);border:1px solid var(--pc-border)">
              <div class="d-flex justify-between text-xs"><span class="text-muted">Total paid so far:</span><span class="font-mono text-success" id="total-paid-display">${Utils.formatCurrency(0)}</span></div>
              <div class="d-flex justify-between text-xs mt-1"><span class="text-muted">Remaining balance:</span><span class="font-mono font-bold text-danger" id="remaining-display">${Utils.formatCurrency(total)}</span></div>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Issue Date</label>
              <input type="date" name="issueDate" class="form-input" value="${new Date().toISOString().split('T')[0]}">
            </div>
            <div class="form-group">
              <label class="form-label">Due Date (Milestone 1)</label>
              <input type="date" name="dueDate" class="form-input" value="${new Date(Date.now() + 7*24*60*60*1000).toISOString().split('T')[0]}">
            </div>
          </div>
          <div class="form-group m-0">
            <label class="form-label">Invoice Notes</label>
            <textarea name="notes" class="form-textarea" placeholder="Payment instructions, bank details...">Direct deposit payment info:\nBank: Commonwealth Bank of Australia\nBSB: 062-900\nAccount: 1045 9827</textarea>
          </div>
        </form>`,
      submitText: 'Generate Project Invoice',
      modalSize: 'modal-lg',
      onSubmit: async (modalEl) => {
        const form = Utils.$('#proj-inv-form', modalEl);
        if (!form.checkValidity()) { form.reportValidity(); return false; }
        const fd = new FormData(form);
        const m1paid = parseFloat(fd.get('m1paid')) || 0;

        // Shortfall on M1 rolls into M2
        const m1Shortfall = Math.max(0, Math.round((m1 - m1paid) * 100) / 100);
        const m2Adjusted  = Math.round((m2 + m1Shortfall) * 100) / 100;
        const m3Adjusted  = Math.max(0, Math.round((total - m1paid - m2Adjusted) * 100) / 100);

        let invStatus = 'Draft';
        if (m1paid >= total) invStatus = 'Paid';
        else if (m1paid > 0) invStatus = 'Partially Paid';

        // Build line items from sub-orders
        const items = subOrders.map(o => ({
          description: `${o.orderCode ? o.orderCode + ' — ' : ''}${o.title}`,
          quantity: 1,
          unitPrice: Math.round(o.price * 100) / 100,
          gst: Math.round(o.price * 0.10 * 100) / 100,
          amount: Math.round(o.price * 1.10 * 100) / 100
        }));

        await Store.create(Store.COLLECTIONS.INVOICES, {
          projectId,
          clientId: proj.clientId,
          clientName: proj.clientName,
          invoiceNumber: 'INV-' + new Date().getFullYear() + '-' + Utils.randomBetween(100, 999),
          issueDate: fd.get('issueDate'),
          dueDate: fd.get('dueDate'),
          subtotal: exGST,
          gstTotal: gst,
          total,
          amountPaid: m1paid,
          status: invStatus,
          notes: fd.get('notes') || '',
          items,
          // Milestone structure
          milestones: [
            { label: 'Milestone 1 — Deposit', amount: m1, paid: m1paid > 0, paidAmount: m1paid, suggested: m1 },
            { label: 'Milestone 2 — Design Approval', amount: m2Adjusted, paid: false, paidAmount: 0, rollover: m1Shortfall },
            { label: 'Milestone 3 — Before Delivery', amount: m3Adjusted, paid: false, paidAmount: 0 }
          ]
        });

        Utils.showToast(`Project invoice created. Total: ${Utils.formatCurrency(total)} — 3 payment milestones set.`);
        renderSubTab();
        return true;
      }
    });
    // Wire live hints after modal renders
    setTimeout(() => {
      const m1Input = document.getElementById('m1paid-input');
      const hint    = document.getElementById('m1-rollover-hint');
      const m2El    = document.getElementById('m2-display');
      const m3El    = document.getElementById('m3-display');
      const paidEl  = document.getElementById('total-paid-display');
      const remEl   = document.getElementById('remaining-display');
      if (!m1Input) return;
      const fmt = (n) => Utils.formatCurrency(Math.round(n * 100) / 100);
      const update = () => {
        const paid      = parseFloat(m1Input.value) || 0;
        const shortfall = Math.max(0, m1 - paid);
        const m2adj     = Math.round((m2 + shortfall) * 100) / 100;
        const m3adj     = Math.max(0, Math.round((total - paid - m2adj) * 100) / 100);
        const remaining = Math.round((total - paid) * 100) / 100;
        if (hint) {
          if (paid > 0 && paid < m1) {
            hint.style.color = '#a78bfa';
            hint.textContent = `Paid: ${fmt(paid)}. Shortfall of ${fmt(shortfall)} rolled to M2.`;
          } else if (paid >= m1 && paid > 0) {
            hint.style.color = '#10b981';
            hint.textContent = `✓ Full deposit of ${fmt(paid)} received.`;
          } else {
            hint.textContent = '';
          }
        }
        if (m2El) m2El.textContent = fmt(m2adj);
        if (m3El) m3El.textContent = fmt(m3adj);
        if (paidEl) paidEl.textContent = fmt(paid);
        if (remEl) {
          remEl.textContent = fmt(remaining);
          remEl.style.color = remaining <= 0 ? '#10b981' : '#ef4444';
        }
      };
      m1Input.addEventListener('input', update);
      update();
    }, 150);
  }

  // Record payment against a specific milestone
  function recordMilestonePayment(projectId, milestoneIndex) {
    const invoice = Store.query(Store.COLLECTIONS.INVOICES, i => i.projectId === projectId)[0];
    if (!invoice) { Utils.showToast('Invoice not found.', 'error'); return; }

    const milestones = invoice.milestones || [];
    const m = milestones[milestoneIndex];
    if (!m) { Utils.showToast('Milestone not found.', 'error'); return; }

    const totalPaidSoFar = (invoice.amountPaid != null && invoice.amountPaid !== '') ? parseFloat(invoice.amountPaid) : 0;
    const mBalance = Math.round((m.amount - (m.paidAmount || 0)) * 100) / 100;

    App.showModal({
      title: `💳 Record Payment — ${m.label}`,
      content: `
        <form id="milestone-pay-form" class="animate-fade-in-scale">
          <div class="p-3 rounded-md mb-4" style="background:rgba(0,0,0,0.2);border:1px solid var(--pc-border)">
            <div class="d-flex justify-between text-sm mb-1">
              <span class="text-muted">Milestone amount:</span>
              <span class="font-mono font-bold">${Utils.formatCurrency(m.amount)}</span>
            </div>
            ${m.paidAmount > 0 ? `
            <div class="d-flex justify-between text-sm mb-1">
              <span class="text-muted">Already paid:</span>
              <span class="font-mono text-success">${Utils.formatCurrency(m.paidAmount)}</span>
            </div>` : ''}
            <div class="d-flex justify-between text-sm font-bold" style="border-top:1px solid var(--pc-border);padding-top:6px;margin-top:4px">
              <span>Outstanding:</span>
              <span class="font-mono text-danger">${Utils.formatCurrency(mBalance)}</span>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Amount Received (AUD) <span class="required">*</span></label>
            <input type="number" name="amount" class="form-input" id="milestone-amount-input"
              min="0" step="0.01" value="${mBalance}" required>
            <div id="milestone-pay-hint" class="text-xs text-muted mt-1">
              Pre-filled with outstanding amount. Edit if partial payment received.
            </div>
          </div>
          <div class="form-group m-0">
            <label class="form-label">Payment Method</label>
            <select name="paymentMethod" class="form-select">
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="Cash">Cash</option>
              <option value="Card">Card</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </form>`,
      submitText: '✓ Confirm Payment',
      onSubmit: async (modalEl) => {
        const form = Utils.$('#milestone-pay-form', modalEl);
        if (!form.checkValidity()) { form.reportValidity(); return false; }
        const fd = new FormData(form);
        const amount = parseFloat(fd.get('amount')) || 0;
        if (amount <= 0) { Utils.showToast('Enter a payment amount greater than zero.', 'error'); return false; }

        // Update this milestone + roll any shortfall to the next one
        const shortfall = Math.max(0, Math.round((m.amount - (m.paidAmount || 0) - amount) * 100) / 100);
        const updatedMilestones = milestones.map((ms, idx) => {
          if (idx === milestoneIndex) {
            const newPaidAmount = Math.round(((ms.paidAmount || 0) + amount) * 100) / 100;
            return { ...ms, paidAmount: newPaidAmount, paid: newPaidAmount >= ms.amount };
          }
          // Roll shortfall into the immediately next milestone
          if (idx === milestoneIndex + 1 && shortfall > 0) {
            const newAmount = Math.round((ms.amount + shortfall) * 100) / 100;
            return { ...ms, amount: newAmount, rollover: Math.round(((ms.rollover || 0) + shortfall) * 100) / 100 };
          }
          return ms;
        });

        // Update total paid on invoice
        const newTotalPaid = Math.round((totalPaidSoFar + amount) * 100) / 100;
        const newBalance   = Math.round((invoice.total - newTotalPaid) * 100) / 100;
        let newStatus = newBalance <= 0 ? 'Paid' : 'Partially Paid';

        await Store.update(Store.COLLECTIONS.INVOICES, invoice.id, {
          amountPaid: newTotalPaid,
          status: newStatus,
          milestones: updatedMilestones,
          notes: (invoice.notes || '') + '\n' + m.label + ': ' + Utils.formatCurrency(amount) + ' via ' + fd.get('paymentMethod') + ' on ' + new Date().toLocaleDateString('en-AU') + '.'
        });

        Utils.showToast('Payment of ' + Utils.formatCurrency(amount) + ' recorded for ' + m.label + '. Balance: ' + Utils.formatCurrency(newBalance) + '.', 'success');
        App.closeModal();
        renderSubTab();
        return true;
      }
    });

    // Live hint on amount input
    setTimeout(() => {
      const input = document.getElementById('milestone-amount-input');
      const hint  = document.getElementById('milestone-pay-hint');
      if (!input || !hint) return;
      input.addEventListener('input', () => {
        const amt = parseFloat(input.value) || 0;
        if (amt < mBalance && amt > 0) {
          hint.textContent = 'Partial payment. ' + Utils.formatCurrency(mBalance - amt) + ' will remain outstanding on this milestone.';
          hint.style.color = '#a78bfa';
        } else if (amt >= mBalance && amt > 0) {
          hint.textContent = '✓ Clears this milestone fully.';
          hint.style.color = '#10b981';
        } else {
          hint.textContent = 'Pre-filled with outstanding amount. Edit if partial payment received.';
          hint.style.color = '';
        }
      });
    }, 100);
  }

  // Regenerate invoice line items from current sub-orders
  // Preserves: invoice number, dates, amount already paid, milestones paid status
  // Updates: line items, subtotal, GST, total, milestone amounts
  function updateProjectInvoice(projectId) {
    const proj = Store.getById(Store.COLLECTIONS.ORDER_PROJECTS, projectId);
    if (!proj) return;
    const subOrders = Store.query(Store.COLLECTIONS.ORDERS, o => o.projectId === projectId);
    const invoice = Store.query(Store.COLLECTIONS.INVOICES, i => i.projectId === projectId)[0];
    if (!invoice) { Utils.showToast('No invoice found for this project.', 'error'); return; }

    if (subOrders.length === 0) {
      Utils.showToast('No garments in this project to invoice.', 'error');
      return;
    }

    // Recalculate totals from current sub-orders
    const newExGST  = Math.round(subOrders.reduce((s, o) => s + (o.price || 0), 0) * 100) / 100;
    const newGST    = Math.round(newExGST * 0.10 * 100) / 100;
    const newTotal  = Math.round((newExGST + newGST) * 100) / 100;
    const paid      = (invoice.amountPaid != null && invoice.amountPaid !== '') ? parseFloat(invoice.amountPaid) : 0;
    const newBalance = Math.round((newTotal - paid) * 100) / 100;

    // Rebuild milestones with new total, preserving what's already been paid
    const existingM = invoice.milestones || [];
    const m1paid    = existingM[0] ? (existingM[0].paidAmount || 0) : paid;
    const m1Shortfall = Math.max(0, Math.round((newTotal * 0.30 - m1paid) * 100) / 100);
    const newM2     = Math.round((newTotal * 0.40 + m1Shortfall) * 100) / 100;
    const newM3     = Math.max(0, Math.round((newTotal - m1paid - newM2) * 100) / 100);

    App.showConfirm({
      title: '🔄 Update Project Invoice',
      text: `This will update the invoice to include all ${subOrders.length} garments.

New total: ${Utils.formatCurrency(newTotal)} (was ${Utils.formatCurrency(invoice.total)}).
Amount already paid (${Utils.formatCurrency(paid)}) will be preserved.
New balance: ${Utils.formatCurrency(newBalance)}.`,
      confirmText: 'Update Invoice',
      onConfirm: async () => {
        const items = subOrders.map(o => ({
          description: `${o.orderCode ? o.orderCode + ' — ' : ''}${o.title}`,
          quantity: 1,
          unitPrice: Math.round(o.price * 100) / 100,
          gst: Math.round(o.price * 0.10 * 100) / 100,
          amount: Math.round(o.price * 1.10 * 100) / 100
        }));

        let newStatus = invoice.status;
        if (paid >= newTotal && newTotal > 0) newStatus = 'Paid';
        else if (paid > 0) newStatus = 'Partially Paid';
        else newStatus = 'Draft';

        await Store.update(Store.COLLECTIONS.INVOICES, invoice.id, {
          items,
          subtotal: newExGST,
          gstTotal: newGST,
          total: newTotal,
          status: newStatus,
          milestones: [
            { label: 'Milestone 1 — Deposit', amount: newTotal * 0.30, paid: m1paid > 0, paidAmount: m1paid },
            { label: 'Milestone 2 — Design Approval', amount: newM2, paid: false, paidAmount: 0, rollover: m1Shortfall },
            { label: 'Milestone 3 — Before Delivery', amount: newM3, paid: false, paidAmount: 0 }
          ]
        });

        // Update project total too
        await Store.update(Store.COLLECTIONS.ORDER_PROJECTS, projectId, { totalPrice: newExGST });

        Utils.showToast(`Invoice updated. New total: ${Utils.formatCurrency(newTotal)}.`, 'success');
        renderSubTab();
      }
    });
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
    addShippingToInvoice,
    editOrder,
    deleteOrder,
    showComposeModal,
    recordPaymentAndClear,
    markReceivedInAustralia,
    markFinalFitting,
    markReadyToDeliver,
    addSubOrder,
    viewProject,
    showProjectModal,
    createProjectInvoice,
    updateProjectInvoice,
    recordMilestonePayment
  };
})();
