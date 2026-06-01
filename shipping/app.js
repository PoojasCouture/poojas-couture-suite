/* ============================================================
   POOJA'S COUTURE — Shashank Logistics Portal (Stage 2d)
   Supabase-native. Replaces old Store-based shipping/app.js.
   Inline modals only — no portal CSS modal classes used.
   ============================================================ */

document.addEventListener('DOMContentLoaded', async () => {
  let currentUser = null;
  let supabase = null;

  const gateScreen    = document.querySelector('#gate-screen');
  const gateMessage   = document.querySelector('#gate-message');
  const gateActions   = document.querySelector('#gate-actions');
  const workspace     = document.querySelector('#shipping-workspace');

  // ── helpers ──────────────────────────────────────────────
  function esc(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function fmtDate(val) {
    if (!val) return '—';
    return new Date(val).toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  function fmtDateTime(val) {
    if (!val) return '—';
    return new Date(val).toLocaleString('en-AU', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  }

  function toast(msg, type = 'success') {
    const el = document.createElement('div');
    el.style.cssText = `
      position:fixed; bottom:24px; right:24px; z-index:99999;
      background:${type === 'error' ? '#c0392b' : '#2d6a4f'};
      color:#fff; padding:12px 20px; border-radius:8px;
      font-size:13px; font-family:sans-serif; box-shadow:0 4px 16px rgba(0,0,0,0.3);
      max-width:340px; line-height:1.4;
    `;
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 4000);
  }

  // ── gate ─────────────────────────────────────────────────
  function showGate(msg, allowLogin = false) {
    gateScreen.classList.add('active');
    workspace.classList.add('d-none');
    gateMessage.textContent = msg;
    gateActions.classList.toggle('d-none', !allowLogin);
  }

  // ── modal (fully inline styled) ──────────────────────────
  function openModal({ title, bodyHTML, submitLabel = 'Save', onSubmit }) {
    closeModal();

    const overlay = document.createElement('div');
    overlay.id = 'pc-modal-overlay';
    overlay.style.cssText = `
      position:fixed; inset:0; background:rgba(0,0,0,0.65);
      display:flex; align-items:center; justify-content:center;
      z-index:9999; padding:16px;
    `;

    overlay.innerHTML = `
      <div id="pc-modal-box" style="
        background:#1a1a2e; color:#e0e0e0; border-radius:12px;
        width:100%; max-width:560px; max-height:90vh; overflow-y:auto;
        box-shadow:0 8px 32px rgba(0,0,0,0.6);
        font-family:sans-serif; font-size:14px;
      ">
        <div style="display:flex; justify-content:space-between; align-items:center;
                    padding:16px 20px; border-bottom:1px solid #333;">
          <div style="font-weight:700; font-size:15px; color:#d4af37;">${esc(title)}</div>
          <button id="pc-modal-close" style="
            background:none; border:none; color:#999; font-size:20px;
            cursor:pointer; line-height:1; padding:0 4px;
          ">×</button>
        </div>
        <div style="padding:20px 20px 8px;">${bodyHTML}</div>
        <div style="display:flex; gap:10px; justify-content:flex-end;
                    padding:12px 20px 16px; border-top:1px solid #333; margin-top:8px;">
          <button id="pc-modal-cancel" style="
            padding:8px 18px; border-radius:6px; border:1px solid #555;
            background:transparent; color:#ccc; cursor:pointer; font-size:13px;
          ">Cancel</button>
          <button id="pc-modal-submit" style="
            padding:8px 18px; border-radius:6px; border:none;
            background:#d4af37; color:#1a1a2e; font-weight:700;
            cursor:pointer; font-size:13px;
          ">${esc(submitLabel)}</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    overlay.querySelector('#pc-modal-close').onclick = closeModal;
    overlay.querySelector('#pc-modal-cancel').onclick = closeModal;
    overlay.querySelector('#pc-modal-submit').onclick = async () => {
      const box = overlay.querySelector('#pc-modal-box');
      const ok = await onSubmit(box);
      if (ok !== false) closeModal();
    };

    // close on backdrop click
    overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
  }

  function closeModal() {
    const el = document.getElementById('pc-modal-overlay');
    if (el) el.remove();
  }

  // ── inline form field helpers ─────────────────────────────
  function fieldStyle() {
    return `width:100%; box-sizing:border-box; padding:8px 10px;
      background:#0f0f1e; border:1px solid #444; border-radius:6px;
      color:#e0e0e0; font-size:13px; font-family:sans-serif;`;
  }
  function labelStyle() {
    return `display:block; font-size:11px; color:#aaa;
      text-transform:uppercase; letter-spacing:.5px; margin-bottom:4px;`;
  }
  function rowStyle() { return `display:flex; gap:14px; margin-bottom:14px;`; }
  function halfStyle() { return `flex:1; min-width:0;`; }
  function fullStyle() { return `margin-bottom:14px;`; }
  function sectionHeadStyle() {
    return `font-size:11px; font-weight:700; color:#d4af37;
      text-transform:uppercase; letter-spacing:.6px;
      border-bottom:1px solid #333; padding-bottom:6px; margin:16px 0 12px;`;
  }

  // ── session bootstrap ────────────────────────────────────
  try {
    await Store.ready();
  } catch (e) {
    showGate('Could not connect to the database. Check your connection.', true);
    return;
  }

  // Grab Supabase instance from Store (Store exposes Store.sb or Store.supabase)
  supabase = Store.sb || Store.supabase || window._supabase;

  if (!supabase) {
    showGate('Supabase client not available. Reload and try again.', true);
    return;
  }

  currentUser = Store.getCurrentUser();

  if (!currentUser) {
    showGate('You are not signed in. Please log in through the main app first.', true);
    return;
  }

  const appRole = (currentUser.appRole || currentUser.app_role || '').toLowerCase();
  if (!['logistics', 'operations', 'admin'].includes(appRole)) {
    showGate('This portal is for Shashank (logistics) only. Your account does not have access.', true);
    return;
  }

  // ── render workspace shell ────────────────────────────────
  gateScreen.classList.remove('active');
  workspace.classList.remove('d-none');

  // Set user header
  const avatar = workspace.querySelector('#user-avatar');
  if (avatar) {
    const initials = (currentUser.name || 'SP').split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase();
    avatar.textContent = initials;
    avatar.style.background = '#d4af37';
    avatar.style.color = '#1a1a2e';
  }
  const nameEl = workspace.querySelector('#user-display-name');
  if (nameEl) nameEl.textContent = currentUser.name || 'Shashank Patil';
  const roleEl = workspace.querySelector('#user-display-role');
  if (roleEl) roleEl.textContent = 'Logistics · India Hub';

  // Replace workspace-content with our 3-section layout
  const content = workspace.querySelector('.workspace-content');
  content.innerHTML = `
    <!-- ── METRICS ── -->
    <section style="display:flex; gap:16px; margin-bottom:24px; flex-wrap:wrap;">
      <div id="metric-incoming" style="${metricBoxStyle('#c0392b')}">
        <div id="cnt-incoming" style="font-size:32px; font-weight:800;">0</div>
        <div style="font-size:11px; opacity:.8; margin-top:4px;">Incoming Pieces</div>
      </div>
      <div id="metric-ready" style="${metricBoxStyle('#2d6a4f')}">
        <div id="cnt-ready" style="font-size:32px; font-weight:800;">0</div>
        <div style="font-size:11px; opacity:.8; margin-top:4px;">Ready to Ship</div>
      </div>
      <div id="metric-transit" style="${metricBoxStyle('#1a4a7a')}">
        <div id="cnt-transit" style="font-size:32px; font-weight:800;">0</div>
        <div style="font-size:11px; opacity:.8; margin-top:4px;">In Transit → AU</div>
      </div>
    </section>

    <!-- ── SECTION 1: INCOMING ── -->
    <section style="${sectionCardStyle()}" class="mb-6">
      <div style="${cardHeaderStyle()}">
        <span>📬 Incoming from Tailors</span>
        <span style="font-size:11px; font-weight:400; opacity:.7;">Status: Shipped to Shashank</span>
      </div>
      <div id="incoming-wrap" style="padding:0 4px 4px;"></div>
    </section>

    <!-- ── SECTION 2: READY TO SHIP ── -->
    <section style="${sectionCardStyle()}" class="mb-6">
      <div style="${cardHeaderStyle()}">
        <span>📦 Ready to Ship Internationally</span>
        <span style="font-size:11px; font-weight:400; opacity:.7;">Status: At Shashank — all pieces received</span>
      </div>
      <div id="ready-wrap" style="padding:0 4px 4px;"></div>
    </section>

    <!-- ── SECTION 3: IN TRANSIT ── -->
    <section style="${sectionCardStyle()}">
      <div style="${cardHeaderStyle()}">
        <span>✈️ In Transit → Australia</span>
        <span style="font-size:11px; font-weight:400; opacity:.7;">Status: In Transit</span>
      </div>
      <div id="transit-wrap" style="padding:0 4px 4px;"></div>
    </section>
  `;

  // logout
  const btnLogout = workspace.querySelector('#btn-logout');
  if (btnLogout) {
    btnLogout.addEventListener('click', async () => {
      await Store.logout();
      window.location.href = '../index.html';
    });
  }

  await loadAll();

  // ── STYLE HELPERS ────────────────────────────────────────
  function metricBoxStyle(bg) {
    return `background:${bg}; color:#fff; border-radius:10px;
      padding:16px 24px; min-width:140px; text-align:center;`;
  }
  function sectionCardStyle() {
    return `background:#12122a; border:1px solid #2a2a4a;
      border-radius:12px; overflow:hidden; margin-bottom:24px;`;
  }
  function cardHeaderStyle() {
    return `display:flex; justify-content:space-between; align-items:center;
      padding:14px 20px; background:#1a1a3e; font-weight:700;
      font-size:14px; color:#d4af37; border-bottom:1px solid #2a2a4a;`;
  }
  function tableStyle() {
    return `width:100%; border-collapse:collapse; font-size:13px;`;
  }
  function thStyle() {
    return `text-align:left; padding:10px 14px; font-size:11px;
      text-transform:uppercase; letter-spacing:.5px; color:#888;
      background:#111128; border-bottom:1px solid #2a2a4a;`;
  }
  function tdStyle(idx) {
    const bg = idx % 2 === 0 ? '#12122a' : '#0f0f22';
    return `padding:10px 14px; border-bottom:1px solid #1e1e38; background:${bg}; vertical-align:top;`;
  }
  function emptyRowHTML(cols, msg) {
    return `<tr><td colspan="${cols}" style="text-align:center;
      padding:20px; color:#555; font-size:12px;">${msg}</td></tr>`;
  }
  function btnStyle(bg, color = '#1a1a2e') {
    return `padding:6px 14px; border-radius:6px; border:none;
      background:${bg}; color:${color}; font-weight:700;
      font-size:12px; cursor:pointer; white-space:nowrap;`;
  }
  function badgeStyle(bg) {
    return `display:inline-block; padding:2px 8px; border-radius:4px;
      font-size:11px; font-weight:700; background:${bg}; color:#fff;`;
  }

  // ── LOAD ALL DATA ────────────────────────────────────────
  async function loadAll() {
    const [incoming, ready, transit] = await Promise.all([
      fetchOrders('Shipped to Shashank'),
      fetchOrders('At Shashank'),
      fetchOrders('In Transit'),
    ]);

    document.getElementById('cnt-incoming').textContent = incoming.length;
    document.getElementById('cnt-ready').textContent    = ready.length;
    document.getElementById('cnt-transit').textContent  = transit.length;

    renderIncoming(incoming);
    renderReady(ready);
    renderTransit(transit);
  }

  async function fetchOrders(status) {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('status', status)
      .order('created_at', { ascending: false });
    if (error) { console.error('fetchOrders', status, error); return []; }
    return data || [];
  }

  // ── SECTION 1: INCOMING ──────────────────────────────────
  function renderIncoming(orders) {
    const wrap = document.getElementById('incoming-wrap');
    if (!orders.length) {
      wrap.innerHTML = `<p style="text-align:center; color:#555; padding:20px; font-size:12px;">
        No pieces currently in transit to you.</p>`;
      return;
    }

    let html = `<table style="${tableStyle()}">
      <thead><tr>
        <th style="${thStyle()}">Order</th>
        <th style="${thStyle()}">Client</th>
        <th style="${thStyle()}">Courier / Tracking</th>
        <th style="${thStyle()}">Shipped</th>
        <th style="${thStyle()}">Action</th>
      </tr></thead><tbody>`;

    orders.forEach((o, i) => {
      html += `<tr>
        <td style="${tdStyle(i)}">
          <div style="font-family:monospace; font-weight:700; color:#d4af37;">${esc(o.id)}</div>
        </td>
        <td style="${tdStyle(i)}">
          <div style="font-weight:600;">${esc(o.client_name || o.clientName || '—')}</div>
          <div style="font-size:11px; color:#888; margin-top:2px;">${esc(o.title || '')}</div>
        </td>
        <td style="${tdStyle(i)}">
          <div style="font-family:monospace; color:#7ecfff;">${esc(o.domestic_tracking || '—')}</div>
          <div style="font-size:11px; color:#888;">${esc(o.domestic_courier || '')}</div>
        </td>
        <td style="${tdStyle(i)}" nowrap>${fmtDateTime(o.shipped_to_shashank_date)}</td>
        <td style="${tdStyle(i)}">
          <button style="${btnStyle('#2d6a4f','#fff')}"
            onclick="window._pcMarkReceived('${esc(o.id)}')">
            ✓ Mark Received
          </button>
        </td>
      </tr>`;
    });

    html += '</tbody></table>';
    wrap.innerHTML = html;
  }

  window._pcMarkReceived = async function(orderId) {
    const { error } = await supabase
      .from('orders')
      .update({
        status: 'At Shashank',
        received_by_shashank_date: new Date().toISOString()
      })
      .eq('id', orderId);

    if (error) { toast('Error: ' + error.message, 'error'); return; }
    toast('Marked as received — order is now At Shashank.');
    await loadAll();
  };

  // ── SECTION 2: READY TO SHIP ─────────────────────────────
  function renderReady(orders) {
    const wrap = document.getElementById('ready-wrap');
    if (!orders.length) {
      wrap.innerHTML = `<p style="text-align:center; color:#555; padding:20px; font-size:12px;">
        No orders fully received and ready to ship.</p>`;
      return;
    }

    let html = `<table style="${tableStyle()}">
      <thead><tr>
        <th style="${thStyle()}">Order</th>
        <th style="${thStyle()}">Client</th>
        <th style="${thStyle()}">Garment</th>
        <th style="${thStyle()}">Received</th>
        <th style="${thStyle()}">Action</th>
      </tr></thead><tbody>`;

    orders.forEach((o, i) => {
      html += `<tr>
        <td style="${tdStyle(i)}">
          <div style="font-family:monospace; font-weight:700; color:#d4af37;">${esc(o.id)}</div>
        </td>
        <td style="${tdStyle(i)}">
          <div style="font-weight:600;">${esc(o.client_name || o.clientName || '—')}</div>
        </td>
        <td style="${tdStyle(i)}">
          <div style="font-size:12px; color:#ccc;">${esc(o.title || '—')}</div>
        </td>
        <td style="${tdStyle(i)}" nowrap>${fmtDate(o.received_by_shashank_date)}</td>
        <td style="${tdStyle(i)}">
          <button style="${btnStyle('#d4af37')}"
            onclick="window._pcShipIntl('${esc(o.id)}')">
            ✈️ Ship International
          </button>
        </td>
      </tr>`;
    });

    html += '</tbody></table>';
    wrap.innerHTML = html;
  }

  window._pcShipIntl = function(orderId) {
    const carrierOptions = [
      'DHL Express', 'FedEx International Priority',
      'Australia Post International', 'Aramex', 'UPS Worldwide'
    ].map(c => `<option value="${c}">${c}</option>`).join('');

    const bodyHTML = `
      <div style="${rowStyle()}">
        <div style="${halfStyle()}">
          <label style="${labelStyle()}">Carrier</label>
          <select id="f-carrier" style="${fieldStyle()}">${carrierOptions}</select>
        </div>
        <div style="${halfStyle()}">
          <label style="${labelStyle()}">Tracking Number</label>
          <input id="f-tracking" type="text" style="${fieldStyle()}" placeholder="e.g. DHL-12345678" required>
        </div>
      </div>
      <div style="${rowStyle()}">
        <div style="${halfStyle()}">
          <label style="${labelStyle()}">Shipping Cost (AUD)</label>
          <input id="f-cost" type="number" step="0.01" min="0" style="${fieldStyle()}" placeholder="0.00" required>
        </div>
        <div style="${halfStyle()}">
          <label style="${labelStyle()}">Gross Weight (kg)</label>
          <input id="f-weight" type="number" step="0.1" min="0.1" value="2.5" style="${fieldStyle()}" required>
        </div>
      </div>
      <div style="${rowStyle()}">
        <div style="${halfStyle()}">
          <label style="${labelStyle()}">Box Dimensions (L × W × H cm)</label>
          <input id="f-dims" type="text" style="${fieldStyle()}" placeholder="40 x 30 x 15" value="40 x 30 x 15">
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
      <div style="${rowStyle()}">
        <div style="${halfStyle()}">
          <label style="${labelStyle()}">HS Code</label>
          <input id="f-hscode" type="text" style="${fieldStyle()}" value="5007.20" placeholder="e.g. 5007.20">
        </div>
        <div style="${halfStyle()}">
          <label style="${labelStyle()}">Customs Value (AUD)</label>
          <input id="f-customs-val" type="number" step="0.01" min="0" style="${fieldStyle()}" placeholder="0.00" required>
        </div>
      </div>
      <div style="${fullStyle()}">
        <label style="${labelStyle()}">Goods Description (for customs)</label>
        <input id="f-goods-desc" type="text" style="${fieldStyle()}"
          value="100% Handloom Silk Embroideries — Bridal Garments" placeholder="Plain English description">
      </div>
      <div style="${rowStyle()}">
        <div style="${halfStyle()}">
          <label style="${labelStyle()}">Country of Origin</label>
          <input id="f-origin" type="text" style="${fieldStyle()}" value="India">
        </div>
        <div style="${halfStyle()}">
          <label style="${labelStyle()}">Dispatch Date</label>
          <input id="f-dispatch-date" type="date" style="${fieldStyle()}"
            value="${new Date().toISOString().split('T')[0]}">
        </div>
      </div>
    `;

    openModal({
      title: `Ship International — Order ${orderId}`,
      bodyHTML,
      submitLabel: '✈️ Confirm Dispatch',
      onSubmit: async (box) => {
        const carrier      = box.querySelector('#f-carrier').value.trim();
        const tracking     = box.querySelector('#f-tracking').value.trim();
        const cost         = parseFloat(box.querySelector('#f-cost').value) || 0;
        const weight       = box.querySelector('#f-weight').value.trim();
        const dims         = box.querySelector('#f-dims').value.trim();
        const incoterms    = box.querySelector('#f-incoterms').value;
        const hsCode       = box.querySelector('#f-hscode').value.trim();
        const customsVal   = parseFloat(box.querySelector('#f-customs-val').value) || 0;
        const goodsDesc    = box.querySelector('#f-goods-desc').value.trim();
        const origin       = box.querySelector('#f-origin').value.trim();
        const dispatchDate = box.querySelector('#f-dispatch-date').value;

        if (!tracking) { toast('Tracking number is required.', 'error'); return false; }
        if (!cost)     { toast('Shipping cost is required.', 'error'); return false; }
        if (!customsVal) { toast('Customs value is required.', 'error'); return false; }

        const { error } = await supabase
          .from('orders')
          .update({
            status: 'In Transit',
            carrier,
            tracking_number: tracking,
            shipping_cost: cost,
            shipping_weight: weight + ' kg',
            shipping_dims: dims,
            incoterms,
            hs_code: hsCode,
            customs_value: customsVal,
            customs_description: goodsDesc,
            country_of_origin: origin,
            dispatched_date: dispatchDate ? new Date(dispatchDate).toISOString() : new Date().toISOString()
          })
          .eq('id', orderId);

        if (error) { toast('Error: ' + error.message, 'error'); return false; }
        toast(`Dispatched! Tracking: ${tracking}`);
        await loadAll();
        return true;
      }
    });
  };

  // ── SECTION 3: IN TRANSIT ────────────────────────────────
  function renderTransit(orders) {
    const wrap = document.getElementById('transit-wrap');
    if (!orders.length) {
      wrap.innerHTML = `<p style="text-align:center; color:#555; padding:20px; font-size:12px;">
        No active shipments in transit to Australia.</p>`;
      return;
    }

    let html = `<table style="${tableStyle()}">
      <thead><tr>
        <th style="${thStyle()}">Tracking</th>
        <th style="${thStyle()}">Carrier</th>
        <th style="${thStyle()}">Client / Order</th>
        <th style="${thStyle()}">Shipping Cost</th>
        <th style="${thStyle()}">Dispatched</th>
        <th style="${thStyle()}">Action</th>
      </tr></thead><tbody>`;

    orders.forEach((o, i) => {
      const cost = o.shipping_cost
        ? `AUD $${parseFloat(o.shipping_cost).toFixed(2)}`
        : '—';
      html += `<tr>
        <td style="${tdStyle(i)}">
          <div style="font-family:monospace; color:#7ecfff;">${esc(o.tracking_number || o.trackingNumber || '—')}</div>
        </td>
        <td style="${tdStyle(i)}">
          <span style="${badgeStyle('#1a4a7a')}">${esc(o.carrier || '—')}</span>
        </td>
        <td style="${tdStyle(i)}">
          <div style="font-weight:600;">${esc(o.client_name || o.clientName || '—')}</div>
          <div style="font-size:11px; color:#888; margin-top:2px; font-family:monospace;">${esc(o.id)}</div>
        </td>
        <td style="${tdStyle(i)}" nowrap>${cost}</td>
        <td style="${tdStyle(i)}" nowrap>${fmtDate(o.dispatched_date)}</td>
        <td style="${tdStyle(i)}">
          <button style="${btnStyle('#2d6a4f','#fff')}"
            onclick="window._pcMarkDelivered('${esc(o.id)}')">
            ✓ Mark Delivered
          </button>
        </td>
      </tr>`;
    });

    html += '</tbody></table>';
    wrap.innerHTML = html;
  }

  window._pcMarkDelivered = async function(orderId) {
    const { error } = await supabase
      .from('orders')
      .update({ status: 'Delivered' })
      .eq('id', orderId);

    if (error) { toast('Error: ' + error.message, 'error'); return; }
    toast('Delivered — order marked complete.');
    await loadAll();
  };

});
