// functions/api/document-intake.js
// -----------------------------------------------------------------------
// Lets Pooja upload a source document (scope-of-work PDF, an old scanned
// invoice, a photo of a paper invoice, a Word doc) against an order or an
// invoice, optionally have Claude extract structured fields from it, and
// review/apply those fields into a real order/invoice record.
//
// IMPORTANT LIMITATION, read before relying on this for Word docs:
// Claude's API can read PDFs and images directly, but NOT .docx files.
// For a .docx upload, this function stores it as a reference document
// only — 'extract' will return a clear error rather than silently doing
// nothing or guessing. If Word-doc extraction is needed later, the doc
// would need to be converted to PDF first (not implemented here).
//
// Required Cloudflare env vars: SUPABASE_URL, SUPABASE_SERVICE_KEY,
// ANTHROPIC_API_KEY (already set up for the AI Studio Team feature —
// this function reuses the same key).
// -----------------------------------------------------------------------

const ANTHROPIC_VERSION = '2023-06-01';
const MODEL = 'claude-sonnet-4-6';

function toCamel(s) { return s.replace(/_([a-z])/g, (_, c) => c.toUpperCase()); }
function toSnake(s) { return s.replace(/[A-Z]/g, c => '_' + c.toLowerCase()); }
function rowToApp(row) {
  if (!row || typeof row !== 'object') return row;
  const out = {};
  for (const k in row) out[toCamel(k)] = row[k];
  return out;
}
function appToRow(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const out = {};
  for (const k in obj) out[toSnake(k)] = obj[k];
  return out;
}

