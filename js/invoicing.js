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

  function r2(n) {
    return Math.round((n || 0) * 100) / 100;
  }

  function paidSoFar(invoice) {
    return (invoice.amountPaid != null && invoice.amountPaid !== '') ? parseFloat(invoice.amountPaid) : 0;
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
    const subOrders = Store.query(Store.COLLECTIONS.ORDERS, x => x.projectId === projectId);
    if (!subOrders.length) return null;

    const subtotal = r2(subOrders.reduce((s, x) => s + (x.price || 0), 0));
    const gstTotal = r2(subtotal * 0.10);
    const shipping = r2(opts.shipping || 0);
    const total = r2(subtotal + gstTotal + shipping);

    const items = subOrders.map(x => ({
      description: `${x.orderCode ? x.orderCode + ' — ' : ''}${x.title}`,
      quantity: 1,
      unitPrice: r2(x.price),
      gst: r2(x.price * 0.10),
      amount: r2(x.price * 1.10)
    }));

    const invoiceData = {
      projectId,
      clientId: opts.clientId || null,
      clientName: opts.clientName || '',
      invoiceNumber: opts.invoiceNumber,
      issueDate: opts.issueDate || new Date().toISOString().slice(0, 10),
      dueDate: opts.dueDate || null,
      items, subtotal, gstTotal, shipping, total,
      status: 'Draft',
      amountPaid: 0,
      milestones: opts.useMilestones === false ? [] : buildMilestones(total, null),
      notes: opts.notes || ''
    };

    const created = await Store.create(Store.COLLECTIONS.INVOICES, invoiceData);
    return created;
  }

  async function createForOrder(orderId, opts = {}) {
    const o = Store.getById(Store.COLLECTIONS.ORDERS, orderId);
    if (!o) return null;

    const subtotal = r2(o.price || 0);
    const gstTotal = r2(subtotal * 0.10);
    const total = r2(subtotal + gstTotal);

    const invoiceData = {
      orderId,
      clientId: opts.clientId || null,
      clientName: opts.clientName || '',
      invoiceNumber: opts.invoiceNumber,
      issueDate: opts.issueDate || new Date().toISOString().slice(0, 10),
      dueDate: opts.dueDate || null,
      items: [{ description: o.title, quantity: 1, unitPrice: subtotal, gst: gstTotal, amount: total }],
      subtotal, gstTotal, total,
      status: 'Draft',
      amountPaid: 0,
      notes: opts.notes || ''
    };

    const created = await Store.create(Store.COLLECTIONS.INVOICES, invoiceData);
    return created;
  }

  // Manual, blank-invoice creation from the Accounting tab's "+ Create
  // Invoice" form — not tied to an order/project. items/subtotal/gstTotal
  // come pre-computed from the form's line items.
  async function createManual(data) {
    const total = r2((data.subtotal || 0) + (data.gstTotal || 0));
    return Store.create(Store.COLLECTIONS.INVOICES, {
      ...data,
      subtotal: r2(data.subtotal || 0),
      gstTotal: r2(data.gstTotal || 0),
      total,
      status: 'Draft',
      amountPaid: 0
    });
  }

  // ------------------------------------------------------------
  // SYNC FROM ORDERS — the only place total is ever recalculated
  // from underlying order data. Refuses to run on a Paid invoice.
  // ------------------------------------------------------------
  async function syncFromOrders(orderId) {
    const o = Store.getById(Store.COLLECTIONS.ORDERS, orderId);
    if (!o) return false;

    if (o.projectId) {
      const invoice = Store.query(Store.COLLECTIONS.INVOICES, i => i.projectId === o.projectId)[0];
      if (!assertNotLocked(invoice)) return false;
      const subOrders = Store.query(Store.COLLECTIONS.ORDERS, x => x.projectId === o.projectId);
      if (!invoice || !subOrders.length) return false;

      const newExGST = r2(subOrders.reduce((s, x) => s + (x.price || 0), 0));
      const newGST = r2(newExGST * 0.10);
      const shipping = r2(invoice.shipping || 0);
      const newTotal = r2(newExGST + newGST + shipping);
      const paid = paidSoFar(invoice);

      const items = subOrders.map(x => ({
        description: `${x.orderCode ? x.orderCode + ' — ' : ''}${x.title}`,
        quantity: 1, unitPrice: r2(x.price), gst: r2(x.price * 0.10), amount: r2(x.price * 1.10)
      }));

      const milestones = (invoice.milestones && invoice.milestones.length)
        ? buildMilestones(newTotal, invoice.milestones)
        : invoice.milestones;

      await Store.update(Store.COLLECTIONS.INVOICES, invoice.id, {
        items, subtotal: newExGST, gstTotal: newGST, shipping, total: newTotal,
        status: statusFor(newTotal, paid),
        milestones
      });
      await Store.update(Store.COLLECTIONS.ORDER_PROJECTS, o.projectId, { totalPrice: newExGST });
      Utils.showToast('Invoice synced from current order prices.', 'info');
      return true;
    } else {
      const invoice = Store.query(Store.COLLECTIONS.INVOICES, i => i.orderId === orderId)[0];
      if (!assertNotLocked(invoice)) return false;
      if (!invoice) return false;

      const newSub = r2(o.price || 0);
      const newGst = r2(newSub * 0.10);
      const garmentTotal = r2(newSub + newGst);
      const items = (invoice.items || []).slice();
      if (items.length > 0) {
        items[0] = { ...items[0], description: o.title, unitPrice: newSub, gst: newGst, amount: garmentTotal };
      } else {
        items.push({ description: o.title, quantity: 1, unitPrice: newSub, gst: newGst, amount: garmentTotal });
      }
      const extraLines = items.slice(1);
      const subtotal = r2(newSub + extraLines.reduce((s, it) => s + (it.unitPrice || 0), 0));
      const gstTotal = r2(newGst + extraLines.reduce((s, it) => s + (it.gst || 0), 0));
      const total = r2(subtotal + gstTotal);
      const paid = paidSoFar(invoice);

      await Store.update(Store.COLLECTIONS.INVOICES, invoice.id, {
        items, subtotal, gstTotal, total, status: statusFor(total, paid)
      });
      Utils.showToast('Invoice synced from current order price.', 'info');
      return true;
    }
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

    const already = (invoice.items || []).some(it => it.isShipping);
    if (already) return true; // idempotent — already added, nothing to do

    const share = r2(shareAmount);
    const lineGst = r2(share * gstRate);
    const lineTotal = r2(share + lineGst);

    const items = (invoice.items || []).slice();
    items.push({ description, quantity: 1, unitPrice: share, gst: lineGst, amount: lineTotal, isShipping: true });

    const newSubtotal = r2((invoice.subtotal || 0) + share);
    const newGstTotal = r2((invoice.gstTotal || 0) + lineGst);
    const newTotal = r2((invoice.total || 0) + lineTotal);
    const paid = paidSoFar(invoice);

    await Store.update(Store.COLLECTIONS.INVOICES, invoice.id, {
      items, subtotal: newSubtotal, gstTotal: newGstTotal, total: newTotal,
      status: statusFor(newTotal, paid)
    });
    Utils.showToast('Shipping ' + Utils.formatCurrency(lineTotal) + ' (inc GST) added to invoice.', 'info');
    return true;
  }

  // ------------------------------------------------------------
  // MILESTONE PAYMENT — replaces both crm.js's and accounting.js's
  // separate implementations. Same rollover rule as buildMilestones:
  // an unpaid shortfall on this milestone rolls into the next one.
  // ------------------------------------------------------------
  async function recordMilestonePayment(invoiceId, milestoneIndex, amount, method, dateStr) {
    const invoice = Store.getById(Store.COLLECTIONS.INVOICES, invoiceId);
    if (!invoice) return false;
    const milestones = invoice.milestones || [];
    const m = milestones[milestoneIndex];
    if (!m) return false;

    const amt = r2(amount);
    if (amt <= 0) { Utils.showToast('Enter a payment amount greater than zero.', 'error'); return false; }

    const shortfall = Math.max(0, r2((m.amount - (m.paidAmount || 0)) - amt));
    const updated = milestones.map((ms, idx) => {
      if (idx === milestoneIndex) {
        const newPaidAmount = r2((ms.paidAmount || 0) + amt);
        return { ...ms, paidAmount: newPaidAmount, paid: newPaidAmount >= ms.amount };
      }
      if (idx === milestoneIndex + 1 && shortfall > 0) {
        return { ...ms, amount: r2(ms.amount + shortfall), rollover: r2((ms.rollover || 0) + shortfall) };
      }
      return ms;
    });

    const newTotalPaid = r2(paidSoFar(invoice) + amt);
    const newStatus = statusFor(invoice.total, newTotalPaid);
    const note = m.label + ': ' + Utils.formatCurrency(amt) + ' via ' + (method || 'Unspecified') +
      ' on ' + (dateStr || new Date().toLocaleDateString('en-AU')) + '.';

    await Store.update(Store.COLLECTIONS.INVOICES, invoice.id, {
      amountPaid: newTotalPaid,
      status: newStatus,
      milestones: updated,
      notes: (invoice.notes || '') + '\n' + note
    });
    Utils.showToast('Payment of ' + Utils.formatCurrency(amt) + ' recorded for ' + m.label + '.', 'success');
    return true;
  }

  // Generic, non-milestone payment — usable at any pipeline stage.
  async function recordAdditionalPayment(invoiceId, amount, method, dateStr) {
    const invoice = Store.getById(Store.COLLECTIONS.INVOICES, invoiceId);
    if (!invoice) return false;
    const amt = r2(amount);
    if (amt <= 0) { Utils.showToast('Enter a payment amount greater than zero.', 'error'); return false; }

    const newTotalPaid = r2(paidSoFar(invoice) + amt);
    const newStatus = statusFor(invoice.total, newTotalPaid);
    const note = 'Payment: ' + Utils.formatCurrency(amt) + ' via ' + (method || 'Unspecified') +
      ' on ' + (dateStr || new Date().toLocaleDateString('en-AU')) + '.';

    await Store.update(Store.COLLECTIONS.INVOICES, invoice.id, {
      amountPaid: newTotalPaid,
      status: newStatus,
      notes: (invoice.notes || '') + '\n' + note
    });
    Utils.showToast('Payment of ' + Utils.formatCurrency(amt) + ' recorded.', 'success');
    return true;
  }

  // Mark fully paid — also marks every milestone paid, closing the
  // gap where accounting.js used to set status=Paid while leaving
  // milestones showing unpaid.
  async function markPaid(invoiceId) {
    const invoice = Store.getById(Store.COLLECTIONS.INVOICES, invoiceId);
    if (!invoice) return false;
    const milestones = (invoice.milestones || []).map(ms => ({ ...ms, paid: true, paidAmount: ms.amount }));
    await Store.update(Store.COLLECTIONS.INVOICES, invoiceId, {
      status: 'Paid',
      amountPaid: invoice.total,
      milestones
    });
    Utils.showToast('Invoice marked as fully paid.', 'success');
    return true;
  }

  // ------------------------------------------------------------
  // EDIT DIRECT — the one explicit, user-confirmed override path
  // that IS allowed to touch a Paid invoice. Caller's UI must ask
  // for confirmation before calling this on a locked invoice.
  // ------------------------------------------------------------
  async function editDirect(invoiceId, { items, shipping, amountPaid, status }) {
    const invoice = Store.getById(Store.COLLECTIONS.INVOICES, invoiceId);
    if (!invoice) return false;

    const subtotal = r2(items.reduce((s, it) => s + (it.unitPrice || 0) * (it.quantity || 1), 0));
    const gstTotal = r2(items.reduce((s, it) => s + (it.gst || 0), 0));
    const ship = r2(shipping || 0);
    const total = r2(subtotal + gstTotal + ship);
    const paid = r2(amountPaid != null ? amountPaid : paidSoFar(invoice));
    const finalStatus = status || statusFor(total, paid);

    await Store.update(Store.COLLECTIONS.INVOICES, invoiceId, {
      items, subtotal, gstTotal, shipping: ship, total, amountPaid: paid, status: finalStatus
    });
    Utils.showToast('Invoice updated.', 'success');
    return true;
  }

  async function deleteInvoice(invoiceId) {
    return Store.delete(Store.COLLECTIONS.INVOICES, invoiceId);
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
    deleteInvoice
  };
})();
