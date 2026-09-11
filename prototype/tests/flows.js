/* Drive the multi-step interactions a single click cannot reach: the assistant's
   route→answer and route→refuse paths, voice dictation, the three-level variant
   matrix, the quick-add grid, the paste-flow variant picker, and settlement
   variance disposition. These are the design-critical beats — the ones where a
   broken selector or a swallowed toast is invisible to a render test. */
const { boot, sleep } = require('./boot');

(async () => {
  const { window, App, doc, errors: errs } = await boot();
  let fails = 0;

  function nav(r) { window.location.hash = '#/' + r; App.render(); }
  function click(sel) {
    const el = doc.querySelector(sel);
    if (!el) { console.log('  !! no element for ' + sel); fails++; return false; }
    el.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
    return true;
  }
  function expect(label, sel) {
    const ok = !!doc.querySelector(sel);
    console.log('  ' + (ok ? 'ok  ' : '!!  ') + label + '  (' + sel + ')');
    if (!ok) fails++;
    return ok;
  }
  function count(label, sel, min) {
    const n = doc.querySelectorAll(sel).length;
    const ok = n >= min;
    console.log('  ' + (ok ? 'ok  ' : '!!  ') + label + '  (' + n + ' × ' + sel + ')');
    if (!ok) fails++;
    return n;
  }
  function drainErrors(where) {
    if (!errs.length) return;
    for (const m of errs) {
      console.log('  !! error during ' + where + ': ' + m.split('\n').slice(0, 3).join(' | '));
      fails++;
    }
    errs.length = 0;
  }

  /* ---- 1 · assistant: a known question routes then answers ---- */
  console.log('\n· assistant — a known question');
  App.state.insight = null;
  nav('insights');
  const box1 = doc.getElementById('ai-q');
  if (!box1) { console.log('  !! no #ai-q input'); fails++; }
  else {
    /* In the closed set FR-65 defines, and phrased the way a seller would ask it. The
       earlier value here was "এ মাসে লাভ কত" — how much profit this month — which is not
       one of the ten, so this test claimed to route a known question and did not. */
    box1.value = 'গত মাসের চেয়ে লাভ কমল কেন';
    click('[data-act="ai-ask"]');
    expect('shows the routing state', '.ai-answer.routing');
    expect('shows the animated dots', '.ai-dot');
    await sleep(1200);
    expect('lands on an answer', '.ai-answer:not(.routing):not(.refused)');
    expect('the answer is prose, not a bare figure', 'p.ai-text');
    expect('the answer says it was routed', '.ai-answer .chip.violet');
    console.log('  state: ' + App.state.insight.state + ' → ' + App.state.insight.query);
    if (App.state.insight.state !== 'answered') fails++;
  }
  drainErrors('known question');

  /* ---- 2 · assistant: an out-of-set question is refused ---- */
  console.log('\n· assistant — a question outside the closed set');
  App.state.insight = null;
  nav('insights');
  doc.getElementById('ai-q').value = 'আজ ঢাকায় বৃষ্টি হবে কি';
  click('[data-act="ai-ask"]');
  await sleep(1200);
  expect('refuses rather than inventing', '.ai-answer.refused');
  console.log('  state: ' + App.state.insight.state);
  if (App.state.insight.state !== 'refused') fails++;
  drainErrors('refusal');

  /* ---- 2b · assistant: a known question whose answer this Role may not read ----
     The third outcome, and the one that only exists because §6.2 grants the Ask capability
     to Roles that may not see money. It must not look like the refusal above: the question
     WAS understood, and telling a Packer "that is not one of the ten" about a question that
     plainly is would be a lie about the product's own closed set. */
  console.log('\n· assistant — a known question a gated Role may not be answered');
  App.role = 'packer'; doc.body.dataset.role = 'packer';
  App.state.insight = null;
  nav('insights');
  doc.getElementById('ai-q').value = 'কুরিয়ারের কাছে কত টাকা আটকে আছে';
  click('[data-act="ai-ask"]');
  await sleep(1200);
  console.log('  state: ' + App.state.insight.state + ' → ' + App.state.insight.query);
  if (App.state.insight.state !== 'gated' || App.state.insight.query !== 'q7') fails++;
  expect('withholds the answer in the refusal frame', '.ai-answer.refused');
  if (/৳/.test(doc.getElementById('app').textContent)) { console.log('  !! a taka mark reached a gated Role'); fails++; }
  else console.log('  ok  no taka mark anywhere on the screen');
  App.role = 'owner'; doc.body.dataset.role = 'owner';
  drainErrors('gated answer');

  /* ---- 3 · voice dictation ----
     Scoped to .mic-btn deliberately: once a transcript exists the screen also
     renders a "say it again" button carrying the same action. */
  console.log('\n· voice dictation');
  App.state.voice = null;
  nav('capture/voice');
  click('.mic-btn[data-act="voice-toggle"]');
  expect('the stage goes live', '.mic-stage.is-live');
  expect('ripple rings appear', '.mic-stage.is-live .pulse.d');
  await sleep(2600);
  expect('a transcript appears', '.dictated');
  const txt = (doc.querySelector('.dictated') || {}).textContent || '';
  console.log('  transcript: "' + txt.trim().slice(0, 60) + '"');
  if (!txt.trim()) fails++;
  drainErrors('voice');

  /* ---- 4 · the variant matrix, all three levels ----
     P-101 is a 4×4. The screen opens on the slice list (a 4×4 grid does not fit
     a phone), offers the whole grid as an explicit toggle, and drills into one
     colour for editing. */
  console.log('\n· variant matrix — slice list, whole grid, one slice');
  App.state.matrix = null;
  nav('product/P-101/variants');
  count('opens on the slice list', '.slice-row', 4);
  expect('the drill-order control is offered', '.matrix-ctl [data-act="matrix-axis"]');

  click('[data-act="matrix-grid"]');
  expect('the whole grid renders', '.matrix-tbl');
  count('every combination has a cell', '.matrix-tbl .cell', 16);
  expect('out-of-stock cells are marked', '.matrix-tbl .cell.zero');
  expect('low-stock cells are marked', '.matrix-tbl .cell.low');
  expect('inactive cells are marked', '.matrix-tbl .cell.off');
  expect('a price override carries its dot', '.matrix-tbl .cell .dot');
  expect('the grid explains its own colours', '.grid-legend .sw');

  click('[data-act="matrix-grid"]');
  expect('toggling returns to the slice list', '.slice-row');

  click('[data-act="matrix-slice"][data-arg="অফ-হোয়াইট"]');
  count('the slice lists every size', '.vrow', 4);
  expect('a colour can be priced in one move', '.bulk-bar [data-act="bulk-price"]');
  expect('stock is adjustable per variant', '.vrow .qty-stepper [data-act="vstock"]');
  expect('an overridden price is marked', '.vr-price.is-over');
  drainErrors('variant matrix');

  /* ---- 5 · quick-add grid: tapping accumulates a count ---- */
  console.log('\n· quick-add grid');
  App.state.quick = null;
  nav('capture/quick');
  const tiles = count('every sellable variant is a tile', '.qa-tile', 20);
  click('.qa-tile');
  expect('tapping marks the tile with a count', '.qa-tile.is-on .qa-badge');
  click('.qa-tile');
  const badge = (doc.querySelector('.qa-badge') || {}).textContent || '';
  console.log('  ' + (badge.trim() === App.n(2) ? 'ok  ' : '!!  ') +
    'tapping again increments  (badge "' + badge.trim() + '")');
  if (badge.trim() !== App.n(2)) fails++;
  expect('a running total appears once something is picked', '.sticky-foot');
  drainErrors('quick-add');

  /* ---- 6 · paste flow: an unstated variant is asked for, never guessed ----
     The demo message states both axes, so it parses clean. This message names
     the colour but not the size — exactly the case the picker exists for. */
  console.log('\n· paste flow — the picker for an unstated variant');
  App.state.paste = null;
  nav('capture/paste');
  const box = doc.getElementById('paste-box');
  if (!box) { console.log('  !! no #paste-box'); fails++; }
  else {
    box.value = 'আপা এই কালো কুর্তিটা লাগবে ১টা\nনাম: ফারজানা আক্তার\n01711234567\n' +
                'হাউস ৩২, রোড ৭, সেক্টর ৪, উত্তরা, ঢাকা';
    click('[data-act="paste-parse"]');
    const items = (App.state.parsed && App.state.parsed.items) || [];
    console.log('  parsed items: ' + items.map((i) => i.p + ' ' + i.v +
      (i.incomplete ? ' (incomplete)' : '')).join(', '));
    if (!items.some((i) => i.incomplete)) {
      console.log('  !! no incomplete item — the picker cannot be reached'); fails++;
    }
    expect('the gap is surfaced, not guessed', '[data-act="pick-variant"]');
    click('[data-act="pick-variant"]');
    expect('a picker sheet opens', '.sheet');
    count('every value on the missing axis is offered', '.sheet .pick-tile', 4);
    click('.sheet .pick-tile');
    expect('choosing confirms with a toast', '.toast');
    const after = (App.state.parsed.items || []).filter((i) => i.incomplete).length;
    console.log('  ' + (after === 0 ? 'ok  ' : '!!  ') +
      'the item is now complete  (' + after + ' still incomplete)');
    if (after !== 0) fails++;
  }
  drainErrors('variant picker');

  /* ---- 6b · a detail named for one product must not land on another ----
     The scanner used to sweep the whole message per axis and keep the last hit,
     so the pink dupatta came out black: the kurti's কালো appears later in the
     text. Nothing on screen looks wrong — the item shows a variant and the
     count says 2 matched — which is exactly why this needs an assertion. */
  console.log('\n· parsed details come from the item they belong to');
  App.state.paste = null;
  App.state.parsed = null;
  nav('capture/paste');
  {
    const b2 = doc.getElementById('paste-box');
    b2.value = 'আপা এই কালো কুর্তিটা M সাইজ লাগবে ১টা আর গোলাপি সিল্ক ওড়না ২টা দিয়েন\n' +
               'নাম: ফারজানা আক্তার\n01711234567\nহাউস ৩২, রোড ৭, সেক্টর ৪, উত্তরা, ঢাকা';
    click('[data-act="paste-parse"]');
    const items = (App.state.parsed && App.state.parsed.items) || [];
    const byName = {};
    items.forEach((i) => { byName[App.get.product(i.p).nameEn] = i; });
    console.log('  parsed: ' + items.map((i) =>
      App.get.product(i.p).nameEn + ' = ' + i.v + ' ×' + i.qty).join(' | '));
    [['the kurti keeps its own colour and size', 'Embroidered Kurti', 'কালো|M', 1],
     ['the dupatta is pink, not the kurti\'s black', 'Silk Dupatta', 'গোলাপি', 2],
    ].forEach(([label, name, v, qty]) => {
      const it = byName[name];
      const ok = !!it && it.v === v && it.qty === qty;
      console.log('  ' + (ok ? 'ok  ' : '!!  ') + label +
        (ok ? '' : '  (got ' + (it ? it.v + ' ×' + it.qty : 'no item') +
                    ', wanted ' + v + ' ×' + qty + ')'));
      if (!ok) fails++;
    });
  }
  drainErrors('per-item parse scoping');

  /* ---- 7 · settlement: resolving a variance moves the run ---- */
  /* The match screen prints declaredTotal, subtracts the matched rows and calls
     the remainder unmatched. If declaredTotal drifts from the sum of the rows,
     that headline stops being traceable to anything on screen — and no render or
     click test can see it, because the figure still renders perfectly. */
  /* The completeness sheet claims the gap between have and of is courier custody.
     That claim is only true while the recognition maps make shipped the one
     excluded status — so assert it rather than trusting the copy. */
  console.log('\n· completeness sheet explains its own gap');
  {
    const s = App.summary();
    const gap = s.completeness.of - s.completeness.have;
    const shipped = App.orders.filter((o) => o.status === 'shipped').length;
    const ok = gap === shipped && gap > 0;
    console.log('  ' + (ok ? 'ok  ' : '!!  ') + 'the gap is exactly the shipped orders  (' +
      gap + ' vs ' + shipped + ')');
    if (!ok) fails++;
    nav('home');
    click('[data-act="completeness-why"]');
    count('every cause is shown', '.sheet .card.pad', 3);
    count('causes are split into two groups', '.sheet .stack > .eyebrow', 2);
    click('[data-act="close-sheet"]');
  }

  /* A history that runs backwards is invisible to a render test — every row
     draws perfectly. Check every order, not just the one the index links to. */
  console.log('\n· every order timeline runs forwards');
  {
    let bad = 0;
    const steps = ['confirmed', 'packed', 'shipped', 'delivered', 'settled'];
    for (const o of App.orders) {
      let prev = Date.parse(o.placed.replace(' ', 'T'));
      for (const s of steps) {
        const t = Date.parse(App.stepTime(o.placed, s).replace(' ', 'T'));
        if (!(t > prev)) {
          console.log('  !! ' + o.id + ': ' + s + ' is not after the step before it');
          bad++;
        }
        prev = t;
      }
      nav('order/' + o.id + '/timeline');
      if (!doc.querySelector('.tl-item')) {
        console.log('  !! ' + o.id + ' rendered no timeline'); bad++;
      }
    }
    console.log('  ' + (bad === 0 ? 'ok  ' : '!!  ') + 'every step follows the one before it  (' +
      App.orders.length + ' orders)');
    if (bad) fails++;
  }

  console.log('\n· settlement figures reconcile');
  {
    const rows = App.settlementRun.rows;
    const sum = (rs) => rs.reduce((t, r) => t + r.net, 0);
    const declared = App.settlementRun.declaredTotal;
    const matched = sum(rows.filter((r) => r.state === 'matched'));
    const rest = sum(rows.filter((r) => r.state !== 'matched'));
    const checks = [
      ['declared total equals the sum of its rows', declared, sum(rows)],
      ['declared minus matched equals the unresolved rows', declared - matched, rest],
    ];
    for (const [label, a, b] of checks) {
      const ok = a === b;
      console.log('  ' + (ok ? 'ok  ' : '!!  ') + label + '  (' + a + ' vs ' + b + ')');
      if (!ok) fails++;
    }
  }

  console.log('\n· settlement variance disposition');
  const row = App.settlementRun.rows.find((r) => r.state === 'short');
  console.log('  target row: ' + row.cn + ' state=' + row.state);
  nav('settlement/STL-0831/' + row.cn);
  count('disposition options are offered', '.disp-card', 2);
  count('each option states its effect', '.dc-eff', 2);
  click('.disp-card');
  expect('a confirm sheet opens', '.sheet');
  const saveBtn = doc.querySelector('.sheet [data-act="disposition-save"]');
  if (!saveBtn) { console.log('  !! no save control in the sheet'); fails++; }
  else {
    saveBtn.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
    console.log('  row state after save: ' + row.state);
    if (row.state === 'short') { console.log('  !! the row did not move'); fails++; }
    expect('a toast confirms', '.toast');
  }
  drainErrors('disposition');

  console.log(fails === 0 ? '\nPASS — all flows behave' : '\nFAIL — ' + fails + ' problem(s)');
  process.exit(fails === 0 ? 0 : 1);
})();
