/* ============================================================
   INVOICING MODULE — Pooja's Couture Suite
   ------------------------------------------------------------
   Single source of truth for every write to the `invoices` table.
   Nothing else in the app (crm.js, accounting.js, shipping/app.js)
   is allowed to mutate invoice.total / .subtotal / .gstTotal /
   .amountPaid / .status / .milestones directly. Every write goes
   through one of the functions below, so there is exactly one
   implementation of each piece of money math — not five slightly
   different copies drifting apart in five files.

   Depends on: Store, Utils (both already global, loaded before this).
   Must be loaded AFTER store.js/utils.js and BEFORE crm.js,
   accounting.js, and shipping/app.js in every HTML file that uses
   any of them.
   ============================================================ */

const Invoicing = (function () {

  async function callBackend(action, params) {
    const client = Store.getClient();
    const { data: sessionData } = await client.auth.getSession();
    const token = sessionData && sessionData.session ? sessionData.session.access_token : null;
    if (!token) {
      Utils.showToast('Your session has expired. Please log in again.', 'error');
      return { ok: false, error: 'No session' };
    }
    try {
      const res = await fetch('/api/invoicing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, token, ...params })
      });
      const result = await res.json();
      if (!result.ok) {
        Utils.showToast(result.error || 'Invoice update failed.', 'error');
      }
      return result;
    } catch (e) {
      Utils.showToast('Network error contacting invoicing service.', 'error');
      return { ok: false, error: e.message };
    }
  }

  function r2(n) {
    return Math.round((n || 0) * 100) / 100;
  }

  function statusFor(total, paid) {
    if (total > 0 && paid >= total) return 'Paid';
    if (paid > 0) return 'Partially Paid';
    return 'Draft';
  }

  // The ONE lock rule for the whole app: a Paid invoice cannot be
  // recalculated or auto-modified. Only editDirect() (an explicit,
  // user-confirmed override) can touch a Paid invoice.
  function isLocked(invoice) {
    return !!invoice && invoice.status === 'Paid';
  }

  function assertNotLocked(invoice) {
    if (isLocked(invoice)) {
      Utils.showToast('Invoice is Paid and locked. Use "Edit Invoice Directly" to make changes.', 'error');
      return false;
    }
    return true;
  }

  // ------------------------------------------------------------
  // Milestone helpers — used by createProjectInvoice and syncFromOrders.
  // M1 = 30% nominal. M2 = 40% + any shortfall M1 hasn't paid yet.
  // M3 = total - M1 nominal - M2 (NOT total - M1 paid — subtracting
  // paid-so-far here double-counts the shortfall already rolled
  // into M2 and overshoots the three milestones above the total).
  // ------------------------------------------------------------
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

  // ------------------------------------------------------------
  // CREATE — new invoice for a project (multi-garment) or a
  // standalone order.
  // ------------------------------------------------------------
  async function createForProject(projectId, opts = {}) {
    const result = await callBackend('createForProject', {
      projectId,
      clientId: opts.clientId, clientName: opts.clientName,
      invoiceNumber: opts.invoiceNumber, issueDate: opts.issueDate, dueDate: opts.dueDate,
      notes: opts.notes, shipping: opts.shipping, useMilestones: opts.useMilestones
    });
    if (!result.ok) return null;
    await Store.refresh(Store.COLLECTIONS.INVOICES);
    return result.invoice;
  }

  async function createForOrder(orderId, opts = {}) {
    const result = await callBackend('createForOrder', {
      orderId,
      clientId: opts.clientId, clientName: opts.clientName,
      invoiceNumber: opts.invoiceNumber, issueDate: opts.issueDate, dueDate: opts.dueDate,
      notes: opts.notes
    });
    if (!result.ok) return null;
    await Store.refresh(Store.COLLECTIONS.INVOICES);
    return result.invoice;
  }

  // Manual, blank-invoice creation from the Accounting tab's "+ Create
  // Invoice" form — not tied to an order/project. items/subtotal/gstTotal
  // come pre-computed from the form's line items.
  async function createManual(data) {
    const result = await callBackend('createManual', { data });
    if (!result.ok) return null;
    await Store.refresh(Store.COLLECTIONS.INVOICES);
    return result.invoice;
  }

  // ------------------------------------------------------------
  // SYNC FROM ORDERS — the only place total is ever recalculated
  // from underlying order data. Refuses to run on a Paid invoice.
  // ------------------------------------------------------------
  async function syncFromOrders(orderId) {
    const o = Store.getById(Store.COLLECTIONS.ORDERS, orderId);
    if (!o) return false;

    const invoice = o.projectId
      ? Store.query(Store.COLLECTIONS.INVOICES, i => i.projectId === o.projectId)[0]
      : Store.query(Store.COLLECTIONS.INVOICES, i => i.orderId === orderId)[0];
    if (!assertNotLocked(invoice)) return false;

    const result = await callBackend('syncFromOrders', { orderId });
    if (!result.ok) return false;
    await Store.refresh(Store.COLLECTIONS.INVOICES);
    if (o.projectId) await Store.refresh(Store.COLLECTIONS.ORDER_PROJECTS);
    Utils.showToast('Invoice synced from current order prices.', 'info');
    return true;
  }

  // ------------------------------------------------------------
  // ADD SHIPPING LINE — used by both crm.js (markReceivedInAustralia,
  // domestic/AU flow) and shipping/app.js (Route B, overseas flow).
  // Refuses on a Paid invoice instead of silently reopening it.
  // ------------------------------------------------------------
  async function addShippingLine(invoiceId, { description, shareAmount, gstRate = 0.10 }) {
    const invoice = Store.getById(Store.COLLECTIONS.INVOICES, invoiceId);
    if (!invoice) return false;
    if (!assertNotLocked(invoice)) return false;

    const result = await callBackend('addShippingLine', { invoiceId, description, shareAmount, gstRate });
    if (!result.ok) return false;
    await Store.refresh(Store.COLLECTIONS.INVOICES);
    Utils.showToast('Shipping added to invoice.', 'info');
    return true;
  }

  // ------------------------------------------------------------
  // MILESTONE PAYMENT — replaces both crm.js's and accounting.js's
  // separate implementations. Same rollover rule as buildMilestones:
  // an unpaid shortfall on this milestone rolls into the next one.
  // ------------------------------------------------------------
  async function recordMilestonePayment(invoiceId, milestoneIndex, amount, method, dateStr) {
    const amt = r2(amount);
    if (amt <= 0) { Utils.showToast('Enter a payment amount greater than zero.', 'error'); return false; }

    const result = await callBackend('recordMilestonePayment', { invoiceId, milestoneIndex, amount: amt, method, dateStr });
    if (!result.ok) return false;
    await Store.refresh(Store.COLLECTIONS.INVOICES);
    Utils.showToast('Payment of ' + Utils.formatCurrency(amt) + ' recorded.', 'success');
    return true;
  }

  // Generic, non-milestone payment — usable at any pipeline stage.
  async function recordAdditionalPayment(invoiceId, amount, method, dateStr) {
    const amt = r2(amount);
    if (amt <= 0) { Utils.showToast('Enter a payment amount greater than zero.', 'error'); return false; }

    const result = await callBackend('recordAdditionalPayment', { invoiceId, amount: amt, method, dateStr });
    if (!result.ok) return false;
    await Store.refresh(Store.COLLECTIONS.INVOICES);
    Utils.showToast('Payment of ' + Utils.formatCurrency(amt) + ' recorded.', 'success');
    return true;
  }

  // Mark fully paid — also marks every milestone paid, closing the
  // gap where accounting.js used to set status=Paid while leaving
  // milestones showing unpaid.
  async function markPaid(invoiceId) {
    const result = await callBackend('markPaid', { invoiceId });
    if (!result.ok) return false;
    await Store.refresh(Store.COLLECTIONS.INVOICES);
    Utils.showToast('Invoice marked as fully paid.', 'success');
    return true;
  }

  // ------------------------------------------------------------
  // EDIT DIRECT — the one explicit, user-confirmed override path
  // that IS allowed to touch a Paid invoice. Caller's UI must ask
  // for confirmation before calling this on a locked invoice.
  // Restricted server-side to admin/operations roles only.
  // ------------------------------------------------------------
  async function editDirect(invoiceId, { items, shipping, amountPaid, status }) {
    const result = await callBackend('editDirect', { invoiceId, items, shipping, amountPaid, status });
    if (!result.ok) return false;
    await Store.refresh(Store.COLLECTIONS.INVOICES);
    Utils.showToast('Invoice updated.', 'success');
    return true;
  }

  async function deleteInvoice(invoiceId) {
    const result = await callBackend('deleteInvoice', { invoiceId });
    if (!result.ok) return false;
    await Store.refresh(Store.COLLECTIONS.INVOICES);
    return true;
  }

  // ------------------------------------------------------------
  // ADD EXTRA ITEM — self-serve replacement for the manual-SQL
  // conversion an order used to need when a second garment/item had
  // to be added to an existing invoice. If the order isn't already
  // part of a project, the backend converts it into one automatically
  // (moves the existing order under a new project, creates the new
  // order for the extra item, re-points the invoice). Refreshes every
  // collection that could have changed as a result.
  // ------------------------------------------------------------
  async function addExtraItem(orderId, { description, unitPrice, gstRate }) {
    const result = await callBackend('addExtraItem', { orderId, description, unitPrice, gstRate });
    if (!result.ok) return null;
    await Store.refresh(Store.COLLECTIONS.INVOICES);
    await Store.refresh(Store.COLLECTIONS.ORDERS);
    await Store.refresh(Store.COLLECTIONS.ORDER_PROJECTS);
    Utils.showToast('Item added — invoice and order updated.', 'success');
    return result;
  }

  return {
    round2: r2,
    isLocked,
    assertNotLocked,
    statusFor,
    buildMilestones,
    createForProject,
    createForOrder,
    createManual,
    syncFromOrders,
    addShippingLine,
    recordMilestonePayment,
    recordAdditionalPayment,
    markPaid,
    editDirect,
    deleteInvoice,
    addExtraItem
  };
})();
