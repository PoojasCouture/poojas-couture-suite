/* ============================================================
   POOJA'S COUTURE — Shashank Logistics Portal (Stage 2d + 2e)
   Two tabs: Custom Orders (bespoke garment flow) and
   Inventory (bulk stock parcels with landed-cost by count).
   Built against the Store API. Inline modals only.
   ============================================================ */

document.addEventListener('DOMContentLoaded', async () => {
  let currentUser = null;
  let activeTab = 'orders';

  const gateScreen  = document.querySelector('#gate-screen');
  const gateMessage = document.querySelector('#gate-message');
  const gateActions = document.querySelector('#gate-actions');
  const workspace   = document.querySelector('#shipping-workspace');

  // ── helpers ──────────────────────────────────────────────
  function esc(str) {
    if (str === null || str === undefined) return '';
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
  function fmtDate(val) {
    if (!val) return '—';
    return new Date(val).toLocaleDateString('en-AU', { day:'2-digit', month:'short', year:'numeric' });
  }
  function fmtDateTime(val) {
    if (!val) return '—';
    return new Date(val).toLocaleString('en-AU', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' });
  }
  function money(n) { return 'AUD $' + (parseFloat(n) || 0).toFixed(2); }
  function toast(msg, type='success') {
    if (window.Utils && Utils.showToast) { Utils.showToast(msg, type); return; }
    const el = document.createElement('div');
    el.style.cssText = `position:fixed; bottom:24px; right:24px; z-index:99999;
      background:${type==='error'?'#c0392b':'#2d6a4f'}; color:#fff; padding:12px 20px;
      border-radius:8px; font-size:13px; font-family:sans-serif;
      box-shadow:0 4px 16px rgba(0,0,0,0.3); max-width:340px; line-height:1.4;`;
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 4000);
  }

  function showGate(msg, allowLogin=false) {
    gateScreen.classList.add('active');
    workspace.classList.add('d-none');
    gateMessage.textContent = msg;
    gateActions.classList.toggle('d-none', !allowLogin);
  }

  // ── modal ────────────────────────────────────────────────
  function openModal({ title, bodyHTML, submitLabel='Save', wide=false, onRender, onSubmit }) {
    closeModal();
    const overlay = document.createElement('div');
    overlay.id = 'pc-modal-overlay';
    overlay.style.cssText = `position:fixed; inset:0; background:rgba(0,0,0,0.65);
      display:flex; align-items:center; justify-content:center; z-index:9999; padding:16px;`;
    overlay.innerHTML = `
      <div id="pc-modal-box" style="background:#1a1a2e; color:#e0e0e0; border-radius:12px;
        width:100%; max-width:${wide ? '720px' : '560px'}; max-height:90vh; overflow-y:auto;
        box-shadow:0 8px 32px rgba(0,0,0,0.6); font-family:sans-serif; font-size:14px;">
        <div style="display:flex; justify-content:space-between; align-items:center;
                    padding:16px 20px; border-bottom:1px solid #333;">
          <div style="font-weight:700; font-size:15px; color:#d4af37;">${esc(title)}</div>
          <button id="pc-modal-close" style="background:none; border:none; color:#999;
            font-size:20px; cursor:pointer; line-height:1; padding:0 4px;">×</button>
        </div>
        <div style="padding:20px 20px 8px;">${bodyHTML}</div>
        <div style="display:flex; gap:10px; justify-content:flex-end;
                    padding:12px 20px 16px; border-top:1px solid #333; margin-top:8px;">
          <button id="pc-modal-cancel" style="padding:8px 18px; border-radius:6px;
            border:1px solid #555; background:transparent; color:#ccc; cursor:pointer; font-size:13px;">Cancel</button>
          <button id="pc-modal-submit" style="padding:8px 18px; border-radius:6px; border:none;
            background:#d4af37; color:#1a1a2e; font-weight:700; cursor:pointer; font-size:13px;">${esc(submitLabel)}</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    const box = overlay.querySelector('#pc-modal-box');
    overlay.querySelector('#pc-modal-close').onclick = closeModal;
    overlay.querySelector('#pc-modal-cancel').onclick = closeModal;
    overlay.querySelector('#pc-modal-submit').onclick = async () => {
      const ok = await onSubmit(box);
      if (ok !== false) closeModal();
    };
    overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
    if (typeof onRender === 'function') onRender(box);
    const firstInput = overlay.querySelector('input, select');
    if (firstInput) firstInput.focus();
  }
  function closeModal() {
    const el = document.getElementById('pc-modal-overlay');
    if (el) el.remove();
  }

  // ── styles ────────────────────────────────────────────────
  function fieldStyle() { return `width:100%; box-sizing:border-box; padding:8px 10px; background:#0f0f1e; border:1px solid #444; border-radius:6px; color:#e0e0e0; font-size:13px; font-family:sans-serif;`; }
  function labelStyle() { return `display:block; font-size:11px; color:#aaa; text-transform:uppercase; letter-spacing:.5px; margin-bottom:4px;`; }
  function rowStyle()  { return `display:flex; gap:14px; margin-bottom:14px;`; }
  function halfStyle() { return `flex:1; min-width:0;`; }
  function fullStyle() { return `margin-bottom:14px;`; }
  function sectionHeadStyle() { return `font-size:11px; font-weight:700; color:#d4af37; text-transform:uppercase; letter-spacing:.6px; border-bottom:1px solid #333; padding-bottom:6px; margin:16px 0 12px;`; }
  function metricBoxStyle(bg) { return `background:${bg}; color:#fff; border-radius:10px; padding:16px 24px; min-width:140px; text-align:center;`; }
  function sectionCardStyle() { return `background:#12122a; border:1px solid #2a2a4a; border-radius:12px; overflow:hidden; margin-bottom:24px;`; }
  function cardHeaderStyle() { return `display:flex; justify-content:space-between; align-items:center; padding:14px 20px; background:#1a1a3e; font-weight:700; font-size:14px; color:#d4af37; border-bottom:1px solid #2a2a4a;`; }
  function tableStyle() { return `width:100%; border-collapse:collapse; font-size:13px;`; }
  function thStyle() { return `text-align:left; padding:10px 14px; font-size:11px; text-transform:uppercase; letter-spacing:.5px; color:#888; background:#111128; border-bottom:1px solid #2a2a4a;`; }
  function tdStyle(idx) { const bg = idx%2===0?'#12122a':'#0f0f22'; return `padding:10px 14px; border-bottom:1px solid #1e1e38; background:${bg}; vertical-align:top;`; }
  function btnStyle(bg, color='#1a1a2e') { return `padding:6px 14px; border-radius:6px; border:none; background:${bg}; color:${color}; font-weight:700; font-size:12px; cursor:pointer; white-space:nowrap;`; }
  function badgeStyle(bg) { return `display:inline-block; padding:2px 8px; border-radius:4px; font-size:11px; font-weight:700; background:${bg}; color:#fff;`; }
  function tabStyle(active) {
    return `padding:10px 22px; border:none; cursor:pointer; font-size:14px; font-weight:700;
      border-radius:8px 8px 0 0; background:${active ? '#12122a' : 'transparent'};
      color:${active ? '#d4af37' : '#888'}; border-bottom:${active ? '2px solid #d4af37' : '2px solid transparent'};`;
  }

  // ── session bootstrap ─────────────────────────────────────
  try {
    await Store.ready();
    Store.subscribeRealtime();
  } catch (e) {
    console.error('Store.ready failed:', e);
    showGate('Could not connect to the database. Check your connection.', true);
    return;
  }

  currentUser = Store.getCurrentUser();
  if (!currentUser && typeof Store.reconcileUser === 'function') {
    try { currentUser = await Store.reconcileUser(); } catch (e) { currentUser = null; }
  }
  if (!currentUser) {
    showGate('You are not signed in. Please log in through the main app first.', true);
    return;
  }
  const appRole = (currentUser.appRole || currentUser.app_role || '').toLowerCase();
  if (!['logistics','operations','admin'].includes(appRole)) {
    showGate('This portal is for logistics (Shashank) only. Your account does not have access.', true);
    return;
  }

  // Stock tables are not in the Store preload list — load them now.
  try { await Store.refresh('stock_parcels'); } catch (e) {}
  try { await Store.refresh('stock_parcel_items'); } catch (e) {}

  // ── render shell ──────────────────────────────────────────
  gateScreen.classList.remove('active');
  workspace.classList.remove('d-none');

  const avatar = workspace.querySelector('#user-avatar');
  if (avatar) {
    avatar.textContent = (currentUser.name || 'SP').split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase();
    avatar.style.background = '#d4af37';
    avatar.style.color = '#1a1a2e';
  }
  const nameEl = workspace.querySelector('#user-display-name');
  if (nameEl) nameEl.textContent = currentUser.name || 'Shashank Patil';
  const roleEl = workspace.querySelector('#user-display-role');
  if (roleEl) roleEl.textContent = 'Logistics · India Hub';

  const content = workspace.querySelector('.workspace-content');
  if (!content) { showGate('Page layout error: .workspace-content not found in HTML.', true); return; }

  content.innerHTML = `
    <div style="margin-bottom:20px;">
      <h1 style="font-size:22px; font-weight:800; color:#d4af37; margin:0;">Welcome, ${esc(currentUser.name || 'Shashank')}</h1>
      <p style="font-size:13px; color:#888; margin:4px 0 0;">Logistics Workstation · India Hub</p>
    </div>
    <div style="display:flex; gap:4px; border-bottom:2px solid #2a2a4a; margin-bottom:24px;">
      <button id="tab-orders" style="${tabStyle(true)}">📦 Custom Orders</button>
      <button id="tab-stock"  style="${tabStyle(false)}">🛍️ Inventory</button>
    </div>
    <div id="panel-orders"></div>
    <div id="panel-stock" style="display:none;"></div>
  `;

  const btnLogout = workspace.querySelector('#btn-logout');
  if (btnLogout) {
    btnLogout.addEventListener('click', async () => {
      await Store.logout();
      window.location.href = '../index.html';
    });
  }

  // ── tab switching ─────────────────────────────────────────
  const tabOrders   = document.getElementById('tab-orders');
  const tabStock    = document.getElementById('tab-stock');
  const panelOrders = document.getElementById('panel-orders');
  const panelStock  = document.getElementById('panel-stock');

  tabOrders.onclick = () => switchTab('orders');
  tabStock.onclick  = () => switchTab('stock');

  function switchTab(tab) {
    activeTab = tab;
    tabOrders.style.cssText = tabStyle(tab === 'orders');
    tabStock.style.cssText  = tabStyle(tab === 'stock');
    panelOrders.style.display = tab === 'orders' ? 'block' : 'none';
    panelStock.style.display  = tab === 'stock'  ? 'block' : 'none';
    if (tab === 'orders') renderOrdersPanel();
    else renderStockPanel();
  }

  renderOrdersPanel();

  // Realtime: re-render when data changes from another portal/user
  window.addEventListener('pc:datachange', Utils && Utils.debounce ? Utils.debounce(() => {
    if (activeTab === 'orders') renderOrdersPanel();
    else renderStockPanel();
  }, 500) : () => {
    if (activeTab === 'orders') renderOrdersPanel();
    else renderStockPanel();
  });

  // Tab focus: refresh cache when user returns to this tab
  document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState === 'visible') {
      try {
        await Store.refresh('orders');
        await Store.refresh('invoices');
        if (activeTab === 'orders') renderOrdersPanel();
        else renderStockPanel();
      } catch (e) { /* ignore */ }
    }
  });

  /* ==========================================================
     TAB 1 — CUSTOM ORDERS
     ========================================================== */
  function renderOrdersPanel() {
    const orders = Store.getAll(Store.COLLECTIONS.ORDERS);
    const incoming        = orders.filter(o => o.status === 'Shipped to Shashank');
    const ready           = orders.filter(o => o.status === 'At Shashank');
    const transit         = orders.filter(o => o.status === 'In Transit');
    const awaitingPayment = orders.filter(o => o.status === 'Awaiting Payment');
    const clearedDelivery = orders.filter(o => o.status === 'Cleared for Delivery');

    panelOrders.innerHTML = `
      <section style="display:flex; gap:16px; margin-bottom:24px; flex-wrap:wrap;">
        <div style="${metricBoxStyle('#c0392b')}"><div style="font-size:32px; font-weight:800;">${incoming.length}</div><div style="font-size:11px; opacity:.8; margin-top:4px;">Incoming Pieces</div></div>
        <div style="${metricBoxStyle('#2d6a4f')}"><div style="font-size:32px; font-weight:800;">${ready.length}</div><div style="font-size:11px; opacity:.8; margin-top:4px;">Ready to Dispatch</div></div>
        <div style="${metricBoxStyle('#1a4a7a')}"><div style="font-size:32px; font-weight:800;">${transit.length}</div><div style="font-size:11px; opacity:.8; margin-top:4px;">In Transit</div></div>
        <div style="${metricBoxStyle('#7a1a1a')}"><div style="font-size:32px; font-weight:800;">${awaitingPayment.length}</div><div style="font-size:11px; opacity:.8; margin-top:4px;">Awaiting Payment</div></div>
        <div style="${metricBoxStyle('#1a5a2a')}"><div style="font-size:32px; font-weight:800;">${clearedDelivery.length}</div><div style="font-size:11px; opacity:.8; margin-top:4px;">Cleared for Delivery</div></div>
      </section>
      <section style="${sectionCardStyle()}">
        <div style="${cardHeaderStyle()}"><span>📬 Incoming from Tailors</span><span style="font-size:11px; font-weight:400; opacity:.7;">Status: Shipped to Shashank</span></div>
        <div id="incoming-wrap" style="padding:0 4px 4px;"></div>
      </section>
      <section style="${sectionCardStyle()}">
        <div style="${cardHeaderStyle()}"><span>📦 Ready to Dispatch</span><span style="font-size:11px; font-weight:400; opacity:.7;">Status: At Shashank</span></div>
        <div id="ready-wrap" style="padding:0 4px 4px;"></div>
      </section>
      <section style="${sectionCardStyle()}">
        <div style="${cardHeaderStyle()}"><span>✈️ In Transit</span><span style="font-size:11px; font-weight:400; opacity:.7;">Status: In Transit</span></div>
        <div id="transit-wrap" style="padding:0 4px 4px;"></div>
      </section>
      <section style="${sectionCardStyle()}">
        <div style="${cardHeaderStyle()}"><span>🔴 Awaiting Payment</span><span style="font-size:11px; font-weight:400; opacity:.7;">Held — payment required before delivery</span></div>
        <div id="awaiting-wrap" style="padding:0 4px 4px;"></div>
      </section>
      <section style="${sectionCardStyle()}">
        <div style="${cardHeaderStyle()}"><span>✅ Cleared for Delivery</span><span style="font-size:11px; font-weight:400; opacity:.7;">Payment confirmed — ready to deliver</span></div>
        <div id="cleared-wrap" style="padding:0 4px 4px;"></div>
      </section>
    `;
    renderIncoming(incoming);
    renderReady(ready);
    renderTransit(transit);
    renderAwaitingPayment(awaitingPayment);
    renderCleared(clearedDelivery);
  }

  // ── Incoming from tailors ─────────────────────────────────
  function renderIncoming(orders) {
    const wrap = document.getElementById('incoming-wrap');
    if (!orders.length) {
      wrap.innerHTML = `<p style="text-align:center; color:#555; padding:20px; font-size:12px;">No pieces currently in transit to you.</p>`;
      return;
    }
    let html = `<table style="${tableStyle()}"><thead><tr>
      <th style="${thStyle()}">Order</th><th style="${thStyle()}">Client</th>
      <th style="${thStyle()}">Courier / Tracking</th><th style="${thStyle()}">Shipped</th>
      <th style="${thStyle()}">Action</th></tr></thead><tbody>`;
    orders.forEach((o, i) => {
      html += `<tr>
        <td style="${tdStyle(i)}">
          <div style="font-family:monospace; font-weight:700; color:#d4af37;">${esc(o.orderCode || o.id)}</div>
        </td>
        <td style="${tdStyle(i)}">
          <div style="font-weight:600;">${esc(o.clientName || '—')}</div>
          <div style="font-size:11px; color:#888; margin-top:2px;">${esc(o.title || '')}</div>
        </td>
        <td style="${tdStyle(i)}">
          <div style="font-family:monospace; color:#7ecfff;">${esc(o.domesticTracking || '—')}</div>
          <div style="font-size:11px; color:#888;">${esc(o.domesticCourier || '')}</div>
        </td>
        <td style="${tdStyle(i)}" nowrap>${fmtDateTime(o.shippedToShashankDate)}</td>
        <td style="${tdStyle(i)}">
          <button style="${btnStyle('#2d6a4f','#fff')}" onclick="window._pcMarkReceived('${esc(o.id)}')">✓ Mark Received</button>
        </td>
      </tr>`;
    });
    html += '</tbody></table>';
    wrap.innerHTML = html;
  }

  window._pcMarkReceived = async function(orderId) {
    const res = await Store.update(Store.COLLECTIONS.ORDERS, orderId, {
      status: 'At Shashank',
      receivedByShashankDate: new Date().toISOString()
    });
    if (!res) return;
    toast('Marked as received — order is now ready to dispatch.');
    renderOrdersPanel();
  };

  // ── Ready to dispatch ─────────────────────────────────────
  function renderReady(orders) {
    const wrap = document.getElementById('ready-wrap');
    if (!orders.length) {
      wrap.innerHTML = `<p style="text-align:center; color:#555; padding:20px; font-size:12px;">No orders received and ready to dispatch.</p>`;
      return;
    }
    let html = `<table style="${tableStyle()}"><thead><tr>
      <th style="${thStyle()}">Order</th><th style="${thStyle()}">Client</th>
      <th style="${thStyle()}">Garment</th><th style="${thStyle()}">Destination</th>
      <th style="${thStyle()}">Received</th><th style="${thStyle()}">Action</th>
    </tr></thead><tbody>`;
    orders.forEach((o, i) => {
      const dest = o.deliveryDestination || 'Australia';
      const destColor = dest === 'Australia' ? '#1a4a7a' : dest === 'India' ? '#2d6a4f' : '#6a2d6a';
      html += `<tr>
        <td style="${tdStyle(i)}">
          <div style="font-family:monospace; font-weight:700; color:#d4af37;">${esc(o.orderCode || o.id)}</div>
        </td>
        <td style="${tdStyle(i)}"><div style="font-weight:600;">${esc(o.clientName || '—')}</div></td>
        <td style="${tdStyle(i)}"><div style="font-size:12px; color:#ccc;">${esc(o.title || '—')}</div></td>
        <td style="${tdStyle(i)}"><span style="${badgeStyle(destColor)}">${esc(dest)}</span></td>
        <td style="${tdStyle(i)}" nowrap>${fmtDate(o.receivedByShashankDate)}</td>
        <td style="${tdStyle(i)}">
          <button style="${btnStyle('#d4af37')}" onclick="window._pcDispatch('${esc(o.id)}')">🚚 Dispatch</button>
        </td>
      </tr>`;
    });
    html += '</tbody></table>';
    wrap.innerHTML = html;
  }

  // ── Dispatch modal — step 1: choose destination ───────────
  window._pcDispatch = function(orderId) {
    const o = Store.getById(Store.COLLECTIONS.ORDERS, orderId);
    if (!o) { toast('Order not found.', 'error'); return; }

    const storedDest = o.deliveryDestination || 'Australia';

    const bodyHTML = `
      <p style="font-size:13px; color:#aaa; margin:0 0 16px;">
        Order: <strong style="color:#d4af37;">${esc(o.orderCode || o.id)}</strong> — ${esc(o.clientName || '')}
        <br><span style="font-size:11px;">Recorded destination: <strong style="color:#d4af37;">${esc(storedDest)}</strong></span>
      </p>
      <div style="${fullStyle()}">
        <label style="${labelStyle()}">Where is this parcel going? <span style="color:#e06;">*</span></label>
        <select id="dest-select" style="${fieldStyle()}">
          <option value="Australia" ${storedDest === 'Australia' ? 'selected' : ''}>🇦🇺 Australia</option>
          <option value="India"     ${storedDest === 'India'     ? 'selected' : ''}>🇮🇳 India (local delivery)</option>
          <option value="Overseas"  ${storedDest === 'Overseas'  ? 'selected' : ''}>🌏 Overseas (other country)</option>
        </select>
        <div style="font-size:11px; color:#666; margin-top:6px;">
          Pre-filled from order. You can override if the destination has changed.
        </div>
      </div>
    `;

    openModal({
      title: 'Dispatch — Select Destination',
      bodyHTML,
      submitLabel: 'Next: Shipping Details →',
      onSubmit: (box) => {
        const dest = box.querySelector('#dest-select').value;
        closeModal();
        // Open the correct shipping form based on destination
        if (dest === 'India') {
          _pcShipIndia(orderId, dest);
        } else {
          // Australia or Overseas — international form
          _pcShipIntl(orderId, dest);
        }
        return false; // prevent auto-close (already closed above)
      }
    });
  };

  // ── Dispatch form: International (Australia / Overseas) ───
  function _pcShipIntl(orderId, destination) {
    const o = Store.getById(Store.COLLECTIONS.ORDERS, orderId);
    if (!o) { toast('Order not found.', 'error'); return; }

    const carrierOptions = ['DHL Express','FedEx International Priority','Australia Post International','Aramex','UPS Worldwide']
      .map(c => `<option value="${c}">${c}</option>`).join('');

    const bodyHTML = `
      <p style="font-size:12px; color:#aaa; margin:0 0 16px;">
        Shipping to: <strong style="color:#d4af37;">${esc(destination)}</strong> —
        ${esc(o.clientName || '')} · ${esc(o.orderCode || o.id)}
      </p>
      <div style="${rowStyle()}">
        <div style="${halfStyle()}">
          <label style="${labelStyle()}">Carrier</label>
          <select id="f-carrier" style="${fieldStyle()}">${carrierOptions}</select>
        </div>
        <div style="${halfStyle()}">
          <label style="${labelStyle()}">Tracking Number <span style="color:#e06;">*</span></label>
          <input id="f-tracking" type="text" style="${fieldStyle()}" placeholder="e.g. DHL-12345678">
        </div>
      </div>
      <div style="${rowStyle()}">
        <div style="${halfStyle()}">
          <label style="${labelStyle()}">Shipping Cost ex-GST (AUD) <span style="color:#e06;">*</span></label>
          <input id="f-cost" type="number" step="0.01" min="0" style="${fieldStyle()}" placeholder="0.00">
        </div>
        <div style="${halfStyle()}">
          <label style="${labelStyle()}">Gross Weight (kg)</label>
          <input id="f-weight" type="number" step="0.1" min="0.1" value="2.5" style="${fieldStyle()}">
        </div>
      </div>
      <div style="${rowStyle()}">
        <div style="${halfStyle()}">
          <label style="${labelStyle()}">Box Dimensions (L × W × H cm)</label>
          <input id="f-dims" type="text" style="${fieldStyle()}" value="40 x 30 x 15">
        </div>
        <div style="${halfStyle()}">
          <label style="${labelStyle()}">Incoterms</label>
          <select id="f-incoterms" style="${fieldStyle()}">
            <option value="DAP">DAP — Delivered At Place</option>
            <option value="FOB">FOB — Free On Board</option>
            <option value="CIF">CIF — Cost, Insurance, Freight</option>
          </select>
        </div>
      </div>
      <div style="${sectionHeadStyle()}">Customs Declaration</div>
      <div style="${fullStyle()}">
        <label style="${labelStyle()}">HS Code</label>
        <input id="f-hscode" type="text" style="${fieldStyle()}" value="5007.20">
      </div>
      <div style="${fullStyle()}">
        <label style="${labelStyle()}">Goods Description (for customs)</label>
        <input id="f-goods-desc" type="text" style="${fieldStyle()}" value="100% Handloom Silk Embroideries — Bridal Garments">
      </div>
      <div style="${rowStyle()}">
        <div style="${halfStyle()}">
          <label style="${labelStyle()}">Country of Origin</label>
          <input id="f-origin" type="text" style="${fieldStyle()}" value="India">
        </div>
        <div style="${halfStyle()}">
          <label style="${labelStyle()}">Dispatch Date</label>
          <input id="f-dispatch-date" type="date" style="${fieldStyle()}" value="${new Date().toISOString().split('T')[0]}">
        </div>
      </div>
    `;

    openModal({
      title: `Ship to ${destination} — ${o.orderCode || orderId}`,
      bodyHTML,
      submitLabel: '✈️ Confirm Dispatch',
      wide: true,
      onSubmit: async (box) => {
        const tracking = box.querySelector('#f-tracking').value.trim();
        const cost     = parseFloat(box.querySelector('#f-cost').value) || 0;
        if (!tracking) { toast('Tracking number is required.', 'error'); return false; }
        if (!cost)     { toast('Shipping cost is required.', 'error'); return false; }

        // Customs value auto-set from order price — Shashank never sees it
        const customsVal = (o && o.price) ? o.price : 0;

        const res = await Store.update(Store.COLLECTIONS.ORDERS, orderId, {
          status: 'In Transit',
          deliveryDestination: destination,
          carrier: box.querySelector('#f-carrier').value.trim(),
          trackingNumber: tracking,
          shippingCost: cost,
          shippingWeight: box.querySelector('#f-weight').value.trim() + ' kg',
          shippingDims: box.querySelector('#f-dims').value.trim(),
          incoterms: box.querySelector('#f-incoterms').value,
          hsCode: box.querySelector('#f-hscode').value.trim(),
          customsValue: customsVal,
          customsDescription: box.querySelector('#f-goods-desc').value.trim(),
          countryOfOrigin: box.querySelector('#f-origin').value.trim(),
          dispatchedDate: (() => {
            const d = box.querySelector('#f-dispatch-date').value;
            return d ? new Date(d).toISOString() : new Date().toISOString();
          })()
        });
        if (!res) return false;
        toast(`Dispatched to ${destination}! Tracking: ${tracking}`);
        renderOrdersPanel();
        return true;
      }
    });
  }

  // ── Dispatch form: India local delivery ───────────────────
  function _pcShipIndia(orderId, destination) {
    const o = Store.getById(Store.COLLECTIONS.ORDERS, orderId);
    if (!o) { toast('Order not found.', 'error'); return; }

    const bodyHTML = `
      <p style="font-size:12px; color:#aaa; margin:0 0 16px;">
        Local delivery in India —
        ${esc(o.clientName || '')} · ${esc(o.orderCode || o.id)}
      </p>
      <div style="${rowStyle()}">
        <div style="${halfStyle()}">
          <label style="${labelStyle()}">Courier / Delivery Service <span style="color:#e06;">*</span></label>
          <select id="f-carrier" style="${fieldStyle()}">
            <option value="Blue Dart">Blue Dart</option>
            <option value="DTDC">DTDC</option>
            <option value="Delhivery">Delhivery</option>
            <option value="Ekart">Ekart</option>
            <option value="India Post">India Post</option>
            <option value="Other">Other</option>
          </select>
        </div>
        <div style="${halfStyle()}">
          <label style="${labelStyle()}">Tracking Number</label>
          <input id="f-tracking" type="text" style="${fieldStyle()}" placeholder="Optional for local delivery">
        </div>
      </div>
      <div style="${rowStyle()}">
        <div style="${halfStyle()}">
          <label style="${labelStyle()}">Delivery Cost (AUD) <span style="color:#e06;">*</span></label>
          <input id="f-cost" type="number" step="0.01" min="0" style="${fieldStyle()}" placeholder="0.00">
        </div>
        <div style="${halfStyle()}">
          <label style="${labelStyle()}">Dispatch Date</label>
          <input id="f-dispatch-date" type="date" style="${fieldStyle()}" value="${new Date().toISOString().split('T')[0]}">
        </div>
      </div>
      <div style="${fullStyle()}">
        <label style="${labelStyle()}">Delivery Address / Notes</label>
        <input id="f-notes" type="text" style="${fieldStyle()}" placeholder="Customer address or delivery instructions">
      </div>
    `;

    openModal({
      title: `Local Delivery — India · ${o.orderCode || orderId}`,
      bodyHTML,
      submitLabel: '🚚 Confirm Dispatch',
      onSubmit: async (box) => {
        const cost = parseFloat(box.querySelector('#f-cost').value) || 0;
        if (!cost) { toast('Delivery cost is required.', 'error'); return false; }

        const res = await Store.update(Store.COLLECTIONS.ORDERS, orderId, {
          status: 'In Transit',
          deliveryDestination: destination,
          carrier: box.querySelector('#f-carrier').value.trim(),
          trackingNumber: box.querySelector('#f-tracking').value.trim() || '—',
          shippingCost: cost,
          dispatchedDate: (() => {
            const d = box.querySelector('#f-dispatch-date').value;
            return d ? new Date(d).toISOString() : new Date().toISOString();
          })(),
          customsDescription: box.querySelector('#f-notes').value.trim()
        });
        if (!res) return false;
        toast(`Dispatched for local delivery in India!`);
        renderOrdersPanel();
        return true;
      }
    });
  }

  // ── In transit ────────────────────────────────────────────
  function renderTransit(orders) {
    const wrap = document.getElementById('transit-wrap');
    if (!orders.length) {
      wrap.innerHTML = `<p style="text-align:center; color:#555; padding:20px; font-size:12px;">No active shipments in transit.</p>`;
      return;
    }
    let html = `<table style="${tableStyle()}"><thead><tr>
      <th style="${thStyle()}">Tracking</th><th style="${thStyle()}">Carrier</th>
      <th style="${thStyle()}">Client / Order</th><th style="${thStyle()}">Destination</th>
      <th style="${thStyle()}">Shipping Cost</th>
      <th style="${thStyle()}">Dispatched</th><th style="${thStyle()}">Action</th>
    </tr></thead><tbody>`;
    orders.forEach((o, i) => {
      const dest = o.deliveryDestination || 'Australia';
      const destColor = dest === 'Australia' ? '#1a4a7a' : dest === 'India' ? '#2d6a4f' : '#6a2d6a';
      html += `<tr>
        <td style="${tdStyle(i)}">
          <div style="font-family:monospace; color:#7ecfff;">${esc(o.trackingNumber || '—')}</div>
        </td>
        <td style="${tdStyle(i)}">
          <span style="${badgeStyle('#1a4a7a')}">${esc(o.carrier || '—')}</span>
        </td>
        <td style="${tdStyle(i)}">
          <div style="font-weight:600;">${esc(o.clientName || '—')}</div>
          <div style="font-size:11px; color:#888; margin-top:2px; font-family:monospace;">${esc(o.orderCode || o.id)}</div>
        </td>
        <td style="${tdStyle(i)}">
          <span style="${badgeStyle(destColor)}">${esc(dest)}</span>
        </td>
        <td style="${tdStyle(i)}" nowrap>${o.shippingCost ? money(o.shippingCost) : '—'}</td>
        <td style="${tdStyle(i)}" nowrap>${fmtDate(o.dispatchedDate)}</td>
        <td style="${tdStyle(i)}">
          ${dest === 'Australia'
            ? `<button style="${btnStyle('#2d6a4f','#fff')}" onclick="window._pcMarkDelivered('${esc(o.id)}')">✓ Mark Delivered</button>`
            : `<button style="${btnStyle('#c0392b','#fff')}" onclick="window._pcMarkAwaitingPayment('${esc(o.id)}')">💳 Request Payment</button>`
          }
        </td>
      </tr>`;
    });
    html += '</tbody></table>';
    wrap.innerHTML = html;
  }

  // Route A (Australia): direct Mark Delivered — payment gate is in CRM (Stage 4)
  // Route B cleared: called from renderCleared after Pooja confirms payment
  window._pcMarkDelivered = async function(orderId) {
    const res = await Store.update(Store.COLLECTIONS.ORDERS, orderId, { status: 'Delivered' });
    if (!res) return;
    toast('Delivered — order marked complete.');
    renderOrdersPanel();
  };

  // Route B (India/Overseas): moves to Awaiting Payment so Pooja can chase payment
  window._pcMarkAwaitingPayment = async function(orderId) {
    const invoice = Store.query(Store.COLLECTIONS.INVOICES, i => i.orderId === orderId)[0];
    const paid    = invoice ? ((invoice.amountPaid != null && invoice.amountPaid !== '') ? invoice.amountPaid : 0) : 0;
    const balance = invoice ? Math.round((invoice.total - paid) * 100) / 100 : 0;
    if (balance <= 0) {
      // No balance — deliver directly
      const res = await Store.update(Store.COLLECTIONS.ORDERS, orderId, { status: 'Delivered' });
      if (!res) return;
      toast('Balance is zero — order marked Delivered directly.');
      renderOrdersPanel();
      return;
    }
    const res = await Store.update(Store.COLLECTIONS.ORDERS, orderId, {
      status: 'Awaiting Payment',
      awaitingPaymentDate: new Date().toISOString()
    });
    if (!res) return;
    toast('Order held — Awaiting Payment. Pooja will chase the customer.');
    renderOrdersPanel();
  };

  // Awaiting Payment section — read-only for Shashank, Pooja clears these in CRM
  function renderAwaitingPayment(orders) {
    const wrap = document.getElementById('awaiting-wrap');
    if (!orders.length) {
      wrap.innerHTML = `<p style="text-align:center; color:#555; padding:20px; font-size:12px;">No orders awaiting payment.</p>`;
      return;
    }
    let html = `<table style="${tableStyle()}"><thead><tr>
      <th style="${thStyle()}">Order</th><th style="${thStyle()}">Client</th>
      <th style="${thStyle()}">Destination</th><th style="${thStyle()}">Held Since</th>
    </tr></thead><tbody>`;
    orders.forEach((o, i) => {
      html += `<tr>
        <td style="${tdStyle(i)}"><div style="font-family:monospace; font-weight:700; color:#d4af37;">${esc(o.orderCode || o.id)}</div></td>
        <td style="${tdStyle(i)}"><div style="font-weight:600;">${esc(o.clientName || '—')}</div></td>
        <td style="${tdStyle(i)}"><span style="${badgeStyle('#6a2d6a')}">${esc(o.deliveryDestination || '—')}</span></td>
        <td style="${tdStyle(i)}" nowrap>${fmtDate(o.awaitingPaymentDate)}</td>
      </tr>`;
    });
    html += '</tbody></table>';
    wrap.innerHTML = html;
  }

  // Cleared for Delivery — Pooja confirmed payment, Shashank can now deliver
  function renderCleared(orders) {
    const wrap = document.getElementById('cleared-wrap');
    if (!orders.length) {
      wrap.innerHTML = `<p style="text-align:center; color:#555; padding:20px; font-size:12px;">No orders cleared for delivery yet.</p>`;
      return;
    }
    let html = `<table style="${tableStyle()}"><thead><tr>
      <th style="${thStyle()}">Order</th><th style="${thStyle()}">Client</th>
      <th style="${thStyle()}">Destination</th><th style="${thStyle()}">Cleared</th>
      <th style="${thStyle()}">Action</th>
    </tr></thead><tbody>`;
    orders.forEach((o, i) => {
      html += `<tr>
        <td style="${tdStyle(i)}"><div style="font-family:monospace; font-weight:700; color:#d4af37;">${esc(o.orderCode || o.id)}</div></td>
        <td style="${tdStyle(i)}"><div style="font-weight:600;">${esc(o.clientName || '—')}</div></td>
        <td style="${tdStyle(i)}"><span style="${badgeStyle('#6a2d6a')}">${esc(o.deliveryDestination || '—')}</span></td>
        <td style="${tdStyle(i)}" nowrap>${fmtDate(o.clearedForDeliveryDate)}</td>
        <td style="${tdStyle(i)}">
          <button style="${btnStyle('#1a6a3a','#fff')}" onclick="window._pcMarkDelivered('${esc(o.id)}')">✅ Mark Delivered</button>
        </td>
      </tr>`;
    });
    html += '</tbody></table>';
    wrap.innerHTML = html;
  }

  /* ==========================================================
     TAB 2 — INVENTORY / STOCK PARCELS (Stage 2e)
     ========================================================== */
  const SOURCE_CITIES = ['Mumbai', 'Surat', 'Ghaziabad'];

  function renderStockPanel() {
    const parcels = Store.getAll('stock_parcels');
    const inTransit = parcels.filter(p => p.status === 'In Transit');
    const received  = parcels.filter(p => p.status === 'Received');

    panelStock.innerHTML = `
      <section style="display:flex; gap:16px; margin-bottom:24px; flex-wrap:wrap; align-items:center;">
        <div style="${metricBoxStyle('#1a4a7a')}"><div style="font-size:32px; font-weight:800;">${inTransit.length}</div><div style="font-size:11px; opacity:.8; margin-top:4px;">Parcels In Transit</div></div>
        <div style="${metricBoxStyle('#2d6a4f')}"><div style="font-size:32px; font-weight:800;">${received.length}</div><div style="font-size:11px; opacity:.8; margin-top:4px;">Parcels Received</div></div>
        <div style="margin-left:auto;">
          <button style="${btnStyle('#d4af37')}" onclick="window._pcNewParcel()">+ New Stock Parcel</button>
        </div>
      </section>
      <section style="${sectionCardStyle()}">
        <div style="${cardHeaderStyle()}"><span>🛍️ Stock Replenishment Parcels</span><span style="font-size:11px; font-weight:400; opacity:.7;">Bulk goods from India</span></div>
        <div id="parcels-wrap" style="padding:0 4px 4px;"></div>
      </section>
    `;
    renderParcels(parcels);
  }

  function renderParcels(parcels) {
    const wrap = document.getElementById('parcels-wrap');
    if (!parcels.length) {
      wrap.innerHTML = `<p style="text-align:center; color:#555; padding:20px; font-size:12px;">No stock parcels yet. Click "+ New Stock Parcel" to create one.</p>`;
      return;
    }
    const sorted = parcels.slice().sort((a,b) => new Date(b.createdAt||0) - new Date(a.createdAt||0));
    let html = `<table style="${tableStyle()}"><thead><tr>
      <th style="${thStyle()}">Parcel</th><th style="${thStyle()}">Source</th>
      <th style="${thStyle()}">Courier / Tracking</th><th style="${thStyle()}">Items</th>
      <th style="${thStyle()}">Status</th><th style="${thStyle()}">Actions</th>
    </tr></thead><tbody>`;
    sorted.forEach((p, i) => {
      const statusBadge = p.status === 'Received' ? badgeStyle('#2d6a4f') : badgeStyle('#1a4a7a');
      const receiveBtn  = p.status === 'In Transit'
        ? `<button style="${btnStyle('#2d6a4f','#fff')}" onclick="window._pcReceiveParcel('${esc(p.id)}')">✓ Mark Received</button>`
        : '';
      html += `<tr>
        <td style="${tdStyle(i)}"><div style="font-family:monospace; font-weight:700; color:#d4af37;">${esc(p.id)}</div></td>
        <td style="${tdStyle(i)}">${esc(p.sourceCity || '—')}</td>
        <td style="${tdStyle(i)}">
          <div style="font-family:monospace; color:#7ecfff;">${esc(p.trackingNo || '—')}</div>
          <div style="font-size:11px; color:#888;">${esc(p.courier || '')}</div>
        </td>
        <td style="${tdStyle(i)}" nowrap>${p.totalItems || 0}</td>
        <td style="${tdStyle(i)}"><span style="${statusBadge}">${esc(p.status || '—')}</span></td>
        <td style="${tdStyle(i)}">
          <button style="${btnStyle('#444','#fff')}" onclick="window._pcViewParcel('${esc(p.id)}')">View Items</button>
          ${receiveBtn}
        </td>
      </tr>`;
    });
    html += '</tbody></table>';
    wrap.innerHTML = html;
  }

  // ── New Stock Parcel modal ────────────────────────────────
  window._pcNewParcel = function() {
    const products = Store.getAll('products');
    if (!products.length) {
      toast('No products found. The product catalogue may be unavailable for this account.', 'error');
      return;
    }
    const productOptions = products
      .slice()
      .sort((a,b) => (a.title||'').localeCompare(b.title||''))
      .map(p => `<option value="${esc(p.id)}" data-cost="${p.costPrice || 0}">${esc(p.sku || '')} — ${esc(p.title || 'Unnamed')}</option>`)
      .join('');
    const cityOptions = SOURCE_CITIES.map(c => `<option value="${c}">${c}</option>`).join('');

    const bodyHTML = `
      <div style="${rowStyle()}">
        <div style="${halfStyle()}"><label style="${labelStyle()}">Source City <span style="color:#e06;">*</span></label><select id="sp-city" style="${fieldStyle()}">${cityOptions}</select></div>
        <div style="${halfStyle()}"><label style="${labelStyle()}">Courier</label><input id="sp-courier" type="text" style="${fieldStyle()}" placeholder="e.g. DHL, Blue Dart"></div>
      </div>
      <div style="${rowStyle()}">
        <div style="${halfStyle()}"><label style="${labelStyle()}">Tracking Number</label><input id="sp-tracking" type="text" style="${fieldStyle()}" placeholder="e.g. DHL-12345678"></div>
        <div style="${halfStyle()}"><label style="${labelStyle()}">Total Shipping Cost (AUD) <span style="color:#e06;">*</span></label><input id="sp-shipping" type="number" step="0.01" min="0" style="${fieldStyle()}" placeholder="0.00"></div>
      </div>
      <div style="${fullStyle()}"><label style="${labelStyle()}">Dispatch Date</label><input id="sp-date" type="date" style="${fieldStyle()}" value="${new Date().toISOString().split('T')[0]}"></div>
      <div style="${sectionHeadStyle()}">Items in this parcel</div>
      <div style="display:flex; gap:8px; align-items:flex-end; margin-bottom:12px; flex-wrap:wrap;">
        <div style="flex:2; min-width:160px;"><label style="${labelStyle()}">Product</label><select id="sp-prod" style="${fieldStyle()}">${productOptions}</select></div>
        <div style="width:70px;"><label style="${labelStyle()}">Qty</label><input id="sp-qty" type="number" min="1" step="1" value="1" style="${fieldStyle()}"></div>
        <input id="sp-unitcost" type="hidden">
        <button id="sp-add" type="button" style="${btnStyle('#d4af37')}">+ Add</button>
      </div>
      <div id="sp-items"></div>
      <div id="sp-preview" style="margin-top:12px; font-size:12px; color:#aaa;"></div>
      <div style="${fullStyle()}; margin-top:14px;"><label style="${labelStyle()}">Notes</label><input id="sp-notes" type="text" style="${fieldStyle()}" placeholder="Optional"></div>
    `;

    const items = [];

    openModal({
      title: 'New Stock Parcel',
      bodyHTML,
      submitLabel: 'Create Parcel',
      wide: true,
      onRender: (box) => {
        const prodSel = box.querySelector('#sp-prod');
        const qtyIn   = box.querySelector('#sp-qty');
        const unitIn  = box.querySelector('#sp-unitcost');
        const addBtn  = box.querySelector('#sp-add');
        const shipIn  = box.querySelector('#sp-shipping');

        const fillUnit = () => {
          const opt = prodSel.options[prodSel.selectedIndex];
          unitIn.value = opt ? (opt.getAttribute('data-cost') || 0) : 0;
        };
        fillUnit();
        prodSel.addEventListener('change', fillUnit);

        const renderItems = () => {
          const wrap = box.querySelector('#sp-items');
          if (!items.length) {
            wrap.innerHTML = `<p style="color:#555; font-size:12px; padding:8px 0;">No items added yet.</p>`;
          } else {
            let h = `<table style="${tableStyle()}"><thead><tr>
              <th style="${thStyle()}">Product</th><th style="${thStyle()}">Qty</th>
              <th style="${thStyle()}"></th></tr></thead><tbody>`;
            items.forEach((it, idx) => {
              h += `<tr>
                <td style="${tdStyle(idx)}">${esc(it.label)}</td>
                <td style="${tdStyle(idx)}">${it.quantity}</td>
                <td style="${tdStyle(idx)}"><button type="button" data-rm="${idx}" style="${btnStyle('#c0392b','#fff')}">Remove</button></td>
              </tr>`;
            });
            h += '</tbody></table>';
            wrap.innerHTML = h;
            wrap.querySelectorAll('[data-rm]').forEach(b => {
              b.addEventListener('click', () => {
                items.splice(parseInt(b.getAttribute('data-rm'), 10), 1);
                renderItems(); renderPreview();
              });
            });
          }
        };

        const renderPreview = () => {
          const totalItems = items.reduce((s, it) => s + it.quantity, 0);
          box.querySelector('#sp-preview').innerHTML =
            `Total items: <strong style="color:#d4af37;">${totalItems}</strong>`;
        };

        addBtn.addEventListener('click', () => {
          const opt = prodSel.options[prodSel.selectedIndex];
          if (!opt) { toast('Pick a product first.', 'error'); return; }
          const qty  = parseInt(qtyIn.value, 10) || 0;
          const unit = parseFloat(unitIn.value) || 0;
          if (qty < 1) { toast('Quantity must be at least 1.', 'error'); return; }
          items.push({ productId: opt.value, label: opt.textContent.replace(/\s*\(AUD.*$/, ''), quantity: qty, unitCost: unit });
          renderItems(); renderPreview();
        });

        shipIn.addEventListener('input', renderPreview);
        renderItems(); renderPreview();
      },
      onSubmit: async (box) => {
        const sourceCity = box.querySelector('#sp-city').value;
        const courier    = box.querySelector('#sp-courier').value.trim();
        const trackingNo = box.querySelector('#sp-tracking').value.trim();
        const shipping   = parseFloat(box.querySelector('#sp-shipping').value) || 0;
        const dateVal    = box.querySelector('#sp-date').value;
        const notes      = box.querySelector('#sp-notes').value.trim();

        if (!sourceCity)   { toast('Source city is required.', 'error'); return false; }
        if (!shipping)     { toast('Total shipping cost is required.', 'error'); return false; }
        if (!items.length) { toast('Add at least one item.', 'error'); return false; }

        const totalItems = items.reduce((s, it) => s + it.quantity, 0);
        const perItem    = totalItems > 0 ? shipping / totalItems : 0;
        const parcelId   = 'SP-' + Date.now();

        const parcel = await Store.create('stock_parcels', {
          id: parcelId, sourceCity, courier, trackingNo,
          totalItems, shippingCost: shipping, perItemCost: perItem,
          status: 'In Transit',
          dispatchedDate: dateVal ? new Date(dateVal).toISOString() : new Date().toISOString(),
          notes
        });
        if (!parcel) return false;

        for (let i = 0; i < items.length; i++) {
          const it = items[i];
          await Store.create('stock_parcel_items', {
            id: 'SPI-' + Date.now() + '-' + i,
            parcelId, productId: it.productId,
            description: it.label, quantity: it.quantity,
            unitCost: it.unitCost, landedCost: it.unitCost + perItem
          });
        }

        await Store.refresh('stock_parcels');
        await Store.refresh('stock_parcel_items');
        toast(`Parcel ${parcelId} created with ${totalItems} items.`);
        renderStockPanel();
        return true;
      }
    });
  };

  // ── View parcel items (read-only) ─────────────────────────
  window._pcViewParcel = function(parcelId) {
    const items = Store.getAll('stock_parcel_items').filter(it => it.parcelId === parcelId);
    let bodyHTML;
    if (!items.length) {
      bodyHTML = `<p style="color:#888; font-size:13px;">No items recorded for this parcel.</p>`;
    } else {
      bodyHTML = `<table style="${tableStyle()}"><thead><tr>
        <th style="${thStyle()}">Item</th><th style="${thStyle()}">Qty</th>
      </tr></thead><tbody>`;
      items.forEach((it, i) => {
        bodyHTML += `<tr>
          <td style="${tdStyle(i)}">${esc(it.description || it.productId)}</td>
          <td style="${tdStyle(i)}">${it.quantity}</td>
        </tr>`;
      });
      bodyHTML += '</tbody></table>';
    }
    openModal({ title: `Parcel ${parcelId} — Items`, bodyHTML, submitLabel: 'Close', onSubmit: () => true });
  };

  // ── Mark parcel received ──────────────────────────────────
  window._pcReceiveParcel = async function(parcelId) {
    const res = await Store.update('stock_parcels', parcelId, {
      status: 'Received', receivedDate: new Date().toISOString()
    });
    if (!res) return;
    await Store.refresh('stock_parcels');
    toast('Parcel marked received.');
    renderStockPanel();
  };

});
