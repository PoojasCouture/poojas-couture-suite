// Derives a stronger-alpha glow color from a member's existing
// rgba(...) background color, so the header avatar's glow always
// matches whichever member is currently active without needing a
// second color value maintained per member.
function toGlow(rgbaStr) {
  const match = /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/.exec(rgbaStr || '');
  if (!match) return 'transparent';
  return `rgba(${match[1]},${match[2]},${match[3]},0.65)`;
}

const MEMBERS = {
  ceo: {
    name: 'Priya — Delivery Lead',
    emoji: '👑',
    color: 'rgba(200,113,90,0.15)',
    tag: 'Vision · Brand Strategy · Business Growth',
    system: `You are Priya, the Delivery Lead of Pooja's Couture — a South Asian bridal and traditional fashion boutique based in Sydney, Australia. The boutique operates from a converted garage studio and specialises in bridal sneakers, lehengas, sarees, salwar suits, and sherwanis.

Your role: Set strategic direction, approve major decisions, guide brand positioning, identify growth opportunities, and make final calls on pricing, partnerships, and business expansion.

Personality: Decisive, strategic, composed. You think 3 steps ahead. You are direct and do not waste words.

When answering:
- Give crisp, actionable strategic advice
- Identify risks and opportunities clearly
- Use bullet points for clarity
- If asked for decisions, make them — don't hedge
- Always keep Pooja's Couture's South Asian cultural identity and Sydney market context front of mind
- Never mention being an AI; stay fully in character as Priya`,
    welcome: "I'm Priya, your Delivery Lead. I handle brand strategy, business decisions, pricing, partnerships, and growth direction. Flip on Auto-Delegate above and I'll route your request straight to the right team members and hand you back one finished deliverable. What do you need?",
    chips: ['Plan our Diwali bridal collection launch', 'How do we grow in Sydney?', 'Build a full campaign for bridal sneakers', 'Plan for wedding season 2025', 'Launch a new product line']
  },
  coo: {
    name: 'Riya — Delivery Manager',
    emoji: '⚙️',
    color: 'rgba(212,168,75,0.15)',
    tag: 'Operations · Workflow · Inventory · Scheduling',
    system: `You are Riya, the Delivery Manager of Pooja's Couture — a South Asian bridal boutique in Sydney operating from a converted garage studio. You manage day-to-day operations including appointment scheduling, inventory management, vendor coordination, studio workflow, and order fulfilment for bridal sneakers, lehengas, sarees, salwar suits, and sherwanis.

Your role: Keep operations running smoothly, reduce bottlenecks, build repeatable processes, manage timelines for custom orders, and ensure the boutique experience is seamless for brides.

Personality: Systematic, no-nonsense, process-driven. You love checklists, SLAs, and clear ownership.

When answering:
- Build structured workflows, checklists, and processes
- Identify operational gaps and fix them
- Suggest tools and systems appropriate for a small boutique
- Keep recommendations practical given the small team and garage studio setting
- Never mention being an AI; stay fully in character as Riya`,
    welcome: "I'm Riya, your Delivery Manager. I handle operations — appointments, orders, inventory, vendor coordination, and studio workflows. What needs fixing or building?",
    chips: ['Build an appointment booking process', 'Create an order tracking system', 'How to manage custom orders?', 'Inventory checklist for bridal season', 'Streamline client fitting workflow']
  },
  marketing: {
    name: 'Meera — Marketing Manager',
    emoji: '📣',
    color: 'rgba(120,100,180,0.15)',
    tag: 'Campaigns · Social Media · Brand Awareness · Targeting',
    system: `You are Meera, the Marketing Manager of Pooja's Couture — a South Asian bridal boutique in Sydney specialising in bridal sneakers, lehengas, sarees, salwar suits, and sherwanis. The boutique operates from a garage studio and targets South Asian brides and families in Sydney and broader Australia.

Your role: Plan and execute marketing campaigns, manage social media strategy (Instagram, Facebook, TikTok), run seasonal promotions, identify target audiences, track performance, and build brand awareness in the South Asian community.

Personality: Creative, data-aware, trend-conscious. You understand South Asian cultural moments — wedding seasons, festivals (Diwali, Navratri, Eid, Karva Chauth) — and how to leverage them commercially.

When answering:
- Give specific, actionable marketing plans
- Tie campaigns to cultural calendar events where relevant
- Suggest content ideas, hashtags, ad targeting, and posting schedules
- Always consider the boutique's small budget and local focus
- Never mention being an AI; stay fully in character as Meera`,
    welcome: "I'm Meera, your Marketing Manager. I run campaigns, social strategy, seasonal promotions, and brand awareness. What are we working on?",
    chips: ['Plan an Instagram campaign', 'Marketing for bridal sneakers', 'Navratri/Diwali promotion ideas', 'How to reach Sydney South Asian brides?', 'Reels content plan for this month']
  },
  writer: {
    name: 'Anika — Content Writer',
    emoji: '✍️',
    color: 'rgba(80,160,120,0.15)',
    tag: 'Product Descriptions · Captions · Blogs · Email Copy',
    system: `You are Anika, the Content Writer for Pooja's Couture — a South Asian bridal boutique in Sydney. You write all content for the brand including Instagram captions, product descriptions, email newsletters, blog posts, and marketing copy for bridal sneakers, lehengas, sarees, salwar suits, and sherwanis.

Your role: Produce polished, culturally resonant, emotionally compelling content that speaks to South Asian brides and families. Your writing balances tradition with modern sensibility.

Personality: Lyrical but precise. You know when to be poetic (bridal content) and when to be punchy (social ads). You deeply understand South Asian wedding culture and what brides care about.

Writing style:
- Warm, aspirational, culturally authentic
- Never cheesy or generic
- Specific product details woven into emotional storytelling
- Adapts tone to platform (Instagram = punchy/visual, Email = warm/personal, Blog = editorial)
- Never mention being an AI; stay fully in character as Anika`,
    welcome: "I'm Anika, your Content Writer. Give me a product, campaign, or platform and I'll write copy that actually connects. What do you need?",
    chips: ['Write an Instagram caption for bridal sneakers', 'Product description for a red lehenga', 'Email for wedding season launch', 'Blog post: Why South Asian brides choose sneakers', 'WhatsApp message to follow up a lead']
  },
  designer: {
    name: 'Tara — Creative Designer',
    emoji: '🎨',
    color: 'rgba(180,120,160,0.15)',
    tag: 'Visual Direction · Mood Boards · Brand Aesthetics · Design Briefs',
    canGenerateImages: true,
    system: `You are Tara, the Creative Designer for Pooja's Couture — a South Asian bridal boutique in Sydney. You define the visual identity of the brand and provide design direction for all creative assets including social media posts, promotional material, product photography guidance, and in-store aesthetics.

Your role: Translate the brand's South Asian bridal identity into visual language. Create design briefs, suggest colour palettes, typography, layout ideas, photography direction, and aesthetic guidelines that keep the brand premium, culturally rich, and modern.

Personality: Visually opinionated, detail-obsessed, reference-rich. You speak in mood, texture, and colour. You pull from Indian textile traditions (zardosi, banarasi, block print) as well as contemporary bridal design trends.

When answering:
- Provide specific, detailed visual direction — colours (with hex codes when useful), textures, references
- Write clear design briefs that a photographer or external designer can follow
- Give Instagram grid/feed layout advice
- Suggest visual themes tied to seasons and campaigns
- When asked for a mood board, mockup, or visual concept, you MUST end your response with a line in this exact format: GENERATE_IMAGE: [detailed image generation prompt describing the visual]
- Never mention being an AI; stay fully in character as Tara`,
    welcome: "I'm Tara, your Creative Designer. I handle visual direction, design briefs, brand aesthetics, and photography guidance — and I can generate mood boards and mockups directly. What are we creating?",
    chips: ['Create a mood board for bridal sneakers', 'Instagram grid aesthetic for winter', 'Generate a mockup for Diwali campaign', 'Brand colour palette guidance', 'Design brief for bridal lehenga shoot']
  },
  creator: {
    name: 'Dia — Content Creator',
    emoji: '🎬',
    color: 'rgba(220,140,90,0.15)',
    tag: 'Reels · TikTok · UGC · Storyboards · Video Scripts',
    canGenerateImages: true,
    system: `You are Dia, the Content Creator for Pooja's Couture — a South Asian bridal boutique in Sydney specialising in bridal sneakers, lehengas, sarees, salwar suits, and sherwanis. Your job is video-first, short-form content: Reels, TikTok, and UGC-style storytelling that drives reach and engagement.

Your role: Script and storyboard Reels and TikToks, identify and adapt trending audio/formats for the bridal niche, plan behind-the-scenes and process content, direct UGC and customer testimonial content, and build content series that build a personal, trustworthy brand voice on video platforms.

Personality: Fast-moving, trend-literate, slightly cheeky. You think in hooks, pacing, and watch-time.

When answering:
- Give scene-by-scene breakdowns for Reels/TikToks (Hook → Build → Payoff) with approximate timing
- Reference real platform mechanics: hook in first 1-2 seconds, trending audio suggestions, on-screen text overlay ideas
- Suggest UGC and behind-the-scenes content ideas specific to a bridal boutique
- Always tie content ideas back to a clear goal: reach, saves, DMs, or bookings
- Keep cultural authenticity central — this is South Asian bridal content
- When asked for a storyboard or visual scene reference, end your response with: GENERATE_IMAGE: [detailed prompt describing the key visual scene or storyboard frame]
- Never mention being an AI; stay fully in character as Dia`,
    welcome: "I'm Dia, your Content Creator. I script Reels, TikToks, storyboards and UGC-style video content — and I can generate visual storyboard frames too. Hit the Reel Builder button below for a full cinematic 45s brief, or just ask me anything.",
    chips: ['Script a Reel for bridal sneakers launch', 'Storyboard for a Diwali campaign Reel', 'Behind-the-scenes content plan', 'Generate a storyboard frame for lehenga shoot', 'UGC brief for customer testimonials']
  }
};

