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

  const { token, targetEmail, newPassword } = body;

  if (!token) return fail('Missing auth token', 401);
  if (!targetEmail || !newPassword) return fail('targetEmail and newPassword are required');
  if (newPassword.length < 8) return fail('Password must be at least 8 characters');

  // --- 1. Verify caller identity via their Supabase session token ---
  const userRes = await fetch(SB + '/auth/v1/user', {
    headers: { 'Authorization': 'Bearer ' + token, 'apikey': SVC }
  });
  if (!userRes.ok) return fail('Invalid or expired session', 401);
  const callerData = await userRes.json();
  const callerEmail = callerData.email;
  if (!callerEmail) return fail('Could not resolve caller identity', 401);

  // --- 2. Caller must be admin — only admins can reset someone else's password ---
  const empRes = await fetch(
    SB + '/rest/v1/employees?email=eq.' + encodeURIComponent(callerEmail) + '&select=app_role',
    { headers: svcHeaders }
  );
  const empRows = empRes.ok ? await empRes.json() : [];
  const callerRole = empRows[0] ? empRows[0].app_role : null;
  if (callerRole !== 'admin') return fail('Only admins can reset another user\'s password', 403);

  // --- 3. Look up the target's auth user ID by email ---
  // (no direct employees->auth.users link column exists, so this looks
  // them up the same way create-user.js's duplicate-check does)
  const listRes = await fetch(
    SB + '/auth/v1/admin/users?email=' + encodeURIComponent(targetEmail.trim().toLowerCase()),
    { headers: svcHeaders }
  );
  if (!listRes.ok) return fail('Failed to look up target user', 500);
  const listData = await listRes.json();
  const targetUser = (listData.users || []).find(
    u => (u.email || '').toLowerCase() === targetEmail.trim().toLowerCase()
  );
  if (!targetUser) return fail('No login found for that email');

  // --- 4. Set the new password via Admin API ---
  const updateRes = await fetch(SB + '/auth/v1/admin/users/' + targetUser.id, {
    method: 'PUT',
    headers: svcHeaders,
    body: JSON.stringify({ password: newPassword })
  });
  const updateData = await updateRes.json();
  if (!updateRes.ok) {
    return fail(updateData.msg || updateData.error_description || 'Failed to reset password', 400);
  }

  return ok({ email: targetEmail });
}
