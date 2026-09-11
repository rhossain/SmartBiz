(function () {
  'use strict';

  const stories = window.SMARTBIZ_SCREEN_MAP || [];
  const root = document.getElementById('mockup-app');
  const epicNames = {
    1: 'Foundation, accounts & tenancy', 2: 'Product catalog & variants',
    3: 'Inventory ledger', 4: 'Order capture & lifecycle',
    5: 'Courier & COD settlement', 6: 'Decision-first dashboard',
    7: 'Customers & dues', 8: 'Suppliers & purchases',
    9: 'Expenses', 10: 'Reports & exports', 11: 'Audit & reversals',
    12: 'Safe insight assistant'
  };

  const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function chrome(content) {
    return `<div class="catalog-shell">
      <header class="catalog-top">
        <span class="brand-mark">স</span>
        <div class="brand-copy"><strong>SmartBiz BD</strong><span>Story-to-screen design source</span></div>
        <div class="catalog-progress"><span class="progress-track"><i class="progress-fill"></i></span><b>${stories.length}/${stories.length} covered</b></div>
        <a class="top-button" href="#story/1.1">Present from start</a>
      </header>${content}</div>`;
  }

  function hub() {
    const grouped = Object.groupBy ? Object.groupBy(stories, x => x.epic) : stories.reduce((a, x) => ((a[x.epic] ||= []).push(x), a), {});
    const groups = Object.entries(grouped).map(([epic, items]) => `<section class="epic-group" data-epic="${epic}">
      <div class="epic-heading"><span class="epic-number">${epic}</span><h2>${esc(epicNames[epic])}</h2><span>${items.length} stories · ${items.length} screens</span></div>
      <div class="story-grid">${items.map(story => `<a class="story-link" href="#story/${story.id}" data-search="${esc(`${story.id} ${story.title} ${story.surface} ${story.route}`.toLowerCase())}">
        <span class="story-id">${story.id}</span><span class="story-copy"><strong>${esc(story.title)}</strong><small>${esc(story.surface)}</small></span><span class="mode-chip">${story.mode}</span>
      </a>`).join('')}</div>
    </section>`).join('');
    root.innerHTML = chrome(`<div class="hub">
      <section class="hub-hero">
        <div><p class="eyebrow">Presentation journey hub · design gate</p><h1>Every planned story has a screen before prototype code.</h1><p class="hub-intro">The complete SmartBiz BD narrative: 12 epics, 76 story frames, and no invisible requirements. Open any row to present the intended state, action, and proof.</p></div>
        <aside class="coverage-card"><div class="count"><strong>${stories.length}</strong><span>of ${stories.length} stories</span></div><div class="coverage-line"><i></i></div><p>0 missing · exact title parity with epics.md · mockups are authoritative</p></aside>
      </section>
      <div class="hub-tools"><input id="story-search" class="search" type="search" aria-label="Search story mockups" placeholder="Search story, surface, or route…"><select id="epic-filter" class="filter" aria-label="Filter by epic"><option value="all">All 12 epics</option>${Object.keys(epicNames).map(n => `<option value="${n}">Epic ${n}</option>`).join('')}</select></div>
      <div class="epic-stack">${groups}</div>
    </div>`);
    document.getElementById('story-search').addEventListener('input', filterHub);
    document.getElementById('epic-filter').addEventListener('change', filterHub);
  }

  function filterHub() {
    const query = document.getElementById('story-search').value.toLowerCase().trim();
    const epic = document.getElementById('epic-filter').value;
    document.querySelectorAll('.epic-group').forEach(group => {
      let visible = 0;
      group.querySelectorAll('.story-link').forEach(link => {
        const show = (!query || link.dataset.search.includes(query)) && (epic === 'all' || group.dataset.epic === epic);
        link.classList.toggle('is-hidden', !show);
        if (show) visible += 1;
      });
      group.classList.toggle('is-hidden', visible === 0);
    });
  }

  function fields(story) {
    const labelsByKind = {
      auth: ['মোবাইল নম্বর · Mobile number', 'পাসওয়ার্ড · Password', 'Invitation / recovery code', 'Business & Role'],
      form: ['Primary record', 'Date or reference', 'Quantity / amount', 'Reason or note'],
      state: ['Current state', 'Required decision', 'Responsible person', 'Effective date'],
      detail: ['Identity', 'Current status', 'Related record', 'Recorded by']
    };
    return (labelsByKind[story.kind] || labelsByKind.form).map((label, i) => `<div class="field"><label>${esc(label)}</label><div class="control ${i > 1 ? 'placeholder' : ''}">${i === 0 ? esc(story.surface) : i === 1 ? esc(story.state) : i === 2 ? 'Select a value' : 'Optional context'}</div></div>`).join('');
  }

  function rows(story) {
    return `<div class="rows"><div class="row head"><span>Record</span><span>Source</span><span>Amount / state</span><span>Status</span></div>
      <div class="row"><strong>${esc(story.surface)}</strong><span>SB-${story.id.replace('.', '')}41</span><span class="mono">৳ 12,450.00</span><span class="status">Ready</span></div>
      <div class="row"><strong>${esc(story.evidence[0])}</strong><span>Today, 10:42</span><span class="mono">৳ 8,920.00</span><span class="status warn">Review</span></div>
      <div class="row"><strong>${esc(story.evidence[1])}</strong><span>Rupa Akter</span><span class="mono">3 records</span><span class="status">Recorded</span></div>
      <div class="row"><strong>${esc(story.evidence[2])}</strong><span>System</span><span class="mono">1 exception</span><span class="status danger">Attention</span></div></div>`;
  }

  function metrics(story) {
    return `<div class="metric-row">
      <div class="metric earned"><small>Earned · ${esc(story.surface)}</small><strong>৳ 48,350</strong><small>Delivery-date basis</small></div>
      <div class="metric realized"><small>Realized cash</small><strong>৳ 31,900</strong><small>Settlement-date basis</small></div>
      <div class="metric incomplete"><small>Completeness</small><strong>17 / 19</strong><small>2 records need cost</small></div>
    </div>`;
  }

  function timeline() {
    return `<div class="timeline"><div class="timeline-step done"><i></i>Recorded</div><div class="timeline-step done"><i></i>Confirmed</div><div class="timeline-step current"><i></i>In review</div><div class="timeline-step"><i></i>Complete</div></div>`;
  }

  function proof(story) {
    return `<div class="empty-proof"><div><div class="shield">✓</div><strong>${esc(story.state)}</strong><p class="muted">This is a system-proof surface: visible evidence, not a hidden promise.</p></div></div>`;
  }

  function contentFor(story) {
    if (story.kind === 'proof') return `${proof(story)}<div class="evidence-strip">Evidence remains tied to the acceptance story and is safe to show in a presentation.</div>`;
    if (story.kind === 'report') return `${metrics(story)}<div class="mock-card card-pad"><div class="card-title"><strong>Recognition and source detail</strong><small>Updated just now</small></div>${rows(story)}</div>`;
    if (story.kind === 'table' || story.kind === 'list') return `<div class="mock-card card-pad"><div class="card-title"><strong>${esc(story.state)}</strong><small>4 visible records</small></div>${rows(story)}</div>`;
    if (story.kind === 'flow') return `${timeline()}<div class="mock-card card-pad"><div class="card-title"><strong>Next permitted decision</strong><small>Rules applied server-side</small></div><div class="decision"><span class="number">1</span><span><strong>${esc(story.action)}</strong><small>${esc(story.evidence[0])}</small></span><span class="status warn">Current</span></div><div class="decision"><span class="number">2</span><span><strong>Verify resulting record</strong><small>${esc(story.evidence[1])}</small></span><span class="status">Next</span></div></div>`;
    return `<div class="mock-card card-pad"><div class="card-title"><strong>${esc(story.state)}</strong><small>Story ${story.id}</small></div><div class="form-grid">${fields(story)}</div></div>${story.kind === 'state' ? `<div class="proof-banner"><span class="proof-icon">!</span><div><strong>Decision required</strong><p>${esc(story.evidence[0])}. The consequence is shown before the action is committed.</p></div></div>` : ''}`;
  }

  function productScreen(story) {
    return `<div class="device ${story.mode}"><div class="device-bar"></div><div class="screen kind-${story.kind}"><div class="app-shell">
      <aside class="app-rail"><div class="rail-brand"><span class="rail-dot"></span>SmartBiz BD</div><div class="rail-nav"><span>আজ · Today</span><span class="active">${esc(epicNames[story.epic])}</span><span>Orders</span><span>Money & COD</span><span>Reports</span><span>Settings</span></div></aside>
      <div class="app-content"><div class="phone-head"><strong>SmartBiz BD</strong><span>⋮</span></div><div class="screen-main">
        <header class="screen-header"><div><p class="eyebrow">Epic ${story.epic} · Story ${story.id}</p><h2>${esc(story.surface)}</h2><p>${esc(story.title)}</p></div><span class="state-chip">${esc(story.state)}</span></header>
        ${contentFor(story)}
        <div class="screen-actions"><button class="secondary">Cancel</button><button class="primary">${esc(story.action)}</button></div>
        <p class="screen-footnote">Prototype target: #/${esc(story.route)} · Presentation data is synthetic.</p>
      </div></div></div></div></div>`;
  }

  function storyView(id) {
    const story = stories.find(x => x.id === id) || stories[0];
    const index = stories.indexOf(story);
    const previous = stories[(index - 1 + stories.length) % stories.length];
    const next = stories[(index + 1) % stories.length];
    root.innerHTML = `<div class="presentation"><nav class="story-toolbar"><a class="back" href="#hub">← All screens</a><strong>Story ${story.id}</strong><span class="position">${index + 1} / ${stories.length}</span><a class="arrow" aria-label="Previous story" href="#story/${previous.id}">←</a><a class="arrow" aria-label="Next story" href="#story/${next.id}">→</a></nav>
      <div class="stage"><aside class="story-notes"><p class="eyebrow">Epic ${story.epic} · ${esc(epicNames[story.epic])}</p><h1>${esc(story.title)}</h1><span class="route">#/${esc(story.route)}</span><p><strong>Presentation state:</strong> ${esc(story.state)}</p><h2>Visible proof</h2><ul>${story.evidence.map(item => `<li>${esc(item)}</li>`).join('')}</ul></aside>
      <section class="viewport-wrap"><div class="viewport-label"><span>${story.mode === 'phone' ? '390 × 844 phone target' : '1440 × 900 desktop target'}</span><span>${esc(story.kind)} pattern</span></div>${productScreen(story)}</section></div></div>`;
    document.title = `Story ${story.id} — ${story.title}`;
  }

  function route() {
    const match = location.hash.match(/^#story\/(\d+\.\d+)$/);
    if (match) storyView(match[1]); else hub();
    scrollTo(0, 0);
  }

  window.addEventListener('hashchange', route);
  route();
}());
