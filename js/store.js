/* ============================================================
   POOJA'S COUTURE — Supabase-backed Store (v3)
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
   rendering anything. That loads all tables into the cache.
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
    ORDER_PROJECTS: 'order_projects'
  };

  // Tables to preload into cache at startup
  const PRELOAD_TABLES = [
    'clients','appointments','orders','employees','attendance','leaves',
    'payroll','invoices','expenses','audit_logs','products','sales',
    'sale_items','shipments','order_tailors','emails','vendors','order_projects'
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
  // STARTUP: load everything into cache
  // ============================================================
  async function ready() {
    if (isReady) return true;
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

    // Settings (single row) — wrapped so a block here can't break startup.
    try {
      const { data: sData } = await c.from('settings').select('*').eq('id', 1).single();
      settingsCache = sData ? rowToApp(sData) : null;
    } catch (e) {
      console.warn('Settings not loaded (using defaults):', e.message);
      settingsCache = null;
    }

    // Reconcile the logged-in user from the REAL Supabase session.
    // This works across tabs/pages (Supabase stores its session in
    // localStorage), unlike the per-tab sessionStorage copy.
    try {
      const { data: authData } = await c.auth.getUser();
      if (authData && authData.user && authData.user.email) {
        const email = authData.user.email.toLowerCase();
        const person = findPersonByEmail(email);
        if (person) {
          currentUser = person;
          sessionStorage.setItem('pc_current_user', JSON.stringify(person));
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

  // Lightweight auto-logging for CRUD (best-effort, fire-and-forget)
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
  // AUTH (Supabase Auth — replaces hardcoded login)
  // Note: full auth wiring is a later step. For now this looks
  // up an employee profile by email for session continuity.
  // ============================================================
  let currentUser = null;

  // Find the logged-in person in EITHER employees or vendors.
  // Vendors are normalised to the same shape the app expects (name, role,
  // appRole, permissions) so portals and sidebar logic work unchanged.
  function findPersonByEmail(email) {
    const lc = (email || '').trim().toLowerCase();
    const emp = (cache.employees || []).find(e => (e.email || '').toLowerCase() === lc);
    if (emp) return emp;
    const v = (cache.vendors || []).find(x => (x.email || '').toLowerCase() === lc);
    if (v) {
      // Normalise vendor -> user-like object
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
        permissions: v.permissions || { crm:false, hrm:false, accounting:false, admin:false }
      };
    }
    return null;
  }

  async function login(email, password) {
    const c = client();
    // Supabase Auth sign-in
    const { data, error } = await c.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password: password
    });
    if (error || !data.user) {
      console.warn('Auth login failed:', error ? error.message : 'no user');
      return null;
    }
    // The identity tables (employees, vendors) were cached while logged OUT,
    // when RLS returns nothing — so the cache can be empty for vendors.
    // Now that we are authenticated, refresh them before resolving the person,
    // otherwise vendor logins (tailor/logistics) fail to find their profile.
    try {
      await refresh('employees');
      await refresh('vendors');
    } catch (e) { /* ignore — fall through to lookup */ }
    // Match to an employee OR vendor profile
    const person = findPersonByEmail(email);
    if (!person) {
      console.warn('Authenticated but no matching profile (employee/vendor) for', email);
      return null;
    }
    currentUser = person;
    sessionStorage.setItem('pc_current_user', JSON.stringify(person));
    logAction('User Logged In', 'System', `${person.name} logged in.`);
    return person;
  }

  function getCurrentUser() {
    if (currentUser) return currentUser;
    try {
      const raw = sessionStorage.getItem('pc_current_user');
      currentUser = raw ? JSON.parse(raw) : null;
    } catch (e) { currentUser = null; }
    return currentUser;
  }

  function setCurrentUser(user) {
    currentUser = user;
    sessionStorage.setItem('pc_current_user', JSON.stringify(user));
  }

  async function logout() {
    const c = client();
    const u = getCurrentUser();
    // Log BEFORE signing out (logAction needs the session to write the row).
    if (u) { try { await logAction('User Logged Out', 'System', `${u.name} logged out.`); } catch (e) {} }
    // Clear local state first so nothing re-reads it mid-logout.
    currentUser = null;
    sessionStorage.removeItem('pc_current_user');
    // Actually kill the Supabase session and WAIT for it. This is the part
    // that must finish before any reload, or reconcileUser() will find the
    // still-present session in localStorage and log the user straight back in.
    try {
      await c.auth.signOut({ scope: 'local' });
    } catch (e) { /* ignore */ }
    // Belt-and-braces: clear any leftover Supabase auth token from localStorage.
    try {
      Object.keys(localStorage)
        .filter(k => k.startsWith('sb-') || k === 'pc-suite-auth')
        .forEach(k => localStorage.removeItem(k));
    } catch (e) { /* ignore */ }
  }

  // Call a Postgres function (RPC). Used for locked-down updates where
  // direct table writes are blocked by RLS (e.g. tailor/logistics status).
  async function rpc(fnName, params) {
    const c = client();
    if (!c) throw new Error('Supabase client unavailable');
    const { data, error } = await c.rpc(fnName, params);
    if (error) throw new Error(error.message);
    return data;
  }

  // Refresh a single table's cache from the server (after an RPC write).
  async function refresh(collection) {
    const c = client();
    if (!c) return;
    try {
      const { data, error } = await c.from(collection).select('*');
      if (!error) cache[collection] = (data || []).map(rowToApp);
    } catch (e) { /* ignore */ }
  }

  // ============================================================
  // REALTIME: subscribe to live changes on critical tables.
  // Fires a custom 'pc:datachange' event on window when any
  // row changes so modules can re-render without a full refresh.
  // Call once after Store.ready().
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
          } catch (e) { /* ignore */ }
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

  // Reconcile current user from the live Supabase session (works any time).
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
          sessionStorage.setItem('pc_current_user', JSON.stringify(person));
          return person;
        }
      }
    } catch (e) {
      console.warn('reconcileUser failed:', e.message);
    }
    return null;
  }

  // ============================================================
  // PUBLIC API — identical names to old store + new additions
  // ============================================================
  return {
    COLLECTIONS,
    ready,            // NEW: await this once at startup
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
    logout
  };
})();
