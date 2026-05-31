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
    if (typeof supabase === 'undefined') {
      console.error('Supabase library not loaded. Add the CDN <script> to index.html.');
      return null;
    }
    if (typeof SUPABASE_CONFIG === 'undefined' || SUPABASE_CONFIG.anonKey.includes('PASTE_YOUR')) {
      console.error('SUPABASE_CONFIG missing or key not set. Edit config.js.');
      return null;
    }
    sb = supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
    return sb;
  }

  // ---- Collection -> table name map ----
  // Keys kept identical to old app so modules don't change.
  const COLLECTIONS = {
    CLIENTS: 'clients',
    APPOINTMENTS: 'appointments',
    ORDERS: 'orders',
    EMPLOYEES: 'employees',
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
    EMAILS: 'emails'
  };

  // Tables to preload into cache at startup
  const PRELOAD_TABLES = [
    'clients','appointments','orders','employees','attendance','leaves',
    'payroll','invoices','expenses','audit_logs','products','sales',
    'sale_items','shipments','order_tailors','emails'
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

    // Load all tables in parallel
    const results = await Promise.all(
      PRELOAD_TABLES.map(t => c.from(t).select('*'))
    );

    PRELOAD_TABLES.forEach((t, i) => {
      const { data, error } = results[i];
      if (error) {
        console.error(`Error loading ${t}:`, error.message);
        cache[t] = [];
      } else {
        cache[t] = (data || []).map(rowToApp);
      }
    });

    // Settings (single row)
    const { data: sData } = await c.from('settings').select('*').eq('id', 1).single();
    settingsCache = sData ? rowToApp(sData) : null;

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
      companyEmail: 'info@poojascouture.com.au',
      companyPhone: '+61 2 9876 5432',
      companyAddress: 'Studio 4, 12-14 Luxury Ave, Double Bay NSW 2028',
      abn: '45 982 736 104',
      gstRegistered: true,
      currency: 'AUD',
      superRate: 11.5
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
    // Match to an employee profile
    const emp = getAll('employees').find(e => e.email.toLowerCase() === email.trim().toLowerCase());
    if (!emp) {
      console.warn('Authenticated but no matching employee profile for', email);
      return null;
    }
    currentUser = emp;
    sessionStorage.setItem('pc_current_user', JSON.stringify(emp));
    logAction('User Logged In', 'System', `${emp.name} logged in.`);
    return emp;
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
    if (u) logAction('User Logged Out', 'System', `${u.name} logged out.`);
    try { await c.auth.signOut(); } catch (e) {}
    currentUser = null;
    sessionStorage.removeItem('pc_current_user');
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
    setCurrentUser,
    logout
  };
})();
