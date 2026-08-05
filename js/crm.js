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
      id: 'invoice_with_agreement',
      name: 'New Invoice + Client Agreement',
      subject: "Your Order Confirmation, Invoice & Agreement — Pooja's Couture",
      body: `Dear {{clientName}},

Thank you for confirming your order with Pooja's Couture! Your invoice {{invoiceNumber}} for {{invoiceAmount}} is attached, with the deposit due by {{dueDate}}.

Before work begins, please review and sign your Client Service Agreement here:
{{agreementLink}}

You can download a copy for your own records from that page. Once signed, please also email a copy back to info@poojascouture.com — this is required before production begins.

We can't wait to bring your vision to life!

Warm regards,
Pooja Shah
Pooja's Couture`
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
    try { activeTab = localStorage.getItem('pc_tab_crm') || 'clients'; } catch(e) { activeTab = 'clients'; }
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
          try { localStorage.setItem('pc_tab_crm', activeTab); } catch(e) {}
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
      <button class="btn btn-primary" id="btn-add-order-clients">+ New Order</button>
    `;
    Utils.$('#btn-add-client').addEventListener('click', () => showClientModal());
    Utils.$('#btn-export-clients').addEventListener('click', exportClientsCSV);
    Utils.$('#btn-add-order-clients').addEventListener('click', () => showOrderModal());

    container.innerHTML = `
      <div class="card p-0">
        <div class="card-header flex-wrap gap-4">
          <div class="filter-bar m-0" style="flex-wrap:nowrap;align-items:center;">
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

  function showClientModal(clientId = null, prefill = null, linkAppointmentId = null) {
    const isEdit = !!clientId;
    const client = isEdit ? Store.getById(Store.COLLECTIONS.CLIENTS, clientId) : null;
    const pf = prefill || {};
    App.showModal({
      title: isEdit ? 'Edit Client' : (linkAppointmentId ? 'Create Client from Booking' : 'Add New Client'),
      content: `
        <form id="client-form" class="animate-fade-in-scale">
          ${linkAppointmentId ? `<div class="text-xs text-muted mb-3">Creating a client record for this booking. It will be linked back to the appointment automatically.</div>` : ''}
          <div class="form-group">
            <label class="form-label">Client Name <span class="required">*</span></label>
            <input type="text" name="name" class="form-input" required value="${client?Utils.sanitizeHTML(client.name):Utils.sanitizeHTML(pf.name||'')}">
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Email <span class="required">*</span></label>
              <input type="email" name="email" class="form-input" required value="${client?Utils.sanitizeHTML(client.email):Utils.sanitizeHTML(pf.email||'')}">
            </div>
            <div class="form-group">
              <label class="form-label">Phone <span class="required">*</span></label>
              <input type="text" name="phone" class="form-input" required value="${client?Utils.sanitizeHTML(client.phone):Utils.sanitizeHTML(pf.phone||'')}">
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
            <textarea name="notes" class="form-textarea" placeholder="Color palettes, measurements, design preferences...">${client?Utils.sanitizeHTML(client.notes||''):Utils.sanitizeHTML(pf.notes||'')}</textarea>
          </div>
        </form>`,
      submitText: isEdit ? 'Save Changes' : (linkAppointmentId ? 'Create & Link' : 'Add Client'),
      onSubmit: async (modalEl) => {
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
          const created = await Store.create(Store.COLLECTIONS.CLIENTS, clientData);
          if (linkAppointmentId && created) {
            await Store.update(Store.COLLECTIONS.APPOINTMENTS, linkAppointmentId, {
              clientId: created.id, clientName: created.name
            });
            Utils.showToast('Client created and linked to the booking.');
          } else {
            Utils.showToast('Client registered.');
          }
        }
        renderSubTab();
        return true;
      }
    });
  }

  // Parses "Email: x | Phone: y | Source: TidyCal" (the exact format
  // tidycal-sync.js writes into appointment notes) to pre-fill the new
  // client form, so staff aren't retyping contact info that's already there.
  function createClientFromBooking(apptId) {
    const appt = Store.getById(Store.COLLECTIONS.APPOINTMENTS, apptId);
    if (!appt) return;
    const notes = appt.notes || '';
    const emailMatch = notes.match(/Email:\s*([^|]+)/i);
    const phoneMatch = notes.match(/Phone:\s*([^|]+)/i);
    showClientModal(null, {
      name: appt.clientName || '',
      email: emailMatch ? emailMatch[1].trim() : '',
      phone: phoneMatch ? phoneMatch[1].trim() : '',
      notes: 'Created from booking on ' + Utils.formatDateShort(appt.date) + '.'
    }, apptId);
  }

  function showClientDetailsModal(clientId) {
    const client = Store.getById(Store.COLLECTIONS.CLIENTS, clientId);
    if (!client) return;
    const appointments = Store.query(Store.COLLECTIONS.APPOINTMENTS, a => a.clientId === clientId);
    const orders = Store.query(Store.COLLECTIONS.ORDERS, o => o.clientId === clientId);
    const emails = getClientEmailHistory(clientId);
    const changes = Store.query(Store.COLLECTIONS.CLIENT_CHANGES, ch => ch.clientId === clientId);
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
                  <tbody>${orders.map(o=>`<tr style="cursor:pointer" onclick="App.closeModal();setTimeout(()=>CRM.showOrderDetails('${o.id}'),200)" title="Click to view photos, details and photo requests">
                    <td class="font-medium">${Utils.sanitizeHTML(o.title)}</td>
                    <td class="font-mono">${Utils.formatCurrency(o.price)}</td>
                    <td><span class="badge badge-gold">${o.status}</span></td>
                    <td>${Utils.formatDate(o.deadline)}</td>
                  </tr>`).join('')}</tbody>
                </table>
              </div>`}
          </div>
          <div>
            <div class="d-flex justify-between items-center mb-2">
              <h4 class="text-sm font-semibold text-gold">Change Log (${changes.length})</h4>
              <button class="btn btn-secondary btn-sm" onclick="App.closeModal();setTimeout(()=>CRM.logClientChange('${clientId}'),200)">+ Log Change</button>
            </div>
            ${changes.length===0?`<div class="text-xs text-muted p-3 text-center rounded-md" style="border:1px dashed var(--pc-border)">No changes logged yet.</div>`:`
              <div class="table-container" style="max-height:170px">
                <table class="data-table text-xs">
                  <thead><tr><th>Date</th><th>Change</th><th>Requested By</th><th>Price Impact</th><th>Timeline</th></tr></thead>
                  <tbody>${changes.slice().sort((a,b)=>new Date(b.changeDate)-new Date(a.changeDate)).map(ch=>{
                    const relOrder = ch.orderId ? Store.getById(Store.COLLECTIONS.ORDERS, ch.orderId) : null;
                    return `<tr>
                    <td class="font-mono">${Utils.formatDate(ch.changeDate)}</td>
                    <td>${Utils.sanitizeHTML(ch.description)}${relOrder?`<div class="text-muted mt-1">→ ${Utils.sanitizeHTML(relOrder.title)}</div>`:''}</td>
                    <td><span class="badge ${ch.requestedBy==='Client'?'badge-info':'badge-muted'}">${Utils.sanitizeHTML(ch.requestedBy||'—')}</span></td>
                    <td class="font-mono">${(ch.priceImpact||0)!==0?((ch.priceImpact>0?'+':'')+Utils.formatCurrency(ch.priceImpact)):'—'}</td>
                    <td class="text-muted">${Utils.truncateText(ch.timelineImpact||'—',30)}</td>
                  </tr>`;}).join('')}</tbody>
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
    actions.innerHTML = `
      <button class="btn btn-secondary" id="btn-sync-tidycal" title="Pull latest bookings from TidyCal">&#8635; Sync TidyCal</button>
      <button class="btn btn-primary" id="btn-add-appt">+ Schedule Appointment</button>`;
    Utils.$('#btn-add-appt').addEventListener('click', () => showAppointmentModal());

    container.innerHTML = `
      <div class="card p-0">
        <div class="card-header flex-wrap gap-4">
          <div class="filter-bar m-0" style="flex-wrap:nowrap;align-items:center;">
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
              <option value="Video Call">Video Calls</option>
              <option value="Store Visit">Store Visits</option>
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
              ${!a.clientId ? `<button class="btn btn-icon btn-ghost sm" title="Create Client from this booking" onclick="CRM.createClientFromBooking('${a.id}')">👤➕</button>` : ''}
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

    // --- TidyCal sync (non-blocking) ---
    const syncBtn = Utils.$('#btn-sync-tidycal');
    let syncing = false;

    async function syncTidyCal(silent) {
      if (syncing) return;
      syncing = true;
      if (syncBtn) { syncBtn.disabled = true; syncBtn.innerHTML = '&#8635; Syncing...'; }
      try {
        const res = await fetch('/api/tidycal-sync');
        const result = await res.json();
        if (result && result.ok) {
          if ((result.synced || 0) > 0 || (result.updated || 0) > 0) {
            await Store.refresh(Store.COLLECTIONS.APPOINTMENTS);
            refreshTable();
            Utils.showToast(`TidyCal: ${result.synced || 0} new, ${result.updated || 0} updated.`);
          } else if (!silent) {
            Utils.showToast('TidyCal: already up to date.', 'info');
          }
        } else if (!silent) {
          Utils.showToast('TidyCal sync failed. Check console.', 'error');
          console.error('TidyCal sync error:', result);
        }
      } catch (err) {
        if (!silent) Utils.showToast('TidyCal sync failed. Check console.', 'error');
        console.error('TidyCal sync error:', err);
      } finally {
        syncing = false;
        if (syncBtn) { syncBtn.disabled = false; syncBtn.innerHTML = '&#8635; Sync TidyCal'; }
      }
    }

    if (syncBtn) syncBtn.addEventListener('click', () => syncTidyCal(false));
    // Background sync on view load: table renders instantly from cache,
    // new bookings appear a moment later if any arrived.
    syncTidyCal(true);
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
    actions.innerHTML = ``;

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
      { id: 'Delivered',            title: 'Delivered' },
      { id: 'Completed',            title: 'Completed' }
    ];

    const orders = Store.getAll(Store.COLLECTIONS.ORDERS);
    orders.sort((a, b) => new Date(a.deadline) - new Date(b.deadline));

    // Consolidated filter groups — the 15 individual pipeline stages still
    // exist underneath (used by the "Move to stage" dropdown on each card),
    // but as a filter UI, 15 separate chips was too granular to scan at a
    // glance. Grouped into the same 3 buckets already used elsewhere in the
    // dashboard (Workshop / Transit / Awaiting), plus Delivered and
    // Completed kept separate since they're meaningfully different stages
    // to see at a glance in a live pipeline view.
    const chipGroups = [
      { id: 'all',       title: 'All',             icon: '🗂️', statuses: null },
      { id: 'workshop',  title: 'In Workshop',      icon: '🧵', statuses: ['New','In Design','Fabric Sourced','In Production','Fitting'] },
      { id: 'transit',   title: 'In Transit',       icon: '🚚', statuses: ['Ready','Shipped to Shashank','At Shashank','In Transit'] },
      { id: 'awaiting',  title: 'Awaiting Action',  icon: '⏳', statuses: ['Awaiting Payment','Received in Australia','Final Fitting','Cleared for Delivery'] },
      { id: 'delivered', title: 'Delivered',        icon: '✅', statuses: ['Delivered'] },
      { id: 'completed', title: 'Completed',        icon: '🏁', statuses: ['Completed'] }
    ];
    const groupCounts = chipGroups.reduce((acc, g) => {
      acc[g.id] = g.statuses ? orders.filter(o => g.statuses.includes(o.status)).length : orders.length;
      return acc;
    }, {});

    const counts = stages.reduce((acc, s) => {
      acc[s.id] = orders.filter(o => o.status === s.id).length;
      return acc;
    }, {});
    const totalValue = orders.reduce((sum, o) => sum + (o.price || 0), 0);

    container.innerHTML = `
      <!-- Summary strip -->
      <div class="d-grid gap-4 mb-5 animate-fade-in" style="grid-template-columns:repeat(auto-fit,minmax(180px,1fr))">
        <div class="stat-card" style="cursor:pointer" onclick="document.querySelector('.order-filter-chip[data-stage=&quot;all&quot;]').click()">
          <div class="stat-card-header"><span class="stat-card-icon gold">🧵</span></div>
          <div class="stat-card-value">${orders.length}</div>
          <div class="stat-card-label">Total Orders</div>
        </div>
        <div class="stat-card" style="cursor:pointer" onclick="document.querySelector('.order-filter-chip[data-stage=&quot;all&quot;]').click()">
          <div class="stat-card-header"><span class="stat-card-icon blue">💰</span></div>
          <div class="stat-card-value">${Utils.formatCurrency(totalValue)}</div>
          <div class="stat-card-label">Pipeline Value</div>
        </div>
        <div class="stat-card" style="cursor:pointer" onclick="document.querySelector('.order-filter-chip[data-stage=&quot;delivered&quot;]').click()">
          <div class="stat-card-header"><span class="stat-card-icon green">✅</span></div>
          <div class="stat-card-value">${counts['Delivered'] || 0}</div>
          <div class="stat-card-label">Delivered</div>
        </div>
        <div class="stat-card" style="cursor:pointer" onclick="document.querySelector('.order-filter-chip[data-stage=&quot;workshop&quot;]').click()">
          <div class="stat-card-header"><span class="stat-card-icon purple">⚙️</span></div>
          <div class="stat-card-value">${(counts['In Design']||0)+(counts['Fabric Sourced']||0)+(counts['In Production']||0)+(counts['Fitting']||0)}</div>
          <div class="stat-card-label">In Workshop</div>
        </div>
      </div>

      <!-- Filter chips — consolidated into 6 concise groups with icons -->
      <div class="card p-4 mb-4 animate-fade-in stagger-1" style="margin-top: 18px;">
        <div class="d-flex flex-wrap gap-2 items-center">
          ${chipGroups.map((g, idx) => `
            <button class="btn btn-sm ${idx === 0 ? 'btn-primary' : 'btn-secondary'} order-filter-chip" data-stage="${g.id}">
              ${g.icon} ${g.title} <span class="badge badge-muted" style="margin-left:6px">${groupCounts[g.id]}</span>
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
      const group = chipGroups.find(g => g.id === stageFilter);
      const list = (!group || !group.statuses) ? orders : orders.filter(o => group.statuses.includes(o.status));
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

      // Statuses where deadline is no longer actionable
      const DONE_STATUSES = ['Ready','Shipped to Shashank','At Shashank','In Transit',
        'Awaiting Payment','Received in Australia','Final Fitting','Cleared for Delivery','Delivered','Completed'];

      list.forEach(o => {
        const days = Utils.daysFromNow(o.deadline);
        const isDone = DONE_STATUSES.includes(o.status);
        const isOverdue = !isDone && o.deadline && days < 0;
        const isWarning = !isDone && o.deadline && days >= 0 && days <= 7;
        const deadlineClass = isDone ? 'text-muted'
          : isOverdue ? 'text-danger font-semibold'
          : isWarning ? 'text-warning font-semibold'
          : 'text-muted';
        const deadlineText = isDone ? 'Done'
          : !o.deadline ? 'No deadline'
          : days === 0 ? 'Due today'
          : isOverdue ? Math.abs(days) + ' days overdue'
          : days + ' days left';
        const stageColor =
          o.status === 'Delivered' ? 'badge-success'
          : o.status === 'Completed' ? 'badge-success'
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

        const cardBorder = isOverdue ? '2px solid #f59e0b' : isWarning ? '1px solid #f59e0b' : '';
        const cardBg = isOverdue ? 'rgba(245,158,11,0.06)' : '';
        const card = Utils.createElement('div', {
          className: 'card p-0 cursor-pointer',
          style: 'overflow:hidden;transition:transform .15s ease, border-color .15s ease' + (cardBorder ? ';border:' + cardBorder : '') + (cardBg ? ';background:' + cardBg : ''),
          onclick: (e) => { if (e.target.closest('select')) return; showOrderDetails(o.id); },
          onmouseenter: function() { this.style.transform = 'translateY(-2px)'; this.style.borderColor = 'var(--pc-gold)'; },
          onmouseleave: function() { this.style.transform = 'none'; this.style.borderColor = isOverdue ? '#f59e0b' : isWarning ? '#f59e0b' : ''; }
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
  // ==========================================
  // DOCUMENT INTAKE — shared helpers
  // Upload a reference document (PDF/image/Word) against an order or
  // invoice, optionally have Claude extract structured fields from it.
  // Used by both the order form (below) and the invoice form (accounting.js
  // calls these via CRM.uploadIntakeDocument / CRM.extractIntakeDocument).
  // ==========================================
  async function callDocumentIntake(action, params) {
    const client = Store.getClient();
    const { data: sessionData } = await client.auth.getSession();
    const token = sessionData && sessionData.session ? sessionData.session.access_token : null;
    if (!token) { Utils.showToast('Your session has expired. Please log in again.', 'error'); return { ok: false }; }
    try {
      const res = await fetch('/api/document-intake', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, token, ...params })
      });
      const result = await res.json();
      if (!result.ok) Utils.showToast(result.error || 'Document action failed.', 'error');
      return result;
    } catch (e) {
      Utils.showToast('Network error contacting document service.', 'error');
      return { ok: false, error: e.message };
    }
  }

  function readFileAsBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function uploadIntakeDocument(kind, file) {
    if (file.size > 13 * 1024 * 1024) { Utils.showToast('File too large (max ~13MB).', 'error'); return null; }
    const fileBase64 = await readFileAsBase64(file);
    const result = await callDocumentIntake('upload', { kind, fileBase64, fileName: file.name, mimeType: file.type });
    return result.ok ? result.document : null;
  }

  async function extractIntakeDocument(documentId) {
    const result = await callDocumentIntake('extract', { documentId });
    return result.ok ? result.extracted : null;
  }

  async function linkIntakeDocument(documentId, orderId, invoiceId) {
    return callDocumentIntake('link', { documentId, orderId, invoiceId });
  }

  async function listIntakeDocuments(orderId, invoiceId) {
    const result = await callDocumentIntake('list', { orderId, invoiceId });
    return result.ok ? result.documents : [];
  }

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

  // Boutique colour palette - shade card references used in orders.
  // Every code visible on the two physical shade cards (Manish Embroidery
  // Yarn, Neelam/Telephone Embroidery Yarn) is listed here — full coverage,
  // not a representative sample — because an order needs to be able to
  // reference the exact shade code that was actually used, for reordering
  // and production tracking.
  //
  // IMPORTANT — read this before trusting the colour swatch visually:
  // the CODES are transcribed directly and are accurate. The HEX colours
  // are NOT individually verified against each swatch — with 500-800+
  // near-identical thread tassels per card, distinguishing e.g. shade "47"
  // from "47-D" (a darker version of the same base) by eye from a photo
  // isn't reliable. Instead, each row is anchored to 2-4 real colours read
  // from that row's photo, and every code in between is interpolated
  // smoothly across that range in printed order. This means: the CODE is
  // exact, the general hue/family is right, but the precise shade for any
  // single code is an approximation — always confirm the exact code
  // against the physical card before cutting fabric or embroidery thread.
  function interpolateHex(hexA, hexB, t) {
    const a = parseInt(hexA.slice(1), 16), b = parseInt(hexB.slice(1), 16);
    const ar=(a>>16)&255, ag=(a>>8)&255, ab=a&255;
    const br=(b>>16)&255, bg=(b>>8)&255, bb=b&255;
    const r = Math.round(ar+(br-ar)*t), g = Math.round(ag+(bg-ag)*t), bl = Math.round(ab+(bb-ab)*t);
    return '#' + [r,g,bl].map(x => x.toString(16).padStart(2,'0')).join('');
  }
  function shadeHex(hex, pct) {
    // pct > 0 lightens toward white, pct < 0 darkens toward black
    const n = parseInt(hex.slice(1), 16);
    const r = (n>>16)&255, g = (n>>8)&255, b = n&255;
    const f = pct < 0 ? 0 : 255, p = Math.abs(pct);
    const mix = (c) => Math.round(c + (f - c) * p);
    return '#' + [mix(r), mix(g), mix(b)].map(x => Math.max(0,Math.min(255,x)).toString(16).padStart(2,'0')).join('');
  }
  // Builds a CSS background that reads as a bundled thread tassel rather
  // than a flat colour chip: thin vertical strand lines (a repeating
  // gradient) for texture, plus a subtle top-sheen/bottom-shadow so it
  // has some dimension, similar to how the thread sits on the real card.
  function threadTassleCss(hex) {
    const light = shadeHex(hex, 0.22);
    const dark = shadeHex(hex, -0.18);
    return `background: repeating-linear-gradient(90deg, ${dark} 0px, ${hex} 1.5px, ${light} 3px, ${hex} 4.5px);` +
      `box-shadow: inset 0 3px 4px rgba(255,255,255,0.3), inset 0 -4px 6px rgba(0,0,0,0.3), inset 2px 0 2px rgba(0,0,0,0.15);`;
  }
  // Variegated threads (code starts with V- or VD-) are genuinely
  // multi-coloured along the strand — a flat gradient would misrepresent
  // them, so these get a diagonal multi-hue stripe instead.
  function isVariegatedCode(code) { return /^VD?-/i.test(code); }
  function variegatedTassleCss(hex) {
    const c1 = shadeHex(hex, 0.15), c2 = hex, c3 = shadeHex(hex, -0.2), c4 = shadeHex(hex, 0.35);
    return `background: repeating-linear-gradient(35deg, ${c1} 0px, ${c2} 3px, ${c3} 6px, ${c4} 9px, ${c2} 12px);` +
      `box-shadow: inset 0 3px 4px rgba(255,255,255,0.25), inset 0 -4px 6px rgba(0,0,0,0.3);`;
  }
  function buildShadeRow(row, codesCsv, anchors) {
    const codes = codesCsv.split(',').map(c => c.trim());
    const n = codes.length;
    const segs = anchors.length - 1;
    return codes.map((code, i) => {
      const t = n > 1 ? i / (n - 1) : 0;
      const segT = t * segs;
      const segIdx = Math.min(Math.floor(segT), segs - 1);
      const localT = segT - segIdx;
      return { code, row, hex: interpolateHex(anchors[segIdx], anchors[segIdx + 1], localT) };
    });
  }

  const MANISH_SHADES = [].concat(
    buildShadeRow(1, '1-LL,1-L,1,2,3,4,5,6-L,6,7,8-LL,8-L,8,9,10,11,11-D,12,12-M,13,13-M,13-C,13-N,14-LL', ['#F5F3D6','#C7D94A','#4E9A3B','#1F5C2E']),
    buildShadeRow(2, '14-L,14,15,16,17,17-D,18-LL,18-L,18,18-N,19,20,21,22,23,24,25,25-N,26-LL,26-L,26,26-M,26-D,27', ['#2E6B3E','#7A9E5A','#E77FA6','#D6224F','#7A1128']),
    buildShadeRow(3, '27-D,27-DD,28-LL,28-L,28,29,29-N,30,31,31-D,31-DD,31-DN,32-LL,32-L,32,32-D,33,34,35,36,37-LL,37-L,37,DL-37', ['#5A0F1C','#7A6FA8','#5B6470','#B9A8CC']),
    buildShadeRow(4, '38,39,40,41,42,42-D,43-L,43,44,45,46,47,47-N,47-D,47-DD,47-DN,48-L,48,MD-48,49,50,51,51-RM,51-RDM', ['#9B7BB8','#5C3D82','#8B2D6C','#9E2D6E','#A9C4E0','#5B87C4']),
    buildShadeRow(5, '51-RLM,52,52-N,52-D,53-L,53,53-M,54,54-D,54-DD,54-R,55-LLL,55-LL,55-L,55,56,57,58,59,60,60-B,61,61-D', ['#4A6FA8','#1E3A5F','#F2EFD9','#F0C93B','#E8862C']),
    buildShadeRow(6, '61-DD,62,62-D,62-DD,63-L,63,64,65,66,67,68,69,70,70-D,70-DD,71-LL,71-L,MD-71,71,72,72-D,72-DD,73-LL,73-L', ['#C0401A','#E24E1F','#1E3A5F','#3C9BB0','#1F5C7A']),
    buildShadeRow(7, '73,P-73,74,MD-74,75,76,77,79-L,79,80,80-N,81,81-N,82,82-M,82-N,83,83-M,84,84-M,84-DM,84-D,85-L', ['#3C9BB0','#C9298A','#D9642B','#F4A9C4','#4FB8C9','#F2C9A8']),
    buildShadeRow(8, '85,86,87,88,89,90-L,90,90-D,91-LL,91-L,91,92,93,94,95,95-N,96-LL,96-L,96,97,98,99,100,100-D', ['#F2C9A8','#1F5C7A','#4FB8C9','#5FBFA8','#F2A6B8','#D82030']),
    buildShadeRow(9, 'MD-100R,101-LL,101-L,101,102,103,103-M,104,104-M,105,105-M,106,107,108-LL,108-L,108,108-D,109-LLL,109-LL,109-L,109,109-D,110,111', ['#D8E8D8','#7ED9C0','#3C9BB0','#E0C79A','#B08858','#8A5A32']),
    buildShadeRow(10, '112,112-D,113,114-L,114,115,116,117,118,119,120,120-D,120-DD,120-N,121-L,121,122,123,123-D,123-DD,P-123,124-LL,124-LLN,124-L', ['#8A5A32','#E8A88C','#C0464C','#4A5FA8','#6B2D5C','#D9C89E']),
    buildShadeRow(11, '124,125,126,126-D,127,128,129,130,131,132-LL,132-L,132,133,133-N,134-L,134,MD-134,134-D,134-N,135,136-LL,136-L,136,136-C', ['#D9C89E','#E8B4C8','#D6224F','#F2EFD9','#8A9E4E','#C9B87A']),
    buildShadeRow(12, '137-L,137,137-C,138,138-C,139,139-C,139-D,140-LL,140-L,140,141,142-D,143-L,143,143-M,144,145-LL,145-L,145,145-LN,146,146-N', ['#C9B87A','#B8963E','#E8B830','#F0D95A','#D9B8D0','#9E6BA0']),
    buildShadeRow(13, '147,147-D,147-DD,148-L,148,148-D,149,150,151,152,153-LL,153-L,153,154,155,156,157-LL,157-L,157,157-D,158,159,160,161-LL', ['#6B2D5C','#7A2848','#C9773A','#E8A870','#8A9E4E','#6B5A2E']),
    buildShadeRow(14, '161-L,161-N,161-D,162-LLL,162-LL,162-L,162,163-LL,163-L,163,164,165,MD-165,166,166-M,167,167-M,168,168-D,168-M,169,169-M,170-LL', ['#6B5A2E','#8A9E4E','#4A5A2E','#7A8A3E','#2E7A6B']),
    buildShadeRow(15, '170-L,170,170-M,170-N,171-L,171,171-M,MD-171,172,173,174,175-LLL,175-LL,175-L,175,MD-175,176,177,178-L,178-LN,178,179,180,180-D', ['#2E7A6B','#1F5C4A','#D9C88A','#E8A88C','#9E4A5A']),
    buildShadeRow(16, '180-DD,181-LL,181-L,181,181-N,181-D,181-DD,182-L,182,183,P-183,MD-183,184-L,184,185,186,DD-186,187,188,189-LL,189-L,189,190-L,190', ['#7A1F30','#8A9E4E','#4A6B4E','#4FA8D0','#B8963E','#E8A8B8']),
    buildShadeRow(17, '190-N,191,191-N,192,192-M,192-N,193,193-M,194,194-M,194-DM,194-D,195-D,196,197,198,199,200,200-D,200-DD,201-LL,201-L,201', ['#E8A8B8','#D0224E','#7A1128','#E88A2E','#D6224F']),
    buildShadeRow(18, '202,202-D,202-N,203,204,205,206,208,209,210,211,MD-211,212,212-D,213,214,215-L,215,216,217,218,218-N,218-DN,218-D', ['#D0224E','#E88A2E','#8A9E4E','#D9789E']),
    buildShadeRow(19, '219,220,221,222-L,222,222-D,223,224-LL,224-L,224,225,225-D,225-DD,226-LL,226-L,226,227,228,229,230,231,232,233,234-LL', ['#3E8A7A','#5A8A6B','#7A2848','#8A9E4E','#6B7A3E']),
    buildShadeRow(20, '234-L,234-LM,234-M,234,235,236,237,238-L,238,239-LL,239-L,239-LN,239,239-N,240-LL,240-L,240-LN,240,241,242-L,242,242-M,242-DM,242-D', ['#6B7A3E','#4A5A2E','#7A2848','#8A2848']),
    buildShadeRow(21, '242-N,243,244,245,245-N,246,247,247-D,247-DD,248-LL,248-L,248,249,250,251,252-L,252,252-N,252-D,252-P,253-L,MD-253', ['#8A2848','#B82030','#7A3E6B','#C97A9E','#8A9E4E']),
    buildShadeRow(22, '254-L,254,255,261-L,261,261-D,262-L,262,263-LL,263-L,266,272-LL,272-L,272,272-D,272-DD,273-LL,273-L,273,273-D,273-DD,278-LL,278-L', ['#D9C89E','#8A9EA0','#5A6A6E','#B0A090']),
    buildShadeRow(23, '278,279,280,285-L,285,290,291,292,DC-292,293,MD-293,294,294-D,MD-294,295,338-LL,338-L,338,348,349,350,351,352,354,360,361,362,376', ['#B0A090','#7A4E7A','#E8A8B8','#3E6B8A','#C94A2E']),
    buildShadeRow(24, '332-LL,332-L,332-LM,332-LNM,332,332-M,332-D,332-DM,332-OD,DP-333,MD-335', ['#A9C4E0','#4A5A9E','#2E3A6E']),
    buildShadeRow(25, '377,391-L,391,392,393,394,394-D,395,395-N,395-D,402,P-402,403,403-N,404,405,421,422,422-D,MP-422,MD-423,MD-424,M-444,444', ['#C94A2E','#E8873E','#2E7A6B','#5A3E7A','#7A2838']),
    buildShadeRow(26, '450,451,452-LL,452-L,452,452-D,456,457,458,459,491,492,493-S,P-528,MD-554,MD-563,P-592,P-593,612-M,DP-642,MD-661,711,712,713', ['#D9C8A0','#7A9E5A','#D9789E','#2E8A7A']),
    buildShadeRow(27, '722-N,732-LL,732-L,732,MD-741,768,786,846-M,847-M,938,939,P-1006,P-1007,1017,MD-1173,MD-1198,MD-1233,MD-1359,MD-1395,MD-1638,MD-1649,KORA,WHITE,BLACK', ['#2E5A8A','#4A5A9E','#D9789E','#5A7A3E','#E8D9B8','#FAFAF7','#1A1A1A']),
    // Row 28 — variegated (multi-colour-in-one-strand) threads. A single
    // hex can't represent a variegated thread honestly; these get one
    // representative mid-tone rather than a false single-colour claim —
    // check the physical card directly for these specifically.
    buildShadeRow(28, 'V-34ND,V-62D,V-81S,V-83S,V-83SND,V-96D,V-109LLS,V-109,V-109LA,V-135LA,V-135D,V-157LLAX,V-159PX,V-159LLX,VD-21AMT,V-218,V-218D,V-239L,V-239ND,VD-502,VD-622,VD-623,V-881AMT,V-96OS', ['#9E8A6B','#8A6B9E','#6B9E8A','#9E6B7A'])
  );

  const NEELAM_SHADES = [].concat(
    buildShadeRow(1, '1-LL,1-L,1,2,3,4,5,6,7,8-L,8,9,10,11,11-D,12,13,14-LL,14-L,14,15,16,17,17-D,17-DD', ['#F2EFB8','#D9E04A','#8FC241','#4E9A3B','#1F5C2E']),
    buildShadeRow(2, '18-LL,18-L,18,19,20,21,22,23,24,24-LL,25,26,27,27-D,28-LL,28-L,28,29,30,31,32,32-L,33,34', ['#2E6B3E','#E8A8C0','#D6224F','#B8102E','#8A7BB0','#5B6470']),
    buildShadeRow(3, '35,36,36-D,37-L,37,38,39,40,41,42-D,43,44,45,46,47-D,48-LL,48-L,48,49,50,51,52', ['#1A1A2E','#8A7BB0','#5A2E5A','#9E2D6E','#D0224E','#7CA8D9']),
    buildShadeRow(4, '53,54,54-D,54-DD,55-LL,55-L,55,56,57,58,59,60,61,62,62-D,63-L,63,64,65,66,66-D,67,68,69,70', ['#4A5FA8','#1A1A2E','#E8D9A8','#F0C93B','#D6224F','#7CA8D9','#4A5FA8']),
    buildShadeRow(5, '70-D,70-DD,71-LL,71,72,72-D,73-LL,73,74,75,76,77,78,79-LL,79-L,79,80,81,82,83,84,85', ['#1E3A5F','#4FA8D0','#E8862C','#D0224E','#F4A9C4','#D82030','#4FA8D0','#E8A88C']),
    buildShadeRow(6, '86,87,88,89,90-L,90,90-D,91-LL,91,92,93,94,95,96-LL,96-L,96,97,98,99,100,100-D,101-LL,101-L,101', ['#4FA8D0','#1A1A2E','#4FB8C9','#F4A9C4','#D82030','#7ED9C0']),
    buildShadeRow(7, '102,103,104,105,108,108-D,109-LL,109-L,109,110,111,112,112-D,113,114,114-LL,114-L,115,116,117,118,119,120,120-D', ['#3C9BB0','#8A5A32','#E0C79A','#B08858','#8A5A32','#E8A88C']),
    buildShadeRow(8, '120-DD,121,122,123,124,125,126,127,128,129,130,131,132-LL,132-L,132,133,134,134-D,136-L,136,137,138,139,139-D', ['#C0464C','#4FA8D0','#D0224E','#F2EFD9','#B8963E']),
    buildShadeRow(9, '140,141,142,144,145,146,147,147-D,148,149,150,151,152,153,153-L,153-LL,154,155,156,157,157-D,158,158-D', ['#E8873E','#6B2D5C','#7A2848','#8A9E4E','#E8A870','#7A2848']),
    buildShadeRow(10, '159,160,161,162,163,163-LL,163-L,164,165,166,167,168,169,170,170-LL,170-L,171,172,173,174,174-D,174-DD,175,175-L', ['#6B5A2E','#E8E0A0','#8A9E4E','#2E7A5A','#1F5C4A','#B8963E']),
    buildShadeRow(11, '175-D,176,177,178,179,180,180-D,181,182,183,184,184-L,185,186,187,188,189,190-L,190,191,192,193,194,194-D,195', ['#1F5C4A','#7A8A3E','#8A6B2E','#7A2848','#4FA8D0','#E8862C','#D9789E']),
    buildShadeRow(12, '196,197,198,198-L,199,200,201,202,203,204,205,206,207,208,209,210,211,212,213,214,215-L,215-D,215,216,217', ['#7A2848','#E8862C','#D0224E','#7A2828','#8A6B4E','#E88A2E']),
    buildShadeRow(13, '218,218-D,219,220,221,222,222-D,223,224,225,225-D,226-LL,226-L,226,227,228,229,230,231,232,233,234-L,234,235,236', ['#E82838','#8A9E4E','#4FA8D0','#B8963E','#6B5A2E','#7A2828','#4A6B4E']),
    buildShadeRow(14, '237,238,239-LL,239-L,240-LL,240-L,240,241,242-L,242,242-D,243,244,245,246,247,247-D,248-LL,248-L,248,249,250,251,252,252-D,253,253-D', ['#8A6B4E','#7A2828','#8A6B2E','#B8963E','#4A2818','#8A6B4E','#6B5A2E']),
    buildShadeRow(15, '266,273-L,273-D,290,291,292,293,294,295,313,323,332-LL,332-L,332,332-D,332-DD,348,348-LL,349,350,351,352', ['#1A1A2E','#E8A8B8','#D0224E','#1F5C4A','#7A4E9E','#4A5FA8']),
    buildShadeRow(16, '393,394,394-D,395,401,402,403,404,405,406,418,422,423,504,506,507,508,509,510,511,512,513,514,515,516', ['#3E8A9E','#D0224E','#E8873E','#4A2818','#1F5C4A','#2E5A3E']),
    buildShadeRow(17, '517,518,519,520,521,522,523,524,525,526,527,528,529,530,L-531,532,533,534,535,536,537,538,539,540,541', ['#8A6B2E','#E8873E','#8A9E4E','#D0224E','#7A2848','#4A5FA8']),
    buildShadeRow(18, '542,543,544,545,546,547,549,550,551,552,553,554,555,564,565,573,576,578,594,618,692,693,WHITE,BLACK,KORA', ['#5A3E5A','#7A2848','#D9789E','#4A9E9E','#D0224E','#FAFAF7','#1A1A1A','#E8D9B8']),
    buildShadeRow(19, '701,702,703,704,705,706,707,708,709,710,711,712,713,714,715,716,717,718,719,720,721,722,723,724,725', ['#B0A090','#7A6B2E','#D9789E','#4A2818','#8A6B4E','#3E6B4E','#D9789E','#8A6B4E']),
    buildShadeRow(20, '726,727,728,729,730,731,732,733,734,735,736,737,738,739,740,741,742,743,744,745,746,747,748,749,750', ['#1F5C4A','#4A5FA8','#D0224E','#8A9E4E','#1F5C4A','#7A2848','#5B6470','#D0224E','#E8A88C']),
    buildShadeRow(21, '751,752,753,754,755,756,757,758,759,760,761,762,763,764,765,766,767,768,769,770,771,772,773,774,775', ['#D0224E','#5B6470','#E8A88C','#8A6B2E','#D9C89E','#B8963E','#E8A8C0']),
    buildShadeRow(22, '776,777,778,779,780,781,782,783,784,785,786,787,788,789,790,791,792,793,794,795,796,797,798,799,800', ['#8A9E4E','#E8A88C','#D9C89E','#8A6B4E','#D0224E','#7A2848','#4A2E5A','#3E6B4E','#5A3E2E']),
    buildShadeRow(23, '801,802,803,804,805,806,807,808,809,810,811,812,813,814,815,816,817,818,819,820,821,822,823,824,825', ['#B0A090','#8A6B2E','#4FA8D0','#7A4E9E','#D0224E','#8A6B4E','#3E6B4E','#E8873E','#4A2818','#8A6B4E']),
    buildShadeRow(24, '826,827,828,829,830,831,832,833,834,835,836,837,838,839,840,841,842,843,844,845,846,847,848,849,850', ['#3E2818','#3E6B4E','#8A6B4E','#D9789E','#D0224E','#1A1A1A','#E8873E','#4A6B4E','#D0224E','#8A6B4E'])
  );

  const DEFAULT_COLOUR_PALETTE = [
    { code: 'Neelam 92', name: 'Neelam Shade 92', hex: '#EDE6D6' },
    { code: '26',        name: 'Shade 26 (Bridal)', hex: '#8B0E1F' },
    { code: '53',        name: 'Shade 53', hex: '#0F5A5E' },
    { code: '55L',       name: 'Shade 55L', hex: '#C9A227' },
    { code: '77',        name: 'Shade 77', hex: '#D9642B' },
    { code: '128',       name: 'Shade 128', hex: '#E8B4C8' },
    { code: '132',       name: 'Shade 132', hex: '#6B2D5C' },
    { code: '157',       name: 'Shade 157', hex: '#3E5F8A' },
    { code: '157L',      name: 'Shade 157L', hex: '#7C9CC4' },
    { code: '38',        name: 'Shade 38 (Purple)', hex: '#9B7BB8' },
    { code: '39',        name: 'Shade 39 (Purple)', hex: '#7B5AA0' },
    { code: '40',        name: 'Shade 40 (Purple)', hex: '#5C3D82' }
  ];

  function getColourPalette() {
    const s = Store.getSettings();
    return (s && Array.isArray(s.colourPalette) && s.colourPalette.length) ? s.colourPalette : DEFAULT_COLOUR_PALETTE;
  }

  function findPaletteColour(text) {
    if (!text) return null;
    const t = String(text).toLowerCase();
    let best = null;
    for (const p of getColourPalette()) {
      const code = String(p.code).toLowerCase();
      if (t === code || t.includes(code)) {
        if (!best || String(p.code).length > String(best.code).length) best = p;
      }
    }
    return best;
  }

  function renderColourSwatches(inputName) {
    return `<div class="d-flex gap-2 mt-2">
        <button type="button" class="btn btn-secondary btn-sm shade-card-btn" data-target="${inputName}" data-brand="manish">🧵 Manish Shade Card</button>
        <button type="button" class="btn btn-secondary btn-sm shade-card-btn" data-target="${inputName}" data-brand="neelam">🧵 Neelam Shade Card</button>
      </div>
      <div class="text-xs text-muted mt-1">Open a shade card to pick a colour, or type freely for anything not listed.</div>`;
  }

  function showShadeCardPicker(brand, inputName, modalEl) {
    const shades = brand === 'manish' ? MANISH_SHADES : NEELAM_SHADES;
    const brandLabel = brand === 'manish' ? 'Manish Embroidery Yarn' : 'Neelam (Telephone) Embroidery Yarn';

    // Group by row, preserving each row's printed left-to-right order —
    // matches how the physical card is actually laid out (numbered tabs
    // down the left side, one row of tassels per tab), so this is a quick
    // visual lookup against the real card rather than one long flat list.
    const rows = {};
    shades.forEach(s => { (rows[s.row] = rows[s.row] || []).push(s); });
    const rowNumbers = Object.keys(rows).map(Number).sort((a, b) => a - b);

    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.65);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;';
    overlay.innerHTML = `
      <div style="background:var(--pc-bg-card);border:1px solid var(--pc-border);border-radius:var(--radius-lg);max-width:820px;width:100%;max-height:85vh;display:flex;flex-direction:column;box-shadow:var(--pc-shadow-xl);">
        <div style="display:flex;justify-content:space-between;align-items:center;padding:16px 20px;border-bottom:1px solid var(--pc-border);flex-shrink:0;">
          <div style="font-weight:600;color:var(--pc-gold);font-family:var(--font-display)">${brandLabel} — Shade Card</div>
          <button type="button" class="shade-picker-close" style="background:none;border:none;color:var(--pc-text-muted);font-size:20px;cursor:pointer;line-height:1;">✕</button>
        </div>
        <div style="padding:16px 20px;overflow-y:auto;flex:1;">
          <div class="text-xs text-muted mb-3">Arranged row-by-row to match the physical card — colours are a visual read of the photo, not a lab-accurate match. Tap a swatch to select it, or check the physical card for the exact number and type it in directly.</div>
          ${rowNumbers.map(rowNum => `
            <div style="margin-bottom:14px;">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
                <span style="background:#1a1a1a;color:#fff;font-size:10px;font-weight:700;padding:2px 7px;border-radius:4px;">${rowNum}</span>
                <div style="flex:1;height:1px;background:var(--pc-border);"></div>
              </div>
              <div style="display:flex;flex-wrap:nowrap;overflow-x:auto;gap:6px;padding-bottom:4px;">
                ${rows[rowNum].map(s => `
                  <button type="button" class="shade-swatch-btn" data-code="${Utils.sanitizeHTML(s.code)}" title="${Utils.sanitizeHTML(s.code)}${isVariegatedCode(s.code) ? ' (variegated — check physical card)' : ''}"
                    style="flex-shrink:0;display:flex;flex-direction:column;align-items:center;gap:3px;padding:6px 2px 3px;width:34px;border:1px solid var(--pc-border);border-radius:6px;background:rgba(255,255,255,0.02);cursor:pointer;">
                    <span style="width:16px;height:42px;border-radius:2px 2px 45% 45%;border:1px solid rgba(0,0,0,0.3);display:block;${isVariegatedCode(s.code) ? variegatedTassleCss(s.hex) : threadTassleCss(s.hex)}"></span>
                    <span style="font-size:8px;color:var(--pc-text-muted);white-space:nowrap;">${Utils.sanitizeHTML(s.code)}</span>
                  </button>`).join('')}
              </div>
            </div>`).join('')}
        </div>
      </div>`;
    document.body.appendChild(overlay);

    const close = () => overlay.remove();
    overlay.querySelector('.shade-picker-close').addEventListener('click', close);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    overlay.querySelectorAll('.shade-swatch-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const input = modalEl.querySelector(`[name="${inputName}"]`);
        if (input) {
          const label = (brand === 'manish' ? 'Manish ' : 'Neelam ') + btn.dataset.code;
          const cur = input.value.trim();
          if (!cur || !cur.toLowerCase().includes(label.toLowerCase())) {
            input.value = cur ? cur + ', ' + label : label;
            input.dispatchEvent(new Event('input', { bubbles: true }));
          }
        }
        close();
      });
    });
  }

  function wireColourSwatches(modalEl) {
    Utils.$$('.shade-card-btn', modalEl).forEach(btn => {
      btn.addEventListener('click', () => showShadeCardPicker(btn.dataset.brand, btn.dataset.target, modalEl));
    });
  }

  function showOrderModal(orderId = null) {
    const isEdit = !!orderId;
    const order = isEdit ? Store.getById(Store.COLLECTIONS.ORDERS, orderId) : null;
    const clients = Store.getAll(Store.COLLECTIONS.CLIENTS);
    let uploadedDocId = null;
    App.showModal({
      title: isEdit ? 'Edit Order' : 'New Custom Order',
      content: `
        <form id="order-form" class="animate-fade-in-scale">
          ${!isEdit ? `
          <div class="form-group p-3 rounded-md" style="background:rgba(139,92,246,0.06);border:1px solid var(--pc-border)">
            <label class="form-label">📎 Reference Document (optional)</label>
            <div class="text-xs text-muted mb-2">Upload a scope-of-work PDF, scanned invoice, or photo — Claude can read it and pre-fill the fields below for you to review.</div>
            <input type="file" id="order-doc-file" accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx" class="form-input">
            <div class="d-flex gap-2 mt-2">
              <button type="button" class="btn btn-secondary btn-sm" id="order-doc-upload-btn">Upload</button>
              <button type="button" class="btn btn-primary btn-sm d-none" id="order-doc-extract-btn">✨ Auto-fill from Document</button>
            </div>
            <div class="text-xs mt-2" id="order-doc-status"></div>
          </div>` : ''}
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
              <input type="text" inputmode="decimal" autocomplete="off" name="price" class="form-input" min="0" required value="${order?order.price:''}">
            </div>
            <div class="form-group">
              <label class="form-label">Deadline <span class="required">*</span></label>
              <input type="date" name="deadline" class="form-input" required value="${order?order.deadline:''}">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Deposit Paid Now (AUD)</label>
              <input type="text" inputmode="decimal" autocomplete="off" name="depositPaid" class="form-input" placeholder="0.00" value="">
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
                ${renderColourSwatches('colourRef')}
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
        const price = parseFloat((fd.get('price') || '').replace(',', '.'));
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
          await Store.update(Store.COLLECTIONS.ORDERS, orderId, orderData);
          // Auto-sync removed by design: editing an order no longer touches
          // its invoice. Use the explicit "Sync Invoice from Orders" button
          // on the invoice/project view to pull updated prices in.
          Utils.showToast('Order updated.');
        } else {
          // Assign a human-facing order code (UUID stays the primary key).
          orderData.orderCode = generateOrderCode(productType);
          const createdOrder = await Store.create(Store.COLLECTIONS.ORDERS, orderData);
          if (uploadedDocId && createdOrder) {
            await linkIntakeDocument(uploadedDocId, createdOrder.id, null);
          }
          const depositPaid = parseFloat((fd.get('depositPaid') || '').replace(',', '.')) || 0;
          if (!createdOrder) { Utils.showToast('Order created, but invoice could not be generated.', 'error'); return true; }

          const createdInvoice = await Invoicing.createForOrder(createdOrder.id, {
            clientId: fd.get('clientId'),
            clientName: selectedClient ? selectedClient.name : 'Unknown',
            invoiceNumber: 'INV-' + new Date().getFullYear() + '-' + Utils.randomBetween(100, 999),
            issueDate: new Date().toISOString().split('T')[0],
            dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            notes: depositPaid > 0
              ? `Deposit of ${Utils.formatCurrency(depositPaid)} received.`
              : `Full invoice for: ${orderData.title}. No deposit recorded yet.`
          });

          if (createdInvoice && depositPaid > 0) {
            await Invoicing.recordAdditionalPayment(createdInvoice.id, depositPaid, 'Deposit');
          }

          if (createdInvoice) {
            await ensureAgreementForInvoice(createdInvoice, createdOrder);
          }

          Utils.showToast(
            depositPaid > 0
              ? `Order created. Deposit ${Utils.formatCurrency(depositPaid)} recorded.`
              : `Order created. Invoice generated (no deposit yet).`,
            'info'
          );
        }
        renderSubTab();
        return true;
      }
    });

    // Document intake — upload + AI-assisted pre-fill (new orders only).
    if (!isEdit) {
      setTimeout(() => {
        const fileInput = document.getElementById('order-doc-file');
        const uploadBtn = document.getElementById('order-doc-upload-btn');
        const extractBtn = document.getElementById('order-doc-extract-btn');
        const statusEl = document.getElementById('order-doc-status');
        if (!fileInput || !uploadBtn) return;

        uploadBtn.addEventListener('click', async () => {
          const file = fileInput.files[0];
          if (!file) { Utils.showToast('Choose a file first.', 'error'); return; }
          uploadBtn.disabled = true;
          statusEl.textContent = 'Uploading…';
          const doc = await uploadIntakeDocument('order', file);
          uploadBtn.disabled = false;
          if (!doc) { statusEl.textContent = 'Upload failed.'; return; }
          uploadedDocId = doc.id;
          const isPdfOrImage = /^(application\/pdf|image\/)/.test(file.type);
          statusEl.textContent = '✓ Uploaded: ' + file.name;
          if (isPdfOrImage) {
            extractBtn.classList.remove('d-none');
          } else {
            statusEl.textContent += ' (attached as reference — Word docs can\'t be auto-read; convert to PDF for auto-fill)';
          }
        });

        extractBtn.addEventListener('click', async () => {
          if (!uploadedDocId) return;
          extractBtn.disabled = true;
          statusEl.textContent = 'Reading document…';
          const data = await extractIntakeDocument(uploadedDocId);
          extractBtn.disabled = false;
          if (!data) { statusEl.textContent = 'Extraction failed — fill in manually.'; return; }

          const form = document.getElementById('order-form');
          if (data.garmentTitle) form.querySelector('[name="title"]').value = data.garmentTitle;
          if (data.price != null) form.querySelector('[name="price"]').value = data.price;
          if (data.deadline) form.querySelector('[name="deadline"]').value = data.deadline;
          if (data.eventDate) form.querySelector('[name="eventDate"]').value = data.eventDate;
          if (data.notes) {
            const notesField = document.getElementById('order-notes-field');
            notesField.value = (notesField.value ? notesField.value + '\n' : '') + 'From document: ' + data.notes;
          }
          if (data.clientName) {
            const clientSelect = form.querySelector('[name="clientId"]');
            const match = Array.from(clientSelect.options).find(o =>
              o.textContent.toLowerCase().includes(data.clientName.toLowerCase().split(' ')[0]));
            if (match) clientSelect.value = match.value;
          }
          statusEl.textContent = '✓ Fields pre-filled — please review before saving.';
        });
      }, 50);
    }

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
      if (depField) {
        // Sanitize as the user types: accept a comma or dot as the decimal
        // separator, strip anything else. Prevents the native number-input
        // blur-sanitization bug where an unparseable value silently clears
        // to empty with no error shown.
        depField.addEventListener('input', () => {
          let v = depField.value.replace(/,/g, '.');
          v = v.replace(/[^0-9.]/g, '');
          const firstDot = v.indexOf('.');
          if (firstDot !== -1) {
            v = v.slice(0, firstDot + 1) + v.slice(firstDot + 1).replace(/\./g, '');
          }
          if (v !== depField.value) depField.value = v;
        });
      }
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
      const activeModal = document.querySelector('.modal-overlay.active');
      if (activeModal) wireColourSwatches(activeModal);
    }, 50);
  }

  function showOrderDetails(orderId) {
    const o = Store.getById(Store.COLLECTIONS.ORDERS, orderId);
    if (!o) return;
    const _invoice = _getOrderInvoice(o);
    const _invPaid = _invoice ? ((_invoice.amountPaid != null && _invoice.amountPaid !== '') ? parseFloat(_invoice.amountPaid) : 0) : 0;
    const _invBalance = _invoice ? Math.round((_invoice.total - _invPaid) * 100) / 100 : 0;
    const orderPhotos = Store.query(Store.COLLECTIONS.JOB_PHOTOS, p => p.orderId === orderId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const pendingPhotoReqs = Store.query(Store.COLLECTIONS.PHOTO_REQUESTS, r => r.orderId === orderId && r.status === 'Pending');
    const comms = Store.query(Store.COLLECTIONS.ORDER_COMMS, c => c.orderId === orderId)
      .sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Pre-compute deadline banner (avoid IIFE with const inside template literal)
    const DETAIL_DONE = ['Ready','Shipped to Shashank','At Shashank','In Transit','Awaiting Payment',
      'Received in Australia','Final Fitting','Cleared for Delivery','Delivered'];
    var deadlineBannerHTML = '';
    if (!DETAIL_DONE.includes(o.status) && o.deadline) {
      var dd = Utils.daysFromNow(o.deadline);
      var isOv = dd < 0;
      var isWn = dd >= 0 && dd <= 7;
      if (isOv || isWn) {
        deadlineBannerHTML = '<div class="p-3 rounded-md mb-2 w-full" style="background:' +
          (isOv ? 'rgba(245,158,11,0.12)' : 'rgba(245,158,11,0.08)') + ';border:1px solid #f59e0b">' +
          '<div class="text-xs font-semibold" style="color:#f59e0b">' +
          (isOv ? '\u26a0\ufe0f ' + Math.abs(dd) + ' days overdue' : '\u23f0 ' + dd + ' days left') +
          '</div>' +
          '<button class="btn btn-sm mt-2" style="background:#f59e0b;color:#000;font-weight:600"' +
          ' onclick="CRM.extendDeadline(\'' + o.id + '\')">&#128197; Extend Deadline</button>' +
          '</div>';
      } else {
        deadlineBannerHTML = '<button class="btn btn-secondary btn-sm" onclick="CRM.extendDeadline(\'' + o.id + '\')">&#128197; Extend Deadline</button>';
      }
    } else {
      deadlineBannerHTML = '<button class="btn btn-secondary btn-sm" onclick="CRM.extendDeadline(\'' + o.id + '\')">&#128197; Extend Deadline</button>';
    }

    App.showModal({
      title: 'Order Summary',
      content: `
        <div class="d-flex flex-col gap-5 animate-fade-in">
          <div>
            <h3 class="font-display text-lg">${Utils.sanitizeHTML(o.title)}</h3>
            <div class="text-sm font-semibold text-gold mt-1">${Utils.sanitizeHTML(o.clientName)}</div>
            ${o.orderCode?`<div class="font-mono text-xs text-muted mt-1">${o.orderCode}</div>`:''}
            <div id="order-docs-list-${o.id}" class="text-xs text-muted mt-2"></div>
            ${(()=>{
              if (!o.projectId) return '';
              const proj = Store.getById(Store.COLLECTIONS.ORDER_PROJECTS, o.projectId);
              return proj ? `<div class="text-xs mt-1" style="color:#a78bfa;">📁 Project: ${Utils.sanitizeHTML(proj.projectName)}</div>` : '';
            })()}
          </div>
          ${_invoice?`
            <div class="p-3 rounded-md" style="background:rgba(0,0,0,0.2);border:1px solid var(--pc-border)">
              <div class="d-flex justify-between items-center mb-2">
                <div class="text-xs font-semibold text-gold">🧾 Invoice ${Utils.sanitizeHTML(_invoice.invoiceNumber||'')}</div>
                <span class="badge ${_invoice.status==='Paid'?'badge-success':_invoice.status==='Partially Paid'?'badge-warning':'badge-muted'} text-xs">${_invoice.status}</span>
              </div>
              <div class="d-flex justify-between text-xs mb-1"><span class="text-muted">Invoice Total (inc GST):</span><span class="font-mono">${Utils.formatCurrency(_invoice.total)}</span></div>
              <div class="d-flex justify-between text-xs mb-1"><span class="text-muted">Amount Paid:</span><span class="font-mono text-success">${Utils.formatCurrency(_invPaid)}</span></div>
              <div class="d-flex justify-between text-xs font-bold" style="border-top:1px solid var(--pc-border);padding-top:6px;margin-top:4px">
                <span>Balance Due:</span>
                <span class="font-mono ${_invBalance>0?'text-danger':'text-success'}">${Utils.formatCurrency(_invBalance)}</span>
              </div>
              <div class="d-flex gap-2 mt-3">
                ${_invBalance>0?`<button class="btn btn-secondary btn-sm" onclick="App.closeModal();setTimeout(()=>CRM.recordAdditionalPayment('${o.id}'),200)">💳 Record Payment</button>`:''}
                ${_invoice.status!=='Paid'?`<button class="btn btn-secondary btn-sm" onclick="CRM.syncInvoiceFromOrders('${o.id}')" title="Recalculate invoice from current order prices">🔄 Sync from Orders</button>`:''}
                <button class="btn btn-secondary btn-sm" onclick="App.closeModal();setTimeout(()=>CRM.showEditInvoiceModal('${_invoice.id}'),200)">✏️ Edit Invoice</button>
              </div>
              <div id="agreement-panel-${o.id}" class="mt-3" style="border-top:1px solid var(--pc-border);padding-top:10px">
                <div class="text-xs text-muted">Loading agreement status…</div>
              </div>
            </div>`:`
            <div class="p-3 rounded-md text-xs text-muted" style="border:1px dashed var(--pc-border)">
              No invoice found for this order.
            </div>`}
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
              ${o.colourRef?(()=>{const pc=findPaletteColour(o.colourRef);return `<div><span class="text-muted">Colour Ref:</span> ${pc?`<span style="display:inline-block;width:11px;height:11px;border-radius:50%;background:${pc.hex};border:1px solid rgba(0,0,0,0.3);vertical-align:middle;margin-right:4px;" title="${Utils.sanitizeHTML(pc.name)}"></span>`:''}${Utils.sanitizeHTML(o.colourRef)}</div>`;})():''}
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
            <div class="d-flex justify-between items-center mt-3 mb-1">
              <h4 class="text-sm font-semibold text-gold">Photos (${orderPhotos.length})</h4>
              <div class="d-flex gap-2">
                <button class="btn btn-secondary btn-sm" onclick="App.closeModal();setTimeout(()=>CRM.requestPhotos('${orderId}'),200)">📸 Request Photos</button>
                <button class="btn btn-primary btn-sm" onclick="App.closeModal();setTimeout(()=>CRM.sendPhotosToClient('${orderId}'),200)">📧 Email to Client</button>
              </div>
            </div>
            ${pendingPhotoReqs.length?`<div class="p-2 rounded-md text-xs mb-2" style="background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.3)">
              ${pendingPhotoReqs.map(r=>`<div>⏳ <b>Awaiting from karigar:</b> ${Utils.sanitizeHTML(r.requestedItems)} <span class="text-muted">(${Utils.formatDate(r.createdAt)})</span></div>`).join('')}
            </div>`:''}
            ${orderPhotos.length===0?`<div class="text-xs text-muted p-3 text-center rounded-md" style="border:1px dashed var(--pc-border)">No photos uploaded yet.</div>`:`
            <div class="d-flex flex-wrap gap-2">
              ${orderPhotos.map(p=>`
                <div style="position:relative;width:92px">
                  <a href="${p.url}" target="_blank" rel="noopener" style="display:block;text-decoration:none">
                    <img src="${p.url}" alt="${Utils.sanitizeHTML(p.caption||p.context||'photo')}" loading="lazy"
                      style="width:92px;height:92px;object-fit:cover;border-radius:8px;border:1px solid var(--pc-border)">
                  </a>
                  <button onclick="event.preventDefault();App.closeModal();setTimeout(()=>CRM.deletePhoto('${p.id}','${orderId}'),200)"
                    title="Remove this photo"
                    style="position:absolute;top:4px;right:4px;width:22px;height:22px;border-radius:50%;background:#ef4444;color:#fff;border:none;font-size:13px;font-weight:bold;line-height:1;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;box-shadow:0 1px 4px rgba(0,0,0,0.5);z-index:2">✕</button>
                  <div class="text-xs text-muted mt-1" style="line-height:1.3">${Utils.sanitizeHTML(Utils.truncateText(p.caption||p.context||'',24))}<br>${Utils.formatDate(p.createdAt)} · ${Utils.sanitizeHTML(p.uploadedBy||'')}</div>
                </div>`).join('')}
            </div>`}
            <div class="d-flex justify-between items-center mt-4 mb-1">
              <h4 class="text-sm font-semibold text-gold">Client Communications (${comms.length})</h4>
              <button class="btn btn-secondary btn-sm" onclick="App.closeModal();setTimeout(()=>CRM.logClientReply('${orderId}'),200)">↩️ Log Client Reply</button>
            </div>
            ${comms.length===0?`<div class="text-xs text-muted p-3 text-center rounded-md" style="border:1px dashed var(--pc-border)">No emails sent yet.</div>`:`
            <div class="d-flex flex-col gap-2" style="max-height:220px;overflow-y:auto">
              ${comms.map(c=>`
                <div class="p-2 rounded-md text-xs" style="background:${c.direction==='Received'?'rgba(16,185,129,0.08)':'rgba(212,175,55,0.06)'};border:1px solid ${c.direction==='Received'?'rgba(16,185,129,0.3)':'var(--pc-border)'}">
                  <div class="d-flex justify-between items-center">
                    <span class="badge ${c.direction==='Received'?'badge-success':'badge-gold'} text-xs">${c.direction==='Received'?'↩️ Client Replied':'📧 Sent — '+Utils.sanitizeHTML(c.templateName||'')}</span>
                    <span class="text-muted">${Utils.formatDate(c.createdAt)}</span>
                  </div>
                  <div class="mt-1" style="white-space:pre-line">${Utils.sanitizeHTML(Utils.truncateText(c.message||'',200))}</div>
                  ${c.photoUrls&&c.photoUrls.length?`<div class="text-muted mt-1">${c.photoUrls.length} photo(s) attached</div>`:''}
                </div>`).join('')}
            </div>`}
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
            ${deadlineBannerHTML}
            <button class="btn btn-secondary" onclick="CRM.editOrder('${o.id}')">✏️ Edit</button>
            <button class="btn btn-danger" onclick="CRM.deleteOrder('${o.id}')">🗑️ Delete</button>
          </div>
        </div>`,
      hideCancel: true, submitText: 'Close', onSubmit: () => true
    });

    // Reference documents load asynchronously — they live in a separate
    // table accessed only via the document-intake backend, not the local
    // Store cache, so they can't be rendered synchronously above.
    setTimeout(async () => {
      const holder = document.getElementById('order-docs-list-' + o.id);
      if (holder) {
        const docs = await listIntakeDocuments(o.id, null);
        if (docs.length) {
          holder.innerHTML = '📎 ' + docs.map(d =>
            '<a href="' + d.fileUrl + '" target="_blank" rel="noopener" style="color:var(--pc-gold)">' + Utils.sanitizeHTML(d.fileName) + '</a>'
          ).join(', ');
        }
      }
      if (_invoice) await renderAgreementPanel(o.id, _invoice);
    }, 100);
  }

  // Renders the Agreement status block inside the Order Summary's invoice
  // panel — created lazily (not in local Store), so it's fetched from the
  // backend after the modal mounts, same pattern as reference documents.
  async function renderAgreementPanel(orderId, invoice) {
    const holder = document.getElementById('agreement-panel-' + orderId);
    if (!holder) return;

    let agreement = (await callAgreementsBackend('getByInvoice', { invoiceId: invoice.id })).agreement;
    if (!agreement) {
      holder.innerHTML = `
        <div class="text-xs text-muted mb-2">No client agreement sent yet.</div>
        <button class="btn btn-secondary btn-sm" onclick="CRM.sendInvoiceWithAgreement('${orderId}')">📝 Send Invoice + Agreement</button>`;
      return;
    }

    if (agreement.status === 'Pending') {
      holder.innerHTML = `
        <div class="d-flex justify-between items-center">
          <span class="badge badge-muted text-xs">📝 Agreement: Awaiting Client Signature</span>
        </div>
        <div class="d-flex gap-2 mt-2">
          <button class="btn btn-secondary btn-sm" onclick="CRM.copyAgreementLink('${agreement.token}')">🔗 Copy Signing Link</button>
        </div>`;
    } else if (agreement.status === 'Client Signed') {
      holder.innerHTML = `
        <div class="badge badge-warning text-xs">✍️ Client Signed ${agreement.clientSignedAt ? '(' + Utils.formatDate(agreement.clientSignedAt) + ')' : ''} — Awaiting Pooja's Countersignature</div>
        <div class="d-flex gap-2 mt-2">
          <button class="btn btn-primary btn-sm" onclick="CRM.countersignAgreement('${agreement.id}','Pooja Shah')">✍️ Countersign Now</button>
        </div>`;
    } else if (agreement.status === 'Fully Executed') {
      holder.innerHTML = `
        <div class="badge badge-success text-xs">✅ Agreement Fully Executed</div>
        <div class="text-xs text-muted mt-1">Client signed ${Utils.formatDate(agreement.clientSignedAt)} · Pooja countersigned ${Utils.formatDate(agreement.poojaSignedAt)}</div>`;
    }
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

  // Keeps an order's invoice in sync after the order itself is edited.
  // Explicit "Sync Invoice from Orders" action — the ONLY place invoice
  // totals get recalculated from order data. Never called automatically.
  // Refuses to run if the invoice is Paid (locked) to protect settled
  // invoices from being silently altered.
  async function syncInvoiceFromOrders(orderId) {
    const ok = await Invoicing.syncFromOrders(orderId);
    if (ok) {
      if (typeof App !== 'undefined' && App.closeModal) App.closeModal();
      renderSubTab();
    }
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
              <div class="text-xs text-muted">Record the M2 payment below to unlock this stage.</div>
              <button class="btn btn-primary btn-sm" onclick="App.closeModal();setTimeout(()=>CRM.recordMilestonePayment('${invoice.projectId}',1),200)">💳 Record M2 Payment Now</button>
            </div>`,
          submitText: 'Cancel',
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
    const isInternational = o.deliveryDestination === 'India' || o.deliveryDestination === 'Overseas';
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
            The customer's share (${isInternational ? '0% GST — international shipping' : '+ 10% GST'}) is added to invoice <strong>${Utils.sanitizeHTML(invoice.invoiceNumber)}</strong>.
          </p>
          <div class="form-group">
            <label class="form-label">Customer Shipping Charge (AUD, ex-GST) <span class="required">*</span></label>
            <input type="text" inputmode="decimal" autocomplete="off" name="shareAmount" class="form-input" min="0" step="0.01" required value="${share}">
            <div class="text-xs text-muted mt-1">${isInternational ? 'International shipping — 0% Australian GST applies.' : 'Auto-calculated (ex-GST). 10% GST added on top.'} Edit if you agreed a different figure.</div>
          </div>
        </form>`,
      submitText: 'Add to Invoice',
      onSubmit: async (modalEl) => {
        const form = Utils.$('#ship-inv-form', modalEl);
        if (!form.checkValidity()) { form.reportValidity(); return false; }
        const amount = parseFloat((new FormData(form).get('shareAmount') || '').replace(',', '.')) || 0;
        if (amount <= 0) { Utils.showToast('Enter a charge greater than zero.', 'error'); return false; }

        const ok = await Invoicing.addShippingLine(invoice.id, {
          description: 'Shipping contribution',
          shareAmount: amount,
          gstRate: isInternational ? 0 : 0.10
        });
        if (!ok) return false;

        App.closeModal();
        renderSubTab();
        return true;
      }
    });
  }

  function editOrder(id) { App.closeModal(); setTimeout(() => showOrderModal(id), 200); }

  async function extendDeadline(orderId) {
    const o = Store.getById(Store.COLLECTIONS.ORDERS, orderId);
    if (!o) return;
    const oldDeadline = o.deadline || '';

    App.showModal({
      title: 'Extend Production Deadline',
      content: '<div class="d-flex flex-col gap-4">' +
        '<div class="text-xs text-muted">Current deadline: <span class="font-mono font-semibold text-warning">' + Utils.formatDate(oldDeadline) + '</span></div>' +
        '<div class="form-group">' +
          '<label class="form-label">New Deadline <span class="required">*</span></label>' +
          '<input type="date" id="extend-deadline-input" class="form-input" value="' + oldDeadline + '">' +
        '</div>' +
        '<div class="form-group">' +
          '<label class="form-label">Reason for Extension</label>' +
          '<input type="text" id="extend-deadline-reason" class="form-input" placeholder="e.g. Fabric delayed, client requested changes">' +
        '</div>' +
      '</div>',
      submitText: 'Save New Deadline',
      onSubmit: async () => {
        const newDeadline = (document.getElementById('extend-deadline-input') || {}).value;
        const reason = ((document.getElementById('extend-deadline-reason') || {}).value || '').trim();
        if (!newDeadline) { Utils.showToast('Select a new deadline.', 'error'); return false; }
        if (newDeadline === oldDeadline) { Utils.showToast('New deadline is the same as current.', 'error'); return false; }
        try {
          await Store.update(Store.COLLECTIONS.ORDERS, orderId, { deadline: newDeadline });
          await Store.logAction(
            'Deadline extended: ' + Utils.formatDate(oldDeadline) + ' → ' + Utils.formatDate(newDeadline) + (reason ? ' | Reason: ' + reason : ''),
            'CRM',
            'Order ' + (o.orderCode || orderId) + ' — ' + Utils.sanitizeHTML(o.title),
            null
          );
          Utils.showToast('Deadline updated to ' + Utils.formatDate(newDeadline));
          return true;
        } catch (e) {
          Utils.showToast('Could not update deadline: ' + e.message, 'error');
          return false;
        }
      }
    });
  }

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

  // ------------------------------------------------------------
  // CLIENT SERVICE AGREEMENT (e-signature) — backend calls to
  // functions/api/agreements.js. Mirrors the auth pattern already
  // used for Invoicing.callBackend.
  // ------------------------------------------------------------
  async function callAgreementsBackend(action, params) {
    const client = Store.getClient();
    const { data: sessionData } = await client.auth.getSession();
    const authToken = sessionData && sessionData.session ? sessionData.session.access_token : null;
    try {
      const res = await fetch('/api/agreements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, authToken, ...params })
      });
      return await res.json();
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }

  // Creates the agreement record for an invoice if one doesn't already
  // exist (idempotent — backend reuses an existing one for the same
  // invoiceId). Returns the agreement, or null on failure.
  async function ensureAgreementForInvoice(invoice, order) {
    if (!invoice) return null;
    const result = await callAgreementsBackend('create', {
      invoiceId: invoice.id,
      orderId: invoice.orderId || null,
      projectId: invoice.projectId || null,
      clientId: invoice.clientId || null,
      clientName: invoice.clientName || (order ? order.clientName : 'Client'),
      poojaName: 'Pooja Shah'
    });
    if (!result.ok) { Utils.showToast(result.error || 'Could not create agreement.', 'error'); return null; }
    return result.agreement;
  }

  function agreementSigningLink(token) {
    return window.location.origin + '/sign-agreement.html?token=' + token;
  }

  // Triggered from the invoice panel — ensures an agreement exists, then
  // opens the compose modal prefilled with the invoice details and the
  // signing link, ready to send.
  async function sendInvoiceWithAgreement(orderId) {
    const o = Store.getById(Store.COLLECTIONS.ORDERS, orderId);
    if (!o) return;
    const invoice = _getOrderInvoice(o);
    if (!invoice) { Utils.showToast('No invoice found for this order.', 'error'); return; }

    const agreement = await ensureAgreementForInvoice(invoice, o);
    if (!agreement) return;

    App.closeModal();
    setTimeout(() => {
      showComposeModal(o.clientId, 'invoice_with_agreement', {
        invoiceNumber: invoice.invoiceNumber || '',
        invoiceAmount: Utils.formatCurrency(invoice.total),
        dueDate: invoice.dueDate ? Utils.formatDate(invoice.dueDate) : '',
        agreementLink: agreementSigningLink(agreement.token)
      });
    }, 200);
  }

  function copyAgreementLink(token) {
    const link = agreementSigningLink(token);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(link).then(
        () => Utils.showToast('Signing link copied.', 'success'),
        () => Utils.showToast(link, 'info')
      );
    } else {
      Utils.showToast(link, 'info');
    }
  }

  // Pooja's countersignature — only allowed once the client has signed.
  async function countersignAgreement(agreementId, defaultName) {
    App.showModal({
      title: '✍️ Countersign Agreement',
      content: `
        <div class="d-flex flex-col gap-3">
          <div class="text-xs text-muted">The client has signed. Type your name to countersign on behalf of Pooja's Couture — this records today's date automatically.</div>
          <div class="form-group">
            <label class="form-label">Your Full Name</label>
            <input type="text" id="cs-name" class="form-input" value="${Utils.sanitizeHTML(defaultName || 'Pooja Shah')}">
          </div>
        </div>`,
      submitText: 'Countersign',
      onSubmit: async () => {
        const name = document.getElementById('cs-name').value.trim();
        if (!name) { Utils.showToast('Enter your name to countersign.', 'error'); return false; }
        const result = await callAgreementsBackend('poojaCountersign', { agreementId, signatureText: name });
        if (!result.ok) { Utils.showToast(result.error || 'Countersign failed.', 'error'); return false; }
        Utils.showToast('Agreement fully executed.', 'success');
        renderSubTab();
        return true;
      }
    });
  }

  function fillTemplate(text, vars) {
    return text.replace(/\{\{(\w+)\}\}/g, (_,key) => vars[key]||'');
  }

  // ---------- Client Photo Update Emails ----------
  const DEFAULT_PHOTO_EMAIL_TEMPLATES = [
    { id: 'progress_update', name: 'Progress Update',
      intro: "We wanted to share the latest progress on your outfit. Here's where things stand:" },
    { id: 'approval_colour', name: 'Approval Needed — Colour / Fabric',
      intro: "Before we proceed further, we'd love your approval on the colour and fabric shown below. Please reply to this email to confirm, or let us know if you'd like any adjustments." },
    { id: 'approval_embroidery', name: 'Approval Needed — Embroidery / Handwork',
      intro: "The handwork on your outfit has reached a stage where we'd like your approval before continuing. Please have a look below and reply with your thoughts." },
    { id: 'ready_fitting', name: 'Ready for Fitting',
      intro: "Exciting news — your outfit is ready for its first fitting! Please see the photos below." }
  ];

  function getPhotoEmailTemplates() {
    const s = Store.getSettings();
    const custom = (s && Array.isArray(s.photoEmailTemplates)) ? s.photoEmailTemplates : [];
    return DEFAULT_PHOTO_EMAIL_TEMPLATES.concat(custom);
  }

  async function savePhotoEmailTemplate(name, intro) {
    const s = Store.getSettings() || {};
    const custom = Array.isArray(s.photoEmailTemplates) ? s.photoEmailTemplates.slice() : [];
    const id = 'custom_' + Date.now();
    custom.push({ id, name, intro });
    await Store.updateSettings({ photoEmailTemplates: custom });
    return id;
  }

  function buildPhotoEmailHtml({ clientName, orderTitle, introText, customMessage, photos }) {
    const photoBlocks = photos.map(p => `
      <div style="margin-bottom:20px;text-align:center;">
        <img src="${p.url}" alt="${Utils.sanitizeHTML(p.caption||'')}" style="max-width:100%;width:420px;border-radius:10px;border:1px solid #e5e0d8;display:block;margin:0 auto;">
        ${p.caption ? `<div style="font-family:Georgia,serif;font-size:12px;color:#8a8578;margin-top:6px;font-style:italic;">${Utils.sanitizeHTML(p.caption)}</div>` : ''}
      </div>`).join('');

    return `
<div style="font-family:Georgia,'Times New Roman',serif;max-width:560px;margin:0 auto;background:#fffdf9;">
  <div style="background:#0A0F2E;padding:28px 24px;text-align:center;">
    <div style="color:#D4AF37;font-size:22px;letter-spacing:2px;font-weight:bold;">POOJA'S COUTURE</div>
    <div style="color:#e8e4d8;font-size:11px;letter-spacing:3px;margin-top:4px;">BRIDAL &amp; COUTURE ATELIER</div>
  </div>
  <div style="padding:32px 28px;">
    <p style="font-size:15px;color:#2a2a2a;line-height:1.7;">Dear ${Utils.sanitizeHTML(clientName)},</p>
    <p style="font-size:15px;color:#2a2a2a;line-height:1.7;">${Utils.sanitizeHTML(introText)}</p>
    ${customMessage ? `<div style="background:#f7f3ea;border-left:3px solid #D4AF37;padding:14px 18px;margin:18px 0;font-size:14px;color:#2a2a2a;line-height:1.6;">${Utils.sanitizeHTML(customMessage).replace(/\n/g,'<br>')}</div>` : ''}
    <div style="margin:24px 0;">${photoBlocks}</div>
    <p style="font-size:14px;color:#2a2a2a;line-height:1.7;">Simply reply to this email with any thoughts or questions — we're always happy to hear from you.</p>
    <p style="font-size:14px;color:#2a2a2a;line-height:1.7;margin-top:24px;">Warm regards,<br><b>Pooja Shah</b><br>Pooja's Couture</p>
  </div>
  <div style="background:#0A0F2E;padding:14px;text-align:center;">
    <div style="color:#8a8578;font-size:10px;">Re: ${Utils.sanitizeHTML(orderTitle)}</div>
  </div>
</div>`;
  }

  function sendPhotosToClient(orderId) {
    const o = Store.getById(Store.COLLECTIONS.ORDERS, orderId);
    if (!o) return;
    const client = Store.getById(Store.COLLECTIONS.CLIENTS, o.clientId);
    const photos = Store.query(Store.COLLECTIONS.JOB_PHOTOS, p => p.orderId === orderId)
      .sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));

    if (photos.length === 0) { Utils.showToast('No photos on this order yet.', 'error'); return; }
    if (!client || !client.email) { Utils.showToast('This client has no email on file.', 'error'); return; }

    const templates = getPhotoEmailTemplates();

    App.showModal({
      title: `📧 Email Photos — ${Utils.sanitizeHTML(client.name)}`,
      modalSize: 'modal-lg',
      content: `
        <div class="form-group">
          <label class="form-label">Template</label>
          <select id="pe-template" class="form-select">
            ${templates.map(t=>`<option value="${t.id}">${Utils.sanitizeHTML(t.name)}</option>`).join('')}
            <option value="__new__">+ Create New Template...</option>
          </select>
        </div>
        <div id="pe-new-template-fields" class="d-none" style="border:1px dashed var(--pc-border);padding:10px;border-radius:8px;margin-bottom:12px">
          <div class="form-group"><label class="form-label">New Template Name</label>
            <input type="text" id="pe-new-name" class="form-input" placeholder="e.g. Fabric Sourced Update"></div>
          <div class="form-group m-0"><label class="form-label">Intro Text</label>
            <textarea id="pe-new-intro" class="form-input" rows="2" placeholder="Standard opening line for this scenario"></textarea></div>
        </div>
        <div class="form-group">
          <label class="form-label">Your Message (optional — added to the template)</label>
          <textarea id="pe-message" class="form-input" rows="3" placeholder="Any specific note for ${Utils.sanitizeHTML(client.name)}..."></textarea>
        </div>
        <div class="form-group m-0">
          <label class="form-label">Select Photos to Send</label>
          <div style="display:flex;flex-wrap:wrap;gap:8px;max-height:260px;overflow-y:auto;padding:4px">
            ${photos.map((p,i)=>`
              <label style="width:96px;cursor:pointer">
                <div style="position:relative">
                  <img src="${p.url}" style="width:96px;height:96px;object-fit:cover;border-radius:8px;border:1px solid var(--pc-border)">
                  <input type="checkbox" class="pe-photo-cb" data-idx="${i}" checked style="position:absolute;top:4px;left:4px;width:18px;height:18px">
                </div>
                <div class="text-xs text-muted mt-1">${Utils.formatDate(p.createdAt)}</div>
              </label>`).join('')}
          </div>
        </div>`,
      submitText: '📧 Send to Client',
      onSubmit: async (modalEl) => {
        const tplSelect = Utils.$('#pe-template', modalEl);
        let tplId = tplSelect.value;
        let intro, tplName;

        if (tplId === '__new__') {
          const name = Utils.$('#pe-new-name', modalEl).value.trim();
          const introText = Utils.$('#pe-new-intro', modalEl).value.trim();
          if (!name || !introText) { Utils.showToast('Fill in the new template name and intro text.', 'error'); return false; }
          tplId = await savePhotoEmailTemplate(name, introText);
          intro = introText; tplName = name;
        } else {
          const tpl = templates.find(t => t.id === tplId);
          intro = tpl.intro; tplName = tpl.name;
        }

        const selectedIdx = Array.from(Utils.$$('.pe-photo-cb', modalEl))
          .filter(cb => cb.checked).map(cb => parseInt(cb.dataset.idx, 10));
        if (selectedIdx.length === 0) { Utils.showToast('Select at least one photo.', 'error'); return false; }
        const selectedPhotos = selectedIdx.map(i => photos[i]);
        const customMessage = Utils.$('#pe-message', modalEl).value.trim();

        const html = buildPhotoEmailHtml({
          clientName: client.name, orderTitle: o.title, introText: intro,
          customMessage, photos: selectedPhotos
        });
        const subject = `${tplName} — ${o.title} | Pooja's Couture`;

        try {
          if (EMAILJS_CONFIG.serviceId !== 'YOUR_SERVICE_ID') {
            await emailjs.send(EMAILJS_CONFIG.serviceId, EMAILJS_CONFIG.templateId,
              { to_email: client.email, to_name: client.name, subject, message: html, reply_to: 'poojascoutures@gmail.com' },
              EMAILJS_CONFIG.publicKey);
          }
          await Store.create(Store.COLLECTIONS.ORDER_COMMS, {
            orderId, clientId: client.id, clientName: client.name,
            direction: 'Sent', templateName: tplName, subject, message: customMessage || intro,
            photoUrls: selectedPhotos.map(p => p.url),
            loggedBy: Store.getCurrentUser() ? Store.getCurrentUser().name : 'Unknown'
          });
          // Also log to the Email Centre so it shows in overall email stats/history
          logEmail(client.id, client.name, subject,
            `[Photo update — ${selectedPhotos.length} photo(s)] ${customMessage || intro}`,
            tplName, EMAILJS_CONFIG.serviceId==='YOUR_SERVICE_ID' ? 'Logged (EmailJS not configured)' : 'Sent');
          Store.logAction(`Emailed ${selectedPhotos.length} photo(s) to ${client.name} (${tplName})`);
          Utils.showToast(`Sent to ${client.name}.`);
          setTimeout(() => showOrderDetails(orderId), 250);
          return true;
        } catch (err) {
          console.error(err);
          Utils.showToast('Send failed: ' + err.message, 'error');
          return false;
        }
      }
    });

    setTimeout(() => {
      const sel = document.getElementById('pe-template');
      const newFields = document.getElementById('pe-new-template-fields');
      if (sel) sel.addEventListener('change', () => {
        newFields.classList.toggle('d-none', sel.value !== '__new__');
      });
    }, 50);
  }

  function logClientReply(orderId) {
    const o = Store.getById(Store.COLLECTIONS.ORDERS, orderId);
    if (!o) return;
    App.showModal({
      title: `Log Client Reply — ${Utils.sanitizeHTML(o.title)}`,
      content: `
        <div class="text-xs text-muted mb-2">Paste what the client wrote back (from Gmail). This is stored on the order with today's date and time.</div>
        <div class="form-group m-0">
          <textarea id="cr-text" class="form-input" rows="5" placeholder="Paste the client's reply here..." required></textarea>
        </div>`,
      submitText: 'Save Reply',
      onSubmit: async () => {
        const text = Utils.$('#cr-text').value.trim();
        if (!text) { Utils.showToast('Paste the reply text first.', 'error'); return false; }
        const client = Store.getById(Store.COLLECTIONS.CLIENTS, o.clientId);
        await Store.create(Store.COLLECTIONS.ORDER_COMMS, {
          orderId, clientId: o.clientId, clientName: client ? client.name : o.clientName,
          direction: 'Received', templateName: null, subject: null, message: text, photoUrls: [],
          loggedBy: Store.getCurrentUser() ? Store.getCurrentUser().name : 'Unknown'
        });
        Store.logAction(`Logged client reply on order ${o.title}`);
        Utils.showToast('Reply logged.');
        setTimeout(() => showOrderDetails(orderId), 250);
        return true;
      }
    });
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

    const statusMap = { 'New':1,'In Design':2,'Fabric Sourced':3,'In Production':4,'Fitting':5,'Ready':6,'Shipped to Shashank':7,'At Shashank':8,'In Transit':9,'Awaiting Payment':9,'Cleared for Delivery':9,'Received in Australia':10,'Final Fitting':11,'Delivered':12,'Completed':12 };
    const currentStage = orders.length>0 ? (statusMap[orders[0].status]||0) : 0;

    wrapper.innerHTML = `
      <div class="d-flex items-center justify-between mb-6" style="border-bottom:1px solid var(--pc-border);padding-bottom:var(--sp-4)">
        <div>
          <h3 class="font-display text-md text-gold">${Utils.sanitizeHTML(client.name)} — Journey</h3>
          <p class="text-xs text-muted mt-1">${orders.length} garment${orders.length!==1?'s':''} tracked${(()=>{ if(!orders.length||!orders[0].projectId) return ''; const p=Store.getById(Store.COLLECTIONS.ORDER_PROJECTS,orders[0].projectId); return p?' · 📁 '+Utils.sanitizeHTML(p.projectName):''; })()}
            ${orders.length > 0 ? ' · <a href="#" onclick="event.preventDefault();CRM.showOrderDetails(\''+orders[0].id+'\')" style="color:var(--pc-gold)">View this order →</a>' : ''}
          </p>
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
        const rows = orders.map(o => { const pct = Math.round((statusMap[o.status]||0)/12*100); return '<div class="d-flex justify-between items-center p-2 rounded-md text-xs mb-1" style="cursor:pointer;background:rgba(255,255,255,0.02);border:1px solid var(--pc-border)" onclick="CRM.showOrderDetails(\''+o.id+'\')"><div><div class="font-semibold">'+Utils.sanitizeHTML(o.title)+'</div>'+(o.orderCode?'<div class="font-mono text-xs" style="color:#a78bfa">'+Utils.sanitizeHTML(o.orderCode)+'</div>':'')+'</div><div class="text-right"><span class="badge badge-gold text-xs">'+o.status+'</span><div class="text-xs text-muted mt-1">'+pct+'%</div></div></div>'; }).join('');
        return '<div class="mt-4" style="border-top:1px solid var(--pc-border);padding-top:16px"><div class="text-xs font-semibold text-gold mb-2">Individual Garments</div>'+rows+'</div>';
      })() : ''}
    `;
  }