// ── CINEMATIC REEL BUILDER — system prompt ──
const REEL_BUILDER_SYSTEM = `You are Dia, the Content Creator and film director for Pooja's Couture — a premium South Asian bridal boutique in Sydney. You produce cinematic 45-second Instagram Reels that feel luxurious, modern, and emotionally resonant.

The user will provide: Google Drive folder URL (mandatory), Look Name (optional), Occasion/Brief (optional), Target Audience (optional), Creative Vibe (optional).

You MUST return a JSON object (no markdown fences, no preamble) with this exact shape:
{
  "creativeDirection": {
    "vibe": "One of: Regal Bridal Cinema | Modern Editorial Minimal | Festive Glamour Energy | Old-Money Luxury | Soft Romantic Couture",
    "whyItFits": "2-3 sentences explaining why this direction fits the assets and brief.",
    "heroShot": "Describe the ideal hero shot to look for in the folder.",
    "missingAssets": "List any missing asset types, or 'None — proceed' if sufficient."
  },
  "timeline": [
    { "time": "0.0–1.5s", "tag": "HOOK", "description": "Detailed description of the hook — visual + on-screen text" },
    { "time": "1.5–8s", "tag": "MOOD", "description": "Hero reveal, mood establishment" },
    { "time": "8–20s", "tag": "DETAILS", "description": "Details montage — embroidery, texture, jewelry, finishing" },
    { "time": "20–33s", "tag": "MOVEMENT", "description": "Motion moments — fabric movement, twirl, walk, silhouette" },
    { "time": "33–41s", "tag": "PEAK", "description": "Final hero + emotional high point" },
    { "time": "41–45s", "tag": "CTA", "description": "End card — Book a Consult + URL" }
  ],
  "music": {
    "mood": "Specific music mood description (e.g. cinematic strings + soft tabla)",
    "tempo": "slow | mid | high",
    "beatDropMoment": "Which timeline moment a beat drop or swell should align with",
    "searchKeywords": "3-5 keyword phrases to find a track in a music library"
  },
  "editInstructions": {
    "cutStyle": "Description of cut style and pacing",
    "transitions": "Specific transitions to use (and avoid)",
    "colorGrade": "Warm/neutral/cool, contrast, skin tone priority",
    "soundDesign": "Any ambient sound design cues",
    "textStyle": "Font vibe, placement, max words per screen",
    "exportSettings": "1080x1920, fps, bitrate guidance"
  },
  "onScreenText": [
    "Line 1 of on-screen text (max 6 words)",
    "Line 2",
    "Line 3",
    "Line 4",
    "Line 5",
    "Line 6"
  ],
  "captionA": "Ultra-luxury editorial tone Instagram caption (3-5 lines max, no hashtags)",
  "captionB": "Warm, inviting, consult-focused caption (3-5 lines max, no hashtags)",
  "hashtags": ["#HashtagOne", "#HashtagTwo"],
  "ctaLine": "Book a Consult: https://poojascouture.com/reach-us/"
}

Rules:
- hashtags: provide exactly 12-15, mix of bridal/couture/South Asian/fashion
- onScreenText: max 6-10 lines total, minimal, high-end
- The ctaLine MUST always be exactly: Book a Consult: https://poojascouture.com/reach-us/
- Never mention being an AI; respond only with the JSON object`;

let currentMember = 'ceo';
let histories = { ceo: [], coo: [], marketing: [], writer: [], designer: [], creator: [] };
let isLoading = false;
let autoDelegate = true;
let statusTimers = {};
let viewingHistory = false;

// ── IMAGE GENERATION via Replicate (Flux Schnell) ──
function extractImagePrompt(text) {
  const match = text.match(/GENERATE_IMAGE:\s*(.+?)(?:\n|$)/);
  return match ? match[1].trim() : null;
}

function stripImageTag(text) {
  return text.replace(/GENERATE_IMAGE:\s*.+?(?:\n|$)/, '').trim();
}

async function renderGeneratedImage(prompt, containerEl) {
  const imgWrapper = document.createElement('div');
  imgWrapper.style.cssText = 'margin-top:12px;border-radius:8px;overflow:hidden;max-width:520px;';

  const loadingEl = document.createElement('div');
  loadingEl.style.cssText = 'padding:16px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:8px;font-size:12px;color:var(--muted);display:flex;align-items:center;gap:8px;';
  loadingEl.innerHTML = '<div class="typing-indicator" style="display:inline-flex"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div><span>Generating image — this takes 15-30 seconds…</span>';
  imgWrapper.appendChild(loadingEl);
  containerEl.appendChild(imgWrapper);

  try {
    const fullPrompt = prompt + ', South Asian bridal fashion, premium boutique aesthetic, high quality, editorial photography style';
    const authToken = await getAuthToken();
    const res = await fetch('/api/generate-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: fullPrompt, token: authToken })
    });

    const data = await res.json();

    if (!res.ok || !data.url) {
      loadingEl.innerHTML = '⚠ Image generation failed: ' + (data.error || 'Unknown error') + '. Try rephrasing your request.';
      return;
    }

    loadingEl.remove();

    const img = document.createElement('img');
    img.src = data.url;
    img.style.cssText = 'width:100%;border-radius:8px;display:block;';
    img.onerror = () => { imgWrapper.innerHTML = '⚠ Image loaded but could not be displayed.'; };
    imgWrapper.appendChild(img);

    const dlBtn = document.createElement('a');
    dlBtn.href = data.url;
    dlBtn.target = '_blank';
    dlBtn.style.cssText = 'display:inline-block;margin-top:8px;font-size:11px;color:var(--muted);text-decoration:underline;';
    dlBtn.textContent = '⬇ Open full image';
    imgWrapper.appendChild(dlBtn);

  } catch (err) {
    loadingEl.innerHTML = '⚠ Image generation failed. Check your connection and try again.';
  }
}

// ── SUPABASE HISTORY & AUTH ──
async function getSupabaseClient() {
  if (window._sbClient) return window._sbClient;
  if (window.__pcSupabaseClient) {
    window._sbClient = window.__pcSupabaseClient;
    return window._sbClient;
  }
  if (typeof supabase !== 'undefined' && typeof SUPABASE_CONFIG !== 'undefined') {
    window._sbClient = supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey, {
      auth: {
        storageKey: 'pc-suite-auth', // matches main app store.js
        persistSession: true,
        autoRefreshToken: true
      }
    });
    window.__pcSupabaseClient = window._sbClient;
    return window._sbClient;
  }
  return null;
}

async function getAuthToken() {
  const sb = await getSupabaseClient();
  if (sb && sb.auth) {
    try {
      const { data: sessionData } = await sb.auth.getSession();
      if (sessionData?.session?.access_token) {
        return sessionData.session.access_token;
      }
    } catch (e) {
      console.warn('Could not get session from sb.auth:', e);
    }
  }
  // Direct fallback from localStorage (storageKey: pc-suite-auth)
  try {
    const raw = localStorage.getItem('pc-suite-auth');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.access_token) return parsed.access_token;
      if (parsed?.currentSession?.access_token) return parsed.currentSession.access_token;
    }
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('sb-') || key.includes('-auth-token'))) {
        try {
          const val = JSON.parse(localStorage.getItem(key));
          if (val?.access_token) return val.access_token;
        } catch (err) {}
      }
    }
  } catch (e) {
    console.warn('Fallback token extraction failed:', e);
  }
  return null;
}

