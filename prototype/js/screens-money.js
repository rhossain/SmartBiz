/* SmartBiz BD — courier custody, settlement reconciliation, expenses, dues,
   suppliers, reports.

   Settlement is where the product earns its keep. A payout file arrives, some
   rows match, some do not, and the seller has to decide what each mismatch
   *means* — not just acknowledge it. Every disposition on the variance screen
   states what it does to the two profit figures before it is chosen. */

(function (App) {
  'use strict';

  var L = App.L, n = App.n, tk = App.tk, I = App.I, U = App.ui, esc = App.esc;

  /* ================================================== COURIER & COD ===== */

  App.screens.cod = {
    money: true,
    title: function () { return L('কুরিয়ার ও COD', 'Courier & COD'); },
    view: function (args) {
      if (args[0]) return consignment(args[0]);

      var s = App.summary();
      var inflight = App.orders.filter(function (o) { return o.status === 'shipped'; });
      var awaiting = App.orders.filter(function (o) { return o.status === 'delivered'; });

      var byCourier = {};
      App.orders.forEach(function (o) {
        if (o.status !== 'shipped' && o.status !== 'delivered') return;
        var e = App.econ(o);
        byCourier[o.courier] = byCourier[o.courier] || { custody: 0, count: 0 };
        byCourier[o.courier].custody += e.collect;
        byCourier[o.courier].count++;
      });

      var body = '<div class="stack g4">' +
        '<div class="card pad custody-hero">' +
          '<span class="eyebrow">' + L('এখন কুরিয়ারের হাতে আছে', 'Held by couriers right now') + '</span>' +
          '<span class="money big amber">' + tk(s.custody + awaitingTotal()) + '</span>' +
          '<span class="hero-note">' + L('এই টাকা আপনার, কিন্তু আপনার হাতে নেই। নিষ্পত্তি হলে হাতে আসবে।',
            'This money is yours but not with you. It arrives when the courier settles.') + '</span>' +
          '<div class="split2">' +
            '<div><span class="eyebrow">' + L('পথে আছে', 'In transit') + '</span>' +
            '<span class="money mid">' + tk(s.custody) + '</span>' +
            '<span class="cell-sub">' + App.unit(inflight.length, ' পার্সেল', 'parcel', 'parcels') + '</span></div>' +
            '<div><span class="eyebrow">' + L('ডেলিভারি হয়েছে, টাকা আসেনি', 'Delivered, unpaid') + '</span>' +
            '<span class="money mid">' + tk(awaitingTotal()) + '</span>' +
            '<span class="cell-sub">' + App.unit(awaiting.length, ' পার্সেল', 'parcel', 'parcels') + '</span></div>' +
          '</div></div>';

      var openRows = App.settlementRun.rows.filter(function (r) { return r.state !== 'matched'; }).length;
      if (openRows) {
        var runCourier = App.get.courier(App.settlementRun.courier);
        body += '<button class="alert-row" data-go="settlement/' + App.settlementRun.id + '">' +
          '<span class="ar-ic red">' + I.warn(18) + '</span>' +
          '<span class="ar-body"><b>' + L(n(openRows) + 'টি অমিল সমাধান বাকি',
            n(openRows) + ' variances need a decision') + '</b>' +
          '<span>' + App.settlementRun.id + ' · ' + esc(L(runCourier.name, runCourier.nameEn)) +
          ' · ' + App.ago(App.settlementRun.received) + '</span></span>' +
          '<span class="chev">' + I.chev(16) + '</span></button>';
      }

      body += '<div class="card flush"><div class="card-head"><h3>' + L('কুরিয়ার অনুযায়ী', 'By courier') + '</h3></div>' +
        Object.keys(byCourier).map(function (cid) {
          var c = App.get.courier(cid);
          var d = byCourier[cid];
          return '<div class="list-item"><span class="lead teal">' + I.truck(17) + '</span>' +
            '<span class="body"><b>' + esc(L(c.name, c.nameEn)) +
            (c.simulated ? ' <i class="chip teal sm">' + L('সিমুলেটেড', 'simulated') + '</i>' : '') + '</b>' +
            '<span>' + App.unit(d.count, ' পার্সেল', 'parcel', 'parcels') + ' · ' + L('ফি ', 'fee ') + App.tkPlain(c.fee) +
            ' · COD ' + n(c.codPct, 1) + '%</span></span>' +
            '<span class="trail"><span class="money amber">' + tk(d.custody) + '</span>' +
            '<span>' + L('হাতে নেই', 'not yours yet') + '</span></span></div>';
        }).join('') + '</div>';

      body += '<div class="card flush"><div class="card-head"><h3>' + L('পথে থাকা পার্সেল', 'Parcels in flight') + '</h3>' +
        '<span class="chip amber sm">' + n(inflight.length + awaiting.length) + '</span></div>' +
        inflight.concat(awaiting).map(function (o) {
          var c = App.get.customer(o.cust);
          var e = App.econ(o);
          return '<button class="list-item" data-go="cod/' + (o.consignment || o.id) + '">' +
            '<span class="lead ' + (o.status === 'delivered' ? 'green' : 'amber') + '">' + I.truck(17) + '</span>' +
            '<span class="body"><b>' + esc(o.consignment || o.id) + '</b>' +
            '<span>' + esc(L(c.name, c.nameEn)) + ' · ' + L(App.STATUS[o.status].bn, App.STATUS[o.status].en) + '</span></span>' +
            '<span class="trail"><span class="money">' + tk(e.collect) + '</span></span>' +
            '<span class="chev">' + I.chev(16) + '</span></button>';
        }).join('') + '</div>';

      body += '<button class="btn primary block" data-go="settlement">' + I.receipt(16) +
        L('নিষ্পত্তির হিসাব', 'Settlement runs') + '</button></div>';

      return { route: 'cod', nav: 'cod', noBack: true, title: L('কুরিয়ার ও COD', 'Courier & COD'),
        eyebrow: L('টাকা কোথায় আটকে আছে', 'Where the cash is sitting'), body: body };
    }
  };

  function awaitingTotal() {
    var t = 0;
    App.orders.forEach(function (o) { if (o.status === 'delivered') t += App.econ(o).collect; });
    return t;
  }

  function consignment(cn) {
    var o = App.orders.filter(function (x) { return x.consignment === cn || x.id === cn; })[0];
    if (!o) return notFound();
    var c = App.get.customer(o.cust);
    var e = App.econ(o);
    var courier = App.get.courier(o.courier);
    var row = App.settlementRun.rows.filter(function (r) { return r.cn === cn; })[0];

    return { route: 'cod', nav: 'cod', money: true, title: esc(cn),
      eyebrow: L('কনসাইনমেন্ট', 'Consignment'),
      body: '<div class="stack g4">' +
        '<div class="card pad"><div class="row">' + U.statusChip(o.status) +
        '<span class="spacer"></span><span class="chip outline sm">' + esc(L(courier.name, courier.nameEn)) + '</span></div>' +
        '<div class="dl-block" style="margin-top:var(--s4)"><dl class="dl">' +
        '<dt>' + L('অর্ডার', 'Order') + '</dt><dd><a data-go="order/' + o.id + '">' + o.id + '</a></dd>' +
        '<dt>' + L('ক্রেতা', 'Customer') + '</dt><dd>' + esc(L(c.name, c.nameEn)) + '</dd>' +
        '<dt>' + L('ক্রেতা যা দেবেন', 'Customer pays') + '</dt><dd>' + App.tkPlain(e.collect) + '</dd>' +
        '<dt>' + L('কুরিয়ার ফি', 'Courier fee') + '</dt><dd>' + App.tkPlain(e.courierFee) + '</dd>' +
        '<dt>' + L('COD ফি', 'COD fee') + '</dt><dd>' + App.tkPlain(e.codFee) + '</dd>' +
        '<dt>' + L('আপনার পাওয়া উচিত', 'You should receive') + '</dt><dd><b>' + App.tkPlain(e.collect - e.courierFee - e.codFee) + '</b></dd>' +
        '</dl></div></div>' +
        (row ? '<div class="card pad"><span class="eyebrow">' + L('নিষ্পত্তির ফাইলে', 'In the payout file') + '</span>' +
          '<div style="margin-top:var(--s3)">' + varianceBanner(row) + '</div>' +
          '<button class="btn ghost block sm" style="margin-top:var(--s3)" data-go="settlement/' + App.settlementRun.id + '/' + row.cn + '">' +
          L('অমিল দেখুন', 'Review the variance') + '</button></div>'
        : U.provenance(L('এই কনসাইনমেন্ট এখনো কোনো নিষ্পত্তির ফাইলে আসেনি — তাই টাকাটা এখনো “অর্জিত”, “হাতে পাওয়া” নয়।',
            'This consignment has not appeared in a payout file yet, so the money is earned but not realized.'), 'amber', I.info(15))) +
        '</div>' };
  }

  function varianceBanner(row) {
    var MAP = {
      matched:   { tone: 'green', bn: 'মিলেছে', en: 'Matched' },
      short:     { tone: 'red',   bn: 'কম এসেছে', en: 'Paid short' },
      unmatched: { tone: 'brass', bn: 'অর্ডার পাওয়া যায়নি', en: 'No matching order' },
      duplicate: { tone: 'amber', bn: 'দুইবার এসেছে', en: 'Duplicate row' },
      over:      { tone: 'teal',  bn: 'বেশি এসেছে', en: 'Paid over' }
    }[row.state];
    return U.provenance('<b>' + L(MAP.bn, MAP.en) + '</b> — ' + esc(L(row.why || '', row.whyEn || row.why || '')),
      MAP.tone, row.state === 'matched' ? I.check(15) : I.warn(15));
  }

  /* ================================================== SETTLEMENT ======== */

  App.screens.settlement = {
    money: true,
    title: function () { return L('নিষ্পত্তি', 'Settlement'); },
    view: function (args) {
      if (args[0] === 'import') return args[1] === 'map' ? settleMap() : settleImport();
      if (args[0] && args[1]) return variance(args[0], args[1]);
      if (args[0]) return matchReview(args[0]);

      var run = App.settlementRun;
      var open = run.rows.filter(function (r) { return r.state !== 'matched'; }).length;

      return { route: 'settlement', nav: 'cod', money: true, title: L('নিষ্পত্তি', 'Settlement runs'),
        eyebrow: L('কুরিয়ার যা পাঠিয়েছে বনাম যা পাওয়া উচিত', 'What the courier paid versus what was owed'),
        acts: '<button class="btn sm primary" data-go="settlement/import">' + I.plus(15) + L('ফাইল আনুন', 'Import') + '</button>',
        body: '<div class="stack g4">' +
          U.provenance(L('কুরিয়ার মাসে বা সপ্তাহে একবার টাকা পাঠায় আর সাথে একটা হিসাবের ফাইল দেয়। সেই ফাইল মিলিয়ে দেখলেই বোঝা যায় কোথায় কম পড়েছে — নাহলে ক্ষতিটা চোখেই পড়ে না।',
            'A courier pays out periodically with a statement. Matching that statement is the only way a short payment is ever noticed.'), 'teal') +
          '<button class="run-card is-open" data-go="settlement/' + run.id + '">' +
            '<div class="rc-head"><b>' + run.id + '</b>' +
            '<span class="chip red sm">' + n(open) + L(' টি অমিল', ' variances') + '</span></div>' +
            '<div class="rc-figs"><div><span class="eyebrow">' + L('ফাইলে বলা মোট', 'File total') + '</span>' +
            '<span class="money mid">' + tk(run.declaredTotal) + '</span></div>' +
            '<div><span class="eyebrow">' + L('মিলেছে', 'Reconciled') + '</span>' +
            '<span class="money mid green">' + tk(2543) + '</span></div></div>' +
            '<div class="rc-foot">' + esc(run.file) + ' · ' + App.ago(run.received) + ' · ' +
            App.unit(run.rows.length, ' সারি', 'row', 'rows') + '</div>' +
          '</button>' +
          '<button class="run-card" data-act="noop">' +
            '<div class="rc-head"><b>STL-0824</b><span class="chip green sm">' + I.check(12) + L('সব মিলেছে', 'fully matched') + '</span></div>' +
            '<div class="rc-figs"><div><span class="eyebrow">' + L('ফাইলে বলা মোট', 'File total') + '</span>' +
            '<span class="money mid">' + tk(18760) + '</span></div>' +
            '<div><span class="eyebrow">' + L('মিলেছে', 'Reconciled') + '</span>' +
            '<span class="money mid green">' + tk(18760) + '</span></div></div>' +
            '<div class="rc-foot">pathao_payout_2026-08-24.csv · ' + App.date('2026-08-25') + ' · ' + n(9) + L(' সারি', ' rows') + '</div>' +
          '</button>' +
          '<div class="card pad"><span class="eyebrow">' + L('মোট', 'Running totals') + '</span>' +
          '<div class="fig-table" style="margin-top:var(--s3)">' +
          '<div class="fig-row"><span>' + L('এ মাসে হাতে এসেছে', 'Realized this month') + '</span><b class="money green">' + tk(21303) + '</b></div>' +
          '<div class="fig-row"><span>' + L('কুরিয়ার ফি কেটেছে', 'Courier fees deducted') + '</span><b class="money">' + tk(1085) + '</b></div>' +
          '<div class="fig-row"><span>' + L('অমিলে আটকে আছে', 'Held in variance') + '</span><b class="money amber">' + tk(1841) + '</b></div>' +
          '</div></div></div>' };
    }
  };

  function settleImport() {
    return { route: 'settlement', nav: 'cod', money: true, title: L('নিষ্পত্তির ফাইল আনুন', 'Import a payout file'),
      eyebrow: L('ধাপ ১ / ৩', 'Step 1 of 3'),
      body: '<div class="stack g4">' +
        '<div class="steps"><span class="st now"><span class="n">১</span>' + L('ফাইল', 'File') + '</span><span class="sep"></span>' +
        '<span class="st"><span class="n">২</span>' + L('কলাম', 'Columns') + '</span><span class="sep"></span>' +
        '<span class="st"><span class="n">৩</span>' + L('মিলান', 'Match') + '</span></div>' +
        U.provenance(L('প্রত্যেক কুরিয়ারের ফাইলের ছাঁদ আলাদা। একবার কলাম মিলিয়ে দিলে সেই কুরিয়ারের জন্য মনে রাখা হয় — পরের বার আর করতে হবে না।',
          'Every courier formats its file differently. Map the columns once and the mapping is remembered for that courier.'), 'teal') +
        '<div class="card pad"><div class="stack g3">' +
        U.field({ label: L('কোন কুরিয়ার', 'Which courier'), type: 'select',
          options: App.couriers.map(function (c, i) { return { label: L(c.name, c.nameEn), selected: i === 0 }; }) }) +
        '</div></div>' +
        '<div class="drop-zone" data-go="settlement/import/map">' + I.sheet(30) +
        '<b>' + L('কুরিয়ারের পাঠানো CSV ফাইল বাছুন', 'Pick the CSV the courier sent') + '</b>' +
        '<span>pathao_payout_2026-08-31.csv</span></div>' +
        '<div class="card pad"><span class="eyebrow">' + L('মনে রাখা ছাঁদ', 'Remembered formats') + '</span>' +
        '<div class="card flush" style="margin-top:var(--s3)">' +
        '<div class="list-item"><span class="lead green">' + I.check(16) + '</span>' +
        '<span class="body"><b>' + L('পাঠাও কুরিয়ার', 'Pathao Courier') + '</b>' +
        '<span>' + L('৭টি কলাম মেলানো আছে · শেষ ব্যবহার ', '7 columns mapped · last used ') + App.date('2026-08-25') + '</span></span></div>' +
        '<div class="list-item"><span class="lead">' + I.sheet(16) + '</span>' +
        '<span class="body"><b>' + L('স্টেডফাস্ট', 'Steadfast') + '</b>' +
        '<span>' + L('এখনো মেলানো হয়নি', 'not mapped yet') + '</span></span></div>' +
        '</div></div></div>' };
  }

  var PAY_COLS = ['Consignment ID', 'Delivery Date', 'COD Amount', 'Delivery Charge', 'COD Charge', 'Payable', 'Status'];
  var PAY_TARGET = ['consignment', 'date', 'cod', 'fee', 'codfee', 'net', 'status', 'skip'];
  var PAY_LABEL = {
    consignment: { bn: 'কনসাইনমেন্ট নম্বর', en: 'Consignment number' },
    date: { bn: 'ডেলিভারির তারিখ', en: 'Delivery date' },
    cod: { bn: 'ক্রেতার কাছ থেকে নেওয়া', en: 'COD collected' },
    fee: { bn: 'ডেলিভারি চার্জ', en: 'Delivery charge' },
    codfee: { bn: 'COD চার্জ', en: 'COD charge' },
    net: { bn: 'আপনাকে দেওয়া হয়েছে', en: 'Net paid to you' },
    status: { bn: 'অবস্থা', en: 'Status' },
    skip: { bn: 'বাদ দিন', en: 'Ignore' }
  };

  function settleMap() {
    var sample = ['PT-991198', '2026-08-28', '1380', '70', '14', '1296', 'Delivered'];
    return { route: 'settlement', nav: 'cod', money: true, title: L('কলাম মেলান', 'Map the columns'),
      eyebrow: L('ধাপ ২ / ৩', 'Step 2 of 3'),
      body: '<div class="stack g4">' +
        '<div class="steps"><span class="st done"><span class="n">✓</span></span><span class="sep"></span>' +
        '<span class="st now"><span class="n">২</span>' + L('কলাম', 'Columns') + '</span><span class="sep"></span>' +
        '<span class="st"><span class="n">৩</span></span></div>' +
        U.provenance(L('“কনসাইনমেন্ট নম্বর” আর “আপনাকে দেওয়া হয়েছে” — এই দুইটি ছাড়া মেলানো সম্ভব নয়। বাকিগুলো না দিলেও চলবে, শুধু অমিলের কারণ কম স্পষ্ট হবে।',
          'Consignment number and net paid are required; without them nothing can be matched. The rest are optional, but a variance is harder to explain without them.'), 'brass', I.warn(15)) +
        '<div class="card flush">' + PAY_COLS.map(function (col, i) {
          var g = PAY_TARGET[i];
          var req = g === 'consignment' || g === 'net';
          return '<div class="map-row">' +
            '<div class="mr-src"><b>' + esc(col) + '</b><span>' + esc(sample[i]) + '</span></div>' +
            '<span class="mr-arrow">' + I.chev(16) + '</span>' +
            '<div class="mr-dst"><select class="select">' + PAY_TARGET.map(function (t) {
              return '<option' + (t === g ? ' selected' : '') + '>' + L(PAY_LABEL[t].bn, PAY_LABEL[t].en) + '</option>';
            }).join('') + '</select>' +
            '<span class="mr-flag' + (req ? ' req' : '') + '">' + (req ? L('আবশ্যক', 'required') : L('মনে রাখা', 'remembered')) + '</span>' +
            '</div></div>';
        }).join('') + '</div>' +
        U.toggleRow({ title: L('পাঠাও এর জন্য এই মিল মনে রাখুন', 'Remember this mapping for Pathao'),
          sub: L('পরের ফাইল নিজেই মিলে যাবে', 'The next file maps itself'), on: true }) +
        '<div class="sticky-foot"><button class="btn ghost" data-act="back">' + L('পেছনে', 'Back') + '</button>' +
        '<button class="btn primary" data-go="settlement/' + App.settlementRun.id + '">' + L('মিলিয়ে দেখুন', 'Run the match') + '</button></div>' +
        '</div>' };
  }

  /* -------------------------------------------------- MATCH REVIEW (hero) */

  function matchReview(runId) {
    var run = App.settlementRun;
    var filter = App.state.matchFilter || 'all';
    var counts = { matched: 0, short: 0, unmatched: 0, duplicate: 0 };
    run.rows.forEach(function (r) { counts[r.state] = (counts[r.state] || 0) + 1; });

    var matchedNet = 0, expectedNet = 0;
    run.rows.forEach(function (r) {
      if (r.state === 'matched') { matchedNet += r.net; expectedNet += r.expect; }
    });
    var held = 0;
    run.rows.forEach(function (r) { if (r.state !== 'matched') held += r.net; });

    var rows = run.rows.filter(function (r) {
      if (filter === 'all') return true;
      if (filter === 'open') return r.state !== 'matched';
      return r.state === filter;
    });

    var TABS = [
      { key: 'all', bn: 'সব', en: 'All', c: run.rows.length },
      { key: 'open', bn: 'সমাধান বাকি', en: 'Needs a decision', c: run.rows.length - counts.matched },
      { key: 'matched', bn: 'মিলেছে', en: 'Matched', c: counts.matched }
    ];

    var body = '<div class="stack g4">' +
      '<div class="card pad recon-hero">' +
        '<div class="rh-top"><div><span class="eyebrow">' + L('ফাইলে বলা মোট', 'The file says') + '</span>' +
        '<span class="money big">' + tk(run.declaredTotal) + '</span></div>' +
        '<div class="rh-div"></div>' +
        '<div><span class="eyebrow">' + L('মিলিয়ে পাওয়া গেল', 'Reconciled so far') + '</span>' +
        '<span class="money big green">' + tk(matchedNet) + '</span></div></div>' +
        '<div class="rh-gap"><span>' + L('এখনো অমিল', 'Still unexplained') + '</span>' +
        '<b class="money amber">' + tk(run.declaredTotal - matchedNet) + '</b></div>' +
        U.completeness(counts.matched, run.rows.length) +
      '</div>' +

      U.provenance(L('তিন ধরনের অমিল ধরা পড়েছে: কম টাকা, অচেনা কনসাইনমেন্ট, আর দুইবার আসা সারি। প্রতিটির সমাধান আলাদা, তাই আলাদা করেই দেখানো হচ্ছে।',
        'Three kinds of variance were found: a short payment, an unrecognised consignment, and a duplicated row. Each resolves differently, so each is shown separately.'), 'brass', I.warn(15)) +

      '<div class="chip-scroll">' + TABS.map(function (t) {
        return '<button class="chip selectable' + (t.key === filter ? '' : ' outline') + '" aria-pressed="' +
          (t.key === filter ? 'true' : 'false') + '" data-act="match-filter" data-arg="' + t.key + '">' +
          L(t.bn, t.en) + ' ' + n(t.c) + '</button>';
      }).join('') + '</div>';

    body += '<div class="card flush">' + rows.map(function (r) {
      var o = r.order ? App.get.order(r.order) : null;
      var c = o ? App.get.customer(o.cust) : null;
      var diff = r.expect === null ? null : r.net - r.expect;
      var TONE = { matched: 'green', short: 'red', unmatched: 'brass', duplicate: 'amber' }[r.state];
      var STATE = {
        matched:   { bn: 'মিলেছে', en: 'Matched' },
        short:     { bn: 'কম এসেছে', en: 'Short' },
        unmatched: { bn: 'অচেনা', en: 'Unmatched' },
        duplicate: { bn: 'দুইবার', en: 'Duplicate' }
      }[r.state];

      return '<button class="recon-row ' + r.state + '"' +
        (r.state === 'matched' ? ' data-act="noop"' : ' data-go="settlement/' + run.id + '/' + r.cn + '"') + '>' +
        '<span class="rr-mark ' + TONE + '">' + (r.state === 'matched' ? I.check(15) : I.warn(15)) + '</span>' +
        '<span class="rr-body"><b>' + esc(r.cn) + '</b>' +
        '<span>' + (o ? o.id + ' · ' + esc(L(c.name, c.nameEn)) : L('কোনো অর্ডারের সাথে মেলেনি', 'matches no order')) + '</span>' +
        '<i class="rr-why">' + esc(L(r.why || 'সব ঠিক আছে', r.whyEn || r.why || 'nothing to explain')) + '</i></span>' +
        '<span class="rr-money"><span class="money">' + tk(r.net) + '</span>' +
        (diff === null ? '<span class="delta brass">' + L('তুলনা নেই', 'nothing to compare') + '</span>'
          : diff === 0 ? '<span class="delta green">' + L('মিল', 'exact') + '</span>'
          : '<span class="delta ' + (diff < 0 ? 'red' : 'teal') + '">' + (diff > 0 ? '+' : '') + App.tkPlain(diff) + '</span>') +
        '</span>' +
        (r.state === 'matched' ? '' : '<span class="chev">' + I.chev(16) + '</span>') + '</button>';
    }).join('') + '</div>';

    body += '<div class="card pad"><span class="eyebrow">' + L('সমাধান করলে কী হবে', 'What resolving does') + '</span>' +
      '<div class="fig-table" style="margin-top:var(--s3)">' +
      '<div class="fig-row"><span>' + L('হাতে পাওয়া লাভে যোগ হয়েছে', 'Already in realized profit') + '</span>' +
      '<b class="money green">' + tk(matchedNet) + '</b></div>' +
      '<div class="fig-row"><span>' + L('অমিলে আটকে আছে', 'Held in variance') + '</span>' +
      '<b class="money amber">' + tk(held) + '</b></div>' +
      '</div>' +
      '<div style="margin-top:var(--s3)">' + U.provenance(
        L('অমিল সমাধান না করলে লাভের হিসাব “অসম্পূর্ণ” হিসেবেই দেখানো হবে — জোর করে মিলিয়ে দেওয়া হবে না।',
          'Until the variances are resolved, profit stays marked incomplete. Nothing is force-balanced.'), 'teal') + '</div></div>';

    body += '<div class="sticky-foot rich">' +
      '<div><b>' + n(run.rows.length - counts.matched) + L(' টি বাকি', ' left') + '</b>' +
      '<span class="cell-sub" style="display:block">' + L('একটা একটা করে সিদ্ধান্ত নিন', 'decide one at a time') + '</span></div>' +
      '<button class="btn primary" data-go="settlement/' + run.id + '/PT-991204">' + L('প্রথমটি দেখুন', 'Start with the first') + '</button></div>';

    body += '</div>';

    return { route: 'settlement', nav: 'cod', money: true, title: L('মিলিয়ে দেখা', 'Match review'),
      eyebrow: run.id + ' · ' + esc(run.file), body: body };
  }

  App.actions['match-filter'] = function (k) { App.state.matchFilter = k; App.render(); };

  /* ------------------------------------------ VARIANCE DISPOSITION (climax) */

  function variance(runId, cn) {
    var run = App.settlementRun;
    var r = run.rows.filter(function (x) { return x.cn === cn; })[0];
    if (!r) return notFound();
    var o = r.order ? App.get.order(r.order) : null;
    var c = o ? App.get.customer(o.cust) : null;
    var diff = r.expect === null ? null : r.net - r.expect;

    var body = '<div class="stack g4">';

    /* the gap, stated plainly, before any option is offered */
    body += '<div class="card pad var-hero">' +
      '<span class="chip ' + ({ short: 'red', unmatched: 'brass', duplicate: 'amber' }[r.state] || '') + '">' +
      ({ short: L('কম টাকা এসেছে', 'Paid short'), unmatched: L('অর্ডার পাওয়া যায়নি', 'No matching order'),
         duplicate: L('দুইবার এসেছে', 'Duplicate row') }[r.state]) + '</span>' +
      '<h2 class="var-cn">' + esc(r.cn) + '</h2>' +
      (r.state === 'short'
        ? '<div class="var-math">' +
            '<div class="vm-row"><span>' + L('আপনার হিসাবে পাওয়া উচিত', 'Your record expects') + '</span><b class="money">' + tk(r.expect) + '</b></div>' +
            '<div class="vm-row"><span>' + L('কুরিয়ার দিয়েছে', 'The courier paid') + '</span><b class="money">' + tk(r.net) + '</b></div>' +
            '<div class="vm-row gap"><span>' + L('ঘাটতি', 'The gap') + '</span><b class="money red">' + tk(Math.abs(diff)) + '</b></div>' +
          '</div>'
        : r.state === 'unmatched'
        ? '<div class="var-math"><div class="vm-row"><span>' + L('কুরিয়ার দিয়েছে', 'The courier paid') + '</span>' +
          '<b class="money">' + tk(r.net) + '</b></div>' +
          '<div class="vm-row gap"><span>' + L('আপনার খাতায় এই নম্বর নেই', 'Your books have no such number') + '</span>' +
          '<b class="money brass">' + L('তুলনা নেই', 'nothing to compare') + '</b></div></div>'
        : '<div class="var-math"><div class="vm-row"><span>' + L('এই সারিতে বলা টাকা', 'This row claims') + '</span>' +
          '<b class="money">' + tk(r.net) + '</b></div>' +
          '<div class="vm-row gap"><span>' + L('আগেই নিষ্পত্তি হয়েছে', 'Already settled in') + '</span>' +
          '<b>STL-0824</b></div></div>') +
      '<div class="var-note">' + esc(L(r.why, r.whyEn || r.why)) + '</div>' +
      '</div>';

    /* the order side of the story */
    if (o) {
      var e = App.econ(o);
      body += '<div class="card flush"><div class="card-head"><h3>' + L('যে অর্ডারের সাথে জড়িত', 'The order behind it') + '</h3></div>' +
        '<button class="list-item" data-go="order/' + o.id + '">' +
        '<span class="lead teal">' + I.orders(17) + '</span>' +
        '<span class="body"><b>' + o.id + ' · ' + esc(L(c.name, c.nameEn)) + '</b>' +
        '<span>' + App.date(o.placed) + ' · ' + L('ক্রেতা দিয়েছেন ', 'Customer paid ') + App.tkPlain(e.collect) + '</span></span>' +
        '<span class="chev">' + I.chev(16) + '</span></button>' +
        '<div class="dl-block"><dl class="dl">' +
        '<dt>' + L('ক্রেতার কাছ থেকে নেওয়া', 'COD collected') + '</dt><dd>' + App.tkPlain(r.codCollected) + '</dd>' +
        '<dt>' + L('ডেলিভারি চার্জ', 'Delivery charge') + '</dt><dd>−' + App.tkPlain(r.fee) + '</dd>' +
        '<dt>' + L('COD চার্জ', 'COD charge') + '</dt><dd>−' + App.tkPlain(r.codFee) + '</dd>' +
        '<dt>' + L('হিসাব মিলে দাঁড়ায়', 'Which leaves') + '</dt><dd><b>' + App.tkPlain(r.codCollected - r.fee - r.codFee) + '</b></dd>' +
        '</dl></div></div>';
    }

    /* the dispositions — each states its effect on both figures before it is chosen */
    var OPTIONS = {
      short: [
        { key: 'accept', bn: 'কুরিয়ারের হিসাব মেনে নিন', en: 'Accept the courier\'s figure',
          subBn: 'ঘাটতিটা কুরিয়ারের অতিরিক্ত কাটা হিসেবে খরচে লেখা হবে',
          subEn: 'The gap is booked as an extra courier deduction — a real expense',
          effBn: 'হাতে পাওয়া লাভ ' + App.tkPlain(1989) + ' ধরা হবে · অর্জিত লাভ ' + App.tkPlain(80) + ' কমবে',
          effEn: 'Realized profit becomes ' + App.tkPlain(1989) + ' · earned profit drops by ' + App.tkPlain(80),
          tone: 'brass' },
        { key: 'dispute', bn: 'কুরিয়ারের সাথে দাবি তুলুন', en: 'Dispute it with the courier',
          subBn: 'সারিটি খোলা থাকবে, টাকাটা পাওনা হিসেবে থাকবে',
          subEn: 'The row stays open and the amount remains receivable',
          effBn: 'হাতে পাওয়া লাভে কিছু যোগ হবে না · অর্জিত লাভ অটুট থাকবে · হিসাব “অসম্পূর্ণ” দেখাবে',
          effEn: 'Nothing is added to realized profit · earned profit is untouched · the figure stays marked incomplete',
          tone: 'teal', rec: true },
        { key: 'correct', bn: 'আমার হিসাবই ভুল ছিল', en: 'My own record was wrong',
          subBn: 'ক্রেতা দরদাম করেছিলেন বা ছাড় দেওয়া হয়েছিল — অর্ডারে ঠিক করে নিন',
          subEn: 'The Customer negotiated at the door, or a discount was given — correct the order',
          effBn: 'অর্ডারের দাম বদলাবে · দুইটি লাভই মিলে যাবে · বিপরীত এন্ট্রি লেখা হবে',
          effEn: 'The order value changes · both profit figures agree again · a compensating entry is recorded',
          tone: 'amber' },
        { key: 'split', bn: 'ভাগ করে নিন', en: 'Split it',
          subBn: 'কিছুটা মেনে নিন, বাকিটা নিয়ে দাবি তুলুন',
          subEn: 'Accept part of the gap and dispute the rest',
          effBn: 'দুইটি এন্ট্রি লেখা হবে — একটি খরচ, একটি পাওনা',
          effEn: 'Two entries are written — one expense, one receivable', tone: '' }
      ],
      unmatched: [
        { key: 'find', bn: 'হাতে খুঁজে অর্ডার মেলান', en: 'Match it to an order myself',
          subBn: 'হয়তো কনসাইনমেন্ট নম্বর লিখতে ভুল হয়েছিল',
          subEn: 'The consignment number was probably typed wrong',
          effBn: 'মিলে গেলে টাকাটা সেই অর্ডারের হাতে পাওয়া লাভে যোগ হবে',
          effEn: 'Once matched, the amount joins that order\'s realized profit', tone: 'teal', rec: true },
        { key: 'create', bn: 'অর্ডারটি খাতায় ওঠেনি — তৈরি করুন', en: 'The order was never recorded — create it',
          subBn: 'কুরিয়ার পাঠিয়েছে কিন্তু আপনি লিখতে ভুলে গেছেন',
          subEn: 'It shipped but was never entered',
          effBn: 'নতুন অর্ডার তৈরি হবে, ক্রয়মূল্য না জানা থাকলে লাভ “অসম্পূর্ণ” দেখাবে',
          effEn: 'A new order is created; without a cost price its profit shows as incomplete', tone: 'brass' },
        { key: 'other', bn: 'এটি অন্য কিছু', en: 'It is something else',
          subBn: 'কুরিয়ারের ভুল, বা অন্য দোকানের সারি',
          subEn: 'A courier error, or another shop\'s row',
          effBn: 'সারিটি বাদ দেওয়া হবে কিন্তু ফাইলে থেকে যাবে — মুছে যাবে না',
          effEn: 'The row is excluded but kept in the file — never deleted', tone: '' }
      ],
      duplicate: [
        { key: 'skip', bn: 'এই সারিটি বাদ দিন', en: 'Skip this row',
          subBn: 'আগের নিষ্পত্তিই ঠিক ছিল, এটি ফাইলের পুনরাবৃত্তি',
          subEn: 'The earlier settlement was correct; this is a repeat in the file',
          effBn: 'কোনো হিসাব বদলাবে না · কেন বাদ দেওয়া হলো তা অডিটে লেখা থাকবে',
          effEn: 'No figure moves · the reason for skipping is written to the audit trail', tone: 'teal', rec: true },
        { key: 'reverse', bn: 'আগের নিষ্পত্তি ভুল ছিল', en: 'The earlier settlement was wrong',
          subBn: 'STL-0824 এর এন্ট্রি ফিরিয়ে নিয়ে এটিকে ধরা হবে',
          subEn: 'Reverse the STL-0824 entry and take this one instead',
          effBn: 'দুইটি বিপরীত এন্ট্রি লেখা হবে · আগের মাসের হাতে পাওয়া লাভ বদলাতে পারে',
          effEn: 'Two compensating entries are written · last month\'s realized profit may move', tone: 'amber' }
      ]
    }[r.state] || [];

    body += '<div class="card pad"><div class="section-title"><h2>' + L('কী করবেন', 'What do you want to do') + '</h2></div>' +
      U.provenance(L('প্রতিটি সিদ্ধান্ত কোন সংখ্যা কীভাবে বদলাবে সেটা আগেই বলা আছে — চাপ দেওয়ার পর জানতে হবে না।',
        'Each choice states which figure it moves, before you pick it — not after.'), 'violet', I.info(15)) +
      '<div class="stack g3" style="margin-top:var(--s3)">' + OPTIONS.map(function (op) {
        return '<button class="disp-card ' + op.tone + '" data-act="disposition" data-arg="' + r.cn + '|' + op.key + '">' +
          '<span class="dc-top"><b>' + L(op.bn, op.en) + '</b>' +
          (op.rec ? '<i class="chip green sm">' + L('সাধারণত এটাই', 'usually this') + '</i>' : '') + '</span>' +
          '<span class="dc-sub">' + L(op.subBn, op.subEn) + '</span>' +
          '<span class="dc-eff">' + I.spark(13) + L(op.effBn, op.effEn) + '</span>' +
          '</button>';
      }).join('') + '</div></div>';

    body += U.provenance(L('কোনো সিদ্ধান্তই চূড়ান্ত নয় — সবগুলোই বিপরীত এন্ট্রি দিয়ে ফিরিয়ে নেওয়া যায়, আর কে কখন নিয়েছিল তা লেখা থাকে।',
      'No decision here is final — every one can be reversed with a compensating entry, and who decided when is recorded.'), 'teal', I.shield(15));

    body += '</div>';

    return { route: 'settlement', nav: 'cod', money: true, title: L('অমিলের সমাধান', 'Resolve the variance'),
      eyebrow: run.id + ' · ' + esc(r.cn), body: body };
  }

  App.actions['disposition'] = function (arg) {
    var parts = arg.split('|');
    var cn = parts[0], key = parts[1];
    var r = App.settlementRun.rows.filter(function (x) { return x.cn === cn; })[0];

    var CONFIRM = {
      accept:  { bn: 'ঘাটতি খরচ হিসেবে লেখা হবে', en: 'The gap will be booked as an expense' },
      dispute: { bn: 'দাবি খোলা রাখা হবে', en: 'A dispute will be opened' },
      correct: { bn: 'অর্ডারের হিসাব ঠিক করা হবে', en: 'The order will be corrected' },
      split:   { bn: 'ভাগ করে দুইটি এন্ট্রি লেখা হবে', en: 'Two entries will be written' },
      find:    { bn: 'অর্ডার খুঁজে মেলানো হবে', en: 'You will pick the matching order' },
      create:  { bn: 'নতুন অর্ডার তৈরি করা হবে', en: 'A new order will be created' },
      other:   { bn: 'সারিটি বাদ দেওয়া হবে', en: 'The row will be excluded' },
      skip:    { bn: 'সারিটি বাদ দেওয়া হবে', en: 'The row will be skipped' },
      reverse: { bn: 'আগের এন্ট্রি ফিরিয়ে নেওয়া হবে', en: 'The earlier entry will be reversed' }
    }[key];

    if (key === 'find') {
      U.openSheet({
        title: L('কোন অর্ডারের সাথে?', 'Which order?'),
        sub: L('একই টাকার অঙ্কের কাছাকাছি অর্ডারগুলো আগে দেখানো হচ্ছে।', 'Orders with a similar amount are listed first.'),
        body: '<div class="card flush">' + App.orders.filter(function (o) {
          return o.status === 'delivered' || o.status === 'shipped';
        }).map(function (o) {
          var c = App.get.customer(o.cust);
          var e = App.econ(o);
          return '<button class="list-item" data-act="variance-matched" data-arg="' + cn + '">' +
            '<span class="lead teal">' + I.orders(16) + '</span>' +
            '<span class="body"><b>' + o.id + ' · ' + esc(L(c.name, c.nameEn)) + '</b>' +
            '<span>' + (o.consignment || L('কনসাইনমেন্ট নেই', 'no consignment')) + ' · ' + App.date(o.placed) + '</span></span>' +
            '<span class="trail"><span class="money">' + tk(e.collect) + '</span></span></button>';
        }).join('') + '</div>',
        foot: '<button class="btn ghost" data-act="close-sheet">' + L('বাতিল', 'Cancel') + '</button>'
      });
      return;
    }

    U.openSheet({
      title: L('নিশ্চিত করুন', 'Confirm'),
      sub: L(CONFIRM.bn, CONFIRM.en),
      body: '<div class="stack g3">' +
        U.field({ label: L('কারণ লিখুন', 'Write the reason'), type: 'textarea', rows: 3,
          value: key === 'dispute' ? L('কুরিয়ারকে জানানো হয়েছে, ৮০ টাকা কম দিয়েছে', 'Raised with the courier — paid ৳80 short') : '',
          hint: L('অডিটে এই কারণটাই থেকে যাবে, তাই ভবিষ্যতে বোঝা যাবে কেন এই সিদ্ধান্ত নিয়েছিলেন।',
                  'This reason is what the audit trail keeps, so future-you can see why the call was made.') }) +
        U.provenance(L('সিদ্ধান্তটি এখনই লেখা হবে এবং সংশ্লিষ্ট সংখ্যাগুলো বদলে যাবে। চাইলে পরে ফিরিয়ে নেওয়া যাবে।',
          'The decision is recorded now and the affected figures move. It can be reversed later.'), 'teal') +
        '</div>',
      foot: '<button class="btn ghost" data-act="close-sheet">' + L('বাতিল', 'Cancel') + '</button>' +
        '<button class="btn primary" data-act="disposition-save" data-arg="' + cn + '|' + key + '">' + L('সিদ্ধান্ত লিখুন', 'Record it') + '</button>'
    });
  };

  App.actions['variance-matched'] = function (cn) {
    U.closeSheet();
    var r = App.settlementRun.rows.filter(function (x) { return x.cn === cn; })[0];
    r.state = 'matched'; r.expect = r.net;
    r.why = 'হাতে মিলিয়ে দেওয়া হয়েছে'; r.whyEn = 'Matched by hand';
    App.go('settlement/' + App.settlementRun.id);
    U.toast(L('মিলিয়ে দেওয়া হয়েছে — হাতে পাওয়া লাভে যোগ হলো', 'Matched — added to realized profit'), '', L('ফিরিয়ে নিন', 'Undo'));
  };

  App.actions['disposition-save'] = function (arg) {
    var parts = arg.split('|');
    var r = App.settlementRun.rows.filter(function (x) { return x.cn === parts[0]; })[0];
    U.closeSheet();
    if (parts[1] === 'dispute') {
      r.why = 'দাবি খোলা আছে — কুরিয়ারের উত্তরের অপেক্ষা';
      r.whyEn = 'Dispute open — waiting on the courier';
      U.toast(L('দাবি খোলা হয়েছে — হিসাব “অসম্পূর্ণ” থাকবে', 'Dispute opened — the figure stays incomplete'), 'warn');
    } else {
      r.state = 'matched';
      r.expect = r.net;
      r.why = 'সিদ্ধান্ত নেওয়া হয়েছে';
      r.whyEn = 'Resolved by decision';
      U.toast(L('সিদ্ধান্ত লেখা হয়েছে', 'Decision recorded'), '', L('ফিরিয়ে নিন', 'Undo'));
    }
    App.go('settlement/' + App.settlementRun.id);
  };

  /* ================================================== EXPENSES ========== */

  App.screens.expenses = {
    money: true,
    title: function () { return L('খরচ', 'Expenses'); },
    view: function (args) {
      if (args[0] === 'new') return newExpense();

      var total = App.expenses.reduce(function (s, e) { return s + e.amount; }, 0);
      var byCat = {};
      App.expenses.forEach(function (e) { byCat[e.cat] = (byCat[e.cat] || 0) + e.amount; });
      var cats = Object.keys(byCat).sort(function (a, b) { return byCat[b] - byCat[a]; });

      return { route: 'expenses', nav: 'expenses', money: true, noBack: true,
        title: L('খরচ', 'Expenses'),
        eyebrow: L('এ মাসে ', 'This month ') + App.tkPlain(total),
        acts: '<button class="btn sm primary" data-go="expenses/new">' + I.plus(15) + L('যোগ', 'Add') + '</button>',
        body: '<div class="stack g4">' +
          '<div class="card pad"><span class="eyebrow">' + L('এ মাসের মোট খরচ', 'Total this month') + '</span>' +
          '<span class="money big">' + tk(total) + '</span>' +
          '<span class="hero-note">' + L('এই খরচ বাদ দিলেই আসল লাভ বেরোয় — পণ্যের লাভ আর ব্যবসার লাভ এক নয়।',
            'Subtracting these is what turns product margin into business profit. They are not the same thing.') + '</span></div>' +
          '<div class="card pad"><span class="eyebrow">' + L('কোন খাতে কত', 'Where it went') + '</span>' +
          '<div style="margin-top:var(--s3)">' + cats.map(function (cat) {
            var e0 = App.expenses.filter(function (x) { return x.cat === cat; })[0];
            return U.barRow(L(cat, e0.catEn), byCat[cat], total);
          }).join('') + '</div></div>' +
          '<div class="card flush"><div class="card-head"><h3>' + L('সব খরচ', 'All expenses') + '</h3>' +
          '<span class="chip sm">' + n(App.expenses.length) + '</span></div>' +
          App.expenses.map(function (e) {
            var role = App.ROLES[e.by];
            return '<div class="list-item"><span class="lead">' + I.receipt(17) + '</span>' +
              '<span class="body"><b>' + esc(L(e.cat, e.catEn)) + '</b>' +
              '<span>' + App.date(e.date) + (e.note ? ' · ' + esc(e.note) : '') + ' · ' + esc(L(role.name, role.nameEn)) + '</span></span>' +
              '<span class="trail"><span class="money">' + tk(e.amount) + '</span></span></div>';
          }).join('') + '</div></div>' };
    }
  };

  function newExpense() {
    return { route: 'expenses', nav: 'expenses', money: true, title: L('খরচ যোগ করুন', 'Add an expense'),
      eyebrow: L('তিনটি ঘর — নাম, টাকা, তারিখ', 'Three fields — what, how much, when'),
      body: '<div class="stack g4">' +
        '<div class="card pad"><div class="stack g3">' +
        U.field({ label: L('কোন খাতে', 'Category'), type: 'select', options: [
          { label: L('প্যাকেজিং', 'Packaging') }, { label: L('বিজ্ঞাপন', 'Advertising') },
          { label: L('পরিবহন', 'Transport') }, { label: L('বেতন', 'Salary') },
          { label: L('ভাড়া', 'Rent') }, { label: L('ইন্টারনেট', 'Internet') },
          { label: L('নতুন খাত…', 'New category…') }
        ] }) +
        U.field({ label: L('কত টাকা', 'Amount'), prefix: '৳', money: true, required: true }) +
        U.field({ label: L('তারিখ', 'Date'), value: App.date(App.TODAY) }) +
        U.field({ label: L('মন্তব্য', 'Note'), placeholder: L('যেমন: পলি ব্যাগ ও টেপ', 'e.g. poly bags and tape') }) +
        '</div></div>' +
        U.toggleRow({ title: L('প্রতি মাসে একই খরচ', 'Repeats every month'),
          sub: L('ভাড়া বা ইন্টারনেটের মতো — প্রতি মাসে নিজে থেকে যোগ হবে', 'Rent, internet — added automatically each month'), on: false }) +
        U.provenance(L('খরচ কে লিখেছে তা রেখে দেওয়া হয়। মালিক ছাড়া কেউ খরচ মুছতে পারে না, শুধু বিপরীত এন্ট্রি দিয়ে ঠিক করা যায়।',
          'Who entered an expense is kept. Only the Owner can reverse one, and even then by a compensating entry rather than a deletion.'), 'teal', I.shield(15)) +
        '<div class="sticky-foot"><button class="btn ghost" data-act="back">' + L('বাতিল', 'Cancel') + '</button>' +
        '<button class="btn primary" data-act="save-expense">' + L('খরচ সংরক্ষণ', 'Save expense') + '</button></div>' +
        '</div>' };
  }

  App.actions['save-expense'] = function () {
    U.toast(L('খরচ সংরক্ষিত হয়েছে', 'Expense saved'), '', L('ফিরিয়ে নিন', 'Undo'));
    setTimeout(function () { App.go('expenses'); }, 600);
  };

  /* ================================================== DUES ============== */

  App.screens.dues = {
    money: true,
    title: function () { return L('বাকি', 'Dues'); },
    view: function (args) {
      if (args[0]) return dueDetail(args[0]);
      var total = App.dues.reduce(function (s, d) { return s + d.amount; }, 0);

      return { route: 'dues', nav: 'dues', money: true, noBack: true,
        title: L('বাকি', 'Dues'),
        eyebrow: n(App.dues.length) + L(' জনের কাছে ', ' people owe ') + App.tkPlain(total),
        body: '<div class="stack g4">' +
          '<div class="card pad"><span class="eyebrow">' + L('ক্রেতাদের কাছে পাওনা', 'Owed by Customers') + '</span>' +
          '<span class="money big amber">' + tk(total) + '</span>' +
          '<span class="hero-note">' + L('এই টাকা বিক্রিতে ধরা আছে কিন্তু হাতে আসেনি — তাই লাভ অর্জিত, হাতে পাওয়া নয়।',
            'This is booked as sales but not collected — earned profit, not realized.') + '</span></div>' +
          U.provenance(L('বাকি লিখে রাখলে মনে রাখতে হয় না। তবে মনে করানোর মেসেজ নিজে থেকে যায় না — কাকে কখন বলবেন সেটা আপনার সিদ্ধান্ত।',
            'Recording a due means you do not have to remember it. Reminders are not sent automatically — whom to chase and when is your call.'), 'teal') +
          '<div class="card flush">' + App.dues.map(function (d) {
            var c = App.get.customer(d.cust);
            var days = Math.round((new Date(App.TODAY) - new Date(d.since)) / 86400000);
            return '<button class="list-item' + (days > 30 ? ' needs' : '') + '" data-go="dues/' + d.id + '">' +
              '<span class="lead ' + (days > 30 ? 'red' : 'amber') + '">' + esc(L(c.name, c.nameEn).charAt(0)) + '</span>' +
              '<span class="body"><b>' + esc(L(c.name, c.nameEn)) + '</b>' +
              '<span>' + App.unit(days, ' দিন ধরে', 'day', 'days') + ' · ' + App.unit(d.orders.length, ' অর্ডার', 'order', 'orders') +
              (d.note ? ' · ' + esc(d.note) : '') + '</span></span>' +
              '<span class="trail"><span class="money amber">' + tk(d.amount) + '</span></span>' +
              '<span class="chev">' + I.chev(16) + '</span></button>';
          }).join('') + '</div></div>' };
    }
  };

  function dueDetail(id) {
    var d = App.dues.filter(function (x) { return x.id === id; })[0];
    if (!d) return notFound();
    var c = App.get.customer(d.cust);
    var days = Math.round((new Date(App.TODAY) - new Date(d.since)) / 86400000);

    return { route: 'dues', nav: 'dues', money: true, title: L('বাকির হিসাব', 'Due detail'),
      eyebrow: esc(L(c.name, c.nameEn)),
      body: '<div class="stack g4">' +
        '<div class="card pad" style="text-align:center">' +
        '<span class="eyebrow">' + L('বাকি আছে', 'Outstanding') + '</span>' +
        '<span class="money big amber" style="display:block">' + tk(d.amount) + '</span>' +
        '<span class="cell-sub">' + App.date(d.since) + L(' থেকে · ', ' · ') + n(days) + L(' দিন', ' days') + '</span></div>' +
        '<div class="card flush">' +
        '<button class="list-item" data-go="customer/' + c.id + '">' +
        '<span class="lead green">' + esc(L(c.name, c.nameEn).charAt(0)) + '</span>' +
        '<span class="body"><b>' + esc(L(c.name, c.nameEn)) + '</b><span>' + esc(c.phone) + '</span></span>' +
        U.riskChip(c, true) + '<span class="chev">' + I.chev(16) + '</span></button>' +
        '<div class="dl-block"><span class="eyebrow">' + L('যে অর্ডারগুলোর জন্য', 'Which orders') + '</span>' +
        '<div class="row wrap" style="gap:6px;margin-top:6px">' + d.orders.map(function (oid) {
          return '<span class="chip outline sm">' + oid + '</span>';
        }).join('') + '</div>' +
        (d.note ? '<p style="margin-top:var(--s3);font-size:var(--fs-sm);color:var(--text-2)">' + esc(d.note) + '</p>' : '') +
        '</div></div>' +
        '<div class="card pad"><span class="eyebrow">' + L('টাকা পেলে', 'When they pay') + '</span>' +
        '<div class="stack g3" style="margin-top:var(--s3)">' +
        U.field({ label: L('কত পেলেন', 'Amount received'), prefix: '৳', money: true, value: String(d.amount) }) +
        U.field({ label: L('কীভাবে', 'How'), type: 'select', options: [
          { label: L('নগদ', 'Cash') }, { label: L('বিকাশ', 'bKash') },
          { label: L('নগদ (মোবাইল)', 'Nagad') }, { label: L('ব্যাংক', 'Bank transfer') }
        ] }) + '</div>' +
        '<div style="margin-top:var(--s3)">' + U.provenance(L('আংশিক টাকা নিলেও চলবে — বাকিটা থেকে যাবে, দুইটি এন্ট্রি লেখা হবে।',
          'A part payment is fine — the remainder stays open and two entries are written.'), 'teal') + '</div>' +
        '<button class="btn primary block" style="margin-top:var(--s4)" data-act="due-paid">' + I.check(16) +
        L('টাকা পাওয়া গেছে', 'Record the payment') + '</button></div>' +
        '<div class="grid c2">' +
        '<button class="btn ghost" data-act="noop">' + L('কল করুন', 'Call') + '</button>' +
        '<button class="btn ghost" data-act="noop">' + I.share(15) + L('মনে করান', 'Send a reminder') + '</button></div>' +
        '</div>' };
  }

  App.actions['due-paid'] = function () {
    U.toast(L('টাকা পাওয়া লেখা হয়েছে — হাতে পাওয়া লাভে যোগ হলো', 'Payment recorded — added to realized profit'),
      '', L('ফিরিয়ে নিন', 'Undo'));
    setTimeout(function () { App.go('dues'); }, 700);
  };

  /* ================================================== SUPPLIERS ========= */

  App.screens.suppliers = {
    money: true,
    title: function () { return L('সরবরাহকারী', 'Suppliers'); },
    view: function () {
      var total = App.suppliers.reduce(function (s, x) { return s + x.payable; }, 0);
      return { route: 'suppliers', nav: 'suppliers', money: true, noBack: true,
        title: L('সরবরাহকারী', 'Suppliers'),
        eyebrow: L('দিতে হবে ', 'You owe ') + App.tkPlain(total),
        body: '<div class="stack g4">' +
          '<div class="card pad"><span class="eyebrow">' + L('সরবরাহকারীদের দিতে হবে', 'Owed to suppliers') + '</span>' +
          '<span class="money big red">' + tk(total) + '</span>' +
          '<span class="hero-note">' + L('হাতে থাকা টাকা দেখে খুশি হওয়ার আগে এই অঙ্কটা মনে রাখা দরকার — এটা আপনার টাকা নয়।',
            'Before celebrating the cash on hand, remember this figure. That cash is not all yours.') + '</span></div>' +
          '<div class="card flush">' + App.suppliers.map(function (s) {
            return '<button class="list-item" data-go="supplier/' + s.id + '">' +
              '<span class="lead ' + (s.payable ? 'red' : 'green') + '">' + I.people(17) + '</span>' +
              '<span class="body"><b>' + esc(L(s.name, s.nameEn)) + '</b>' +
              '<span>' + esc(s.phone) + ' · ' + L('শেষ কিনেছেন ', 'last bought ') + App.ago(s.lastBuy) + '</span></span>' +
              '<span class="trail"><span class="money ' + (s.payable ? 'red' : 'green') + '">' +
              (s.payable ? tk(s.payable) : L('বাকি নেই', 'clear')) + '</span></span>' +
              '<span class="chev">' + I.chev(16) + '</span></button>';
          }).join('') + '</div>' +
          U.provenance(L('কার কাছ থেকে কোন পণ্য আসে তা লেখা থাকলে স্টক কমে গেলে সরাসরি তালিকা পাঠানো যায়।',
            'Recording which products come from whom means a low-stock list can be sent straight to the right supplier.'), 'teal') +
          '</div>' };
    }
  };

  App.screens.supplier = {
    money: true,
    title: function () { return L('সরবরাহকারী', 'Supplier'); },
    view: function (args) {
      var s = App.suppliers.filter(function (x) { return x.id === args[0]; })[0];
      if (!s) return notFound();
      return { route: 'suppliers', nav: 'suppliers', money: true, title: L('সরবরাহকারী', 'Supplier'),
        eyebrow: s.id,
        body: '<div class="stack g4">' +
          '<div class="card pad prof-head"><div class="prof-av ' + (s.payable ? 'red' : 'green') + '">' + I.people(20) + '</div>' +
          '<h2>' + esc(L(s.name, s.nameEn)) + '</h2><span class="prof-sub">' + esc(s.phone) + '</span>' +
          '<div class="grid c2" style="margin-top:var(--s4)">' +
          '<button class="btn ghost" data-act="noop">' + L('কল করুন', 'Call') + '</button>' +
          '<button class="btn primary" data-act="noop">' + L('টাকা দিন', 'Record a payment') + '</button></div></div>' +
          '<div class="card pad"><span class="eyebrow">' + L('দিতে হবে', 'Payable') + '</span>' +
          '<span class="money big ' + (s.payable ? 'red' : 'green') + '">' + (s.payable ? tk(s.payable) : L('কিছু বাকি নেই', 'nothing outstanding')) + '</span></div>' +
          '<div class="card flush"><div class="card-head"><h3>' + L('যে পণ্যগুলো এদের কাছ থেকে আসে', 'Products from them') + '</h3></div>' +
          s.items.map(function (pid) {
            var p = App.get.product(pid);
            var low = App.lowVariants(p).length;
            return '<button class="list-item" data-go="product/' + p.id + '">' +
              '<span class="lead teal">' + I.tag(17) + '</span>' +
              '<span class="body"><b>' + esc(L(p.name, p.nameEn)) + '</b>' +
              '<span>' + L('স্টক ', 'stock ') + n(App.stockOf(p)) + (low ? ' · ' + n(low) + L(' টি কম', ' low') : '') + '</span></span>' +
              (low ? '<span class="chip brass sm">' + L('তুলতে হবে', 'reorder') + '</span>' : '') +
              '<span class="chev">' + I.chev(16) + '</span></button>';
          }).join('') + '</div>' +
          '<button class="btn ghost block" data-go="inventory/low">' + I.share(15) +
          L('কম স্টকের তালিকা পাঠান', 'Send the low-stock list') + '</button></div>' };
    }
  };

  /* ================================================== REPORTS =========== */

  App.screens.reports = {
    money: true,
    title: function () { return L('রিপোর্ট', 'Reports'); },
    view: function (args) {
      if (args[0] === 'profit') return profitReport();

      var s = App.summary();
      var REPORTS = [
        { key: 'profit', icon: 'chart', bn: 'লাভের হিসাব', en: 'Profit report',
          subBn: 'অর্জিত আর হাতে পাওয়া — দুইভাবে', subEn: 'Both earned and realized', tone: 'green' },
        { key: '', icon: 'orders', bn: 'বিক্রির হিসাব', en: 'Sales report',
          subBn: 'দিন, সপ্তাহ, মাস অনুযায়ী', subEn: 'By day, week, month', tone: 'teal' },
        { key: '', icon: 'box', bn: 'কোন পণ্য কেমন চলছে', en: 'Product performance',
          subBn: 'কোনটা লাভ দিচ্ছে, কোনটা শুধু জায়গা নিচ্ছে', subEn: 'What earns, and what just occupies space', tone: 'brass' },
        { key: '', icon: 'truck', bn: 'কুরিয়ার তুলনা', en: 'Courier comparison',
          subBn: 'কার ফেরতের হার বেশি, কে দেরি করে', subEn: 'Whose return rate is higher, who is slower', tone: 'amber' },
        { key: '', icon: 'people', bn: 'ক্রেতার হিসাব', en: 'Customer report',
          subBn: 'কে বেশি কেনে, কে বেশি ফেরত দেয়', subEn: 'Who buys most, who returns most', tone: '' }
      ];

      return { route: 'reports', nav: 'reports', money: true, noBack: true,
        title: L('রিপোর্ট', 'Reports'),
        eyebrow: L('প্রতিটি সংখ্যার নিচে তার হিসাব দেখা যায়', 'Every figure can be opened to its working'),
        body: '<div class="stack g4">' +
          '<div class="card pad"><div class="split2">' +
          '<div><span class="eyebrow">' + L('অর্জিত লাভ', 'Earned profit') + '</span>' +
          '<span class="money mid earned">' + tk(s.earnedProfit) + '</span></div>' +
          '<div><span class="eyebrow">' + L('হাতে পাওয়া লাভ', 'Realized profit') + '</span>' +
          '<span class="money mid realized">' + tk(s.realizedProfit) + '</span></div></div>' +
          U.completeness(s.completeness.have, s.completeness.of) + '</div>' +
          '<div class="stack g3">' + REPORTS.map(function (r) {
            return '<button class="path-card"' + (r.key ? ' data-go="reports/' + r.key + '"' : ' data-act="noop"') + '>' +
              '<span class="pc-ic ' + r.tone + '">' + I[r.icon](20) + '</span>' +
              '<span class="pc-body"><b>' + L(r.bn, r.en) + '</b><span>' + L(r.subBn, r.subEn) + '</span></span>' +
              '<span class="chev">' + I.chev(16) + '</span></button>';
          }).join('') + '</div>' +
          U.provenance(L('রিপোর্ট PDF বা এক্সেল হিসেবে নামানো যায়, বাংলা লেখা অটুট থাকে।',
            'Reports export to PDF or spreadsheet with the Bangla text intact.'), 'teal', I.print(15)) +
          '</div>' };
    }
  };

  function profitReport() {
    var s = App.summary();
    var range = App.state.reportRange || 'month';
    var RANGES = [
      { key: 'today', bn: 'আজ', en: 'Today' },
      { key: 'week', bn: 'এই সপ্তাহ', en: 'This week' },
      { key: 'month', bn: 'এই মাস', en: 'This month' }
    ];

    var lines = [
      { bn: 'বিক্রি', en: 'Sales', v: 24680, tone: '' },
      { bn: 'ছাড়', en: 'Discounts', v: -100, tone: '' },
      { bn: 'ক্রয়মূল্য', en: 'Cost of goods', v: -14210, tone: '' },
      { bn: 'কুরিয়ার ফি', en: 'Courier fees', v: -1085, tone: '' },
      { bn: 'COD ফি', en: 'COD fees', v: -218, tone: '' },
      { bn: 'প্যাকেজিং', en: 'Packaging', v: -375, tone: '' },
      { bn: 'ফেরতে ক্ষতি', en: 'Return losses', v: -330, tone: 'red' },
      { bn: 'অন্য খরচ', en: 'Other expenses', v: -26250, tone: '' }
    ];
    var net = lines.reduce(function (a, l) { return a + l.v; }, 0);

    return { route: 'reports', nav: 'reports', money: true, title: L('লাভের হিসাব', 'Profit report'),
      eyebrow: L('সেপ্টেম্বর ২০২৬', 'September 2026'),
      acts: '<button class="btn sm ghost" data-act="noop">' + I.print(14) + L('নামান', 'Export') + '</button>',
      body: '<div class="stack g4">' +
        '<div class="seg small full">' + RANGES.map(function (r) {
          return '<button data-act="report-range" data-arg="' + r.key + '" aria-pressed="' +
            (r.key === range ? 'true' : 'false') + '">' + L(r.bn, r.en) + '</button>';
        }).join('') + '</div>' +

        '<div class="card pad"><div class="split2">' +
        '<div><span class="eyebrow">' + L('অর্জিত', 'Earned') + '</span>' +
        '<span class="money big earned">' + tk(s.earnedProfit) + '</span>' +
        '<button class="basis-btn" data-act="basis-why">' + U.basisPill('earned') + '</button></div>' +
        '<div class="hero-div"></div>' +
        '<div><span class="eyebrow">' + L('হাতে পাওয়া', 'Realized') + '</span>' +
        '<span class="money big realized">' + tk(s.realizedProfit) + '</span>' +
        '<button class="basis-btn" data-act="basis-why">' + U.basisPill('realized') + '</button></div></div>' +
        '<div class="rh-gap"><span>' + L('পার্থক্য — কুরিয়ারের কাছে আটকে থাকা নগদ', 'The gap — cash still with couriers') + '</span>' +
        '<b class="money amber">' + tk(s.earnedProfit - s.realizedProfit) + '</b></div>' +
        U.completeness(s.completeness.have, s.completeness.of) + '</div>' +

        '<div class="card pad"><div class="section-title"><h2>' + L('কীভাবে এই সংখ্যা এলো', 'How the figure is built') + '</h2></div>' +
        '<div class="fig-table">' + lines.map(function (l) {
          return '<div class="fig-row"><span>' + L(l.bn, l.en) + '</span>' +
            '<b class="money ' + (l.v < 0 ? l.tone : 'green') + '">' + tk(l.v) + '</b></div>';
        }).join('') +
        '<div class="fig-row total"><span>' + L('ব্যবসার আসল লাভ', 'Business profit') + '</span>' +
        '<b class="money ' + (net < 0 ? 'red' : 'green') + '">' + tk(net) + '</b></div></div>' +
        '<div style="margin-top:var(--s3)">' + U.provenance(
          net < 0
            ? L('পণ্যে লাভ আছে কিন্তু ব্যবসায় নেই — বেতন, ভাড়া আর বিজ্ঞাপন মিলিয়ে খরচ বিক্রির চেয়ে বেশি। এটা লুকানো হয় না, কারণ এটাই আসল অবস্থা।',
                'The products earn but the business does not — salary, rent and advertising together outrun the sales. This is not softened, because it is the real position.')
            : L('পণ্যের লাভ থেকে সব খরচ বাদ দিয়ে যা থাকে, সেটাই ব্যবসার লাভ।',
                'What remains after every expense is the business profit.'),
          net < 0 ? 'red' : 'green', net < 0 ? I.warn(15) : I.check(15)) + '</div></div>' +

        '<div class="card pad"><div class="section-title"><h2>' + L('কোন পণ্যে কত লাভ', 'Profit by product') + '</h2></div>' +
        '<div style="margin-top:var(--s3)">' + App.products.slice(0, 5).map(function (p, i) {
          var v = [4210, 3180, 2010, 1240, 620][i];
          return U.barRow(L(p.name, p.nameEn), v, 4210);
        }).join('') + '</div></div>' +

        '<button class="btn ghost block" data-go="insights">' + I.spark(15) +
        L('এই হিসাব নিয়ে প্রশ্ন করুন', 'Ask a question about this') + '</button>' +
        '</div>' };
  }

  App.actions['report-range'] = function (k) { App.state.reportRange = k; App.render(); };

  function notFound() {
    return { route: 'cod', title: L('পাওয়া যায়নি', 'Not found'),
      body: U.emptyState({ icon: I.search(24), title: L('এটি নেই', 'No such record'), body: '' }) };
  }
})(window.App);
