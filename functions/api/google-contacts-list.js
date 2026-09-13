// functions/api/google-contacts-list.js
// Returns Pooja's Google Contacts (name/phone/email only) so the app
// can offer them as a pick-list when adding a Borrower. The stored
// refresh_token never leaves this function -- it's exchanged for a
// short-lived access_token here, used once against Google's People
// API, then discarded. The browser only ever receives the final list.
//
// Required Cloudflare env vars: SUPABASE_URL, SUPABASE_SERVICE_KEY,
// GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET

export async function onRequestGet(context) {
  const { env } = context;
  const headers = { 'Content-Type': 'application/json' };

  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_KEY || !env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    return new Response(JSON.stringify({ error: 'missing_env_vars' }), { status: 500, headers });
  }

  try {
    const tokenRowRes = await fetch(env.SUPABASE_URL + '/rest/v1/google_contacts_tokens?select=refresh_token&limit=1', {
      headers: {
        'Authorization': 'Bearer ' + env.SUPABASE_SERVICE_KEY,
        'apikey': env.SUPABASE_SERVICE_KEY
      }
    });
    const rows = tokenRowRes.ok ? await tokenRowRes.json() : [];
    if (!rows || rows.length === 0) {
      return new Response(JSON.stringify({ error: 'not_connected' }), { status: 401, headers });
    }
    const refreshToken = rows[0].refresh_token;

    const refreshRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: env.GOOGLE_CLIENT_ID,
        client_secret: env.GOOGLE_CLIENT_SECRET,
        refresh_token: refreshToken,
        grant_type: 'refresh_token'
      })
    });
    const refreshData = await refreshRes.json();
    if (!refreshRes.ok || !refreshData.access_token) {
      console.error('Failed to refresh Google access token', refreshData);
      // A revoked/expired refresh_token surfaces here (e.g. Pooja
      // removed the app's access from her Google Account settings).
      // Distinct error code so the UI can prompt to reconnect rather
      // than showing a generic failure.
      return new Response(JSON.stringify({ error: 'reauth_required', detail: refreshData.error }), { status: 401, headers });
    }

    let allContacts = [];
    let pageToken = '';
    // Google paginates at up to 1000/page; capped at 10 pages (10,000
    // contacts) so a huge address book can't hang this function.
    for (let i = 0; i < 10; i++) {
      const peopleUrl = new URL('https://people.googleapis.com/v1/people/me/connections');
      peopleUrl.searchParams.set('personFields', 'names,phoneNumbers,emailAddresses');
      peopleUrl.searchParams.set('pageSize', '1000');
      if (pageToken) peopleUrl.searchParams.set('pageToken', pageToken);

      const peopleRes = await fetch(peopleUrl.toString(), {
        headers: { Authorization: 'Bearer ' + refreshData.access_token }
      });
      const peopleData = await peopleRes.json();
      if (!peopleRes.ok) {
        console.error('Google People API error', peopleData);
        return new Response(JSON.stringify({ error: 'people_api_failed', detail: peopleData.error }), { status: 502, headers });
      }

      for (const c of (peopleData.connections || [])) {
        const name = c.names && c.names[0] ? c.names[0].displayName : null;
        if (!name) continue; // a contact with no name isn't useful as a borrower pick
        const phone = c.phoneNumbers && c.phoneNumbers[0] ? c.phoneNumbers[0].value : null;
        const email = c.emailAddresses && c.emailAddresses[0] ? c.emailAddresses[0].value : null;
        allContacts.push({ name, phone, email });
      }

      if (peopleData.nextPageToken) { pageToken = peopleData.nextPageToken; } else { break; }
    }

    allContacts.sort((a, b) => a.name.localeCompare(b.name));

    return new Response(JSON.stringify({ contacts: allContacts }), { headers });
  } catch (e) {
    console.error('google-contacts-list exception', e);
    return new Response(JSON.stringify({ error: 'exception', detail: e.message }), { status: 500, headers });
  }
}
