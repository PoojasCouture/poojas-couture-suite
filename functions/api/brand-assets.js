// functions/api/brand-assets.js
// Cloudflare Pages Function — lists images in the public Brand Assets Drive folder.
//
// Why an API key (not OAuth): the folder's files are shared "anyone with link",
// so browsers can LOAD them without auth. But ENUMERATING the folder via the
// Drive API still requires a key. A Drive-API-restricted key has no consent
// screen and no token refresh — set it once and forget it.
//
// Required Pages env var (Settings > Environment variables, encrypted):
//   GOOGLE_DRIVE_API_KEY   = your Drive-API-restricted key
// Optional override:
//   BRAND_ASSETS_FOLDER_ID = Drive folder ID (defaults to the constant below)

const DEFAULT_FOLDER_ID = "1vPNkZQRtqxf8cZyrmtEx5yW9AG67JHd-";

// Thumbnail URL that embeds reliably in <img> (avoids the throttled uc?export=download path).
// sz=w<width> controls the rendered size; bump for retina/large previews.
function thumbUrl(id, width = 800) {
  return `https://drive.google.com/thumbnail?id=${id}&sz=w${width}`;
}

// Full-resolution view link (opens the file in Drive).
function viewUrl(id) {
  return `https://drive.google.com/file/d/${id}/view`;
}

export async function onRequestGet({ env }) {
  const apiKey = env.GOOGLE_DRIVE_API_KEY;
  const folderId = env.BRAND_ASSETS_FOLDER_ID || DEFAULT_FOLDER_ID;

  const json = (body, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: {
        "Content-Type": "application/json",
        // Cache at the edge for 5 min — the folder changes rarely and this
        // protects your Drive API quota from per-visitor hits.
        "Cache-Control": "public, max-age=300",
      },
    });

  if (!apiKey) {
    return json(
      { error: "GOOGLE_DRIVE_API_KEY is not set in the Pages environment." },
      500
    );
  }

  // Page through the folder; filter to images. We request only the fields we need.
  const assets = [];
  let pageToken = null;

  try {
    do {
      const params = new URLSearchParams({
        q: `'${folderId}' in parents and mimeType contains 'image/' and trashed = false`,
        key: apiKey,
        fields:
          "nextPageToken,files(id,name,mimeType,size,modifiedTime,imageMediaMetadata(width,height))",
        pageSize: "100",
        orderBy: "name",
        // supportsAllDrives covers shared drives if the folder ever moves to one.
        supportsAllDrives: "true",
        includeItemsFromAllDrives: "true",
      });
      if (pageToken) params.set("pageToken", pageToken);

      const res = await fetch(
        `https://www.googleapis.com/drive/v3/files?${params}`
      );
      if (!res.ok) {
        const detail = await res.text();
        return json({ error: `Drive API error (${res.status})`, detail }, 502);
      }

      const data = await res.json();
      for (const f of data.files || []) {
        assets.push({
          id: f.id,
          name: f.name,
          mimeType: f.mimeType,
          size: f.size ? Number(f.size) : null,
          modifiedTime: f.modifiedTime,
          width: f.imageMediaMetadata?.width ?? null,
          height: f.imageMediaMetadata?.height ?? null,
          thumb: thumbUrl(f.id, 800),
          thumbSmall: thumbUrl(f.id, 320),
          view: viewUrl(f.id),
        });
      }
      pageToken = data.nextPageToken || null;
    } while (pageToken);
  } catch (err) {
    return json({ error: "Failed to reach Drive API", detail: String(err) }, 502);
  }

  return json({ folderId, count: assets.length, assets });
}
