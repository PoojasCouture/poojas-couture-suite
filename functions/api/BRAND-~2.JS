// js/brand-asset-picker.js
// Framework-agnostic brand asset picker. Fetches /api/brand-assets and renders
// a selectable thumbnail grid. No build step, no dependencies.
//
// Usage:
//   import { openAssetPicker } from "./brand-asset-picker.js";
//   const asset = await openAssetPicker();   // resolves to the chosen asset, or null if cancelled
//   if (asset) console.log(asset.id, asset.thumb, asset.view);
//
// Or mount inline into a container instead of a modal:
//   import { mountAssetPicker } from "./brand-asset-picker.js";
//   mountAssetPicker(document.getElementById("assets"), { onSelect: (a) => {...} });

const ENDPOINT = "/api/brand-assets";

async function fetchAssets() {
  const res = await fetch(ENDPOINT, { headers: { Accept: "application/json" } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Failed to load assets (${res.status})`);
  }
  return data.assets || [];
}

// Renders the grid into `container`. Returns a cleanup function.
// opts: { onSelect(asset), selectedId }
export function mountAssetPicker(container, opts = {}) {
  const { onSelect } = opts;
  let selectedId = opts.selectedId || null;

  container.classList.add("bap-root");
  container.innerHTML = `<div class="bap-status">Loading brand assets…</div>`;

  let cancelled = false;

  fetchAssets()
    .then((assets) => {
      if (cancelled) return;
      if (!assets.length) {
        container.innerHTML = `<div class="bap-status bap-empty">No images in the brand folder yet.</div>`;
        return;
      }

      const grid = document.createElement("div");
      grid.className = "bap-grid";

      for (const asset of assets) {
        const cell = document.createElement("button");
        cell.type = "button";
        cell.className = "bap-cell" + (asset.id === selectedId ? " bap-selected" : "");
        cell.title = asset.name;

        const img = document.createElement("img");
        img.loading = "lazy";
        img.alt = asset.name;
        img.src = asset.thumbSmall;
        // If a file isn't actually public, the thumbnail 403s — surface it
        // instead of showing a silently broken tile.
        img.onerror = () => {
          cell.classList.add("bap-broken");
          cell.title = `${asset.name} — not publicly shared (check Drive sharing)`;
          img.replaceWith(Object.assign(document.createElement("span"), {
            className: "bap-broken-label",
            textContent: "⚠ not shared",
          }));
        };

        const label = document.createElement("span");
        label.className = "bap-name";
        label.textContent = asset.name;

        cell.append(img, label);
        cell.addEventListener("click", () => {
          selectedId = asset.id;
          grid.querySelectorAll(".bap-cell").forEach((c) => c.classList.remove("bap-selected"));
          cell.classList.add("bap-selected");
          if (typeof onSelect === "function") onSelect(asset);
        });

        grid.appendChild(cell);
      }

      container.innerHTML = "";
      container.appendChild(grid);
    })
    .catch((err) => {
      if (cancelled) return;
      container.innerHTML = `<div class="bap-status bap-error">⚠ ${err.message}</div>`;
    });

  return () => {
    cancelled = true;
    container.innerHTML = "";
  };
}

// Modal wrapper. Resolves to the chosen asset, or null if cancelled.
export function openAssetPicker(opts = {}) {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "bap-overlay";
    overlay.innerHTML = `
      <div class="bap-modal" role="dialog" aria-modal="true" aria-label="Choose a brand asset">
        <div class="bap-modal-head">
          <h2>Brand assets</h2>
          <button type="button" class="bap-close" aria-label="Close">×</button>
        </div>
        <div class="bap-modal-body"></div>
        <div class="bap-modal-foot">
          <button type="button" class="bap-cancel">Cancel</button>
          <button type="button" class="bap-use" disabled>Use selected</button>
        </div>
      </div>`;

    document.body.appendChild(overlay);

    let chosen = null;
    const useBtn = overlay.querySelector(".bap-use");
    const body = overlay.querySelector(".bap-modal-body");

    const cleanup = mountAssetPicker(body, {
      selectedId: opts.selectedId,
      onSelect: (asset) => {
        chosen = asset;
        useBtn.disabled = false;
      },
    });

    const close = (result) => {
      cleanup();
      overlay.remove();
      document.removeEventListener("keydown", onKey);
      resolve(result);
    };
    const onKey = (e) => { if (e.key === "Escape") close(null); };

    overlay.querySelector(".bap-close").addEventListener("click", () => close(null));
    overlay.querySelector(".bap-cancel").addEventListener("click", () => close(null));
    overlay.addEventListener("click", (e) => { if (e.target === overlay) close(null); });
    useBtn.addEventListener("click", () => close(chosen));
    document.addEventListener("keydown", onKey);
  });
}
