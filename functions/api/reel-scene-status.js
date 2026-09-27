// functions/api/reel-scene-status.js
// -----------------------------------------------------------------------
// Companion to generate-reel-scene.js. The browser polls THIS endpoint
// (every few seconds, per row id) while a Veo job is running. Once Veo
// reports the job done, this downloads the finished clip and stores it
// in the private `reel-videos` Supabase Storage bucket (server-side,
// using the service-role key -- same pattern as every other upload path
// in this app; the raw Google file URI is never handed to the browser).
//
// Required Cloudflare env vars: SUPABASE_URL, SUPABASE_SERVICE_KEY,
//   GEMINI_API_KEY
//
// GET ?id=<reel_scenes row id>&token=<session token>
// -----------------------------------------------------------------------

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

export async function onRequestGet(context) {
  const { env, request } = context;
  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  const token = url.searchParams.get('token');

  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_KEY || !env.GEMINI_API_KEY) {
    return jsonResponse({ error: 'Server misconfiguration -- GEMINI_API_KEY may not be set yet.' }, 500);
  }
  if (!id || !token) return jsonResponse({ error: 'Missing id or token' }, 400);

  const svcHeaders = { 'Authorization': 'Bearer ' + env.SUPABASE_SERVICE_KEY, 'apikey': env.SUPABASE_SERVICE_KEY };

  // --- Auth: any signed-in session (same session used to start the
  //     job) -- no separate role gate on read-only status polling. ---
  const userRes = await fetch(env.SUPABASE_URL + '/auth/v1/user', {
    headers: { 'Authorization': 'Bearer ' + token, 'apikey': env.SUPABASE_SERVICE_KEY }
  });
  if (!userRes.ok) return jsonResponse({ error: 'Invalid or expired session' }, 401);

  const rowRes = await fetch(env.SUPABASE_URL + '/rest/v1/reel_scenes?id=eq.' + encodeURIComponent(id) + '&select=*', { headers: svcHeaders });
  const rows = rowRes.ok ? await rowRes.json() : [];
  const row = rows[0];
  if (!row) return jsonResponse({ error: 'Job not found' }, 404);

  if (row.status === 'ready' || row.status === 'failed') {
    return jsonResponse({ ok: true, status: row.status, videoUrl: row.video_url, error: row.error_message });
  }

  // --- Poll the Veo operation ---
  let opData;
  try {
    const opRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/${row.operation_name}`, {
      headers: { 'x-goog-api-key': env.GEMINI_API_KEY }
    });
    opData = await opRes.json();
    if (!opRes.ok) {
      await markFailed(env, svcHeaders, id, 'Status check failed: ' + (opData.error?.message || 'unknown error'));
      return jsonResponse({ ok: true, status: 'failed', error: 'Status check failed: ' + (opData.error?.message || 'unknown error') });
    }
  } catch (err) {
    return jsonResponse({ ok: true, status: 'processing' }); // transient network hiccup -- try again next poll, don't fail the job
  }

  if (!opData.done) {
    return jsonResponse({ ok: true, status: 'processing' });
  }

  if (opData.error) {
    await markFailed(env, svcHeaders, id, opData.error.message || 'Veo reported an error');
    return jsonResponse({ ok: true, status: 'failed', error: opData.error.message || 'Veo reported an error' });
  }

  // --- Done: download the finished clip and store it ourselves ---
  const generatedVideo = opData.response?.generateVideoResponse?.generatedSamples?.[0]?.video
    || opData.response?.generatedVideos?.[0]?.video;
  const fileUri = generatedVideo?.uri;
  if (!fileUri) {
    await markFailed(env, svcHeaders, id, 'Veo finished but returned no video file.');
    return jsonResponse({ ok: true, status: 'failed', error: 'Veo finished but returned no video file.' });
  }

  try {
    const videoRes = await fetch(fileUri, { headers: { 'x-goog-api-key': env.GEMINI_API_KEY } });
    if (!videoRes.ok) throw new Error('download failed, HTTP ' + videoRes.status);
    const videoBytes = new Uint8Array(await videoRes.arrayBuffer());

    const path = 'scenes/' + crypto.randomUUID() + '.mp4';
    const upRes = await fetch(env.SUPABASE_URL + '/storage/v1/object/reel-videos/' + path, {
      method: 'POST',
      headers: { ...svcHeaders, 'Content-Type': 'video/mp4', 'x-upsert': 'false' },
      body: videoBytes
    });
    if (!upRes.ok) throw new Error('storage upload failed: ' + (await upRes.text()).slice(0, 200));

    const videoUrl = env.SUPABASE_URL + '/storage/v1/object/public/reel-videos/' + path;
    await fetch(env.SUPABASE_URL + '/rest/v1/reel_scenes?id=eq.' + encodeURIComponent(id), {
      method: 'PATCH',
      headers: { ...svcHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'ready', video_url: videoUrl, updated_at: new Date().toISOString() })
    });
    return jsonResponse({ ok: true, status: 'ready', videoUrl });
  } catch (err) {
    await markFailed(env, svcHeaders, id, 'Could not fetch/store the finished video: ' + String(err));
    return jsonResponse({ ok: true, status: 'failed', error: 'Could not fetch/store the finished video: ' + String(err) });
  }
}

async function markFailed(env, svcHeaders, id, message) {
  try {
    await fetch(env.SUPABASE_URL + '/rest/v1/reel_scenes?id=eq.' + encodeURIComponent(id), {
      method: 'PATCH',
      headers: { ...svcHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'failed', error_message: String(message).slice(0, 500), updated_at: new Date().toISOString() })
    });
  } catch { /* best-effort */ }
}
