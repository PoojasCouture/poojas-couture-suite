/* ============================================================
   POOJA'S COUTURE — International Shipping Controller (v2)
   Inherits the session from the main app (shared Supabase auth).
   No separate login — if not signed in, redirect to main login.
   ============================================================ */

document.addEventListener('DOMContentLoaded', async () => {
  let currentUser = null;

  const gateScreen = Utils.$('#gate-screen');
  const gateMessage = Utils.$('#gate-message');
  const gateActions = Utils.$('#gate-actions');
  const shippingWorkspace = Utils.$('#shipping-workspace');
  const userAvatar = Utils.$('#user-avatar');
  const userDisplayName = Utils.$('#user-display-name');
  const userDisplayRole = Utils.$('#user-display-role');
  const btnLogout = Utils.$('#btn-logout');

  const countReady = Utils.$('#count-ready');
  const countTransit = Utils.$('#count-transit');
  const packingTbody = Utils.$('#packing-table-body');
  const transitTbody = Utils.$('#transit-table-body');

  function validateRole(user) {
    const appRole = (user.appRole || user.app_role || '').toLowerCase();
    // Logistics, social_crm (Sakshi), operations, and admins may access shipping
    return ['logistics', 'social_crm', 'operations', 'admin'].includes(appRole);
  }

  function showGate(message, allowLogin) {
    gateScreen.classList.add('active');
    shippingWorkspace.classList.add('d-none');
    gateMessage.textContent = message;
    gateActions.classList.toggle('d-none', !allowLogin);
  }

  function showWorkspace() {
    gateScreen.classList.remove('active');
    shippingWorkspace.classList.remove('d-none');

    userAvatar.textContent = Utils.getInitials(currentUser.name);
    userAvatar.style.backgroundColor = Utils.getAvatarColor(currentUser.name);
    userAvatar.style.color = 'var(--pc-text-inverse)';
    userDisplayName.textContent = currentUser.name;
    userDisplayRole.textContent = `${currentUser.role} (Export Hub)`;

    loadShipments();
  }

  // ---------- Session bootstrap (inherits main-app login) ----------
  try {
    await Store.ready();
  } catch (e) {
    console.error('Could not connect to database:', e);
    showGate('Could not connect to the database. Check your connection and try again.', true);
    return;
  }

  currentUser = Store.getCurrentUser();

  if (!currentUser) {
    showGate('You are not signed in. Please log in through the main app first.', true);
    return;
  }
  if (!validateRole(currentUser)) {
    showGate('This portal is for logistics staff only. Your account does not have shipping access.', true);
    return;
  }

  showWorkspace();

  // ---------- Logout ----------
  btnLogout.addEventListener('click', async () => {
    await Store.logout();
    currentUser = null;
    window.location.href = '../index.html';
  });

  // ---------- Load Shipments lists ----------
  function loadShipments() {
    packingTbody.innerHTML = '';
    transitTbody.innerHTML = '';

    const orders = Store.getAll(Store.COLLECTIONS.ORDERS);

    const readyOrders = orders.filter(o => o.status === 'Ready');
    countReady.textContent = readyOrders.length;

    if (readyOrders.length === 0) {
      packingTbody.innerHTML = `<tr><td colspan="5" class="text-center p-6 text-muted text-xs">No orders ready for packing. Check workshop workstations.</td></tr>`;
    } else {
      readyOrders.forEach(o => {
        const tr = Utils.createElement('tr');
        tr.innerHTML = `
          <td class="font-mono font-semibold">${o.id}</td>
          <td>
            <div class="font-medium">${Utils.sanitizeHTML(o.clientName)}</div>
            <div class="text-xs text-muted truncate" style="max-width: 200px;">${Utils.sanitizeHTML(o.title)}</div>
          </td>
          <td class="font-mono">${Utils.formatCurrency(o.price)}</td>
          <td class="font-mono text-danger">${Utils.formatDate(o.deadline)}</td>
          <td>
            <div class="table-actions justify-end">
              <button class="btn btn-primary btn-sm" onclick="shipOutfit('${o.id}')">Ship Cargo</button>
            </div>
          </td>
        `;
        packingTbody.appendChild(tr);
      });
    }

    const transitOrders = orders.filter(o => o.status === 'In Transit');
    countTransit.textContent = transitOrders.length;

    if (transitOrders.length === 0) {
      transitTbody.innerHTML = `<tr><td colspan="5" class="text-center p-6 text-muted text-xs">No active exports in transit.</td></tr>`;
    } else {
      transitOrders.forEach(o => {
        const tr = Utils.createElement('tr');
        tr.innerHTML = `
          <td class="font-mono font-semibold">${o.trackingNumber || 'DHL-IN-98271'}</td>
          <td><span class="badge badge-info">${o.carrier || 'DHL Express'}</span></td>
          <td>
            <div class="font-medium">${Utils.sanitizeHTML(o.title)}</div>
            <div class="text-xs text-muted">Destination: Australia</div>
          </td>
          <td class="font-mono">${Utils.formatCurrency(o.price)}</td>
          <td>
            <div class="table-actions justify-end">
              <button class="btn btn-success btn-sm" onclick="markDelivered('${o.id}')">Delivered</button>
            </div>
          </td>
        `;
        transitTbody.appendChild(tr);
      });
    }
  }

  // ---------- Ship Cargo Form ----------
  window.shipOutfit = function(orderId) {
    const o = Store.getById(Store.COLLECTIONS.ORDERS, orderId);
    if (!o) return;

    const mockTrack = `DHL-IN-${Utils.randomBetween(10000, 99999)}`;

    const formHTML = `
      <form id="shipping-form" class="customs-form-wrapper animate-fade-in-scale">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Carrier Partner</label>
            <select name="carrier" class="form-select">
              <option value="DHL Express">DHL Express Cargo</option>
              <option value="FedEx Aviation">FedEx Priority</option>
              <option value="India Post EMS">India Post EMS Speed</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Tracking Number</label>
            <input type="text" name="trackingNumber" class="form-input font-mono" required value="${mockTrack}">
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Gross weight (kg)</label>
            <input type="number" name="weight" class="form-input font-mono" required min="0.1" step="0.1" value="2.5">
          </div>
          <div class="form-group">
            <label class="form-label">Box Size (L x W x H cm)</label>
            <input type="text" name="dimensions" class="form-input font-mono" required value="40 x 30 x 15">
          </div>
        </div>

        <div style="border-top: 1px solid var(--pc-border); padding-top: var(--sp-3);">
          <h4 class="text-xs font-semibold text-gold mb-2">Australian Customs &amp; Border Force declaration</h4>
          <div class="form-group">
            <label class="form-label">Export HS Code / Tariff Description</label>
            <input type="text" name="hsDesc" class="form-input" required value="100% Handloom Silk Embroideries (Tariff Code: 5007.20)">
          </div>
          <div class="form-group">
            <label class="form-label">Customs declared value (AUD)</label>
            <input type="number" name="customsValue" class="form-input font-mono" required value="${o.price}">
          </div>
        </div>
      </form>
    `;

    showModal({
      title: `Prepare Export Cargo — Order: ${o.id}`,
      content: formHTML,
      submitText: 'Dispatch & Print Label',
      onSubmit: async (modalEl) => {
        const form = Utils.$('#shipping-form', modalEl);
        const formData = new FormData(form);

        const carrier = formData.get('carrier');
        const tracker = formData.get('trackingNumber');

        await Store.update(Store.COLLECTIONS.ORDERS, o.id, {
          status: 'In Transit',
          carrier: carrier,
          trackingNumber: tracker,
          shippingWeight: formData.get('weight') + ' kg',
          shippingDims: formData.get('dimensions'),
          customsDecl: formData.get('hsDesc'),
          customsValue: parseFloat(formData.get('customsValue'))
        });

        Utils.showToast(`Cargo dispatched. Tracking Code: ${tracker}.`);
        loadShipments();
        setTimeout(() => printAirwayBill(o.id), 250);
        return true;
      }
    });
  };

  function printAirwayBill(orderId) {
    const o = Store.getById(Store.COLLECTIONS.ORDERS, orderId);
    if (!o) return;

    const labelHTML = `
      <div class="shipping-label-preview animate-fade-in" style="background:#fff; color:#000; border:3px solid #000; font-family:monospace; padding:15px; width:340px; margin:0 auto;">
        <div style="text-align:center; font-weight:bold; font-size:16px; border-bottom:2px dashed #000; padding-bottom:8px; margin-bottom:8px;">
          ${(o.carrier || 'DHL EXPRESS').toUpperCase()} AIR WAYBILL
        </div>
        <div>
          <strong>FROM:</strong> Pooja's Couture India Workshop<br>
          Chandi Chowk Bazaar, New Delhi, India 110006<br>
          <br>
          <strong>TO:</strong> ${(o.clientName || '').toUpperCase()}<br>
          Studio 4, Double Bay, Sydney NSW, Australia 2028<br>
          <br>
          <strong>DESC:</strong> ${o.customsDecl || ''}<br>
          <strong>WEIGHT:</strong> ${o.shippingWeight || ''} | <strong>BOX:</strong> ${o.shippingDims || ''}<br>
          <strong>VALUE:</strong> $${(o.customsValue || 0).toLocaleString()} AUD
        </div>
        <div style="border-top:2px dashed #000; margin-top:8px; padding-top:8px; text-align:center;">
          <div style="font-weight:bold; font-size:14px; margin-bottom:4px;">BARCODE TRACKING</div>
          <div style="background:#000; color:#fff; padding:6px; letter-spacing:4px; font-weight:bold;">${o.trackingNumber || ''}</div>
        </div>
      </div>
    `;

    showModal({
      title: 'Airway Cargo Print Label Advice',
      content: labelHTML,
      submitText: 'Print Barcode Label',
      onSubmit: () => {
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
          <html>
            <head><title>Print Airway Bill</title></head>
            <body>
              ${labelHTML}
              <script>window.onload = function() { window.print(); window.close(); }<\/script>
            </body>
          </html>
        `);
        printWindow.document.close();
        return true;
      }
    });
  }

  // ---------- Mark Delivered ----------
  window.markDelivered = async function(orderId) {
    await Store.update(Store.COLLECTIONS.ORDERS, orderId, { status: 'Delivered' });
    Utils.showToast('Outfits delivered safely to client.');
    loadShipments();
  };

  // ---------- Reusable Modal Drawer ----------
  function showModal({ title, content, submitText = 'Submit', onSubmit }) {
    closeModal();
    const overlay = Utils.createElement('div', { className: 'modal-overlay active' });
    overlay.innerHTML = `
      <div class="modal">
        <div class="modal-header">
          <div class="modal-title">${Utils.sanitizeHTML(title)}</div>
          <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
        </div>
        <div class="modal-body">${content}</div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
          <button class="btn btn-primary" id="modal-submit-btn">${submitText}</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    Utils.$('#modal-submit-btn', overlay).addEventListener('click', async () => {
      const result = await onSubmit(overlay);
      if (result !== false) overlay.remove();
    });
  }

  function closeModal() {
    const exist = Utils.$('.modal-overlay');
    if (exist) exist.remove();
  }
});
