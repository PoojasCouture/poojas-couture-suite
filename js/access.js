/* ============================================================
   POOJA'S COUTURE — Centralised Access Control
   ------------------------------------------------------------
   Single source of truth for "which role can open which tab or
   portal". Loaded by the main app AND by the Tailor, Shipping,
   and AI Team portals, which previously each hand-maintained
   their own separate, independently-drifting version of this
   logic — the main app alone had TWO different copies of it
   (navigate() and applySidebarPermissions()), using different
   key names, that could silently disagree with each other.

   social_crm_limited (Aleem) has been removed. Confirmed via a
   direct Supabase query on 13 Sep 2026 that zero employees hold
   that role — the account and its employee row are both gone.
   If a similar limited-CRM hire happens again in future, add a
   new role here rather than reviving this one; the old one has
   no meaning left to preserve.
   ============================================================ */
window.AccessControl = (function () {

  // kioskPortal (added 24 Sep 2026): the customer-facing AI try-on
  // kiosk. Admin/operations only, same as generate-model-photo.js --
  // every use of this portal triggers a real, paid Gemini generation,
  // so it's gated to staff who'd actually be running it for a
  // customer, not opened up broadly.
  const ROLE_ACCESS_TABLE = {
    admin:      { dashboard:true,  products:true,  crm:true,  hrm:true,  accounting:true,  admin:true,  settings:true,  'ai-team':true,  tailorPortal:true,  logisticsPortal:true,  kioskPortal:true  },
    operations: { dashboard:true,  products:true,  crm:true,  hrm:true,  accounting:false, admin:false, settings:false, 'ai-team':false, tailorPortal:true,  logisticsPortal:true,  kioskPortal:true  },
    tailor:     { dashboard:false, products:false, crm:false, hrm:false, accounting:false, admin:false, settings:false, 'ai-team':false, tailorPortal:true,  logisticsPortal:false, kioskPortal:false },
    logistics:  { dashboard:false, products:false, crm:false, hrm:false, accounting:false, admin:false, settings:false, 'ai-team':false, tailorPortal:false, logisticsPortal:true,  kioskPortal:false }
  };

  // social_crm depends on the logged-in user's own permissions object
  // (hasCrmPerm / hasSocialCrmPerm), so it's built dynamically rather
  // than hardcoded above — but from the exact same shape as every
  // other role, so callers don't need to know the difference.
  function getRoleAccess(role, hasCrmPerm, hasSocialCrmPerm) {
    if (role === 'social_crm') {
      return {
        dashboard: hasCrmPerm, products: hasCrmPerm, crm: hasCrmPerm,
        hrm: false, accounting: false, admin: false, settings: false,
        'ai-team': hasSocialCrmPerm,
        tailorPortal: false, logisticsPortal: false, kioskPortal: false
      };
    }
    return ROLE_ACCESS_TABLE[role] || null;
  }

  return { getRoleAccess: getRoleAccess };
})();
