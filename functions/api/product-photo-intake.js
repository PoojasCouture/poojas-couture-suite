// functions/api/product-photo-intake.js
// -----------------------------------------------------------------------
// "Take a picture, fill in the details" for the Stock & Inventory tab.
// Uploads a real photo of a garment/item to the `product-photos` bucket,
// then asks Claude to look at that SAME photo and extract the fields
// that are actually visually determinable — category, a product title,
// and a rich description covering fabric, colour, embroidery/zari/thread
// work, and (if the photo shows a multi-piece set — e.g. lehenga +
// blouse + dupatta/petticoat on one hanger) a per-piece breakdown.
//
// 2026-09-13 UPDATE: extraction deepened per Himanshu's request — fabric,
// colour, and embroidery/zari/work detail, plus per-piece breakdown for
// sets. Deliberately still returns only {category, title, description} —
// no new form fields/DB columns added this pass. The extra detail is
// folded into the description as structured, readable text (one line per
// piece when it's a set) rather than expanding the schema. Simpler,
// faster to ship, and the description field is already free text that
// gets shown/searched everywhere a new field wouldn't be. Revisit if
// per-piece *rows* (not just per-piece *text*) turn out to be needed.
//
// HONEST LIMIT, BY DESIGN: this deliberately does NOT return costPrice,
// price, quantity, or status. Those aren't visible in a photo — they're
// business decisions (what you paid, what you're charging, how many you
// have). Having Claude guess numbers and presenting them as real data
// would be actively worse than leaving them blank for a human to fill
// in. The frontend pre-fills only what this endpoint actually returns.
//
// SECURITY: reuses _lib/fileSignature.js — the same real-byte
// verification already built and tested for upload-photo.js and
// document-intake.js — rather than re-implementing type checking a
// third time. Same auth pattern as document-intake.js (admin/operations
// only, matching who can actually add/edit products in products.js).
//
// Required Cloudflare env vars: SUPABASE_URL, SUPABASE_SERVICE_KEY,
//   ANTHROPIC_API_KEY (already configured — same key ai-team.js uses)
//
// POST JSON body: { token, imageBase64 }
// -----------------------------------------------------------------------

import { validateFileType } from './_lib/fileSignature.js';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']; // matches the product-photos bucket's own allowlist exactly
const EXT_BY_MIME = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
const MAX_BASE64_LEN = 15 * 1024 * 1024 * 1.4; // ~15MB raw, accounting for base64 inflation — matches the bucket's own limit

const CATEGORIES = ['Bridal Set', 'Groom Set', 'Menswear', 'Jewellery', 'Purse', 'Footwear', 'Accessory'];

const EXTRACTION_SYSTEM = `You are looking at a real photo of item(s) for Pooja's Couture, a South Asian bridal and occasion-wear boutique in Sydney, for their inventory catalog. You are examining stock — hanging garments, flat-laid pieces, or product shots — not people modelling clothes.

Extract ONLY what you can actually see in the photo. Respond with ONLY a JSON object, no other text, no markdown fences, in exactly this shape:
{
  "category": one of ${JSON.stringify(CATEGORIES)} — pick the single closest match to what's shown overall,
  "title": a short, specific product name a boutique would use, e.g. "Ivory Silk Bridal Lehenga" or "Gold Embroidered Bridal Sneakers",
  "description": a stock note for a boutique owner, not marketing copy — see rules below
}

DESCRIPTION — be as specific as the photo actually allows:
- Fabric: name the fabric type if identifiable (silk, georgette, velvet, net, raw silk, organza, chiffon, brocade, etc.). Say "fabric unclear from photo" rather than guessing if you can't tell.
- Colour(s): name the actual colour(s), including any contrast/dual-tone colour combinations visible.
- Work/embroidery: describe what kind of embellishment is visible and roughly how much of the garment it covers — e.g. zari (gold/silver metallic thread) work, zardozi, resham (silk thread) embroidery, sequins, beadwork, mirror work (shisha), stone/kundan work, gota patti, thread tassels, cutdana, or plain/unembellished if that's what it is. Don't invent a specific technique you can't actually distinguish in the photo — say "metallic embroidered border" rather than naming a technique you're not confident about.
- Any visible style/size detail: neckline, sleeve style, border/hemline design, visible size tag, etc., if clearly visible.

MULTI-PIECE SETS: if the photo shows more than one distinct garment piece together as a set (e.g. lehenga skirt + blouse + dupatta, or a sherwani + inner kurta, or an outfit with a matching petticoat/pants), describe EACH piece on its own line inside the description, prefixed with the piece name, e.g.:
"Lehenga: raw silk, deep maroon, heavy gold zari border on the hem.
Blouse: matching maroon silk, gold zari work on sleeves and neckline, sweetheart neck.
Dupatta: net, gold zari border, scalloped edge."
If it's genuinely a single piece (one sneaker pair, one purse, one kurta with no visible separate pieces), write the description as normal flowing sentences, no per-piece breakdown needed.

Keep the overall description tight — a boutique owner should be able to read it in a few seconds, not a paragraph of marketing prose. 1-2 sentences per piece is enough.

If the photo doesn't clearly show a sellable item (blurry, not clothing/accessories at all), set "category" to "Accessory", "title" to "Needs manual review", and explain what's wrong in "description" instead of guessing.

Never include a price, cost, or quantity in your response — you cannot see those in a photo, and guessing would be actively misleading in a real inventory system.`;

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

