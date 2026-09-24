// functions/api/generate-customer-tryon.js
// -----------------------------------------------------------------------
// The customer-facing counterpart to generate-model-photo.js. Takes a
// photo of an actual customer (captured live via the Kiosk portal's
// camera) plus a garment photo already in the product catalog, and
// generates a composite image of that customer wearing that garment.
//
// SAME real, documented Gemini generateContent endpoint as
// generate-model-photo.js -- the only structural difference is that
// this one sends TWO images in the request instead of one (Gemini's
// documented multi-image blending capability), and the prompt is
// written to preserve the CUSTOMER's actual face/body/pose rather than
// generating a generic model.
//
// COST + AUTH: same real per-call cost against GEMINI_API_KEY as
// generate-model-photo.js, admin/operations only -- see that file's
// header for the full reasoning, unchanged here.
//
// PRIVACY, worth stating plainly in code as well as to the business:
// this endpoint sends a real photo of a real customer to Google's API.
// It does not store the customer's photo anywhere -- the input photo
// is used for one generation call and discarded; only the GENERATED
// result is (optionally) returned to display, never written to a
// database row or given a permanent customer-linked record. If this
// business wants to keep a copy of try-on results later (e.g. to email
// a customer their look), that is a deliberate future decision, not
// something this endpoint does by default.
//
// Required Cloudflare env vars: SUPABASE_URL, SUPABASE_SERVICE_KEY,
//   GEMINI_API_KEY
//
// POST JSON body: { token, customerPhotoBase64, garmentPhotoUrl }
// -----------------------------------------------------------------------

import { validateFileType } from './_lib/fileSignature.js';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_BASE64_LEN = 15 * 1024 * 1024 * 1.4;
const GEMINI_MODEL = 'gemini-3.1-flash-image'; // same standard tier as generate-model-photo.js

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

const PROMPT = `You are given two photos: the FIRST is a real customer, the SECOND is a garment from Pooja's Couture, a South Asian bridal and occasion-wear boutique. Generate a realistic photo of the SAME customer from the first photo -- preserve their actual face, body shape, skin tone, and pose as closely as possible -- now wearing the exact garment shown in the second photo, preserving that garment's real fabric, colour, embroidery, and embellishment. Natural lighting matching the customer's original photo, realistic fit on their body. Do not add any text, watermark, or logo to the image.`;

