// functions/api/contact-form-lead.js
//
// Public webhook endpoint for the poojascouture.com "Reach Us" form (Forminator).
// Webhook URL: https://poojas-couture-suite.pages.dev/api/contact-form-lead
// Method: POST
// Accepts: application/json (Forminator webhook default), multipart/form-data, or form-urlencoded
//
// Expected fields (case-insensitive, flexible naming):
// name, email, phone, appointment_type, who_for, budget,
// event, event_date, appointment_date, message, design (file, form-data only)
//
// Creates a new row in `clients` with status = 'New Lead' / source = 'Website Form'.

export async function onRequestPost(context) {
  const { request, env } = context;

  const CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  try {
    const contentType = request.headers.get("content-type") || "";
    let fields = {};
    let designFile = null;

    if (contentType.includes("application/json")) {
      const body = await request.json().catch(() => ({}));
      // Forminator webhook JSON is often nested like { data: { "1": "value", ... } } or flat key/value.
      // Flatten one level if there's a wrapping "data" object.
      const source = body && typeof body.data === "object" && body.data !== null ? body.data : body;
      fields = flattenKeys(source);
    } else if (contentType.includes("multipart/form-data") || contentType.includes("application/x-www-form-urlencoded")) {
      const form = await request.formData();
      for (const [key, value] of form.entries()) {
        if (typeof value === "object" && value !== null && "size" in value) {
          if (!designFile && value.size > 0) designFile = value;
        } else {
          fields[normalizeKey(key)] = typeof value === "string" ? value.trim() : value;
        }
      }
    } else {
      // Be permissive: try JSON as a fallback instead of hard-rejecting.
      const raw = await request.text();

      if (!raw || !raw.trim()) {
        // Empty body, no content-type: this is almost certainly a webhook
        // verification ping (e.g. Forminator's "Save" test request).
        // Respond success so the integration can be saved.
        return jsonResponse({ success: false, skipped: true, reason: "Empty body - likely a test ping" }, 200, CORS_HEADERS);
      }

      try {
        const parsed = JSON.parse(raw);
        fields = flattenKeys(parsed);
      } catch {
        return jsonResponse({ error: "Unsupported content type: " + contentType }, 400, CORS_HEADERS);
      }
    }

    const get = (keys) => {
      for (const k of keys) {
        const nk = normalizeKey(k);
        if (fields[nk] !== undefined && fields[nk] !== null && fields[nk] !== "") return fields[nk];
      }
      return null;
    };

    const name = get(["name"]);
    const email = get(["email", "emailaddress"]);
    const phone = get(["phone"]);
    const appointmentType = get(["appointmenttype"]);
    const whoFor = get(["whoisitfor", "whofor"]);
    const budget = get(["budget"]);
    const eventType = get(["event"]);
    const eventDate = get(["eventdate"]);
    const appointmentDate = get(["appoitmnetdate", "appointmentdate"]);
    const message = get(["message"]);

    if (!name || !email) {
      // Don't hard-error here: webhook setup UIs (Forminator included) send a test/verification
      // ping with no real form data when you click Save, and expect a 200 back to accept the
      // integration. Erroring here blocks saving the webhook entirely.
      return jsonResponse({ success: false, skipped: true, reason: "Missing name/email - likely a test ping" }, 200, CORS_HEADERS);
    }

    const supabaseUrl = env.SUPABASE_URL;
    const serviceKey = env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !serviceKey) {
      return jsonResponse({ error: "Server misconfiguration" }, 500, CORS_HEADERS);
    }

    const insertRes = await fetch(`${supabaseUrl}/rest/v1/clients`, {
      method: "POST",
      headers: {
        "apikey": serviceKey,
        "Authorization": `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
        "Prefer": "return=representation",
      },
      body: JSON.stringify({
        name,
        email,
        phone,
        type: "Other", // NOT NULL, must be one of Bride/Groom/Family/Other in the UI —
                       // "Lead" isn't a real option. Pooja reclassifies once qualified.
                       // 'source' below is what actually flags this as a website lead.
        source: "Website Form",
        appointment_type: appointmentType,
        who_for: whoFor,
        budget,
        event_type: eventType,
        event_date: eventDate || null,
        appointment_date: appointmentDate || null,
        notes: message,
        created_at: new Date().toISOString(),
      }),
    });

    if (!insertRes.ok) {
      const errText = await insertRes.text();
      return jsonResponse({ error: "Failed to create client", detail: errText }, 502, CORS_HEADERS);
    }

    const [newClient] = await insertRes.json();

    if (designFile && designFile.size > 0) {
      const filePath = `leads/${newClient.id}/${Date.now()}-${sanitizeFilename(designFile.name)}`;
      const fileBuffer = await designFile.arrayBuffer();

      const uploadRes = await fetch(
        `${supabaseUrl}/storage/v1/object/job-photos/${filePath}`,
        {
          method: "POST",
          headers: {
            "apikey": serviceKey,
            "Authorization": `Bearer ${serviceKey}`,
            "Content-Type": designFile.type || "application/octet-stream",
          },
          body: fileBuffer,
        }
      );

      if (uploadRes.ok) {
        await fetch(`${supabaseUrl}/rest/v1/clients?id=eq.${newClient.id}`, {
          method: "PATCH",
          headers: {
            "apikey": serviceKey,
            "Authorization": `Bearer ${serviceKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ design_reference_path: filePath }),
        });
      }
    }

    return jsonResponse({ success: true, client_id: newClient.id }, 200, CORS_HEADERS);
  } catch (err) {
    return jsonResponse({ error: "Unexpected server error", detail: String(err) }, 500, CORS_HEADERS);
  }
}

export async function onRequestGet() {
  return jsonResponse({ status: "ok" }, 200, {
    "Access-Control-Allow-Origin": "*",
  });
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

function normalizeKey(k) {
  return String(k || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function flattenKeys(obj) {
  const out = {};
  if (obj && typeof obj === "object") {
    for (const [k, v] of Object.entries(obj)) {
      out[normalizeKey(k)] = v;
    }
  }
  return out;
}

function sanitizeFilename(name) {
  return String(name || "file").replace(/[^a-zA-Z0-9._-]/g, "_");
}

function jsonResponse(obj, status, extraHeaders) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json", ...(extraHeaders || {}) },
  });
}