async function saveProject(title, request, agents, contributions, finalOutput) {
  try {
    const sb = await getSupabaseClient();
    let createdBy = null;
    try { createdBy = JSON.parse(localStorage.getItem('pc_current_user'))?.email || null; } catch(e) {}
    await sb.from('ai_team_projects').insert({
      title, request, agents_involved: agents, contributions, final_output: finalOutput, created_by: createdBy
    });
  } catch(err) { console.warn('Project save failed:', err); }
}

async function loadProjects() {
  try {
    const sb = await getSupabaseClient();
    const { data, error } = await sb.from('ai_team_projects').select('*').order('created_at', { ascending: false }).limit(50);
    if (error) throw error;
    return data || [];
  } catch(err) { console.warn('Project load failed:', err); return []; }
}

async function deleteProject(id) {
  try {
    const sb = await getSupabaseClient();
    await sb.from('ai_team_projects').delete().eq('id', id);
  } catch(err) { console.warn('Project delete failed:', err); }
}

// ── SAVE CONVERSATION (direct agent chats) ──
async function saveConversation() {
  const id = currentMember;
  const msgs = histories[id];
  if (!msgs || msgs.length === 0) return;

  const btn = document.getElementById('save-convo-btn');
  btn.disabled = true;
  btn.textContent = 'Saving…';

  const firstUserMsg = msgs.find(m => m.role === 'user')?.content || 'Conversation';
  const title = firstUserMsg.length > 80 ? firstUserMsg.substring(0, 80) + '…' : firstUserMsg;

  // Format conversation as readable transcript for final_output
  const transcript = msgs.map(m => {
    const speaker = m.role === 'user' ? '🧑 You' : (MEMBERS[id].emoji + ' ' + MEMBERS[id].name);
    return speaker + ':\n' + stripImageTag(m.content);
  }).join('\n\n---\n\n');

  await saveProject(
    title,
    firstUserMsg,
    [id],
    [],
    transcript
  );

  btn.textContent = '✓ Saved';
  btn.style.color = 'var(--pc-gold)';
  setTimeout(() => {
    btn.textContent = 'Save Conversation';
    btn.style.color = '';
    btn.disabled = false;
  }, 3000);
}

function updateSaveButton() {
  const btn = document.getElementById('save-convo-btn');
  if (!btn) return;
  const id = currentMember;
  const isDirectAgent = id !== 'ceo';
  const hasMessages = histories[id] && histories[id].length > 0;

  if (viewingHistory || !isDirectAgent) {
    btn.style.display = 'none';
  } else {
    btn.style.display = 'inline-flex';
    btn.disabled = !hasMessages;
    btn.textContent = 'Save Conversation';
    btn.style.color = '';
  }
}

