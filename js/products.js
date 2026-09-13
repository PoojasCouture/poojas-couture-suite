/* ============================================================
   POOJA'S COUTURE — Products / Inventory Module
   Add, edit, search, filter stock. Categories incl. Footwear
   (bridal sneakers) and Purse. Tracks stock value & status.
   ============================================================ */

const Products = (() => {
  let activeCategory = 'all';
  let activeStatus = 'all';
  let searchTerm = '';

  const CATEGORIES = ['Bridal Set', 'Groom Set', 'Menswear', 'Jewellery', 'Purse', 'Footwear', 'Accessory'];
  const STATUSES = ['In Stock', 'Reserved', 'Sold', 'Returned', 'Out of Stock'];
  // Categories that hold multiple units (stocked goods).
  const QTY_CATEGORIES = ['Footwear', 'Purse', 'Jewellery', 'Accessory', 'Menswear'];
  const tracksQtyByCategory = (cat) => QTY_CATEGORIES.includes(cat);
  const LOCATIONS = ['Showroom', 'Warehouse A', 'Warehouse B'];

  // Short, human-writable prefix per category — matches the same
  // sequential BLS-000001-style scheme already used for order codes,
  // so SKUs are easy to read aloud and write by hand on a plain tag
  // (no printer/scanner in use — see product decision this session).
  const SKU_PREFIX = {
    'Bridal Set': 'LEH',
    'Groom Set': 'GRM',
    'Menswear': 'MEN',
    'Jewellery': 'JWL',
    'Purse': 'PUR',
    'Footwear': 'FTW',
    'Accessory': 'ACC'
  };

  // Downscales+re-encodes any photo to a consistent max dimension and
  // JPEG quality before it ever leaves the browser -- see the call site
  // in the photo-input change handler below for why this exists (Android
  // vs iPhone native camera resolution mismatch).
  function resizeImageForUpload(file, maxDim, quality) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width >= height) {
            height = Math.round(height * (maxDim / width));
            width = maxDim;
          } else {
            width = Math.round(width * (maxDim / height));
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error('Could not load image for resizing')); };
      img.src = objectUrl;
    });
  }

  // Click-to-enlarge: opens the product photo full-size in a simple
  // dark overlay. Closes on click-anywhere or Escape. Self-contained
  // (inline styles) so it needs no changes to css/app.css.
  function openPhotoLightbox(url) {
    if (!url) return;
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:9999;display:flex;align-items:center;justify-content:center;cursor:zoom-out;padding:24px;';
    const img = document.createElement('img');
    img.src = url;
    img.style.cssText = 'max-width:100%;max-height:100%;border-radius:8px;box-shadow:0 8px 40px rgba(0,0,0,0.5);';
    overlay.appendChild(img);
    const close = () => {
      overlay.remove();
      document.removeEventListener('keydown', onKey);
    };
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    overlay.addEventListener('click', close);
    document.addEventListener('keydown', onKey);
    document.body.appendChild(overlay);
  }

  const CONDITIONS = ['New', 'Excellent', 'Good', 'Needs Repair', 'Damaged'];
  const VENDOR_TYPES = ['Fabric Supplier', 'Embroidery / Karigar', 'Tailoring Unit', 'Logistics / Freight', 'Trims & Accessories', 'Other'];
  const VENDOR_STATUSES = ['Active', 'Inactive'];
  const getVendors = () => (Store.getAll(Store.COLLECTIONS.VENDORS) || []).filter(Boolean);
  const getSales = () => (Store.getAll(Store.COLLECTIONS.SALES) || []).filter(Boolean);
  const getSaleItems = () => (Store.getAll(Store.COLLECTIONS.SALE_ITEMS) || []).filter(Boolean);

  function generateSku(category) {
    const prefix = SKU_PREFIX[category] || 'GEN';
    const products = Store.getAll(Store.COLLECTIONS.PRODUCTS);
    let maxNum = 0;
    products.forEach(p => {
      if (p.sku && p.sku.indexOf(prefix + '-') === 0) {
        const n = parseInt(p.sku.slice(prefix.length + 1), 10);
        if (!isNaN(n) && n > maxNum) maxNum = n;
      }
    });
    return prefix + '-' + String(maxNum + 1).padStart(6, '0');
  }

  function init() {
    try {
      activeCategory = localStorage.getItem('pc_prod_cat') || 'all';
      activeStatus   = localStorage.getItem('pc_prod_status') || 'all';
    } catch(e) {
      activeCategory = 'all';
      activeStatus   = 'all';
    }
    searchTerm = '';
    render();
  }

  function getProducts() {
    return Store.getAll(Store.COLLECTIONS.PRODUCTS) || [];
  }

  function render() {
    const container = Utils.$('#main-content-area');
    if (!container) return;

    const products = getProducts();
    const inStock = products.filter(p => p.status === 'In Stock');
    const reserved = products.filter(p => p.status === 'Reserved');
    const stockValue = inStock.reduce((sum, p) => sum + (p.price || 0), 0);
    const costValue = inStock.reduce((sum, p) => sum + (p.costPrice || 0), 0);

    container.innerHTML = `
      <div class="page-header animate-fade-in">
        <div>
          <h1 class="page-title">Stock & Inventory</h1>
          <p class="page-subtitle">Track stock, ready-made pieces, bridal sneakers, purses and accessories</p>
        </div>
        <div class="page-actions">
          <button class="btn btn-secondary" id="btn-sales-history">📊 Sales History</button>
          <button class="btn btn-secondary" id="btn-record-sale">💵 Record Sale</button>
          <button class="btn btn-secondary" id="btn-manage-vendors">🏭 Vendors</button>
          <button class="btn btn-primary" id="btn-add-product">+ Add Product</button>
        </div>
      </div>

      <!-- Summary stat cards -->
      <div class="d-grid gap-4 mb-5 animate-fade-in stagger-1" style="grid-template-columns:repeat(auto-fit,minmax(190px,1fr))">
        <div class="stat-card" style="cursor:pointer" onclick="Products.showReport('all')">
          <div class="stat-card-header"><span class="stat-card-icon gold">📦</span></div>
          <div class="stat-card-value">${products.length}</div>
          <div class="stat-card-label">Total Products</div>
        </div>
        <div class="stat-card" style="cursor:pointer" onclick="Products.showReport('instock')">
          <div class="stat-card-header"><span class="stat-card-icon green">✅</span></div>
          <div class="stat-card-value">${inStock.length}</div>
          <div class="stat-card-label">In Stock</div>
        </div>
        <div class="stat-card" style="cursor:pointer" onclick="Products.showReport('reserved')">
          <div class="stat-card-header"><span class="stat-card-icon blue">🔖</span></div>
          <div class="stat-card-value">${reserved.length}</div>
          <div class="stat-card-label">Reserved</div>
        </div>
        <div class="stat-card" style="cursor:pointer" onclick="Products.showReport('value')">
          <div class="stat-card-header"><span class="stat-card-icon purple">💰</span></div>
          <div class="stat-card-value">${Utils.formatCurrency(stockValue)}</div>
          <div class="stat-card-label">Stock Value (retail)</div>
        </div>
      </div>

      <!-- Filters -->
      <div class="card p-4 mb-4 animate-fade-in stagger-2">
        <div class="d-flex flex-wrap gap-3 items-center">
          <input type="text" id="product-search" class="form-input" placeholder="🔍 Search by name or SKU..."
                 style="max-width:260px" value="${Utils.sanitizeHTML(searchTerm)}">
          <select id="product-category-filter" class="form-select" style="max-width:180px">
            <option value="all">All Categories</option>
            ${CATEGORIES.map(c => `<option value="${c}" ${activeCategory===c?'selected':''}>${c}</option>`).join('')}
          </select>
          <select id="product-status-filter" class="form-select" style="max-width:160px">
            <option value="all">All Statuses</option>
            ${STATUSES.map(s => `<option value="${s}" ${activeStatus===s?'selected':''}>${s}</option>`).join('')}
          </select>
          <button class="btn btn-secondary btn-sm" id="btn-export-products" style="margin-left:auto">⬇ Export CSV</button>
        </div>
      </div>

      <!-- Products table -->
      <div class="card p-0 animate-fade-in stagger-3">
        <div class="table-container" style="border:none">
          <table class="data-table">
            <thead>
              <tr>
                <th>SKU</th>
                <th>Product</th>
                <th>Category</th>
                <th>Cost</th>
                <th>Price</th>
                <th>Qty</th>
                <th>Location</th>
                <th>Status</th>
                <th style="text-align:right">Actions</th>
              </tr>
            </thead>
            <tbody id="products-table-body"></tbody>
          </table>
        </div>
      </div>
    `;

    // Wire controls
    Utils.$('#btn-add-product').addEventListener('click', () => showProductModal());
    Utils.$('#btn-manage-vendors').addEventListener('click', () => showVendorsListModal());
    Utils.$('#btn-record-sale').addEventListener('click', () => showRecordSaleModal());
    Utils.$('#btn-sales-history').addEventListener('click', () => showSalesHistoryModal());
    Utils.$('#btn-export-products').addEventListener('click', exportCSV);

    const searchEl = Utils.$('#product-search');
    searchEl.addEventListener('input', (e) => { searchTerm = e.target.value; renderRows(); });
    Utils.$('#product-category-filter').addEventListener('change', (e) => { activeCategory = e.target.value; try { localStorage.setItem('pc_prod_cat', activeCategory); } catch(e2) {} renderRows(); });
    Utils.$('#product-status-filter').addEventListener('change', (e) => { activeStatus = e.target.value; try { localStorage.setItem('pc_prod_status', activeStatus); } catch(e2) {} renderRows(); });

    renderRows();
  }

  function renderRows() {
    const tbody = Utils.$('#products-table-body');
    if (!tbody) return;

    let list = getProducts();

    if (activeCategory !== 'all') list = list.filter(p => p.category === activeCategory);
    if (activeStatus !== 'all') list = list.filter(p => p.status === activeStatus);
    if (searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase();
      list = list.filter(p =>
        (p.title || '').toLowerCase().includes(q) ||
        (p.sku || '').toLowerCase().includes(q)
      );
    }

    list.sort((a, b) => (a.title || '').localeCompare(b.title || ''));

    if (list.length === 0) {
      tbody.innerHTML = `<tr><td colspan="9" class="text-center p-6 text-muted text-xs">No products match. Add one or adjust filters.</td></tr>`;
      return;
    }

    const statusBadge = (s) =>
      s === 'In Stock' ? 'badge-success'
      : s === 'Reserved' ? 'badge-info'
      : s === 'Sold' ? 'badge-muted'
      : 'badge-warning';

    tbody.innerHTML = list.map(p => `
      <tr>
        <td class="font-mono text-xs">${Utils.sanitizeHTML(p.sku || '—')}</td>
        <td>
          <div class="font-medium">${Utils.sanitizeHTML(p.title)}</div>
          ${p.isAccessory ? '<div class="text-xs text-muted">Accessory / add-on</div>' : ''}
        </td>
        <td><span class="badge badge-gold text-xs">${Utils.sanitizeHTML(p.category)}</span></td>
        <td class="font-mono text-xs text-muted">${Utils.formatCurrency(p.costPrice || 0)}</td>
        <td class="font-mono">${Utils.formatCurrency(p.price || 0)}</td>
        <td class="font-mono text-xs">${p.trackQuantity ? (p.quantity ?? 0) : '—'}</td>
        <td class="text-xs">${Utils.sanitizeHTML(p.location || 'Showroom')}</td>
        <td><span class="badge ${statusBadge(p.status)} text-xs">${Utils.sanitizeHTML(p.status)}</span></td>
        <td>
          <div class="table-actions justify-end">
            <button class="btn btn-secondary btn-sm" onclick="Products.editProduct('${p.id}')">Edit</button>
            <button class="btn btn-danger btn-sm" onclick="Products.deleteProduct('${p.id}')">Delete</button>
          </div>
        </td>
      </tr>
    `).join('');
  }

  // ============================================================
  // VENDOR / SUPPLIER MANAGEMENT
  // Uses the existing `vendors` table + Store collection, which already
  // had correct RLS and generic create/update wired up -- this just adds
  // the screen that was missing on top of it. A fuller vendor-management
  // workflow (linking to orders/shipments etc.) is a separate, larger
  // piece for later; this covers full CRUD on the vendor record itself.
  // ============================================================

  function showVendorModal(vendorId = null, onSaved = null) {
    const editing = !!vendorId;
    const v = editing ? getVendors().find(x => x.id === vendorId) : {};
    if (editing && !v) { Utils.showToast('Vendor not found.', 'error'); return; }

    const formHTML = `
      <form id="vendor-form" class="d-flex flex-col gap-3">
        <div class="form-group">
          <label class="form-label">Business Name <span class="required">*</span></label>
          <input type="text" name="businessName" class="form-input" required value="${Utils.sanitizeHTML(v.businessName || '')}">
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Contact Name</label>
            <input type="text" name="contactName" class="form-input" value="${Utils.sanitizeHTML(v.contactName || '')}">
          </div>
          <div class="form-group">
            <label class="form-label">Vendor Type</label>
            <select name="vendorType" class="form-select">
              <option value="">— Not set —</option>
              ${VENDOR_TYPES.map(t => `<option value="${t}" ${v.vendorType===t?'selected':''}>${t}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Email <span class="required">*</span></label>
            <input type="email" name="email" class="form-input" required value="${Utils.sanitizeHTML(v.email || '')}">
          </div>
          <div class="form-group">
            <label class="form-label">Phone</label>
            <input type="text" name="phone" class="form-input" value="${Utils.sanitizeHTML(v.phone || '')}">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Specialty</label>
          <input type="text" name="specialty" class="form-input" value="${Utils.sanitizeHTML(v.specialty || '')}" placeholder="e.g. Zardozi embroidery, silk sourcing">
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Location</label>
            <input type="text" name="location" class="form-input" value="${Utils.sanitizeHTML(v.location || '')}" placeholder="e.g. Surat, India">
          </div>
          <div class="form-group">
            <label class="form-label">Status</label>
            <select name="status" class="form-select">
              ${VENDOR_STATUSES.map(s => `<option value="${s}" ${(v.status||'Active')===s?'selected':''}>${s}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">GST Number</label>
            <input type="text" name="gstNumber" class="form-input" value="${Utils.sanitizeHTML(v.gstNumber || '')}">
          </div>
          <div class="form-group">
            <label class="form-label">Payment Terms</label>
            <input type="text" name="paymentTerms" class="form-input" value="${Utils.sanitizeHTML(v.paymentTerms || '')}" placeholder="e.g. 30% deposit, balance on delivery">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Default Shipping Route</label>
            <input type="text" name="defaultRoute" class="form-input" value="${Utils.sanitizeHTML(v.defaultRoute || '')}" placeholder="e.g. Surat to Sydney via freight">
          </div>
          <div class="form-group">
            <label class="form-label">Shipping Cost Borne By</label>
            <input type="text" name="shipsCostBorneBy" class="form-input" value="${Utils.sanitizeHTML(v.shipsCostBorneBy || '')}" placeholder="e.g. Vendor, Boutique, Split">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Bank Details</label>
          <textarea name="bankDetails" class="form-input" rows="2">${Utils.sanitizeHTML(v.bankDetails || '')}</textarea>
        </div>
        <div class="form-group">
          <label class="form-label">Notes</label>
          <textarea name="notes" class="form-input" rows="2">${Utils.sanitizeHTML(v.notes || '')}</textarea>
        </div>
      </form>
    `;

    App.showModal({
      title: editing ? 'Edit Vendor' : 'Add New Vendor',
      content: formHTML,
      submitText: editing ? 'Save Changes' : 'Add Vendor',
      onSubmit: async (modalEl) => {
        const form = Utils.$('#vendor-form', modalEl);
        if (!form.checkValidity()) { form.reportValidity(); return false; }
        const fd = new FormData(form);
        const payload = {
          businessName: fd.get('businessName').trim(),
          contactName: (fd.get('contactName') || '').trim() || null,
          vendorType: fd.get('vendorType') || null,
          email: (fd.get('email') || '').trim(),
          phone: (fd.get('phone') || '').trim() || null,
          specialty: (fd.get('specialty') || '').trim() || null,
          location: (fd.get('location') || '').trim() || null,
          status: fd.get('status'),
          gstNumber: (fd.get('gstNumber') || '').trim() || null,
          paymentTerms: (fd.get('paymentTerms') || '').trim() || null,
          defaultRoute: (fd.get('defaultRoute') || '').trim() || null,
          shipsCostBorneBy: (fd.get('shipsCostBorneBy') || '').trim() || null,
          bankDetails: (fd.get('bankDetails') || '').trim() || null,
          notes: (fd.get('notes') || '').trim() || null
        };
        try {
          let saved;
          if (editing) {
            const updateResult = await Store.update(Store.COLLECTIONS.VENDORS, vendorId, payload);
            if (!updateResult) return false; // Store already showed the real error
            saved = Object.assign({ id: vendorId }, payload);
            Utils.showToast('Vendor updated.');
          } else {
            saved = await Store.create(Store.COLLECTIONS.VENDORS, payload);
            if (!saved) return false; // Store already showed the real error -- don't also claim success
            Utils.showToast('Vendor added.');
          }
          if (typeof onSaved === 'function') onSaved(saved);
          return true;
        } catch (e) {
          Utils.showToast('Save failed: ' + e.message, 'error');
          return false;
        }
      }
    });
  }

  function showVendorsListModal() {
    const vendors = getVendors();
    const rows = vendors.length === 0
      ? '<tr><td colspan="5" class="text-center text-muted">No vendors yet. Click "+ Add Vendor" to create one.</td></tr>'
      : vendors.map(v => `
          <tr>
            <td class="font-semibold text-xs">${Utils.sanitizeHTML(v.businessName || '\u2014')}</td>
            <td class="text-xs">${Utils.sanitizeHTML(v.vendorType || '\u2014')}</td>
            <td class="text-xs">${Utils.sanitizeHTML(v.contactName || v.phone || v.email || '\u2014')}</td>
            <td><span class="badge badge-${v.status==='Active'?'success':'muted'} text-xs">${Utils.sanitizeHTML(v.status || 'Active')}</span></td>
            <td style="text-align:right"><button type="button" class="btn btn-secondary btn-sm" onclick="Products.editVendor('${v.id}')">Edit</button></td>
          </tr>
        `).join('');

    const content = `
      <div class="d-flex justify-content-between items-center mb-3">
        <span class="text-sm text-muted">${vendors.length} supplier${vendors.length === 1 ? '' : 's'}</span>
        <button type="button" class="btn btn-primary btn-sm" id="btn-add-vendor-inline">+ Add Vendor</button>
      </div>
      <div class="table-container" style="border:none;max-height:60vh;overflow-y:auto;">
        <table class="data-table">
          <thead><tr><th>Business Name</th><th>Type</th><th>Contact</th><th>Status</th><th></th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;

    App.showModal({
      title: 'Manage Vendors / Suppliers',
      content,
      submitText: 'Close',
      hideCancel: true,
      onSubmit: () => true,
      modalSize: 'modal-lg'
    });

    setTimeout(() => {
      const btn = document.querySelector('#btn-add-vendor-inline');
      if (btn) btn.addEventListener('click', () => showVendorModal(null, () => showVendorsListModal()));
    }, 50);
  }

  function editVendor(id) { showVendorModal(id, () => showVendorsListModal()); }

  // ============================================================
  // RECORD SALE -- sells one or more products in a single transaction.
  // Uses the existing `sales` + `sale_items` tables, which already had
  // correct RLS (same can_see_crm() function as clients/orders/products)
  // but zero UI anywhere before this. Shows Gross Profit / Gross Margin
  // per line item AND as a running total for the whole sale, per request.
  // On save: decrements stock for tracked products using the exact same
  // auto-Out-of-Stock rule already used on the product form, so the two
  // paths can never disagree with each other.
  // ============================================================

  function showRecordSaleModal() {
    let cart = []; // { productId, title, qty, unitPrice, costPrice }
    const products = getProducts();

    const renderCartRows = () => {
      if (cart.length === 0) {
        return '<tr><td colspan="7" class="text-center text-muted">No items added yet.</td></tr>';
      }
      return cart.map((item, idx) => {
        const lineTotal = item.qty * item.unitPrice;
        const lineCost = item.qty * item.costPrice;
        const lineProfit = lineTotal - lineCost;
        const lineMargin = lineTotal > 0 ? (lineProfit / lineTotal) * 100 : 0;
        return `
          <tr>
            <td class="text-xs">${Utils.sanitizeHTML(item.title)}</td>
            <td class="text-xs">${item.qty}</td>
            <td class="font-mono text-xs">${Utils.formatCurrency(item.unitPrice)}</td>
            <td class="font-mono text-xs">${Utils.formatCurrency(lineTotal)}</td>
            <td class="font-mono text-xs" style="color:${lineProfit < 0 ? 'var(--pc-danger)' : 'var(--pc-text)'}">${Utils.formatCurrency(lineProfit)}</td>
            <td class="font-mono text-xs" style="color:${lineMargin < 0 ? 'var(--pc-danger)' : 'var(--pc-text)'}">${lineMargin.toFixed(1)}%</td>
            <td style="text-align:right"><button type="button" class="btn btn-secondary btn-sm" data-remove-idx="${idx}">✕</button></td>
          </tr>`;
      }).join('');
    };

    const computeTotals = () => {
      const subtotal = cart.reduce((s, i) => s + i.qty * i.unitPrice, 0);
      const gstTotal = Math.round(subtotal * 0.10 * 100) / 100;
      const total = subtotal + gstTotal;
      const cost = cart.reduce((s, i) => s + i.qty * i.costPrice, 0);
      const grossProfit = subtotal - cost; // GST is never profit, excluded
      const grossMargin = subtotal > 0 ? (grossProfit / subtotal) * 100 : 0;
      return { subtotal, gstTotal, total, grossProfit, grossMargin };
    };

    const buildForm = () => {
      const t = computeTotals();
      return `
        <form id="sale-form" class="d-flex flex-col gap-3">
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Customer Name</label>
              <input type="text" id="sale-client-name" class="form-input" placeholder="Optional — leave blank for walk-in">
            </div>
            <div class="form-group">
              <label class="form-label">Sale Date</label>
              <input type="date" id="sale-date" class="form-input" value="${new Date().toISOString().slice(0, 10)}">
            </div>
          </div>

          <div class="form-group" style="background:var(--pc-bg-card);border:1px solid var(--pc-border);border-radius:8px;padding:var(--sp-3);">
            <div class="d-flex gap-3 flex-wrap items-end">
              <div class="form-group" style="flex:2;margin-bottom:0">
                <label class="form-label">Product</label>
                <select id="sale-product-pick" class="form-select">
                  ${products.map(p => `<option value="${p.id}">${Utils.sanitizeHTML(p.sku || '')} — ${Utils.sanitizeHTML(p.title || 'Untitled')} (${Utils.formatCurrency(p.price || 0)})</option>`).join('')}
                </select>
              </div>
              <div class="form-group" style="flex:1;margin-bottom:0">
                <label class="form-label">Qty</label>
                <input type="number" id="sale-product-qty" class="form-input" min="1" step="1" value="1">
              </div>
              <button type="button" class="btn btn-secondary" id="sale-add-item-btn">+ Add</button>
            </div>
          </div>

          <div class="table-container" style="border:none">
            <table class="data-table">
              <thead><tr><th>Product</th><th>Qty</th><th>Unit Price</th><th>Line Total</th><th>Gross Profit</th><th>Margin</th><th></th></tr></thead>
              <tbody id="sale-cart-body">${renderCartRows()}</tbody>
            </table>
          </div>

          <div class="form-group" style="background:var(--pc-bg-card);border:1px solid var(--pc-border);border-radius:8px;padding:var(--sp-4);">
            <div class="d-flex justify-content-between text-sm mb-1"><span class="text-muted">Subtotal</span><span class="font-mono" id="sale-total-subtotal">${Utils.formatCurrency(t.subtotal)}</span></div>
            <div class="d-flex justify-content-between text-sm mb-1"><span class="text-muted">GST (10%)</span><span class="font-mono" id="sale-total-gst">${Utils.formatCurrency(t.gstTotal)}</span></div>
            <div class="d-flex justify-content-between mb-2" style="border-bottom:1px solid var(--pc-border);padding-bottom:8px"><strong>Total</strong><strong class="font-mono" id="sale-total-total">${Utils.formatCurrency(t.total)}</strong></div>
            <div class="d-flex justify-content-between text-sm"><span class="text-muted">Gross Profit</span><strong class="font-mono" id="sale-total-profit" style="color:${t.grossProfit < 0 ? 'var(--pc-danger)' : 'var(--pc-text)'}">${Utils.formatCurrency(t.grossProfit)}</strong></div>
            <div class="d-flex justify-content-between text-sm"><span class="text-muted">Gross Margin</span><strong class="font-mono" id="sale-total-margin" style="color:${t.grossMargin < 0 ? 'var(--pc-danger)' : 'var(--pc-text)'}">${t.grossMargin.toFixed(1)}%</strong></div>
          </div>

          <div class="form-group">
            <label class="form-label">Notes</label>
            <textarea id="sale-notes" class="form-input" rows="2"></textarea>
          </div>
        </form>
      `;
    };

    App.showModal({
      title: 'Record Sale',
      content: buildForm(),
      submitText: 'Save Sale',
      modalSize: 'modal-lg',
      onSubmit: async () => {
        if (cart.length === 0) { Utils.showToast('Add at least one item to the sale.', 'error'); return false; }
        const t = computeTotals();
        const clientName = (document.querySelector('#sale-client-name')?.value || '').trim() || null;
        const saleDate = document.querySelector('#sale-date')?.value || new Date().toISOString().slice(0, 10);
        const notes = (document.querySelector('#sale-notes')?.value || '').trim() || null;

        try {
          const sale = await Store.create(Store.COLLECTIONS.SALES, {
            clientName, saleDate,
            subtotal: t.subtotal, gstTotal: t.gstTotal, total: t.total,
            status: 'Completed', notes
          });

          for (const item of cart) {
            const lineTotal = item.qty * item.unitPrice;
            const lineGst = Math.round(lineTotal * 0.10 * 100) / 100;
            await Store.create(Store.COLLECTIONS.SALE_ITEMS, {
              saleId: sale.id,
              productId: item.productId,
              description: item.title,
              quantity: item.qty,
              unitPrice: item.unitPrice,
              gst: lineGst,
              amount: lineTotal + lineGst
            });

            const prod = Store.getById(Store.COLLECTIONS.PRODUCTS, item.productId);
            if (prod && prod.trackQuantity) {
              const newQty = Math.max(0, (prod.quantity || 0) - item.qty);
              const newStatus = newQty === 0 ? 'Out of Stock' : (prod.status === 'Out of Stock' ? 'In Stock' : prod.status);
              await Store.update(Store.COLLECTIONS.PRODUCTS, item.productId, { quantity: newQty, status: newStatus });
            }
          }

          Utils.showToast('Sale recorded.');
          render();
          return true;
        } catch (e) {
          Utils.showToast('Save failed: ' + e.message, 'error');
          return false;
        }
      }
    });

    // Wire the interactive cart -- add/remove/recalc all happen locally
    // in `cart` before anything is saved.
    setTimeout(() => {
      const rerenderCart = () => {
        const body = document.querySelector('#sale-cart-body');
        if (body) body.innerHTML = renderCartRows();
        const t = computeTotals();
        const setText = (sel, val) => { const el = document.querySelector(sel); if (el) el.textContent = val; };
        setText('#sale-total-subtotal', Utils.formatCurrency(t.subtotal));
        setText('#sale-total-gst', Utils.formatCurrency(t.gstTotal));
        setText('#sale-total-total', Utils.formatCurrency(t.total));
        setText('#sale-total-profit', Utils.formatCurrency(t.grossProfit));
        setText('#sale-total-margin', t.grossMargin.toFixed(1) + '%');
        const profitEl = document.querySelector('#sale-total-profit');
        const marginEl = document.querySelector('#sale-total-margin');
        if (profitEl) profitEl.style.color = t.grossProfit < 0 ? 'var(--pc-danger)' : 'var(--pc-text)';
        if (marginEl) marginEl.style.color = t.grossMargin < 0 ? 'var(--pc-danger)' : 'var(--pc-text)';

        document.querySelectorAll('[data-remove-idx]').forEach(btn => {
          btn.addEventListener('click', () => {
            cart.splice(parseInt(btn.dataset.removeIdx, 10), 1);
            rerenderCart();
          });
        });
      };

      const addBtn = document.querySelector('#sale-add-item-btn');
      if (addBtn) {
        addBtn.addEventListener('click', () => {
          const picker = document.querySelector('#sale-product-pick');
          const qtyInput = document.querySelector('#sale-product-qty');
          if (!picker || !picker.value) return;
          const prod = products.find(p => p.id === picker.value);
          if (!prod) return;
          const qty = Math.max(1, parseInt(qtyInput.value, 10) || 1);
          const existing = cart.find(i => i.productId === prod.id);
          if (existing) {
            existing.qty += qty;
          } else {
            cart.push({ productId: prod.id, title: prod.title || 'Untitled', qty, unitPrice: prod.price || 0, costPrice: prod.costPrice || 0 });
          }
          rerenderCart();
        });
      }
    }, 50);
  }

  function showSalesHistoryModal() {
    const sales = getSales().slice().sort((a, b) => new Date(b.saleDate || b.createdAt || 0) - new Date(a.saleDate || a.createdAt || 0));
    const items = getSaleItems();

    const rows = sales.length === 0
      ? '<tr><td colspan="6" class="text-center text-muted">No sales recorded yet.</td></tr>'
      : sales.map(s => {
          const lines = items.filter(i => i.saleId === s.id);
          const cost = lines.reduce((sum, li) => {
            const prod = Store.getById(Store.COLLECTIONS.PRODUCTS, li.productId);
            return sum + (li.quantity || 0) * (prod ? (prod.costPrice || 0) : 0);
          }, 0);
          const grossProfit = (s.subtotal || 0) - cost;
          const grossMargin = s.subtotal > 0 ? (grossProfit / s.subtotal) * 100 : 0;
          return `
            <tr>
              <td class="text-xs">${Utils.sanitizeHTML(s.saleDate || '\u2014')}</td>
              <td class="text-xs">${Utils.sanitizeHTML(s.clientName || 'Walk-in')}</td>
              <td class="text-xs">${lines.length} item${lines.length === 1 ? '' : 's'}</td>
              <td class="font-mono text-xs">${Utils.formatCurrency(s.total || 0)}</td>
              <td class="font-mono text-xs" style="color:${grossProfit < 0 ? 'var(--pc-danger)' : 'var(--pc-text)'}">${Utils.formatCurrency(grossProfit)}</td>
              <td class="font-mono text-xs" style="color:${grossMargin < 0 ? 'var(--pc-danger)' : 'var(--pc-text)'}">${grossMargin.toFixed(1)}%</td>
            </tr>`;
        }).join('');

    App.showModal({
      title: 'Sales History',
      content: `<div class="table-container" style="border:none;max-height:60vh;overflow-y:auto;">
        <table class="data-table">
          <thead><tr><th>Date</th><th>Customer</th><th>Items</th><th>Total</th><th>Gross Profit</th><th>Margin</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`,
      submitText: 'Close',
      hideCancel: true,
      onSubmit: () => true,
      modalSize: 'modal-lg'
    });
  }

  function showProductModal(productId = null) {
    const editing = !!productId;
    const p = editing ? Store.getById(Store.COLLECTIONS.PRODUCTS, productId) : {};
    if (editing && !p) { Utils.showToast('Product not found.', 'error'); return; }

    const defaultCategory = p.category || 'Bridal Set';
    const suggestedSku = editing ? p.sku : generateSku(defaultCategory);
    // Effective tracking: explicit flag if set, else decide by category.
    const effTrack = editing
      ? (p.trackQuantity === true || (p.trackQuantity == null && tracksQtyByCategory(p.category)))
      : tracksQtyByCategory(p.category || 'Bridal Set');

    const formHTML = `
      <form id="product-form" class="d-flex flex-col gap-3">
        <div class="form-group" id="pf-photo-group">
          <input type="hidden" name="photoUrl" id="pf-photo-url" value="${Utils.sanitizeHTML(p.photoUrl || '')}">
          <label class="form-label">Item Photo ${editing && p.photoUrl ? '' : '(optional — fills in Category, Name & Description for you)'}</label>
          <div class="d-flex items-center gap-3">
            <div id="pf-photo-preview" style="width:64px;height:64px;border-radius:8px;overflow:hidden;background:var(--pc-bg-subtle,#f3f3f3);flex-shrink:0;display:flex;align-items:center;justify-content:center;">
              ${p.photoUrl ? `<img src="${Utils.sanitizeHTML(p.photoUrl)}" style="width:100%;height:100%;object-fit:cover;">` : '<span style="font-size:22px;">📷</span>'}
            </div>
            <div class="d-flex flex-col gap-1">
              <input type="file" id="pf-photo-input" accept="image/jpeg,image/png,image/webp" capture="environment" style="display:none;">
              <button type="button" class="btn btn-secondary btn-sm" id="pf-photo-btn">
                ${p.photoUrl ? 'Replace Photo' : '📷 Fill from Photo'}
              </button>
              <span class="text-xs text-muted" id="pf-photo-status"></span>
            </div>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">SKU / Item Code</label>
            <input type="text" id="pf-sku" name="sku" class="form-input font-mono" value="${Utils.sanitizeHTML(suggestedSku || '')}">
          </div>
          <div class="form-group">
            <label class="form-label">Category</label>
            <select id="pf-category" name="category" class="form-select">
              ${CATEGORIES.map(c => `<option value="${c}" ${p.category===c?'selected':''}>${c}</option>`).join('')}
            </select>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Product Name <span class="required">*</span></label>
          <input type="text" id="pf-title" name="title" class="form-input" required value="${Utils.sanitizeHTML(p.title || '')}" placeholder="e.g. Ivory Silk Bridal Lehenga / Gold Bridal Sneakers">
        </div>

        <div class="form-group">
          <label class="form-label">Description</label>
          <textarea id="pf-description" name="description" class="form-input" rows="5" placeholder="Fabric, work, size, colour... (auto-fills from photo, or edit manually)">${Utils.sanitizeHTML(p.description || '')}</textarea>
        </div>


        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Cost Price (from India, AUD)</label>
            <input type="number" id="pf-cost-price" name="costPrice" class="form-input font-mono" min="0" step="0.01" value="${p.costPrice || 0}">
          </div>
          <div class="form-group">
            <label class="form-label">Selling Price (ex-GST, AUD) <span class="required">*</span></label>
            <input type="number" id="pf-price" name="price" class="form-input font-mono" min="0" step="0.01" required value="${p.price || 0}">
          </div>
        </div>

        <!-- Gross profit / margin -- computed live from the two fields
             above, never stored as its own column. Storing a derived
             number risks it going stale the moment cost or price changes
             without this exact form being the thing that updates it;
             computing it on the fly is always correct. -->
        <div class="form-group" style="background:var(--pc-bg-card);border:1px solid var(--pc-border);border-radius:8px;padding:var(--sp-3);">
          <div class="d-flex gap-4 flex-wrap">
            <div><span class="text-xs text-muted">Gross Profit</span><br><strong id="pf-gross-profit" class="font-mono" style="color:var(--pc-text)">$0.00</strong></div>
            <div><span class="text-xs text-muted">Gross Margin</span><br><strong id="pf-gross-margin" class="font-mono" style="color:var(--pc-text)">0%</strong></div>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Status</label>
            <select name="status" class="form-select">
              ${STATUSES.map(s => `<option value="${s}" ${p.status===s?'selected':''}>${s}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Location</label>
            <select name="location" class="form-select">
              ${LOCATIONS.map(l => `<option value="${l}" ${p.location===l?'selected':''}>${l}</option>`).join('')}
            </select>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Color</label>
            <input type="text" name="color" class="form-input" value="${Utils.sanitizeHTML(p.color || '')}" placeholder="e.g. Mint Green, Dual-tone Red/Gold">
          </div>
          <div class="form-group">
            <label class="form-label">Size</label>
            <input type="text" name="size" class="form-input" value="${Utils.sanitizeHTML(p.size || '')}" placeholder="e.g. M, Free Size, 38">
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Fabric</label>
            <input type="text" name="fabric" class="form-input" value="${Utils.sanitizeHTML(p.fabric || '')}" placeholder="e.g. Silk, Georgette, Velvet">
          </div>
          <div class="form-group">
            <label class="form-label">Embellishment / Work</label>
            <input type="text" name="embellishment" class="form-input" value="${Utils.sanitizeHTML(p.embellishment || '')}" placeholder="e.g. Zardozi, Mirror work, Sequins">
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Supplier</label>
            <div class="d-flex gap-2">
              <select name="vendorId" id="pf-vendor" class="form-select" style="flex:1">
                <option value="">— None —</option>
                ${getVendors().map(v => `<option value="${v.id}" ${p.vendorId===v.id?'selected':''}>${Utils.sanitizeHTML(v.businessName || 'Unnamed vendor')}</option>`).join('')}
              </select>
              <button type="button" class="btn btn-secondary btn-sm" id="pf-add-vendor-btn" title="Add a new supplier">+ New</button>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Date Received</label>
            <input type="date" name="dateReceived" class="form-input" value="${p.dateReceived ? String(p.dateReceived).slice(0,10) : ''}">
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Condition</label>
            <select name="condition" class="form-select">
              <option value="">— Not set —</option>
              ${CONDITIONS.map(c => `<option value="${c}" ${p.condition===c?'selected':''}>${c}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Rack / Bag</label>
            <input type="text" name="rackOrBag" class="form-input" value="${Utils.sanitizeHTML(p.rackOrBag || '')}" placeholder="e.g. Rack 3, Bag 12">
          </div>
        </div>

        <!-- Quantity controls: shown when the item is stock-tracked -->
        <div class="form-group" id="qty-group" style="display:${effTrack ? 'block' : 'none'}">
          <label class="form-label">Quantity in Stock</label>
          <input type="number" name="quantity" class="form-input font-mono" min="0" step="1" value="${p.quantity ?? 1}">
          <div class="text-xs text-muted mt-1">At 0, this item is automatically marked Out of Stock.</div>
        </div>

        <div class="form-group">
          <label class="d-flex items-center gap-2" style="cursor:pointer">
            <input type="checkbox" name="trackQuantity" id="track-qty-cb" ${effTrack ? 'checked' : ''}>
            <span class="text-sm">Track stock quantity (multiple identical units)</span>
          </label>
        </div>

        <div class="form-group">
          <label class="d-flex items-center gap-2" style="cursor:pointer">
            <input type="checkbox" name="isAccessory" ${p.isAccessory ? 'checked' : ''}>
            <span class="text-sm">This is an accessory / add-on item (jewellery, purse, etc.)</span>
          </label>
        </div>
      </form>
    `;

    App.showModal({
      title: editing ? 'Edit Product' : 'Add New Product',
      content: formHTML,
      submitText: editing ? 'Save Changes' : 'Add Product',
      onSubmit: async (modalEl) => {
        const form = Utils.$('#product-form', modalEl);
        if (!form.checkValidity()) { form.reportValidity(); return false; }
        const fd = new FormData(form);

        const trackQuantity = fd.get('trackQuantity') === 'on';
        let quantity = trackQuantity ? (parseInt(fd.get('quantity'), 10) || 0) : 1;
        let status = fd.get('status');
        // Auto-flip: stocked item at 0 units becomes Out of Stock.
        if (trackQuantity && quantity === 0 && status === 'In Stock') {
          status = 'Out of Stock';
        }
        // And if a tracked item is restocked above 0 but still marked Out of Stock, bring it back.
        if (trackQuantity && quantity > 0 && status === 'Out of Stock') {
          status = 'In Stock';
        }

        const payload = {
          sku: fd.get('sku').trim(),
          title: fd.get('title').trim(),
          category: fd.get('category'),
          description: fd.get('description').trim(),
          photoUrl: fd.get('photoUrl') || null,
          costPrice: parseFloat(fd.get('costPrice')) || 0,
          price: parseFloat(fd.get('price')) || 0,
          status: status,
          location: fd.get('location'),
          isAccessory: fd.get('isAccessory') === 'on',
          trackQuantity: trackQuantity,
          quantity: quantity,
          color: (fd.get('color') || '').trim() || null,
          size: (fd.get('size') || '').trim() || null,
          fabric: (fd.get('fabric') || '').trim() || null,
          embellishment: (fd.get('embellishment') || '').trim() || null,
          vendorId: fd.get('vendorId') || null,
          dateReceived: fd.get('dateReceived') || null,
          condition: fd.get('condition') || null,
          rackOrBag: (fd.get('rackOrBag') || '').trim() || null
        };

        try {
          if (editing) {
            await Store.update(Store.COLLECTIONS.PRODUCTS, productId, payload);
            Utils.showToast('Product updated.');
          } else {
            await Store.create(Store.COLLECTIONS.PRODUCTS, payload);
            Utils.showToast('Product added to inventory.');
          }
          render();
          return true;
        } catch (e) {
          Utils.showToast('Save failed: ' + e.message, 'error');
          return false;
        }
      }
    });

    // Wire quantity show/hide: category change or track checkbox toggle.
    setTimeout(() => {
      const catSel = document.querySelector('#product-form [name="category"]');
      const trackCb = document.querySelector('#track-qty-cb');
      const qtyGroup = document.querySelector('#qty-group');
      if (!catSel || !trackCb || !qtyGroup) return;

      const syncQtyVisibility = () => {
        qtyGroup.style.display = trackCb.checked ? 'block' : 'none';
      };
      // When category changes, default the track flag to the category rule
      // (user can still override by toggling the checkbox afterwards), and
      // regenerate the suggested SKU to match the new category's prefix —
      // only when adding a new product; an existing SKU is never silently
      // rewritten out from under an edit.
      catSel.addEventListener('change', () => {
        trackCb.checked = tracksQtyByCategory(catSel.value);
        syncQtyVisibility();
        if (!editing) {
          const skuInput = document.querySelector('#pf-sku');
          if (skuInput) skuInput.value = generateSku(catSel.value);
        }
      });
      trackCb.addEventListener('change', syncQtyVisibility);

      // Live Gross Profit / Gross Margin -- recalculates on every
      // keystroke in either price field. Never written to the database;
      // see the comment on the display block itself for why.
      const costEl = document.querySelector('#pf-cost-price');
      const priceEl = document.querySelector('#pf-price');
      const grossProfitEl = document.querySelector('#pf-gross-profit');
      const grossMarginEl = document.querySelector('#pf-gross-margin');
      const recalcMargins = () => {
        if (!costEl || !priceEl || !grossProfitEl || !grossMarginEl) return;
        const cost = parseFloat(costEl.value) || 0;
        const price = parseFloat(priceEl.value) || 0;
        const profit = price - cost;
        const margin = price > 0 ? (profit / price) * 100 : 0;
        grossProfitEl.textContent = Utils.formatCurrency(profit);
        grossProfitEl.style.color = profit < 0 ? 'var(--pc-danger, #c0392b)' : '';
        grossMarginEl.textContent = margin.toFixed(1) + '%';
        grossMarginEl.style.color = margin < 0 ? 'var(--pc-danger, #c0392b)' : '';
      };
      if (costEl) costEl.addEventListener('input', recalcMargins);
      if (priceEl) priceEl.addEventListener('input', recalcMargins);
      recalcMargins();

      // "+ New" supplier -- quick-add a vendor without leaving this form.
      // Opens the same vendor form used from the main Vendors screen;
      // on save, refreshes this dropdown and selects the new vendor.
      const addVendorBtn = document.querySelector('#pf-add-vendor-btn');
      const vendorSelect = document.querySelector('#pf-vendor');
      if (addVendorBtn && vendorSelect) {
        addVendorBtn.addEventListener('click', () => {
          showVendorModal(null, (newVendor) => {
            const opt = document.createElement('option');
            opt.value = newVendor.id;
            opt.textContent = newVendor.businessName || 'Unnamed vendor';
            vendorSelect.appendChild(opt);
            vendorSelect.value = newVendor.id;
          });
        });
      }

      // Wire "Fill from Photo" — pick a file, send it to the extraction
      // endpoint, populate Category/Title/Description with what comes
      // back. Price/status/location/quantity are left alone on purpose —
      // see product-photo-intake.js for why the AI never touches those.
      const photoBtn = document.querySelector('#pf-photo-btn');
      const photoInput = document.querySelector('#pf-photo-input');
      const photoStatus = document.querySelector('#pf-photo-status');
      const photoPreview = document.querySelector('#pf-photo-preview');
      const photoUrlHidden = document.querySelector('#pf-photo-url');
      if (photoPreview) {
        photoPreview.style.cursor = 'zoom-in';
        photoPreview.addEventListener('click', () => {
          const previewImg = photoPreview.querySelector('img');
          if (previewImg && previewImg.src) openPhotoLightbox(previewImg.src);
        });
      }
      if (photoBtn && photoInput) {
        photoBtn.addEventListener('click', () => photoInput.click());
        photoInput.addEventListener('change', async () => {
          const file = photoInput.files && photoInput.files[0];
          if (!file) return;

          photoStatus.textContent = 'Reading photo…';
          photoBtn.disabled = true;

          try {
            // Normalize every photo to the same max dimension + JPEG
            // quality before upload, regardless of source device. Without
            // this, whatever resolution the phone's camera produced went
            // straight through unchanged -- Android and iPhone default to
            // very different native resolutions and file sizes, which is
            // what caused the inconsistency (nothing was actually wrong
            // with the AI extraction itself, there was just nothing
            // normalizing the input on either side). 1600px on the long
            // edge is comfortably enough detail for fabric/colour/
            // embroidery recognition while keeping uploads small and
            // consistent on both platforms.
            const resizedDataUrl = await resizeImageForUpload(file, 1600, 0.85);

            photoStatus.textContent = 'Analyzing photo…';
            const client = Store.getClient();
            const { data: sessionData } = await client.auth.getSession();
            const authToken = sessionData?.session?.access_token;
            if (!authToken) {
              photoStatus.textContent = 'Session expired — please refresh and try again.';
              photoBtn.disabled = false;
              return;
            }

            const res = await fetch('/api/product-photo-intake', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ token: authToken, imageBase64: resizedDataUrl })
            });
            const result = await res.json();

            if (!res.ok || !result.ok) {
              photoStatus.textContent = result.error || 'Could not read that photo — try a clearer, single-item shot.';
              photoBtn.disabled = false;
              return;
            }

            // Populate what the photo actually told us. Never touches
            // price, cost, status, location, or quantity — those aren't
            // visible in a photo, and this form still requires you to
            // set them yourself.
            const catSelEl = document.querySelector('#pf-category');
            const titleEl = document.querySelector('#pf-title');
            const descEl = document.querySelector('#pf-description');
            if (catSelEl) { catSelEl.value = result.category; catSelEl.dispatchEvent(new Event('change')); }
            if (titleEl) titleEl.value = result.title;
            if (descEl) descEl.value = result.description || '';
            if (photoUrlHidden) photoUrlHidden.value = result.photoUrl;
            if (photoPreview) photoPreview.innerHTML = `<img src="${result.photoUrl}" style="width:100%;height:100%;object-fit:cover;">`;
            photoBtn.textContent = 'Replace Photo';
            photoStatus.textContent = 'Filled in from photo — review before saving.';
          } catch (err) {
            photoStatus.textContent = 'Something went wrong reading that photo. Try again.';
          } finally {
            photoBtn.disabled = false;
          }
        });
      }
    }, 50);
  }

  function editProduct(id) { showProductModal(id); }

  function deleteProduct(id) {
    const p = Store.getById(Store.COLLECTIONS.PRODUCTS, id);
    if (!p) return;
    App.showConfirm({
      title: 'Delete Product',
      text: `Delete "${p.title}"? This cannot be undone.`,
      confirmText: 'Delete',
      onConfirm: async () => {
        try {
          await Store.delete(Store.COLLECTIONS.PRODUCTS, id);
          Utils.showToast('Product deleted.');
          render();
        } catch (e) {
          Utils.showToast('Delete failed: ' + e.message, 'error');
        }
      }
    });
  }

  function exportCSV() {
    const list = getProducts();
    if (list.length === 0) { Utils.showToast('No products to export.', 'info'); return; }
    const headers = ['SKU', 'Title', 'Category', 'Cost Price', 'Selling Price', 'Status', 'Location', 'Accessory'];
    const rows = list.map(p => [
      p.sku || '', p.title || '', p.category || '', p.costPrice || 0,
      p.price || 0, p.status || '', p.location || '', p.isAccessory ? 'Yes' : 'No'
    ]);
    const csv = [headers, ...rows]
      .map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `poojas-couture-inventory-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    Utils.showToast('Inventory exported.');
  }

  function showReport(type) {
    const products = Store.getAll(Store.COLLECTIONS.PRODUCTS) || [];
    const inStock  = products.filter(p => p.status === 'In Stock');
    const reserved = products.filter(p => p.status === 'Reserved');
    let title = '', rows = [];
    if (type === 'all')      { title = '📦 All Products';       rows = products.slice().sort((a,b)=>(a.name||'').localeCompare(b.name||'')); }
    else if (type === 'instock')  { title = '✅ In Stock';           rows = inStock.slice().sort((a,b)=>(a.name||'').localeCompare(b.name||'')); }
    else if (type === 'reserved') { title = '🔖 Reserved';           rows = reserved.slice().sort((a,b)=>(a.name||'').localeCompare(b.name||'')); }
    else if (type === 'value')    { title = '💰 Stock Value Breakdown'; rows = inStock.slice().sort((a,b)=>(b.price||0)-(a.price||0)); }
    const content = rows.length === 0
      ? '<div class="text-center p-6 text-muted">No products in this category.</div>'
      : '<div class="table-container" style="border:none"><table class="data-table"><thead><tr><th>SKU</th><th>Name</th><th>Category</th><th>Status</th><th>Retail Price</th></tr></thead><tbody>' +
        rows.map(p =>
          '<tr><td class="font-mono text-gold text-xs">' + Utils.sanitizeHTML(p.sku||'\u2014') + '</td>' +
          '<td class="font-semibold text-xs">' + Utils.sanitizeHTML(p.name||'\u2014') + '</td>' +
          '<td class="text-xs">' + Utils.sanitizeHTML(p.category||'\u2014') + '</td>' +
          '<td><span class="badge badge-' + (p.status==='In Stock'?'success':p.status==='Reserved'?'warning':'muted') + ' text-xs">' + Utils.sanitizeHTML(p.status||'\u2014') + '</span></td>' +
          '<td class="font-mono text-xs">' + Utils.formatCurrency(p.price||0) + '</td></tr>'
        ).join('') + '</tbody></table></div>';
    App.showModal({ title, content: '<div style="max-height:60vh;overflow-y:auto;">' + content + '</div>',
      submitText: 'Close', hideCancel: true, onSubmit: () => true, modalSize: 'modal-lg' });
  }

  return {
    init,
    editProduct,
    deleteProduct,
    showProductModal,
    showReport,
    openPhotoLightbox,
    showVendorsListModal,
    editVendor
  };
})();
