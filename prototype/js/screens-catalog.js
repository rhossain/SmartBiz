/* SmartBiz BD — customers, catalogue, the variant matrix, inventory.

   The variant matrix is the answer to the PRD's own open question: a grid of
   colour × size does not fit a 360-pixel screen, so it is not drawn as a grid.
   One axis is drilled at a time, and the bulk bar edits a whole slice at once —
   which is how sellers actually think ("all the maroon ones are 1,300"). */

(function (App) {
  'use strict';

  var L = App.L, n = App.n, tk = App.tk, I = App.I, U = App.ui, esc = App.esc;

  /* ================================================== CUSTOMERS ========= */

  App.screens.customers = {
    view: function () {
      var band = App.state.custBand || 'all';
      var list = App.customers.filter(function (c) {
        return band === 'all' || App.risk(c).band === band;
      });
      var BANDS = [
        { key: 'all', bn: 'সব', en: 'All' },
        { key: 'high', bn: 'বেশি ঝুঁকি', en: 'High risk' },
        { key: 'medium', bn: 'মাঝারি', en: 'Medium' },
        { key: 'low', bn: 'কম ঝুঁকি', en: 'Low risk' },
        { key: 'unknown', bn: 'তথ্য কম', en: 'Too few orders' }
      ];

      return { route: 'customers', nav: 'customers', noBack: true,
        title: L('ক্রেতা', 'Customers'),
        eyebrow: App.unit(App.customers.length, ' জন', 'person', 'people'),
        body: '<div class="stack g4">' +
          '<div class="searchbar"><span>' + I.search(17) + '</span>' +
          '<input class="input" placeholder="' + esc(L('নাম বা মোবাইল নম্বর', 'Name or mobile')) + '"></div>' +
          '<div class="chip-scroll">' + BANDS.map(function (b) {
            var c = App.customers.filter(function (x) { return b.key === 'all' || App.risk(x).band === b.key; }).length;
            return '<button class="chip selectable' + (b.key === band ? '' : ' outline') + '" aria-pressed="' +
              (b.key === band ? 'true' : 'false') + '" data-act="cust-band" data-arg="' + b.key + '">' +
              L(b.bn, b.en) + ' ' + n(c) + '</button>';
          }).join('') + '</div>' +
          U.provenance(L('ঝুঁকি হিসাব হয় ফেরতের অনুপাত থেকে — মোট অর্ডারের কতটা ফেরত এসেছে। তিনটির কম অর্ডার হলে “তথ্য কম” দেখানো হয়, কারণ একটা অর্ডার দিয়ে কাউকে বিচার করা যায় না।',
            'Risk comes from the return ratio — how much of a Customer\'s history came back. Under three orders it reads "too few orders", because one order is not a judgement.'), 'teal') +
          '<div class="card flush">' + list.map(function (c) {
            var r = App.risk(c);
            var ords = App.orders.filter(function (o) { return o.cust === c.id; }).length;
            return '<button class="list-item" data-go="customer/' + c.id + '">' +
              '<span class="lead ' + (r.band === 'high' ? 'red' : r.band === 'medium' ? 'amber' : 'green') + '">' +
              esc(L(c.name, c.nameEn).charAt(0)) + '</span>' +
              '<span class="body"><b>' + esc(L(c.name, c.nameEn)) + '</b>' +
              '<span>' + esc(L(c.area, c.areaEn)) + ' · ' + n(c.delivered) + L(' ডেলিভারি', ' delivered') +
              (c.returned ? ' · ' + n(c.returned) + L(' ফেরত', ' back') : '') + '</span></span>' +
              U.riskChip(c, true) + '<span class="chev">' + I.chev(16) + '</span></button>';
          }).join('') + '</div></div>' };
    }
  };

  App.actions['cust-band'] = function (b) { App.state.custBand = b; App.render(); };

  App.screens.customer = {
    view: function (args) {
      var c = App.get.customer(args[0]);
      if (!c) return notFound();
      var r = App.risk(c);
      var mine = App.orders.filter(function (o) { return o.cust === c.id; });
      var lifetime = 0, lifeProfit = 0;
      mine.forEach(function (o) { var e = App.econ(o); lifetime += e.goods; lifeProfit += e.profit; });

      var body = '<div class="stack g4">' +
        '<div class="card pad prof-head">' +
          '<div class="prof-av ' + (r.band === 'high' ? 'red' : 'green') + '">' + esc(L(c.name, c.nameEn).charAt(0)) + '</div>' +
          '<h2>' + esc(L(c.name, c.nameEn)) + '</h2>' +
          '<span class="prof-sub">' + esc(c.phone) + ' · ' + esc(L(c.area, c.areaEn)) + '</span>' +
          '<div class="row" style="justify-content:center;gap:var(--s2);margin-top:var(--s3)">' +
          U.riskChip(c) + '<span class="chip outline sm">' + L('ক্রেতা ', 'Since ') + App.date(c.since) + '</span></div>' +
          '<div class="grid c2" style="margin-top:var(--s4)">' +
            '<button class="btn ghost" data-act="noop">' + L('কল করুন', 'Call') + '</button>' +
            '<button class="btn primary" data-act="do-repeat" data-arg="' + (mine[0] ? mine[0].id : '') + '">' + L('নতুন অর্ডার', 'New order') + '</button>' +
          '</div></div>';

      /* the risk explanation — a ratio without its working is a superstition */
      body += '<div class="card pad"><div class="section-title"><h2>' + L('ফেরতের হিসাব', 'Return history') + '</h2></div>' +
        '<div class="ratio-bar"><i class="ok" style="width:' + (100 - r.pct) + '%"></i><i class="bad" style="width:' + r.pct + '%"></i></div>' +
        '<div class="ratio-legend"><span><i class="ok"></i>' + n(c.delivered) + L(' টি হাতে পৌঁছেছে', ' delivered') + '</span>' +
        '<span><i class="bad"></i>' + n(c.returned) + L(' টি ফেরত এসেছে', ' came back') + '</span></div>' +
        '<div style="margin-top:var(--s3)">' + U.provenance(
          r.band === 'unknown'
            ? L('মাত্র ' + n(r.total) + 'টি অর্ডার — এত কম তথ্যে ঝুঁকি বলা যায় না। তিনটি অর্ডারের পর হিসাব দেখানো শুরু হবে।',
                'Only ' + n(r.total) + ' orders so far — too little to call. The ratio appears after three.')
            : L('মোট ' + n(r.total) + 'টি অর্ডারের ' + n(c.returned) + 'টি ফেরত এসেছে, অর্থাৎ ' + n(r.pct) + '%। ' +
                (r.band === 'high' ? 'অগ্রিম নেওয়ার কথা ভাবতে পারেন — তবে ব্লক করা হয়নি, সিদ্ধান্ত আপনার।' : 'এটি স্বাভাবিকের মধ্যে।'),
                n(c.returned) + ' of ' + n(r.total) + ' orders came back — ' + n(r.pct) + '%. ' +
                (r.band === 'high' ? 'Consider asking for an advance. Nothing is blocked; the call is yours.' : 'That is within the normal range.')),
          r.band === 'high' ? 'red' : 'teal', r.band === 'high' ? I.warn(15) : I.info(15)) + '</div>' +
        (c.note ? '<div class="note-block" style="margin-top:var(--s3)"><span class="eyebrow">' + L('আপনার নোট', 'Your note') + '</span><p>' + esc(c.note) + '</p></div>' : '') +
        '</div>';

      if (App.seesProfit()) {
        body += '<div class="grid c2 strip">' +
          '<div class="card pad cash-cell"><span class="eyebrow">' + L('সব মিলিয়ে কিনেছেন', 'Lifetime purchases') + '</span>' +
          '<span class="money mid">' + tk(lifetime) + '</span><span class="cell-sub">' + App.unit(mine.length, ' অর্ডার', 'order', 'orders') + '</span></div>' +
          '<div class="card pad cash-cell"><span class="eyebrow">' + L('এই ক্রেতা থেকে লাভ', 'Profit from them') + '</span>' +
          '<span class="money mid ' + (lifeProfit < 0 ? 'red' : 'green') + '">' + tk(lifeProfit) + '</span>' +
          '<span class="cell-sub">' + L('ফেরতের ক্ষতি বাদ দিয়ে', 'after return losses') + '</span></div>' +
          '</div>';
      }

      body += '<div class="card flush"><div class="card-head"><h3>' + L('অর্ডারের ইতিহাস', 'Order history') + '</h3>' +
        '<span class="chip sm">' + n(mine.length) + '</span></div>' +
        (mine.length ? mine.map(App.orderRow).join('')
          : '<div style="padding:var(--s5)">' + U.emptyState({ icon: I.orders(22),
              title: L('এখনো অর্ডার নেই', 'No orders yet'), body: L('এই ক্রেতা যোগ হয়েছেন কিন্তু কিছু কেনেননি।', 'Added, but has not bought yet.') }) + '</div>') +
        '</div></div>';

      return { route: 'customers', nav: 'customers', title: L('ক্রেতা', 'Customer'),
        eyebrow: c.id, body: body };
    }
  };

  /* ================================================== PRODUCTS ========== */

  App.screens.products = {
    view: function (args) {
      if (args[0] === 'new') return newProduct();

      var cats = [];
      App.products.forEach(function (p) { if (cats.indexOf(p.cat) === -1) cats.push(p.cat); });

      return { route: 'products', nav: 'products', noBack: true,
        title: L('পণ্য', 'Products'),
        eyebrow: App.unit(App.products.length, ' টি পণ্য', 'product', 'products'),
        acts: '<button class="btn sm primary" data-go="products/new">' + I.plus(15) + L('নতুন', 'New') + '</button>',
        body: '<div class="stack g4">' +
          '<div class="searchbar"><span>' + I.search(17) + '</span>' +
          '<input class="input" placeholder="' + esc(L('পণ্যের নাম বা কোড', 'Name or SKU')) + '"></div>' +
          '<div class="chip-scroll"><button class="chip selectable" aria-pressed="true" data-act="noop">' +
          L('সব', 'All') + '</button>' + cats.map(function (c) {
            var p0 = App.products.filter(function (p) { return p.cat === c; })[0];
            return '<button class="chip outline selectable" data-act="noop">' + esc(L(c, p0.catEn)) + '</button>';
          }).join('') + '</div>' +
          '<div class="card flush">' + App.products.map(function (p) {
            var low = App.lowVariants(p);
            var vc = Object.keys(p.stock).length;
            return '<button class="list-item" data-go="product/' + p.id + '">' +
              '<span class="lead teal">' + I.tag(17) + '</span>' +
              '<span class="body"><b>' + esc(L(p.name, p.nameEn)) +
              (low.length ? ' <i class="chip brass sm">' + n(low.length) + L(' টি কম', ' low') + '</i>' : '') + '</b>' +
              '<span>' + p.sku + ' · ' + (p.variantAxes.length ? n(vc) + L(' ধরন', ' variants') : L('একটাই ধরন', 'single')) +
              ' · ' + L('স্টক ', 'stock ') + n(App.stockOf(p)) + '</span></span>' +
              ((App.seesPrice() || App.seesCost()) ? '<span class="trail">' +
                (App.seesPrice() ? '<span class="money">' + tk(p.price) + '</span>' : '') +
                (App.seesCost() ? '<span>' + L('ক্রয় ', 'cost ') + App.tkPlain(p.cost) + '</span>' : '') + '</span>' : '') +
              '<span class="chev">' + I.chev(16) + '</span></button>';
          }).join('') + '</div></div>' };
    }
  };

  function newProduct() {
    return { route: 'products', nav: 'products', title: L('নতুন পণ্য', 'New product'),
      eyebrow: L('শুধু নাম আর দাম দিলেই চলবে', 'Name and price are enough'),
      body: '<div class="stack g4">' +
        U.provenance(L('এখনই সব ঘর ভরতে হবে না। নাম আর বিক্রয় মূল্য দিলেই পণ্যটি অর্ডারে ব্যবহার করা যাবে; বাকিটা পরে।',
          'You do not have to fill everything now. Name and selling price are enough to start selling; finish the rest later.'), 'teal') +
        '<div class="card pad"><div class="stack g3">' +
        U.field({ label: L('পণ্যের নাম', 'Product name'), required: true, placeholder: L('যেমন: এমব্রয়ডারি কুর্তি', 'e.g. Embroidered Kurti') }) +
        U.field({ label: L('কোড / SKU', 'Code / SKU'), placeholder: 'KRT-EMB',
          hint: L('না দিলে নিজে থেকে একটা বানিয়ে দেওয়া হবে।', 'Left blank, one is generated for you.') }) +
        U.field({ label: L('ধরন', 'Category'), type: 'select', options: [
          { label: L('কুর্তি', 'Kurti') }, { label: L('শাড়ি', 'Saree') }, { label: L('থ্রি-পিস', 'Three-piece') },
          { label: L('ওড়না', 'Dupatta') }, { label: L('গহনা', 'Jewellery') }, { label: L('নতুন ধরন…', 'New category…') }
        ] }) +
        '</div></div>' +
        '<div class="card pad"><div class="section-title"><h2>' + L('দাম', 'Pricing') + '</h2></div>' +
        '<div class="grid c2">' +
        U.field({ label: L('বিক্রয় মূল্য', 'Selling price'), prefix: '৳', money: true, required: true, value: '1250' }) +
        U.field({ label: L('ক্রয়মূল্য', 'Cost price'), prefix: '৳', money: true, value: '720' }) +
        '</div>' +
        '<div style="margin-top:var(--s3)">' + U.provenance(
          L('ক্রয়মূল্য না দিলে লাভের হিসাব “অসম্পূর্ণ” হিসেবে দেখানো হবে — আন্দাজে বসানো হবে না।',
            'Without a cost price, profit is reported as incomplete rather than estimated.'), 'brass', I.warn(15)) + '</div></div>' +
        '<div class="card pad"><div class="section-title"><h2>' + L('ধরন ও সাইজ', 'Variants') + '</h2></div>' +
        U.toggleRow({ title: L('এই পণ্যের রঙ বা সাইজ আছে', 'This product has colours or sizes'),
          sub: L('চালু করলে পরের ধাপে ছক বানানো যাবে', 'Turn on to build the matrix in the next step'), on: false }) +
        '</div>' +
        '<div class="card pad"><div class="section-title"><h2>' + L('স্টক', 'Stock') + '</h2></div>' +
        '<div class="grid c2">' +
        U.field({ label: L('এখন হাতে আছে', 'On hand now'), value: '0' }) +
        U.field({ label: L('কমে গেলে জানাবেন', 'Alert me below'), value: '3' }) +
        '</div></div>' +
        '<div class="sticky-foot">' +
        '<button class="btn ghost" data-act="back">' + L('বাতিল', 'Cancel') + '</button>' +
        '<button class="btn primary" data-act="saved-product-full">' + L('পণ্য সংরক্ষণ', 'Save product') + '</button></div>' +
        '</div>' };
  }

  App.actions['saved-product-full'] = function () {
    U.toast(L('পণ্য সংরক্ষিত হয়েছে', 'Product saved'));
    setTimeout(function () { App.go('products'); }, 600);
  };

  App.screens.product = {
    view: function (args) {
      var p = App.get.product(args[0]);
      if (!p) return notFound();
      if (args[1] === 'variants') return variantMatrix(p);

      var low = App.lowVariants(p);
      var sold = 0;
      App.orders.forEach(function (o) {
        o.lines.forEach(function (l) { if (l.p === p.id) sold += l.qty - (l.returned || 0); });
      });
      var margin = p.price ? ((p.price - p.cost) / p.price) * 100 : 0;

      var body = '<div class="stack g4">' +
        '<div class="card pad"><div class="row">' +
          '<div><h2 style="font-size:var(--fs-xl);font-family:var(--font-display)">' + esc(L(p.name, p.nameEn)) + '</h2>' +
          '<span class="cell-sub">' + p.sku + ' · ' + esc(L(p.cat, p.catEn)) + '</span></div>' +
          '<span class="spacer"></span>' +
          '<button class="iconbtn bordered" data-act="noop">' + I.gear(17) + '</button></div>' +
        ((App.seesPrice() || App.seesCost()) ? '<div class="price-row">' +
          (App.seesPrice() ? '<div><span class="eyebrow">' + L('বিক্রয় মূল্য', 'Selling price') + '</span><span class="money big">' + tk(p.price) + '</span></div>' : '') +
          (App.seesCost() ? '<div><span class="eyebrow">' + L('ক্রয়মূল্য', 'Purchase Cost') + '</span><span class="money mid">' + tk(p.cost) + '</span></div>' : '') +
          (App.seesProfit() ? '<div><span class="eyebrow">' + L('মার্জিন', 'Margin') + '</span><span class="money mid green">' + n(margin, 1) + '%</span></div>' : '') +
          '</div>' : '') +
        '</div>';

      if (p.variantAxes.length) {
        body += '<button class="feature-row" data-go="product/' + p.id + '/variants">' +
          '<span class="fr-ic teal">' + I.grid(20) + '</span>' +
          '<span class="fr-body"><b>' + L('ধরনের ছক', 'Variant matrix') + '</b>' +
          '<span>' + p.variantAxes.map(function (a) { return n(a.values.length) + ' ' + L(a.label, a.labelEn); }).join(' × ') +
          ' = ' + n(Object.keys(p.stock).length) + L(' টি সংযোগ', ' combinations') + '</span></span>' +
          '<span class="chev">' + I.chev(16) + '</span></button>';
      }

      if (low.length) {
        body += '<div class="card pad">' + U.provenance(
          L('<b>' + n(low.length) + 'টি ধরনের স্টক কম</b> — ' + low.slice(0, 3).map(function (k) { return App.variantLabel(p, k); }).join(', ') +
            (low.length > 3 ? ' আরও…' : ''),
            '<b>' + n(low.length) + ' variants are low</b> — ' + low.slice(0, 3).map(function (k) { return App.variantLabel(p, k); }).join(', ') +
            (low.length > 3 ? ' and more' : '')), 'brass', I.warn(15)) +
          '<button class="btn ghost block sm" style="margin-top:var(--s3)" data-go="inventory/' + p.id + '">' +
          L('স্টক ঠিক করুন', 'Adjust stock') + '</button></div>';
      }

      body += '<div class="grid c2 strip">' +
        '<div class="card pad cash-cell"><span class="eyebrow">' + L('হাতে আছে', 'On hand') + '</span>' +
        '<span class="money mid">' + n(App.stockOf(p)) + '</span><span class="cell-sub">' + L('সব ধরন মিলিয়ে', 'across all variants') + '</span></div>' +
        '<div class="card pad cash-cell"><span class="eyebrow">' + L('বিক্রি হয়েছে', 'Sold') + '</span>' +
        '<span class="money mid">' + n(sold) + '</span><span class="cell-sub">' + L('ফেরত বাদ দিয়ে', 'net of returns') + '</span></div>' +
        '</div>';

      body += '<div class="card pad"><span class="eyebrow">' + L('কাজ', 'Actions') + '</span>' +
        '<div class="act-grid" style="margin-top:var(--s3)">' +
        '<button class="act-tile" data-go="inventory/' + p.id + '">' + I.box(18) + L('স্টক বদলান', 'Adjust stock') + '</button>' +
        (p.variantAxes.length ? '<button class="act-tile" data-go="product/' + p.id + '/variants">' + I.grid(18) + L('ধরনের ছক', 'Variants') + '</button>' : '') +
        '<button class="act-tile" data-act="noop">' + I.tag(18) + L('দাম বদলান', 'Change price') + '</button>' +
        '<button class="act-tile" data-act="noop">' + I.share(18) + L('ক্রেতাকে পাঠান', 'Share') + '</button>' +
        '</div></div></div>';

      return { route: 'products', nav: 'products', title: L('পণ্য', 'Product'), eyebrow: p.id, body: body };
    }
  };

  /* ------------------------------------------------ THE VARIANT MATRIX */

  function variantMatrix(p) {
    var st = App.state.matrix = App.state.matrix || {};
    if (st.product !== p.id) { st.product = p.id; st.primary = 0; st.slice = null; st.grid = false; }

    var axes = p.variantAxes;
    var single = axes.length < 2;
    var primary = axes[st.primary] || axes[0];
    var secondary = single ? null : axes[st.primary === 0 ? 1 : 0];

    /* key builder respecting the product's own axis order, whatever the drill order is */
    function keyFor(primaryValue, secondaryValue) {
      if (single) return primaryValue;
      return st.primary === 0 ? primaryValue + '|' + secondaryValue : secondaryValue + '|' + primaryValue;
    }

    function sliceKeys(primaryValue) {
      if (single) return [primaryValue];
      return secondary.values.map(function (sv) { return keyFor(primaryValue, sv.v); });
    }

    var body = '<div class="stack g4">';

    /* --- the explanation, because this screen's shape is a deliberate answer --- */
    body += U.provenance(
      single
        ? L('এই পণ্যের একটাই মাত্রা — সোজা তালিকা। ছকের দরকার নেই।', 'This product has one axis, so a plain list is enough. No grid needed.')
        : L('ছোট পর্দায় ' + n(axes[0].values.length) + '×' + n(axes[1].values.length) +
            ' ছক আঁটে না, তাই একবারে এক মাত্রা। প্রথমে ' + L(primary.label, primary.labelEn) +
            ' বাছুন, তারপর ভেতরে সব ' + L(secondary.label, secondary.labelEn) + ' একসাথে বদলানো যাবে।',
            'A ' + n(axes[0].values.length) + '×' + n(axes[1].values.length) +
            ' grid does not fit a small screen, so one axis at a time. Pick a ' + primary.labelEn.toLowerCase() +
            ', then edit every ' + secondary.labelEn.toLowerCase() + ' inside it at once.'), 'teal', I.grid(15));

    /* --- drill-order and view controls --- */
    if (!single) {
      body += '<div class="matrix-ctl">' +
        '<div class="seg small">' + axes.map(function (a, i) {
          return '<button data-act="matrix-axis" data-arg="' + i + '" aria-pressed="' + (i === st.primary ? 'true' : 'false') + '">' +
            L('আগে ' + a.label, a.labelEn + ' first') + '</button>';
        }).join('') + '</div>' +
        '<button class="chip outline sm" data-act="matrix-grid">' + I.grid(13) +
        (st.grid ? L('তালিকা দেখুন', 'List view') : L('পুরো ছক', 'Whole grid')) + '</button>' +
        '</div>';
    }

    /* --- whole-grid view: honest about being cramped on a phone --- */
    if (st.grid && !single) {
      body += '<div class="card flush"><div class="tbl-wrap"><table class="tbl matrix-tbl">' +
        '<thead><tr><th>' + L(primary.label, primary.labelEn) + '</th>' +
        secondary.values.map(function (sv) { return '<th class="num">' + esc(L(sv.v, sv.vEn || sv.v)) + '</th>'; }).join('') +
        '<th class="num">' + L('মোট', 'Total') + '</th></tr></thead><tbody>' +
        primary.values.map(function (pv) {
          var rowTotal = 0;
          var cells = secondary.values.map(function (sv) {
            var k = keyFor(pv.v, sv.v);
            var q = p.stock[k] || 0;
            var off = p.inactive.indexOf(k) > -1;
            /* A deactivated combination prints "—", so counting its units would
               show a total the visible cells do not add up to. The units are not
               lost: the slice list flags the off combination and level 2 shows it. */
            if (!off) rowTotal += q;
            var over = p.priceOverride[k] !== undefined;
            return '<td class="num cell' + (off ? ' off' : q === 0 ? ' zero' : q <= p.reorderAt ? ' low' : '') + '"' +
              ' data-act="cell-edit" data-arg="' + esc(k) + '">' +
              (off ? '—' : n(q)) + (over ? '<i class="dot" title="price override"></i>' : '') + '</td>';
          }).join('');
          return '<tr><th class="rowh">' + esc(L(pv.v, pv.vEn || pv.v)) + '</th>' + cells +
            '<td class="num tot">' + n(rowTotal) + '</td></tr>';
        }).join('') + '</tbody></table></div>' +
        '<div class="grid-legend"><span><i class="sw low"></i>' + L('কম', 'Low') + '</span>' +
        '<span><i class="sw zero"></i>' + L('শেষ', 'Out') + '</span>' +
        '<span><i class="sw off"></i>' + L('বন্ধ', 'Inactive') + '</span>' +
        '<span><i class="dot"></i>' + L('আলাদা দাম', 'Own price') + '</span></div></div>' +
        U.provenance(L('পুরো ছক দেখা যায়, কিন্তু ছোট পর্দায় এটা পড়ার জন্য — বদলানোর জন্য নয়। যেকোনো ঘরে চাপ দিলে সেটাই খোলা যাবে।',
          'The whole grid is for reading, not editing, on a small screen. Tapping any cell opens just that one.'), 'brass');
      body += '</div>';
      return { route: 'products', nav: 'products', title: L('ধরনের ছক', 'Variant matrix'),
        eyebrow: esc(L(p.name, p.nameEn)), body: body };
    }

    /* --- level 1: the slices --- */
    if (!st.slice) {
      body += '<div class="card flush"><div class="card-head"><h3>' + L(primary.label + ' বাছুন', 'Choose a ' + primary.labelEn.toLowerCase()) + '</h3>' +
        '<span class="chip sm">' + n(primary.values.length) + '</span></div>' +
        primary.values.map(function (pv) {
          var keys = sliceKeys(pv.v);
          var total = 0, lowN = 0, offN = 0;
          keys.forEach(function (k) {
            var q = p.stock[k] || 0;
            if (p.inactive.indexOf(k) > -1) { offN++; return; }
            total += q;
            if (q <= p.reorderAt) lowN++;
          });
          return '<button class="slice-row" data-act="matrix-slice" data-arg="' + esc(pv.v) + '">' +
            '<span class="sr-swatch" data-v="' + esc(pv.v) + '">' +
            (primary.key === 'colour' ? '' : esc(L(pv.v, pv.vEn || pv.v))) + '</span>' +
            '<span class="sr-body"><b>' + esc(L(pv.v, pv.vEn || pv.v)) + '</b>' +
            '<span>' + (single ? '' : n(keys.length) + ' ' + L(secondary.label, secondary.labelEn) + ' · ') +
            L('মোট স্টক ', 'stock ') + n(total) +
            (lowN ? ' · ' + n(lowN) + L(' টি কম', ' low') : '') +
            (offN ? ' · ' + n(offN) + L(' টি বন্ধ', ' off') : '') + '</span></span>' +
            (lowN ? '<span class="chip brass sm">' + I.warn(12) + '</span>' : '') +
            '<span class="chev">' + I.chev(16) + '</span></button>';
        }).join('') + '</div>';

      body += '<button class="btn ghost block" data-act="matrix-add">' + I.plus(15) +
        L('নতুন ' + primary.label + ' যোগ করুন', 'Add a ' + primary.labelEn.toLowerCase()) + '</button>';

      body += '</div>';
      return { route: 'products', nav: 'products', title: L('ধরনের ছক', 'Variant matrix'),
        eyebrow: esc(L(p.name, p.nameEn)) + ' · ' + n(Object.keys(p.stock).length) + L(' সংযোগ', ' combinations'),
        body: body };
    }

    /* --- level 2: one slice, every secondary value, plus the bulk bar --- */
    var slice = st.slice;
    var keys = sliceKeys(slice);
    var sliceTotal = 0;
    keys.forEach(function (k) { sliceTotal += p.stock[k] || 0; });

    body += '<div class="slice-head">' +
      '<button class="iconbtn bordered" data-act="matrix-up">' + I.back(17) + '</button>' +
      '<span class="sr-swatch big" data-v="' + esc(slice) + '">' +
      (primary.key === 'colour' ? '' : esc(slice)) + '</span>' +
      '<div><b>' + esc(L(slice, slice)) + '</b>' +
      '<span>' + L('মোট স্টক ', 'stock ') + n(sliceTotal) + ' · ' + n(keys.length) + ' ' +
      (single ? '' : L(secondary.label, secondary.labelEn)) + '</span></div></div>';

    /* the bulk bar is the point: sellers price a colour, not a cell */
    if (!single) {
      body += '<div class="bulk-bar">' +
        '<span class="bb-label">' + L('পুরো ' + slice + ' একসাথে', 'All of ' + slice + ' at once') + '</span>' +
        '<div class="bb-acts">' +
          '<button class="chip outline sm" data-act="bulk-price" data-arg="' + esc(slice) + '">' + L('দাম বসান', 'Set price') + '</button>' +
          '<button class="chip outline sm" data-act="bulk-stock" data-arg="' + esc(slice) + '">' + L('স্টক বসান', 'Set stock') + '</button>' +
          '<button class="chip outline sm" data-act="bulk-off" data-arg="' + esc(slice) + '">' + L('সব বন্ধ করুন', 'Turn all off') + '</button>' +
        '</div></div>';
    }

    body += '<div class="card flush">' + (single ? [{ v: slice }] : secondary.values).map(function (sv) {
      var k = single ? slice : keyFor(slice, sv.v);
      var q = p.stock[k] || 0;
      var off = p.inactive.indexOf(k) > -1;
      var price = App.unitPrice(p, k);
      var over = p.priceOverride[k] !== undefined;
      return '<div class="vrow' + (off ? ' is-off' : '') + '">' +
        '<div class="vr-name"><b>' + esc(L(sv.v, sv.vEn || sv.v)) + '</b>' +
        '<span>' + (off ? L('বন্ধ — বিক্রি হবে না', 'Off — not sellable')
          : q === 0 ? L('স্টক শেষ', 'Out of stock')
          : q <= p.reorderAt ? L('কম — ' + n(q) + ' টি', 'Low — ' + n(q) + ' left')
          : L(n(q) + ' টি আছে', n(q) + ' in stock')) + '</span></div>' +
        '<div class="qty-stepper sm"><button data-act="vstock" data-arg="' + esc(k) + '|-1">−</button>' +
        '<span>' + n(q) + '</span><button data-act="vstock" data-arg="' + esc(k) + '|1">+</button></div>' +
        (App.seesPrice() ? '<button class="vr-price' + (over ? ' is-over' : '') + '" data-act="vprice" data-arg="' + esc(k) + '">' +
          '<span class="money">' + tk(price) + '</span>' +
          '<span>' + (over ? L('আলাদা দাম', 'own price') : L('মূল দাম', 'base price')) + '</span></button>' : '') +
        '<button class="switch sm" role="switch" aria-checked="' + (off ? 'false' : 'true') + '"' +
        ' data-act="vactive" data-arg="' + esc(k) + '"></button>' +
        '</div>';
    }).join('') + '</div>';

    body += U.provenance(L('“আলাদা দাম” মানে এই সংযোগটি মূল দামের বাইরে — যেমন XL সাইজে কাপড় বেশি লাগে। মূল দাম বদলালে এগুলো বদলাবে না।',
      'An "own price" means this combination sits outside the base price — an XL uses more cloth. Changing the base price leaves these alone.'), 'brass');

    body += '</div>';

    return { route: 'products', nav: 'products', title: esc(L(slice, slice)),
      eyebrow: esc(L(p.name, p.nameEn)) + ' · ' + L(primary.label, primary.labelEn),
      body: body };
  }

  App.actions['matrix-axis'] = function (i) {
    App.state.matrix.primary = +i;
    App.state.matrix.slice = null;
    App.render();
    U.toast(L('ছকের ক্রম বদলেছে', 'Drill order changed'));
  };
  App.actions['matrix-grid'] = function () { App.state.matrix.grid = !App.state.matrix.grid; App.render(); };
  App.actions['matrix-slice'] = function (v) { App.state.matrix.slice = v; App.render(); };
  App.actions['matrix-up'] = function () { App.state.matrix.slice = null; App.render(); };

  App.actions['matrix-add'] = function () {
    var p = App.get.product(App.state.matrix.product);
    var ax = p.variantAxes[App.state.matrix.primary];
    U.openSheet({
      title: L('নতুন ' + ax.label, 'New ' + ax.labelEn.toLowerCase()),
      sub: L('যোগ করলে বাকি মাত্রার সব সংযোগ তৈরি হবে, স্টক শূন্য দিয়ে শুরু।',
             'Adding one creates every combination with the other axis, starting at zero stock.'),
      body: U.field({ label: L(ax.label, ax.labelEn), required: true,
        placeholder: L('যেমন: সবুজ', 'e.g. Green') }),
      foot: '<button class="btn ghost" data-act="close-sheet">' + L('বাতিল', 'Cancel') + '</button>' +
        '<button class="btn primary" data-act="matrix-added">' + L('যোগ করুন', 'Add') + '</button>'
    });
  };
  App.actions['matrix-added'] = function () {
    U.closeSheet();
    U.toast(L('যোগ হয়েছে — ৪টি নতুন সংযোগ তৈরি হয়েছে', 'Added — 4 new combinations created'));
  };

  App.actions['vstock'] = function (arg) {
    var parts = arg.split('|');
    var delta = +parts.pop();
    var k = parts.join('|');
    var p = App.get.product(App.state.matrix.product);
    p.stock[k] = Math.max(0, (p.stock[k] || 0) + delta);
    App.render();
  };

  App.actions['vactive'] = function (k) {
    var p = App.get.product(App.state.matrix.product);
    var i = p.inactive.indexOf(k);
    if (i > -1) p.inactive.splice(i, 1); else p.inactive.push(k);
    App.render();
    U.toast(i > -1 ? L(App.variantLabel(p, k) + ' চালু হয়েছে', App.variantLabel(p, k) + ' turned on')
                   : L(App.variantLabel(p, k) + ' বন্ধ হয়েছে — স্টক মুছে যায়নি', App.variantLabel(p, k) + ' turned off — stock is kept'));
  };

  App.actions['vprice'] = function (k) {
    var p = App.get.product(App.state.matrix.product);
    var over = p.priceOverride[k] !== undefined;
    U.openSheet({
      title: L('এই সংযোগের দাম', 'Price for this combination'),
      sub: esc(App.variantLabel(p, k, ' · ')) + ' — ' + L('মূল দাম ' + App.tkPlain(p.price), 'base price ' + App.tkPlain(p.price)),
      body: '<div class="stack g3">' +
        U.field({ label: L('দাম', 'Price'), prefix: '৳', money: true, id: 'vprice-in',
          value: String(App.unitPrice(p, k)) }) +
        U.toggleRow({ title: L('মূল দাম ব্যবহার করুন', 'Use the base price'),
          sub: L('চালু করলে আলাদা দাম মুছে যাবে', 'Turning this on removes the override'), on: !over }) +
        U.provenance(L('মূল দাম পরে বদলালে আলাদা দাম দেওয়া সংযোগগুলো বদলাবে না — সেটাই “আলাদা” হওয়ার মানে।',
          'Changing the base price later will not move an overridden combination — that is what "own price" means.'), 'brass') +
        '</div>',
      foot: '<button class="btn ghost" data-act="close-sheet">' + L('বাতিল', 'Cancel') + '</button>' +
        '<button class="btn primary" data-act="vprice-save" data-arg="' + esc(k) + '">' + L('সংরক্ষণ', 'Save') + '</button>'
    });
  };

  App.actions['vprice-save'] = function (k) {
    var input = document.getElementById('vprice-in');
    var p = App.get.product(App.state.matrix.product);
    var val = input ? parseInt(String(input.value).replace(/[^\d]/g, ''), 10) : NaN;
    U.closeSheet();
    if (!isNaN(val) && val !== p.price) p.priceOverride[k] = val;
    else delete p.priceOverride[k];
    App.render();
    U.toast(L('দাম সংরক্ষিত হয়েছে', 'Price saved'), '', L('ফিরিয়ে নিন', 'Undo'));
  };

  App.actions['bulk-price'] = function (slice) {
    var p = App.get.product(App.state.matrix.product);
    var st = App.state.matrix;
    var secondary = p.variantAxes[st.primary === 0 ? 1 : 0];
    U.openSheet({
      title: L('পুরো ' + slice + ' এর দাম', 'Price every ' + slice),
      sub: L('একবারে ' + n(secondary.values.length) + 'টি সংযোগে বসবে — এক এক করে করতে হবে না।',
             'Applies to all ' + n(secondary.values.length) + ' combinations at once.'),
      body: '<div class="stack g3">' +
        U.field({ label: L('দাম', 'Price'), prefix: '৳', money: true, id: 'bulk-price-in', value: String(p.price) }) +
        '<div class="bulk-preview"><span class="eyebrow">' + L('এগুলোতে বসবে', 'Will apply to') + '</span>' +
        '<div class="row wrap" style="gap:6px;margin-top:6px">' + secondary.values.map(function (sv) {
          return '<span class="chip outline sm">' + esc(slice) + ' · ' + esc(sv.v) + '</span>';
        }).join('') + '</div></div>' +
        U.toggleRow({ title: L('যেগুলোর আলাদা দাম আছে সেগুলোও বদলান', 'Overwrite combinations that already have their own price'),
          sub: L('বন্ধ রাখলে হাতে বসানো দামগুলো অটুট থাকবে', 'Left off, your hand-set prices are preserved'), on: false }) +
        '</div>',
      foot: '<button class="btn ghost" data-act="close-sheet">' + L('বাতিল', 'Cancel') + '</button>' +
        '<button class="btn primary" data-act="bulk-price-save" data-arg="' + esc(slice) + '">' +
        L('সবগুলোতে বসান', 'Apply to all') + '</button>'
    });
  };

  App.actions['bulk-price-save'] = function (slice) {
    var input = document.getElementById('bulk-price-in');
    var val = input ? parseInt(String(input.value).replace(/[^\d]/g, ''), 10) : NaN;
    var p = App.get.product(App.state.matrix.product);
    var st = App.state.matrix;
    var secondary = p.variantAxes[st.primary === 0 ? 1 : 0];
    U.closeSheet();
    if (isNaN(val)) { U.toast(L('দাম লিখুন', 'Enter a price'), 'warn'); return; }
    var count = 0;
    secondary.values.forEach(function (sv) {
      var k = st.primary === 0 ? slice + '|' + sv.v : sv.v + '|' + slice;
      if (p.priceOverride[k] !== undefined) return;
      if (val !== p.price) p.priceOverride[k] = val;
      count++;
    });
    App.render();
    U.toast(L(n(count) + 'টি সংযোগে দাম বসেছে', 'Price applied to ' + n(count) + ' combinations'), '', L('ফিরিয়ে নিন', 'Undo'));
  };

  App.actions['bulk-stock'] = function (slice) {
    var p = App.get.product(App.state.matrix.product);
    var st = App.state.matrix;
    var secondary = p.variantAxes[st.primary === 0 ? 1 : 0];
    U.openSheet({
      title: L('পুরো ' + slice + ' এর স্টক', 'Stock for every ' + slice),
      sub: L('নতুন চালান এলে এভাবে একবারে বসানো যায়।', 'Useful when a new shipment arrives.'),
      body: '<div class="stack g3">' +
        U.field({ label: L('প্রতিটিতে কত যোগ হবে', 'Add this much to each'), value: '5', id: 'bulk-stock-in',
          hint: L('মোট ' + n(secondary.values.length) + ' × এই সংখ্যা যোগ হবে', 'Total added = ' + n(secondary.values.length) + ' × this') }) +
        U.field({ label: L('কেন', 'Why'), type: 'select', options: [
          { label: L('নতুন চালান এসেছে', 'New shipment received') },
          { label: L('গুনে দেখা হয়েছে', 'Physical count') },
          { label: L('ফেরত এসেছে', 'Returned goods') },
          { label: L('নষ্ট হয়েছে', 'Damaged / written off') }
        ] }) +
        U.provenance(L('স্টক বদলের কারণ লেখা থাকে, তাই পরে কেন কমেছিল সেটা খুঁজে পাওয়া যায়।',
          'The reason is recorded, so later you can find out why a count moved.'), 'teal', I.shield(15)) +
        '</div>',
      foot: '<button class="btn ghost" data-act="close-sheet">' + L('বাতিল', 'Cancel') + '</button>' +
        '<button class="btn primary" data-act="bulk-stock-save" data-arg="' + esc(slice) + '">' + L('যোগ করুন', 'Add') + '</button>'
    });
  };

  App.actions['bulk-stock-save'] = function (slice) {
    var input = document.getElementById('bulk-stock-in');
    var val = input ? parseInt(String(input.value).replace(/[^\d]/g, ''), 10) : NaN;
    var p = App.get.product(App.state.matrix.product);
    var st = App.state.matrix;
    var secondary = p.variantAxes[st.primary === 0 ? 1 : 0];
    U.closeSheet();
    if (isNaN(val)) { U.toast(L('সংখ্যা লিখুন', 'Enter a number'), 'warn'); return; }
    var added = 0;
    secondary.values.forEach(function (sv) {
      var k = st.primary === 0 ? slice + '|' + sv.v : sv.v + '|' + slice;
      p.stock[k] = (p.stock[k] || 0) + val;
      added += val;
    });
    App.render();
    U.toast(L('মোট ' + n(added) + ' টি যোগ হয়েছে', n(added) + ' units added'), '', L('ফিরিয়ে নিন', 'Undo'));
  };

  App.actions['bulk-off'] = function (slice) {
    var p = App.get.product(App.state.matrix.product);
    var st = App.state.matrix;
    var secondary = p.variantAxes[st.primary === 0 ? 1 : 0];
    var n2 = 0;
    secondary.values.forEach(function (sv) {
      var k = st.primary === 0 ? slice + '|' + sv.v : sv.v + '|' + slice;
      if (p.inactive.indexOf(k) === -1) { p.inactive.push(k); n2++; }
    });
    App.render();
    U.toast(L(n(n2) + 'টি বন্ধ হয়েছে — স্টকের হিসাব মুছে যায়নি', n(n2) + ' turned off — the stock counts are kept'),
      'warn', L('ফিরিয়ে নিন', 'Undo'));
  };

  App.actions['cell-edit'] = function (k) {
    App.state.matrix.grid = false;
    App.state.matrix.slice = k.split('|')[App.state.matrix.primary];
    App.render();
  };

  /* ================================================== INVENTORY ========= */

  App.screens.inventory = {
    view: function (args) {
      if (args[0] === 'low') return lowStock();
      if (args[0] === 'count') return stockCount();
      if (args[0]) return adjustStock(App.get.product(args[0]));

      var lowAll = [];
      App.products.forEach(function (p) {
        App.lowVariants(p).forEach(function (k) { lowAll.push({ p: p, k: k }); });
      });
      var units = 0, value = 0;
      App.products.forEach(function (p) {
        Object.keys(p.stock).forEach(function (k) { units += p.stock[k]; value += p.stock[k] * p.cost; });
      });

      return { route: 'inventory', nav: 'inventory', noBack: true,
        title: L('স্টক', 'Inventory'),
        eyebrow: n(units) + L(' টি পণ্য হাতে', ' units on hand'),
        body: '<div class="stack g4">' +
          (App.seesCost() ? '<div class="grid c2 strip">' +
            '<div class="card pad cash-cell"><span class="eyebrow">' + L('হাতে থাকা পণ্যের দাম', 'Stock at cost') + '</span>' +
            '<span class="money mid">' + tk(value) + '</span><span class="cell-sub">' + L('ক্রয়মূল্য ধরে', 'valued at cost') + '</span></div>' +
            '<div class="card pad cash-cell"><span class="eyebrow">' + L('কমে যাওয়া ধরন', 'Low variants') + '</span>' +
            '<span class="money mid ' + (lowAll.length ? 'amber' : 'green') + '">' + n(lowAll.length) + '</span>' +
            '<span class="cell-sub">' + L('আবার তোলার সময়', 'time to reorder') + '</span></div></div>' : '') +
          '<div class="grid c2">' +
            '<button class="btn ghost" data-go="inventory/low">' + I.warn(15) + L('কম স্টক', 'Low stock') + '</button>' +
            '<button class="btn ghost" data-go="inventory/count">' + I.check(15) + L('গুনে দেখুন', 'Stock count') + '</button>' +
          '</div>' +
          '<div class="card flush"><div class="card-head"><h3>' + L('সব পণ্য', 'All products') + '</h3></div>' +
          App.products.map(function (p) {
            var low = App.lowVariants(p).length;
            var total = App.stockOf(p);
            var pct = Math.min(100, (total / (p.reorderAt * Math.max(1, Object.keys(p.stock).length) * 3)) * 100);
            return '<button class="stock-row" data-go="inventory/' + p.id + '">' +
              '<div class="sr-top"><b>' + esc(L(p.name, p.nameEn)) + '</b>' +
              '<span class="money">' + n(total) + L(' টি', '') + '</span></div>' +
              '<div class="bar"><i class="' + (low ? 'amber' : 'green') + '" style="width:' + pct + '%"></i></div>' +
              '<div class="sr-bot"><span>' + (p.variantAxes.length ? n(Object.keys(p.stock).length) + L(' ধরন', ' variants') : p.sku) + '</span>' +
              '<span>' + (low ? '<i class="chip brass sm">' + n(low) + L(' টি কম', ' low') + '</i>' : L('ঠিক আছে', 'healthy')) + '</span></div>' +
              '</button>';
          }).join('') + '</div></div>' };
    }
  };

  function lowStock() {
    var rows = [];
    App.products.forEach(function (p) {
      App.lowVariants(p).forEach(function (k) { rows.push({ p: p, k: k, q: p.stock[k] }); });
    });
    rows.sort(function (a, b) { return a.q - b.q; });

    return { route: 'inventory', nav: 'inventory', title: L('কম স্টক', 'Low stock'),
      eyebrow: n(rows.length) + L(' টি ধরন', ' variants'),
      body: '<div class="stack g4">' +
        U.provenance(L('প্রতিটি পণ্যের নিজের সীমা আছে — চুড়ি ১০টির নিচে নামলে কম, কিন্তু শাড়ি ২টির নিচে। তাই একটাই সংখ্যা সবার জন্য চাপানো হয় না।',
          'Each product carries its own threshold — bangles are low under ten, a saree under two. One number is not imposed on everything.'), 'teal') +
        (rows.length ? '<div class="card flush">' + rows.map(function (r) {
          return '<div class="list-item' + (r.q === 0 ? ' needs' : '') + '">' +
            '<span class="lead ' + (r.q === 0 ? 'red' : 'amber') + '">' + n(r.q) + '</span>' +
            '<span class="body"><b>' + esc(L(r.p.name, r.p.nameEn)) + '</b>' +
            '<span>' + (r.k === '_' ? r.p.sku : App.variantLabel(r.p, r.k, ' · ')) + ' · ' +
            L('সীমা ' + n(r.p.reorderAt), 'threshold ' + n(r.p.reorderAt)) + '</span></span>' +
            '<button class="btn sm ghost" data-go="inventory/' + r.p.id + '">' + L('যোগ করুন', 'Restock') + '</button></div>';
        }).join('') + '</div>' : U.emptyState({ icon: I.check(24), title: L('সব ঠিক আছে', 'All healthy'),
            body: L('কোনো ধরনের স্টক সীমার নিচে নামেনি।', 'No variant has fallen below its threshold.') })) +
        (rows.length ? '<button class="btn primary block" data-act="noop">' + I.share(15) +
          L('সরবরাহকারীকে তালিকা পাঠান', 'Send the list to a supplier') + '</button>' : '') +
        '</div>' };
  }

  function adjustStock(p) {
    if (!p) return notFound();
    var keys = Object.keys(p.stock);
    return { route: 'inventory', nav: 'inventory', title: L('স্টক বদলান', 'Adjust stock'),
      eyebrow: esc(L(p.name, p.nameEn)),
      body: '<div class="stack g4">' +
        U.provenance(L('কারণ ছাড়া স্টক বদলানো যায় না। কারণ লেখা থাকলে মাস শেষে হিসাব না মিললে খুঁজে পাওয়া যায় কোথায় গেল।',
          'Stock cannot move without a reason. With reasons recorded, a month-end mismatch can be traced.'), 'teal', I.shield(15)) +
        '<div class="card pad">' + U.field({ label: L('কেন বদলাচ্ছেন', 'Reason'), type: 'select', options: [
          { label: L('নতুন চালান এসেছে', 'New shipment received') },
          { label: L('গুনে দেখা হয়েছে', 'Physical count correction') },
          { label: L('নষ্ট হয়েছে', 'Damaged / written off') },
          { label: L('ফেরত পণ্য স্টকে ফিরেছে', 'Return restocked') },
          { label: L('নিজে ব্যবহার করেছি', 'Own use') }
        ] }) + '</div>' +
        '<div class="card flush"><div class="card-head"><h3>' + L('ধরন অনুযায়ী', 'By variant') + '</h3>' +
        '<span class="chip sm">' + n(keys.length) + '</span></div>' +
        keys.map(function (k) {
          var q = p.stock[k];
          return '<div class="vrow"><div class="vr-name"><b>' + (k === '_' ? esc(L(p.name, p.nameEn)) : esc(App.variantLabel(p, k, ' · '))) + '</b>' +
            '<span>' + L('এখন ' + n(q) + ' টি', 'now ' + n(q)) + '</span></div>' +
            '<div class="qty-stepper sm"><button data-act="adj-stock" data-arg="' + p.id + '||' + esc(k) + '||-1">−</button>' +
            '<span>' + n(q) + '</span><button data-act="adj-stock" data-arg="' + p.id + '||' + esc(k) + '||1">+</button></div>' +
            '</div>';
        }).join('') + '</div>' +
        '<div class="card pad">' + U.field({ label: L('মন্তব্য (ঐচ্ছিক)', 'Note (optional)'), type: 'textarea', rows: 2 }) + '</div>' +
        '<div class="sticky-foot"><button class="btn ghost" data-act="back">' + L('বাতিল', 'Cancel') + '</button>' +
        '<button class="btn primary" data-act="save-adjust">' + L('সংরক্ষণ', 'Save') + '</button></div>' +
        '</div>' };
  }

  App.actions['adj-stock'] = function (arg) {
    var parts = arg.split('||');
    var p = App.get.product(parts[0]);
    p.stock[parts[1]] = Math.max(0, p.stock[parts[1]] + (+parts[2]));
    App.render();
  };
  App.actions['save-adjust'] = function () {
    U.toast(L('স্টক সংরক্ষিত হয়েছে এবং অডিটে লেখা হয়েছে', 'Stock saved and written to the audit trail'));
    setTimeout(function () { App.go('inventory'); }, 600);
  };

  function stockCount() {
    var p = App.products[0];
    return { route: 'inventory', nav: 'inventory', title: L('গুনে দেখুন', 'Stock count'),
      eyebrow: L('হাতের হিসাব বনাম খাতার হিসাব', 'Counted versus recorded'),
      body: '<div class="stack g4">' +
        U.provenance(L('যা গুনে পেলেন তাই লিখুন — খাতার সাথে না মিললে অমিলটা দেখানো হবে, চুপচাপ বদলে দেওয়া হবে না।',
          'Type what you counted. Where it disagrees with the record, the gap is shown rather than silently overwritten.'), 'brass', I.warn(15)) +
        '<div class="card pad">' + U.field({ label: L('কোন পণ্য গুনছেন', 'Which product'), type: 'select',
          options: App.products.map(function (x, i) { return { label: L(x.name, x.nameEn), selected: i === 0 }; }) }) + '</div>' +
        '<div class="card flush"><div class="tbl-wrap"><table class="tbl">' +
        '<thead><tr><th>' + L('ধরন', 'Variant') + '</th><th class="num">' + L('খাতায়', 'Recorded') + '</th>' +
        '<th class="num">' + L('গুনে পেলাম', 'Counted') + '</th><th class="num">' + L('অমিল', 'Gap') + '</th></tr></thead><tbody>' +
        Object.keys(p.stock).slice(0, 8).map(function (k, i) {
          var rec = p.stock[k];
          var counted = i === 2 ? rec - 2 : i === 5 ? rec + 1 : rec;
          var gap = counted - rec;
          return '<tr class="' + (gap ? 'flagged' : 'matched') + '"><td>' + esc(App.variantLabel(p, k, ' · ')) + '</td>' +
            '<td class="num">' + n(rec) + '</td>' +
            '<td class="num"><input class="input tiny" value="' + counted + '"></td>' +
            '<td class="num">' + (gap ? (gap > 0 ? '+' : '') + n(gap) : '—') + '</td></tr>';
        }).join('') + '</tbody></table></div></div>' +
        U.provenance(L('২টি অমিল পাওয়া গেছে। সংরক্ষণ করলে প্রতিটি অমিলের জন্য আলাদা করে কারণ চাওয়া হবে।',
          'Two gaps were found. On saving, each one is recorded with its own reason.'), 'teal') +
        '<div class="sticky-foot"><button class="btn ghost" data-act="back">' + L('বাতিল', 'Cancel') + '</button>' +
        '<button class="btn primary" data-act="save-count">' + L('অমিল লিখে রাখুন', 'Record the gaps') + '</button></div>' +
        '</div>' };
  }

  App.actions['save-count'] = function () {
    U.toast(L('২টি অমিল লেখা হয়েছে', 'Two gaps recorded'), 'warn');
    setTimeout(function () { App.go('inventory'); }, 700);
  };

  function notFound() {
    return { route: 'products', title: L('পাওয়া যায়নি', 'Not found'),
      body: U.emptyState({ icon: I.search(24), title: L('এটি নেই', 'No such record'), body: '' }) };
  }
})(window.App);