// ==========================================
  // CRM TAB (formerly Sales — now a proper CRM dashboard)
  // ==========================================

  function showKPIReport(type) {
    const allOrders   = Store.getAll(Store.COLLECTIONS.ORDERS);
    const allClients  = Store.getAll(Store.COLLECTIONS.CLIENTS);
    const invoices    = Store.getAll(Store.COLLECTIONS.INVOICES);
    const appointments = Store.getAll(Store.COLLECTIONS.APPOINTMENTS);
    const paidInvoices = invoices.filter(i => i.status === 'Paid');
    const deliveredOrders = allOrders.filter(o => ['Delivered', 'Completed'].includes(o.status));
    const now = new Date();
    let title = '', content = '';

    if (type === 'revenue') {
      title = '💰 Revenue Report';
      content = '<div class="text-xs text-muted mb-3">All paid invoices</div>' +
        '<div class="table-container" style="border:none"><table class="data-table"><thead><tr><th>Invoice</th><th>Client</th><th>Date</th><th>Amount</th></tr></thead><tbody>' +
        paidInvoices.sort((a,b)=>new Date(b.issueDate||0)-new Date(a.issueDate||0)).map(inv =>
          '<tr><td class="font-mono text-gold text-xs">' + Utils.sanitizeHTML(inv.invoiceNumber||'—') + '</td>' +
          '<td class="text-xs">' + Utils.sanitizeHTML(inv.clientName||'—') + '</td>' +
          '<td class="text-xs">' + Utils.formatDate(inv.issueDate) + '</td>' +
          '<td class="font-mono text-xs font-bold">' + Utils.formatCurrency(inv.total) + '</td></tr>'
        ).join('') + '</tbody></table></div>';
    } else if (type === 'outstanding') {
      title = '⏳ Outstanding Balances';
      const unpaid = invoices.filter(i => (i.total||0) > (parseFloat(i.amountPaid)||0));
      content = '<div class="text-xs text-muted mb-3">' + unpaid.length + ' invoices with remaining balance</div>' +
        '<div class="table-container" style="border:none"><table class="data-table"><thead><tr><th>Invoice</th><th>Client</th><th>Total</th><th>Paid</th><th>Balance</th></tr></thead><tbody>' +
        unpaid.sort((a,b)=>((b.total||0)-(parseFloat(b.amountPaid)||0))-((a.total||0)-(parseFloat(a.amountPaid)||0))).map(inv => {
          const paid = parseFloat(inv.amountPaid)||0;
          const bal = Math.round((inv.total-paid)*100)/100;
          return '<tr><td class="font-mono text-gold text-xs">' + Utils.sanitizeHTML(inv.invoiceNumber||'—') + '</td>' +
            '<td class="text-xs">' + Utils.sanitizeHTML(inv.clientName||'—') + '</td>' +
            '<td class="font-mono text-xs">' + Utils.formatCurrency(inv.total) + '</td>' +
            '<td class="font-mono text-xs text-success">' + Utils.formatCurrency(paid) + '</td>' +
            '<td class="font-mono text-xs font-bold text-danger">' + Utils.formatCurrency(bal) + '</td></tr>';
        }).join('') + '</tbody></table></div>';
    } else if (type === 'avgorder') {
      title = '📊 Order Values';
      content = '<div class="table-container" style="border:none"><table class="data-table"><thead><tr><th>Code</th><th>Client</th><th>Type</th><th>Value</th></tr></thead><tbody>' +
        deliveredOrders.sort((a,b)=>(b.price||0)-(a.price||0)).map(o =>
          '<tr><td class="font-mono text-gold text-xs">' + Utils.sanitizeHTML(o.orderCode||'—') + '</td>' +
          '<td class="text-xs">' + Utils.sanitizeHTML(o.clientName) + '</td>' +
          '<td class="text-xs">' + Utils.sanitizeHTML(o.productType||'GEN') + '</td>' +
          '<td class="font-mono text-xs">' + Utils.formatCurrency(o.price||0) + '</td></tr>'
        ).join('') + '</tbody></table></div>';
    } else if (type === 'ltv') {
      title = '👑 Client Lifetime Value';
      const cs = {};
      allOrders.forEach(o => { if (!cs[o.clientId]) cs[o.clientId]={name:o.clientName,spend:0,orders:0}; cs[o.clientId].spend+=(o.price||0); cs[o.clientId].orders++; });
      content = '<div class="table-container" style="border:none"><table class="data-table"><thead><tr><th>#</th><th>Client</th><th>Orders</th><th>LTV</th></tr></thead><tbody>' +
        Object.entries(cs).sort((a,b)=>b[1].spend-a[1].spend).map(([id,d],i) =>
          '<tr><td class="text-muted text-xs">' + (i+1) + '</td><td class="font-semibold text-xs">' + Utils.sanitizeHTML(d.name) + '</td>' +
          '<td class="text-xs">' + d.orders + '</td><td class="font-mono text-xs font-bold text-gold">' + Utils.formatCurrency(d.spend) + '</td></tr>'
        ).join('') + '</tbody></table></div>';
    } else if (type === 'delivered') {
      title = '📦 Delivered Orders';
      content = '<div class="text-xs text-muted mb-3">' + deliveredOrders.length + ' of ' + allOrders.length + ' total orders delivered</div>' +
        '<div class="table-container" style="border:none"><table class="data-table"><thead><tr><th>Code</th><th>Client</th><th>Garment</th><th>Value</th></tr></thead><tbody>' +
        deliveredOrders.sort((a,b)=>new Date(b.updatedAt||0)-new Date(a.updatedAt||0)).map(o =>
          '<tr><td class="font-mono text-gold text-xs">' + Utils.sanitizeHTML(o.orderCode||'—') + '</td>' +
          '<td class="text-xs">' + Utils.sanitizeHTML(o.clientName) + '</td>' +
          '<td class="text-xs">' + Utils.sanitizeHTML(o.title) + '</td>' +
          '<td class="font-mono text-xs">' + Utils.formatCurrency(o.price||0) + '</td></tr>'
        ).join('') + '</tbody></table></div>';
    } else if (type === 'completion') {
      title = '🎯 Pipeline Stages';
      const stages = {};
      allOrders.forEach(o => { stages[o.status]=(stages[o.status]||0)+1; });
      content = '<div class="table-container" style="border:none"><table class="data-table"><thead><tr><th>Stage</th><th>Count</th></tr></thead><tbody>' +
        Object.entries(stages).sort((a,b)=>b[1]-a[1]).map(([s,c]) =>
          '<tr><td><span class="badge badge-gold text-xs">' + Utils.sanitizeHTML(s) + '</span></td>' +
          '<td class="font-mono font-bold text-xs">' + c + '</td></tr>'
        ).join('') + '</tbody></table></div>';
    } else if (type === 'fulfillment') {
      title = '📅 Fulfillment Times';
      const times = deliveredOrders.filter(o=>o.createdAt&&o.updatedAt).map(o=>({
        code:o.orderCode||'—',client:o.clientName,name:o.title,
        days:Math.round((new Date(o.updatedAt)-new Date(o.createdAt))/(1000*60*60*24))
      })).sort((a,b)=>b.days-a.days);
      content = '<div class="table-container" style="border:none"><table class="data-table"><thead><tr><th>Code</th><th>Client</th><th>Garment</th><th>Days</th></tr></thead><tbody>' +
        times.map(t => '<tr><td class="font-mono text-gold text-xs">' + Utils.sanitizeHTML(t.code) + '</td>' +
          '<td class="text-xs">' + Utils.sanitizeHTML(t.client) + '</td>' +
          '<td class="text-xs">' + Utils.sanitizeHTML(t.name) + '</td>' +
          '<td class="font-mono font-bold text-xs ' + (t.days>84?'text-danger':t.days>56?'text-warning':'text-success') + '">' + t.days + 'd</td></tr>'
        ).join('') + '</tbody></table></div>';
    } else if (type === 'overdue') {
      title = '⚠️ Overdue Orders';
      const od = allOrders.filter(o=>!['Delivered','Completed'].includes(o.status)&&o.deadline&&new Date(o.deadline)<now).sort((a,b)=>new Date(a.deadline)-new Date(b.deadline));
      content = od.length===0 ? '<div class="text-center p-6 text-success font-semibold">No overdue orders!</div>' :
        '<div class="table-container" style="border:none"><table class="data-table"><thead><tr><th>Code</th><th>Client</th><th>Stage</th><th>Deadline</th><th>Days Over</th></tr></thead><tbody>' +
        od.map(o => {
          const days = Math.round((now-new Date(o.deadline))/(1000*60*60*24));
          return '<tr><td class="font-mono text-gold text-xs">' + Utils.sanitizeHTML(o.orderCode||'—') + '</td>' +
            '<td class="text-xs">' + Utils.sanitizeHTML(o.clientName) + '</td>' +
            '<td><span class="badge badge-gold text-xs">' + o.status + '</span></td>' +
            '<td class="text-xs text-danger">' + Utils.formatDate(o.deadline) + '</td>' +
            '<td class="font-mono font-bold text-danger text-xs">' + days + 'd</td></tr>';
        }).join('') + '</tbody></table></div>';
    } else if (type === 'workshop' || type === 'transit' || type === 'awaiting') {
      const groups = {
        workshop: { title: '🧵 In Workshop', statuses: ['New','In Design','Fabric Sourced','In Production','Fitting'] },
        transit:  { title: '🚚 In Transit / Ready', statuses: ['Ready','Shipped to Shashank','At Shashank','In Transit'] },
        awaiting: { title: '⏳ Awaiting Action', statuses: ['Awaiting Payment','Received in Australia','Final Fitting','Cleared for Delivery'] }
      };
      const g = groups[type];
      title = g.title;
      const list = allOrders.filter(o => g.statuses.includes(o.status)).sort((a,b)=>new Date(a.deadline||0)-new Date(b.deadline||0));
      content = list.length===0 ? '<div class="text-center p-6 text-muted text-xs">No orders in this stage right now.</div>' :
        '<div class="table-container" style="border:none"><table class="data-table"><thead><tr><th>Code</th><th>Client</th><th>Garment</th><th>Stage</th><th>Deadline</th></tr></thead><tbody>' +
        list.map(o =>
          '<tr style="cursor:pointer" onclick="App.closeModal();setTimeout(()=>CRM.showOrderDetails(\'' + o.id + '\'),200)">' +
          '<td class="font-mono text-gold text-xs">' + Utils.sanitizeHTML(o.orderCode||'—') + '</td>' +
          '<td class="text-xs">' + Utils.sanitizeHTML(o.clientName) + '</td>' +
          '<td class="text-xs">' + Utils.sanitizeHTML(o.title) + '</td>' +
          '<td><span class="badge badge-gold text-xs">' + Utils.sanitizeHTML(o.status) + '</span></td>' +
          '<td class="text-xs">' + Utils.formatDateShort(o.deadline) + '</td></tr>'
        ).join('') + '</tbody></table></div>';
    } else if (type === 'clients') {
      title = '👥 All Clients';
      content = '<div class="table-container" style="border:none"><table class="data-table"><thead><tr><th>Client</th><th>Type</th><th>Orders</th><th>Contact</th></tr></thead><tbody>' +
        allClients.sort((a,b)=>a.name.localeCompare(b.name)).map(c => {
          const cnt = allOrders.filter(o=>o.clientId===c.id).length;
          return '<tr><td class="font-semibold text-xs">' + Utils.sanitizeHTML(c.name) + '</td>' +
            '<td><span class="badge badge-muted text-xs">' + Utils.sanitizeHTML(c.type||'—') + '</span></td>' +
            '<td class="font-mono text-xs">' + cnt + '</td>' +
            '<td class="text-xs text-muted">' + Utils.sanitizeHTML(c.email||c.phone||'—') + '</td></tr>';
        }).join('') + '</tbody></table></div>';
    } else if (type === 'repeatrate') {
      title = '🔁 Repeat Clients';
      const cc = {};
      allOrders.forEach(o => { if (!cc[o.clientId]) cc[o.clientId]={name:o.clientName,count:0}; cc[o.clientId].count++; });
      const repeats = Object.values(cc).filter(c=>c.count>1).sort((a,b)=>b.count-a.count);
      content = '<div class="text-xs text-muted mb-3">' + repeats.length + ' repeat clients</div>' +
        '<div class="table-container" style="border:none"><table class="data-table"><thead><tr><th>Client</th><th>Orders</th></tr></thead><tbody>' +
        repeats.map(c => '<tr><td class="font-semibold text-xs">' + Utils.sanitizeHTML(c.name) + '</td><td class="font-mono font-bold text-gold text-xs">' + c.count + '</td></tr>').join('') + '</tbody></table></div>';
    } else if (type === 'brides') {
      title = '💍 Bridal Clients';
      const brides = allClients.filter(c=>c.type==='Bride');
      content = '<div class="table-container" style="border:none"><table class="data-table"><thead><tr><th>Bride</th><th>Wedding</th><th>Orders</th><th>Contact</th></tr></thead><tbody>' +
        brides.map(c => {
          const cnt = allOrders.filter(o=>o.clientId===c.id).length;
          return '<tr><td class="font-semibold text-xs">' + Utils.sanitizeHTML(c.name) + '</td>' +
            '<td class="text-xs">' + Utils.formatDate(c.weddingDate||c.eventDate||'') + '</td>' +
            '<td class="font-mono text-xs">' + cnt + '</td>' +
            '<td class="text-xs text-muted">' + Utils.sanitizeHTML(c.email||c.phone||'—') + '</td></tr>';
        }).join('') + '</tbody></table></div>';
    } else if (type === 'appointments') {
      title = '📋 All Appointments';
      content = '<div class="table-container" style="border:none"><table class="data-table"><thead><tr><th>Client</th><th>Type</th><th>Date</th><th>Status</th></tr></thead><tbody>' +
        appointments.sort((a,b)=>new Date(b.date||0)-new Date(a.date||0)).map(a =>
          '<tr><td class="font-semibold text-xs">' + Utils.sanitizeHTML(a.clientName||'—') + '</td>' +
          '<td class="text-xs">' + Utils.sanitizeHTML(a.type||'—') + '</td>' +
          '<td class="text-xs">' + Utils.formatDate(a.date) + '</td>' +
          '<td><span class="badge badge-muted text-xs">' + Utils.sanitizeHTML(a.status||'—') + '</span></td></tr>'
        ).join('') + '</tbody></table></div>';
    }

    App.showModal({
      title, content: '<div style="max-height:60vh;overflow-y:auto;">' + content + '</div>',
      submitText: 'Close', hideCancel: true, onSubmit: () => true, modalSize: 'modal-lg'
    });
  }

  const typeLabelsGlobal = { BLS: 'Bridal Lehenga', SAR: 'Saree', SAL: 'Salwar Suit', SHE: 'Sherwani', BSN: 'Bridal Sneakers', GEN: 'Other' };

  function showGarmentTypeOrders(type) {
    const allOrders = Store.getAll(Store.COLLECTIONS.ORDERS);
    const list = allOrders.filter(o => (o.productType || 'GEN') === type)
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    const label = typeLabelsGlobal[type] || type;
    const content = list.length === 0 ? '<div class="text-center p-6 text-muted text-xs">No orders of this type.</div>' :
      '<div class="table-container" style="border:none"><table class="data-table"><thead><tr><th>Code</th><th>Client</th><th>Garment</th><th>Stage</th><th>Value</th></tr></thead><tbody>' +
      list.map(o =>
        '<tr style="cursor:pointer" onclick="App.closeModal();setTimeout(()=>CRM.showOrderDetails(\'' + o.id + '\'),200)">' +
        '<td class="font-mono text-gold text-xs">' + Utils.sanitizeHTML(o.orderCode || '—') + '</td>' +
        '<td class="text-xs">' + Utils.sanitizeHTML(o.clientName) + '</td>' +
        '<td class="text-xs">' + Utils.sanitizeHTML(o.title) + '</td>' +
        '<td><span class="badge badge-gold text-xs">' + Utils.sanitizeHTML(o.status) + '</span></td>' +
        '<td class="font-mono text-xs">' + Utils.formatCurrency(o.price || 0) + '</td></tr>'
      ).join('') + '</tbody></table></div>';

    App.showModal({
      title: '🧵 ' + label + ' Orders',
      content: '<div style="max-height:60vh;overflow-y:auto;">' + content + '</div>',
      submitText: 'Close', hideCancel: true, onSubmit: () => true, modalSize: 'modal-lg'
    });
  }

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
    // "Delivered" here means "reached the customer" — that includes
    // orders sitting in 'Delivered' right now AND ones that have since
    // progressed to their final 'Completed' state. Checking only the
    // literal 'Delivered' status missed every finished order, since
    // every order moves past 'Delivered' into 'Completed' eventually.
    const deliveredOrders = allOrders.filter(o => ['Delivered', 'Completed'].includes(o.status));
    const activeOrders    = allOrders.filter(o => !['Delivered', 'Completed'].includes(o.status));
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
    const upcoming = allOrders.filter(o => !['Delivered', 'Completed'].includes(o.status) && o.deadline && new Date(o.deadline) <= in30 && new Date(o.deadline) >= now)
      .sort((a, b) => new Date(a.deadline) - new Date(b.deadline)).slice(0, 5);
    const overdue = allOrders.filter(o => !['Delivered', 'Completed'].includes(o.status) && o.deadline && new Date(o.deadline) < now)
      .sort((a, b) => new Date(a.deadline) - new Date(b.deadline));

    const typeLabels = { BLS: 'Bridal Lehenga', SAR: 'Saree', SAL: 'Salwar Suit', SHE: 'Sherwani', BSN: 'Bridal Sneakers', GEN: 'Other' };

    container.innerHTML = `
      <!-- KPI Strip — single scrollable row -->
      <style>
        @keyframes kpiSlideIn {
          from { opacity:0; transform:translateY(12px) scale(0.96); }
          to   { opacity:1; transform:translateY(0) scale(1); }
        }
        @keyframes kpiPulse {
          0%,100% { box-shadow: 0 0 0 0 rgba(212,175,55,0); }
          50%      { box-shadow: 0 0 0 4px rgba(212,175,55,0.15); }
        }
        .kpi-card {
          display:flex;flex-direction:column;
          background:var(--pc-card-bg);
          border:1px solid var(--pc-border);
          border-radius:10px;padding:10px 14px;
          min-width:120px;gap:3px;
          opacity:0;
          animation: kpiSlideIn 0.4s ease forwards;
          transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
          cursor:default;
        }
        .kpi-card:hover {
          transform: translateY(-3px) scale(1.03);
          border-color: var(--pc-gold, #d4af37);
          box-shadow: 0 6px 20px rgba(212,175,55,0.15);
        }
        .kpi-value {
          font-size:17px;font-weight:500;
          color:var(--pc-text);line-height:1.2;
          transition: color 0.2s;
        }
        .kpi-card:hover .kpi-value { color: var(--pc-gold, #d4af37); }
      </style>
      <div style="overflow-x:auto;margin-bottom:20px;">
        <div style="display:flex;gap:10px;padding-bottom:6px;min-width:max-content;">
          <div class="kpi-card" style="animation-delay:0.00s;cursor:pointer;" onclick="CRM.showKPIReport('revenue')"><div style="font-size:10px;font-weight:700;color:var(--pc-text-muted);text-transform:uppercase;letter-spacing:.5px;">Revenue</div><div style="font-size:13px;">💰</div><div class="kpi-value">${Utils.formatCurrency(totalRevenue)}</div></div>
          <div class="kpi-card" style="animation-delay:0.05s;cursor:pointer;" onclick="CRM.showKPIReport('outstanding')"><div style="font-size:10px;font-weight:700;color:var(--pc-text-muted);text-transform:uppercase;letter-spacing:.5px;">Outstanding</div><div style="font-size:13px;">⏳</div><div class="kpi-value">${Utils.formatCurrency(outstandingAmt)}</div></div>
          <div class="kpi-card" style="animation-delay:0.15s;cursor:pointer;" onclick="CRM.showKPIReport('ltv')"><div style="font-size:10px;font-weight:700;color:var(--pc-text-muted);text-transform:uppercase;letter-spacing:.5px;">Avg LTV</div><div style="font-size:13px;">👑</div><div class="kpi-value">${Utils.formatCurrency(avgCLTV)}</div></div>
          <div class="kpi-card" style="animation-delay:0.20s;cursor:pointer;" onclick="CRM.showKPIReport('delivered')"><div style="font-size:10px;font-weight:700;color:var(--pc-text-muted);text-transform:uppercase;letter-spacing:.5px;">Delivered</div><div style="font-size:13px;">📦</div><div class="kpi-value">${deliveredOrders.length} / ${allOrders.length}</div></div>
          <div class="kpi-card" style="animation-delay:0.25s;cursor:pointer;" onclick="CRM.showKPIReport('completion')"><div style="font-size:10px;font-weight:700;color:var(--pc-text-muted);text-transform:uppercase;letter-spacing:.5px;">Completion</div><div style="font-size:13px;">🎯</div><div class="kpi-value">${conversionRate}%</div></div>
          <div class="kpi-card" style="animation-delay:0.30s;cursor:pointer;" onclick="CRM.showKPIReport('fulfillment')"><div style="font-size:10px;font-weight:700;color:var(--pc-text-muted);text-transform:uppercase;letter-spacing:.5px;">Avg Fulfillment</div><div style="font-size:13px;">📅</div><div class="kpi-value">${avgFulfillDays > 0 ? avgFulfillDays + String.fromCharCode(100) : String.fromCharCode(8212)}</div></div>
          <div class="kpi-card" style="animation-delay:0.35s;cursor:pointer;" onclick="CRM.showKPIReport('overdue')"><div style="font-size:10px;font-weight:700;color:var(--pc-text-muted);text-transform:uppercase;letter-spacing:.5px;">Overdue</div><div style="font-size:13px;">⚠️</div><div class="kpi-value">${overdue.length}</div></div>
          <div class="kpi-card" style="animation-delay:0.40s;cursor:pointer;" onclick="CRM.showKPIReport('clients')"><div style="font-size:10px;font-weight:700;color:var(--pc-text-muted);text-transform:uppercase;letter-spacing:.5px;">Total Clients</div><div style="font-size:13px;">👥</div><div class="kpi-value">${allClients.length}</div></div>
          <div class="kpi-card" style="animation-delay:0.45s;cursor:pointer;" onclick="CRM.showKPIReport('repeatrate')"><div style="font-size:10px;font-weight:700;color:var(--pc-text-muted);text-transform:uppercase;letter-spacing:.5px;">Repeat Rate</div><div style="font-size:13px;">🔁</div><div class="kpi-value">${repeatRate}%</div></div>
          <div class="kpi-card" style="animation-delay:0.50s;cursor:pointer;" onclick="CRM.showKPIReport('brides')"><div style="font-size:10px;font-weight:700;color:var(--pc-text-muted);text-transform:uppercase;letter-spacing:.5px;">Brides</div><div style="font-size:13px;">💍</div><div class="kpi-value">${allClients.filter(function(c){return c.type===String.fromCharCode(66,114,105,100,101);}).length}</div></div>
          <div class="kpi-card" style="animation-delay:0.55s;cursor:pointer;" onclick="CRM.showKPIReport('appointments')"><div style="font-size:10px;font-weight:700;color:var(--pc-text-muted);text-transform:uppercase;letter-spacing:.5px;">Appointments</div><div style="font-size:13px;">📋</div><div class="kpi-value">${appointments.length}</div></div>
        </div>
      </div>

            <!-- Pipeline Health -->
      <div class="card p-4 mb-4 animate-fade-in stagger-3">
        <div class="card-title mb-3">📋 Pipeline Health</div>
        <div class="d-grid gap-3" style="grid-template-columns:repeat(auto-fit,minmax(130px,1fr))">
          <div class="p-3 rounded-md text-center" style="cursor:pointer;background:rgba(139,92,246,0.08);border:1px solid var(--pc-border)" onclick="CRM.showKPIReport('workshop')">
            <div class="text-lg font-bold" style="color:#a78bfa">${inWorkshop}</div>
            <div class="text-xs text-muted mt-1">In Workshop</div>
          </div>
          <div class="p-3 rounded-md text-center" style="cursor:pointer;background:rgba(59,130,246,0.08);border:1px solid var(--pc-border)" onclick="CRM.showKPIReport('transit')">
            <div class="text-lg font-bold" style="color:#60a5fa">${inTransit}</div>
            <div class="text-xs text-muted mt-1">In Transit / Ready</div>
          </div>
          <div class="p-3 rounded-md text-center" style="cursor:pointer;background:rgba(236,182,118,0.08);border:1px solid var(--pc-border)" onclick="CRM.showKPIReport('awaiting')">
            <div class="text-lg font-bold text-gold">${awaitingAct}</div>
            <div class="text-xs text-muted mt-1">Awaiting Action</div>
          </div>
          <div class="p-3 rounded-md text-center" style="cursor:pointer;background:rgba(16,185,129,0.08);border:1px solid var(--pc-border)" onclick="CRM.showKPIReport('delivered')">
            <div class="text-lg font-bold text-success">${deliveredOrders.length}</div>
            <div class="text-xs text-muted mt-1">Delivered</div>
          </div>
          ${overdue.length > 0 ? `
          <div class="p-3 rounded-md text-center" style="cursor:pointer;background:rgba(220,38,38,0.08);border:1px solid var(--pc-danger)" onclick="CRM.showKPIReport('overdue')">
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
              return '<div class="mb-3" style="cursor:pointer" onclick="CRM.showGarmentTypeOrders(\'' + type + '\')">' +
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
              '<div class="d-flex justify-between items-center p-2 rounded-md mb-2" style="cursor:pointer;background:rgba(255,255,255,0.02);border:1px solid var(--pc-border)" onclick="CRM.showClientDetailsModal(\'' + clientId + '\')">' +
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
              return '<tr style="cursor:pointer" onclick="CRM.showOrderDetails(\'' + o.id + '\')">' +
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


  // Generic payment recorder — for any order, at any pipeline stage, not
  // tied to a specific status transition. Unlike recordPaymentAndClear
  // (which also forces the order to "Cleared for Delivery"), this only
  // updates the invoice. Used by the always-visible Invoice Summary panel
  // in the Order Summary modal so a deposit/progress payment can be logged
  // without the order needing to be in "Awaiting Payment" first.
  function recordAdditionalPayment(orderId) {
    const o = Store.getById(Store.COLLECTIONS.ORDERS, orderId);
    if (!o) return;
    const invoice = _getOrderInvoice(o);
    if (!invoice) { Utils.showToast('No invoice found for this order.', 'error'); return; }
    const paid = (invoice.amountPaid != null && invoice.amountPaid !== '') ? parseFloat(invoice.amountPaid) : 0;
    const balance = Math.round((invoice.total - paid) * 100) / 100;

    App.showModal({
      title: '💳 Record Payment — ' + (o.orderCode || o.id),
      content: `
        <form id="add-pay-form" class="animate-fade-in-scale">
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
            <input type="text" inputmode="decimal" autocomplete="off" name="paymentAmount" class="form-input" required value="${balance}">
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
      submitText: '✓ Confirm Payment',
      onSubmit: async (modalEl) => {
        const form = Utils.$('#add-pay-form', modalEl);
        if (!form.checkValidity()) { form.reportValidity(); return false; }
        const fd = new FormData(form);
        const amount = parseFloat((fd.get('paymentAmount') || '').replace(',', '.')) || 0;
        const ok = await Invoicing.recordAdditionalPayment(invoice.id, amount, fd.get('paymentMethod'));
        if (!ok) return false;

        App.closeModal();
        setTimeout(() => showOrderDetails(orderId), 200);
        return true;
      }
    });
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
            <input type="text" inputmode="decimal" autocomplete="off" name="paymentAmount" class="form-input" min="0" step="0.01"
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
        const amount = parseFloat((fd.get('paymentAmount') || '').replace(',', '.')) || 0;
        const ok = await Invoicing.recordAdditionalPayment(invoice.id, amount, fd.get('paymentMethod'));
        if (!ok) return false;

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
        const shipCost = parseFloat(o.shippingCost) || 0;
        const share = o.shippingAllocation === 'Half' ? shipCost / 2 : shipCost;
        // International shipping = 0% Australian GST. Domestic = 10%.
        const isInternational = o.deliveryDestination === 'India' || o.deliveryDestination === 'Overseas';
        await Invoicing.addShippingLine(invoice.id, {
          description: 'Shipping contribution',
          shareAmount: share,
          gstRate: isInternational ? 0 : 0.10
        });
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
              <input type="text" inputmode="decimal" autocomplete="off" id="route-a-payment" class="form-input" min="0" step="0.01" value="${balance}" placeholder="0.00">
              <div class="text-xs text-muted mt-1">Leave as 0 to skip payment recording and deliver anyway.</div>
            </div>
          </div>`,
        submitText: '✓ Mark Delivered',
        onSubmit: async (modalEl) => {
          const amount = parseFloat((Utils.$('#route-a-payment', modalEl).value || '').replace(',', '.')) || 0;
          if (amount > 0 && invoice) {
            await Invoicing.recordAdditionalPayment(invoice.id, amount, 'Delivery Collection');
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
            ? '<button class="btn btn-primary btn-sm" onclick="CRM.createProjectInvoice(\'' + proj.id + '\')">🧾 Create Invoice</button>'
            : (invoice.status === 'Paid'
              ? '<button class="btn btn-secondary btn-sm" disabled title="Invoice is Paid and locked">🔒 Locked</button>'
              : '<button class="btn btn-secondary btn-sm" onclick="CRM.syncInvoiceFromOrders(\'' + (subOrders[0] ? subOrders[0].id : '') + '\')">🔄 Sync from Orders</button>');
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
                    '<button class="btn btn-secondary btn-sm" onclick="CRM.addSubOrder(\'' + proj.id + '\')">+ Add Garment</button>' +
                    '<button class="btn btn-secondary btn-sm" onclick="CRM.viewProject(\'' + proj.id + '\')">View</button>' +
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
              <input type="text" inputmode="decimal" autocomplete="off" name="totalPrice" class="form-input" min="0" step="0.01" required value="${proj?proj.totalPrice:''}">
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
          totalPrice: parseFloat((fd.get('totalPrice') || '').replace(',', '.')) || 0,
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
              <input type="text" inputmode="decimal" autocomplete="off" name="price" class="form-input" min="0" step="0.01" required>
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
          price: parseFloat((fd.get('price') || '').replace(',', '.')) || 0,
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

        // If an invoice already exists for this project, it is left
        // untouched — auto-sync was the root cause of totals/shipping/
        // milestones being silently overwritten. Use the explicit
        // "Sync Invoice from Orders" button to pull the new garment in.
        const existingInv = Store.query(Store.COLLECTIONS.INVOICES, i => i.projectId === projectId)[0];
        if (existingInv) {
          Utils.showToast(`Garment added to ${proj.projectName}. Click "Sync Invoice from Orders" to update the invoice.`, 'info');
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
            <div><span class="text-muted text-xs">Total (inc GST${invoice ? ' + shipping' : ''}):</span><div class="font-mono font-bold text-gold">${Utils.formatCurrency(invoice ? invoice.total : Math.round(proj.totalPrice * 1.10 * 100) / 100)}</div></div>
          </div>
          ${invoice ? `
            <div class="p-3 rounded-md" style="background:rgba(0,0,0,0.2);border:1px solid var(--pc-border)">
              <div class="d-flex justify-between items-center mb-3">
                <div class="text-xs font-semibold text-gold">🧾 Invoice ${Utils.sanitizeHTML(invoice.invoiceNumber)}</div>
                <div class="d-flex gap-2 items-center">
                  <span class="badge ${invoice.status === 'Paid' ? 'badge-success' : invoice.status === 'Partially Paid' ? 'badge-warning' : 'badge-muted'} text-xs">${invoice.status}</span>
                  ${invoice.status !== 'Paid' && subOrders.length > 0 ? `<button class="btn btn-secondary" style="font-size:10px;padding:3px 10px" onclick="CRM.syncInvoiceFromOrders('${subOrders[0].id}')" title="Recalculate invoice from current order prices">🔄 Sync</button>` : ''}
                  <button class="btn btn-secondary" style="font-size:10px;padding:3px 10px" onclick="App.closeModal();setTimeout(()=>CRM.showEditInvoiceModal('${invoice.id}'),200)">✏️ Edit</button>
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
                    ${subOrders.map(o => `<tr style="cursor:pointer" onclick="App.closeModal();setTimeout(()=>CRM.showOrderDetails('${o.id}'),200)" title="Click to view full garment details, photos, and photo requests">
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
              : invoice.status === 'Paid'
                ? `<button class="btn btn-secondary" disabled title="Invoice is Paid and locked">🔒 Locked</button>`
                : `<button class="btn btn-secondary" onclick="CRM.syncInvoiceFromOrders('${subOrders[0] ? subOrders[0].id : ''}')">🔄 Sync from Orders</button>`}
          </div>
        </div>`,
      hideCancel: true, submitText: 'Close', onSubmit: () => true,
      modalSize: 'modal-lg'
    });
  }

  // Direct, plain invoice editing — every line item, GST amount, and
  // amount paid is a manually editable field. Whatever is saved here is
  // exactly what's stored; nothing recalculates behind your back. This is
  // the deliberate override path for cases where the auto-derived numbers
  // (from order prices) aren't trustworthy or don't apply — e.g. historical
  // orders with missing per-garment prices.
  function showEditInvoiceModal(invoiceId) {
    const invoice = Store.getById(Store.COLLECTIONS.INVOICES, invoiceId);
    if (!invoice) { Utils.showToast('Invoice not found.', 'error'); return; }

    // gstRate is inferred from existing unitPrice/gst where possible (defaults to 10%
    // if it can't be cleanly inferred, matching the app's historical default).
    const inferRate = (unitPrice, gst) => {
      if (!unitPrice) return 0.10;
      const r = gst / unitPrice;
      if (Math.abs(r - 0.05) < 0.01) return 0.05;
      if (Math.abs(r - 0.10) < 0.01) return 0.10;
      if (Math.abs(r) < 0.01) return 0;
      return 0.10;
    };

    let items = (invoice.items && invoice.items.length)
      ? invoice.items.map(it => ({
          description: it.description || '',
          unitPrice: it.unitPrice != null ? it.unitPrice : 0,
          gstRate: it.gstRate != null ? it.gstRate : inferRate(it.unitPrice, it.gst),
          gst: it.gst != null ? it.gst : 0
        }))
      : [{ description: '', unitPrice: 0, gstRate: 0.10, gst: 0 }];

    const fmt = (n) => Utils.formatCurrency(Math.round((n || 0) * 100) / 100);
    const clean = (v) => {
      const n = parseFloat(String(v == null ? '' : v).replace(',', '.'));
      return isNaN(n) ? 0 : n;
    };

    const settings = Store.getSettings();

    App.showModal({
      title: `✏️ Edit Invoice — ${Utils.sanitizeHTML(invoice.invoiceNumber || '')}`,
      modalSize: 'modal-lg',
      content: `
        <div class="animate-fade-in" style="background:#fff;color:#111;border-radius:10px;padding:28px;font-family:sans-serif">

          <div class="d-flex justify-between items-start" style="border-bottom:2px solid #ECB676;padding-bottom:16px;margin-bottom:20px">
            <div>
              <div style="font-size:16px;font-weight:bold;color:#111">${Utils.sanitizeHTML(settings.companyName || "Pooja's Couture")}</div>
              <div style="font-size:11px;color:#666;margin-top:2px">ABN: ${Utils.sanitizeHTML(settings.abn || '')}</div>
              <div style="font-size:11px;color:#666">${Utils.sanitizeHTML(settings.companyAddress || '')}</div>
            </div>
            <div class="text-right">
              <div style="font-size:14px;font-weight:bold;text-transform:uppercase;color:#ECB676">Tax Invoice</div>
              <div style="font-size:13px;font-weight:bold;font-family:monospace;margin-top:4px">${Utils.sanitizeHTML(invoice.invoiceNumber || '')}</div>
              <div style="font-size:11px;color:#666;margin-top:2px">Status: <span style="font-weight:bold;text-transform:uppercase;color:${invoice.status==='Paid'?'#10B981':'#F59E0B'}">${invoice.status}</span></div>
            </div>
          </div>

          <div style="margin-bottom:20px">
            <div style="font-size:10px;font-weight:bold;color:#888;text-transform:uppercase;margin-bottom:2px">Bill To</div>
            <div style="font-size:14px;font-weight:bold;color:#111">${Utils.sanitizeHTML(invoice.clientName || '')}</div>
          </div>

          <div class="d-flex justify-between items-center mb-2">
            <div style="font-size:10px;font-weight:bold;color:#888;text-transform:uppercase">Line Items</div>
            <button type="button" class="btn btn-secondary btn-sm" id="ei-add-item">+ Add Line</button>
          </div>

          <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:8px">
            <thead>
              <tr style="background:#fdfaf6">
                <th style="padding:8px;text-align:left;border-bottom:2px solid #ECB676;color:#111;font-size:11px;text-transform:uppercase">Description</th>
                <th style="padding:8px;text-align:right;border-bottom:2px solid #ECB676;color:#111;font-size:11px;text-transform:uppercase;width:120px">Unit Rate</th>
                <th style="padding:8px;text-align:center;border-bottom:2px solid #ECB676;color:#111;font-size:11px;text-transform:uppercase;width:80px">GST %</th>
                <th style="padding:8px;text-align:right;border-bottom:2px solid #ECB676;color:#111;font-size:11px;text-transform:uppercase;width:90px">GST $</th>
                <th style="padding:8px;text-align:center;border-bottom:2px solid #ECB676;width:36px"></th>
              </tr>
            </thead>
            <tbody id="ei-items-container"></tbody>
          </table>

          <div class="d-flex justify-between items-center" style="padding:8px 0;border-bottom:1px solid #eee;margin-bottom:20px">
            <span style="font-size:12px;color:#666">Shipping (AUD, no GST)</span>
            <input type="text" inputmode="decimal" autocomplete="off" id="ei-shipping" value="${invoice.shipping != null ? invoice.shipping : 0}" style="width:120px;text-align:right;padding:6px 8px;border:1px solid #ddd;border-radius:6px;font-family:monospace">
          </div>

          <div class="d-flex justify-end" style="margin-bottom:20px">
            <div style="width:260px;font-size:13px">
              <div class="d-flex justify-between" style="padding:4px 0"><span style="color:#666">Subtotal (ex-GST):</span><span class="font-mono" id="ei-subtotal">${fmt(invoice.subtotal)}</span></div>
              <div class="d-flex justify-between" style="padding:4px 0;border-bottom:1px solid #eee"><span style="color:#666">GST Total:</span><span class="font-mono" id="ei-gsttotal">${fmt(invoice.gstTotal)}</span></div>
              <div class="d-flex justify-between" style="padding:4px 0;border-bottom:1px solid #eee"><span style="color:#666">Shipping:</span><span class="font-mono" id="ei-shipping-display">${fmt(invoice.shipping || 0)}</span></div>
              <div class="d-flex justify-between" style="padding:8px 0;font-weight:bold;font-size:15px;color:#ECB676"><span>Invoice Total:</span><span class="font-mono" id="ei-total">${fmt(invoice.total)}</span></div>
            </div>
          </div>

          <div class="d-flex justify-between items-center" style="padding:8px 0;border-top:1px solid #eee;margin-bottom:8px">
            <span style="font-size:13px;color:#666">Amount Paid (AUD)</span>
            <input type="text" inputmode="decimal" autocomplete="off" id="ei-amount-paid" value="${invoice.amountPaid != null ? invoice.amountPaid : 0}" style="width:140px;text-align:right;padding:6px 8px;border:1px solid #ddd;border-radius:6px;font-family:monospace;font-weight:bold">
          </div>

          <div class="d-flex justify-between items-center" style="padding:12px 14px;border-radius:8px;background:#fbf3e7;border:1px solid #ECB676;font-size:15px;font-weight:bold">
            <span>Balance Due:</span>
            <span class="font-mono" id="ei-balance">—</span>
          </div>

          <div style="font-size:11px;color:#999;margin-top:20px;padding-top:12px;border-top:1px solid #eee">
            Every field here is directly editable — nothing auto-recalculates from orders. What you save is exactly what's stored.
          </div>
        </div>`,
      submitText: 'Save Invoice',
      onSubmit: async () => {
        const paid = clean(document.getElementById('ei-amount-paid').value);
        const shipping  = clean(document.getElementById('ei-shipping').value);

        const cleanItems = items
          .filter(it => (it.description || '').trim() !== '' || clean(it.unitPrice) !== 0 || clean(it.gst) !== 0)
          .map(it => ({
            description: it.description || '',
            quantity: 1,
            unitPrice: clean(it.unitPrice),
            gstRate: it.gstRate != null ? it.gstRate : 0.10,
            gst: clean(it.gst),
            amount: Math.round((clean(it.unitPrice) + clean(it.gst)) * 100) / 100
          }));

        await Invoicing.editDirect(invoiceId, { items: cleanItems, shipping, amountPaid: paid });

        if (invoice.projectId) {
          const subtotal = cleanItems.reduce((s, it) => s + (it.unitPrice || 0), 0);
          await Store.update(Store.COLLECTIONS.ORDER_PROJECTS, invoice.projectId, { totalPrice: Math.round(subtotal * 100) / 100 });
        }
        renderSubTab();
        return true;
      }
    });

    // --- Post-mount wiring: items list is fully dynamic (add/remove rows,
    // live totals), so it's built and rewired after the modal is in the DOM.
    setTimeout(() => {
      const container  = document.getElementById('ei-items-container');
      const subtotalEl  = document.getElementById('ei-subtotal');
      const gstTotalEl  = document.getElementById('ei-gsttotal');
      const totalEl     = document.getElementById('ei-total');
      const paidInput   = document.getElementById('ei-amount-paid');
      const balanceEl   = document.getElementById('ei-balance');
      const shippingInput = document.getElementById('ei-shipping');
      const shippingDisplayEl = document.getElementById('ei-shipping-display');
      if (!container) return;

      const recalc = () => {
        const subtotal = items.reduce((s, it) => s + clean(it.unitPrice), 0);
        const gstTotal  = items.reduce((s, it) => s + clean(it.gst), 0);
        const shipping  = clean(shippingInput.value);
        const total     = subtotal + gstTotal + shipping;
        const paid      = clean(paidInput.value);
        subtotalEl.textContent = fmt(subtotal);
        gstTotalEl.textContent = fmt(gstTotal);
        shippingDisplayEl.textContent = fmt(shipping);
        totalEl.textContent    = fmt(total);
        const balance = Math.round((total - paid) * 100) / 100;
        balanceEl.textContent = fmt(balance);
        balanceEl.style.color = balance > 0 ? '#ef4444' : '#10b981';
      };
      shippingInput.addEventListener('input', recalc);

      const renderItems = () => {
        const gstOption = (rate, current) => `<option value="${rate}" ${Math.abs(current - rate) < 0.001 ? 'selected' : ''}>${Math.round(rate * 100)}%</option>`;

        container.innerHTML = items.map((it, idx) => `
          <tr data-row="${idx}" style="border-bottom:1px solid #eee">
            <td style="padding:6px 8px">
              <input type="text" class="ei-desc" data-idx="${idx}" placeholder="Description" value="${Utils.sanitizeHTML(it.description)}" style="width:100%;padding:6px 8px;border:1px solid #ddd;border-radius:6px;font-size:13px">
            </td>
            <td style="padding:6px 8px">
              <input type="text" inputmode="decimal" class="ei-unitprice" data-idx="${idx}" placeholder="0.00" value="${it.unitPrice}" style="width:100%;padding:6px 8px;border:1px solid #ddd;border-radius:6px;text-align:right;font-family:monospace;font-size:13px">
            </td>
            <td style="padding:6px 8px">
              <select class="ei-gstrate" data-idx="${idx}" style="width:100%;padding:6px 4px;border:1px solid #ddd;border-radius:6px;font-size:13px">
                ${gstOption(0, it.gstRate)}
                ${gstOption(0.05, it.gstRate)}
                ${gstOption(0.10, it.gstRate)}
              </select>
            </td>
            <td style="padding:6px 8px;text-align:right;font-family:monospace;font-size:13px;color:#666" class="ei-gst-display" data-idx="${idx}">${fmt(it.gst)}</td>
            <td style="padding:6px 8px;text-align:center">
              <button type="button" class="ei-remove" data-idx="${idx}" title="Remove line" style="background:none;border:none;cursor:pointer;font-size:15px;color:#c0392b">🗑️</button>
            </td>
          </tr>`).join('');

        Utils.$$('.ei-desc', container).forEach(el => el.addEventListener('input', () => {
          items[+el.dataset.idx].description = el.value;
        }));
        Utils.$$('.ei-unitprice', container).forEach(el => el.addEventListener('input', () => {
          const idx = +el.dataset.idx;
          items[idx].unitPrice = el.value.replace(/[^0-9.,]/g, '');
          items[idx].gst = Math.round(clean(items[idx].unitPrice) * items[idx].gstRate * 100) / 100;
          const disp = container.querySelector(`.ei-gst-display[data-idx="${idx}"]`);
          if (disp) disp.textContent = fmt(items[idx].gst);
          recalc();
        }));
        Utils.$$('.ei-gstrate', container).forEach(el => el.addEventListener('change', () => {
          const idx = +el.dataset.idx;
          items[idx].gstRate = parseFloat(el.value);
          items[idx].gst = Math.round(clean(items[idx].unitPrice) * items[idx].gstRate * 100) / 100;
          const disp = container.querySelector(`.ei-gst-display[data-idx="${idx}"]`);
          if (disp) disp.textContent = fmt(items[idx].gst);
          recalc();
        }));
        Utils.$$('.ei-remove', container).forEach(el => el.addEventListener('click', () => {
          if (items.length <= 1) { Utils.showToast('Invoice needs at least one line.', 'error'); return; }
          items.splice(+el.dataset.idx, 1);
          renderItems();
          recalc();
        }));
      };

      document.getElementById('ei-add-item').addEventListener('click', () => {
        items.push({ description: '', unitPrice: 0, gstRate: 0.10, gst: 0 });
        renderItems();
        recalc();
      });
      paidInput.addEventListener('input', recalc);

      renderItems();
      recalc();
    }, 50);
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
                <input type="text" inputmode="decimal" autocomplete="off" name="m1paid" id="m1paid-input" class="form-input" min="0" step="0.01" value="0" placeholder="0.00">
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
        const m1paid = parseFloat((fd.get('m1paid') || '').replace(',', '.')) || 0;

        const created = await Invoicing.createForProject(projectId, {
          clientId: proj.clientId,
          clientName: proj.clientName,
          invoiceNumber: 'INV-' + new Date().getFullYear() + '-' + Utils.randomBetween(100, 999),
          issueDate: fd.get('issueDate'),
          dueDate: fd.get('dueDate'),
          notes: fd.get('notes') || ''
        });
        if (!created) { Utils.showToast('Could not create invoice.', 'error'); return false; }

        // Deposit entered at creation time — record it through the same
        // shared milestone-payment function everything else uses, so the
        // rollover math has exactly one implementation, not a second copy
        // duplicated here.
        if (m1paid > 0) {
          await Invoicing.recordMilestonePayment(created.id, 0, m1paid, 'Deposit', fd.get('issueDate'));
        }

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
            <input type="text" inputmode="decimal" autocomplete="off" name="amount" class="form-input" id="milestone-amount-input"
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
        const amount = parseFloat((fd.get('amount') || '').replace(',', '.')) || 0;

        const ok = await Invoicing.recordMilestonePayment(invoice.id, milestoneIndex, amount, fd.get('paymentMethod'));
        if (!ok) return false;

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

  function quickEmailClient(clientId) {
    showComposeModal(clientId, 'custom', {});
  }

  function deletePhoto(photoId, orderId) {
    const photo = Store.getById(Store.COLLECTIONS.JOB_PHOTOS, photoId);
    App.showModal({
      title: 'Remove Photo?',
      content: `
        ${photo ? `<img src="${photo.url}" style="width:100%;max-height:220px;object-fit:contain;border-radius:8px;margin-bottom:12px">` : ''}
        <div class="text-xs text-muted">This permanently removes the photo from the order. This cannot be undone. The karigar will need to re-upload if it was correct.</div>`,
      submitText: 'Remove Photo',
      onSubmit: async () => {
        try {
          const res = await fetch('/api/delete-photo', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ photoId })
          });
          const out = await res.json();
          if (!out.ok) throw new Error(out.error || 'Delete failed');
          await Store.refresh('job_photos');
          Store.logAction(`Removed a photo from order ${orderId}`);
          Utils.showToast('Photo removed.');
          setTimeout(() => showOrderDetails(orderId), 200);
          return true;
        } catch (err) {
          Utils.showToast('Could not remove photo: ' + err.message, 'error');
          return false;
        }
      }
    });
  }

  function requestPhotos(orderId) {
    const o = Store.getById(Store.COLLECTIONS.ORDERS, orderId);
    if (!o) return;
    App.showModal({
      title: `📸 Request Photos — ${o.title}`,
      content: `
        <div class="form-group">
          <label class="form-label">What photos do you need? *</label>
          <textarea id="preq-items" class="form-input" rows="3" placeholder="e.g. front, back, dupatta close-up, handwork detail" required></textarea>
        </div>
        <div class="text-xs text-muted">The karigar will see this as a red alert in their workstation. Send them a WhatsApp too so they check the portal.</div>`,
      submitText: 'Send Request',
      onSubmit: async () => {
        const items = Utils.$('#preq-items').value.trim();
        if (!items) { Utils.showToast('Describe the photos you need.', 'error'); return false; }
        const currentUser = Store.getCurrentUser();
        await Store.create(Store.COLLECTIONS.PHOTO_REQUESTS, {
          orderId: orderId,
          orderTitle: o.title,
          clientName: o.clientName,
          requestedItems: items,
          status: 'Pending',
          requestedBy: currentUser ? currentUser.name : 'Unknown'
        });
        Store.logAction(`Requested photos for order ${o.orderCode || o.title}: ${Utils.truncateText(items, 60)}`);
        Utils.showToast('Photo request sent to the karigar workstation.');
        return true;
      }
    });
  }

  function logClientChange(clientId) {
    const client = Store.getById(Store.COLLECTIONS.CLIENTS, clientId);
    if (!client) return;
    const clientOrders = Store.query(Store.COLLECTIONS.ORDERS, o => o.clientId === clientId);
    const today = new Date().toISOString().slice(0, 10);

    App.showModal({
      title: `Log Change — ${client.name}`,
      content: `
        <div class="d-flex flex-col gap-3">
          <div class="d-grid gap-3" style="grid-template-columns:1fr 1fr">
            <div class="form-group">
              <label class="form-label">Change Date *</label>
              <input type="date" id="chg-date" class="form-input" value="${today}" required>
            </div>
            <div class="form-group">
              <label class="form-label">Requested By *</label>
              <select id="chg-requested-by" class="form-select">
                <option value="Client">Client</option>
                <option value="Boutique">Boutique</option>
              </select>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Related Garment / Order (optional)</label>
            <select id="chg-order" class="form-select">
              <option value="">— Whole project / general —</option>
              ${clientOrders.map(o => `<option value="${o.id}">${Utils.sanitizeHTML(o.title)}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">What changed? *</label>
            <textarea id="chg-desc" class="form-input" rows="3" placeholder="e.g. Client requested sleeve length increased to 18in; dupatta colour changed from 26 to 132" required></textarea>
          </div>
          <div class="d-grid gap-3" style="grid-template-columns:1fr 1fr">
            <div class="form-group">
              <label class="form-label">Price Impact (AUD, inc GST)</label>
              <input type="text" inputmode="decimal" autocomplete="off" id="chg-price" class="form-input" step="0.01" value="0" placeholder="0 = no change, negative = discount">
            </div>
            <div class="form-group">
              <label class="form-label">Timeline Impact</label>
              <input type="text" id="chg-timeline" class="form-input" placeholder="e.g. +1 week, or none">
            </div>
          </div>
        </div>`,
      submitText: 'Save Change',
      onSubmit: async () => {
        const desc = Utils.$('#chg-desc').value.trim();
        if (!desc) { Utils.showToast('Description is required.', 'error'); return false; }
        const orderId = Utils.$('#chg-order').value || null;
        const relOrder = orderId ? Store.getById(Store.COLLECTIONS.ORDERS, orderId) : null;
        const currentUser = Store.getCurrentUser();
        await Store.create(Store.COLLECTIONS.CLIENT_CHANGES, {
          clientId: clientId,
          clientName: client.name,
          orderId: orderId,
          projectId: relOrder ? (relOrder.projectId || null) : null,
          changeDate: Utils.$('#chg-date').value || today,
          description: desc,
          requestedBy: Utils.$('#chg-requested-by').value,
          priceImpact: parseFloat((Utils.$('#chg-price').value || '').replace(',', '.')) || 0,
          timelineImpact: Utils.$('#chg-timeline').value.trim() || null,
          loggedBy: currentUser ? currentUser.name : 'Unknown'
        });
        Store.logAction(`Logged change for client ${client.name}: ${Utils.truncateText(desc, 60)}`);
        Utils.showToast('Change logged.');
        setTimeout(() => showClientDetailsModal(clientId), 250);
        return true;
      }
    });
  }

  return {
    init,
    editClient,
    createClientFromBooking,
    deleteClient,
    quickEmailClient,
    completeAppointment,
    editAppointment,
    deleteAppointment,
    sendFittingReminder,
    moveOrderStage,
    addShippingToInvoice,
    extendDeadline,
    editOrder,
    deleteOrder,
    showComposeModal,
    recordPaymentAndClear,
    recordAdditionalPayment,
    showEditInvoiceModal,
    syncInvoiceFromOrders,
    markReceivedInAustralia,
    markFinalFitting,
    markReadyToDeliver,
    addSubOrder,
    viewProject,
    showProjectModal,
    createProjectInvoice,
    showKPIReport,
    showClientDetailsModal,
    showGarmentTypeOrders,
    recordMilestonePayment,
    logClientChange,
    requestPhotos,
    showOrderDetails,
    uploadIntakeDocument,
    extractIntakeDocument,
    linkIntakeDocument,
    listIntakeDocuments,
    deletePhoto,
    sendPhotosToClient,
    logClientReply,
    sendInvoiceWithAgreement,
    copyAgreementLink,
    countersignAgreement
  };
})();