export async function onRequestPost(context) {
  const { env, request } = context;

  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_KEY || !env.ANTHROPIC_API_KEY) {
    return jsonResponse({ error: 'Server misconfiguration' }, 500);
  }

  let body;
  try { body = await request.json(); } catch { return jsonResponse({ error: 'Invalid JSON body.' }, 400); }

  // --- Auth: same pattern as document-intake.js — admin/operations only,
  //     matching who can actually add/edit products in products.js ---
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

  // --- Validate the photo itself, same as every other upload path ---
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
  // Kept as a plain base64 string for the Claude API call below — the
  // client already sent it this way, no need to re-decode-then-re-encode
  // through bytes. (An earlier draft of this file did exactly that via
  // `btoa(String.fromCharCode(...bytes))`, which spreads every byte as a
  // function argument — fine in a small test, but blows past the JS
  // engine's argument-count limit on any real phone photo of a few MB.
  // Caught before shipping, not after.)
  const cleanBase64 = imageBase64.replace(/^data:[^,]+,/, '');

  // --- 1. Store the photo (verified type, never the client's claim) ---
  const ext = EXT_BY_MIME[verifiedType] || 'jpg';
  const path = crypto.randomUUID() + '.' + ext;
  const upRes = await fetch(env.SUPABASE_URL + '/storage/v1/object/product-photos/' + path, {
    method: 'POST',
    headers: { ...svcHeaders, 'Content-Type': verifiedType, 'x-upsert': 'false' },
    body: bytes
  });
  if (!upRes.ok) {
    return jsonResponse({ error: 'Storage upload failed: ' + (await upRes.text()).slice(0, 200) }, 502);
  }
  const photoUrl = env.SUPABASE_URL + '/storage/v1/object/public/product-photos/' + path;

  // --- 2. Ask Claude to look at the SAME verified bytes and extract fields ---
  let extraction;
  try {
    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 900, // bumped from 500 — per-piece breakdowns for multi-garment sets need more room
        system: EXTRACTION_SYSTEM,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: verifiedType, data: cleanBase64 } },
            { type: 'text', text: 'Extract the fields for this item (or set of pieces).' }
          ]
        }]
      })
    });
    const claudeData = await claudeRes.json();
    if (!claudeRes.ok) {
      return jsonResponse({ error: 'Extraction failed: ' + (claudeData.error?.message || 'unknown'), photoUrl }, 502);
    }
    const raw = claudeData.content?.[0]?.text || '';
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    extraction = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
    if (!extraction || !extraction.category || !extraction.title) {
      return jsonResponse({ error: 'Could not parse a usable result from the photo. Try a clearer photo.', photoUrl }, 502);
    }
    if (!CATEGORIES.includes(extraction.category)) extraction.category = 'Accessory';
  } catch (err) {
    return jsonResponse({ error: 'Extraction failed: ' + String(err), photoUrl }, 502);
  }

  return jsonResponse({
    ok: true,
    photoUrl,
    category: extraction.category,
    title: extraction.title,
    description: extraction.description || ''
  });
}
