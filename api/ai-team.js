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
const MODEL = 'claude-sonnet-4-6';
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

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return jsonResponse({ error: 'Invalid JSON body.' }, 400);
  }

  const { system, messages, max_tokens } = body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return jsonResponse({ error: 'messages array is required.' }, 400);
  }

  const cappedMaxTokens = Math.min(Number(max_tokens) || 1200, MAX_TOKENS_CAP);

  try {
    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': ANTHROPIC_VERSION
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: cappedMaxTokens,
        system: system || undefined,
        messages
      })
    });

    const data = await anthropicRes.json();

    if (!anthropicRes.ok) {
      return jsonResponse(
        { error: data?.error?.message || `Anthropic API error (${anthropicRes.status})` },
        anthropicRes.status
      );
    }

    return jsonResponse(data, 200);

  } catch (err) {
    return jsonResponse({ error: 'Failed to reach the Anthropic API.' }, 502);
  }
}

// Reject anything that isn't a POST (GET, etc.) rather than letting it 404
// silently — makes misconfiguration easier to spot during testing.
export async function onRequestGet() {
  return jsonResponse({ error: 'Use POST.' }, 405);
}
