// functions/api/rehash-password.js
// -----------------------------------------------------------------------
// Called by the client immediately after a successful login. If the
// caller's employees row has needs_password_rehash = true, this re-sets
// their Supabase Auth password to the SAME value they just logged in
// with — which forces GoTrue to rehash it at the project's CURRENT
// bcrypt cost, without the user ever choosing a new password or being
// interrupted.
//
// SELF-ONLY BY DESIGN: this endpoint can only ever rehash the password of
// the account that is CALLING it. The target user id is taken from the
// caller's own verified session (/auth/v1/user), never from the request
// body. There is deliberately no way to pass a different user's email
// here — that's what admin-reset-password.js is for, and it requires
// admin role. This endpoint requires nothing beyond "you just logged in
// successfully," which is exactly the trust level it needs.
//
// WHY THIS EXISTS / WHAT IT DOES NOT FIX:
// Audit (see accompanying migration: add_password_rehash_tracking) found
// bcrypt cost factors of 6 and 10 across current logins — Supabase Auth's
// own encrypted_password column, never something this app hashed itself.
// Rehashing via the Admin API produces a hash at whatever cost the
// project's GoTrue config is set to AT CALL TIME. This endpoint cannot
// change that project-level setting — no Supabase MCP/SQL surface
// exposes it. Until that's confirmed raised to 12+ via the Supabase
// Dashboard (or Management API), this will normalize every account to
// the CURRENT cost, which may still be below 12. Not silently claiming
// otherwise.
//
// Required Cloudflare env vars: SUPABASE_URL, SUPABASE_SERVICE_KEY
//
// POST JSON body: { token, password }
//   token    — the caller's own Supabase session access_token (from the
//              signInWithPassword() call that just succeeded)
//   password — the plaintext password they just typed to log in. Used
//              exactly once, sent once, over the same TLS connection the
//              browser already used to authenticate. Never logged,
//              never stored, never echoed in any response or error.
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
    return new Response(JSON.stringify({ ok: false, error: 'Server misconfiguration' }), { status: 500, headers: corsHeaders });
  }

  const SB = env.SUPABASE_URL;
  const SVC = env.SUPABASE_SERVICE_KEY;
  const svcHeaders = {
    'Authorization': 'Bearer ' + SVC,
    'apikey': SVC,
    'Content-Type': 'application/json'
  };

  // This endpoint runs silently after every login. Failures here must
  // never surface as a user-facing error — the login itself already
  // succeeded. The frontend treats any non-200 as a no-op (see store.js).
  // Error messages stay generic regardless, on general principle, but the
  // frontend isn't expected to display them either way.
  function fail(status, msg) {
    return new Response(JSON.stringify({ ok: false, error: msg }), { status, headers: corsHeaders });
  }
  function ok(data) {
    return new Response(JSON.stringify({ ok: true, ...(data || {}) }), { status: 200, headers: corsHeaders });
  }

  let body;
  try { body = await request.json(); } catch { return fail(400, 'Invalid request'); }

  const token = body && body.token;
  const password = body && body.password;
  if (!token || typeof password !== 'string' || !password) {
    return fail(400, 'Invalid request');
  }

  // --- 1. Verify the caller's own session (this IS the target — no
  //        separate "which user" input exists in this endpoint). ---
  const userRes = await fetch(SB + '/auth/v1/user', {
    headers: { 'Authorization': 'Bearer ' + token, 'apikey': SVC }
  });
  if (!userRes.ok) return fail(401, 'Not authorized');
  const authData = await userRes.json();
  const callerId = authData.id;
  const callerEmail = (authData.email || '').toLowerCase();
  if (!callerId || !callerEmail) return fail(401, 'Not authorized');

  // --- 2. Check whether this account is flagged for rehash. If not,
  //        this is a normal no-op on every other login. ---
  const empRes = await fetch(
    SB + '/rest/v1/employees?email=eq.' + encodeURIComponent(callerEmail) + '&select=needs_password_rehash',
    { headers: svcHeaders }
  );
  const empRows = empRes.ok ? await empRes.json() : [];
  if (!empRows[0] || !empRows[0].needs_password_rehash) {
    return ok({ rehashed: false });
  }

  // --- 3. Re-set the password to the same value, forcing GoTrue to
  //        rehash it at the project's current bcrypt cost. ---
  const updateRes = await fetch(SB + '/auth/v1/admin/users/' + callerId, {
    method: 'PUT',
    headers: svcHeaders,
    body: JSON.stringify({ password })
  });
  if (!updateRes.ok) {
    // Deliberately not logging updateData here — it's Supabase's own
    // response to a request that included the plaintext password field
    // name; safe to inspect in Cloudflare's live logs if needed, but not
    // worth risking here. Just fail generically; will retry next login.
    return fail(500, 'Rehash failed');
  }

  // --- 4. Clear the flag so this doesn't run again for this user. ---
  await fetch(
    SB + '/rest/v1/employees?email=eq.' + encodeURIComponent(callerEmail),
    {
      method: 'PATCH',
      headers: svcHeaders,
      body: JSON.stringify({ needs_password_rehash: false })
    }
  );

  return ok({ rehashed: true });
}
