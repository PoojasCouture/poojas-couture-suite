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

  function init() {
    activeCategory = 'all';
    activeStatus = 'all';
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
          <button class="btn btn-primary" id="btn-add-product">+ Add Product</button>
        </div>
      </div>

      <!-- Summary stat cards -->
      <div class="d-grid gap-4 mb-5 animate-fade-in stagger-1" style="grid-template-columns:repeat(auto-fit,minmax(190px,1fr))">
        <div class="stat-card">
          <div class="stat-card-header"><span class="stat-card-icon gold">📦</span></div>
          <div class="stat-card-value">${products.length}</div>
          <div class="stat-card-label">Total Products</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-header"><span class="stat-card-icon green">✅</span></div>
          <div class="stat-card-value">${inStock.length}</div>
          <div class="stat-card-label">In Stock</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-header"><span class="stat-card-icon blue">🔖</span></div>
          <div class="stat-card-value">${reserved.length}</div>
          <div class="stat-card-label">Reserved</div>
        </div>
        <div class="stat-card">
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
    Utils.$('#btn-export-products').addEventListener('click', exportCSV);

    const searchEl = Utils.$('#product-search');
    searchEl.addEventListener('input', (e) => { searchTerm = e.target.value; renderRows(); });
    Utils.$('#product-category-filter').addEventListener('change', (e) => { activeCategory = e.target.value; renderRows(); });
    Utils.$('#product-status-filter').addEventListener('change', (e) => { activeStatus = e.target.value; renderRows(); });

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

  function showProductModal(productId = null) {
    const editing = !!productId;
    const p = editing ? Store.getById(Store.COLLECTIONS.PRODUCTS, productId) : {};
    if (editing && !p) { Utils.showToast('Product not found.', 'error'); return; }

    const suggestedSku = editing ? p.sku : `PC-${Utils.randomBetween(10000, 99999)}`;
    // Effective tracking: explicit flag if set, else decide by category.
    const effTrack = editing
      ? (p.trackQuantity === true || (p.trackQuantity == null && tracksQtyByCategory(p.category)))
      : tracksQtyByCategory(p.category || 'Bridal Set');

    const formHTML = `
      <form id="product-form" class="d-flex flex-col gap-3">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">SKU / Item Code</label>
            <input type="text" name="sku" class="form-input font-mono" value="${Utils.sanitizeHTML(suggestedSku || '')}">
          </div>
          <div class="form-group">
            <label class="form-label">Category</label>
            <select name="category" class="form-select">
              ${CATEGORIES.map(c => `<option value="${c}" ${p.category===c?'selected':''}>${c}</option>`).join('')}
            </select>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Product Name *</label>
          <input type="text" name="title" class="form-input" required value="${Utils.sanitizeHTML(p.title || '')}" placeholder="e.g. Ivory Silk Bridal Lehenga / Gold Bridal Sneakers">
        </div>

        <div class="form-group">
          <label class="form-label">Description</label>
          <textarea name="description" class="form-input" rows="2" placeholder="Fabric, work, size, colour...">${Utils.sanitizeHTML(p.description || '')}</textarea>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Cost Price (from India, AUD)</label>
            <input type="number" name="costPrice" class="form-input font-mono" min="0" step="0.01" value="${p.costPrice || 0}">
          </div>
          <div class="form-group">
            <label class="form-label">Selling Price (ex-GST, AUD) *</label>
            <input type="number" name="price" class="form-input font-mono" min="0" step="0.01" required value="${p.price || 0}">
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
          costPrice: parseFloat(fd.get('costPrice')) || 0,
          price: parseFloat(fd.get('price')) || 0,
          status: status,
          location: fd.get('location'),
          isAccessory: fd.get('isAccessory') === 'on',
          trackQuantity: trackQuantity,
          quantity: quantity
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
      // (user can still override by toggling the checkbox afterwards).
      catSel.addEventListener('change', () => {
        trackCb.checked = tracksQtyByCategory(catSel.value);
        syncQtyVisibility();
      });
      trackCb.addEventListener('change', syncQtyVisibility);
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
          await Store.remove(Store.COLLECTIONS.PRODUCTS, id);
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

  return {
    init,
    editProduct,
    deleteProduct,
    showProductModal
  };
})();
