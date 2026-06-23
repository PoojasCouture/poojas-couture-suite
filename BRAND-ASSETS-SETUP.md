# Brand Assets Picker — setup

Pulls images from the public Google Drive brand folder
(`1vPNkZQRtqxf8cZyrmtEx5yW9AG67JHd-`) and renders a thumbnail picker.

## Files (drop into the repo at these paths)

- `functions/api/brand-assets.js` — Pages Function. Lists the folder, returns image metadata + thumbnail URLs as JSON at `/api/brand-assets`.
- `js/brand-asset-picker.js` — frontend module (`openAssetPicker()` modal, `mountAssetPicker()` inline).
- `css/brand-asset-picker.css` — styles.
- `brand-asset-picker-demo.html` — standalone test page (do not deploy; for local verification).

## One-time: create the Drive API key

The folder is shared "anyone with link", so browsers load the images without auth.
But *listing* the folder needs a key. No OAuth, no consent screen.

1. Google Cloud Console → create/select a project.
2. APIs & Services → Library → enable **Google Drive API**.
3. APIs & Services → Credentials → Create credentials → **API key**.
4. Restrict the key:
   - **API restrictions** → restrict to *Google Drive API* only.
   - **Application restrictions** → HTTP referrers won't work (the call is server-side
     from Cloudflare). Leave as "None", and rely on the API restriction above. The key
     can only read public Drive files — it cannot touch private data.
5. Cloudflare Pages → your project → Settings → Environment variables → add
   **`GOOGLE_DRIVE_API_KEY`** (encrypted) = the key. Add to both Production and Preview.
6. Redeploy.

Optional: set `BRAND_ASSETS_FOLDER_ID` to point at a different folder without code changes.

## Wire it into the app

```js
import { openAssetPicker } from "/js/brand-asset-picker.js"; // + load the CSS

const asset = await openAssetPicker();
if (asset) {
  // asset.id, asset.name, asset.thumb (800px), asset.thumbSmall (320px), asset.view, asset.width, asset.height
  imgEl.src = asset.thumb;
}
```

## Critical operational caveat — read this

**"Anyone with link" is set per file, not inherited from the folder.** When Pooja adds
images the normal way (drag into the folder), they are **private by default** and the
picker will show a red "⚠ not shared" tile for them.

Two options, pick one and commit to it:

- **Process fix (cheapest):** after adding files, select them in Drive → Share →
  "Anyone with the link" → Viewer. Document this as a required step.
- **Code fix (robust):** have `brand-assets.js` also call the Drive permissions endpoint
  per file and either auto-skip or explicitly flag non-public files server-side. Costs an
  extra API call per file; worth it once the folder grows.

The picker already fails *visibly* (red tile) rather than silently, so a missed share
won't go unnoticed — but it's still a manual gap today.

## Known fragilities (logged, not blocking)

- Depends on one personal account's sharing defaults (`poojascoutures@gmail.com`).
  If that account changes folder/sharing settings, the picker breaks.
- `drive.google.com/thumbnail` is the embed path used (not `uc?export=download`, which
  Google throttles for hotlinking). Stable for normal volumes; not a CDN.
- No pagination in the UI — fine up to a few hundred images. Revisit if the folder gets huge.
