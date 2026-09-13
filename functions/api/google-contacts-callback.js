// functions/api/google-contacts-callback.js
// Google OAuth redirect target. Google sends the browser here with a
// one-time `code` after Pooja grants consent. Exchanges that code
// server-side for a refresh_token (never exposed to the browser) and
// stores it in Supabase, then redirects back into the app.
//
// This exact URL must match, character for character, the Authorized
// redirect URI configured in Google Cloud Console for this OAuth client.
//
// Required Cloudflare env vars: SUPABASE_URL, SUPABASE_SERVICE_KEY,
// GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET

const REDIRECT_URI = 'https://poojas-couture-suite.pages.dev/api/google-contacts-callback';
const APP_URL = 'https://poojas-couture-suite.pages.dev/';

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const oauthError = url.searchParams.get('error');

  const backTo = (params) => Response.redirect(APP_URL + '?' + new URLSearchParams(params).toString(), 302);

  if (oauthError) {
    // Most commonly the user clicked "Cancel" on Google's consent screen.
    return backTo({ google_contacts: 'error', reason: oauthError });
  }
  if (!code) {
    return backTo({ google_contacts: 'error', reason: 'missing_code' });
  }
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_KEY || !env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    return backTo({ google_contacts: 'error', reason: 'missing_env_vars' });
  }

  try {
    // Exchange the one-time code for tokens. access_type=offline and
    // prompt=consent (both set on the frontend's auth URL) are what
    // make Google actually issue a refresh_token here -- without them
    // Google only gives one on the very first-ever consent.
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: env.GOOGLE_CLIENT_ID,
        client_secret: env.GOOGLE_CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code'
      })
    });
    const tokenData = await tokenRes.json();

    if (!tokenRes.ok || !tokenData.refresh_token) {
      console.error('Google token exchange failed or no refresh_token returned', tokenData);
      return backTo({ google_contacts: 'error', reason: tokenData.error || 'no_refresh_token' });
    }

    // Identify which Google account this actually is, so the token row
    // is keyed by account rather than assuming there's only ever one.
    const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: 'Bearer ' + tokenData.access_token }
    });
    const userInfo = userInfoRes.ok ? await userInfoRes.json() : {};
    const accountEmail = userInfo.email || 'unknown';

    const svcHeaders = {
      'Authorization': 'Bearer ' + env.SUPABASE_SERVICE_KEY,
      'apikey': env.SUPABASE_SERVICE_KEY,
      'Content-Type': 'application/json',
      'Prefer': 'resolution=merge-duplicates'
    };

    const sbRes = await fetch(env.SUPABASE_URL + '/rest/v1/google_contacts_tokens?on_conflict=account_email', {
      method: 'POST',
      headers: svcHeaders,
      body: JSON.stringify({
        account_email: accountEmail,
        refresh_token: tokenData.refresh_token,
        updated_at: new Date().toISOString()
      })
    });

    if (!sbRes.ok) {
      const errText = await sbRes.text();
      console.error('Failed to store Google refresh token', errText);
      return backTo({ google_contacts: 'error', reason: 'storage_failed' });
    }

    return backTo({ google_contacts: 'connected', account: accountEmail });
  } catch (e) {
    console.error('google-contacts-callback exception', e);
    return backTo({ google_contacts: 'error', reason: 'exception' });
  }
}
