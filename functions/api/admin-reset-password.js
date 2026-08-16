// functions/api/admin-reset-password.js
// -----------------------------------------------------------------------
// Admin-only endpoint to reset ANOTHER user's password. Mirrors
// create-user.js's auth pattern exactly: caller identity is verified via
// their own session token, caller must be app_role = 'admin', then the
// service-role key is used to set the target user's password via the
// Supabase Admin API.
//
// This exists so an admin never has to touch the Supabase dashboard
// directly to unblock someone locked out of their account — but the admin
// still types the new password themselves, into a form in the app; this
// endpoint just carries it to Supabase, same as create-user.js already
// does for initial passwords.
//
// Required Cloudflare env vars: SUPABASE_URL, SUPABASE_SERVICE_KEY
//
// POST JSON body: { token, targetEmail, newPassword }
//
// SECURITY AUDIT PASS (this revision): identical fixes to create-user.js
// — server-side re-validation of targetEmail format and newPassword
// length regardless of frontend checks, generic error responses (no
// distinguishing "bad session" from "not admin" from "no such user"),
// and rejection logging via _lib/securityLog.js. See create-user.js's
// header comment for the full rationale — not repeated here.
// -----------------------------------------------------------------------

import { validateResetPassword } from './_lib/validate.js';
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

  function fail(status, logReason, logExtra) {
    logRejectedSubmission(SB, svcHeaders, { endpoint: 'admin-reset-password', reason: logReason, ...(logExtra || {}) });
    const msg = (status === 401 || status === 403) ? 'Not authorized' : 'Unable to reset password';
    return new Response(JSON.stringify({ ok: false, error: msg }), { status, headers: corsHeaders });
  }
  function failValidation(errors, logExtra) {
    logRejectedSubmission(SB, svcHeaders, { endpoint: 'admin-reset-password', errors, ...(logExtra || {}) });
    return new Response(JSON.stringify({ ok: false, error: 'Unable to reset password' }), { status: 400, headers: corsHeaders });
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

  // --- 2. Caller must be admin — only admins can reset someone else's password ---
  const empRes = await fetch(
    SB + '/rest/v1/employees?email=eq.' + encodeURIComponent(callerEmail) + '&select=app_role',
    { headers: svcHeaders }
  );
  const empRows = empRes.ok ? await empRes.json() : [];
  const callerRole = empRows[0] ? empRows[0].app_role : null;
  if (callerRole !== 'admin') return fail(403, 'caller is not admin', { callerEmail });

  // --- 3. Validate the submitted fields server-side, regardless of what
  //        the frontend form already checked. ---
  const validation = validateResetPassword(body);
  if (!validation.success) {
    return failValidation(validation.errors, {
      callerEmail,
      attemptedEmail: typeof body.targetEmail === 'string' ? body.targetEmail : undefined
    });
  }
  const { targetEmail, newPassword } = validation.data;

  // --- 4. Look up the target's auth user ID by email ---
  // (no direct employees->auth.users link column exists, so this looks
  // them up the same way create-user.js's duplicate-check does)
  const listRes = await fetch(
    SB + '/auth/v1/admin/users?email=' + encodeURIComponent(targetEmail),
    { headers: svcHeaders }
  );
  if (!listRes.ok) return fail(500, 'failed to look up target user', { callerEmail, attemptedEmail: targetEmail });
  const listData = await listRes.json();
  const targetUser = (listData.users || []).find(
    u => (u.email || '').toLowerCase() === targetEmail
  );
  if (!targetUser) return fail(400, 'no login found for that email', { callerEmail, attemptedEmail: targetEmail });

  // --- 5. Set the new password via Admin API ---
  const updateRes = await fetch(SB + '/auth/v1/admin/users/' + targetUser.id, {
    method: 'PUT',
    headers: svcHeaders,
    body: JSON.stringify({ password: newPassword })
  });
  const updateData = await updateRes.json();
  if (!updateRes.ok) {
    // Supabase's own error text is logged, never returned to the caller.
    return fail(400, 'Supabase password update failed: ' + (updateData.msg || updateData.error_description || 'unknown'), { callerEmail, attemptedEmail: targetEmail });
  }

  return ok({ email: targetEmail });
}
