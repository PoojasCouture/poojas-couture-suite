// functions/api/generate-reel-scene.js
// -----------------------------------------------------------------------
// Starts a real AI video generation job for ONE Reel Builder scene, using
// Google Veo 3.1 via the Gemini API (same GEMINI_API_KEY already
// configured for generate-model-photo.js / generate-customer-tryon.js --
// Veo is reached through the SAME Google AI Studio key, not a separate
// provider/signup).
//
// REAL, NEW COST -- HIGHER THAN IMAGE GENERATION: video generation is
// billed per second of output and costs substantially more per call than
// the Nano Banana image endpoints already in this app. Every click of
// "Generate Video" on a scene spends real money. Kept admin/operations
// (or per-employee ai-team/socialCrm-permission -- see auth block)
// only, same posture as the other Gemini-billed endpoints.
//
// ALSO REQUIRES BILLING ENABLED FOR VEO SPECIFICALLY on whatever Google
// Cloud / AI Studio project GEMINI_API_KEY belongs to -- Veo has
// historically not been available on a bare free-tier key the way the
// image models are. If this 500s with an auth/permission-looking
// message, that is almost certainly it, not a bug in this file.
//
// WHY THIS IS SPLIT INTO TWO FILES (generate-reel-scene.js +
// reel-scene-status.js) INSTEAD OF ONE: Veo generation is a genuine
// long-running job (the docs' own example polls for over a minute).
// Cloudflare Pages Functions have a wall-clock limit well under that, so
// this file only STARTS the job (Veo's :predictLongRunning call) and
// returns immediately with a row id; reel-scene-status.js is polled by
// the browser afterward to check progress and, once done, pull the
// finished video into Supabase Storage.
//
// ONE VEO CALL = ONE SHORT CLIP, NOT A FULL STITCHED REEL: Veo returns a
// single ~8-second clip per call. There is no video-editing/concatenation
// step in this stack (Cloudflare Workers cannot run ffmpeg), so a 45s
// Reel Builder script becomes several separate downloadable scene clips,
// not one final assembled Reel -- stitching them into one file is a
// separate, not-yet-built step (see Reel Builder UI copy).
//
// Required Cloudflare env vars: SUPABASE_URL, SUPABASE_SERVICE_KEY,
//   GEMINI_API_KEY
//
// POST JSON body: { token, prompt, sourceImageBase64?, sourceImageMime?,
//                    aspectRatio?, projectId?, sceneIndex? }
// -----------------------------------------------------------------------

import { validateFileType } from './_lib/fileSignature.js';

const VEO_MODEL = 'veo-3.1-generate-preview';
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_PROMPT_LEN = 2000;

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

export async function onRequestPost(context) {
  const { env, request } = context;

  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_KEY || !env.GEMINI_API_KEY) {
    return jsonResponse({ error: 'Server misconfiguration -- GEMINI_API_KEY may not be set yet.' }, 500);
  }

  let body;
  try { body = await request.json(); } catch { return jsonResponse({ error: 'Invalid JSON body.' }, 400); }

  // --- Auth: admin/operations OR the per-employee kiosk-style checkbox
  // pattern (permissions.socialCrm), same shape as generate-customer-
  // tryon.js's permissions.kiosk override -- so this can be granted to
  // Social CRM Studio staff without making them full admins. ---
  const token = body.token;
  if (!token) return jsonResponse({ error: 'Missing auth token' }, 401);
  const svcHeaders = { 'Authorization': 'Bearer ' + env.SUPABASE_SERVICE_KEY, 'apikey': env.SUPABASE_SERVICE_KEY };
  const userRes = await fetch(env.SUPABASE_URL + '/auth/v1/user', {
    headers: { 'Authorization': 'Bearer ' + token, 'apikey': env.SUPABASE_SERVICE_KEY }
  });
  if (!userRes.ok) return jsonResponse({ error: 'Invalid or expired session' }, 401);
  const userData = await userRes.json();
  const callerEmail = userData.email;
  if (!callerEmail) return jsonResponse({ error: 'Could not resolve caller identity' }, 401);
  const empRes = await fetch(env.SUPABASE_URL + '/rest/v1/employees?email=eq.' + encodeURIComponent(callerEmail) + '&select=app_role,permissions', { headers: svcHeaders });
  const empRows = empRes.ok ? await empRes.json() : [];
  const role = empRows[0] ? empRows[0].app_role : null;
  const hasSocialCrmPerm = !!(empRows[0] && empRows[0].permissions && empRows[0].permissions.socialCrm === true);
  if (!['admin', 'operations'].includes(role) && !hasSocialCrmPerm) {
    return jsonResponse({ error: 'Not authorized to use this feature' }, 403);
  }

  const promptRaw = typeof body.prompt === 'string' ? body.prompt : '';
  const prompt = promptRaw.trim().slice(0, MAX_PROMPT_LEN);
  if (!prompt) return jsonResponse({ error: 'A scene prompt/description is required.' }, 400);

  const aspectRatio = body.aspectRatio === '16:9' ? '16:9' : '9:16'; // default Reel shape

  // --- Optional: animate an existing storyboard still (image-to-video) ---
  let instanceImage = null;
  if (body.sourceImageBase64) {
    const cleanBase64 = String(body.sourceImageBase64).replace(/^data:[^,]+,/, '');
    if (cleanBase64.length > 100) {
      const binary = atob(cleanBase64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const check = validateFileType(bytes, ALLOWED_IMAGE_TYPES);
      if (check.valid) {
        instanceImage = { bytesBase64Encoded: cleanBase64, mimeType: check.mimeType };
      }
      // If the check fails, we silently proceed text-only rather than
      // hard-erroring -- an unusable reference image shouldn't block
      // generation when a perfectly good text prompt is already present.
    }
  }

  // --- 1. Start the Veo long-running job (returns an operation name,
  //         does NOT wait for the video) ---
  let operationName;
  try {
    const instance = { prompt };
    if (instanceImage) instance.image = instanceImage;
    const veoRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${VEO_MODEL}:predictLongRunning`,
      {
        method: 'POST',
        headers: { 'x-goog-api-key': env.GEMINI_API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instances: [instance],
          parameters: { aspectRatio }
        })
      }
    );
    const veoData = await veoRes.json();
    if (!veoRes.ok) {
      return jsonResponse({ error: 'Video generation failed to start: ' + (veoData.error?.message || 'unknown Veo error') }, 502);
    }
    operationName = veoData.name;
    if (!operationName) return jsonResponse({ error: 'Veo did not return a job reference.' }, 502);
  } catch (err) {
    return jsonResponse({ error: 'Video generation request failed: ' + String(err) }, 502);
  }

  // --- 2. Record the job so the status endpoint can poll + the UI can
  //         show every scene's progress ---
  const row = {
    project_id: body.projectId || null,
    scene_index: Number.isFinite(body.sceneIndex) ? body.sceneIndex : 0,
    prompt,
    source_image_url: body.sourceImageUrl || null,
    aspect_ratio: aspectRatio,
    operation_name: operationName,
    status: 'processing',
    created_by: callerEmail
  };
  const insRes = await fetch(env.SUPABASE_URL + '/rest/v1/reel_scenes', {
    method: 'POST',
    headers: { ...svcHeaders, 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
    body: JSON.stringify(row)
  });
  if (!insRes.ok) {
    return jsonResponse({ error: 'Started generation but failed to save job record: ' + (await insRes.text()).slice(0, 200) }, 502);
  }
  const inserted = await insRes.json();
  return jsonResponse({ ok: true, id: inserted[0].id, status: 'processing' });
}
