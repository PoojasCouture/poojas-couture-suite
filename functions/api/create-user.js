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
//
// SECURITY AUDIT PASS (this revision):
//   - Every field the frontend already validates (email format, password
//     length, name required) is now re-validated here too, server-side.
//     The frontend's <input required>/type="email"/minlength="8"> are UX
//     conveniences only — this endpoint never trusted them and still
//     doesn't; it now actually enforces its own copy of the same rules.
//   - name/department/role: HTML/script-like content is REJECTED, not
//     stripped-and-accepted. See _lib/validate.js for why.
//   - Every error response is now generic ("Unable to create login" /
//     "Not authorized") regardless of which specific check failed —
//     invalid session, wrong role, duplicate email, bad input, or a
//     failure inside Supabase's own Auth API all look identical to the
//     caller. The real reason is only ever visible in the audit log.
//   - Every rejection (validation failure OR auth/authz failure OR
//     upstream Supabase failure) is now logged to `audit_logs` with
//     category "Security - Rejected Submission" via _lib/securityLog.js.
// -----------------------------------------------------------------------

import { validateCreateUser } from './_lib/validate.js';
import { logRejectedSubmission } from './_lib/securityLog.js';

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
    return new Response(JSON.stringify({ ok: false, error: 'Server misconfiguration' }), { status: 500, headers: corsHeaders });
  }

  const SB = env.SUPABASE_URL;
  const SVC = env.SUPABASE_SERVICE_KEY;
  const svcHeaders = {
    'Authorization': 'Bearer ' + SVC,
    'apikey': SVC,
    'Content-Type': 'application/json'
  };

  // Generic responses only. Status codes still differ (401 vs 403 vs 400
  // vs 500) since the browser/network layer already reveals that much,
  // but the MESSAGE never varies by specific cause.
  function fail(status, logReason, logExtra) {
    logRejectedSubmission(SB, svcHeaders, { endpoint: 'create-user', reason: logReason, ...(logExtra || {}) });
    const msg = (status === 401 || status === 403) ? 'Not authorized' : 'Unable to create login';
    return new Response(JSON.stringify({ ok: false, error: msg }), { status, headers: corsHeaders });
  }
  function failValidation(errors, logExtra) {
    logRejectedSubmission(SB, svcHeaders, { endpoint: 'create-user', errors, ...(logExtra || {}) });
    return new Response(JSON.stringify({ ok: false, error: 'Unable to create login' }), { status: 400, headers: corsHeaders });
  }
  function ok(data) {
    return new Response(JSON.stringify({ ok: true, ...data }), { status: 200, headers: corsHeaders });
  }

  let body;
  try { body = await request.json(); } catch { return fail(400, 'invalid JSON body'); }

  const token = body && body.token;
  if (!token) return fail(401, 'missing auth token');

  // --- 1. Verify caller identity via their Supabase session token ---
  const userRes = await fetch(SB + '/auth/v1/user', {
    headers: { 'Authorization': 'Bearer ' + token, 'apikey': SVC }
  });
  if (!userRes.ok) return fail(401, 'invalid or expired session');
  const callerData = await userRes.json();
  const callerEmail = callerData.email;
  if (!callerEmail) return fail(401, 'could not resolve caller identity');

  // --- 2. Caller must be admin — only admins can create logins ---
  const empRes = await fetch(
    SB + '/rest/v1/employees?email=eq.' + encodeURIComponent(callerEmail) + '&select=app_role',
    { headers: svcHeaders }
  );
  const empRows = empRes.ok ? await empRes.json() : [];
  const callerRole = empRows[0] ? empRows[0].app_role : null;
  if (callerRole !== 'admin') return fail(403, 'caller is not admin', { callerEmail });

  // --- 3. Validate the submitted fields server-side, regardless of what
  //        the frontend form already checked. ---
  const validation = validateCreateUser(body);
  if (!validation.success) {
    return failValidation(validation.errors, {
      callerEmail,
      attemptedEmail: typeof body.email === 'string' ? body.email : undefined
    });
  }
  const { name, email, password, department, role } = validation.data;
  const permissions = (body && body.permissions) || {};

  // --- 4. Reject duplicate email up front. Message to the caller stays
  //        generic (see fail()) — only the log reveals it was a dup,
  //        so this endpoint can no longer be used to enumerate emails
  //        even by someone holding a valid admin token. ---
  const dupRes = await fetch(
    SB + '/rest/v1/employees?email=eq.' + encodeURIComponent(email) + '&select=id',
    { headers: svcHeaders }
  );
  const dupRows = dupRes.ok ? await dupRes.json() : [];
  if (dupRows.length > 0) return fail(400, 'duplicate email', { callerEmail, attemptedEmail: email });

  // --- 5. Create the auth user (service-role Admin API) ---
  const createRes = await fetch(SB + '/auth/v1/admin/users', {
    method: 'POST',
    headers: svcHeaders,
    body: JSON.stringify({
      email,
      password,
      email_confirm: true
    })
  });
  const createData = await createRes.json();
  if (!createRes.ok) {
    // Supabase's own error text (createData.msg / error_description) is
    // logged, never returned to the caller.
    return fail(400, 'Supabase auth create failed: ' + (createData.msg || createData.error_description || 'unknown'), { callerEmail, attemptedEmail: email });
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

  // --- 6. Create the matching employees row (app_role drives RLS) ---
  const empInsertRes = await fetch(SB + '/rest/v1/employees', {
    method: 'POST',
    headers: { ...svcHeaders, 'Prefer': 'return=representation' },
    body: JSON.stringify({
      name,
      email,
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
    return fail(500, 'employee row insert failed after auth create (rolled back): ' + (empInsertData.message || 'unknown'), { callerEmail, attemptedEmail: email });
  }

  return ok({ user: empInsertData[0], authUserId: createData.id });
}
