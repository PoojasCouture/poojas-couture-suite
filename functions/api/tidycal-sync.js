// functions/api/tidycal-sync.js
// Syncs TidyCal bookings into the Supabase `appointments` table.
// Called by the frontend when the Appointments view loads, or via a Sync button.
//
// Required Cloudflare env vars:
//   TIDYCAL_API_TOKEN    - TidyCal personal access token
//   SUPABASE_URL         - e.g. https://xxxx.supabase.co
//   SUPABASE_SERVICE_KEY - Supabase service_role key (bypasses RLS; server-side only)

export async function onRequest(context) {
  const { env } = context;

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (context.request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (!env.TIDYCAL_API_TOKEN || !env.SUPABASE_URL || !env.SUPABASE_SERVICE_KEY) {
    return new Response(
      JSON.stringify({ ok: false, error: 'Missing env vars: need TIDYCAL_API_TOKEN, SUPABASE_URL, SUPABASE_SERVICE_KEY' }),
      { status: 500, headers: corsHeaders }
    );
  }

  try {
    // 1. Fetch bookings from TidyCal (paginated)
    let bookings = [];
    let page = 1;
    let hasMore = true;

    while (hasMore && page <= 10) {
      const tcRes = await fetch('https://tidycal.com/api/bookings?page=' + page, {
        headers: {
          'Authorization': 'Bearer ' + env.TIDYCAL_API_TOKEN,
          'Accept': 'application/json'
        }
      });

      if (!tcRes.ok) {
        const body = await tcRes.text();
        return new Response(
          JSON.stringify({ ok: false, error: 'TidyCal API error ' + tcRes.status, detail: body.slice(0, 300) }),
          { status: 502, headers: corsHeaders }
        );
      }

      const tcData = await tcRes.json();
      const pageBookings = Array.isArray(tcData.data) ? tcData.data : [];
      bookings = bookings.concat(pageBookings);

      hasMore = pageBookings.length > 0 && tcData.links && tcData.links.next;
      page += 1;
    }

    if (bookings.length === 0) {
      return new Response(
        JSON.stringify({ ok: true, synced: 0, updated: 0, message: 'No bookings found in TidyCal' }),
        { headers: corsHeaders }
      );
    }

    // 2. Get existing tidycal_ids from Supabase to split insert vs update
    const existingRes = await fetch(
      env.SUPABASE_URL + '/rest/v1/appointments?select=tidycal_id,status&tidycal_id=not.is.null',
      {
        headers: {
          'apikey': env.SUPABASE_SERVICE_KEY,
          'Authorization': 'Bearer ' + env.SUPABASE_SERVICE_KEY
        }
      }
    );

    if (!existingRes.ok) {
      const body = await existingRes.text();
      return new Response(
        JSON.stringify({ ok: false, error: 'Supabase read error ' + existingRes.status, detail: body.slice(0, 300) }),
        { status: 502, headers: corsHeaders }
      );
    }

    const existingRows = await existingRes.json();
    const existingMap = {};
    for (const row of existingRows) {
      existingMap[row.tidycal_id] = row.status;
    }

    // 3. Build rows and sync
    let inserted = 0;
    let updated = 0;
    const errors = [];

    for (const b of bookings) {
      const tidycalId = String(b.id);
      const contactName = (b.contact && b.contact.name) ? b.contact.name : 'Unknown';
      const contactEmail = (b.contact && b.contact.email) ? b.contact.email : '';
      const contactPhone = (b.contact && b.contact.phone_number) ? b.contact.phone_number : '';
      const bookingType = (b.booking_type && b.booking_type.title) ? b.booking_type.title : 'Booking';
      const startsAt = b.starts_at || null;
      const isCancelled = Boolean(b.cancelled_at);
      const status = isCancelled ? 'Cancelled' : 'Confirmed';

      const noteParts = [];
      if (contactEmail) noteParts.push('Email: ' + contactEmail);
      if (contactPhone) noteParts.push('Phone: ' + contactPhone);
      noteParts.push('Source: TidyCal');
      const notes = noteParts.join(' | ');

      if (Object.prototype.hasOwnProperty.call(existingMap, tidycalId)) {
        // Already synced - only update if status changed (e.g. cancellation)
        if (existingMap[tidycalId] !== status) {
          const updRes = await fetch(
            env.SUPABASE_URL + '/rest/v1/appointments?tidycal_id=eq.' + encodeURIComponent(tidycalId),
            {
              method: 'PATCH',
              headers: {
                'apikey': env.SUPABASE_SERVICE_KEY,
                'Authorization': 'Bearer ' + env.SUPABASE_SERVICE_KEY,
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal'
              },
              body: JSON.stringify({ status: status, updated_at: new Date().toISOString() })
            }
          );
          if (updRes.ok) {
            updated += 1;
          } else {
            errors.push('Update failed for booking ' + tidycalId);
          }
        }
      } else {
        // New booking - insert
        const insRes = await fetch(env.SUPABASE_URL + '/rest/v1/appointments', {
          method: 'POST',
          headers: {
            'apikey': env.SUPABASE_SERVICE_KEY,
            'Authorization': 'Bearer ' + env.SUPABASE_SERVICE_KEY,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({
            tidycal_id: tidycalId,
            client_name: contactName,
            date: startsAt,
            type: bookingType,
            status: status,
            notes: notes
          })
        });
        if (insRes.ok) {
          inserted += 1;
        } else {
          const body = await insRes.text();
          errors.push('Insert failed for booking ' + tidycalId + ': ' + body.slice(0, 200));
        }
      }
    }

    return new Response(
      JSON.stringify({
        ok: errors.length === 0,
        total_in_tidycal: bookings.length,
        synced: inserted,
        updated: updated,
        errors: errors
      }),
      { headers: corsHeaders }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: String(err && err.message ? err.message : err) }),
      { status: 500, headers: corsHeaders }
    );
  }
}