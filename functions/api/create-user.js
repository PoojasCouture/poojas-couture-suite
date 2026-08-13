// functions/api/create-user.js
// -----------------------------------------------------------------------
// Admin-only endpoint to create a new staff login. Uses the Supabase
// service-role key to call the Auth Admin API — this is the ONLY place
// in the codebase permitted to create auth users, mirroring how
// invoicing.js is the only place permitted to write invoices directly.
//
// Required Cloudflare env vars: SUPABASE_URL, SUPABASE_SERVICE_KEY
//
// POST JSON body:
//   {
//     token,            // caller's Supabase auth access_token
//     name, email, password, department,
//     role,             // display role string, e.g. "Social CRM"
//     permissions: { crm, hrm, accounting, admin, socialCrm, tailor, shipping }
//   }
// -----------------------------------------------------------------------

export async function onRequest(context) {
  const { env, request } = context;
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };
  if (request.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ ok: false, error: 'POST only' }), { status: 405, headers: corsHeaders });
  }
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_KEY) {
    return new Response(JSON.stringify({ ok: false, error: 'Missing env vars' }), { status: 500, headers: corsHeaders });
  }

  const SB = env.SUPABASE_URL;
  const SVC = env.SUPABASE_SERVICE_KEY;
  const svcHeaders = {
    'Authorization': 'Bearer ' + SVC,
    'apikey': SVC,
    'Content-Type': 'application/json'
  };

  function fail(error, status = 400) {
    return new Response(JSON.stringify({ ok: false, error }), { status, headers: corsHeaders });
  }
  function ok(data) {
    return new Response(JSON.stringify({ ok: true, ...data }), { status: 200, headers: corsHeaders });
  }

  let body;
  try { body = await request.json(); } catch { return fail('Invalid JSON body'); }

  const { token, name, email, password, department, role } = body;
  const permissions = body.permissions || {};

  if (!token) return fail('Missing auth token', 401);
  if (!name || !email || !password) return fail('name, email, and password are required');
  if (password.length < 8) return fail('Password must be at least 8 characters');

  // --- 1. Verify caller identity via their Supabase session token ---
  const userRes = await fetch(SB + '/auth/v1/user', {
    headers: { 'Authorization': 'Bearer ' + token, 'apikey': SVC }
  });
  if (!userRes.ok) return fail('Invalid or expired session', 401);
  const callerData = await userRes.json();
  const callerEmail = callerData.email;
  if (!callerEmail) return fail('Could not resolve caller identity', 401);

  // --- 2. Caller must be admin — only admins can create logins ---
  const empRes = await fetch(
    SB + '/rest/v1/employees?email=eq.' + encodeURIComponent(callerEmail) + '&select=app_role',
    { headers: svcHeaders }
  );
  const empRows = empRes.ok ? await empRes.json() : [];
  const callerRole = empRows[0] ? empRows[0].app_role : null;
  if (callerRole !== 'admin') return fail('Only admins can create logins', 403);

  // --- 3. Reject duplicate email up front (clearer error than auth API's) ---
  const dupRes = await fetch(
    SB + '/rest/v1/employees?email=eq.' + encodeURIComponent(email.trim().toLowerCase()) + '&select=id',
    { headers: svcHeaders }
  );
  const dupRows = dupRes.ok ? await dupRes.json() : [];
  if (dupRows.length > 0) return fail('An employee with this email already exists');

  // --- 4. Create the auth user (service-role Admin API) ---
  const createRes = await fetch(SB + '/auth/v1/admin/users', {
    method: 'POST',
    headers: svcHeaders,
    body: JSON.stringify({
      email: email.trim().toLowerCase(),
      password,
      email_confirm: true
    })
  });
  const createData = await createRes.json();
  if (!createRes.ok) {
    return fail(createData.msg || createData.error_description || 'Failed to create auth user', 400);
  }

  const fullPermissions = {
    crm: !!permissions.crm,
    hrm: !!permissions.hrm,
    accounting: !!permissions.accounting,
    admin: !!permissions.admin,
    socialCrm: !!permissions.socialCrm,
    tailor: !!permissions.tailor,
    shipping: !!permissions.shipping
  };

  // --- 5. Create the matching employees row (app_role drives RLS) ---
  const empInsertRes = await fetch(SB + '/rest/v1/employees', {
    method: 'POST',
    headers: { ...svcHeaders, 'Prefer': 'return=representation' },
    body: JSON.stringify({
      name,
      email: email.trim().toLowerCase(),
      department: department || 'Operations',
      role: role || 'Staff',
      // Default new "Social CRM Studio" users to the restricted tier
      // (CRM-only, no photos/stock) — matches the 13 Aug role split.
      // Sakshi's broader 'social_crm' access is her own specific,
      // already-granted exception, not the default going forward.
      app_role: permissions.admin ? 'admin' : (permissions.socialCrm ? 'social_crm_limited' : 'operations'),
      permissions: fullPermissions
    })
  });
  const empInsertData = await empInsertRes.json();

  if (!empInsertRes.ok) {
    // Auth user was created but the employees row failed — roll back so we
    // don't leave an orphaned login with no app-side permissions record.
    await fetch(SB + '/auth/v1/admin/users/' + createData.id, {
      method: 'DELETE',
      headers: svcHeaders
    });
    return fail('Created auth login but failed to create employee record (rolled back): ' +
      (empInsertData.message || 'unknown error'), 500);
  }

  return ok({ user: empInsertData[0], authUserId: createData.id });
}
