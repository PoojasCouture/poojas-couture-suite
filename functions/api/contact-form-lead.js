// functions/api/contact-form-lead.js
//
// Public webhook endpoint for the poojascouture.com "Reach Us" form.
// Give this URL to the website builder to POST to on "Send Message":
//   https://poojas-couture-suite.pages.dev/api/contact-form-lead
//
// Expects multipart/form-data (required, since the form has a file upload field)
// with these field names (case-insensitive match attempted, but exact names below preferred):
//   name, email, phone, appointment_type, who_for, budget,
//   event, event_date, appointment_date, message, design (file)
//
// Creates a new row in `clients` with status = 'New Lead' / source = 'Website Form'.
// If a design file is attached, uploads it to the `job-photos` storage bucket
// under `leads/{lead_id}/` and stores the path on the client record.

export async function onRequestPost(context) {
  const { request, env } = context;

  const CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  try {
    const contentType = request.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data") && !contentType.includes("application/x-www-form-urlencoded")) {
      return jsonResponse({ error: "Expected multipart/form-data or form-urlencoded" }, 400, CORS_HEADERS);
    }

    const form = await request.formData();

    const get = (keys) => {
      for (const k of keys) {
        const v = form.get(k);
        if (v !== null && v !== undefined && v !== "") return typeof v === "string" ? v.trim() : v;
      }
      return null;
    };

    const name = get(["name", "Name"]);
    const email = get(["email", "Email", "email_address", "Email Address"]);
    const phone = get(["phone", "Phone"]);
    const appointmentType = get(["appointment_type", "Appointment Type", "appointmentType"]);
    const whoFor = get(["who_for", "Who is it for", "who_is_it_for"]);
    const budget = get(["budget", "Budget"]);
    const eventType = get(["event", "Event"]);
    const eventDate = get(["event_date", "Event Date", "eventDate"]);
    const appointmentDate = get(["appointment_date", "Appoitmnet Date", "Appointment Date", "appointmentDate"]);
    const message = get(["message", "Message"]);
    const designFile = form.get("design") || form.get("Upload Your Design") || form.get("upload_your_design");

    if (!name || !email) {
      return jsonResponse({ error: "Missing required fields: name and email" }, 400, CORS_HEADERS);
    }

    const supabaseUrl = env.SUPABASE_URL;
    const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
      return jsonResponse({ error: "Server misconfiguration" }, 500, CORS_HEADERS);
    }

    // Insert new client lead
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
        status: "New Lead",
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

    // Optional: upload attached design file to storage, linked to the new client
    if (designFile && typeof designFile === "object" && designFile.size > 0) {
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
      // If upload fails, don't fail the whole request — the lead is already created.
    }

    return jsonResponse({ success: true, client_id: newClient.id }, 200, CORS_HEADERS);
  } catch (err) {
    return jsonResponse({ error: "Unexpected server error", detail: String(err) }, 500, CORS_HEADERS);
  }
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

function sanitizeFilename(name) {
  return String(name || "file").replace(/[^a-zA-Z0-9._-]/g, "_");
}

function jsonResponse(obj, status, extraHeaders) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json", ...(extraHeaders || {}) },
  });
}
