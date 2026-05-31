/* ============================================================
   POOJA'S COUTURE — Tailor Workstation Controller (v2)
   Inherits the session from the main app (shared Supabase auth).
   No separate login — if not signed in, redirect to main login.
   ============================================================ */

document.addEventListener('DOMContentLoaded', async () => {
  let currentUser = null;
  let activeFilter = 'pending';

  const gateScreen = Utils.$('#gate-screen');
  const gateMessage = Utils.$('#gate-message');
  const gateActions = Utils.$('#gate-actions');
  const tailorWorkspace = Utils.$('#tailor-workspace');
  const userAvatar = Utils.$('#user-avatar');
  const userDisplayName = Utils.$('#user-display-name');
  const userDisplayRole = Utils.$('#user-display-role');
  const btnLogout = Utils.$('#btn-logout');

  const btnPunch = Utils.$('#btn-punch');
  const punchStatusText = Utils.$('#punch-status-text');
  const taskCounter = Utils.$('#task-counter');
  const tasksList = Utils.$('#tasks-list');

  function validateRole(user) {
    const role = (user.role || '').toLowerCase();
    const appRole = (user.appRole || user.app_role || '').toLowerCase();
    return role === 'tailor' || role === 'embroiderer'
        || appRole === 'tailor' || appRole === 'admin' || appRole === 'operations';
  }

  function showGate(message, allowLogin) {
    gateScreen.classList.add('active');
    tailorWorkspace.classList.add('d-none');
    gateMessage.textContent = message;
    gateActions.classList.toggle('d-none', !allowLogin);
  }

  function showWorkspace() {
    gateScreen.classList.remove('active');
    tailorWorkspace.classList.remove('d-none');
    userAvatar.textContent = Utils.getInitials(currentUser.name);
    userAvatar.style.backgroundColor = Utils.getAvatarColor(currentUser.name);
    userAvatar.style.color = 'var(--pc-text-inverse)';
    userDisplayName.textContent = currentUser.name;
    userDisplayRole.textContent = `${currentUser.role} (Production)`;
    updatePunchCardStatus();
    loadTasks();
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
    showGate('This workstation is for tailors only. Your account does not have workshop access.', true);
    return;
  }
  showWorkspace();

  // ---------- Logout ----------
  btnLogout.addEventListener('click', async () => {
    await Store.logout();
    currentUser = null;
    window.location.href = '../index.html';
  });

  // ---------- Attendance Punch In/Out ----------
  function updatePunchCardStatus() {
    const todayStr = new Date().toISOString().split('T')[0];
    const attendance = Store.getAll(Store.COLLECTIONS.ATTENDANCE);
    const todayRecord = attendance.find(a => a.employeeId === currentUser.id && a.date === todayStr);
    if (todayRecord) {
      if (todayRecord.checkOut && todayRecord.checkOut !== '—') {
        punchStatusText.textContent = `Completed shift: ${todayRecord.checkIn} - ${todayRecord.checkOut}`;
        btnPunch.textContent = 'Shift Ended';
        btnPunch.disabled = true;
        btnPunch.className = 'btn btn-secondary btn-sm';
      } else {
        punchStatusText.textContent = `Clocked in at ${todayRecord.checkIn}`;
        btnPunch.textContent = 'Clock Out';
        btnPunch.disabled = false;
        btnPunch.className = 'btn btn-danger btn-sm';
      }
    } else {
      punchStatusText.textContent = 'Not clocked in today';
      btnPunch.textContent = 'Clock In';
      btnPunch.disabled = false;
      btnPunch.className = 'btn btn-primary btn-sm';
    }
  }

  btnPunch.addEventListener('click', async () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const attendance = Store.getAll(Store.COLLECTIONS.ATTENDANCE);
    const existing = attendance.find(a => a.employeeId === currentUser.id && a.date === todayStr);
    const timePad = (d) => {
      const hours = d.getHours();
      const mins = d.getMinutes().toString().padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const h = hours % 12 || 12;
      return `${h}:${mins} ${ampm}`;
    };
    if (existing) {
      await Store.update(Store.COLLECTIONS.ATTENDANCE, existing.id, {
        checkOut: timePad(new Date()), status: 'Present'
      });
      Utils.showToast('Clocked out successfully. Dhanyavaad!');
    } else {
      await Store.create(Store.COLLECTIONS.ATTENDANCE, {
        employeeId: currentUser.id,
        employeeName: currentUser.name,
        date: todayStr,
        checkIn: timePad(new Date()),
        checkOut: '—',
        status: 'Present'
      });
      Utils.showToast('Clocked in successfully. Shubh Kaam!');
    }
    updatePunchCardStatus();
  });

  // ---------- Filters ----------
  Utils.$$('.filter-tab').forEach(tab => {
    tab.addEventListener('click', (e) => {
      Utils.$$('.filter-tab').forEach(t => t.classList.remove('active'));
      e.target.classList.add('active');
      activeFilter = e.target.dataset.filter;
      loadTasks();
    });
  });

  // ---------- Load Tasks ----------
  function loadTasks() {
    tasksList.innerHTML = '';
    const orders = Store.getAll(Store.COLLECTIONS.ORDERS);

    let filtered = [];
    if (activeFilter === 'pending') {
      filtered = orders.filter(o => o.status === 'Fabric Sourced' || o.status === 'In Production' || o.status === 'Fitting');
    } else {
      filtered = orders.filter(o => o.status === 'Ready' || o.status === 'Shipped to Shashank' || o.status === 'At Shashank' || o.status === 'In Transit' || o.status === 'Delivered');
    }

    taskCounter.textContent = `${filtered.length} Tasks`;
    if (filtered.length === 0) {
      tasksList.innerHTML = `<div class="text-center p-6 text-muted text-xs">No assignments logged in this category.</div>`;
      return;
    }

    filtered.forEach(order => {
      const card = Utils.createElement('div', { className: 'task-card' });
      const inrWage = Math.round(order.price * 0.05 * 55);

      let actionButton = '';
      if (activeFilter === 'pending') {
        if (order.status === 'Fabric Sourced') {
          actionButton = `<button class="btn btn-primary btn-sm mt-2" onclick="startWork('${order.id}')">Start Production</button>`;
        } else if (order.status === 'In Production') {
          actionButton = `<button class="btn btn-success btn-sm mt-2" onclick="finishWork('${order.id}')">Finish Stitching</button>`;
        } else if (order.status === 'Fitting') {
          actionButton = `<button class="btn btn-gold btn-sm mt-2" onclick="openShipToShashank('${order.id}')">Ship to Shashank</button>`;
        }
      } else if (order.status === 'Shipped to Shashank') {
        actionButton = `<span class="badge badge-info text-xs mt-2 p-2">Shipped to Shashank — ${Utils.sanitizeHTML(order.domesticTracking || 'tracking pending')}</span>`;
      }

      card.innerHTML = `
        <div class="task-header">
          <div>
            <span class="badge badge-gold text-xs">${order.status}</span>
            <h4 class="task-title mt-1">${Utils.sanitizeHTML(order.title)}</h4>
            <div class="text-xs text-muted mt-1">Client: ${Utils.sanitizeHTML(order.clientName)}</div>
          </div>
          <div class="text-right">
            <div class="text-xs text-gold font-semibold">₹${inrWage.toLocaleString('en-IN')}</div>
            <div class="text-muted" style="font-size: 9px;">Piece Payout</div>
          </div>
        </div>
        <div class="measurement-badge mt-2">
          <strong>Stitching specs:</strong>
          ${Utils.sanitizeHTML(order.notes || 'No specific measurement instructions logged.')}
        </div>
        <div class="d-flex justify-between items-center mt-2">
          <span class="text-xs text-danger">Target: ${Utils.formatDate(order.deadline)}</span>
          ${actionButton}
        </div>
      `;
      tasksList.appendChild(card);
    });
  }

  window.startWork = async function(orderId) {
    try {
      await Store.rpc('tailor_update_order_status', { p_order_id: orderId, p_status: 'In Production' });
      await Store.refresh('orders');
      Utils.showToast('Production started. Fabric locked.');
      loadTasks();
    } catch (e) {
      Utils.showToast('Could not update: ' + e.message, 'error');
    }
  };

  window.finishWork = async function(orderId) {
    try {
      await Store.rpc('tailor_update_order_status', { p_order_id: orderId, p_status: 'Fitting' });
      await Store.refresh('orders');
      Utils.showToast('Stitching completed. Order set to Fitting stage.');
      loadTasks();
    } catch (e) {
      Utils.showToast('Could not update: ' + e.message, 'error');
    }
  };

  // ---------- Ship to Shashank (domestic India leg) ----------
  window.openShipToShashank = function(orderId) {
    const o = Store.getById(Store.COLLECTIONS.ORDERS, orderId);
    if (!o) return;

    const formHTML = `
      <form id="ship-shashank-form">
        <p class="text-xs text-muted mb-3">
          Dispatching <strong>${Utils.sanitizeHTML(o.title)}</strong> for client
          <strong>${Utils.sanitizeHTML(o.clientName)}</strong> to Shashank (consolidation hub, India).
        </p>
        <div class="form-group">
          <label class="form-label">Courier (domestic India)</label>
          <select name="courier" class="form-select">
            <option value="DTDC">DTDC</option>
            <option value="Blue Dart">Blue Dart</option>
            <option value="India Post">India Post</option>
            <option value="Delhivery">Delhivery</option>
            <option value="Professional Couriers">Professional Couriers</option>
            <option value="Hand Delivery">Hand Delivery</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Tracking / Docket Number</label>
          <input type="text" name="tracking" class="form-input font-mono" required placeholder="e.g. DTDC-123456789">
        </div>
      </form>
    `;

    showModal({
      title: `Ship to Shashank — ${o.id}`,
      content: formHTML,
      submitText: 'Confirm Dispatch',
      onSubmit: async (modalEl) => {
        const form = Utils.$('#ship-shashank-form', modalEl);
        const fd = new FormData(form);
        const tracking = (fd.get('tracking') || '').trim();
        const courier = fd.get('courier');
        if (!tracking) { Utils.showToast('Enter a tracking number.', 'error'); return false; }
        try {
          await Store.rpc('tailor_ship_to_shashank', {
            p_order_id: o.id, p_tracking: tracking, p_courier: courier
          });
          await Store.refresh('orders');
          Utils.showToast(`Dispatched to Shashank. Tracking: ${tracking}`);
          loadTasks();
          return true;
        } catch (e) {
          Utils.showToast('Could not dispatch: ' + e.message, 'error');
          return false;
        }
      }
    });
  };

  // ---------- Reusable Modal (self-contained inline styles) ----------
  // Inline styles so it displays regardless of the portal stylesheet.
  function showModal({ title, content, submitText = 'Submit', onSubmit }) {
    const exist = document.querySelector('.pc-modal-overlay');
    if (exist) exist.remove();

    const overlay = document.createElement('div');
    overlay.className = 'pc-modal-overlay';
    overlay.style.cssText = [
      'position:fixed', 'inset:0', 'z-index:9999',
      'background:rgba(0,0,0,0.6)',
      'display:flex', 'align-items:center', 'justify-content:center',
      'padding:20px'
    ].join(';');

    overlay.innerHTML = `
      <div style="background:var(--pc-surface,#1f1f29); color:var(--pc-text,#f5f5f5);
                  width:100%; max-width:460px; border-radius:12px;
                  box-shadow:0 20px 60px rgba(0,0,0,0.5); overflow:hidden;
                  border:1px solid rgba(255,255,255,0.08);">
        <div style="display:flex; justify-content:space-between; align-items:center;
                    padding:16px 20px; border-bottom:1px solid rgba(255,255,255,0.08);">
          <div style="font-weight:600; font-size:15px;">${Utils.sanitizeHTML(title)}</div>
          <button id="pc-modal-x" style="background:none; border:none; color:inherit;
                  font-size:22px; line-height:1; cursor:pointer; opacity:0.7;">×</button>
        </div>
        <div style="padding:20px;">${content}</div>
        <div style="display:flex; justify-content:flex-end; gap:10px;
                    padding:16px 20px; border-top:1px solid rgba(255,255,255,0.08);">
          <button class="btn btn-secondary" id="pc-modal-cancel">Cancel</button>
          <button class="btn btn-primary" id="pc-modal-submit">${submitText}</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    const close = () => overlay.remove();
    overlay.querySelector('#pc-modal-x').addEventListener('click', close);
    overlay.querySelector('#pc-modal-cancel').addEventListener('click', close);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

    overlay.querySelector('#pc-modal-submit').addEventListener('click', async () => {
      const result = await onSubmit(overlay);
      if (result !== false) close();
    });
  }
});
