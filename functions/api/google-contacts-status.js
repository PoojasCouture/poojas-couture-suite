// functions/api/google-contacts-status.js
// Lightweight check: is a Google Contacts connection already stored?
// Returns only the connected account's email, never the token itself --
// this is safe to call from the browser on every Borrowers screen load.
//
// Required Cloudflare env vars: SUPABASE_URL, SUPABASE_SERVICE_KEY

export async function onRequestGet(context) {
  const { env } = context;
  const headers = { 'Content-Type': 'application/json' };

  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_KEY) {
    return new Response(JSON.stringify({ connected: false, error: 'missing_env_vars' }), { status: 500, headers });
  }

  try {
    const res = await fetch(env.SUPABASE_URL + '/rest/v1/google_contacts_tokens?select=account_email&limit=1', {
      headers: {
        'Authorization': 'Bearer ' + env.SUPABASE_SERVICE_KEY,
        'apikey': env.SUPABASE_SERVICE_KEY
      }
    });
    if (!res.ok) {
      return new Response(JSON.stringify({ connected: false, error: 'lookup_failed' }), { status: 502, headers });
    }
    const rows = await res.json();
    if (!rows || rows.length === 0) {
      return new Response(JSON.stringify({ connected: false }), { headers });
    }
    return new Response(JSON.stringify({ connected: true, account: rows[0].account_email }), { headers });
  } catch (e) {
    console.error('google-contacts-status exception', e);
    return new Response(JSON.stringify({ connected: false, error: 'exception' }), { status: 500, headers });
  }
}
