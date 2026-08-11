export async function onRequestPost(context) {
  const REPLICATE_API_TOKEN = context.env.REPLICATE_API_TOKEN;
  const SUPABASE_URL = context.env.SUPABASE_URL;
  const SUPABASE_SERVICE_KEY = context.env.SUPABASE_SERVICE_KEY;

  if (!REPLICATE_API_TOKEN) {
    return new Response(JSON.stringify({ error: 'REPLICATE_API_TOKEN not configured' }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return new Response(JSON.stringify({ error: 'Server misconfiguration' }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }

  let body;
  try {
    body = await context.request.json();
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), {
      status: 400, headers: { 'Content-Type': 'application/json' }
    });
  }

  // This function generates images via Replicate using your own billed
  // API token (~$0.003/image). It previously had no authentication at
  // all -- anyone who found this URL could generate unlimited images at
  // your cost with zero login. Now requires a valid staff session with
  // Social CRM / CRM access.
  const token = body.token;
  if (!token) {
    return new Response(JSON.stringify({ error: 'Missing auth token' }), {
      status: 401, headers: { 'Content-Type': 'application/json' }
    });
  }
  const userRes = await fetch(SUPABASE_URL + '/auth/v1/user', {
    headers: { 'Authorization': 'Bearer ' + token, 'apikey': SUPABASE_SERVICE_KEY }
  });
  if (!userRes.ok) {
    return new Response(JSON.stringify({ error: 'Invalid or expired session' }), {
      status: 401, headers: { 'Content-Type': 'application/json' }
    });
  }
  const userData = await userRes.json();
  const callerEmail = userData.email;
  if (!callerEmail) {
    return new Response(JSON.stringify({ error: 'Could not resolve caller identity' }), {
      status: 401, headers: { 'Content-Type': 'application/json' }
    });
  }
  const svcHeaders = { 'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY, 'apikey': SUPABASE_SERVICE_KEY };
  const empRes = await fetch(SUPABASE_URL + '/rest/v1/employees?email=eq.' + encodeURIComponent(callerEmail) + '&select=app_role', { headers: svcHeaders });
  const empRows = empRes.ok ? await empRes.json() : [];
  const role = empRows[0] ? empRows[0].app_role : null;
  if (!['admin', 'operations', 'social_crm'].includes(role)) {
    return new Response(JSON.stringify({ error: 'Not authorized to use this feature' }), {
      status: 403, headers: { 'Content-Type': 'application/json' }
    });
  }

  const { prompt } = body;
  if (!prompt) {
    return new Response(JSON.stringify({ error: 'prompt is required' }), {
      status: 400, headers: { 'Content-Type': 'application/json' }
    });
  }

  // Submit job to Flux Schnell
  const submitRes = await fetch('https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${REPLICATE_API_TOKEN}`,
      'Content-Type': 'application/json',
      'Prefer': 'wait=30'
    },
    body: JSON.stringify({
      input: {
        prompt: prompt,
        num_outputs: 1,
        aspect_ratio: '1:1',
        output_format: 'webp',
        output_quality: 90
      }
    })
  });

  if (!submitRes.ok) {
    const err = await submitRes.json().catch(() => ({}));
    return new Response(JSON.stringify({ error: err.detail || 'Replicate submission failed' }), {
      status: 502, headers: { 'Content-Type': 'application/json' }
    });
  }

  let prediction = await submitRes.json();

  // Poll until done (max 60 seconds)
  let attempts = 0;
  while (prediction.status !== 'succeeded' && prediction.status !== 'failed' && attempts < 20) {
    await new Promise(r => setTimeout(r, 3000));
    const pollRes = await fetch(`https://api.replicate.com/v1/predictions/${prediction.id}`, {
      headers: { 'Authorization': `Bearer ${REPLICATE_API_TOKEN}` }
    });
    prediction = await pollRes.json();
    attempts++;
  }

  if (prediction.status === 'failed') {
    return new Response(JSON.stringify({ error: prediction.error || 'Generation failed' }), {
      status: 502, headers: { 'Content-Type': 'application/json' }
    });
  }

  if (prediction.status !== 'succeeded') {
    return new Response(JSON.stringify({ error: 'Generation timed out' }), {
      status: 504, headers: { 'Content-Type': 'application/json' }
    });
  }

  const imageUrl = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output;

  return new Response(JSON.stringify({ url: imageUrl }), {
    status: 200, headers: { 'Content-Type': 'application/json' }
  });
}
