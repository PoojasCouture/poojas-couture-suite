// functions/api/invoicing.js
// -----------------------------------------------------------------------
// Server-side enforcement layer for all invoice writes. This is the ONE
// place with permission to use the Supabase service-role key against the
// `invoices` table. js/invoicing.js on the client still exists — it does
// the same math for instant UI feedback — but every actual write now goes
// through here first, so a compromised/malicious browser session cannot
// bypass business rules (Paid-lock, milestone math, GST) the way it could
// when invoicing.js talked to Supabase directly with the anon key.
//
// Required Cloudflare env vars: SUPABASE_URL, SUPABASE_SERVICE_KEY
//
// POST JSON body: { action, token, ...actionParams }
//   token = the caller's Supabase auth access_token (from sb.auth.getSession())
//   action = one of: syncFromOrders | addShippingLine | recordMilestonePayment
//            | recordAdditionalPayment | markPaid | editDirect | deleteInvoice
//            | createForProject | createForOrder | createManual
// -----------------------------------------------------------------------

function r2(n) { return Math.round((n || 0) * 100) / 100; }
function statusFor(total, paid) {
  if (total > 0 && paid >= total) return 'Paid';
  if (paid > 0) return 'Partially Paid';
  return 'Draft';
}
function isLocked(invoice) { return !!invoice && invoice.status === 'Paid'; }

