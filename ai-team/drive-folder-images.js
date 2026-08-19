// functions/api/drive-folder-images.js
// -----------------------------------------------------------------------
// Fetches actual image bytes (base64-encoded) from an arbitrary,
// user-supplied Google Drive folder URL. Built specifically to close a
// gap in the Cinematic Reel Builder (ai-team/app.js): that feature asked
// for a Drive folder URL but only ever sent the URL to Claude as a text
// string — nothing ever actually opened the folder, so "heroShot" and
// "missingAssets" in its output were generic guesses, not real analysis.
//
// This is a SEPARATE function from brand-assets.js on purpose, even
// though both list a Drive folder's images via the same API. That
// function is scoped to one fixed folder (the brand asset library) and
// returns thumbnail URLs for a UI picker. This one accepts ANY folder a
// staff member pastes in (a specific shoot's folder, different every
// time), and returns actual image BYTES ready to hand to Claude as
// vision input — a different shape for a different purpose.
//
// AUTH: same pattern as ai-team.js — this only makes sense to call from
// an already-authenticated AI Team portal session, so it requires one
// too, checked the same way.
//
// Required Cloudflare env vars: SUPABASE_URL, SUPABASE_SERVICE_KEY,
//   GOOGLE_DRIVE_API_KEY (already configured — same key brand-assets.js uses)
//
// POST JSON body: { token, driveUrl }
// -----------------------------------------------------------------------

const MAX_IMAGES = 6; // keeps the Claude request size/cost reasonable — this
                       // is meant to give the model a representative sense of
                       // the shoot, not ingest an entire folder
const THUMB_WIDTH = 800; // matches brand-assets.js's own default size

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
  });
}

/**
 * Extract a Drive folder ID from any of the common URL shapes people
 * paste, or accept a bare folder ID directly. Returns null if nothing
 * folder-ID-shaped is found — caller should reject with a clear error
 * rather than silently guessing.
 */
function extractFolderId(input) {
  if (!input || typeof input !== 'string') return null;
  const trimmed = input.trim();

  // https://drive.google.com/drive/folders/FOLDER_ID  (with optional
  // /u/0/, ?usp=sharing, or other query params/trailing path)
  const folderMatch = trimmed.match(/drive\.google\.com\/(?:drive\/(?:u\/\d+\/)?)?folders\/([a-zA-Z0-9_-]+)/);
  if (folderMatch) return folderMatch[1];

  // Bare folder ID pasted directly (Drive IDs are typically 25+ url-safe chars)
  if (/^[a-zA-Z0-9_-]{20,}$/.test(trimmed)) return trimmed;

  return null;
}

export async function onRequestPost(context) {
  const { request, env } = context;

  if (!env.GOOGLE_DRIVE_API_KEY) {
    return jsonResponse({ error: 'GOOGLE_DRIVE_API_KEY is not set in the Pages environment.' }, 500);
  }
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_KEY) {
    return jsonResponse({ error: 'Server misconfiguration' }, 500);
  }

  let body;
  try { body = await request.json(); } catch { return jsonResponse({ error: 'Invalid JSON body.' }, 400); }

  // --- Auth: same pattern as ai-team.js — real staff session required ---
  const token = body.token;
  if (!token) return jsonResponse({ error: 'Missing auth token' }, 401);
  const userRes = await fetch(env.SUPABASE_URL + '/auth/v1/user', {
    headers: { 'Authorization': 'Bearer ' + token, 'apikey': env.SUPABASE_SERVICE_KEY }
  });
  if (!userRes.ok) return jsonResponse({ error: 'Invalid or expired session' }, 401);
  const userData = await userRes.json();
  const callerEmail = userData.email;
  if (!callerEmail) return jsonResponse({ error: 'Could not resolve caller identity' }, 401);
  const svcHeaders = { 'Authorization': 'Bearer ' + env.SUPABASE_SERVICE_KEY, 'apikey': env.SUPABASE_SERVICE_KEY };
  const empRes = await fetch(env.SUPABASE_URL + '/rest/v1/employees?email=eq.' + encodeURIComponent(callerEmail) + '&select=app_role', { headers: svcHeaders });
  const empRows = empRes.ok ? await empRes.json() : [];
  const role = empRows[0] ? empRows[0].app_role : null;
  if (!['admin', 'operations', 'social_crm'].includes(role)) {
    return jsonResponse({ error: 'Not authorized to use this feature' }, 403);
  }

  const folderId = extractFolderId(body.driveUrl);
  if (!folderId) {
    return jsonResponse({ error: 'Could not find a folder ID in that URL. Paste the folder\'s share link, or its ID directly.' }, 400);
  }

  // --- List images in the folder (same Drive API pattern as brand-assets.js) ---
  const params = new URLSearchParams({
    q: `'${folderId}' in parents and mimeType contains 'image/' and trashed = false`,
    key: env.GOOGLE_DRIVE_API_KEY,
    fields: 'files(id,name,mimeType)',
    pageSize: String(MAX_IMAGES * 3), // over-fetch a bit so a mixed-quality
                                       // folder still yields MAX_IMAGES usable ones
    orderBy: 'name',
    supportsAllDrives: 'true',
    includeItemsFromAllDrives: 'true'
  });

  let listData;
  try {
    const listRes = await fetch(`https://www.googleapis.com/drive/v3/files?${params}`);
    if (!listRes.ok) {
      const detail = await listRes.text();
      // Common real-world cause: folder isn't shared "anyone with link" yet.
      return jsonResponse({ error: `Could not read that Drive folder (${listRes.status}). Check it's shared "Anyone with the link can view".`, detail }, 502);
    }
    listData = await listRes.json();
  } catch (err) {
    return jsonResponse({ error: 'Failed to reach the Drive API', detail: String(err) }, 502);
  }

  const files = (listData.files || []).slice(0, MAX_IMAGES);
  if (files.length === 0) {
    return jsonResponse({ error: 'No images found in that folder (or it isn\'t shared publicly yet).', count: 0, images: [] }, 200);
  }

  // --- Fetch actual bytes for each image, base64-encode for Claude ---
  const images = [];
  const failures = [];
  for (const f of files) {
    try {
      const thumbRes = await fetch(`https://drive.google.com/thumbnail?id=${f.id}&sz=w${THUMB_WIDTH}`);
      if (!thumbRes.ok) { failures.push(f.name); continue; }
      const buf = await thumbRes.arrayBuffer();
      const bytes = new Uint8Array(buf);
      let binary = '';
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
      images.push({
        name: f.name,
        // Drive's thumbnail endpoint always serves JPEG regardless of the
        // source file's original format — declaring anything else here
        // would be exactly the kind of unverified claim the rest of this
        // audit has been closing elsewhere in the app.
        mediaType: 'image/jpeg',
        base64: btoa(binary)
      });
    } catch (e) {
      failures.push(f.name);
    }
  }

  return jsonResponse({
    folderId,
    totalImagesInFolder: (listData.files || []).length,
    count: images.length,
    images,
    truncated: (listData.files || []).length > MAX_IMAGES,
    failures: failures.length ? failures : undefined
  });
}

export async function onRequestGet() {
  return jsonResponse({ error: 'Use POST.' }, 405);
}
