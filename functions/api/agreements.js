// functions/api/agreements.js
// -----------------------------------------------------------------------
// Server-side handler for the Client Service Agreement e-signature flow.
// This is the ONE place with permission to use the Supabase service-role
// key against the `client_agreements` table.
//
// Two callers hit this file:
//   1. The public signing page (sign-agreement.html) — NOT logged in,
//      identified only by a random token in the agreement's URL.
//      Actions: 'get' (fetch agreement by token), 'clientSign'.
//   2. The main app (crm.js), logged in as staff — Actions: 'create'
//      (called right after an invoice is generated), 'poojaCountersign'
//      (admin/operations only, only once status = 'Client Signed').
//
// Required Cloudflare env vars: SUPABASE_URL, SUPABASE_SERVICE_KEY
//
// POST JSON body: { action, ...actionParams }
//   'get'              — { token }                      — public
//   'clientSign'        — { token, signatureText }        — public
//   'create'             — { authToken, invoiceId, orderId, projectId,
//                            clientId, clientName, poojaName }  — staff auth
//   'poojaCountersign'   — { authToken, agreementId, signatureText } — staff auth, admin/operations only
// -----------------------------------------------------------------------

function randomToken() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}

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

// Public-safe view of an agreement — never expose internal ids to the
// signing page beyond what it needs to render and submit a signature.
function publicView(a) {
  return {
    id: a.id,
    clientName: a.clientName,
    poojaName: a.poojaName,
    status: a.status,
    clientSignedAt: a.clientSignedAt,
    clientSignatureText: a.clientSignatureText,
    poojaSignedAt: a.poojaSignedAt,
    poojaSignatureText: a.poojaSignatureText
  };
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
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ ok: false, error: 'POST only' }), { status: 405, headers: corsHeaders });
  }
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_KEY) {
    return new Response(JSON.stringify({ ok: false, error: 'Missing env vars' }), { status: 500, headers: corsHeaders });
  }

  const SB = env.SUPABASE_URL;
  const SVC = env.SUPABASE_SERVICE_KEY;
  const svcHeaders = { 'Authorization': 'Bearer ' + SVC, 'apikey': SVC, 'Content-Type': 'application/json' };

  function fail(error, status = 400) {
    return new Response(JSON.stringify({ ok: false, error }), { status, headers: corsHeaders });
  }
  function ok(data) {
    return new Response(JSON.stringify({ ok: true, ...data }), { status: 200, headers: corsHeaders });
  }

  let body;
  try { body = await request.json(); } catch { return fail('Invalid JSON body'); }
  const { action } = body;
  if (!action) return fail('Missing action');

  async function getAgreementByToken(token) {
    const res = await fetch(SB + '/rest/v1/client_agreements?token=eq.' + encodeURIComponent(token) + '&select=*', { headers: svcHeaders });
    const rows = res.ok ? await res.json() : [];
    return rows[0] ? rowToApp(rows[0]) : null;
  }
  async function getAgreementById(id) {
    const res = await fetch(SB + '/rest/v1/client_agreements?id=eq.' + id + '&select=*', { headers: svcHeaders });
    const rows = res.ok ? await res.json() : [];
    return rows[0] ? rowToApp(rows[0]) : null;
  }
  async function patchAgreement(id, patch) {
    const res = await fetch(SB + '/rest/v1/client_agreements?id=eq.' + id, {
      method: 'PATCH',
      headers: { ...svcHeaders, 'Prefer': 'return=representation' },
      body: JSON.stringify(appToRow({ ...patch, updatedAt: new Date().toISOString() }))
    });
    if (!res.ok) throw new Error('Agreement update failed: ' + res.status + ' ' + (await res.text()).slice(0, 300));
    const rows = await res.json();
    return rowToApp(rows[0]);
  }

  // --- Staff-auth check, only needed for 'create' and 'poojaCountersign' ---
  async function requireStaff(minRole) {
    const authToken = body.authToken;
    if (!authToken) return { error: fail('Missing auth token', 401) };
    const userRes = await fetch(SB + '/auth/v1/user', { headers: { 'Authorization': 'Bearer ' + authToken, 'apikey': SVC } });
    if (!userRes.ok) return { error: fail('Invalid or expired session', 401) };
    const userData = await userRes.json();
    const callerEmail = userData.email;
    if (!callerEmail) return { error: fail('Could not resolve caller identity', 401) };

    const empRes = await fetch(SB + '/rest/v1/employees?email=eq.' + encodeURIComponent(callerEmail) + '&select=app_role', { headers: svcHeaders });
    const empRows = empRes.ok ? await empRes.json() : [];
    const role = empRows[0] ? empRows[0].app_role : null;

    if (minRole === 'admin_or_operations' && role !== 'admin' && role !== 'operations') {
      return { error: fail('Not authorized', 403) };
    }
    return { role, callerEmail };
  }

  try {
    switch (action) {

      // ---------------------------------------------------------------
      // Called by crm.js right after an invoice is created, or on demand
      // from the invoice panel if no agreement exists yet.
      case 'create': {
        const auth = await requireStaff(null);
        if (auth.error) return auth.error;

        const { invoiceId, orderId, projectId, clientId, clientName, poojaName } = body;
        if (!invoiceId || !clientName) return fail('Missing invoiceId or clientName');

        // Reuse an existing agreement for this invoice instead of creating duplicates.
        const existingRes = await fetch(SB + '/rest/v1/client_agreements?invoice_id=eq.' + invoiceId + '&select=*', { headers: svcHeaders });
        const existingRows = existingRes.ok ? await existingRes.json() : [];
        if (existingRows[0]) return ok({ agreement: rowToApp(existingRows[0]) });

        const token = randomToken();
        const insertRes = await fetch(SB + '/rest/v1/client_agreements', {
          method: 'POST',
          headers: { ...svcHeaders, 'Prefer': 'return=representation' },
          body: JSON.stringify(appToRow({
            invoiceId, orderId: orderId || null, projectId: projectId || null,
            clientId: clientId || null, clientName, poojaName: poojaName || 'Pooja Shah',
            token, status: 'Pending'
          }))
        });
        if (!insertRes.ok) return fail('Failed to create agreement: ' + (await insertRes.text()).slice(0, 300), 502);
        const rows = await insertRes.json();
        return ok({ agreement: rowToApp(rows[0]) });
      }

      // ---------------------------------------------------------------
      // Staff — fetch by invoiceId for the Order Summary panel to show
      // status. Any logged-in staff member can view (read-only).
      case 'getByInvoice': {
        const auth = await requireStaff(null);
        if (auth.error) return auth.error;
        const { invoiceId } = body;
        if (!invoiceId) return fail('Missing invoiceId');
        const res = await fetch(SB + '/rest/v1/client_agreements?invoice_id=eq.' + invoiceId + '&select=*', { headers: svcHeaders });
        const rows = res.ok ? await res.json() : [];
        return ok({ agreement: rows[0] ? rowToApp(rows[0]) : null });
      }

      // ---------------------------------------------------------------
      // Public — fetch by token for the signing page to render.
      case 'get': {
        const { token } = body;
        if (!token) return fail('Missing token');
        const agreement = await getAgreementByToken(token);
        if (!agreement) return fail('Agreement not found', 404);
        return ok({ agreement: publicView(agreement) });
      }

      // ---------------------------------------------------------------
      // Public — client submits their typed signature. Date is set
      // server-side (now()), never trusted from the client's browser.
      case 'clientSign': {
        const { token, signatureText } = body;
        if (!token || !signatureText || !signatureText.trim()) return fail('Missing token or signature');
        const agreement = await getAgreementByToken(token);
        if (!agreement) return fail('Agreement not found', 404);
        if (agreement.status !== 'Pending') return fail('This agreement has already been signed.', 409);

        const updated = await patchAgreement(agreement.id, {
          clientSignatureText: signatureText.trim(),
          clientSignedAt: new Date().toISOString(),
          status: 'Client Signed'
        });
        return ok({ agreement: publicView(updated) });
      }

      // ---------------------------------------------------------------
      // Staff (admin/operations) — Pooja countersigns after receiving
      // the client-signed copy. Only allowed once the client has signed.
      case 'poojaCountersign': {
        const auth = await requireStaff('admin_or_operations');
        if (auth.error) return auth.error;

        const { agreementId, signatureText } = body;
        if (!agreementId || !signatureText || !signatureText.trim()) return fail('Missing agreementId or signature');
        const agreement = await getAgreementById(agreementId);
        if (!agreement) return fail('Agreement not found', 404);
        if (agreement.status !== 'Client Signed') return fail('Client has not signed yet — cannot countersign.', 409);

        const updated = await patchAgreement(agreement.id, {
          poojaSignatureText: signatureText.trim(),
          poojaSignedAt: new Date().toISOString(),
          status: 'Fully Executed'
        });
        return ok({ agreement: rowToApp(updated) });
      }

      default:
        return fail('Unknown action: ' + action, 400);
    }
  } catch (err) {
    return fail('Unexpected server error: ' + String(err), 500);
  }
}
