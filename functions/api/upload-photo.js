// functions/api/upload-photo.js
// Uploads a photo (base64 JSON body) to the Supabase 'job-photos' bucket
// and records it in the job_photos table. Used by the tailor (karigar)
// and shipping portals.
//
// POST JSON body:
// {
//   imageBase64: "<base64 without data: prefix>",
//   mimeType: "image/jpeg",
//   orderId: "<uuid or null>",
//   shipmentId: "<uuid or null>",
//   requestId: "<uuid or null>",      // photo_requests id if fulfilling a request
//   markFulfilled: true|false,         // set request status to Fulfilled
//   context: "Karigar Progress" | "Received from Karigar" | "Received from Vendor"
//          | "Shipped Domestic (India)" | "Shipped International" | other text,
//   caption: "front view",
//   uploadedBy: "Kaleem Khan"
// }
//
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
    const imageBase64 = body.imageBase64 || '';
    const mimeType = body.mimeType || 'image/jpeg';

    if (!imageBase64 || imageBase64.length < 100) {
      return new Response(JSON.stringify({ ok: false, error: 'No image data' }), { status: 400, headers: corsHeaders });
    }
    if (imageBase64.length > 15 * 1024 * 1024) {
      return new Response(JSON.stringify({ ok: false, error: 'Image too large (max ~10MB). Please resize.' }), { status: 413, headers: corsHeaders });
    }
    if (mimeType.indexOf('image/') !== 0) {
      return new Response(JSON.stringify({ ok: false, error: 'Only images allowed' }), { status: 400, headers: corsHeaders });
    }

    // Decode base64 to bytes
    const binary = atob(imageBase64.replace(/^data:[^,]+,/, ''));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

    const ext = mimeType === 'image/png' ? 'png' : (mimeType === 'image/webp' ? 'webp' : 'jpg');
    const folder = body.orderId ? ('orders/' + body.orderId) : (body.shipmentId ? ('shipments/' + body.shipmentId) : 'misc');
    const path = folder + '/' + crypto.randomUUID() + '.' + ext;

    // 1. Upload to storage
    const upRes = await fetch(env.SUPABASE_URL + '/storage/v1/object/job-photos/' + path, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + env.SUPABASE_SERVICE_KEY,
        'apikey': env.SUPABASE_SERVICE_KEY,
        'Content-Type': mimeType,
        'x-upsert': 'false'
      },
      body: bytes
    });
    if (!upRes.ok) {
      const t = await upRes.text();
      return new Response(JSON.stringify({ ok: false, error: 'Storage upload failed ' + upRes.status, detail: t.slice(0, 300) }), { status: 502, headers: corsHeaders });
    }

    const publicUrl = env.SUPABASE_URL + '/storage/v1/object/public/job-photos/' + path;

    // 2. Record in job_photos
    const rowRes = await fetch(env.SUPABASE_URL + '/rest/v1/job_photos', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + env.SUPABASE_SERVICE_KEY,
        'apikey': env.SUPABASE_SERVICE_KEY,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        order_id: body.orderId || null,
        shipment_id: body.shipmentId || null,
        request_id: body.requestId || null,
        context: body.context || 'Karigar Progress',
        storage_path: path,
        url: publicUrl,
        caption: body.caption || null,
        uploaded_by: body.uploadedBy || 'Unknown'
      })
    });
    if (!rowRes.ok) {
      const t = await rowRes.text();
      return new Response(JSON.stringify({ ok: false, error: 'DB insert failed ' + rowRes.status, detail: t.slice(0, 300) }), { status: 502, headers: corsHeaders });
    }
    const rows = await rowRes.json();

    // 3. Optionally mark the photo request fulfilled
    if (body.requestId && body.markFulfilled) {
      await fetch(env.SUPABASE_URL + '/rest/v1/photo_requests?id=eq.' + encodeURIComponent(body.requestId), {
        method: 'PATCH',
        headers: {
          'Authorization': 'Bearer ' + env.SUPABASE_SERVICE_KEY,
          'apikey': env.SUPABASE_SERVICE_KEY,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({ status: 'Fulfilled', fulfilled_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      });
    }

    return new Response(JSON.stringify({ ok: true, photo: rows[0] || null, url: publicUrl }), { headers: corsHeaders });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: String(err && err.message ? err.message : err) }), { status: 500, headers: corsHeaders });
  }
}
