export async function onRequestPost(context) {
  const REPLICATE_API_TOKEN = context.env.REPLICATE_API_TOKEN;

  if (!REPLICATE_API_TOKEN) {
    return new Response(JSON.stringify({ error: 'REPLICATE_API_TOKEN not configured' }), {
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
