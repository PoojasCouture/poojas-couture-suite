// functions/api/delete-photo.js
// Deletes a job photo: removes the file from Supabase storage AND the
// job_photos row. Called from the CRM when Pooja removes an incorrect photo.
//
// POST JSON body: { photoId: "<uuid>", token: "<supabase session access_token>" }
// Required Cloudflare env vars: SUPABASE_URL, SUPABASE_SERVICE_KEY

export async function onRequest(context) {
  const { env, request } = context;

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ ok: false, error: 'POST only' }), { status: 405, headers: corsHeaders });
  }
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_KEY) {
    return new Response(JSON.stringify({ ok: false, error: 'Missing env vars' }), { status: 500, headers: corsHeaders });
  }

  try {
    const body = await request.json();
    const photoId = body.photoId;
    const token = body.token;
    if (!photoId) {
      return new Response(JSON.stringify({ ok: false, error: 'photoId is required' }), { status: 400, headers: corsHeaders });
    }
    if (!token) {
      return new Response(JSON.stringify({ ok: false, error: 'Missing auth token' }), { status: 401, headers: corsHeaders });
    }

    const sbHeaders = {
      'Authorization': 'Bearer ' + env.SUPABASE_SERVICE_KEY,
      'apikey': env.SUPABASE_SERVICE_KEY,
      'Content-Type': 'application/json'
    };

    // Verify the caller is actually a logged-in staff/vendor member with an
    // appropriate role, matching the same allow-list already enforced by
    // the job_photos table's RLS policy (jp_rw). Previously this endpoint
    // had no identity check at all -- anyone who found the URL could
    // permanently delete any client's photos with zero login.
    const userRes = await fetch(env.SUPABASE_URL + '/auth/v1/user', {
      headers: { 'Authorization': 'Bearer ' + token, 'apikey': env.SUPABASE_SERVICE_KEY }
    });
    if (!userRes.ok) {
      return new Response(JSON.stringify({ ok: false, error: 'Invalid or expired session' }), { status: 401, headers: corsHeaders });
    }
    const userData = await userRes.json();
    const callerEmail = userData.email;
    if (!callerEmail) {
      return new Response(JSON.stringify({ ok: false, error: 'Could not resolve caller identity' }), { status: 401, headers: corsHeaders });
    }
    const allowedRoles = ['admin', 'operations', 'social_crm', 'tailor', 'logistics'];
    const empRes = await fetch(env.SUPABASE_URL + '/rest/v1/employees?email=eq.' + encodeURIComponent(callerEmail) + '&select=app_role', { headers: sbHeaders });
    const empRows = empRes.ok ? await empRes.json() : [];
    let role = empRows[0] ? empRows[0].app_role : null;
    if (!role) {
      const vendRes = await fetch(env.SUPABASE_URL + '/rest/v1/vendors?email=eq.' + encodeURIComponent(callerEmail) + '&select=app_role', { headers: sbHeaders });
      const vendRows = vendRes.ok ? await vendRes.json() : [];
      role = vendRows[0] ? vendRows[0].app_role : null;
    }
    if (!allowedRoles.includes(role)) {
      return new Response(JSON.stringify({ ok: false, error: 'Not authorized to delete photos' }), { status: 403, headers: corsHeaders });
    }

    // Storage API (unlike PostgREST) strictly parses the request body when
    // Content-Type: application/json is present — and rejects an empty body
    // with a 400. The storage DELETE call below sends no body at all, so it
    // must NOT carry that header.
    const sbHeadersNoBody = {
      'Authorization': 'Bearer ' + env.SUPABASE_SERVICE_KEY,
      'apikey': env.SUPABASE_SERVICE_KEY
    };

    // 1. Look up the row to get its storage_path
    const getRes = await fetch(
      env.SUPABASE_URL + '/rest/v1/job_photos?id=eq.' + encodeURIComponent(photoId) + '&select=storage_path',
      { headers: sbHeaders }
    );
    if (!getRes.ok) {
      const t = await getRes.text();
      return new Response(JSON.stringify({ ok: false, error: 'Lookup failed ' + getRes.status, detail: t.slice(0, 300) }), { status: 502, headers: corsHeaders });
    }
    const rows = await getRes.json();
    if (rows.length === 0) {
      return new Response(JSON.stringify({ ok: false, error: 'Photo not found' }), { status: 404, headers: corsHeaders });
    }
    const storagePath = rows[0].storage_path;

    // 2. Delete the file from storage
    if (storagePath) {
      const delFileRes = await fetch(
        env.SUPABASE_URL + '/storage/v1/object/job-photos/' + storagePath,
        { method: 'DELETE', headers: sbHeadersNoBody }
      );
      // Don't hard-fail if the file is already gone (404) - still clean up the DB row
      if (!delFileRes.ok && delFileRes.status !== 404) {
        const t = await delFileRes.text();
        return new Response(JSON.stringify({ ok: false, error: 'Storage delete failed ' + delFileRes.status, detail: t.slice(0, 300) }), { status: 502, headers: corsHeaders });
      }
    }

    // 3. Delete the database row
    const delRowRes = await fetch(
      env.SUPABASE_URL + '/rest/v1/job_photos?id=eq.' + encodeURIComponent(photoId),
      { method: 'DELETE', headers: Object.assign({}, sbHeaders, { 'Prefer': 'return=minimal' }) }
    );
    if (!delRowRes.ok) {
      const t = await delRowRes.text();
      return new Response(JSON.stringify({ ok: false, error: 'DB delete failed ' + delRowRes.status, detail: t.slice(0, 300) }), { status: 502, headers: corsHeaders });
    }

    return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: String(err && err.message ? err.message : err) }), { status: 500, headers: corsHeaders });
  }
}
