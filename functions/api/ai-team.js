// functions/api/ai-team.js
//
// Cloudflare Pages Function — secure server-side proxy to the Anthropic API.
// This exists for ONE reason: the AI Studio Team frontend (ai-team/app.js)
// must never call api.anthropic.com directly with a hardcoded key, because
// this repo is public. This function holds the real key as a server-side
// environment variable that never appears in any file in the repo.
//
// ── ONE-TIME SETUP (do this in the Cloudflare dashboard, not in code) ──
//   1. Go to your Pages project → Settings → Environment variables
//   2. Add a Production variable:
//        Name:  ANTHROPIC_API_KEY
//        Value: sk-ant-xxxxxxxxxxxx   (your real key)
//   3. Click "Encrypt" so it's stored as a secret, not plaintext
//   4. Redeploy (env vars only apply to new deployments)
//
// Do NOT put this key in wrangler.toml, .env committed to git, or anywhere
// else in this repository. If it ever ends up in a commit, rotate it
// immediately in the Anthropic Console — git history keeps it forever even
// after you delete the line.

const ANTHROPIC_VERSION = '2023-06-01';
const CANDIDATE_MODELS = [
  'claude-3-5-sonnet-latest',
  'claude-3-5-sonnet-20241022',
  'claude-3-7-sonnet-latest',
  'claude-3-5-haiku-latest',
  'claude-3-haiku-20240307'
];
const MAX_TOKENS_CAP = 2000; // hard ceiling regardless of what the client asks for

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      // Same-origin only — this function is meant to be called from your
      // own Pages site, not from arbitrary third-party origins.
      'Cache-Control': 'no-store'
    }
  });
}

export async function onRequestPost(context) {
  const { request, env } = context;

  if (!env.ANTHROPIC_API_KEY) {
    return jsonResponse(
      { error: 'Server is missing ANTHROPIC_API_KEY. Set it in Cloudflare Pages → Settings → Environment variables.' },
      500
    );
  }
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_KEY) {
    return jsonResponse({ error: 'Server misconfiguration' }, 500);
  }

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return jsonResponse({ error: 'Invalid JSON body.' }, 400);
  }

  // This function calls the Anthropic API using your own billed API key.
  // It previously had no authentication at all -- anyone who found this
  // URL could run up unlimited API charges with zero login. Now requires
  // a valid staff session with Social CRM / CRM access.
  const token = body.token;
  if (!token) {
    return jsonResponse({ error: 'Missing auth token' }, 401);
  }
  const userRes = await fetch(env.SUPABASE_URL + '/auth/v1/user', {
    headers: { 'Authorization': 'Bearer ' + token, 'apikey': env.SUPABASE_SERVICE_KEY }
  });
  if (!userRes.ok) {
    return jsonResponse({ error: 'Invalid or expired session' }, 401);
  }
  const userData = await userRes.json();
  const callerEmail = userData.email;
  if (!callerEmail) {
    return jsonResponse({ error: 'Could not resolve caller identity' }, 401);
  }
  const svcHeaders = { 'Authorization': 'Bearer ' + env.SUPABASE_SERVICE_KEY, 'apikey': env.SUPABASE_SERVICE_KEY };
  const empRes = await fetch(env.SUPABASE_URL + '/rest/v1/employees?email=eq.' + encodeURIComponent(callerEmail) + '&select=app_role', { headers: svcHeaders });
  const empRows = empRes.ok ? await empRes.json() : [];
  const role = empRows[0] ? empRows[0].app_role : null;
  if (!['admin', 'operations', 'social_crm'].includes(role)) {
    return jsonResponse({ error: 'Not authorized to use this feature' }, 403);
  }

  const { system, messages, max_tokens } = body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return jsonResponse({ error: 'messages array is required.' }, 400);
  }

  const cappedMaxTokens = Math.min(Number(max_tokens) || 1200, MAX_TOKENS_CAP);

  let lastError = null;
  let lastStatus = 500;

  for (const modelName of CANDIDATE_MODELS) {
    try {
      const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': env.ANTHROPIC_API_KEY,
          'anthropic-version': ANTHROPIC_VERSION
        },
        body: JSON.stringify({
          model: modelName,
          max_tokens: cappedMaxTokens,
          system: system || undefined,
          messages
        })
      });

      const data = await anthropicRes.json();

      if (anthropicRes.ok) {
        return jsonResponse(data, 200);
      }

      lastStatus = anthropicRes.status;
      lastError = data?.error?.message || `Anthropic API error (${anthropicRes.status})`;

      // If it's a model-not-found / permission error, continue to try the next model
      const isModelIssue = (lastError || '').toLowerCase().includes('model') || anthropicRes.status === 404;
      if (!isModelIssue) {
        // If it's another issue (e.g. invalid API key, credit balance, rate limit), return immediately
        break;
      }
    } catch (err) {
      lastError = 'Failed to reach the Anthropic API.';
      lastStatus = 502;
    }
  }

  return jsonResponse({ error: lastError || 'Failed to reach the Anthropic API.' }, lastStatus);
}

// Reject anything that isn't a POST (GET, etc.) rather than letting it 404
// silently — makes misconfiguration easier to spot during testing.
export async function onRequestGet() {
  return jsonResponse({ error: 'Use POST.' }, 405);
}
