/* The invariants no render test can see. smoke.js proves nothing threw, classes.js
   proves every class is styled, flows.js proves a multi-step beat completes — and all
   three pass while a figure is wrong, while a gated Role reads the profit, and while a
   Bangla screen prints Latin digits. Those three claims are this harness's whole job.

   Two rules it holds to deliberately:

   - The recognition rule and the profit formula are written out HERE as the
     specification, not imported from data.js. A test that reads the same map the
     product reads cannot notice the map changing. Flipping EARNED or dropping a
     component from profit must fail here, and that only works if this file states
     independently what the answer should be.
   - Gating is asserted by ABSENCE over every route, not by presence of a lock on the
     one route someone remembered. The leak this harness was written for lived on a
     Role-adaptive screen that carried no `money` flag, so no per-screen check saw it. */
const { boot } = require('./boot');

/* the specification, restated — PRD §5 recognition and FR-58 */
const EARNED_STATUSES = ['delivered', 'partial', 'settled'];
const REALIZED_STATUSES = ['settled'];
const PIPELINE_STATUSES = ['new', 'confirmed', 'packed'];

/* Latin digits are legitimate in a Bangla view only where the string is an identifier
   or a foreign artefact: a record id, a phone number, a filename, a URL, or a cell
   copied verbatim out of the seller's own spreadsheet. Everything else is a defect. */
const LATIN_OK = [
  /\b[A-Z]{1,3}-[0-9A-Za-z-]+/g,                            // record ids, consignments
  /#[0-9]+/g,                                               // short order references
  /১২৩ নাকি 123/g,                                          // the digit-form toggle shows both by design
  /\b01[0-9-]{8,}/g,                                        // BD phone numbers
  /[\w.-]+\.(?:csv|xlsx|pdf|png|jpg)\b/gi,                  // filenames
  /\b[\w.-]+\.(?:com|net|org|bd)(?:\/\S*)?/gi,              // urls / page handles
  /\bv?[0-9]+\.[0-9]+\b/g,                                  // version strings
  /\b[0-9]{4}-[0-9]{2}-[0-9]{2}\b/g                         // iso dates in raw data
];

/* Role is not established until sign-in, so onboarding carries no Role to gate. */
const PRE_LOGIN = /^(splash|signin|register|recovery|setup|invite)/;

/* The pack slip is the spine's one deliberate exception: Inventory Staff must read the
   amount to collect at the door, so the slip carries a figure by design. */
const SLIP = /\/slip$/;

