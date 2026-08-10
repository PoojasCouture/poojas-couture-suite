// functions/api/tidycal-sync.js
// Syncs TidyCal bookings into the Supabase `appointments` table.
// Batched: one insert request for ALL new bookings, one update request per
// changed status value (max 2: Confirmed/Cancelled), to stay well under
// Cloudflare's subrequest limit.
//
// POST JSON body: { token: "<supabase session access_token>" }
//
// Required Cloudflare env vars:
//   TIDYCAL_API_TOKEN    - TidyCal personal access token
//   SUPABASE_URL         - e.g. https://xxxx.supabase.co
//   SUPABASE_SERVICE_KEY - Supabase service_role key (server-side only)

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

  const sbHeaders = {
    'apikey': env.SUPABASE_SERVICE_KEY,
    'Authorization': 'Bearer ' + env.SUPABASE_SERVICE_KEY,
    'Content-Type': 'application/json'
  };

  // Verify the caller is a logged-in staff member with CRM access.
  // Previously this endpoint had no identity check at all -- anyone who
  // found the URL could trigger a sync with zero login (mainly a TidyCal
  // API-quota/abuse risk rather than a data leak, but still unauthenticated
  // access to an internal action).
  let token = null;
  try {
    const body = await context.request.clone().json();
    token = body && body.token;
  } catch { /* no JSON body (e.g. a bare GET) -- token stays null, falls through to 401 below */ }

  if (!token) {
    return new Response(JSON.stringify({ ok: false, error: 'Missing auth token' }), { status: 401, headers: corsHeaders });
  }
  const userRes = await fetch(env.SUPABASE_URL + '/auth/v1/user', {
    headers: { 'Authorization': 'Bearer ' + token, 'apikey': env.SUPABASE_SERVICE_KEY }
  });
  if (!userRes.ok) {
    return new Response(JSON.stringify({ ok: false, error: 'Invalid or expired session' }), { status: 401, headers: corsHeaders });
  }
  const userData = await userRes.json();
  const callerEmail = userData.email;
  if (!callerEmail) {
    return new Response(JSON.stringify({ ok: false, error: 'Could not resolve caller identity' }), { status: 401, headers: corsHeaders });
  }
  const empRes = await fetch(env.SUPABASE_URL + '/rest/v1/employees?email=eq.' + encodeURIComponent(callerEmail) + '&select=app_role', { headers: sbHeaders });
  const empRows = empRes.ok ? await empRes.json() : [];
  const role = empRows[0] ? empRows[0].app_role : null;
  if (!['admin', 'operations', 'social_crm'].includes(role)) {
    return new Response(JSON.stringify({ ok: false, error: 'Not authorized to sync TidyCal' }), { status: 403, headers: corsHeaders });
  }

  try {
    // 1. Fetch bookings from TidyCal (paginated, capped at 10 pages)
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

    // 2. One read: existing tidycal_ids and their statuses
    const existingRes = await fetch(
      env.SUPABASE_URL + '/rest/v1/appointments?select=tidycal_id,status&tidycal_id=not.is.null',
      { headers: sbHeaders }
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

    // 3. Build new rows and status-change lists in memory
    const newRows = [];
    const toCancel = [];
    const toConfirm = [];

    for (const b of bookings) {
      const tidycalId = String(b.id);
      const contactName = (b.contact && b.contact.name) ? b.contact.name : 'Unknown';
      const contactEmail = (b.contact && b.contact.email) ? b.contact.email : '';
      const contactPhone = (b.contact && b.contact.phone_number) ? b.contact.phone_number : '';
      const bookingType = (b.booking_type && b.booking_type.title) ? b.booking_type.title : 'Booking';
      const startsAt = b.starts_at || null;
      const isCancelled = Boolean(b.cancelled_at);
      const status = isCancelled ? 'Cancelled' : 'Scheduled';

      if (Object.prototype.hasOwnProperty.call(existingMap, tidycalId)) {
        const currentStatus = existingMap[tidycalId];
        // Never override app-side terminal statuses (Completed / No-Show)
        const appManaged = currentStatus === 'Completed' || currentStatus === 'No-Show';
        if (!appManaged && currentStatus !== status) {
          if (status === 'Cancelled') {
            toCancel.push(tidycalId);
          } else {
            toConfirm.push(tidycalId);
          }
        }
      } else {
        const noteParts = [];
        if (contactEmail) noteParts.push('Email: ' + contactEmail);
        if (contactPhone) noteParts.push('Phone: ' + contactPhone);
        noteParts.push('Source: TidyCal');

        newRows.push({
          tidycal_id: tidycalId,
          client_name: contactName,
          date: startsAt,
          type: bookingType,
          status: status,
          notes: noteParts.join(' | ')
        });
      }
    }

    const errors = [];
    let inserted = 0;
    let updated = 0;

    // 4. ONE batched insert for all new rows
    if (newRows.length > 0) {
      const insRes = await fetch(env.SUPABASE_URL + '/rest/v1/appointments', {
        method: 'POST',
        headers: Object.assign({}, sbHeaders, { 'Prefer': 'return=minimal' }),
        body: JSON.stringify(newRows)
      });
      if (insRes.ok) {
        inserted = newRows.length;
      } else {
        const body = await insRes.text();
        errors.push('Batch insert failed: ' + body.slice(0, 300));
      }
    }

    // 5. At most TWO batched updates (one per target status) using in.() filter
    async function batchUpdateStatus(ids, newStatus) {
      if (ids.length === 0) return;
      const filter = 'in.(' + ids.map(function (id) { return '"' + id + '"'; }).join(',') + ')';
      const updRes = await fetch(
        env.SUPABASE_URL + '/rest/v1/appointments?tidycal_id=' + encodeURIComponent(filter),
        {
          method: 'PATCH',
          headers: Object.assign({}, sbHeaders, { 'Prefer': 'return=minimal' }),
          body: JSON.stringify({ status: newStatus, updated_at: new Date().toISOString() })
        }
      );
      if (updRes.ok) {
        updated += ids.length;
      } else {
        const body = await updRes.text();
        errors.push('Batch update to ' + newStatus + ' failed: ' + body.slice(0, 300));
      }
    }

    await batchUpdateStatus(toCancel, 'Cancelled');
    await batchUpdateStatus(toConfirm, 'Scheduled');

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