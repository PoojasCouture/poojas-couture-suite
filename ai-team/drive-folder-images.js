// functions/api/drive-folder-images.js
// -----------------------------------------------------------------------
// Fetches actual image bytes (base64-encoded) from one or more
// user-supplied Google Drive folder URLs, pooling results across all of
// them. Built specifically to close a gap in the Cinematic Reel Builder
// (ai-team/app.js): that feature asked for a Drive folder URL but only
// ever sent the URL to Claude as a text string — nothing ever actually
// opened the folder, so "heroShot" and "missingAssets" in its output
// were generic guesses, not real analysis.
//
// MULTI-FOLDER: shoots/photos are often scattered across several Drive
// folders rather than one tidy folder. Rather than building full-account
// Drive search (a real OAuth project — login flow, token storage, token
// refresh — out of scope for a "no new cost" ask), this accepts a list
// of folder links and pools images from all of them. Same sharing model
// as before (each folder still needs "Anyone with the link can view"),
// just more than one at a time.
//
// This is a SEPARATE function from brand-assets.js on purpose, even
// though both list Drive folder images via the same API. That function
// is scoped to one fixed folder (the brand asset library) and returns
// thumbnail URLs for a UI picker. This one accepts ANY folders a staff
// member pastes in, and returns actual image BYTES ready to hand to
// Claude as vision input — a different shape for a different purpose.
//
// AUTH: same pattern as ai-team.js — this only makes sense to call from
// an already-authenticated AI Team portal session, so it requires one
// too, checked the same way.
//
// Required Cloudflare env vars: SUPABASE_URL, SUPABASE_SERVICE_KEY,
//   GOOGLE_DRIVE_API_KEY (already configured — same key brand-assets.js uses)
//
// POST JSON body: { token, driveUrls: string[] }
// -----------------------------------------------------------------------

const MAX_FOLDERS = 6;        // ceiling on how many folder links one request processes
const MAX_PER_FOLDER = 5;     // no single folder can crowd out the others
const MAX_TOTAL_IMAGES = 12;  // overall cap — keeps the Claude request size/cost
                               // reasonable; this is meant to give the model a
                               // representative pool to choose from, not ingest
                               // every photo that exists
const THUMB_WIDTH = 800;      // matches brand-assets.js's own default size

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

/**
 * List up to `limit` image files in one Drive folder. Returns
 * { ok:true, files } or { ok:false, reason } — never throws, so one bad
 * folder in a multi-folder request can be reported and skipped without
 * taking down the whole request.
 */
async function listFolderImages(folderId, apiKey, limit) {
  const params = new URLSearchParams({
    q: `'${folderId}' in parents and mimeType contains 'image/' and trashed = false`,
    key: apiKey,
    fields: 'files(id,name,mimeType)',
    pageSize: String(limit * 3), // over-fetch a bit so a mixed-quality folder still yields `limit` usable ones
    orderBy: 'name',
    supportsAllDrives: 'true',
    includeItemsFromAllDrives: 'true'
  });
  try {
    const res = await fetch(`https://www.googleapis.com/drive/v3/files?${params}`);
    if (!res.ok) {
      return { ok: false, reason: `Could not read this folder (${res.status}) — check it's shared "Anyone with the link can view".` };
    }
    const data = await res.json();
    const allFiles = data.files || [];
    return { ok: true, files: allFiles.slice(0, limit), totalInFolder: allFiles.length };
  } catch (err) {
    return { ok: false, reason: 'Failed to reach the Drive API: ' + String(err) };
  }
}

export async function onRequestPost(context) {
  const { env, request } = context;

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

  // --- Parse and validate the folder list ---
  const rawUrls = Array.isArray(body.driveUrls) ? body.driveUrls : [];
  if (rawUrls.length === 0) {
    return jsonResponse({ error: 'At least one Drive folder URL is required.' }, 400);
  }
  const urlsToProcess = rawUrls.slice(0, MAX_FOLDERS);

  const folderResults = []; // per-folder outcome, always reported — never silently dropped
  const seenIds = new Set();

  for (const rawUrl of urlsToProcess) {
    const folderId = extractFolderId(rawUrl);
    if (!folderId) {
      folderResults.push({ input: rawUrl, ok: false, reason: 'Could not find a folder ID in that URL.' });
      continue;
    }
    if (seenIds.has(folderId)) {
      folderResults.push({ input: rawUrl, folderId, ok: false, reason: 'Duplicate of another folder already in this request.' });
      continue;
    }
    seenIds.add(folderId);

    const listResult = await listFolderImages(folderId, env.GOOGLE_DRIVE_API_KEY, MAX_PER_FOLDER);
    if (!listResult.ok) {
      folderResults.push({ input: rawUrl, folderId, ok: false, reason: listResult.reason });
      continue;
    }
    if (listResult.files.length === 0) {
      folderResults.push({ input: rawUrl, folderId, ok: false, reason: 'No images found in this folder (or it isn\'t shared publicly yet).' });
      continue;
    }
    folderResults.push({
      input: rawUrl, folderId, ok: true,
      files: listResult.files, totalInFolder: listResult.totalInFolder
    });
  }

  // --- Pool candidate files across all successfully-read folders, capped overall ---
  const candidates = [];
  for (const fr of folderResults) {
    if (!fr.ok) continue;
    for (const f of fr.files) {
      if (candidates.length >= MAX_TOTAL_IMAGES) break;
      candidates.push({ ...f, sourceFolderId: fr.folderId });
    }
  }

  if (candidates.length === 0) {
    // Every folder failed or was empty — this is a hard stop, not a
    // silent proceed-without-photos. See ai-team/app.js's handling of
    // this response for why.
    return jsonResponse({
      error: 'Could not find any usable images across the folder(s) provided.',
      count: 0,
      images: [],
      folderResults
    }, 200);
  }

  // --- Fetch actual bytes for each candidate, base64-encode for Claude ---
  const images = [];
  const fetchFailures = [];
  for (const f of candidates) {
    try {
      const thumbRes = await fetch(`https://drive.google.com/thumbnail?id=${f.id}&sz=w${THUMB_WIDTH}`);
      if (!thumbRes.ok) { fetchFailures.push(f.name); continue; }
      const buf = await thumbRes.arrayBuffer();
      const bytes = new Uint8Array(buf);
      let binary = '';
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
      images.push({
        name: f.name,
        sourceFolderId: f.sourceFolderId,
        // Drive's thumbnail endpoint always serves JPEG regardless of the
        // source file's original format — declaring anything else here
        // would be exactly the kind of unverified claim the rest of this
        // audit has been closing elsewhere in the app.
        mediaType: 'image/jpeg',
        base64: btoa(binary)
      });
    } catch (e) {
      fetchFailures.push(f.name);
    }
  }

  return jsonResponse({
    foldersRequested: urlsToProcess.length,
    foldersSucceeded: folderResults.filter(f => f.ok).length,
    count: images.length,
    images,
    folderResults, // full per-folder detail — which worked, which didn't, and why
    fetchFailures: fetchFailures.length ? fetchFailures : undefined
  });
}

export async function onRequestGet() {
  return jsonResponse({ error: 'Use POST.' }, 405);
}

