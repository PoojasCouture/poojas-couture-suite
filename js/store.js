/* ============================================================
   POOJA'S COUTURE — Supabase-backed Store (v3.1)
   ------------------------------------------------------------
   Replaces the localStorage store. Talks to Supabase Postgres.

   DESIGN: A local in-memory CACHE keeps the public read API
   (getAll/getById/query) SYNCHRONOUS, so existing modules
   (crm.js, hrm.js, accounting.js, admin.js, app.js) keep
   working WITHOUT needing 'await' on every read.

   Writes (create/update/delete) go to Supabase AND update the
   cache. They are async and return promises, but callers that
   don't await them still work (cache updates immediately).

   STARTUP: call `await Store.ready()` once in app.js BEFORE
   rendering anything. That loads all tables into the cache
   and runs automated invoice logic normalization updates.
   ============================================================ */

const Store = (() => {
  // ---- Supabase client ----
  let sb = null;

  function client() {
    if (sb) return sb;
    // Reuse a single global client across the whole app + all pages/tabs.
    // This prevents "Multiple GoTrueClient instances" which breaks login
    // (auth happens on one client, session check on another).
    if (window.__pcSupabaseClient) { sb = window.__pcSupabaseClient; return sb; }
    if (typeof supabase === 'undefined') {
      console.error('Supabase library not loaded. Add the CDN <script> to index.html.');
      return null;
    }
    if (typeof SUPABASE_CONFIG === 'undefined' || SUPABASE_CONFIG.anonKey.includes('PASTE_YOUR')) {
      console.error('SUPABASE_CONFIG missing or key not set. Edit config.js.');
      return null;
    }
    sb = supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey, {
      auth: {
        storageKey: 'pc-suite-auth',   // fixed key so all instances share one session
        persistSession: true,
        autoRefreshToken: true
      }
    });
    window.__pcSupabaseClient = sb;     // global singleton guard
    return sb;
  }

  // ---- Collection -> table name map ----
  // Keys kept identical to old app so modules don't change.
  const COLLECTIONS = {
    CLIENTS: 'clients',
    APPOINTMENTS: 'appointments',
    ORDERS: 'orders',
    EMPLOYEES: 'employees',
    VENDORS: 'vendors',
    ATTENDANCE: 'attendance',
    LEAVES: 'leaves',
    PAYROLL: 'payroll',
    INVOICES: 'invoices',
    EXPENSES: 'expenses',
    SETTINGS: 'settings',
    AUDIT_LOGS: 'audit_logs',
    STOCK: 'products',          // old 'stock' now maps to products table
    PRODUCTS: 'products',
    SALES: 'sales',
    SALE_ITEMS: 'sale_items',
    SHIPMENTS: 'shipments',
    ORDER_TAILORS: 'order_tailors',
    EMAILS: 'emails',
    ORDER_PROJECTS: 'order_projects',
    CLIENT_CHANGES: 'client_changes',
    PHOTO_REQUESTS: 'photo_requests',
    JOB_PHOTOS: 'job_photos',
    ORDER_COMMS: 'order_communications'
  };

  // Tables to preload into cache at startup
  const PRELOAD_TABLES = [
    'clients','appointments','orders','employees','attendance','leaves',
    'payroll','invoices','expenses','audit_logs','products','sales',
    'sale_items','shipments','order_tailors','emails','vendors','order_projects',
    'client_changes','photo_requests','job_photos','order_communications'
  ];

  // ---- In-memory cache: { tableName: [rows] } ----
  const cache = {};
  let settingsCache = null;
  let isReady = false;

  // ============================================================
  // FIELD MAPPING: app uses camelCase, Postgres uses snake_case.
  // We translate on read (DB->app) and write (app->DB).
  // ============================================================
  function toCamel(s) { return s.replace(/_([a-z])/g, (_, c) => c.toUpperCase()); }
  function toSnake(s) { return s.replace(/[A-Z]/g, c => '_' + c.toLowerCase()); }

  function rowToApp(row) {
    if (!row || typeof row !== 'object') return row;
    const out = {};
    for (const k in row) out[toCamel(k)] = row[k];
    return out;
  }
  function appToRow(obj) {
    if (!obj || typeof obj !== 'object') return obj;
    const out = {};
    for (const k in obj) {
      // don't send these app-only/auto fields
      if (k === 'createdAt' && obj[k] === undefined) continue;
      out[toSnake(k)] = obj[k];
    }
    return out;
  }

  // ============================================================
  // BACKGROUND MIGRATION ENGINE (Invoice Auto-Correction Logic)
  // ============================================================
  async function normalizeExistingInvoices() {
    const invoices = cache['invoices'] || [];
    if (invoices.length === 0) return;

    console.log(`[Store Migration] Checking ${invoices.length} invoices against current accounting logic...`);
    let updatedInvoicesCount = 0;

    for (const inv of invoices) {
      let modified = false;

      // 1. Structural Validation: Ensure an items array segment exists
      if (!inv.items || !Array.isArray(inv.items) || inv.items.length === 0) {
        const totalAmount = inv.total || 0;
        const fallbackGst = inv.gstTotal != null ? inv.gstTotal : Math.round((totalAmount / 11) * 100) / 100;
        const fallbackSubtotal = Math.round((totalAmount - fallbackGst) * 100) / 100;

        inv.items = [{
          description: "Boutique Apparel / Custom Design Services (Legacy Entry)",
          quantity: 1,
          unitPrice: fallbackSubtotal,
          gst: fallbackGst,
          amount: totalAmount
        }];
        modified = true;
      }

      // 2. Math Validation: Enforce clean 10% Australian GST and subtotal rules
      let computedSubtotal = 0;
      let computedGstTotal = 0;

      inv.items.forEach(item => {
        const qty = item.quantity || 1;
        const price = item.unitPrice || 0;
        computedSubtotal += (qty * price);
        computedGstTotal += (item.gst || 0);
      });

      // Project invoices track shipping as a separate `shipping` field
      // added on top of the item-derived subtotal/GST (not folded into
      // items). This MUST be included here — omitting it silently
      // stripped shipping off invoice.total on every app load, since
      // the recomputed total never matched the stored (correct) one.
      const shippingAmt = (inv.shipping != null && inv.shipping !== '') ? parseFloat(inv.shipping) : 0;
      const computedTotal = Math.round((computedSubtotal + computedGstTotal + shippingAmt) * 100) / 100;

      if (inv.subtotal !== computedSubtotal || inv.gstTotal !== computedGstTotal || inv.total !== computedTotal) {
        inv.subtotal = Math.round(computedSubtotal * 100) / 100;
        inv.gstTotal = Math.round(computedGstTotal * 100) / 100;
        inv.total = computedTotal;
        modified = true;
      }

      // 3. Status Validation: Ensure amountPaid values match Cash-Basis P&L architecture
      if (inv.amountPaid === undefined || inv.amountPaid === null || inv.amountPaid === '') {
        if (inv.status === 'Paid') {
          inv.amountPaid = inv.total;
        } else {
          inv.amountPaid = 0;
        }
        modified = true;
      }

      // 4. Persistence: If changes were detected, push updates quietly to Supabase
      if (modified) {
        updatedInvoicesCount++;
        // Use standard scoped write directly to avoid hitting local logger recursion
        const c = client();
        if (c) {
          const payload = appToRow({
            items: inv.items,
            subtotal: inv.subtotal,
            gstTotal: inv.gstTotal,
            total: inv.total,
            amountPaid: inv.amountPaid
          });
          delete payload.id;
          delete payload.created_at;

          c.from('invoices').update(payload).eq('id', inv.id).then(({ error }) => {
            if (error) console.error(`[Store Migration] Failed to save correction for invoice ${inv.invoiceNumber || inv.id}:`, error.message);
          });
        }
      }
    }

    if (updatedInvoicesCount > 0) {
      console.log(`[Store Migration] Completed structural auto-corrections for ${updatedInvoicesCount} historical invoice rows.`);
    }
  }

  // ============================================================
  // STARTUP: load everything into cache
  // ============================================================
  async function ready() {
    if (isReady) return true;
    // Clear in-memory user so reconcile block always re-fetches from Supabase.
    // This ensures admin permission changes take effect on next page load.
    currentUser = null;
    const c = client();
    if (!c) throw new Error('Supabase client unavailable. Check config.js and the CDN script.');

    // Load all tables independently. A table blocked by RLS (or empty)
    // simply yields an empty array — it must NOT break startup for the
    // tables the user IS allowed to see.
    const results = await Promise.allSettled(
      PRELOAD_TABLES.map(t => c.from(t).select('*'))
    );

    PRELOAD_TABLES.forEach((t, i) => {
      const r = results[i];
      if (r.status === 'fulfilled' && !r.value.error) {
        cache[t] = (r.value.data || []).map(rowToApp);
      } else {
        // Blocked by RLS, network error, or empty — degrade gracefully.
        const msg = r.status === 'rejected' ? r.reason : (r.value && r.value.error && r.value.error.message);
        console.warn(`Table "${t}" not loaded (blocked or empty):`, msg || 'no data');
        cache[t] = [];
      }
    });

    // Run structural normalization queries across invoice objects safely right after loading
    try {
      await normalizeExistingInvoices();
    } catch (err) {
      console.warn('[Store Migration] Invoice background validation bypassed:', err.message);
    }

    // Settings — use array select to avoid .single() 406 errors.
    try {
      const { data: sData } = await c.from('settings').select('*').eq('id', 1).limit(1);
      settingsCache = (sData && sData.length > 0) ? rowToApp(sData[0]) : null;
    } catch (e) {
      console.warn('Settings not loaded (using defaults):', e.message);
      settingsCache = null;
    }

    // Reconcile the logged-in user from the REAL Supabase session.
    // Direct single-row fetch bypasses RLS table-level blocks and always
    // returns fresh permissions — so admin changes take effect on next page load.
    try {
      const { data: authData } = await c.auth.getUser();
      if (authData && authData.user && authData.user.email) {
        const email = authData.user.email.toLowerCase();

        // Fetch this user's own row directly (RLS always allows self-reads)
        let freshRow = null;
        try {
          const { data: empRows } = await c.from('employees')
            .select('*')
            .ilike('email', email)
            .limit(1);
          if (empRows && empRows.length > 0) freshRow = rowToApp(empRows[0]);
        } catch(fetchErr) {}

        // Fall back to cache if direct fetch failed
        if (!freshRow) freshRow = findPersonByEmail(email);

        if (freshRow) {
          currentUser = freshRow;
          localStorage.setItem('pc_current_user', JSON.stringify(freshRow));
          // Keep cache in sync
          const cIdx = (cache['employees'] || []).findIndex(r => r.id === freshRow.id);
          if (cIdx !== -1) cache['employees'][cIdx] = freshRow;
        }
      }
    } catch (e) {
      console.warn('Could not reconcile auth user:', e.message);
    }

    isReady = true;
    return true;
  }

  // ============================================================
  // SYNCHRONOUS READS (from cache) — modules use these unchanged
  // ============================================================
  function getAll(collection) {
    return (cache[collection] || []).slice();
  }
  function getById(collection, id) {
    return (cache[collection] || []).find(r => r.id === id) || null;
  }
  function query(collection, predicate) {
    return (cache[collection] || []).filter(predicate);
  }

  // ============================================================
  // ASYNC WRITES (Supabase + cache update)
  // ============================================================
  async function create(collection, item) {
    const c = client();
    const payload = appToRow(item);
    delete payload.id; // let Postgres generate UUID unless explicitly provided
    if (item.id) payload.id = item.id;

    const { data, error } = await c.from(collection).insert(payload).select().single();
    if (error) {
      console.error(`Create failed on ${collection}:`, error.message);
      if (window.Utils) Utils.showToast(`Save failed: ${error.message}`, 'error');
      return null;
    }
    const appRow = rowToApp(data);
    if (!cache[collection]) cache[collection] = [];
    cache[collection].push(appRow);

    logActionForChange('create', collection, appRow, null);
    return appRow;
  }

  async function update(collection, id, changes) {
    const c = client();
    const old = getById(collection, id);
    const payload = appToRow(changes);
    delete payload.id;
    delete payload.createdAt;
    delete payload.created_at;

    const { data, error } = await c.from(collection).update(payload).eq('id', id).select().single();
    if (error) {
      console.error(`Update failed on ${collection}:`, error.message);
      if (window.Utils) Utils.showToast(`Update failed: ${error.message}`, 'error');
      return null;
    }
    const appRow = rowToApp(data);
    const idx = (cache[collection] || []).findIndex(r => r.id === id);
    if (idx !== -1) cache[collection][idx] = appRow;

    logActionForChange('update', collection, appRow, old);
    return appRow;
  }

  async function remove(collection, id) {
    const c = client();
    const target = getById(collection, id);
    const { error } = await c.from(collection).delete().eq('id', id);
    if (error) {
      console.error(`Delete failed on ${collection}:`, error.message);
      if (window.Utils) Utils.showToast(`Delete failed: ${error.message}`, 'error');
      return false;
    }
    cache[collection] = (cache[collection] || []).filter(r => r.id !== id);

    logActionForChange('delete', collection, target, null);
    return true;
  }

  // ============================================================
  // SETTINGS
  // ============================================================
  function getSettings() {
    return settingsCache || {
      companyName: "Pooja's Couture",
      companyEmail: 'info@poojascouture.com',
      companyPhone: '+61 452 517 866',
      companyAddress: '15 Carolyn Court, Glenwood, NSW 2768, Australia',
      abn: '40 263 050 205',
      gstRegistered: true,
      currency: 'AUD',
      superRate: 11.5,
      invoiceHeading: 'Tax Invoice'
    };
  }

  async function updateSettings(newSettings) {
    const c = client();
    const payload = appToRow(newSettings);
    payload.id = 1;
    const { data, error } = await c.from('settings').upsert(payload).eq('id', 1).select().single();
    if (error) {
      console.error('Settings update failed:', error.message);
      if (window.Utils) Utils.showToast(`Settings save failed: ${error.message}`, 'error');
      return settingsCache;
    }
    settingsCache = rowToApp(data);
    return settingsCache;
  }

  // ============================================================
  // AUDIT LOG
  // ============================================================
  async function logAction(action, category, details, user) {
    const c = client();
    const userName = user || (getCurrentUser() ? getCurrentUser().name : 'System');
    const entry = { user_name: userName, category, action, details };
    const { data, error } = await c.from('audit_logs').insert(entry).select().single();
    if (!error && data) {
      if (!cache.audit_logs) cache.audit_logs = [];
      cache.audit_logs.push(rowToApp(data));
    }
  }

  function logActionForChange(op, collection, item, old) {
    if (collection === 'audit_logs' || collection === 'settings' || !item) return;
    const catMap = {
      clients: 'CRM', appointments: 'CRM', orders: 'CRM', order_tailors: 'CRM',
      employees: 'HRM', attendance: 'HRM', leaves: 'HRM', payroll: 'HRM',
      invoices: 'Accounting', expenses: 'Accounting', sales: 'Accounting',
      products: 'Inventory', shipments: 'Logistics'
    };
    const verb = op === 'create' ? 'Created' : op === 'update' ? 'Updated' : 'Removed';
    const label = item.name || item.title || item.clientName || item.invoiceNumber || item.id;
    logAction(`${verb} record`, catMap[collection] || 'System',
      `${verb} ${collection.replace(/_/g,' ')}: ${label}`);
  }

  // ============================================================
  // AUTH
  // ============================================================
  let currentUser = null;

  function findPersonByEmail(email) {
    const lc = (email || '').trim().toLowerCase();
    const emp = (cache.employees || []).find(e => (e.email || '').toLowerCase() === lc);
    if (emp) return emp;
    const v = (cache.vendors || []).find(x => (x.email || '').toLowerCase() === lc);
    if (v) {
      return {
        id: v.id,
        name: v.contactName || v.businessName || v.email,
        businessName: v.businessName,
        email: v.email,
        phone: v.phone,
        role: v.appRole === 'logistics' ? 'Logistics' : 'Tailor',
        appRole: v.appRole,
        app_role: v.appRole,
        isVendor: true,
        vendorType: v.vendorType,
        permissions: v.permissions || { crm:false, hrm:false, accounting:false, admin:false, socialCrm:false }
      };
    }
    return null;
  }

  // Shared login-error message text — single source of truth so any
  // portal that has (or later grows) its own login form shows the exact
  // same wording instead of each one maintaining its own copy.
  const LOGIN_ERROR_MESSAGES = {
    invalid_credentials: 'Incorrect email or password.',
    no_profile: 'This login exists but has no staff profile set up. Contact your admin.',
    auth_error: 'Could not sign in. Please try again.'
  };

  async function login(email, password) {
    const c = client();
    const { data, error } = await c.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password: password
    });
    if (error || !data.user) {
      console.warn('Auth login failed:', error ? error.message : 'no user');
      // Distinguish wrong-credentials from other auth failures (rate
      // limit, unconfirmed email, network) so the login screen can show
      // something more useful than a single generic message for every
      // possible cause.
      const code = error && (error.message || '').toLowerCase().includes('invalid login credentials')
        ? 'invalid_credentials'
        : 'auth_error';
      return { person: null, error: code, rawMessage: error ? error.message : null };
    }
    try {
      await refresh('employees');
      await refresh('vendors');
    } catch (e) {}
    const person = findPersonByEmail(email);
    if (!person) {
      console.warn('Authenticated but no matching profile (employee/vendor) for', email);
      // Real, distinct case from wrong password: the LOGIN succeeded
      // (credentials are correct) but there's no employees/vendors row
      // for this email, so the app has nothing to attach the session to.
      // Telling the user "invalid password" here would be actively
      // wrong and send them down the wrong troubleshooting path.
      return { person: null, error: 'no_profile', rawMessage: null };
    }
    currentUser = person;
    localStorage.setItem('pc_current_user', JSON.stringify(person));
    logAction('User Logged In', 'System', `${person.name} logged in.`);
    return { person, error: null, rawMessage: null };
  }

  function getCurrentUser() {
    if (currentUser) return currentUser;
    try {
      const raw = localStorage.getItem('pc_current_user');
      currentUser = raw ? JSON.parse(raw) : null;
    } catch (e) { currentUser = null; }
    return currentUser;
  }

  function setCurrentUser(user) {
    currentUser = user;
    localStorage.setItem('pc_current_user', JSON.stringify(user));
  }

  async function logout() {
    const c = client();
    const u = getCurrentUser();
    if (u) { try { await logAction('User Logged Out', 'System', `${u.name} logged out.`); } catch (e) {} }
    currentUser = null;
    localStorage.removeItem('pc_current_user');
    // Also clear the last-visited-route marker — it isn't scoped per
    // user, so leaving it behind lets the NEXT person who logs in on
    // this browser/device inherit a route they may have no access to.
    localStorage.removeItem('pc_last_route');
    try {
      await c.auth.signOut({ scope: 'local' });
    } catch (e) {}
    try {
      Object.keys(localStorage)
        .filter(k => k.startsWith('sb-') || k === 'pc-suite-auth')
        .forEach(k => localStorage.removeItem(k));
    } catch (e) {}
  }

  async function rpc(fnName, params) {
    const c = client();
    if (!c) throw new Error('Supabase client unavailable');
    const { data, error } = await c.rpc(fnName, params);
    if (error) throw new Error(error.message);
    return data;
  }

  async function refresh(collection) {
    const c = client();
    if (!c) return;
    try {
      const { data, error } = await c.from(collection).select('*');
      if (!error) cache[collection] = (data || []).map(rowToApp);
    } catch (e) {}
  }

  // ============================================================
  // REALTIME
  // ============================================================
  let realtimeChannel = null;

  function subscribeRealtime() {
    const c = client();
    if (!c || realtimeChannel) return;

    const REALTIME_TABLES = [
      'orders', 'invoices', 'order_projects', 'clients',
      'appointments', 'attendance', 'leaves'
    ];

    realtimeChannel = c.channel('pc-realtime-all');

    REALTIME_TABLES.forEach(table => {
      realtimeChannel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table },
        async (payload) => {
          try {
            const { data, error } = await c.from(table).select('*');
            if (!error) cache[table] = (data || []).map(rowToApp);
          } catch (e) {}
          window.dispatchEvent(new CustomEvent('pc:datachange', {
            detail: { table, event: payload.eventType }
          }));
        }
      );
    });

    realtimeChannel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('[Store] Realtime subscribed.');
      }
    });
  }

  function unsubscribeRealtime() {
    const c = client();
    if (c && realtimeChannel) {
      c.removeChannel(realtimeChannel);
      realtimeChannel = null;
    }
  }

  async function reconcileUser() {
    const c = client();
    if (!c) return null;
    try {
      const { data: authData } = await c.auth.getUser();
      if (authData && authData.user && authData.user.email) {
        const email = authData.user.email.toLowerCase();
        const person = findPersonByEmail(email);
        if (person) {
          currentUser = person;
          localStorage.setItem('pc_current_user', JSON.stringify(person));
          return person;
        }
      }
    } catch (e) {
      console.warn('reconcileUser failed:', e.message);
    }
    return null;
  }

  // Expose Supabase client for direct use (e.g. admin permission saves)
  function getClient() {
    return client();
  }

  // Update a single record in the local cache without a Supabase round-trip
  function updateCache(collection, id, changes) {
    const idx = (cache[collection] || []).findIndex(r => r.id === id);
    if (idx !== -1) {
      cache[collection][idx] = { ...cache[collection][idx], ...changes };
    }
  }

  return {
    COLLECTIONS,
    LOGIN_ERROR_MESSAGES,
    ready,
    getAll,
    getById,
    create,
    update,
    delete: remove,
    query,
    getSettings,
    updateSettings,
    logAction,
    login,
    getCurrentUser,
    reconcileUser,
    rpc,
    refresh,
    subscribeRealtime,
    unsubscribeRealtime,
    setCurrentUser,
    logout,
    getClient,
    updateCache
  };
})();