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
    welcome: "I'm Dia, your Content Creator. I script Reels, TikToks, storyboards and UGC-style video content — and I can generate visual storyboard frames too. What are we filming?",
    chips: ['Script a Reel for bridal sneakers launch', 'Storyboard for a Diwali campaign Reel', 'Behind-the-scenes content plan', 'Generate a storyboard frame for lehenga shoot', 'UGC brief for customer testimonials']
  }
};

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
    const res = await fetch('/api/generate-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: fullPrompt })
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

// ── SUPABASE HISTORY ──
async function getSupabaseClient() {
  if (window._sbClient) return window._sbClient;
  window._sbClient = supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
  return window._sbClient;
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
    const date = new Date(p.created_at).toLocaleDateString('en-AU', { day:'numeric', month:'short', year:'numeric' });
    const time = new Date(p.created_at).toLocaleTimeString('en-AU', { hour:'2-digit', minute:'2-digit' });
    const agents = (p.agents_involved || []).map(a => MEMBERS[a]?.emoji || '').join(' ');
    const isDirectChat = (p.contributions || []).length === 0;
    const typeLabel = isDirectChat ? '💬 Direct Chat' : '🔀 Auto-Delegate';
    return `
      <div class="history-card" id="hcard-${p.id}">
        <div class="history-card-header">
          <div class="history-meta">
            <div class="history-title">${escapeHtml(p.title)}</div>
            <div class="history-date">${date} · ${time} ${agents ? '· ' + agents : ''} · <span style="opacity:0.6">${typeLabel}</span></div>
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
  const response = await fetch('/api/ai-team', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ max_tokens: 1200, system, messages })
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
    removeTyping();
    appendBubble('assistant', 'There was an error connecting. Please try again.');
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
    stageWrapper.remove();
    showTyping();
    try {
      const reply = await callClaude(MEMBERS.ceo.system, histories.ceo);
      histories.ceo.push({ role: 'assistant', content: reply });
      removeTyping();
      appendBubble('assistant', reply);
      setAgentStatus('ceo', 'done');
    } catch (e) {
      removeTyping();
      appendBubble('assistant', 'There was an error connecting. Please try again.');
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

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ── ACCESS CONTROL ──
const ALLOWED_ROLES = ['admin', 'social_crm'];

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
  updateSaveButton();
  renderMessages();
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