function buildMilestones(total, existingMilestones) {
  const existing = existingMilestones || [];
  const m1paid = existing[0] ? (existing[0].paidAmount || 0) : 0;
  const m1Nominal = r2(total * 0.30);
  const m1Shortfall = Math.max(0, r2(m1Nominal - m1paid));
  const m2 = r2(total * 0.40 + m1Shortfall);
  const m3 = Math.max(0, r2(total - m1Nominal - m2));
  const base = [
    { label: 'Milestone 1 — Deposit', paid: false, paidAmount: 0 },
    { label: 'Milestone 2 — Design Approval', paid: false, paidAmount: 0 },
    { label: 'Milestone 3 — Before Delivery', paid: false, paidAmount: 0 }
  ];
  const src = existing.length === 3 ? existing : base;
  return [
    { ...src[0], amount: m1Nominal },
    { ...src[1], amount: m2, rollover: m1Shortfall },
    { ...src[2], amount: m3 }
  ];
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
  const svcHeaders = {
    'Authorization': 'Bearer ' + SVC,
    'apikey': SVC,
    'Content-Type': 'application/json'
  };

  function fail(error, status = 400) {
    return new Response(JSON.stringify({ ok: false, error }), { status, headers: corsHeaders });
  }
  function ok(data) {
    return new Response(JSON.stringify({ ok: true, ...data }), { status: 200, headers: corsHeaders });
  }

  let body;
  try { body = await request.json(); } catch { return fail('Invalid JSON body'); }
  const { action, token } = body;
  if (!action) return fail('Missing action');
  if (!token) return fail('Missing auth token', 401);

  // --- 1. Verify caller identity via their Supabase session token ---
  const userRes = await fetch(SB + '/auth/v1/user', {
    headers: { 'Authorization': 'Bearer ' + token, 'apikey': SVC }
  });
  if (!userRes.ok) return fail('Invalid or expired session', 401);
  const userData = await userRes.json();
  const callerEmail = userData.email;
  if (!callerEmail) return fail('Could not resolve caller identity', 401);

  // --- 2. Check role — mirrors the RLS policies already on `invoices` ---
  const empRes = await fetch(
    SB + '/rest/v1/employees?email=eq.' + encodeURIComponent(callerEmail) + '&select=app_role',
    { headers: svcHeaders }
  );
  const empRows = empRes.ok ? await empRes.json() : [];
  let role = empRows[0] ? empRows[0].app_role : null;

  if (!role) {
    const vendRes = await fetch(
      SB + '/rest/v1/vendors?email=eq.' + encodeURIComponent(callerEmail) + '&select=app_role',
      { headers: svcHeaders }
    );
    const vendRows = vendRes.ok ? await vendRes.json() : [];
    role = vendRows[0] ? vendRows[0].app_role : null;
  }

  const canWrite = role === 'admin' || role === 'operations';
  const canUpdateOnly = canWrite || role === 'logistics';
  if (!canUpdateOnly) return fail('Not authorized to modify invoices', 403);

  // --- naming-convention bridge ---
  // The app's JS objects use camelCase (amountPaid, projectId, orderCode...)
  // but the actual Postgres columns are snake_case (amount_paid, project_id,
  // order_code...) — exactly like Store.rowToApp/appToRow do on the client.
  // Every REST call below MUST go through these, or PostgREST rejects the
  // request outright (unknown column) — which is exactly what was happening.
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

  // --- helpers against Supabase REST ---
  async function getInvoiceById(id) {
    const res = await fetch(SB + '/rest/v1/invoices?id=eq.' + id + '&select=*', { headers: svcHeaders });
    const rows = res.ok ? await res.json() : [];
    return rows[0] ? rowToApp(rows[0]) : null;
  }
  async function getOrderById(id) {
    const res = await fetch(SB + '/rest/v1/orders?id=eq.' + id + '&select=*', { headers: svcHeaders });
    const rows = res.ok ? await res.json() : [];
    return rows[0] ? rowToApp(rows[0]) : null;
  }
  async function getOrdersByProject(projectId) {
    const res = await fetch(SB + '/rest/v1/orders?project_id=eq.' + projectId + '&select=*', { headers: svcHeaders });
    const rows = res.ok ? await res.json() : [];
    return rows.map(rowToApp);
  }
  async function getInvoiceByProject(projectId) {
    const res = await fetch(SB + '/rest/v1/invoices?project_id=eq.' + projectId + '&select=*', { headers: svcHeaders });
    const rows = res.ok ? await res.json() : [];
    return rows[0] ? rowToApp(rows[0]) : null;
  }
  async function getInvoiceByOrder(orderId) {
    const res = await fetch(SB + '/rest/v1/invoices?order_id=eq.' + orderId + '&select=*', { headers: svcHeaders });
    const rows = res.ok ? await res.json() : [];
    return rows[0] ? rowToApp(rows[0]) : null;
  }
  async function patchInvoice(id, patch) {
    const res = await fetch(SB + '/rest/v1/invoices?id=eq.' + id, {
      method: 'PATCH',
      headers: { ...svcHeaders, 'Prefer': 'return=representation' },
      body: JSON.stringify(appToRow(patch))
    });
    if (!res.ok) throw new Error('Invoice update failed: ' + res.status + ' ' + (await res.text()).slice(0, 300));
    const rows = await res.json();
    return rowToApp(rows[0]);
  }
  async function insertInvoice(data) {
    const res = await fetch(SB + '/rest/v1/invoices', {
      method: 'POST',
      headers: { ...svcHeaders, 'Prefer': 'return=representation' },
      body: JSON.stringify(appToRow(data))
    });
    if (!res.ok) throw new Error('Invoice create failed: ' + res.status + ' ' + (await res.text()).slice(0, 300));
    const rows = await res.json();
    return rowToApp(rows[0]);
  }
  async function patchProject(id, patch) {
    await fetch(SB + '/rest/v1/order_projects?id=eq.' + id, {
      method: 'PATCH', headers: svcHeaders, body: JSON.stringify(appToRow(patch))
    });
  }

  try {
    switch (action) {

      // ---------------------------------------------------------------
      case 'syncFromOrders': {
        const { orderId } = body;
        const o = await getOrderById(orderId);
        if (!o) return fail('Order not found', 404);

        if (o.projectId) {
          const invoice = await getInvoiceByProject(o.projectId);
          if (!invoice) return fail('No invoice for this project', 404);
          if (isLocked(invoice)) return fail('Invoice is Paid and locked. Use Edit Invoice Directly to override.', 409);

          const subOrders = await getOrdersByProject(o.projectId);
          const newExGST = r2(subOrders.reduce((s, x) => s + (x.price || 0), 0));
          const newGST = r2(newExGST * 0.10);
          const shipping = r2(invoice.shipping || 0);
          const newTotal = r2(newExGST + newGST + shipping);
          const paid = r2(invoice.amountPaid || 0);

          const items = subOrders.map(x => ({
            description: (x.orderCode ? x.orderCode + ' — ' : '') + x.title,
            quantity: 1, unitPrice: r2(x.price), gst: r2(x.price * 0.10), amount: r2(x.price * 1.10)
          }));
          const milestones = (invoice.milestones && invoice.milestones.length)
            ? buildMilestones(newTotal, invoice.milestones) : invoice.milestones;

          const updated = await patchInvoice(invoice.id, {
            items, subtotal: newExGST, gstTotal: newGST, shipping, total: newTotal,
            status: statusFor(newTotal, paid), milestones
          });
          await patchProject(o.projectId, { totalPrice: newExGST });
          return ok({ invoice: updated });
        } else {
          const invoice = await getInvoiceByOrder(orderId);
          if (!invoice) return fail('No invoice for this order', 404);
          if (isLocked(invoice)) return fail('Invoice is Paid and locked. Use Edit Invoice Directly to override.', 409);

          const newSub = r2(o.price || 0);
          const newGst = r2(newSub * 0.10);
          const garmentTotal = r2(newSub + newGst);
          const items = (invoice.items || []).slice();
          if (items.length > 0) items[0] = { ...items[0], description: o.title, unitPrice: newSub, gst: newGst, amount: garmentTotal };
          else items.push({ description: o.title, quantity: 1, unitPrice: newSub, gst: newGst, amount: garmentTotal });

          const extra = items.slice(1);
          const subtotal = r2(newSub + extra.reduce((s, it) => s + (it.unitPrice || 0), 0));
          const gstTotal = r2(newGst + extra.reduce((s, it) => s + (it.gst || 0), 0));
          const total = r2(subtotal + gstTotal);
          const paid = r2(invoice.amountPaid || 0);

          const updated = await patchInvoice(invoice.id, { items, subtotal, gstTotal, total, status: statusFor(total, paid) });
          return ok({ invoice: updated });
        }
      }

      // ---------------------------------------------------------------
      case 'addShippingLine': {
        const { invoiceId, description, shareAmount, gstRate } = body;
        const invoice = await getInvoiceById(invoiceId);
        if (!invoice) return fail('Invoice not found', 404);
        if (isLocked(invoice)) return fail('Invoice is Paid and locked.', 409);
        if ((invoice.items || []).some(it => it.isShipping)) return ok({ invoice, note: 'already added' });

        const rate = gstRate != null ? gstRate : 0.10;
        const share = r2(shareAmount);
        const lineGst = r2(share * rate);
        const lineTotal = r2(share + lineGst);
        const items = (invoice.items || []).slice();
        items.push({ description: description || 'Shipping', quantity: 1, unitPrice: share, gst: lineGst, amount: lineTotal, isShipping: true });

        const newSubtotal = r2((invoice.subtotal || 0) + share);
        const newGstTotal = r2((invoice.gstTotal || 0) + lineGst);
        const newTotal = r2((invoice.total || 0) + lineTotal);
        const paid = r2(invoice.amountPaid || 0);

        const updated = await patchInvoice(invoice.id, {
          items, subtotal: newSubtotal, gstTotal: newGstTotal, total: newTotal, status: statusFor(newTotal, paid)
        });
        return ok({ invoice: updated });
      }

      // ---------------------------------------------------------------
      case 'recordMilestonePayment': {
        const { invoiceId, milestoneIndex, amount, method, dateStr } = body;
        const invoice = await getInvoiceById(invoiceId);
        if (!invoice) return fail('Invoice not found', 404);
        const milestones = invoice.milestones || [];
        const m = milestones[milestoneIndex];
        if (!m) return fail('Milestone not found', 404);
        const amt = r2(amount);
        if (amt <= 0) return fail('Enter a payment amount greater than zero.');

        const shortfall = Math.max(0, r2((m.amount - (m.paidAmount || 0)) - amt));
        const updatedMilestones = milestones.map((ms, idx) => {
          if (idx === milestoneIndex) {
            const newPaidAmount = r2((ms.paidAmount || 0) + amt);
            return { ...ms, paidAmount: newPaidAmount, paid: newPaidAmount >= ms.amount };
          }
          if (idx === milestoneIndex + 1 && shortfall > 0) {
            return { ...ms, amount: r2(ms.amount + shortfall), rollover: r2((ms.rollover || 0) + shortfall) };
          }
          return ms;
        });

        const newTotalPaid = r2((invoice.amountPaid || 0) + amt);
        const note = m.label + ': ' + amt.toFixed(2) + ' via ' + (method || 'Unspecified') + ' on ' + (dateStr || new Date().toLocaleDateString('en-AU')) + '.';

        const updated = await patchInvoice(invoice.id, {
          amountPaid: newTotalPaid,
          status: statusFor(invoice.total, newTotalPaid),
          milestones: updatedMilestones,
          notes: (invoice.notes || '') + '\n' + note
        });
        return ok({ invoice: updated });
      }

      // ---------------------------------------------------------------
      case 'recordAdditionalPayment': {
        const { invoiceId, amount, method, dateStr } = body;
        const invoice = await getInvoiceById(invoiceId);
        if (!invoice) return fail('Invoice not found', 404);
        const amt = r2(amount);
        if (amt <= 0) return fail('Enter a payment amount greater than zero.');

        const newTotalPaid = r2((invoice.amountPaid || 0) + amt);
        const note = 'Payment: ' + amt.toFixed(2) + ' via ' + (method || 'Unspecified') + ' on ' + (dateStr || new Date().toLocaleDateString('en-AU')) + '.';

        const updated = await patchInvoice(invoice.id, {
          amountPaid: newTotalPaid,
          status: statusFor(invoice.total, newTotalPaid),
          notes: (invoice.notes || '') + '\n' + note
        });
        return ok({ invoice: updated });
      }

      // ---------------------------------------------------------------
      case 'markPaid': {
        const { invoiceId } = body;
        const invoice = await getInvoiceById(invoiceId);
        if (!invoice) return fail('Invoice not found', 404);
        const milestones = (invoice.milestones || []).map(ms => ({ ...ms, paid: true, paidAmount: ms.amount }));
        const updated = await patchInvoice(invoiceId, { status: 'Paid', amountPaid: invoice.total, milestones });
        return ok({ invoice: updated });
      }

      // ---------------------------------------------------------------
      case 'editDirect': {
        // Direct override — the one path allowed to touch a Paid invoice,
        // but restricted to admin/operations only, not logistics.
        if (!canWrite) return fail('Not authorized for direct invoice edits', 403);
        const { invoiceId, items, shipping, amountPaid, status } = body;
        const invoice = await getInvoiceById(invoiceId);
        if (!invoice) return fail('Invoice not found', 404);

        const subtotal = r2((items || []).reduce((s, it) => s + (it.unitPrice || 0) * (it.quantity || 1), 0));
        const gstTotal = r2((items || []).reduce((s, it) => s + (it.gst || 0), 0));
        const ship = r2(shipping || 0);
        const total = r2(subtotal + gstTotal + ship);
        const paid = r2(amountPaid != null ? amountPaid : (invoice.amountPaid || 0));
        const finalStatus = status || statusFor(total, paid);

        const updated = await patchInvoice(invoiceId, {
          items, subtotal, gstTotal, shipping: ship, total, amountPaid: paid, status: finalStatus
        });
        return ok({ invoice: updated });
      }

      // ---------------------------------------------------------------
      case 'deleteInvoice': {
        if (!canWrite) return fail('Not authorized to delete invoices', 403);
        const { invoiceId } = body;
        const res = await fetch(SB + '/rest/v1/invoices?id=eq.' + invoiceId, { method: 'DELETE', headers: svcHeaders });
        if (!res.ok) return fail('Delete failed: ' + res.status, 502);
        return ok({});
      }

      // ---------------------------------------------------------------
      case 'createForProject': {
        if (!canWrite) return fail('Not authorized to create invoices', 403);
        const { projectId, clientId, clientName, invoiceNumber, issueDate, dueDate, notes, shipping, useMilestones } = body;
        const subOrders = await getOrdersByProject(projectId);
        if (!subOrders.length) return fail('No garments in this project to invoice.');

        const subtotal = r2(subOrders.reduce((s, x) => s + (x.price || 0), 0));
        const gstTotal = r2(subtotal * 0.10);
        const ship = r2(shipping || 0);
        const total = r2(subtotal + gstTotal + ship);
        const items = subOrders.map(x => ({
          description: (x.orderCode ? x.orderCode + ' — ' : '') + x.title,
          quantity: 1, unitPrice: r2(x.price), gst: r2(x.price * 0.10), amount: r2(x.price * 1.10)
        }));

        const created = await insertInvoice({
          projectId, clientId: clientId || null, clientName: clientName || '',
          invoiceNumber, issueDate: issueDate || new Date().toISOString().slice(0, 10), dueDate: dueDate || null,
          items, subtotal, gstTotal, shipping: ship, total, status: 'Draft', amountPaid: 0,
          milestones: useMilestones === false ? [] : buildMilestones(total, null),
          notes: notes || ''
        });
        return ok({ invoice: created });
      }

      // ---------------------------------------------------------------
      case 'createForOrder': {
        if (!canWrite) return fail('Not authorized to create invoices', 403);
        const { orderId, clientId, clientName, invoiceNumber, issueDate, dueDate, notes } = body;
        const o = await getOrderById(orderId);
        if (!o) return fail('Order not found', 404);
        const subtotal = r2(o.price || 0);
        const gstTotal = r2(subtotal * 0.10);
        const total = r2(subtotal + gstTotal);
        const created = await insertInvoice({
          orderId, clientId: clientId || null, clientName: clientName || '',
          invoiceNumber, issueDate: issueDate || new Date().toISOString().slice(0, 10), dueDate: dueDate || null,
          items: [{ description: o.title, quantity: 1, unitPrice: subtotal, gst: gstTotal, amount: total }],
          subtotal, gstTotal, total, status: 'Draft', amountPaid: 0, notes: notes || ''
        });
        return ok({ invoice: created });
      }

      // ---------------------------------------------------------------
      case 'createManual': {
        if (!canWrite) return fail('Not authorized to create invoices', 403);
        const { data } = body;
        const subtotal = r2(data.subtotal || 0);
        const gstTotal = r2(data.gstTotal || 0);
        const total = r2(subtotal + gstTotal);
        const created = await insertInvoice({ ...data, subtotal, gstTotal, total, status: 'Draft', amountPaid: 0 });
        return ok({ invoice: created });
      }

      default:
        return fail('Unknown action: ' + action);
    }
  } catch (e) {
    return fail('Server error: ' + e.message, 500);
  }
}