export async function onRequestPost(context) {
  const { env, request } = context;

  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_KEY || !env.GEMINI_API_KEY) {
    return jsonResponse({ error: 'Server misconfiguration -- GEMINI_API_KEY may not be set yet.' }, 500);
  }

  let body;
  try { body = await request.json(); } catch { return jsonResponse({ error: 'Invalid JSON body.' }, 400); }

  // --- Auth: admin/operations only, same as generate-model-photo.js ---
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
  const hasKioskPerm = !!(empRows[0] && empRows[0].permissions && empRows[0].permissions.kiosk === true);
  if (!['admin', 'operations'].includes(role) && !hasKioskPerm) {
    return jsonResponse({ error: 'Not authorized to use this feature' }, 403);
  }

  // --- Validate the customer's live-captured photo (real byte check, same as every upload path) ---
  const customerPhotoBase64 = body.customerPhotoBase64;
  if (!customerPhotoBase64 || customerPhotoBase64.length < 100) {
    return jsonResponse({ error: 'No customer photo captured' }, 400);
  }
  if (customerPhotoBase64.length > MAX_BASE64_LEN) {
    return jsonResponse({ error: 'Photo too large (max ~15MB).' }, 413);
  }
  const custBinary = atob(customerPhotoBase64.replace(/^data:[^,]+,/, ''));
  const custBytes = new Uint8Array(custBinary.length);
  for (let i = 0; i < custBinary.length; i++) custBytes[i] = custBinary.charCodeAt(i);
  const custCheck = validateFileType(custBytes, ALLOWED_TYPES);
  if (!custCheck.valid) {
    return jsonResponse({ error: 'Customer photo rejected: ' + custCheck.reason }, 400);
  }
  const custMime = custCheck.mimeType;
  const custCleanBase64 = customerPhotoBase64.replace(/^data:[^,]+,/, '');

  // --- Fetch the garment photo server-side (it's a real product photo
  //     already in Supabase storage, not client-uploaded here) ---
  const garmentPhotoUrl = body.garmentPhotoUrl;
  if (!garmentPhotoUrl) return jsonResponse({ error: 'No garment selected' }, 400);
  let garmentMime, garmentCleanBase64;
  try {
    const garmentRes = await fetch(garmentPhotoUrl);
    if (!garmentRes.ok) return jsonResponse({ error: 'Could not load the selected garment photo' }, 502);
    const garmentBuf = await garmentRes.arrayBuffer();
    const garmentBytes = new Uint8Array(garmentBuf);
    const garmentCheck = validateFileType(garmentBytes, ALLOWED_TYPES);
    if (!garmentCheck.valid) {
      return jsonResponse({ error: 'Garment photo rejected: ' + garmentCheck.reason }, 400);
    }
    garmentMime = garmentCheck.mimeType;
    // Base64-encode in chunks -- spreading a large byte array as
    // individual function arguments (String.fromCharCode(...bytes))
    // blows past the JS engine's argument-count limit on any real
    // photo of a few MB. Same failure mode already caught once in
    // product-photo-intake.js -- avoided here from the start.
    let binaryStr = '';
    const chunkSize = 8192;
    for (let i = 0; i < garmentBytes.length; i += chunkSize) {
      binaryStr += String.fromCharCode.apply(null, garmentBytes.subarray(i, i + chunkSize));
    }
    garmentCleanBase64 = btoa(binaryStr);
  } catch (err) {
    return jsonResponse({ error: 'Could not load the selected garment photo: ' + String(err) }, 502);
  }

  // --- Optional customer-typed styling note, appended to the fixed
  //     PROMPT (never replacing it) -- capped length, newlines and
  //     control characters stripped so it can only add an instruction
  //     line, not inject a differently-structured prompt. ---
  const customNoteRaw = typeof body.customNote === 'string' ? body.customNote : '';
  const customNote = customNoteRaw.replace(/[\r\n\t]+/g, ' ').replace(/[^\x20-\x7E]/g, '').trim().slice(0, 300);
  const finalPrompt = customNote
    ? PROMPT + ` Additional styling request from the customer (apply if reasonable, keep it realistic and keep the garment's real fabric/colour/embroidery unless the request explicitly asks to change one of those): "${customNote}"`
    : PROMPT;

  // --- Call Gemini with BOTH images (documented multi-image blending) ---
  let generatedBytes, generatedMime;
  try {
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
      {
        method: 'POST',
        headers: { 'x-goog-api-key': env.GEMINI_API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { inline_data: { mime_type: custMime, data: custCleanBase64 } },
              { inline_data: { mime_type: garmentMime, data: garmentCleanBase64 } },
              { text: finalPrompt }
            ]
          }],
          generationConfig: { responseModalities: ['IMAGE'] }
        })
      }
    );
    const geminiData = await geminiRes.json();
    if (!geminiRes.ok) {
      return jsonResponse({ error: 'Generation failed: ' + (geminiData.error?.message || 'unknown Gemini error') }, 502);
    }
    const parts = geminiData.candidates?.[0]?.content?.parts || [];
    const imagePart = parts.find(p => p.inlineData?.data || p.inline_data?.data);
    const inline = imagePart && (imagePart.inlineData || imagePart.inline_data);
    if (!inline || !inline.data) {
      return jsonResponse({ error: 'Gemini did not return an image. Try a clearer photo.' }, 502);
    }
    generatedMime = inline.mimeType || inline.mime_type || 'image/png';
    const genBinary = atob(inline.data);
    generatedBytes = new Uint8Array(genBinary.length);
    for (let i = 0; i < genBinary.length; i++) generatedBytes[i] = genBinary.charCodeAt(i);
  } catch (err) {
    return jsonResponse({ error: 'Generation request failed: ' + String(err) }, 502);
  }

  // --- Return the result directly as base64 -- NOT stored anywhere,
  //     per the privacy note in the file header. The kiosk page shows
  //     it for the customer to see/screenshot; nothing here writes it
  //     to a database row or a customer-linked storage path.
  //     Same chunked encoding as the garment photo above -- spreading
  //     a large byte array as individual function arguments blows past
  //     the JS engine's argument-count limit on a real generated image. ---
  let genBinaryStr = '';
  const genChunkSize = 8192;
  for (let i = 0; i < generatedBytes.length; i += genChunkSize) {
    genBinaryStr += String.fromCharCode.apply(null, generatedBytes.subarray(i, i + genChunkSize));
  }
  const genBase64 = btoa(genBinaryStr);

  return jsonResponse({ ok: true, imageDataUrl: `data:${generatedMime};base64,${genBase64}` });
}
