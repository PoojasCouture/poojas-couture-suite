/* ============================================================
   POOJA'S COUTURE — Try-On Kiosk Controller
   Inherits the session from the main app (shared Supabase auth).
   Admin/operations only -- see js/access.js (kioskPortal) --
   every use of this portal triggers a real, paid Gemini call.
   No separate login -- if not signed in, redirect to main login.
   ============================================================ */

document.addEventListener('DOMContentLoaded', async () => {

  let currentUser = null;
  let mediaStream = null;
  let capturedPhotoDataUrl = null;
  let selectedGarment = null; // { photoUrl, title }

  function el(id) { return document.getElementById(id); }

  function validateRole(user) {
    const appRole = (user.appRole || user.app_role || '').toLowerCase();
    const perms = user.permissions || {};
    const access = (window.AccessControl && AccessControl.getRoleAccess(appRole, !!perms.crm, !!perms.socialCrm)) || {};
    return access.kioskPortal === true;
  }

  function showGate(message, allowLogin) {
    const gs = el('gate-screen');
    const kw = el('kiosk-workspace');
    const gm = el('gate-message');
    const ga = el('gate-actions');
    if (gs) gs.classList.add('active');
    if (kw) kw.classList.add('d-none');
    if (gm) gm.textContent = message;
    if (ga) ga.classList.toggle('d-none', !allowLogin);
  }

  function showWorkspace() {
    const gs = el('gate-screen');
    const kw = el('kiosk-workspace');
    if (gs) gs.classList.remove('active');
    if (kw) kw.classList.remove('d-none');
  }

  // ---------- Session bootstrap (inherits main-app login) ----------
  try {
    await Store.ready();
  } catch (e) {
    console.error('Could not connect to database:', e);
    showGate('Could not connect to the database. Check your connection and try again.', true);
    return;
  }

  currentUser = Store.getCurrentUser();
  if (!currentUser) {
    showGate('You are not signed in. Please log in through the main app first.', true);
    return;
  }
  if (!validateRole(currentUser)) {
    showGate('This kiosk is for admin/operations staff only.', true);
    return;
  }

  showWorkspace();

  // ---------- Explicit photo cleanup ----------
  // Nothing here was ever written to localStorage/sessionStorage/the
  // HTTP cache to begin with -- the captured photo only ever lived as
  // a plain JS variable, and the generated result only as a data: URL
  // in the DOM, both of which vanish on navigation regardless. This
  // function makes that an explicit guarantee rather than an implicit
  // side effect of leaving the page, given it's a real customer's
  // photo -- clears the in-memory variable, blanks the canvas pixel
  // buffer, and clears every <img> src holding photo data.
  function clearAllPhotoData() {
    capturedPhotoDataUrl = null;
    const cnv = el('kiosk-canvas');
    if (cnv) {
      const ctx = cnv.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, cnv.width, cnv.height);
      cnv.width = 0;
      cnv.height = 0;
    }
    const resultImg = el('kiosk-result-img');
    if (resultImg) resultImg.src = '';
    const frameImg = document.querySelector('#kiosk-camera-frame img');
    if (frameImg) frameImg.src = '';
  }

  // ---------- Exit to main app ----------
  const btnLogout = el('btn-logout');
  if (btnLogout) btnLogout.addEventListener('click', async () => {
    // Returns to the main app WITHOUT logging out (staff stay signed in).
    // Camera and photo data are still cleared first.
    stopCamera();
    clearAllPhotoData();
    window.location.href = '../index.html';
  });

  // Also clear on tab close / navigating away without clicking Exit --
  // covers a customer or staff member just closing the browser tab.
  window.addEventListener('pagehide', () => {
    stopCamera();
    clearAllPhotoData();
  });

  // ---------- Camera ----------
  const video = el('kiosk-video');
  const canvas = el('kiosk-canvas');
  const cameraFrame = el('kiosk-camera-frame');
  const btnCapture = el('btn-capture');
  const btnRetake = el('btn-retake');
  const garmentSection = el('kiosk-garment-section');
  const garmentStrip = el('kiosk-garment-strip');
  const btnGenerate = el('btn-generate');
  const kioskStatus = el('kiosk-status');

  async function startCamera() {
    try {
      mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 720 }, height: { ideal: 960 } },
        audio: false
      });
      video.srcObject = mediaStream;
    } catch (err) {
      kioskStatus.textContent = 'Could not access the camera. Check browser camera permissions and try again.';
    }
  }

  function stopCamera() {
    if (mediaStream) {
      mediaStream.getTracks().forEach(t => t.stop());
      mediaStream = null;
    }
  }

  await startCamera();

  btnCapture.addEventListener('click', () => {
    if (!video.videoWidth) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
    capturedPhotoDataUrl = canvas.toDataURL('image/jpeg', 0.9);

    stopCamera();
    cameraFrame.innerHTML = `<img src="${capturedPhotoDataUrl}" alt="Your photo">`;
    btnCapture.classList.add('d-none');
    btnRetake.classList.remove('d-none');
    garmentSection.classList.remove('d-none');
    loadGarments();
  });

  btnRetake.addEventListener('click', async () => {
    capturedPhotoDataUrl = null;
    selectedGarment = null;
    btnGenerate.disabled = true;
    cameraFrame.innerHTML = `<video id="kiosk-video" autoplay playsinline muted></video>`;
    btnCapture.classList.remove('d-none');
    btnRetake.classList.add('d-none');
    garmentSection.classList.add('d-none');
    // Re-bind the new video element and restart the stream
    const newVideo = el('kiosk-video');
    await startCamera();
    if (mediaStream) newVideo.srcObject = mediaStream;
  });

  // ---------- Garment gallery ----------
  function loadGarments() {
    const products = Store.getAll(Store.COLLECTIONS.PRODUCTS).filter(p => !!p.photoUrl);
    if (products.length === 0) {
      garmentStrip.innerHTML = '<div class="text-xs text-muted p-2">No garment photos in the catalog yet -- add a product photo in Stock & Inventory first.</div>';
      return;
    }
    // Gallery THUMBNAILS show the AI model photo when one exists --
    // more appealing for a customer to browse -- falling back to the
    // plain garment photo when no model photo has been generated yet
    // (same primary-display logic as the Product Details view).
    // The GENERATION CALL below still always sends the raw garment
    // photo (product.photoUrl), never the model photo, regardless of
    // which one is shown here -- sending a photo that already has a
    // different model wearing the garment as the "garment reference"
    // would confuse the generation with two people instead of one,
    // and the raw photo is the more accurate source for fabric/
    // structure fidelity anyway.
    garmentStrip.innerHTML = products.map(p => `
      <div class="kiosk-garment-chip" data-product-id="${p.id}" title="${Utils.sanitizeHTML(p.title || '')}">
        <img src="${Utils.sanitizeHTML(p.modelPhotoUrl || p.photoUrl)}" alt="${Utils.sanitizeHTML(p.title || '')}">
      </div>
    `).join('');

    garmentStrip.querySelectorAll('.kiosk-garment-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const product = products.find(p => p.id === chip.dataset.productId);
        if (!product) return;
        garmentStrip.querySelectorAll('.kiosk-garment-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        selectedGarment = { photoUrl: product.photoUrl, title: product.title };
        btnGenerate.disabled = false;
        kioskStatus.textContent = '';
      });
    });
  }

  // ---------- Generate ----------
  btnGenerate.addEventListener('click', async () => {
    if (!capturedPhotoDataUrl || !selectedGarment) return;

    btnGenerate.disabled = true;
    kioskStatus.textContent = 'Generating your look… (10-20s)';

    try {
      const client = Store.getClient();
      const { data: sessionData } = await client.auth.getSession();
      const authToken = sessionData?.session?.access_token;
      if (!authToken) {
        kioskStatus.textContent = 'Session expired — please refresh and try again.';
        btnGenerate.disabled = false;
        return;
      }

      const res = await fetch('/api/generate-customer-tryon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: authToken,
          customerPhotoBase64: capturedPhotoDataUrl,
          garmentPhotoUrl: selectedGarment.photoUrl
        })
      });
      const result = await res.json();

      if (!res.ok || !result.ok) {
        kioskStatus.textContent = result.error || 'Could not generate that look. Try again.';
        btnGenerate.disabled = false;
        return;
      }

      el('kiosk-result-img').src = result.imageDataUrl;
      el('kiosk-result-overlay').classList.remove('d-none');
      kioskStatus.textContent = '';
    } catch (err) {
      kioskStatus.textContent = 'Something went wrong generating that look. Try again.';
    } finally {
      btnGenerate.disabled = false;
    }
  });

  el('btn-result-close').addEventListener('click', () => {
    el('kiosk-result-overlay').classList.add('d-none');
    // Clear the generated result once viewed -- no reason to keep
    // holding it in the DOM after the customer's seen it.
    el('kiosk-result-img').src = '';
  });
});