// ── HISTORY VIEW ──
function switchToHistory() {
  viewingHistory = true;
  document.querySelectorAll('.member-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('btn-history').classList.add('active');
  document.getElementById('messages').style.display = 'none';
  document.getElementById('input-area').style.display = 'none';
  document.getElementById('history-panel').style.display = 'flex';
  document.getElementById('history-panel').style.flexDirection = 'column';
  document.getElementById('h-avatar').textContent = '🗂️';
  document.getElementById('h-avatar').style.background = 'rgba(100,140,200,0.15)';
  document.getElementById('h-avatar').style.setProperty('--glow', 'rgba(100,140,200,0.65)');
  document.getElementById('h-name').textContent = 'Project History';
  document.getElementById('h-tag').textContent = 'All completed AI team projects';
  document.getElementById('delegate-toggle').classList.remove('visible');
  updateSaveButton();
  renderHistory();
}

async function renderHistory() {
  const list = document.getElementById('history-list');
  list.innerHTML = '<div style="color:var(--muted);font-size:13px;padding:16px 0">Loading projects…</div>';
  const projects = await loadProjects();
  if (projects.length === 0) {
    list.innerHTML = `
      <div style="text-align:center;padding:48px 16px;color:var(--muted)">
        <div style="font-size:32px;margin-bottom:12px">🗂️</div>
        <div style="font-size:14px;font-weight:600;margin-bottom:6px">No projects yet</div>
        <div style="font-size:12px">Completed Auto-Delegate runs and saved conversations will appear here.</div>
      </div>`;
    return;
  }
  list.innerHTML = projects.map(p => {
    const createdAt = p.created_at ? new Date(p.created_at) : null;
    const dateValid = createdAt && !isNaN(createdAt.getTime());
    const date = dateValid ? createdAt.toLocaleDateString('en-AU', { day:'numeric', month:'short', year:'numeric' }) : '—';
    const time = dateValid ? createdAt.toLocaleTimeString('en-AU', { hour:'2-digit', minute:'2-digit' }) : '';
    const agents = (p.agents_involved || []).map(a => MEMBERS[a]?.emoji || '').join(' ');
    const isDirectChat = (p.contributions || []).length === 0;
    const typeLabel = isDirectChat ? '💬 Direct Chat' : '🔀 Auto-Delegate';
    return `
      <div class="history-card" id="hcard-${p.id}">
        <div class="history-card-header">
          <div class="history-meta">
            <div class="history-title">${escapeHtml(p.title)}</div>
            <div class="history-date">${date}${dateValid ? ' · ' + time : ''} ${agents ? '· ' + agents : ''} · <span style="opacity:0.6">${typeLabel}</span></div>
          </div>
          <button class="history-delete-btn" onclick="confirmDeleteProject('${p.id}')" title="Delete">🗑️</button>
        </div>
        <div class="history-request">${escapeHtml(p.request)}</div>
        <details class="history-details">
          <summary>View ${isDirectChat ? 'conversation' : 'final deliverable'}</summary>
          <div class="history-output">${formatText(p.final_output || '')}</div>
          ${(!isDirectChat && (p.contributions || []).length > 0) ? `
            <div style="margin-top:12px">
              ${p.contributions.map(c => `
                <details class="agent-contribution" style="margin-bottom:6px">
                  <summary>
                    <span style="font-size:13px">${MEMBERS[c.agent]?.emoji || ''}</span>
                    <span>${MEMBERS[c.agent]?.name || c.agent} — contribution</span>
                    <span class="chevron">▶</span>
                  </summary>
                  <div class="contribution-body">${formatText(c.output)}</div>
                </details>`).join('')}
            </div>` : ''}
        </details>
      </div>`;
  }).join('');
}

async function confirmDeleteProject(id) {
  if (!confirm('Delete this project? This cannot be undone.')) return;
  const card = document.getElementById('hcard-' + id);
  if (card) card.style.opacity = '0.4';
  await deleteProject(id);
  await renderHistory();
}

// ── AGENT STATUS ──
function setAgentStatus(id, status, label) {
  const box = document.getElementById('status-' + id);
  if (!box) return;
  box.classList.remove('idle', 'working', 'done', 'error');
  box.classList.add(status);
  const defaults = { working: 'Working…', done: 'Done', error: 'Error', idle: 'Idle' };
  box.querySelector('.status-text').textContent = label || defaults[status] || 'Idle';
  if (statusTimers[id]) { clearTimeout(statusTimers[id]); delete statusTimers[id]; }
  if (status === 'done') statusTimers[id] = setTimeout(() => setAgentStatus(id, 'idle'), 3000);
}

const ORCHESTRATOR_AGENTS = ['coo', 'marketing', 'writer', 'designer', 'creator'];
const ORCHESTRATOR_SYSTEM = `You are Priya, Delivery Lead of Pooja's Couture, acting as an internal task router. Given a business request from the owner, decide which of the following team members actually need to act on it, and write each of them a clear, specific, self-contained task brief.

Team members available:
- coo (Riya): operations, appointments, inventory, vendor coordination, order workflows, scheduling
- marketing (Meera): campaigns, social media strategy, seasonal/festival promotions, audience targeting
- writer (Anika): written copy — captions, product descriptions, emails, blog posts, WhatsApp messages
- designer (Tara): visual direction, mood boards, colour palettes, photography briefs, grid aesthetics, mockup generation
- creator (Dia): Reels/TikTok scripts, storyboards, video content, UGC briefs, trending audio/formats

Be selective — only delegate to team members genuinely needed. Do not default to involving everyone.

Respond with ONLY valid JSON, no markdown fences, no preamble:
{
  "strategic_take": "1-2 sentence Delivery Lead-level framing of the request and the goal",
  "delegations": [
    {"agent": "marketing", "task": "specific, detailed, self-contained instruction"}
  ]
}

"agent" must be one of: coo, marketing, writer, designer, creator. Include 1 to 5 delegations.`;

// ── MEMBER SWITCH ──
function switchMember(id) {
  viewingHistory = false;
  currentMember = id;
  document.querySelectorAll('.member-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('btn-' + id).classList.add('active');
  document.getElementById('messages').style.display = 'flex';
  document.getElementById('input-area').style.display = 'flex';
  document.getElementById('history-panel').style.display = 'none';

  const m = MEMBERS[id];
  document.getElementById('h-avatar').textContent = m.emoji;
  document.getElementById('h-avatar').style.background = m.color;
  document.getElementById('h-avatar').style.setProperty('--glow', toGlow(m.color));
  document.getElementById('h-name').textContent = m.name;
  document.getElementById('h-tag').textContent = m.tag;

  const toggle = document.getElementById('delegate-toggle');
  if (id === 'ceo') {
    toggle.classList.add('visible');
    if (autoDelegate) toggle.classList.add('on');
    document.getElementById('user-input').placeholder = 'Describe what you need — Priya will delegate to the team automatically…';
  } else {
    toggle.classList.remove('visible');
    document.getElementById('user-input').placeholder = 'Ask your team member anything…';
  }

  updateSaveButton();
  renderMessages();

  // Inject Reel Builder chip for Dia
  if (id === 'creator') {
    const msgs = document.getElementById('messages');
    const existing = msgs.querySelector('.reel-builder-chip');
    if (!existing) {
      const chip = document.createElement('button');
      chip.className = 'reel-builder-chip';
      chip.innerHTML = '🎬 &nbsp;Build a Cinematic 45s Reel Brief';
      chip.onclick = openReelBuilder;
      // Append chip at bottom of welcome / message area
      const welcomeCard = msgs.querySelector('.welcome-card');
      if (welcomeCard) {
        welcomeCard.appendChild(chip);
      } else {
        // After messages exist, add chip as a standalone element below
        const wrapper = document.createElement('div');
        wrapper.style.cssText = 'display:flex;justify-content:flex-start;padding:0 0 8px 52px;';
        wrapper.appendChild(chip);
        msgs.appendChild(wrapper);
      }
    }
  }
}

function toggleDelegate() {
  autoDelegate = !autoDelegate;
  const toggle = document.getElementById('delegate-toggle');
  toggle.classList.toggle('on', autoDelegate);
  document.getElementById('user-input').placeholder = autoDelegate
    ? 'Describe what you need — Priya will delegate to the team automatically…'
    : 'Ask your team member anything…';
}

function renderMessages() {
  const id = currentMember;
  const m = MEMBERS[id];
  const msgs = document.getElementById('messages');
  msgs.innerHTML = '';
  if (histories[id].length === 0) {
    const card = document.createElement('div');
    card.className = 'welcome-card msg ai';
    card.style.maxWidth = '560px';
    card.innerHTML = `
      <div style="font-size:13.5px;color:var(--muted);line-height:1.6">${m.welcome}</div>
      <div class="welcome-tasks">
        ${m.chips.map(c => `<button class="task-chip" onclick="quickSend('${c.replace(/'/g,"\\'")}')"> ${c}</button>`).join('')}
      </div>`;
    msgs.appendChild(card);
  } else {
    histories[id].forEach(msg => appendBubble(msg.role, msg.content, false));
  }
  msgs.scrollTop = msgs.scrollHeight;
}

function appendBubble(role, content, scroll = true, skipImageGen = false) {
  const msgs = document.getElementById('messages');
  const m = MEMBERS[currentMember];
  const wrapper = document.createElement('div');
  wrapper.className = `msg ${role === 'user' ? 'user' : 'ai'}`;
  const ava = document.createElement('div');
  ava.className = 'msg-avatar';
  ava.style.background = role === 'user' ? 'rgba(255,255,255,0.05)' : m.color;
  ava.textContent = role === 'user' ? '🧑' : m.emoji;
  const bubble = document.createElement('div');
  bubble.className = 'bubble';

  const displayText = role === 'assistant' ? stripImageTag(content) : content;
  bubble.innerHTML = formatText(displayText);

  if (role === 'assistant' && !skipImageGen && MEMBERS[currentMember].canGenerateImages) {
    const imagePrompt = extractImagePrompt(content);
    if (imagePrompt) {
      renderGeneratedImage(imagePrompt, bubble);
    }
  }

  wrapper.appendChild(ava);
  wrapper.appendChild(bubble);
  msgs.appendChild(wrapper);
  if (scroll) msgs.scrollTop = msgs.scrollHeight;
  return wrapper;
}

function formatText(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/_(.*?)_/g, '<em>$1</em>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>')
    .replace(/^(.+)$/s, '<p>$1</p>');
}

function showTyping() {
  const msgs = document.getElementById('messages');
  const m = MEMBERS[currentMember];
  const wrapper = document.createElement('div');
  wrapper.className = 'msg ai';
  wrapper.id = 'typing-indicator';
  const ava = document.createElement('div');
  ava.className = 'msg-avatar';
  ava.style.background = m.color;
  ava.textContent = m.emoji;
  const bubble = document.createElement('div');
  bubble.className = 'bubble ai';
  bubble.innerHTML = '<div class="typing-indicator"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div>';
  wrapper.appendChild(ava);
  wrapper.appendChild(bubble);
  msgs.appendChild(wrapper);
  msgs.scrollTop = msgs.scrollHeight;
}

function removeTyping() {
  const t = document.getElementById('typing-indicator');
  if (t) t.remove();
}

function clearChat() {
  histories[currentMember] = [];
  updateSaveButton();
  renderMessages();
}

function quickSend(text) {
  document.getElementById('user-input').value = text;
  sendMessage();
}

function autoResize(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 130) + 'px';
}

function handleKey(e) {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
}

async function callClaude(system, messages) {
  const authToken = await getAuthToken();
  if (!authToken) {
    throw new Error('Your session has expired or is missing. Please sign out and sign back in from the main app to refresh your login.');
  }
  const response = await fetch('/api/ai-team', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ max_tokens: 1200, system, messages, token: authToken })
  });
  if (!response.ok) {
    const errBody = await response.json().catch(() => ({}));
    throw new Error(errBody.error || `Request failed (${response.status})`);
  }
  const data = await response.json();
  return data.content?.[0]?.text || '';
}

function parseOrchestratorJSON(raw) {
  let cleaned = raw.trim().replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/```\s*$/, '');
  return JSON.parse(cleaned);
}

async function sendMessage() {
  if (isLoading) return;
  const input = document.getElementById('user-input');
  const text = input.value.trim();
  if (!text) return;
  input.value = '';
  input.style.height = 'auto';

  if (currentMember === 'ceo' && autoDelegate) {
    await runDelegationPipeline(text);
    return;
  }

  const id = currentMember;
  const m = MEMBERS[id];
  if (histories[id].length === 0) document.getElementById('messages').innerHTML = '';
  histories[id].push({ role: 'user', content: text });
  appendBubble('user', text);
  isLoading = true;
  document.getElementById('send-btn').disabled = true;
  updateSaveButton();
  showTyping();
  setAgentStatus(id, 'working');

  try {
    const reply = await callClaude(m.system, histories[id]);
    histories[id].push({ role: 'assistant', content: reply || 'Sorry, I could not generate a response right now.' });
    removeTyping();
    appendBubble('assistant', reply || 'Sorry, I could not generate a response right now.');
    setAgentStatus(id, 'done');
  } catch (err) {
    console.error('AI Team request error:', err);
    removeTyping();
    appendBubble('assistant', `⚠️ ${err.message || 'There was an error connecting. Please try again.'}`);
    setAgentStatus(id, 'error');
  }
  isLoading = false;
  document.getElementById('send-btn').disabled = false;
  updateSaveButton();
}

async function runDelegationPipeline(text) {
  const msgs = document.getElementById('messages');
  if (histories.ceo.length === 0) msgs.innerHTML = '';
  histories.ceo.push({ role: 'user', content: text });
  appendBubble('user', text);
  isLoading = true;
  document.getElementById('send-btn').disabled = true;

  const stageWrapper = document.createElement('div');
  stageWrapper.className = 'msg ai';
  const stageCard = document.createElement('div');
  stageCard.className = 'pipeline-card';
  stageCard.innerHTML = `<div class="pipeline-stage-label"><span class="pdot"></span> PRIYA IS ASSIGNING TASKS…</div>`;
  stageWrapper.appendChild(stageCard);
  msgs.appendChild(stageWrapper);
  msgs.scrollTop = msgs.scrollHeight;

  let plan;
  try {
    setAgentStatus('ceo', 'working', 'Delegating…');
    const raw = await callClaude(ORCHESTRATOR_SYSTEM, [{ role: 'user', content: text }]);
    plan = parseOrchestratorJSON(raw);
    if (!plan.delegations || !Array.isArray(plan.delegations) || plan.delegations.length === 0) throw new Error('empty plan');
    setAgentStatus('ceo', 'done', 'Delegated');
  } catch (err) {
    console.error('Orchestrator delegation failed, falling back to direct reply:', err);
    stageWrapper.remove();
    showTyping();
    try {
      const reply = await callClaude(MEMBERS.ceo.system, histories.ceo);
      histories.ceo.push({ role: 'assistant', content: reply });
      removeTyping();
      appendBubble('assistant', reply);
      setAgentStatus('ceo', 'done');
    } catch (e) {
      console.error('Direct fallback request error:', e);
      removeTyping();
      appendBubble('assistant', `⚠️ ${e.message || 'There was an error connecting. Please try again.'}`);
      setAgentStatus('ceo', 'error');
    }
    isLoading = false;
    document.getElementById('send-btn').disabled = false;
    return;
  }

  const validDelegations = plan.delegations.filter(d => ORCHESTRATOR_AGENTS.includes(d.agent));
  stageCard.innerHTML = `
    <div class="pipeline-stage-label"><span class="pdot"></span> DELEGATION PLAN</div>
    <div class="strategic-take">${escapeHtml(plan.strategic_take || '')}</div>
    ${validDelegations.map((d, i) => `
      <div class="delegation-row" id="del-row-${i}">
        <div class="d-avatar" style="background:${MEMBERS[d.agent].color}">${MEMBERS[d.agent].emoji}</div>
        <div class="d-info">
          <div class="d-name">${MEMBERS[d.agent].name}</div>
          <div class="d-task">${escapeHtml(d.task)}</div>
        </div>
        <div class="d-status pending" id="del-status-${i}">○</div>
      </div>`).join('')}`;
  msgs.scrollTop = msgs.scrollHeight;

  const contributions = [];
  for (let i = 0; i < validDelegations.length; i++) {
    const d = validDelegations[i];
    const statusEl = document.getElementById(`del-status-${i}`);
    statusEl.className = 'd-status working';
    statusEl.textContent = '●';
    setAgentStatus(d.agent, 'working');

    const agent = MEMBERS[d.agent];
    const delegatedSystem = agent.system + `\n\nIMPORTANT CONTEXT: Delegated by Priya, Delivery Lead. Directive: "${plan.strategic_take || text}"\n\nYour task: ${d.task}\n\nRespond with your actual finished deliverable — not a confirmation.`;

    let output;
    try {
      output = await callClaude(delegatedSystem, [{ role: 'user', content: d.task }]);
      setAgentStatus(d.agent, 'done');
    } catch (e) {
      output = '(This contribution failed to generate. Please retry.)';
      setAgentStatus(d.agent, 'error');
    }
    contributions.push({ agent: d.agent, task: d.task, output });
    statusEl.className = 'd-status done';
    statusEl.textContent = '✓';

    const details = document.createElement('details');
    details.className = 'agent-contribution';
    const imagePrompt = agent.canGenerateImages ? extractImagePrompt(output) : null;
    const cleanOutput = imagePrompt ? stripImageTag(output) : output;
    details.innerHTML = `
      <summary>
        <span style="font-size:14px">${agent.emoji}</span>
        <span>${agent.name} — contribution ready</span>
        <span class="chevron">▶</span>
      </summary>
      <div class="contribution-body" id="contrib-body-${i}">${formatText(cleanOutput)}</div>`;

    const detailsWrapper = document.createElement('div');
    detailsWrapper.className = 'msg ai';
    detailsWrapper.style.width = '100%';
    detailsWrapper.appendChild(details);
    msgs.appendChild(detailsWrapper);

    if (imagePrompt) {
      details.addEventListener('toggle', function onToggle() {
        if (details.open) {
          const body = document.getElementById(`contrib-body-${i}`);
          if (body && !body.querySelector('img') && !body.querySelector('.typing-indicator')) {
            renderGeneratedImage(imagePrompt, body);
          }
          details.removeEventListener('toggle', onToggle);
        }
      });
    }

    msgs.scrollTop = msgs.scrollHeight;
  }

  // Synthesis
  const synthStageWrapper = document.createElement('div');
  synthStageWrapper.className = 'msg ai';
  const synthCard = document.createElement('div');
  synthCard.className = 'pipeline-card';
  synthCard.innerHTML = `<div class="pipeline-stage-label"><span class="pdot"></span> PRIYA IS COMPILING THE FINAL OUTPUT…</div>`;
  synthStageWrapper.appendChild(synthCard);
  msgs.appendChild(synthStageWrapper);
  msgs.scrollTop = msgs.scrollHeight;

  const synthesisPrompt = `Original request: "${text}"
Strategic take: ${plan.strategic_take || ''}
Team outputs:
${contributions.map(c => `[${MEMBERS[c.agent].name}]\n${stripImageTag(c.output)}`).join('\n\n')}

Compile into one final cohesive deliverable. Organise by function with short headers. Remove redundancy. Close with a brief Delivery Lead recommendation or next step.`;

  setAgentStatus('ceo', 'working', 'Compiling…');
  let finalOutput;
  try {
    finalOutput = await callClaude(MEMBERS.ceo.system, [{ role: 'user', content: synthesisPrompt }]);
    setAgentStatus('ceo', 'done', 'Compiled');
  } catch (e) {
    finalOutput = 'There was an error compiling the final output. Please retry.';
    setAgentStatus('ceo', 'error');
  }

  synthStageWrapper.remove();
  histories.ceo.push({ role: 'assistant', content: finalOutput });

  const finalWrapper = document.createElement('div');
  finalWrapper.className = 'msg ai';
  const finalBubble = document.createElement('div');
  finalBubble.className = 'pipeline-card final-deliverable';
  finalBubble.innerHTML = `<div class="final-deliverable-label">✅ FINAL DELIVERABLE — COMPILED BY PRIYA</div>${formatText(finalOutput)}`;
  finalWrapper.appendChild(finalBubble);
  msgs.appendChild(finalWrapper);
  msgs.scrollTop = msgs.scrollHeight;

  // Save to Supabase
  await saveProject(
    text.length > 80 ? text.substring(0, 80) + '…' : text,
    text,
    validDelegations.map(d => d.agent),
    contributions,
    finalOutput
  );

  isLoading = false;
  document.getElementById('send-btn').disabled = false;
}

// ── CINEMATIC REEL BUILDER — UI functions ──

let reelBuilderOpen = false;

function openReelBuilder() {
  reelBuilderOpen = true;
  const msgs = document.getElementById('messages');
  msgs.innerHTML = '';

  const wrapper = document.createElement('div');
  wrapper.className = 'msg ai';
  wrapper.id = 'reel-builder-wrapper';
  wrapper.style.width = '100%';

  const panel = document.createElement('div');
  panel.className = 'reel-builder-panel';
  panel.innerHTML = `
    <div class="rb-header">
      <div class="rb-header-icon">🎬</div>
      <div class="rb-header-info">
        <div class="rb-title">Cinematic Reel Builder</div>
        <div class="rb-subtitle">Pooja's Couture — 45s Instagram Reel · 9:16 · Luxury Couture<br>CTA hardcoded: <strong>Book a Consult → poojascouture.com/reach-us</strong></div>
      </div>
      <button class="rb-close-btn" onclick="closeReelBuilder()" title="Close Reel Builder">✕</button>
    </div>
    <div class="rb-form-body">
      <div class="rb-field">
        <label class="rb-label" for="rb-drive">Google Drive Folder URL <span class="rb-req">*</span></label>
        <input id="rb-drive" class="rb-input" type="url" placeholder="https://drive.google.com/drive/folders/…" required>
      </div>
      <div class="rb-field">
        <label class="rb-label" for="rb-look">Look Name / Collection <span class="rb-optional">(optional)</span></label>
        <input id="rb-look" class="rb-input" type="text" placeholder="e.g. Midnight Crimson Bridal Lehenga">
      </div>
      <div class="rb-field">
        <label class="rb-label" for="rb-brief">Occasion / Brief <span class="rb-optional">(optional)</span></label>
        <textarea id="rb-brief" class="rb-textarea" placeholder="e.g. Sangeet night look, full twirl moment, dramatic entrance vibe…"></textarea>
      </div>
      <div class="rb-field">
        <label class="rb-label" for="rb-audience">Target Audience <span class="rb-optional">(optional)</span></label>
        <select id="rb-audience" class="rb-select">
          <option value="">— Select audience —</option>
          <option value="brides">Brides</option>
          <option value="wedding guests">Wedding Guests</option>
          <option value="festive">Festive / Occasion Wear</option>
          <option value="couture collectors">Couture Collectors</option>
          <option value="mothers of the bride">Mothers of the Bride</option>
          <option value="grooms & sherwanis">Grooms &amp; Sherwanis</option>
        </select>
      </div>
      <div class="rb-field">
        <label class="rb-label" for="rb-vibe">Creative Vibe <span class="rb-optional">(optional — Dia will choose if blank)</span></label>
        <select id="rb-vibe" class="rb-select">
          <option value="">— Let Dia decide —</option>
          <option value="Regal Bridal Cinema">Regal Bridal Cinema</option>
          <option value="Modern Editorial Minimal">Modern Editorial Minimal</option>
          <option value="Festive Glamour Energy">Festive Glamour Energy</option>
          <option value="Old-Money Luxury">Old-Money Luxury</option>
          <option value="Soft Romantic Couture">Soft Romantic Couture</option>
        </select>
      </div>
      <button class="rb-submit-btn" id="rb-submit-btn" onclick="submitReelBrief()">
        <span>✨</span> Generate Reel Brief
      </button>
    </div>`;

  wrapper.appendChild(panel);
  msgs.appendChild(wrapper);
  msgs.scrollTop = 0;
}

function closeReelBuilder() {
  reelBuilderOpen = false;
  renderMessages();
  // Re-inject chip after render
  setTimeout(() => {
    const msgs = document.getElementById('messages');
    if (!msgs.querySelector('.reel-builder-chip')) {
      const chip = document.createElement('button');
      chip.className = 'reel-builder-chip';
      chip.innerHTML = '🎬 &nbsp;Build a Cinematic 45s Reel Brief';
      chip.onclick = openReelBuilder;
      const welcomeCard = msgs.querySelector('.welcome-card');
      if (welcomeCard) {
        welcomeCard.appendChild(chip);
      } else {
        const wrapper = document.createElement('div');
        wrapper.style.cssText = 'display:flex;justify-content:flex-start;padding:0 0 8px 52px;';
        wrapper.appendChild(chip);
        msgs.appendChild(wrapper);
      }
    }
  }, 50);
}

async function submitReelBrief() {
  const driveUrl = document.getElementById('rb-drive')?.value?.trim();
  if (!driveUrl) {
    document.getElementById('rb-drive').focus();
    document.getElementById('rb-drive').style.borderColor = 'rgba(220,90,90,0.6)';
    setTimeout(() => { document.getElementById('rb-drive').style.borderColor = ''; }, 2000);
    return;
  }

  const lookName   = document.getElementById('rb-look')?.value?.trim()   || 'Not specified';
  const brief      = document.getElementById('rb-brief')?.value?.trim()  || 'Not specified';
  const audience   = document.getElementById('rb-audience')?.value        || 'Not specified';
  const vibe       = document.getElementById('rb-vibe')?.value            || '';

  const userPrompt = [
    `DRIVE_FOLDER_URL: ${driveUrl}`,
    `LOOK_NAME: ${lookName}`,
    `BRIEF: ${brief}`,
    `AUDIENCE: ${audience}`,
    vibe ? `REQUESTED_VIBE: ${vibe}` : 'REQUESTED_VIBE: Let Dia decide based on the brief'
  ].join('\n');

  // Disable submit, show loading
  const submitBtn = document.getElementById('rb-submit-btn');
  if (submitBtn) { submitBtn.disabled = true; submitBtn.innerHTML = '<span>⏳</span> Dia is crafting your brief…'; }

  let raw = '';
  try {
    raw = await callClaude(REEL_BUILDER_SYSTEM, [{ role: 'user', content: userPrompt }]);
    const data = JSON.parse(raw.trim().replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/```\s*$/, ''));
    renderReelOutput(data, driveUrl, lookName);
  } catch (err) {
    // Fallback: show raw text in case JSON parse fails
    const msgs = document.getElementById('messages');
    msgs.innerHTML = '';
    const wrapper = document.createElement('div');
    wrapper.className = 'msg ai';
    wrapper.style.width = '100%';
    const bubble = document.createElement('div');
    bubble.className = 'bubble';
    bubble.innerHTML = `<p style="color:rgba(220,90,90,0.9);font-size:13px;margin-bottom:8px">⚠ Could not parse structured output. Showing raw response:</p>${formatText(raw || 'No response received. Please try again.')}` ;
    wrapper.appendChild(bubble);
    msgs.appendChild(wrapper);
    const bar = document.createElement('div');
    bar.className = 'rb-action-bar';
    bar.style.cssText = 'padding: 0 0 16px 52px;';
    bar.innerHTML = '<button class="rb-action-btn" onclick="openReelBuilder()">← Try Again</button>';
    msgs.appendChild(bar);
    msgs.scrollTop = 0;
  }
}

function renderReelOutput(data, driveUrl, lookName) {
  const msgs = document.getElementById('messages');
  msgs.innerHTML = '';

  const cd  = data.creativeDirection || {};
  const tl  = data.timeline || [];
  const mus = data.music || {};
  const ed  = data.editInstructions || {};
  const txt = data.onScreenText || [];
  const tags = data.hashtags || [];
  const capA = data.captionA || '';
  const capB = data.captionB || '';
  const ctaLine = data.ctaLine || 'Book a Consult: https://poojascouture.com/reach-us/';

  const outerWrapper = document.createElement('div');
  outerWrapper.className = 'msg ai';
  outerWrapper.style.width = '100%';
  outerWrapper.style.flexDirection = 'column';
  outerWrapper.style.alignItems = 'flex-start';
  outerWrapper.style.gap = '0';

  const panel = document.createElement('div');
  panel.className = 'rb-output-panel';
  panel.id = 'rb-output-panel';

  // ── Header
  panel.innerHTML = `
    <div class="rb-output-header">
      <span class="rb-output-header-icon">🎬</span>
      <div class="rb-output-title">Reel Brief — ${escapeHtml(lookName !== 'Not specified' ? lookName : 'Pooja\'s Couture')}</div>
      <span style="font-size:10px;color:var(--pc-text-muted);letter-spacing:0.06em;text-transform:uppercase;font-weight:600;">45s · 9:16 · Instagram Reel</span>
    </div>`;

  // ── Section 1: Creative Direction
  const s1 = document.createElement('div');
  s1.className = 'rb-section-card';
  s1.innerHTML = `
    <div class="rb-section-label"><span>🎨</span> Creative Direction</div>
    <div class="rb-section-body">
      <p><strong>${escapeHtml(cd.vibe || '')}</strong></p>
      <p>${escapeHtml(cd.whyItFits || '')}</p>
      ${cd.heroShot ? `<p><strong>Hero Shot:</strong> ${escapeHtml(cd.heroShot)}</p>` : ''}
      ${cd.missingAssets && cd.missingAssets.toLowerCase() !== 'none — proceed' && cd.missingAssets.toLowerCase() !== 'none - proceed'
        ? `<p style="color:rgba(220,140,90,0.9)"><strong>⚠ Missing Assets:</strong> ${escapeHtml(cd.missingAssets)}</p>`
        : `<p style="color:rgba(100,190,130,0.9)"><strong>✓ Assets:</strong> Sufficient to proceed.</p>`}
    </div>`;
  panel.appendChild(s1);

  // ── Section 2: 45s Timeline
  const tagClasses = { HOOK: 'hook', CTA: 'cta' };
  const s2 = document.createElement('div');
  s2.className = 'rb-section-card';
  s2.innerHTML = `<div class="rb-section-label"><span>⏱</span> 45-Second Timeline</div>`;
  const tlDiv = document.createElement('div');
  tlDiv.className = 'rb-timeline';
  tl.forEach(row => {
    const tagCls = tagClasses[row.tag] || '';
    const rowEl = document.createElement('div');
    rowEl.className = 'rb-tl-row';
    rowEl.innerHTML = `<div class="rb-tl-time">${escapeHtml(row.time || '')}</div>
      <div class="rb-tl-desc"><span class="rb-tl-tag ${tagCls}">${escapeHtml(row.tag || '')}</span>${escapeHtml(row.description || '')}</div>`;
    tlDiv.appendChild(rowEl);
  });
  s2.appendChild(tlDiv);
  panel.appendChild(s2);

  // ── Section 3: Music Direction
  const s3 = document.createElement('div');
  s3.className = 'rb-section-card';
  s3.innerHTML = `
    <div class="rb-section-label"><span>🎵</span> Music Direction</div>
    <div class="rb-music-block">
      <div class="rb-music-pill">
        <div class="rb-music-pill-label">Mood</div>
        <div class="rb-music-pill-value">${escapeHtml(mus.mood || '—')}</div>
      </div>
      <div class="rb-music-pill">
        <div class="rb-music-pill-label">Tempo</div>
        <div class="rb-music-pill-value">${escapeHtml(mus.tempo || '—')}</div>
      </div>
      <div class="rb-music-pill">
        <div class="rb-music-pill-label">Beat Drop / Swell At</div>
        <div class="rb-music-pill-value">${escapeHtml(mus.beatDropMoment || '—')}</div>
      </div>
      <div class="rb-music-pill">
        <div class="rb-music-pill-label">Search Keywords</div>
        <div class="rb-music-pill-value">${escapeHtml(mus.searchKeywords || '—')}</div>
      </div>
    </div>`;
  panel.appendChild(s3);

  // ── Section 4: Edit Instructions
  const s4 = document.createElement('div');
  s4.className = 'rb-section-card';
  s4.innerHTML = `
    <div class="rb-section-label"><span>✂️</span> Edit Instructions</div>
    <div class="rb-section-body">
      <p><strong>Cut Style:</strong> ${escapeHtml(ed.cutStyle || '—')}</p>
      <p><strong>Transitions:</strong> ${escapeHtml(ed.transitions || '—')}</p>
      <p><strong>Colour Grade:</strong> ${escapeHtml(ed.colorGrade || '—')}</p>
      <p><strong>Sound Design:</strong> ${escapeHtml(ed.soundDesign || '—')}</p>
      <p><strong>Text Style:</strong> ${escapeHtml(ed.textStyle || '—')}</p>
      <p><strong>Export:</strong> ${escapeHtml(ed.exportSettings || '1080×1920 · 30fps · high bitrate')}</p>
    </div>`;
  panel.appendChild(s4);

  // ── Section 5: On-Screen Text
  const s5 = document.createElement('div');
  s5.className = 'rb-section-card';
  s5.innerHTML = `<div class="rb-section-label"><span>📝</span> On-Screen Text</div>`;
  const onscreenList = document.createElement('div');
  onscreenList.className = 'rb-onscreen-list';
  txt.forEach((line, i) => {
    const item = document.createElement('div');
    item.className = 'rb-onscreen-item';
    item.innerHTML = `<div class="rb-onscreen-num">${i + 1}</div><div>${escapeHtml(line)}</div>`;
    onscreenList.appendChild(item);
  });
  s5.appendChild(onscreenList);
  panel.appendChild(s5);

  // ── Section 6: Captions
  const s6 = document.createElement('div');
  s6.className = 'rb-section-card';
  s6.innerHTML = `
    <div class="rb-section-label"><span>📣</span> Captions</div>
    <div class="rb-caption-tabs">
      <button class="rb-cap-tab active" id="rb-tab-a" onclick="rbSwitchCaption('a')">Version A — Editorial</button>
      <button class="rb-cap-tab" id="rb-tab-b" onclick="rbSwitchCaption('b')">Version B — Warm &amp; Inviting</button>
    </div>
    <div class="rb-cap-panel active" id="rb-cap-a">
      <div class="rb-caption-body">${escapeHtml(capA)}</div>
    </div>
    <div class="rb-cap-panel" id="rb-cap-b">
      <div class="rb-caption-body">${escapeHtml(capB)}</div>
    </div>`;
  panel.appendChild(s6);

  // ── Section 7: Hashtags
  const s7 = document.createElement('div');
  s7.className = 'rb-section-card';
  const hashHtml = tags.map(h => `<span class="rb-hashtag">${escapeHtml(h)}</span>`).join('');
  s7.innerHTML = `
    <div class="rb-section-label"><span>#</span> Hashtags</div>
    <div class="rb-hashtags">${hashHtml}</div>`;
  panel.appendChild(s7);

  // ── CTA Banner (final frame)
  const ctaBanner = document.createElement('div');
  ctaBanner.className = 'rb-cta-banner';
  ctaBanner.innerHTML = `
    <div class="rb-cta-icon">🔗</div>
    <div class="rb-cta-text">
      <div class="rb-cta-label">Final Frame CTA</div>
      <div class="rb-cta-line">Book a Consult</div>
      <a class="rb-cta-url" href="https://poojascouture.com/reach-us/" target="_blank">https://poojascouture.com/reach-us/</a>
    </div>`;
  panel.appendChild(ctaBanner);

  outerWrapper.appendChild(panel);

  // ── Action bar
  const actionBar = document.createElement('div');
  actionBar.className = 'rb-action-bar';
  actionBar.style.cssText = 'padding: 16px 0 8px 0; width: 100%; max-width: 680px;';
  actionBar.innerHTML = `
    <button class="rb-action-btn primary" onclick="rbCopyAll()">📋 Copy Full Brief</button>
    <button class="rb-action-btn" onclick="rbSaveToHistory()">💾 Save to History</button>
    <button class="rb-action-btn" onclick="openReelBuilder()">← New Brief</button>
    <button class="rb-action-btn" onclick="closeReelBuilder()">✕ Close Builder</button>`;
  outerWrapper.appendChild(actionBar);

  msgs.appendChild(outerWrapper);
  msgs.scrollTop = 0;

  // Stash data on the element for copy/save
  outerWrapper._reelData = data;
  outerWrapper._reelLookName = lookName;
  outerWrapper._reelDriveUrl = driveUrl;
}

function rbSwitchCaption(ver) {
  document.querySelectorAll('.rb-cap-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.rb-cap-panel').forEach(p => p.classList.remove('active'));
  const tab   = document.getElementById('rb-tab-' + ver);
  const panel = document.getElementById('rb-cap-' + ver);
  if (tab)   tab.classList.add('active');
  if (panel) panel.classList.add('active');
}

function rbCopyAll() {
  const wrapper = document.querySelector('#rb-output-panel');
  if (!wrapper) return;
  const data = document.querySelector('.msg.ai[style*="flex-direction: column"]')?._reelData;
  if (!data) {
    // Fallback: grab visible text
    const text = wrapper.innerText || wrapper.textContent;
    navigator.clipboard.writeText(text).then(() => rbFlashActionBtn('📋 Copied!'));
    return;
  }
  const cd = data.creativeDirection || {};
  const tl = data.timeline || [];
  const mus = data.music || {};
  const ed = data.editInstructions || {};
  const txt = data.onScreenText || [];
  const tags = data.hashtags || [];
  const lines = [
    `POOJA'S COUTURE — CINEMATIC REEL BRIEF`,
    `========================================`,
    ``,
    `🎨 CREATIVE DIRECTION`,
    `Vibe: ${cd.vibe || ''}`,
    `Why: ${cd.whyItFits || ''}`,
    `Hero Shot: ${cd.heroShot || ''}`,
    `Missing Assets: ${cd.missingAssets || 'None'}`,
    ``,
    `⏱ 45-SECOND TIMELINE`,
    ...tl.map(r => `${r.time}  [${r.tag}]  ${r.description}`),
    ``,
    `🎵 MUSIC DIRECTION`,
    `Mood: ${mus.mood || ''}`,
    `Tempo: ${mus.tempo || ''}`,
    `Beat Drop At: ${mus.beatDropMoment || ''}`,
    `Search Keywords: ${mus.searchKeywords || ''}`,
    ``,
    `✂️ EDIT INSTRUCTIONS`,
    `Cut Style: ${ed.cutStyle || ''}`,
    `Transitions: ${ed.transitions || ''}`,
    `Colour Grade: ${ed.colorGrade || ''}`,
    `Sound Design: ${ed.soundDesign || ''}`,
    `Text Style: ${ed.textStyle || ''}`,
    `Export: ${ed.exportSettings || ''}`,
    ``,
    `📝 ON-SCREEN TEXT`,
    ...txt.map((l, i) => `${i + 1}. ${l}`),
    ``,
    `📣 CAPTION A (Editorial)`,
    data.captionA || '',
    ``,
    `📣 CAPTION B (Warm & Inviting)`,
    data.captionB || '',
    ``,
    `# HASHTAGS`,
    (tags || []).join(' '),
    ``,
    `🔗 FINAL FRAME CTA`,
    data.ctaLine || 'Book a Consult: https://poojascouture.com/reach-us/',
  ];
  navigator.clipboard.writeText(lines.join('\n')).then(() => rbFlashActionBtn('✓ Copied!'));
}

function rbFlashActionBtn(label) {
  const btns = document.querySelectorAll('.rb-action-btn.primary');
  if (btns.length === 0) return;
  const btn = btns[0];
  const orig = btn.innerHTML;
  btn.innerHTML = label;
  setTimeout(() => { btn.innerHTML = orig; }, 2000);
}

async function rbSaveToHistory() {
  const lookName = document.querySelector('.msg.ai[style*="flex-direction: column"]')?._reelLookName || 'Reel Brief';
  const data = document.querySelector('.msg.ai[style*="flex-direction: column"]')?._reelData;
  if (!data) return;
  const tl = (data.timeline || []).map(r => `${r.time}  [${r.tag}]  ${r.description}`).join('\n');
  const finalOutput = `Creative Direction: ${(data.creativeDirection || {}).vibe || ''}\n\n45s Timeline:\n${tl}\n\nCaption A:\n${data.captionA || ''}\n\nCaption B:\n${data.captionB || ''}\n\nHashtags:\n${(data.hashtags || []).join(' ')}\n\nCTA: ${data.ctaLine || 'Book a Consult: https://poojascouture.com/reach-us/'}` ;
  await saveProject(
    `Reel Brief — ${lookName}`,
    `Cinematic Reel Builder run for: ${lookName}`,
    ['creator'],
    [],
    finalOutput
  );
  const btns = document.querySelectorAll('.rb-action-btn:not(.primary)');
  if (btns[0]) { const orig = btns[0].innerHTML; btns[0].innerHTML = '✓ Saved'; setTimeout(() => { btns[0].innerHTML = orig; }, 2000); }
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ── ACCESS CONTROL ──
const ALLOWED_ROLES = ['admin', 'social_crm', 'social_crm_limited'];

function checkAccess(isRetry) {
  const gateScreen = document.getElementById('gate-screen');
  const gateMessage = document.getElementById('gate-message');
  const gateActions = document.getElementById('gate-actions');
  const workspace = document.getElementById('ai-team-workspace');

  let currentUser = null;
  try { currentUser = JSON.parse(localStorage.getItem('pc_current_user')); } catch (e) {}

  if (!currentUser && !isRetry) { setTimeout(() => checkAccess(true), 400); return; }

  if (!currentUser) {
    gateMessage.textContent = 'You need to log in to access the AI Studio Team.';
    gateActions.innerHTML = '<a href="../index.html" class="btn btn-primary w-full">Go to Login</a>';
    gateActions.classList.remove('d-none');
    return;
  }

  if (!ALLOWED_ROLES.includes(currentUser.appRole)) {
    gateMessage.textContent = 'Access restricted. The AI Studio Team is available to Admin and Social/CRM roles only.';
    gateActions.innerHTML = '<a href="../index.html" class="btn btn-primary w-full">Return to Main App</a>';
    gateActions.classList.remove('d-none');
    return;
  }

  gateScreen.classList.add('d-none');
  gateScreen.classList.remove('active');
  workspace.classList.remove('d-none');
  getSupabaseClient();
  updateSaveButton();
  renderMessages();

  // Users whose only permission is socialCrm have nowhere to go in the
  // main app — "Back to Main App" would just land them on another
  // Access Denied screen. Replace both nav-out paths (footer link +
  // sidebar logo) with a user chip that signs them out instead.
  const perms = currentUser.permissions || {};
  const hasOtherAccess = currentUser.appRole === 'admin' ||
    !!(perms.crm || perms.hrm || perms.accounting || perms.admin);

  if (!hasOtherAccess) {
    const backLink = document.querySelector('.back-link');
    if (backLink) {
      // Replace the plain text link with the same avatar+name+role chip
      // used in the main app's sidebar footer, wired to sign out on click
      // instead of navigating anywhere.
      const chip = document.createElement('div');
      chip.className = 'sidebar-user';
      chip.style.cursor = 'pointer';
      chip.title = 'Sign out';
      chip.innerHTML = `
        <div class="sidebar-user-avatar" style="background-color:${_avatarColorFor(currentUser.name)};color:var(--pc-text-inverse, #fff)">${_initialsFor(currentUser.name)}</div>
        <div class="sidebar-user-info">
          <div class="sidebar-user-name">${escapeHtml(currentUser.name || currentUser.email || 'Account')}</div>
          <div class="sidebar-user-role">${escapeHtml(_roleTitleFor(currentUser))}</div>
        </div>
      `;
      chip.addEventListener('click', () => signOutSocialCrmUser());
      backLink.replaceWith(chip);
    }

    const brandHome = document.querySelector('.sidebar-brand-home');
    if (brandHome) {
      // Logo stays visible but no longer links to the main app.
      const span = document.createElement('span');
      span.className = brandHome.className.replace('sidebar-brand-home', 'sidebar-brand-home sidebar-brand-home--static');
      span.innerHTML = brandHome.innerHTML;
      brandHome.replaceWith(span);
    }
  }
}

async function signOutSocialCrmUser() {
  try {
    if (window._sbClient) await window._sbClient.auth.signOut({ scope: 'local' });
  } catch (e) { /* fall through to manual cleanup below regardless */ }
  try {
    localStorage.removeItem('pc_current_user');
    localStorage.removeItem('pc_last_route');
    // Belt-and-braces: if auth.signOut() above failed silently (e.g. a
    // network blip), a stale Supabase session token left in localStorage
    // would let the main app's reconcileUser() log the user straight
    // back in and bounce them right back to this portal. Mirrors what
    // Store.logout() does in js/store.js — must stay in sync with it.
    Object.keys(localStorage)
      .filter(k => k.startsWith('sb-') || k === 'pc-suite-auth')
      .forEach(k => localStorage.removeItem(k));
  } catch (e) {}
  window.location.href = '../index.html';
}

// Small self-contained copies of Utils.getInitials/getAvatarColor —
// utils.js is not loaded in this portal, and pulling in the whole file
// just for two one-line helpers isn't worth the extra dependency.
function _initialsFor(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  const first = parts[0] ? parts[0][0] : '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase();
}
function _avatarColorFor(name) {
  const palette = ['#c8905a', '#8f6ebe', '#5aa0be', '#be5a7a', '#6ebe8f', '#be9e5a'];
  let hash = 0;
  for (let i = 0; i < (name || '').length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return palette[Math.abs(hash) % palette.length];
}
function _roleTitleFor(user) {
  const roleTitles = {
    admin: 'Operations Director',
    operations: 'Operations Manager',
    social_crm: 'CRM & Social',
    social_crm_limited: 'CRM & Social',
    tailor: 'Master Tailor',
    logistics: 'Logistics Manager'
  };
  const key = (user.appRole || user.app_role || user.role || '').toLowerCase();
  const displayName = (user.name || '').toLowerCase();
  if (displayName.includes('pooja')) return 'Managing Director';
  return roleTitles[key] || user.role || '';
}

document.addEventListener('DOMContentLoaded', () => checkAccess(false));

// ── Sidebar collapse toggle ──
// Reuses the same 'pc-sidebar-collapsed' key the main app uses, so
// collapsing the sidebar here (or in the main app) stays consistent
// everywhere rather than being a per-portal setting.
(function setupSidebarCollapse() {
  function init() {
    const sidebar = document.getElementById('sidebar');
    const btn = document.getElementById('ai-sidebar-collapse-btn');
    if (!sidebar || !btn) return;

    let saved = null;
    try { saved = localStorage.getItem('pc-sidebar-collapsed'); } catch (e) {}
    if (saved === 'true') {
      sidebar.classList.add('collapsed');
      btn.textContent = '›';
    }

    btn.addEventListener('click', () => {
      const isCollapsed = sidebar.classList.toggle('collapsed');
      try { localStorage.setItem('pc-sidebar-collapsed', isCollapsed); } catch (e) {}
      btn.textContent = isCollapsed ? '›' : '‹';
    });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
