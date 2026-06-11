/* ============================================================
   POOJA'S COUTURE — Tailor Workstation Controller (v2)
   Inherits the session from the main app (shared Supabase auth).
   No separate login — if not signed in, redirect to main login.
   ============================================================ */

document.addEventListener('DOMContentLoaded', async () => {

  // ---- Theme (shared with main app via pc_theme localStorage key) ----
  function initTheme() {
    var saved = null;
    try { saved = localStorage.getItem('pc_theme'); } catch(e) {}
    var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    var theme = saved || (prefersDark ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', theme);
    var btn = document.getElementById('btn-theme-toggle');
    if (btn) btn.textContent = theme === 'dark' ? '☀️' : '🌙';
  }
  initTheme();
  var themeBtn = document.getElementById('btn-theme-toggle');
  if (themeBtn) {
    themeBtn.addEventListener('click', function() {
      var current = document.documentElement.getAttribute('data-theme') || 'dark';
      var next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      try { localStorage.setItem('pc_theme', next); } catch(e) {}
      themeBtn.textContent = next === 'dark' ? '☀️' : '🌙';
    });
  }

  let currentUser = null;
  let activeFilter = 'pending';

  // Use lazy getters so elements are always fetched fresh (guards against timing issues)
  function el(id) { return document.getElementById(id); }

  function validateRole(user) {
    const role = (user.role || '').toLowerCase();
    const appRole = (user.appRole || user.app_role || '').toLowerCase();
    return role === 'tailor' || role === 'embroiderer'
        || appRole === 'tailor' || appRole === 'admin' || appRole === 'operations';
  }

  function showGate(message, allowLogin) {
    var gs = el('gate-screen');
    var tw = el('tailor-workspace');
    var gm = el('gate-message');
    var ga = el('gate-actions');
    if (gs) gs.classList.add('active');
    if (tw) tw.classList.add('d-none');
    if (gm) gm.textContent = message;
    if (ga) ga.classList.toggle('d-none', !allowLogin);
  }

  function showWorkspace() {
    var gs = el('gate-screen');
    var tw = el('tailor-workspace');
    if (gs) gs.classList.remove('active');
    if (tw) tw.classList.remove('d-none');
    var userAvatar = el('user-avatar');
    var userDisplayName = el('user-display-name');
    var userDisplayRole = el('user-display-role');
    if (userAvatar) {
      userAvatar.textContent = Utils.getInitials(currentUser.name);
      userAvatar.style.backgroundColor = Utils.getAvatarColor(currentUser.name);
      userAvatar.style.color = 'var(--pc-text-inverse)';
    }
    if (userDisplayName) userDisplayName.textContent = currentUser.name;
    if (userDisplayRole) userDisplayRole.textContent = currentUser.name === 'Pooja Shah' ? 'Managing Director' : (currentUser.role + ' (Production)');
    updatePunchCardStatus();
    loadTasks();
  }

  // ---------- Session bootstrap (inherits main-app login) ----------
  try {
    await Store.ready();
    Store.subscribeRealtime();
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

  // Element references — declared AFTER auth check, BEFORE showWorkspace()
  var btnLogout = el('btn-logout');
  var btnPunch = el('btn-punch');
  var punchStatusText = el('punch-status-text');
  var taskCounter = el('task-counter');
  var tasksList = el('tasks-list');

  showWorkspace();

  // ---------- Logout ----------
  if (btnLogout) btnLogout.addEventListener('click', async () => {
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

  if (btnPunch) btnPunch.addEventListener('click', async () => {
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

  // ---------- Order Detail Modal ----------
  window.viewOrderDetail = function(orderId) {
    const o = Store.getById(Store.COLLECTIONS.ORDERS, orderId);
    if (!o) return;

    const m = (field) => o[field] ? '<span class="font-mono">' + Utils.sanitizeHTML(o[field]) + '</span>' : '<span class="text-muted">—</span>';
    const row = (label, val) => val ? '<div class="d-flex justify-between items-start py-1" style="border-bottom:1px solid var(--pc-border)">' +
      '<span class="text-xs text-muted" style="min-width:130px">' + label + '</span>' +
      '<span class="text-xs text-right font-semibold">' + val + '</span>' +
    '</div>' : '';

    const content =
      '<div class="d-flex flex-col gap-4">' +

      // Status + codes
      '<div class="d-flex gap-2 items-center flex-wrap">' +
        '<span class="badge badge-gold">' + Utils.sanitizeHTML(o.status) + '</span>' +
        (o.orderCode ? '<span class="font-mono text-xs text-gold">' + Utils.sanitizeHTML(o.orderCode) + '</span>' : '') +
      '</div>' +

      // Client + occasion
      '<div class="card p-3">' +
        '<div class="text-xs font-semibold text-gold mb-2">CLIENT & OCCASION</div>' +
        row('Client', Utils.sanitizeHTML(o.clientName)) +
        row('Garment', Utils.sanitizeHTML(o.title)) +
        row('Event', Utils.sanitizeHTML(o.eventName || '')) +
        row('Event Date', o.eventDate ? Utils.formatDate(o.eventDate) : '') +
        row('Look / For', Utils.sanitizeHTML(o.lookNumber || '')) +
        row('Deadline', '<span class="text-danger">' + Utils.formatDate(o.deadline) + '</span>') +
      '</div>' +

      // Fabric
      '<div class="card p-3">' +
        '<div class="text-xs font-semibold text-gold mb-2">FABRIC & COLOUR</div>' +
        row('Fabric Type', Utils.sanitizeHTML(o.fabricType || '')) +
        row('Colour Ref', Utils.sanitizeHTML(o.colourRef || '')) +
        row('Dupatta', Utils.sanitizeHTML(o.dupattaDetails || '')) +
        row('Lining', Utils.sanitizeHTML(o.liningDetails || '')) +
      '</div>' +

      // Measurements Top
      '<div class="card p-3">' +
        '<div class="text-xs font-semibold text-gold mb-2">MEASUREMENTS — TOP BODY (inches)</div>' +
        row('Bust', m('mBust')) +
        row('Under Bust', m('mUnderBust')) +
        row('Chest', m('mChest')) +
        row('Shoulder', m('mShoulder')) +
        row('Armhole', m('mArmhole')) +
        row('Blouse Length', m('mBlouseLength')) +
        row('Back Neck', m('mBackNeck')) +
        row('Front Neck', m('mFrontNeck')) +
        row('Sleeve Length', m('mSleeveLength')) +
        row('Morrie', m('mMorrie')) +
        row('Waist', m('mWaist')) +
        row('Wrist', m('mWrist')) +
      '</div>' +

      // Measurements Bottom
      '<div class="card p-3">' +
        '<div class="text-xs font-semibold text-gold mb-2">MEASUREMENTS — BOTTOM BODY (inches)</div>' +
        row('Lehenga Waist', m('mLehengaWaist')) +
        row('Lehenga Length', m('mLehengaLength')) +
        row('Hips', m('mHips')) +
        row('Knee Split', m('mKneeSplit')) +
      '</div>' +

      // Design notes
      '<div class="card p-3">' +
        '<div class="text-xs font-semibold text-gold mb-2">DESIGN INSTRUCTIONS</div>' +
        (o.designNotes ? '<div class="text-xs mb-2"><div class="text-muted text-xs mb-1">Design Notes</div>' + Utils.sanitizeHTML(o.designNotes) + '</div>' : '') +
        (o.embroideryDetails ? '<div class="text-xs mb-2"><div class="text-muted text-xs mb-1">Embroidery</div>' + Utils.sanitizeHTML(o.embroideryDetails) + '</div>' : '') +
        (o.silhouetteNotes ? '<div class="text-xs mb-2"><div class="text-muted text-xs mb-1">Silhouette</div>' + Utils.sanitizeHTML(o.silhouetteNotes) + '</div>' : '') +
        (o.blouseAccessories ? '<div class="text-xs mb-2"><div class="text-muted text-xs mb-1">Blouse Accessories</div>' + Utils.sanitizeHTML(o.blouseAccessories) + '</div>' : '') +
        (o.latkans ? '<div class="text-xs mb-2"><div class="text-muted text-xs mb-1">Latkans</div>' + Utils.sanitizeHTML(o.latkans) + '</div>' : '') +
        (o.optionalAddOns ? '<div class="text-xs mb-2"><div class="text-muted text-xs mb-1">Add-ons</div>' + Utils.sanitizeHTML(o.optionalAddOns) + '</div>' : '') +
        (o.notes ? '<div class="text-xs"><div class="text-muted text-xs mb-1">Internal Notes</div>' + Utils.sanitizeHTML(o.notes) + '</div>' : '') +
        (!o.designNotes && !o.embroideryDetails && !o.silhouetteNotes && !o.notes ? '<div class="text-xs text-muted">No design instructions recorded.</div>' : '') +
      '</div>' +

      '</div>';

    showModal({
      title: (o.orderCode || 'Order') + ' — ' + Utils.sanitizeHTML(o.title),
      content,
      submitText: 'Close',
      onSubmit: () => true
    });
  };

  // ---------- Load Tasks ----------
  function loadTasks() {
    tasksList.innerHTML = '';
    const orders = Store.getAll(Store.COLLECTIONS.ORDERS);

    let filtered = [];
    if (activeFilter === 'pending') {
      filtered = orders.filter(o => o.status === 'Fabric Sourced' || o.status === 'In Production' || o.status === 'Ready');
    } else {
      filtered = orders.filter(o => o.status === 'Shipped to Shashank' || o.status === 'At Shashank' || o.status === 'In Transit' || o.status === 'Delivered');
    }

    taskCounter.textContent = `${filtered.length} Tasks`;
    if (filtered.length === 0) {
      tasksList.innerHTML = `<div class="text-center p-6 text-muted text-xs">No assignments logged in this category.</div>`;
      return;
    }

    filtered.forEach(order => {
      const card = Utils.createElement('div', { className: 'task-card', style: 'cursor:pointer' });

      // Deadline urgency logic
      const DONE_STATUSES = ['Ready','Shipped to Shashank','At Shashank','In Transit',
        'Awaiting Payment','Received in Australia','Final Fitting','Cleared for Delivery','Delivered'];
      const isDone = DONE_STATUSES.includes(order.status);
      const days = order.deadline ? Utils.daysFromNow(order.deadline) : null;
      const isOverdue = !isDone && days !== null && days < 0;
      const isWarning = !isDone && days !== null && days >= 0 && days <= 7;

      if (isOverdue) {
        card.style.border = '2px solid #f59e0b';
        card.style.background = 'rgba(245,158,11,0.06)';
      } else if (isWarning) {
        card.style.border = '1px solid #f59e0b';
      }

      card.addEventListener('click', (e) => { if (!e.target.closest('button')) viewOrderDetail(order.id); });

      let actionButton = '';
      if (activeFilter === 'pending') {
        if (order.status === 'Fabric Sourced') {
          actionButton = `<button class="btn btn-primary btn-sm mt-2" onclick="startWork('${order.id}')">Start Production</button>`;
        } else if (order.status === 'In Production') {
          actionButton = `<button class="btn btn-success btn-sm mt-2" onclick="finishWork('${order.id}')">✓ Finish Production</button>`;
        } else if (order.status === 'Ready') {
          actionButton = `<button class="btn btn-gold btn-sm mt-2" onclick="openShipToShashank('${order.id}')">🚚 Ship to Shashank</button>`;
        }
      } else if (order.status === 'Shipped to Shashank') {
        actionButton = `<span class="badge badge-info text-xs mt-2 p-2">Shipped to Shashank — ${Utils.sanitizeHTML(order.domesticTracking || 'tracking pending')}</span>`;
      }

      card.innerHTML =
        '<div class="d-flex justify-between items-start mb-3">' +
          '<div>' +
            '<span class="badge badge-gold text-xs">' + order.status + '</span>' +
            (order.orderCode ? '<span class="font-mono text-xs text-gold ml-2">' + Utils.sanitizeHTML(order.orderCode) + '</span>' : '') +
            '<div class="font-semibold text-sm mt-1">' + Utils.sanitizeHTML(order.title) + '</div>' +
            '<div class="text-xs text-muted mt-1">Client: ' + Utils.sanitizeHTML(order.clientName) + '</div>' +
          '</div>' +
        '</div>' +
        '<div class="measurement-badge mb-3">' +
          '<div class="text-xs font-semibold text-gold mb-1">Stitching Specs</div>' +
          '<div class="text-xs">' + Utils.sanitizeHTML(order.notes || 'No specific instructions logged.') + '</div>' +
        '</div>' +
        '<div class="d-flex justify-between items-center">' +
          '<span class="text-xs ' + (isOverdue ? 'text-danger' : isWarning ? 'text-warning' : 'text-muted') + ' font-semibold">&#128197; ' + Utils.formatDate(order.deadline) +
            (isOverdue ? ' (' + Math.abs(days) + 'd overdue)' : days !== null ? ' (' + days + 'd left)' : '') +
          '</span>' +
          actionButton +
        '</div>';
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
      await Store.rpc('tailor_update_order_status', { p_order_id: orderId, p_status: 'Ready' });
      await Store.refresh('orders');
      Utils.showToast('Production complete — order marked Ready to ship.');
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

  // ---------- Modal using main app CSS classes ----------
  function showModal({ title, content, submitText = 'Submit', onSubmit }) {
    const exist = document.querySelector('.pc-modal-overlay');
    if (exist) exist.remove();

    const overlay = document.createElement('div');
    overlay.className = 'pc-modal-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.65);display:flex;align-items:center;justify-content:center;padding:16px;';

    overlay.innerHTML =
      '<div class="card p-0 animate-fade-in-scale" style="width:100%;max-width:460px;overflow:hidden;">' +
        '<div class="card-header">' +
          '<div class="card-title">' + Utils.sanitizeHTML(title) + '</div>' +
          '<button id="pc-modal-x" class="btn btn-secondary btn-sm" style="padding:4px 10px;font-size:16px;">&#215;</button>' +
        '</div>' +
        '<div class="p-5">' + content + '</div>' +
        '<div class="d-flex justify-end gap-2 p-4" style="border-top:1px solid var(--pc-border)">' +
          '<button class="btn btn-secondary" id="pc-modal-cancel">Cancel</button>' +
          '<button class="btn btn-primary" id="pc-modal-submit">' + submitText + '</button>' +
        '</div>' +
      '</div>';

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

  // Realtime: re-render when orders change in another portal
  window.addEventListener('pc:datachange', (e) => {
    if (e.detail && e.detail.table === 'orders') {
      Store.refresh('orders').then(() => loadTasks());
    }
  });

  // Tab focus: refresh when user switches back to this tab
  document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState === 'visible') {
      try {
        await Store.refresh('orders');
        loadTasks();
      } catch (e) { /* ignore */ }
    }
  });
});
