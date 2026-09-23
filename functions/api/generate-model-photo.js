// functions/api/generate-model-photo.js
// -----------------------------------------------------------------------
// Takes an already-uploaded garment photo and generates a new image of a
// model (male or female, per caller's choice) wearing that exact garment,
// using Google's Gemini image model ("Nano Banana 2" / gemini-3.1-flash-
// image) via the real, documented generateContent REST endpoint.
//
// WHY GEMINI AND NOT THE ANTHROPIC KEY ALREADY CONFIGURED IN THIS APP:
// product-photo-intake.js already uses ANTHROPIC_API_KEY to have Claude
// LOOK AT a photo and describe it (vision/understanding). Claude does
// not generate images as output. This is a genuinely different
// capability (image generation), which is why a separate key/provider
// (GEMINI_API_KEY) was set up specifically for this endpoint.
//
// STANDARD NANO BANANA 2, NOT LITE: chosen deliberately over the cheaper
// Lite tier -- Lite is optimized for cheap/fast bulk generation, not
// garment fidelity, and for a boutique whose product photos need to
// actually show real embroidery/fabric/beadwork detail, the fidelity
// difference matters more than the small cost difference.
//
// HONEST NOTE, worth knowing: Google's generated images carry an
// invisible SynthID watermark (provenance metadata, not a visible logo)
// -- standard practice for this class of model, not something this
// endpoint can or should strip.
//
// This is a genuinely new cost to the business, unlike everything else
// in this app -- every call here spends real money against whatever
// billing is attached to GEMINI_API_KEY. Kept admin/operations-only,
// same as product-photo-intake.js, so it can't be triggered by every
// staff login.
//
// SECURITY: reuses _lib/fileSignature.js for real-byte verification of
// the INPUT photo, same as every other upload path in this app. Same
// auth pattern as product-photo-intake.js (admin/operations only).
//
// Required Cloudflare env vars: SUPABASE_URL, SUPABASE_SERVICE_KEY,
//   GEMINI_API_KEY
//
// POST JSON body: { token, imageBase64, gender: 'female' | 'male' }
// -----------------------------------------------------------------------

import { validateFileType } from './_lib/fileSignature.js';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']; // matches product-photos bucket's own allowlist
const EXT_BY_MIME = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
const MAX_BASE64_LEN = 15 * 1024 * 1024 * 1.4; // ~15MB raw, accounting for base64 inflation

const GEMINI_MODEL = 'gemini-3.1-flash-image'; // standard Nano Banana 2, not Lite -- see file header
// (redeploy trigger 24 Sep 2026 -- forcing Cloudflare to pick up the updated GEMINI_API_KEY env var, which only applies on the next deploy, not retroactively)

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

function buildPrompt(gender) {
  const modelDesc = gender === 'male' ? 'a male fashion model' : 'a female fashion model';
  return `You are given a photo of a single garment or outfit from Pooja's Couture, a South Asian bridal and occasion-wear boutique. Generate a realistic, professional fashion photograph of ${modelDesc} wearing this EXACT garment -- preserve the actual fabric, colour, embroidery, embellishment, and silhouette shown in the source photo precisely, do not redesign or reinterpret it. Studio lighting, clean neutral background, full-body or three-quarter shot, the kind of image a boutique would use on its own product listing. Do not add any text, watermark, or logo to the image.`;
}

export async function onRequestPost(context) {
  const { env, request } = context;

  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_KEY || !env.GEMINI_API_KEY) {
    return jsonResponse({ error: 'Server misconfiguration -- GEMINI_API_KEY may not be set yet.' }, 500);
  }

  let body;
  try { body = await request.json(); } catch { return jsonResponse({ error: 'Invalid JSON body.' }, 400); }

  // --- Auth: admin/operations only, same as product-photo-intake.js ---
  // (this endpoint spends real money per call, unlike most of this app)
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
  const empRes = await fetch(env.SUPABASE_URL + '/rest/v1/employees?email=eq.' + encodeURIComponent(callerEmail) + '&select=app_role', { headers: svcHeaders });
  const empRows = empRes.ok ? await empRes.json() : [];
  const role = empRows[0] ? empRows[0].app_role : null;
  if (!['admin', 'operations'].includes(role)) {
    return jsonResponse({ error: 'Not authorized to use this feature' }, 403);
  }

  // --- Gender selector: default to female, only 'male' flips it ---
  const gender = body.gender === 'male' ? 'male' : 'female';

  // --- Validate the INPUT garment photo, same as every other upload path ---
  const imageBase64 = body.imageBase64;
  if (!imageBase64 || imageBase64.length < 100) {
    return jsonResponse({ error: 'No image data' }, 400);
  }
  if (imageBase64.length > MAX_BASE64_LEN) {
    return jsonResponse({ error: 'Image too large (max ~15MB).' }, 413);
  }

  const binary = atob(imageBase64.replace(/^data:[^,]+,/, ''));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

  const check = validateFileType(bytes, ALLOWED_TYPES);
  if (!check.valid) {
    return jsonResponse({ error: 'File rejected: ' + check.reason }, 400);
  }
  const verifiedType = check.mimeType;
  const cleanBase64 = imageBase64.replace(/^data:[^,]+,/, '');

  // --- 1. Call Gemini (real, documented generateContent endpoint) ---
  let generatedBytes, generatedMime;
  try {
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
      {
        method: 'POST',
        headers: {
          'x-goog-api-key': env.GEMINI_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{
            parts: [
              { inline_data: { mime_type: verifiedType, data: cleanBase64 } },
              { text: buildPrompt(gender) }
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
      return jsonResponse({ error: 'Gemini did not return an image. Try a clearer garment photo.' }, 502);
    }
    generatedMime = inline.mimeType || inline.mime_type || 'image/png';
    const genBinary = atob(inline.data);
    generatedBytes = new Uint8Array(genBinary.length);
    for (let i = 0; i < genBinary.length; i++) generatedBytes[i] = genBinary.charCodeAt(i);
  } catch (err) {
    return jsonResponse({ error: 'Generation request failed: ' + String(err) }, 502);
  }

  // --- 2. Store the generated image in the existing product-photos bucket ---
  const ext = EXT_BY_MIME[generatedMime] || 'png';
  const path = 'generated/' + crypto.randomUUID() + '.' + ext;
  const upRes = await fetch(env.SUPABASE_URL + '/storage/v1/object/product-photos/' + path, {
    method: 'POST',
    headers: { ...svcHeaders, 'Content-Type': generatedMime, 'x-upsert': 'false' },
    body: generatedBytes
  });
  if (!upRes.ok) {
    return jsonResponse({ error: 'Storage upload failed: ' + (await upRes.text()).slice(0, 200) }, 502);
  }
  const photoUrl = env.SUPABASE_URL + '/storage/v1/object/public/product-photos/' + path;

  return jsonResponse({ ok: true, photoUrl, gender });
}