(async () => {
  const { window, App, doc } = await boot();
  let fails = 0;
  const nav = (r) => { window.location.hash = '#/' + r; App.render(); };
  const text = () => doc.getElementById('app').textContent;

  function check(label, actual, expected) {
    const ok = actual === expected;
    console.log('  ' + (ok ? 'ok  ' : '!!  ') + label +
      (ok ? '' : '   expected ' + expected + ', got ' + actual));
    if (!ok) fails++;
    return ok;
  }
  function assert(label, cond, detail) {
    console.log('  ' + (cond ? 'ok  ' : '!!  ') + label + (cond ? '' : '   ' + (detail || '')));
    if (!cond) fails++;
    return cond;
  }

  const routes = App.SCREEN_INDEX.filter((r) => r[1]).map((r) => r[1]);
  const sum = (xs) => xs.reduce((t, x) => t + x, 0);
  const profitOf = (st) => sum(App.orders.filter((o) => st.indexOf(o.status) > -1).map((o) => App.econ(o).profit));
  const collectOf = (st) => sum(App.orders.filter((o) => st.indexOf(o.status) > -1).map((o) => App.econ(o).collect));
  const countOf = (st) => App.orders.filter((o) => st.indexOf(o.status) > -1).length;

  /* ---------------------------------------------- 1. econ() is internally exact */
  console.log('\n· every order\'s profit is its components, with nothing dropped');
  let bad = [];
  for (const o of App.orders) {
    const e = App.econ(o);
    const expect = e.net - e.cogs - e.courierFee - e.codFee - e.pack - e.returnLoss;
    if (e.profit !== expect) bad.push(o.id + ': ' + e.profit + ' ≠ ' + expect);
  }
  assert('profit = net − cogs − courierFee − codFee − pack − returnLoss, for all ' +
    App.orders.length + ' orders', bad.length === 0, bad.join('; '));

  /* The identity above recomputes from econ()'s own fields, so it holds even when a
     component carries the wrong sign — flip returnLoss and both sides move together.
     Direction is a separate claim: a cost is a cost, and a damaged return is a loss. */
  const NEVER_NEGATIVE = ['net', 'collect', 'cogs', 'courierFee', 'codFee', 'pack', 'returnLoss'];
  const wrongWay = [];
  for (const o of App.orders) {
    const e = App.econ(o);
    for (const k of NEVER_NEGATIVE) if (e[k] < 0) wrongWay.push(o.id + '.' + k + ' = ' + e[k]);
  }
  assert('no cost or loss is negative — ' + NEVER_NEGATIVE.join(', '),
    wrongWay.length === 0, wrongWay.join('; '));

  /* ------------------------------------- 2. every headline is the sum of its rows */
  console.log('\n· every dashboard headline recomputes from the orders beneath it');
  const s = App.summary();
  check('earnedProfit = Σ profit of delivered/partial/settled', s.earnedProfit, profitOf(EARNED_STATUSES));
  check('realizedProfit = Σ profit of settled', s.realizedProfit, profitOf(REALIZED_STATUSES));
  check('custody = Σ collect of shipped', s.custody, collectOf(['shipped']));
  check('pipeline = Σ collect of new/confirmed/packed', s.pipeline, collectOf(PIPELINE_STATUSES));
  check('expenses = Σ expense amounts', s.expenses, sum(App.expenses.map((e) => e.amount)));
  check('dues = Σ due amounts', s.dues, sum(App.dues.map((d) => d.amount)));
  check('payable = Σ supplier payables', s.payable, sum(App.suppliers.map((x) => x.payable)));
  assert('earned ≥ realized — money cannot be collected before it is earned',
    s.earnedProfit >= s.realizedProfit, s.earnedProfit + ' < ' + s.realizedProfit);

  /* The Completeness Indicator's gap is *exactly* the shipped orders — EXPERIENCE.md
     states it as a number, so it is checkable as one. */
  check('completeness.have = count of earned orders', s.completeness.have, countOf(EARNED_STATUSES));
  check('completeness.of − have = the shipped count, exactly',
    s.completeness.of - s.completeness.have, countOf(['shipped']));

  /* --------------------------------- 3. gated Roles: absence, over every route */
  console.log('\n· a gated Role reaches no money figure on any route');
  const figures = [s.earnedProfit, s.realizedProfit, s.custody, s.pipeline, s.expenses, s.dues, s.payable];
  const moneyRoutes = new Set(Object.keys(App.screens).filter((k) => App.screens[k].money));
  for (const role of ['sales', 'inventory']) {
    App.role = role; doc.body.dataset.role = role;
    const leaks = [], reach = [], marks = [];
    for (const r of routes) {
      if (PRE_LOGIN.test(r)) continue;
      nav(r);
      const t = text();
      for (const f of figures) {
        if (f && t.includes(App.n(f))) leaks.push('#/' + r + ' shows ' + f);
      }
      /* a currency mark followed by a digit is a figure; a bare prefix on an empty
         input is not, which is why the digit is part of the test */
      if (role === 'inventory' && !SLIP.test(r) && doc.querySelector('.econ')) marks.push('#/' + r);
      for (const el of doc.querySelectorAll('[data-go]')) {
        const dest = el.getAttribute('data-go').split('/')[0];
        if (moneyRoutes.has(dest)) reach.push('#/' + r + ' → ' + dest);
      }
    }
    assert(role + ' sees no computed money figure anywhere', leaks.length === 0, leaks.slice(0, 6).join('; '));
    assert(role + ' is offered no destination into a money screen', reach.length === 0, reach.slice(0, 6).join('; '));
    if (role === 'inventory') {
      assert('Inventory Staff sees no unit-economics panel', marks.length === 0, marks.slice(0, 6).join(', '));
    }
  }
  App.role = 'owner'; doc.body.dataset.role = 'owner';

  /* ------------------------- 3b. the rows of §6.2 that no money level can express */
  console.log('\n· the Role model matches PRD §6.2 where the matrix names Roles outright');
  /* Written out from the PRD, not read off App.screens — the screen is what is on trial.
     Both rows below were wrong in the prototype and passed every test in this file, because
     the only Role rule asserted anywhere was "may this Role see money", and §6.2 has rows
     that are not about money at all. */
  const CAN_AUDIT = { owner: true, manager: false, accountant: true, inventory: false, sales: false };
  const CAN_CAPTURE = { owner: true, manager: true, accountant: false, inventory: false, sales: true };
  const CAN_ASK = {
    owner: ['q1','q2','q3','q4','q5','q6','q7','q8','q9','q10'],
    manager: ['q1','q2','q3','q4','q5','q6','q7','q8','q9','q10'],
    accountant: ['q1','q2','q3','q4','q5','q6','q7','q8','q9','q10'],
    inventory: ['q3','q8'],
    sales: ['q1','q3','q4','q8']
  };
  for (const role of Object.keys(CAN_AUDIT)) {
    App.role = role; doc.body.dataset.role = role;
    assert(role + (CAN_AUDIT[role] ? ' reaches' : ' is refused') + ' the audit trail',
      App.canReach('audit') === CAN_AUDIT[role]);
    assert(role + (CAN_CAPTURE[role] ? ' reaches' : ' is refused') + ' Order capture',
      App.canReach('capture') === CAN_CAPTURE[role]);
    /* `Ask Insight Queries | Yes | Yes | Yes | Yes | Yes` — every Role may ask. What a Role
       may be TOLD is the closed set filtered by the money its answer carries. */
    assert(role + ' may open Ask SmartBiz', App.canReach('insights'));
    const offered = App.askableQueries().map((q) => q.id);
    assert(role + ' is offered the exact permitted Insight Queries',
      offered.join(',') === CAN_ASK[role].join(','), 'got ' + offered.join(','));
  }

  /* A filtered list must not renumber itself. The seller and the Owner have to be able to
     say "query 8" and mean the same question, so the lead number is the position in FR-65's
     closed set — Inventory Staff read 3 and 8, never a renumbered 1 and 2. */
  App.role = 'inventory'; doc.body.dataset.role = 'inventory';
  App.state.insight = {};
  nav('insights');
  const leads = [...doc.querySelectorAll('.card.flush .list-item .lead')].map((e) => e.textContent.trim());
  /* through App.n, because this runs before the language flip below and a Bangla view
     numbers its rows ৩ and ৮ — the claim is about which queries, not about the script */
  assert('Inventory Staff queries keep their numbers in the closed set',
    leads.join(',') === [3, 8].map((q) => App.n(q)).join(','), leads.join(','));
  App.actions['ai-run']('q4');
  assert('Inventory Staff receives the Role-withheld state for the Customer query',
    App.state.insight.state === 'gated' && !!doc.querySelector('.ai-answer.refused'));
  /* asserted as an element rather than as prose for the same reason */
  assert('Inventory Staff is told why the list is short',
    !!doc.querySelector('.provenance.brass'));
  App.role = 'owner'; doc.body.dataset.role = 'owner';

  /* Gating is by absence, but the owner must still get there — a gate that hides the
     surface from everyone passes the absence test and fails the product. */
  nav('home');
  assert('the owner still reaches the audit trail', !!doc.querySelector('[data-go="audit"]'));
  assert('the owner still reaches the daily card', !!doc.querySelector('[data-go="home/summary"]'));

  /* -------------------------------------- 4. no Latin digit in a Bangla view */
  console.log('\n· Bangla views render Bangla digits');
  App.lang = 'bn'; doc.body.dataset.lang = 'bn';
  const latin = [];
  for (const r of routes) {
    /* the import screens show cells copied out of the seller's own spreadsheet,
       which are source data and must be shown exactly as they arrived */
    if (r.indexOf('capture/import') === 0 || r.indexOf('settlement/import') === 0) continue;
    nav(r);
    const walk = doc.getElementById('app').querySelectorAll('*');
    for (const el of walk) {
      for (const node of el.childNodes) {
        if (node.nodeType !== 3) continue;
        let probe = node.textContent;
        if (!/[0-9]/.test(probe)) continue;
        for (const re of LATIN_OK) probe = probe.replace(re, '');
        if (/[0-9]/.test(probe)) latin.push('#/' + r + ': "' + node.textContent.trim().slice(0, 44) + '"');
      }
    }
  }
  assert('no Latin digit in any Bangla screen (' + routes.length + ' routes swept)',
    latin.length === 0, latin.slice(0, 8).join('  |  '));

  /* ------------------------- 5. an assistant answer may not invent its caveat */
  console.log('\n· no assistant answer claims a completeness it does not have');
  const QUERY_IDS = ['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8', 'q9', 'q10'];

  /* A pill checked against itself proves nothing: an invented "1 of 1" is perfectly
     self-consistent and still lies. The caveat has to be checked against the figure it
     qualifies — an answer that states a dashboard headline inherits the dashboard's gap,
     and an answer scoped to a collection it holds whole may claim to be complete.

     The gap is a property of recognition over ORDERS, so only order-derived figures
     inherit it. Expenses and Dues are their own collections, held whole. */
  const ORDER_FIGURES = [s.earnedProfit, s.realizedProfit, s.custody, s.pipeline,
    s.earnedProfit - s.realizedProfit];

  /* Ten questions that share an answer are not ten queries. Four of these ids once fell
     through to a common tail, so "what is running out of stock?" replied with a best
     seller — every assertion in the loop below passed on that, because a borrowed answer
     is internally consistent. Distinctness is the only thing that catches it. */
  const prose = new Map();
  for (const id of QUERY_IDS) prose.set(id, App.answerFor(id).en);
  const shared = QUERY_IDS.filter((id) =>
    QUERY_IDS.some((other) => other !== id && prose.get(other) === prose.get(id)));
  assert('each of the ten answers its own question', shared.length === 0,
    shared.join(', ') + ' share one answer');

  for (const id of QUERY_IDS) {
    const a = App.answerFor(id);
    assert(id + ' declares a legal Recognition Basis',
      a.basis === 'earned' || a.basis === 'realized', 'basis=' + a.basis);
    assert(id + '\'s completeness counts are sane',
      Number.isInteger(a.complete.have) && Number.isInteger(a.complete.of) &&
      a.complete.have >= 0 && a.complete.have <= a.complete.of && a.complete.of > 0,
      JSON.stringify(a.complete));
    if ((a.figures || []).some((f) => ORDER_FIGURES.indexOf(f[1]) > -1)) {
      assert(id + ' states a dashboard figure, so it carries the dashboard\'s caveat',
        a.complete.have === s.completeness.have && a.complete.of === s.completeness.of,
        JSON.stringify(a.complete) + ' ≠ ' + JSON.stringify(s.completeness));
    }

    App.state.insight = { state: 'answered', query: id };
    nav('insights');
    const pill = doc.querySelector('.completeness');
    if (!pill) continue;                       // not every answer renders the pill
    const nums = pill.textContent.match(/[0-9০-৯]+/g) || [];
    assert(id + ' renders the counts it was given',
      nums.length >= 2 && nums[0] === App.n(a.complete.have) && nums[1] === App.n(a.complete.of),
      'pill="' + pill.textContent.trim().replace(/\s+/g, ' ') + '"');
    assert(id + ' claims complete only with no gap',
      pill.classList.contains('full') === (a.complete.have === a.complete.of),
      'pill="' + pill.textContent.trim().replace(/\s+/g, ' ') + '"');
  }
  App.state.insight = null;

  /* The custody answer states a parcel count beside a taka figure; both are counted
     from the same orders, so they cannot disagree with the screen that shows them.
     q7 is Money With Couriers in FR-65's ordering. The id is written out rather than
     searched for, and that is the point: if the ten are renumbered again, the parcel
     assertion below fails loudly instead of quietly checking a different query. */
  App.lang = 'en'; doc.body.dataset.lang = 'en';
  App.state.insight = { state: 'answered', query: 'q7' };
  nav('insights');
  const shipped = countOf(['shipped']);
  const ans = text();
  const parcelCount = new RegExp('(?<![0-9০-৯])' + shipped + ' parcels?\\b');
  assert('the custody answer states the real parcel count (' + shipped + ')',
    parcelCount.test(ans), (ans.match(/sits with couriers.{0,40}/) || [''])[0]);

  /* Read the element, not the page. In flat textContent the custody figure runs
     straight into the count beneath it — "৳4,020" + "2 parcels" reads as
     "৳4,0202 parcels" — so a page-level regex can neither find nor trust it. */
  nav('cod');
  const subs = [...doc.querySelectorAll('.cell-sub')].map((e) => e.textContent.trim());
  assert('the COD screen states the same parcel count',
    subs.some((x) => parcelCount.test(x)), subs.join(' / '));
  App.state.insight = null;

  /* ---------------- 6. the settlement panel tracks its rows, not a literal */
  console.log('\n· the settlement panel figure follows a disposition');
  const matchedNet = () => sum(App.settlementRun.rows.filter((r) => r.state === 'matched').map((r) => r.net));
  const heldNet = () => sum(App.settlementRun.rows.filter((r) => r.state !== 'matched').map((r) => r.net));
  const panel = () => (doc.querySelectorAll('.fig-table .fig-row')[0] || { textContent: '' }).textContent;

  nav('settlement/STL-0831');
  const before = matchedNet();
  assert('panel states the reconciled total before disposition (' + before + ')',
    panel().includes(App.n(before)), 'panel="' + panel().replace(/\s+/g, ' ').trim() + '"');

  const row = App.settlementRun.rows.find((r) => r.state === 'short');
  nav('settlement/STL-0831/' + row.cn);
  const card = doc.querySelector('.disp-card');
  if (!card) { console.log('  !! no disposition option to click'); fails++; }
  else {
    card.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
    const save = doc.querySelector('.sheet [data-act="disposition-save"]');
    save.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
    assert('the row left the short state', row.state !== 'short');
    nav('settlement/STL-0831');
    const after = matchedNet();
    assert('the reconciled total actually moved', after !== before, before + ' → ' + after);
    assert('panel states the new reconciled total (' + after + '), not the old one',
      panel().includes(App.n(after)) && !panel().includes(App.n(before)),
      'panel="' + panel().replace(/\s+/g, ' ').trim() + '"');
    check('reconciled + held = the declared total', matchedNet() + heldNet(), App.settlementRun.declaredTotal);
  }

  console.log(fails === 0
    ? '\nPASS — arithmetic, gating and numerals hold'
    : '\nFAIL — ' + fails + ' problem(s)');
  process.exit(fails === 0 ? 0 : 1);
})();
