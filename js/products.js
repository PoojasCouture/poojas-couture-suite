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
          <label class="form-label">Product Name *</label>
          <input type="text" id="pf-title" name="title" class="form-input" required value="${Utils.sanitizeHTML(p.title || '')}" placeholder="e.g. Ivory Silk Bridal Lehenga / Gold Bridal Sneakers">
        </div>

        <div class="form-group">
          <label class="form-label">Description</label>
          <textarea id="pf-description" name="description" class="form-input" rows="5" placeholder="Fabric, work, size, colour... (auto-fills from photo, or edit manually)">${Utils.sanitizeHTML(p.description || '')}</textarea>
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
          photoUrl: fd.get('photoUrl') || null,
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
    openPhotoLightbox
  };
})();