export async function onRequest(context) {
  const { env, request } = context;
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };
  if (request.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (request.method !== 'POST') return new Response(JSON.stringify({ ok: false, error: 'POST only' }), { status: 405, headers: corsHeaders });
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_KEY) {
    return new Response(JSON.stringify({ ok: false, error: 'Missing SUPABASE env vars' }), { status: 500, headers: corsHeaders });
  }

  const SB = env.SUPABASE_URL;
  const SVC = env.SUPABASE_SERVICE_KEY;
  const svcHeaders = { 'Authorization': 'Bearer ' + SVC, 'apikey': SVC, 'Content-Type': 'application/json' };

  function fail(error, status = 400) { return new Response(JSON.stringify({ ok: false, error }), { status, headers: corsHeaders }); }
  function ok(data) { return new Response(JSON.stringify({ ok: true, ...data }), { status: 200, headers: corsHeaders }); }

  let body;
  try { body = await request.json(); } catch { return fail('Invalid JSON body'); }
  const { action, token } = body;
  if (!action) return fail('Missing action');
  if (!token) return fail('Missing auth token', 401);

  // --- Verify caller + role, same pattern as functions/api/invoicing.js ---
  const userRes = await fetch(SB + '/auth/v1/user', { headers: { 'Authorization': 'Bearer ' + token, 'apikey': SVC } });
  if (!userRes.ok) return fail('Invalid or expired session', 401);
  const userData = await userRes.json();
  const callerEmail = userData.email;
  if (!callerEmail) return fail('Could not resolve caller identity', 401);

  const empRes = await fetch(SB + '/rest/v1/employees?email=eq.' + encodeURIComponent(callerEmail) + '&select=app_role,name', { headers: svcHeaders });
  const empRows = empRes.ok ? await empRes.json() : [];
  let role = empRows[0] ? empRows[0].app_role : null;
  let callerName = empRows[0] ? empRows[0].name : callerEmail;
  if (!role) {
    const vendRes = await fetch(SB + '/rest/v1/vendors?email=eq.' + encodeURIComponent(callerEmail) + '&select=app_role,name', { headers: svcHeaders });
    const vendRows = vendRes.ok ? await vendRes.json() : [];
    role = vendRows[0] ? vendRows[0].app_role : null;
    callerName = vendRows[0] ? vendRows[0].name : callerEmail;
  }
  if (role !== 'admin' && role !== 'operations') return fail('Not authorized to manage documents', 403);

  try {
    switch (action) {

      // ---------------------------------------------------------------
      // Upload a file, create its intake_documents row.
      // body: { kind: 'order'|'invoice', orderId?, invoiceId?, fileBase64, fileName, mimeType }
      // ---------------------------------------------------------------
      case 'upload': {
        const { kind, orderId, invoiceId, fileBase64, fileName, mimeType } = body;
        if (!['order', 'invoice'].includes(kind)) return fail('kind must be "order" or "invoice"');
        if (!fileBase64 || fileBase64.length < 50) return fail('No file data');
        if (fileBase64.length > 18 * 1024 * 1024) return fail('File too large (max ~13MB)', 413);

        const binary = atob(fileBase64.replace(/^data:[^,]+,/, ''));
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

        const ext = (fileName.split('.').pop() || 'bin').toLowerCase();
        const path = kind + 's/' + crypto.randomUUID() + '.' + ext;

        const upRes = await fetch(SB + '/storage/v1/object/intake-docs/' + path, {
          method: 'POST',
          headers: { 'Authorization': 'Bearer ' + SVC, 'apikey': SVC, 'Content-Type': mimeType || 'application/octet-stream', 'x-upsert': 'false' },
          body: bytes
        });
        if (!upRes.ok) return fail('Storage upload failed: ' + (await upRes.text()).slice(0, 200), 502);

        const fileUrl = SB + '/storage/v1/object/public/intake-docs/' + path;

        const insertPayload = appToRow({
          kind, orderId: orderId || null, invoiceId: invoiceId || null,
          fileName, fileUrl, mimeType: mimeType || 'application/octet-stream',
          extractionStatus: 'uploaded', uploadedBy: callerName
        });
        const insRes = await fetch(SB + '/rest/v1/intake_documents', {
          method: 'POST', headers: { ...svcHeaders, 'Prefer': 'return=representation' }, body: JSON.stringify(insertPayload)
        });
        if (!insRes.ok) return fail('Could not save document record: ' + (await insRes.text()).slice(0, 200), 502);
        const rows = await insRes.json();
        return ok({ document: rowToApp(rows[0]) });
      }

      // ---------------------------------------------------------------
      // Ask Claude to extract structured fields from an uploaded PDF or image.
      // body: { documentId }
      // ---------------------------------------------------------------
      case 'extract': {
        const { documentId } = body;
        const docRes = await fetch(SB + '/rest/v1/intake_documents?id=eq.' + documentId + '&select=*', { headers: svcHeaders });
        const docRows = docRes.ok ? await docRes.json() : [];
        const doc = docRows[0] ? rowToApp(docRows[0]) : null;
        if (!doc) return fail('Document not found', 404);

        const mime = doc.mimeType || '';
        const isPdf = mime === 'application/pdf';
        const isImage = mime.startsWith('image/');
        if (!isPdf && !isImage) {
          return fail('AI extraction only supports PDF and image files. Word documents can be attached as a reference but must be converted to PDF for auto-fill.', 422);
        }

        // Fetch the file back from storage as base64 for the Anthropic API
        const fileRes = await fetch(doc.fileUrl);
        if (!fileRes.ok) return fail('Could not re-fetch stored file', 502);
        const fileBuf = await fileRes.arrayBuffer();
        let fileB64 = '';
        {
          const bytes = new Uint8Array(fileBuf);
          const chunk = 8192;
          for (let i = 0; i < bytes.length; i += chunk) {
            fileB64 += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
          }
          fileB64 = btoa(fileB64);
        }

        const contentBlock = isPdf
          ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: fileB64 } }
          : { type: 'image', source: { type: 'base64', media_type: mime, data: fileB64 } };

        const prompt = doc.kind === 'order'
          ? 'Extract order details from this document for a bridal/occasion-wear couture boutique. Respond with ONLY a JSON object, no markdown fences, no commentary, matching exactly this shape: {"clientName": string, "garmentTitle": string, "price": number, "deadline": "YYYY-MM-DD" or null, "eventDate": "YYYY-MM-DD" or null, "notes": string}. If a field cannot be determined, use null for it. price must be a plain number (no currency symbols).'
          : 'Extract invoice details from this document for a bridal/occasion-wear couture boutique. Respond with ONLY a JSON object, no markdown fences, no commentary, matching exactly this shape: {"clientName": string, "invoiceNumber": string or null, "issueDate": "YYYY-MM-DD" or null, "items": [{"description": string, "unitPrice": number, "gst": number}], "shipping": number, "notes": string}. subtotal/gstTotal/total should NOT be included — they will be computed from items. All money fields must be plain numbers (no currency symbols).';

        const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': ANTHROPIC_VERSION },
          body: JSON.stringify({
            model: MODEL,
            max_tokens: 1500,
            messages: [{ role: 'user', content: [contentBlock, { type: 'text', text: prompt }] }]
          })
        });
        const claudeData = await anthropicRes.json();
        if (!anthropicRes.ok) {
          await fetch(SB + '/rest/v1/intake_documents?id=eq.' + documentId, {
            method: 'PATCH', headers: svcHeaders, body: JSON.stringify({ extraction_status: 'failed' })
          });
          return fail('Extraction failed: ' + (claudeData?.error?.message || 'Anthropic API error'), 502);
        }

        const textBlock = (claudeData.content || []).find(b => b.type === 'text');
        let extracted;
        try {
          const raw = (textBlock?.text || '').trim().replace(/^```json\s*/i, '').replace(/```\s*$/, '');
          extracted = JSON.parse(raw);
        } catch (e) {
          await fetch(SB + '/rest/v1/intake_documents?id=eq.' + documentId, {
            method: 'PATCH', headers: svcHeaders, body: JSON.stringify({ extraction_status: 'failed' })
          });
          return fail('Claude did not return valid JSON — try again or enter details manually.', 502);
        }

        await fetch(SB + '/rest/v1/intake_documents?id=eq.' + documentId, {
          method: 'PATCH', headers: svcHeaders, body: JSON.stringify({ extraction_status: 'extracted', extracted_data: extracted })
        });
        return ok({ extracted });
      }

      // ---------------------------------------------------------------
      // Link an already-uploaded document to the order/invoice that was
      // just created from its extracted data (or manually, afterward).
      // ---------------------------------------------------------------
      case 'link': {
        const { documentId, orderId, invoiceId } = body;
        const patch = {};
        if (orderId) patch.order_id = orderId;
        if (invoiceId) patch.invoice_id = invoiceId;
        patch.extraction_status = 'applied';
        const res = await fetch(SB + '/rest/v1/intake_documents?id=eq.' + documentId, {
          method: 'PATCH', headers: { ...svcHeaders, 'Prefer': 'return=representation' }, body: JSON.stringify(patch)
        });
        if (!res.ok) return fail('Could not link document: ' + (await res.text()).slice(0, 200), 502);
        const rows = await res.json();
        return ok({ document: rowToApp(rows[0]) });
      }

      // ---------------------------------------------------------------
      // List documents attached to a given order or invoice.
      // ---------------------------------------------------------------
      case 'list': {
        const { orderId, invoiceId } = body;
        const filterField = orderId ? 'order_id' : 'invoice_id';
        const filterValue = orderId || invoiceId;
        if (!filterValue) return fail('orderId or invoiceId required');
        const res = await fetch(SB + '/rest/v1/intake_documents?' + filterField + '=eq.' + filterValue + '&select=*&order=created_at.desc', { headers: svcHeaders });
        const rows = res.ok ? await res.json() : [];
        return ok({ documents: rows.map(rowToApp) });
      }

      // ---------------------------------------------------------------
      case 'delete': {
        const { documentId } = body;
        const res = await fetch(SB + '/rest/v1/intake_documents?id=eq.' + documentId, { method: 'DELETE', headers: svcHeaders });
        if (!res.ok) return fail('Delete failed', 502);
        return ok({});
      }

      default:
        return fail('Unknown action: ' + action);
    }
  } catch (e) {
    return fail('Server error: ' + e.message, 500);
  }
}
