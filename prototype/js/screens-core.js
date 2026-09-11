/* SmartBiz BD — onboarding, dashboard, insight assistant. */

(function (App) {
  'use strict';

  var L = App.L, n = App.n, tk = App.tk, I = App.I, U = App.ui, esc = App.esc;

  /* ==================================================== 1. SPLASH ====== */
  App.screens.splash = {
    view: function () {
      /* The chosen card is read from the live language, not baked into the markup:
         arriving in English used to leave the tick sitting on বাংলা. */
      var langCard = function (lang, title, sub) {
        var on = App.lang === lang;
        return '<button class="lang-card' + (on ? ' is-active' : '') + '" data-act="pick-lang"' +
          ' data-arg="' + lang + '" aria-pressed="' + on + '">' +
          '<b>' + title + '</b><span>' + sub + '</span>' +
          '<i class="tick">' + I.check(15) + '</i></button>';
      };
      return { chromeless: true, body:
        '<div class="splash">' +
          '<div class="splash-art"><span class="halo"></span><span class="glyph">স</span></div>' +
          '<h1 class="splash-title">SmartBiz <em>BD</em></h1>' +
          '<p class="splash-sub">' + L('অর্ডার, স্টক আর টাকার হিসাব — এক জায়গায়, বাংলায়।',
              'Orders, stock and money — in one place, in Bangla.') + '</p>' +
          '<div class="splash-langs">' +
            langCard('bn', 'বাংলা', 'সংখ্যাও বাংলায় — ০১২৩৪৫৬৭৮৯') +
            langCard('en', 'English', 'Latin numerals — 0123456789') +
          '</div>' +
          '<button class="btn primary lg block" data-go="signin">' + L('শুরু করুন', 'Get started') + '</button>' +
          '<p class="splash-foot">' + L('ইন্টারনেট ধীর হলেও কাজ করে · কোনো অ্যাপ ইনস্টল লাগবে না',
              'Works on a slow connection · nothing to install') + '</p>' +
        '</div>' };
    }
  };

  App.actions['pick-lang'] = function (lang) {
    App.lang = lang;
    document.body.dataset.lang = lang;
    document.documentElement.lang = lang;
    var seg = document.getElementById('c-lang');
    [].forEach.call(seg.querySelectorAll('button'), function (b) {
      b.setAttribute('aria-pressed', b.dataset.lang === lang ? 'true' : 'false');
    });
    App.render();
  };

  /* ==================================================== 2. SIGN IN ===== */
  App.screens.signin = {
    view: function () {
      return { chromeless: true, body:
        '<div class="auth">' +
          '<button class="auth-back" data-act="back">' + I.back(19) + '</button>' +
          '<div class="auth-body">' +
            '<span class="auth-glyph">' + I.people(22) + '</span>' +
            '<h1>' + L('আপনার মোবাইল নম্বর', 'Your mobile number') + '</h1>' +
            '<p>' + L('আমরা একটি কোড পাঠাব। পাসওয়ার্ড মনে রাখতে হবে না।',
                      'We will send a code. No password to remember.') + '</p>' +
            U.field({ prefix: '+৮৮০', value: '1712-448190', type: 'tel',
              hint: L('এই নম্বরটিই আপনার পরিচয় — ব্যবসার নম্বর দিন।',
                      'This number is your identity — use the business number.') }) +
            '<div class="auth-alt">' +
              U.toggleRow({ title: L('ইমেইলও যোগ করি?', 'Add an email too?'),
                sub: L('ঐচ্ছিক। রিপোর্ট ইমেইলে পাঠানো যাবে — না দিলেও সব কাজ চলবে।',
                       'Optional. Lets us email reports — everything works without it.'), on: false }) +
            '</div>' +
          '</div>' +
          '<div class="auth-foot">' +
            '<button class="btn primary lg block" data-go="verify">' + L('কোড পাঠান', 'Send code') + '</button>' +
            '<p class="fineprint">' + L('চালিয়ে গেলে আপনি শর্তাবলীতে সম্মত হচ্ছেন।', 'By continuing you accept the terms.') + '</p>' +
          '</div>' +
        '</div>' };
    }
  };

  /* ==================================================== 3. VERIFY ====== */
  App.screens.verify = {
    view: function () {
      return { chromeless: true, body:
        '<div class="auth">' +
          '<button class="auth-back" data-act="back">' + I.back(19) + '</button>' +
          '<div class="auth-body">' +
            '<span class="auth-glyph">' + I.lock(22) + '</span>' +
            '<h1>' + L('কোড লিখুন', 'Enter the code') + '</h1>' +
            '<p>' + L('+৮৮০ ১৭১২-৪৪৮১৯০ নম্বরে ৪ সংখ্যার কোড পাঠানো হয়েছে।',
                      'A 4-digit code was sent to +880 1712-448190.') + '</p>' +
            '<div class="otp">' +
              [['৪', '4'], ['৯', '9'], ['১', '1'], ['', '']].map(function (d, i) {
                return '<span class="otp-box' + (i === 3 ? ' is-live' : (d[0] ? ' is-filled' : '')) + '">' +
                  L(d[0], d[1]) + '</span>';
              }).join('') +
            '</div>' +
            U.provenance(L('ডেমো: যেকোনো কোড কাজ করবে।', 'Demo: any code works.'), 'teal') +
            '<button class="btn quiet block" style="margin-top:var(--s4)">' +
              L('কোড আসেনি? আবার পাঠান (০:২৮)', 'Did not get it? Resend (0:28)') + '</button>' +
          '</div>' +
          '<div class="auth-foot">' +
            '<button class="btn primary lg block" data-go="setup">' + L('যাচাই করুন', 'Verify') + '</button>' +
          '</div>' +
        '</div>' };
    }
  };

  /* ==================================================== 4. SETUP ======= */
  var SETUP_STEPS = [
    { key: '',          bn: 'ব্যবসা',   en: 'Business' },
    { key: 'catalogue', bn: 'পণ্য',     en: 'Products' },
    { key: 'team',      bn: 'সদস্য',    en: 'Team' },
    { key: 'done',      bn: 'শেষ',      en: 'Done' }
  ];

  function setupSteps(current) {
    return '<div class="steps">' + SETUP_STEPS.map(function (s, i) {
      var cls = i < current ? 'done' : (i === current ? 'now' : '');
      return (i ? '<span class="sep"></span>' : '') +
        '<span class="st ' + cls + '"><span class="n">' + (i < current ? '✓' : n(i + 1)) + '</span>' +
        (App.device === 'desktop' || i === current ? L(s.bn, s.en) : '') + '</span>';
    }).join('') + '</div>';
  }

  App.screens.setup = {
    view: function (args) {
      var step = args[0] || '';
      var idx = SETUP_STEPS.map(function (s) { return s.key; }).indexOf(step);
      if (idx < 0) idx = 0;

      var body, foot, title, sub;

      if (idx === 0) {
        title = L('আপনার ব্যবসার নাম কী?', 'What is your business called?');
        sub = L('এই নামটি রসিদ, পার্সেল স্লিপ আর ক্রেতার মেসেজে দেখা যাবে।',
                'This name appears on receipts, pack slips and Customer messages.');
        body = '<div class="stack g4">' +
          U.field({ label: L('ব্যবসার নাম', 'Business name'), required: true, value: App.business.name,
                    placeholder: L('যেমন: রূপকথা শাড়ি ঘর', 'e.g. Rupkotha Shari Ghar') }) +
          U.field({ label: L('আপনি কী বিক্রি করেন?', 'What do you sell?'), type: 'select', options: [
            { label: L('পোশাক ও কাপড়', 'Clothing & fabric'), selected: true },
            { label: L('গহনা ও অ্যাকসেসরিজ', 'Jewellery & accessories') },
            { label: L('খাবার', 'Food') },
            { label: L('ইলেকট্রনিকস', 'Electronics') },
            { label: L('অন্যান্য', 'Other') }
          ], hint: L('শুধু ডিফল্ট সেটিং ঠিক করতে — পরে বদলানো যাবে।',
                     'Only used to pick sensible defaults — changeable later.') }) +
          U.field({ label: L('ফেসবুক পেজ (ঐচ্ছিক)', 'Facebook page (optional)'), value: App.business.page }) +
          U.field({ label: L('প্যাকেজিং খরচ প্রতি পার্সেল', 'Packaging cost per parcel'), prefix: '৳',
                    value: '25', money: true,
                    hint: L('প্রতিটি অর্ডারের লাভ হিসাবে এই খরচ বাদ যাবে। শূন্য দিলে ধরা হবে না।',
                            'Deducted from every order\'s profit. Enter zero to ignore it.') }) +
          '</div>';
        foot = '<button class="btn primary lg block" data-go="setup/catalogue">' + L('পরের ধাপ', 'Next') + '</button>';
      }

      else if (idx === 1) {
        title = L('প্রথম পণ্যগুলো যোগ করুন', 'Add your first products');
        sub = L('তিনটি দিয়ে শুরু করলেই যথেষ্ট। বাকিগুলো অর্ডার নেওয়ার সময়েই যোগ করা যাবে।',
                'Three is enough to start. The rest can be added while taking an order.');
        body = '<div class="stack g4">' +
          U.provenance(L('এক্সেল বা ছবি থেকেও আনা যায় — কিন্তু এখন দরকার নেই।',
                         'You can import from a spreadsheet or a photo later — not needed now.'), 'teal') +
          '<div class="card flush">' + App.products.slice(0, 3).map(function (p, i) {
            return '<div class="list-item"><span class="lead ' + ['green', 'brass', 'teal'][i] + '">' + I.tag(17) + '</span>' +
              '<span class="body"><b>' + esc(L(p.name, p.nameEn)) + '</b>' +
              '<span>' + L('বিক্রয় মূল্য', 'Sells for') + ' ' + App.tkPlain(p.price) + ' · ' +
              (p.variantAxes.length ? L('ভ্যারিয়েন্ট আছে', 'has variants') : L('একটাই ধরন', 'single variant')) + '</span></span>' +
              '<span class="chip green sm">' + I.check(12) + '</span></div>';
          }).join('') + '</div>' +
          '<button class="btn ghost block" data-go="products/new">' + I.plus(16) + L('আরেকটি পণ্য', 'Add another') + '</button>' +
          '</div>';
        foot = '<button class="btn ghost" data-go="setup/team">' + L('এড়িয়ে যান', 'Skip') + '</button>' +
               '<button class="btn primary" data-go="setup/team">' + L('পরের ধাপ', 'Next') + '</button>';
      }

      else if (idx === 2) {
        title = L('কাউকে সাথে নেবেন?', 'Anyone working with you?');
        sub = L('প্রত্যেকের ভূমিকা ঠিক করে দিলে তারা শুধু নিজের কাজটাই দেখবে — টাকার হিসাব সবাই দেখবে না।',
                'Give each person a Role and they see only their own work — not everyone sees money.');
        body = '<div class="stack g4">' +
          '<div class="card flush">' +
          ['manager', 'staff', 'packer'].map(function (k) {
            var r = App.ROLES[k];
            var moneyLbl = r.money === 'full' ? L('টাকা দেখবে', 'sees money')
              : r.money === 'price' ? L('দাম দেখবে, লাভ নয়', 'sees prices, not profit')
              : L('টাকা দেখবে না', 'sees no money');
            return '<div class="list-item"><span class="lead">' + App.initials(r) + '</span>' +
              '<span class="body"><b>' + esc(L(r.name, r.nameEn)) + '</b><span>' + L(r.label, r.labelEn) + ' · ' + moneyLbl + '</span></span>' +
              '<span class="chip ' + (r.money === 'none' ? 'outline' : r.money === 'price' ? 'brass' : 'green') + ' sm">' +
              (r.money === 'none' ? I.lock(12) : I.money(12)) + '</span></div>';
          }).join('') + '</div>' +
          U.provenance(L('আমন্ত্রণ কোড দিয়েই সদস্য যোগ হয়। ইমেইল থাকলে কোডটি ইমেইলেও যাবে — না থাকলে কোডটি নিজে পাঠিয়ে দিন।',
                         'Members join with an invite code. If email is configured the code is also emailed — otherwise share the code yourself.'), 'brass') +
          '<button class="btn ghost block" data-go="settings/members">' + I.plus(16) + L('সদস্য যোগ করুন', 'Invite a member') + '</button>' +
          '</div>';
        foot = '<button class="btn ghost" data-go="setup/done">' + L('একা কাজ করব', 'Working alone') + '</button>' +
               '<button class="btn primary" data-go="setup/done">' + L('পরের ধাপ', 'Next') + '</button>';
      }

      else {
        title = L('তৈরি!', 'You are set up');
        sub = '';
        body = '<div class="setup-done">' +
          '<span class="big-tick">' + I.check(34) + '</span>' +
          '<h2>' + esc(L(App.business.name, App.business.nameEn)) + '</h2>' +
          '<p>' + L('এখন প্রথম অর্ডারটি নিন। মেসেঞ্জারের মেসেজ কপি করে পেস্ট করলেই হবে — লিখতে হবে না।',
                    'Take your first order. Copy a message from Messenger and paste it — no typing needed.') + '</p>' +
          '<div class="done-cards">' +
            '<button class="done-card" data-go="capture/paste">' + I.orders(20) +
              '<b>' + L('মেসেজ পেস্ট করুন', 'Paste a message') + '</b>' +
              '<span>' + L('সবচেয়ে দ্রুত', 'Fastest') + '</span></button>' +
            '<button class="done-card" data-go="capture/manual">' + I.plus(20) +
              '<b>' + L('নিজে লিখুন', 'Type it in') + '</b>' +
              '<span>' + L('ফোনে অর্ডার এলে', 'For phone orders') + '</span></button>' +
          '</div></div>';
        foot = '<button class="btn primary lg block" data-go="home">' + L('ড্যাশবোর্ডে যান', 'Go to dashboard') + '</button>';
      }

      return { chromeless: true, body:
        '<div class="auth wizard">' +
          '<div class="wizard-head">' +
            (idx ? '<button class="auth-back" data-act="back">' + I.back(19) + '</button>' : '<span></span>') +
            setupSteps(idx) +
          '</div>' +
          '<div class="auth-body">' +
            '<h1>' + title + '</h1>' + (sub ? '<p>' + sub + '</p>' : '') + body +
          '</div>' +
          '<div class="auth-foot row">' + foot + '</div>' +
        '</div>' };
    }
  };

  /* ==================================================== 5. DASHBOARD === */

  function askBox() {
    if (!App.aiOn) {
      return '<div class="ask-box off" data-go="insights">' +
        '<span class="ask-ic">' + I.spark(18) + '</span>' +
        '<span class="ask-copy"><b>' + L('১০টি প্রশ্ন', 'Ten ready questions') + '</b>' +
        '<span>' + L('সহকারী বন্ধ — বাটন থেকে বেছে নিন', 'Assistant off — pick from the list') + '</span></span>' +
        I.chev(16) + '</div>';
    }
    return '<div class="ask-box" data-go="insights">' +
      '<span class="ask-ic">' + I.spark(18) + '</span>' +
      '<span class="ask-copy"><b>' + L('কিছু জিজ্ঞাসা করুন', 'Ask about your business') + '</b>' +
      '<span>' + L('“এ মাসে লাভ কত?” — বাংলায় লিখলেই হবে', '“How much profit this month?” — in Bangla or English') + '</span></span>' +
      I.chev(16) + '</div>';
  }

  function greeting() {
    var r = App.ROLES[App.role];
    var hour = 9;
    var hi = hour < 12 ? L('শুভ সকাল', 'Good morning') : L('শুভ অপরাহ্ণ', 'Good afternoon');
    return '<div class="greet"><div><span class="eyebrow">' + App.date(App.TODAY) + ' · ' +
      L('সোমবার', 'Monday') + '</span><h2>' + hi + ', ' + esc(L(r.name.split(' ')[0], r.nameEn.split(' ')[0])) + '</h2></div>' +
      '<span class="greet-av">' + App.initials(r) + '</span></div>';
  }

  function moneyHero() {
    var s = App.summary();
    return '<div class="hero card">' +
      '<div class="hero-top">' +
        '<div class="hero-fig">' +
          '<div class="row" style="gap:var(--s2)"><span class="eyebrow">' + L('এ মাসের লাভ', 'Profit this month') + '</span>' +
            '<button class="basis-btn" data-act="basis-why">' + U.basisPill('earned') + '</button></div>' +
          '<div class="money big earned">' + tk(s.earnedProfit) + '</div>' +
          '<span class="hero-note">' + L('পণ্য পৌঁছেছে — টাকা এখনো কুরিয়ারের কাছে', 'Goods delivered — cash still with the courier') + '</span>' +
        '</div>' +
        '<div class="hero-div"></div>' +
        '<div class="hero-fig">' +
          '<div class="row" style="gap:var(--s2)"><span class="eyebrow">' + L('হাতে এসেছে', 'Realized') + '</span>' +
            '<button class="basis-btn" data-act="basis-why">' + U.basisPill('realized') + '</button></div>' +
          '<div class="money big realized">' + tk(s.realizedProfit) + '</div>' +
          '<span class="hero-note">' + L('নিষ্পত্তি হয়েছে — খরচ করা যাবে', 'Settled and matched — spendable') + '</span>' +
        '</div>' +
      '</div>' +
      '<div class="hero-foot">' + U.completeness(s.completeness.have, s.completeness.of) + '</div>' +
    '</div>';
  }

  var unit = App.unit;

  function cashStrip() {
    var s = App.summary();
    /* Each sub-count is counted from the same orders as the figure above it. A
       hardcoded count reads as a lie the moment it stops matching its figure —
       and the COD screen counts the same parcels for the same taka. */
    var st = function (x) { return App.orders.filter(function (o) { return o.status === x; }).length; };
    var cells = [
      { bn: 'কুরিয়ারের কাছে', en: 'In courier custody', v: s.custody, tone: 'amber', go: 'cod',
        sub: unit(st('shipped'), 'টি পার্সেল', 'parcel', 'parcels') },
      { bn: 'পাঠানো বাকি', en: 'Not yet shipped', v: s.pipeline, tone: '', go: 'orders',
        sub: unit(st('new') + st('confirmed') + st('packed'), 'টি অর্ডার', 'order', 'orders') },
      { bn: 'ক্রেতার কাছে বাকি', en: 'Owed by Customers', v: s.dues, tone: 'red', go: 'dues',
        sub: unit(App.dues.length, ' জন', 'person', 'people') },
      { bn: 'সরবরাহকারীকে দেনা', en: 'Owed to suppliers', v: s.payable, tone: 'red', go: 'suppliers',
        sub: unit(App.suppliers.filter(function (x) { return x.payable > 0; }).length,
          ' জন', 'supplier', 'suppliers') }
    ];
    return '<div class="strip">' + cells.map(function (c) {
      return '<button class="cash-cell" data-go="' + c.go + '">' +
        '<span class="eyebrow">' + L(c.bn, c.en) + '</span>' +
        '<span class="money mid ' + c.tone + '">' + tk(c.v) + '</span>' +
        '<span class="cell-sub">' + c.sub + ' ' + I.chev(12) + '</span></button>';
    }).join('') + '</div>';
  }

  /* One list, two cards: the Staff card is this list minus the money items.
     Built once because the previous pair each carried their own copy of the
     same counts, which is how the two drifted apart. */
  function attentionItems() {
    var s = App.summary();
    var items = [];
    var run = App.settlementRun;
    if (s.unsettled) {
      var rc = App.get.courier(run.courier);
      items.push({ money: true, tone: 'red', icon: I.warn(17),
        bn: n(s.unsettled) + 'টি নিষ্পত্তির অমিল সমাধান করুন', en: n(s.unsettled) + ' settlement variances need a decision',
        sub: esc(L(rc.name, rc.nameEn)) + L(' পেআউট ফাইল · ', ' payout · ') + App.date(run.received),
        go: 'settlement/' + run.id });
    }
    var toConfirm = App.orders.filter(function (o) { return o.status === 'new'; }).length;
    if (toConfirm) items.push({ tone: 'brass', icon: I.orders(17),
      bn: n(toConfirm) + 'টি নতুন অর্ডার নিশ্চিত করুন',
      en: unit(toConfirm, '', 'new order', 'new orders') + ' to confirm',
      sub: L('আজ সকালে এসেছে', 'Came in this morning'), go: 'orders' });
    if (s.lowStock) {
      /* Named from the same predicate that produced the count, so the example
         is always one of the products the headline is actually counting. */
      var worst = null;
      App.products.forEach(function (p) {
        App.lowVariants(p).forEach(function (k) {
          if (!worst || p.stock[k] < worst.q) worst = { p: p, k: k, q: p.stock[k] };
        });
      });
      items.push({ tone: 'amber', icon: I.box(17),
        bn: n(s.lowStock) + 'টি পণ্যের স্টক কমে গেছে', en: n(s.lowStock) + ' products are low on stock',
        sub: esc(L(worst.p.name, worst.p.nameEn)) + ' ' + esc(App.variantLabel(worst.p, worst.k)) +
          L(' — মাত্র ' + n(worst.q) + 'টি', ' — only ' + n(worst.q) + ' left'),
        go: 'inventory/low' });
    }
    var inCustody = App.orders.filter(function (o) { return o.status === 'shipped'; })
      .sort(function (a, b) { return a.placed < b.placed ? -1 : 1; });
    if (inCustody.length) {
      var oldest = inCustody[0];
      var oc = App.get.customer(oldest.cust);
      /* Aged from the same shipped timestamp the order's own history draws, so
         the dashboard and the timeline cannot disagree about a parcel's age. */
      items.push({ money: true, tone: 'teal', icon: I.truck(17),
        bn: n(inCustody.length) + 'টি পার্সেল এখনো কুরিয়ারের কাছে',
        en: unit(inCustody.length, '', 'parcel', 'parcels') + ' still with the courier',
        sub: esc(oldest.consignment || oldest.id) + ' · ' + esc(L(oc.name, oc.nameEn)) +
          ' · ' + L('পাঠানো ', 'shipped ') + App.ago(App.stepTime(oldest.placed, 'shipped')),
        go: 'cod/' + (oldest.consignment || oldest.id) });
    }

    return items;
  }

  function attentionCard(items) {
    return '<div class="card flush">' +
      '<div class="card-head"><h3>' + L('আজ যা করতে হবে', 'Needs you today') + '</h3>' +
      '<span class="chip red sm">' + n(items.length) + '</span></div>' +
      items.map(function (it) {
        return '<button class="list-item" data-go="' + it.go + '">' +
          '<span class="lead ' + it.tone + '">' + it.icon + '</span>' +
          '<span class="body"><b>' + L(it.bn, it.en) + '</b><span>' + it.sub + '</span></span>' +
          '<span class="chev">' + I.chev(16) + '</span></button>';
      }).join('') + '</div>';
  }

  function attention() { return attentionCard(attentionItems()); }

  function todayCard() {
    var s = App.summary();
    var showMoney = App.seesPrice();
    return '<div class="card pad today-card">' +
      '<div class="row"><span class="eyebrow">' + L('আজকের অর্ডার', 'Today\'s orders') + '</span>' +
      '<span class="spacer"></span>' +
      (App.seesProfit() ? '<button class="btn sm quiet" data-go="home/summary">' + L('দিনের কার্ড', 'Daily card') + ' ' + I.share(13) + '</button>' : '') +
      '</div>' +
      '<div class="row" style="margin-top:var(--s3);align-items:flex-end;gap:var(--s6)">' +
        '<div><div class="money big">' + n(s.todayCount) + '</div><span class="cell-sub">' + L('অর্ডার', 'orders') + '</span></div>' +
        (showMoney ? '<div><div class="money mid">' + tk(s.todayValue) + '</div><span class="cell-sub">' + L('মোট মূল্য', 'order value') + '</span></div>' : '') +
      '</div></div>';
  }

  function recentOrders(limit) {
    return '<div class="card flush">' +
      '<div class="card-head"><h3>' + L('সাম্প্রতিক অর্ডার', 'Recent orders') + '</h3>' +
      '<span class="acts"><button class="btn sm quiet" data-go="orders">' + L('সব দেখুন', 'See all') + '</button></span></div>' +
      App.orders.slice(0, limit || 5).map(orderRow).join('') + '</div>';
  }

  function orderRow(o) {
    var c = App.get.customer(o.cust);
    var e = App.econ(o);
    var trail = App.seesPrice()
      ? '<span class="trail"><span class="money">' + tk(e.collect) + '</span><span>' + App.ago(o.placed) + '</span></span>'
      : '<span class="trail"><span>' + App.ago(o.placed) + '</span></span>';
    return '<button class="list-item" data-go="order/' + o.id + '">' +
      '<span class="lead ' + App.STATUS[o.status].tone + '">' + esc(L(c.name, c.nameEn).charAt(0)) + '</span>' +
      '<span class="body"><b>' + esc(L(c.name, c.nameEn)) + '</b>' +
      '<span>' + o.id.replace('ORD-', '#') + ' · ' + App.unit(e.items, 'টি পণ্য', 'item', 'items') + ' · ' + U.statusChip(o.status, true) + '</span></span>' +
      trail + '<span class="chev">' + I.chev(16) + '</span></button>';
  }
  App.orderRow = orderRow;

  /* the packing queue — the only thing a Packer needs */
  function packQueue() {
    var queue = App.orders.filter(function (o) { return o.status === 'confirmed' || o.status === 'packed'; });
    return '<div class="card flush">' +
      '<div class="card-head"><h3>' + L('প্যাক করার তালিকা', 'To pack') + '</h3>' +
      '<span class="chip brass sm">' + n(queue.length) + '</span></div>' +
      queue.map(function (o) {
        var c = App.get.customer(o.cust);
        var e = App.econ(o);
        return '<button class="list-item" data-go="order/' + o.id + '/slip">' +
          '<span class="lead ' + (o.status === 'packed' ? 'green' : 'brass') + '">' +
          (o.status === 'packed' ? I.check(17) : I.box(17)) + '</span>' +
          '<span class="body"><b>' + o.id.replace('ORD-', '#') + ' · ' + App.unit(e.items, 'টি পণ্য', 'item', 'items') + '</b>' +
          '<span>' + esc(L(c.name, c.nameEn)) + ' · ' + esc(L(c.area, c.areaEn)) + '</span></span>' +
          '<span class="chev">' + I.chev(16) + '</span></button>';
      }).join('') + '</div>';
  }

  App.screens.home = {
    view: function (args) {
      if (args[0] === 'summary') return dailySummary();

      var level = App.moneyLevel();
      var body;

      if (level === 'none') {
        body = '<div class="stack g4">' + greeting() +
          U.provenance(L('আপনি প্যাকার — টাকার হিসাব আপনার স্ক্রিনে দেখানো হয় না।',
                         'You are a Packer — money figures are not shown on your screen.'), 'teal', I.lock(15)) +
          packQueue() + '</div>';
      } else if (level === 'price') {
        body = '<div class="stack g4">' + greeting() + todayCard() +
          U.provenance(L('আপনি কর্মী — বিক্রয় মূল্য দেখতে পাবেন, কিন্তু ক্রয়মূল্য ও লাভ নয়।',
                         'You are Staff — you see selling prices, but not cost or profit.'), 'brass', I.lock(15)) +
          attentionForStaff() + recentOrders(6) + '</div>';
      } else {
        body = '<div class="stack g4">' + greeting() + moneyHero() + askBox() + cashStrip() +
          attention() + todayCard() + recentOrders(5) + '</div>';
      }

      return { route: 'home', nav: 'home', noBack: true,
        eyebrow: esc(L(App.business.name, App.business.nameEn)),
        title: L('ড্যাশবোর্ড', 'Dashboard'),
        acts: (App.seesProfit() ? '<button class="iconbtn bordered" data-go="audit">' + I.shield(17) + '</button>' : '') +
              '<button class="iconbtn bordered" data-go="settings">' + I.gear(17) + '</button>',
        body: body };
    }
  };

  function attentionForStaff() {
    return attentionCard(attentionItems().filter(function (it) { return !it.money; }));
  }

  /* --------------------------------------------- daily summary card (FR) */
  /* The card states Earned profit, so it is a money surface. It hangs off the
     Role-adaptive `home` screen, which cannot carry the router's `money` flag —
     so it gates itself or it leaks the most sensitive figure in the product. */
  function dailySummary() {
    if (!App.seesProfit()) {
      return { route: 'home', nav: 'home', title: L('দিনের কার্ড', 'Daily summary card'),
               body: U.roleLock() };
    }
    var s = App.summary();
    var top = App.products.slice(0, 3);
    return { route: 'home', nav: 'home',
      eyebrow: App.date(App.TODAY),
      title: L('দিনের কার্ড', 'Daily summary card'),
      acts: '<button class="btn sm ghost" data-act="share-card">' + I.share(14) + L('শেয়ার', 'Share') + '</button>',
      body: '<div class="stack g4">' +
        U.provenance(L('এই ছবিটি হোয়াটসঅ্যাপে পাঠানোর জন্য তৈরি — বাংলা লেখা ছবিতেই বসানো, তাই যেকোনো ফোনে ঠিক দেখাবে।',
                       'This image is built for WhatsApp — the Bangla text is rendered into the image, so it looks right on any phone.'), 'teal', I.camera(15)) +
        '<div class="daycard">' +
          '<div class="dc-head"><span class="dc-glyph">স</span>' +
            '<div><b>' + esc(L(App.business.name, App.business.nameEn)) + '</b>' +
            '<span>' + App.date(App.TODAY) + ' · ' + L('দিনের হিসাব', 'Daily summary') + '</span></div></div>' +
          '<div class="dc-figs">' +
            '<div><span>' + L('অর্ডার', 'Orders') + '</span><b>' + n(s.todayCount) + '</b></div>' +
            '<div><span>' + L('বিক্রয় মূল্য', 'Order value') + '</span><b>' + App.tkPlain(s.todayValue) + '</b></div>' +
            '<div><span>' + L('অর্জিত লাভ', 'Earned profit') + '</span><b>' + App.tkPlain(s.earnedProfit) + '</b></div>' +
          '</div>' +
          '<div class="dc-list">' + top.map(function (p, i) {
            return '<div class="dc-row"><span>' + n(i + 1) + '. ' + esc(L(p.name, p.nameEn)) + '</span>' +
              '<b>' + n([4, 3, 2][i]) + L(' টি', ' sold') + '</b></div>';
          }).join('') + '</div>' +
          '<div class="dc-foot">' +
            '<span>' + L('অর্জিত লাভ = পণ্য পৌঁছেছে এমন অর্ডার ধরে', 'Earned profit counts delivered orders only') + '</span>' +
            '<span>' + L(n(s.completeness.have) + '/' + n(s.completeness.of) + ' আইটেম', n(s.completeness.have) + '/' + n(s.completeness.of) + ' items') + '</span>' +
          '</div>' +
        '</div>' +
        '<div class="grid c2">' +
          '<button class="btn ghost" data-act="share-card">' + I.share(15) + L('হোয়াটসঅ্যাপ', 'WhatsApp') + '</button>' +
          '<button class="btn ghost" data-act="share-card">' + I.print(15) + L('PDF নামান', 'Download PDF') + '</button>' +
        '</div></div>' };
  }

  App.actions['share-card'] = function () {
    U.toast(L('ছবি তৈরি হয়েছে — শেয়ার শিট খুলবে', 'Image rendered — the share sheet opens here'));
  };

  /* ==================================================== 6. INSIGHTS ==== */
  /* The model routes the question and phrases the answer. It never sees a row
     and never produces a figure — every numeral below is computed here. */

  /* FR-65 fixes the set at exactly ten and declares it closed — an eleventh is a scope
     change against the §4.2 cap. They are listed here in the requirement's own order, the
     five inherited from the Thin tier before the five the promotion to Full admitted, so
     q1…q10 read straight against the enumeration in EXPERIENCE.md. The order is also load-
     bearing: the refusal state offers `slice(0, 5)`, and §4.3's retreat path reduces
     toward the Thin five and then toward q1 alone. */
  /* `needs` is the visibility the ANSWER requires, not the question. §6.2 grants every Role
     the right to ask — `Ask Insight Queries | Yes | Yes | Yes | Yes | Yes` — so the ten are
     filtered by what a Role may be told, and a Role that may see nothing here still keeps
     the three that carry no money at all. Absent means everyone. */
  var QUERIES = [
    { id: 'q1', needs: 'price',  bn: 'আজ কত বিক্রি হয়েছে?', en: 'How much did I sell today?' },
    { id: 'q2', needs: 'profit', bn: 'সবচেয়ে বেশি বিক্রি হওয়া পণ্য কোনটি?', en: 'Which product sells most?' },
    { id: 'q3',                  bn: 'কোন পণ্য শেষ হয়ে যাচ্ছে?', en: 'What is running out of stock?' },
    { id: 'q4',                  bn: 'কারা বেশি রিটার্ন করে?', en: 'Which Customers return most?' },
    { id: 'q5', needs: 'profit', bn: 'এ মাসে সবচেয়ে বড় খরচ কোন খাতে?', en: 'What are my largest expenses this month?' },
    { id: 'q6', needs: 'profit', bn: 'লাভ কমল কেন?', en: 'Why did profit go down?' },
    { id: 'q7', needs: 'profit', bn: 'কুরিয়ারের কাছে কত টাকা আটকে আছে?', en: 'How much is stuck with couriers?' },
    { id: 'q8',                  bn: 'কোন ধাপে অর্ডার আটকে আছে?', en: 'Which Order Status are orders stuck at?' },
    { id: 'q9', needs: 'profit', bn: 'কে কত টাকা বাকি রেখেছে?', en: 'Who owes me money?' },
    { id: 'q10', needs: 'profit', bn: 'কোন অমিল এখনো সমাধান হয়নি?', en: 'Which settlement variances are unresolved?' }
  ];

  function askable(q) {
    if (!q) return false;
    if (q.needs === 'profit') return App.seesProfit();
    if (q.needs === 'price') return App.seesPrice();
    return true;
  }
  function askableQueries() { return QUERIES.filter(askable); }
  function queryById(id) {
    for (var i = 0; i < QUERIES.length; i++) if (QUERIES[i].id === id) return QUERIES[i];
    return null;
  }
  /* exposed so the Role model is testable against §6.2 rather than against this screen */
  App.askableQueries = askableQueries;

  /* Every id gets its own branch. An earlier version answered four of the ten from a
     shared tail, so "what is running out of stock?" came back with a best-seller —
     a confident answer to a question nobody asked, which is the failure FR-79 exists
     to prevent. Routing may still misclassify; a branch may not. */
  function answerFor(id) {
    var s = App.summary();

    if (id === 'q1') {
      /* Today's orders are order VALUE, none of it collected and none of it delivered,
         so the prose says so rather than letting a large number imply cash. The count is
         over today's orders and every one of them is counted, so this figure has no gap
         of its own — it is not the dashboard's headline and must not borrow its caveat. */
      return { basis: 'earned', complete: { have: s.todayCount, of: s.todayCount },
        bn: 'আজ <b>' + n(s.todayCount) + 'টি</b> অর্ডার এসেছে, মোট মূল্য <b>' + App.tkPlain(s.todayValue) +
            '</b>। এর কোনোটাই এখনো হাতে আসেনি — ডেলিভারি হলে লাভ হিসাবে যোগ হবে।',
        en: 'You took <b>' + n(s.todayCount) + '</b> orders today, worth <b>' + App.tkPlain(s.todayValue) +
            '</b>. None of it is collected yet — it counts as profit when the parcels are delivered.',
        figures: [[L('আজকের অর্ডার মূল্য', "Today's order value"), s.todayValue]], go: 'orders' };
    }

    if (id === 'q2') {
      var best = App.products[0];
      var units = 4;
      return { basis: 'earned', complete: s.completeness,
        bn: 'সবচেয়ে বেশি বিক্রি হয়েছে <b>' + esc(best.name) + '</b> — ' + n(units) + 'টি, লাভ ' +
            App.tkPlain(units * (best.price - best.cost)) + '।',
        en: 'Your best seller is <b>' + esc(best.nameEn) + '</b> — ' + n(units) + ' units, ' +
            App.tkPlain(units * (best.price - best.cost)) + ' profit.',
        figures: [[L('লাভ', 'Profit'), units * (best.price - best.cost)]], go: 'reports' };
    }

    if (id === 'q3') {
      /* Counted the way the stock screen counts it — a product is low when any one of
         its variants is at or under its own reorder level, not when the total is. */
      var low = App.products.filter(function (p) { return App.lowVariants(p).length > 0; });
      var named = low.slice(0, 2).map(function (p) { return esc(L(p.name, p.nameEn)); }).join(L(' ও ', ' and '));
      return { basis: 'earned', complete: { have: App.products.length, of: App.products.length },
        bn: '<b>' + n(low.length) + 'টি</b> পণ্য তার সর্বনিম্ন স্টকের নিচে নেমেছে' +
            (named ? ' — ' + named + (low.length > 2 ? ' সহ' : '') : '') + '। এখন অর্ডার না দিলে বিক্রি হারাবেন।',
        en: '<b>' + n(low.length) + '</b> products are at or below their minimum stock level' +
            (named ? (low.length > 2 ? ', including ' : ' — ') + named : '') + '. Reorder now or you will turn away orders.',
        figures: [], go: 'inventory/low' };
    }

    if (id === 'q4') {
      var risky = App.customers.filter(function (c) { return App.risk(c).band === 'high'; });
      return { basis: 'earned', complete: { have: App.customers.length, of: App.customers.length }, risky: risky,
        bn: '<b>' + n(risky.length) + ' জন</b> ক্রেতার রিটার্নের হার বেশি। সাবরিনা হকের ১০টি অর্ডারের ৪টি ফেরত এসেছে।',
        en: '<b>' + n(risky.length) + ' Customers</b> return often. Sabrina Haque returned 4 of 10 orders.',
        figures: [], go: 'customers' };
    }

    if (id === 'q5') {
      /* Totalled per category here rather than naming the largest in prose, because a
         hand-written "the largest line is salary" goes stale the moment a row is added. */
      var byCat = {};
      App.expenses.forEach(function (e) {
        var k = L(e.cat, e.catEn);
        byCat[k] = (byCat[k] || 0) + e.amount;
      });
      var cats = Object.keys(byCat).sort(function (a, b) { return byCat[b] - byCat[a]; });
      return { basis: 'realized', complete: { have: App.expenses.length, of: App.expenses.length },
        bn: 'এ মাসে <b>' + App.tkPlain(s.expenses) + '</b> খরচ হয়েছে। সবচেয়ে বড় খাত ' + esc(cats[0]) +
            ' — ' + App.tkPlain(byCat[cats[0]]) + '। তারপর ' + esc(cats[1]) + ' — ' + App.tkPlain(byCat[cats[1]]) + '।',
        en: 'You spent <b>' + App.tkPlain(s.expenses) + '</b> this month. The largest category is ' + esc(cats[0]) +
            ' at ' + App.tkPlain(byCat[cats[0]]) + ', then ' + esc(cats[1]) + ' at ' + App.tkPlain(byCat[cats[1]]) + '.',
        figures: [
          [esc(cats[0]), byCat[cats[0]]],
          [esc(cats[1]), byCat[cats[1]]],
          [L('মোট খরচ', 'Total expenses'), s.expenses]
        ], go: 'expenses' };
    }

    if (id === 'q6') {
      /* FR-82: the decomposition, not an opinion */
      return { basis: 'earned', complete: s.completeness, decomp: true,
        bn: 'লাভ কমেছে <b>৳১,৭৪০</b> — তিনটি কারণে। সবচেয়ে বড় কারণ রিটার্ন: দুইটি চুড়ি সেট নষ্ট হয়ে ফেরত এসেছে।',
        en: 'Profit fell by <b>৳1,740</b> for three reasons. The largest is returns — two bangle sets came back damaged.',
        figures: [], go: 'reports/profit' };
    }

    if (id === 'q7') {
      /* The parcel count is counted from the same orders the figure sums, and the
         caveat is the summary's own — an answer may not claim a completeness the
         dashboard does not, or it states two truths for one figure. */
      var shipped = App.orders.filter(function (o) { return o.status === 'shipped'; });
      var oldest = shipped.reduce(function (d, o) {
        return Math.max(d, Math.round((Date.parse(App.TODAY.split(' ')[0]) - Date.parse(o.placed.split(' ')[0])) / 86400000));
      }, 0);
      return { basis: 'earned', complete: s.completeness,
        bn: 'এখন <b>' + App.tkPlain(s.custody) + '</b> কুরিয়ারের কাছে আছে — ' + n(shipped.length) +
            'টি পার্সেল, ' + n(oldest) + ' দিন ধরে। পাঠাও থেকে ৩টি অমিলও সমাধান বাকি।',
        en: 'Right now <b>' + App.tkPlain(s.custody) + '</b> sits with couriers — ' + n(shipped.length) +
            (shipped.length === 1 ? ' parcel' : ' parcels') + ', for ' + n(oldest) +
            (oldest === 1 ? ' day' : ' days') + '. Three Pathao variances are also unresolved.',
        figures: [[L('কুরিয়ারের কাছে', 'In custody'), s.custody]], go: 'cod' };
    }

    if (id === 'q8') {
      /* No superlative: the four open statuses are evenly loaded in this data, so
         "more than any other" would be false. The answer names the one that matters
         instead — Shipped, because that is the money a courier is holding. */
      var by = App.countByStatus();
      var open = ['new', 'confirmed', 'packed', 'shipped'].filter(function (k) { return by[k]; });
      var total = open.reduce(function (t, k) { return t + by[k]; }, 0);
      var spread = open.map(function (k) {
        return L(App.STATUS[k].bn + ' ' + n(by[k]), n(by[k]) + ' ' + App.STATUS[k].en);
      }).join(', ');
      return { basis: 'earned', complete: { have: App.orders.length, of: App.orders.length },
        bn: '<b>' + n(total) + 'টি</b> অর্ডার এখনো চলমান — ' + spread + '। পাঠানো অর্ডারের টাকা কুরিয়ারের কাছে।',
        en: '<b>' + n(total) + '</b> orders are still open — ' + spread +
            '. The shipped ones are the money a courier is holding.',
        figures: [], go: 'orders' };
    }

    if (id === 'q9') {
      return { basis: 'earned', complete: { have: App.dues.length, of: App.dues.length },
        bn: '<b>৩ জন</b> ক্রেতার কাছে মোট <b>' + App.tkPlain(s.dues) + '</b> বাকি। সবচেয়ে পুরনো তাসনিম রহমানের — ৩৯ দিন।',
        en: '<b>3 Customers</b> owe <b>' + App.tkPlain(s.dues) + '</b> in total. The oldest is Tasnim Rahman, at 39 days.',
        figures: [[L('মোট বাকি', 'Total dues'), s.dues]], go: 'dues' };
    }

    /* q10 — settlement variances still awaiting a Disposition. Unconditional, because
       the ten are closed and every one of the others has already returned. */
    var LABEL = { short: L('কম টাকা এসেছে', 'paid short'), unmatched: L('অর্ডার পাওয়া যায়নি', 'no matching order'),
      duplicate: L('আগেই নিষ্পত্তি হয়েছে', 'already settled') };
    var unresolved = App.settlementRun.rows.filter(function (r) { return r.state !== 'matched'; });
    var kinds = unresolved.map(function (r) { return LABEL[r.state]; }).join(', ');
    return { basis: 'realized', complete: { have: App.settlementRun.rows.length, of: App.settlementRun.rows.length },
      bn: '<b>' + n(unresolved.length) + 'টি</b> অমিলের নিষ্পত্তি এখনো বাকি — ' + kinds +
          '। প্রতিটির জন্য কী করবেন সেটা আপনি ঠিক করবেন, অ্যাপ নিজে করবে না।',
      en: '<b>' + n(unresolved.length) + '</b> settlement variances are still awaiting a Disposition — ' + kinds +
          '. Each one waits for your decision; the application will not pick for you.',
      figures: [], go: 'settlement/STL-0831' };
  }

  /* exposed so the caveat rule is checkable: an answer's Completeness Indicator has
     to be tested against the figure it qualifies, which the rendered pill cannot show */
  App.answerFor = answerFor;

  App.screens.insights = {
    /* Deliberately un-gated. §6.2 grants the Ask capability to all five Roles, and this
       screen used to carry `money: true`, which refused the Packer at the door — including
       the three questions about stock, returns and stuck orders that the matrix grants them
       outright. The filter belongs on the answer, which is what `needs` above does. */
    title: function () { return L('জিজ্ঞাসা করুন', 'Ask SmartBiz'); },
    view: function () {
      var st = App.state.insight || {};
      var vis = askableQueries();
      var whole = vis.length === QUERIES.length;
      var body = '<div class="stack g4">';

      if (App.aiOn) {
        body += '<div class="ai-panel">' +
          '<div class="ai-head">' + I.spark(17) + '<b>' + L('বাংলায় প্রশ্ন করুন', 'Ask in Bangla or English') + '</b>' +
            '<span class="chip violet sm">' + L('সহকারী চালু', 'Assistant on') + '</span></div>' +
          '<textarea class="input ai-input" id="ai-q" rows="2" placeholder="' +
            esc(L('যেমন: আজ কত বিক্রি হয়েছে?', 'e.g. How much did I sell today?')) + '">' +
            esc(st.typed || '') + '</textarea>' +
          '<div class="row" style="margin-top:var(--s3)">' +
            '<span class="ai-note">' + L('আপনার প্রশ্নের লেখা আর হিসাব করা মোট সংখ্যা ছাড়া কিছুই বাইরে যায় না।',
              'Only your question text and computed totals ever leave this deployment.') + '</span>' +
            '<button class="btn ai" data-act="ai-ask">' + L('জিজ্ঞাসা', 'Ask') + '</button>' +
          '</div></div>';
      } else {
        body += U.provenance(L('ইনসাইট প্রোভাইডার কনফিগার করা নেই। যে ১০টি প্রশ্নের উত্তর দেওয়া যায়, সেগুলো নিচে বাটন হিসেবে আছে — কোনো কিছুই হারায়নি।',
          'No Insight Provider is configured. The ten answerable questions appear below as buttons — nothing is lost.'), 'brass', I.warn(15));
      }

      if (st.state === 'routing') {
        body += '<div class="card pad ai-answer routing">' +
          '<div class="row"><span class="ai-dot"></span><span class="ai-dot"></span><span class="ai-dot"></span>' +
          '<span style="margin-left:var(--s3);font-size:var(--fs-sm);color:var(--text-2)">' +
          L('প্রশ্নটি কোন হিসাবের সাথে মেলে দেখা হচ্ছে…', 'Matching your question to a known query…') + '</span></div></div>';
      }

      if (st.state === 'refused') {
        body += '<div class="card pad ai-answer refused">' +
          '<div class="row top">' + I.warn(18) +
          '<div><b>' + L('এই প্রশ্নের উত্তর দেওয়া যাবে না', 'This question cannot be answered') + '</b>' +
          '<p>' + L('“' + esc(st.typed) + '” — এটি যে ১০টি হিসাব করা যায় তার কোনোটির সাথে মেলে না। ভুল উত্তর দেওয়ার চেয়ে না বলা ভালো।',
            '“' + esc(st.typed) + '” does not match any of the ten computable queries. Being told no is better than a confident wrong answer.') + '</p></div></div>' +
          '<hr class="rule"><span class="eyebrow">' + L('যা জিজ্ঞাসা করা যায়', 'What can be asked') + '</span>' +
          '<div class="q-chips" style="margin-top:var(--s3)">' + vis.slice(0, 5).map(function (q) {
            return '<button class="q-chip" data-act="ai-run" data-arg="' + q.id + '">' + L(q.bn, q.en) + '</button>';
          }).join('') + '</div></div>';
      }

      /* A gated Role's question was understood; only the figure is withheld. Saying so is
         the point — FR-45's rule is that a refusal must announce itself, because silence
         reads as a bug, and here it would also read as *the assistant did not understand
         me* when it did. This is a permission, not a failure of routing. */
      if (st.state === 'gated') {
        body += '<div class="card pad ai-answer refused">' +
          '<div class="row top">' + I.lock(18) +
          '<div><b>' + L('এই উত্তরটি আপনার দায়িত্বে দেখানো যায় না', 'This answer is not for your Role') + '</b>' +
          '<p>' + L('“' + esc(st.typed) + '” — প্রশ্নটি বোঝা গেছে, কিন্তু এর উত্তরে টাকার হিসাব আসে, যা আপনার দায়িত্বে দেখানো হয় না। মালিক বা হিসাবরক্ষক এটি দেখতে পারবেন।',
            '“' + esc(st.typed) + '” was understood, but its answer is money your Role may not see. The Owner or the Accountant can read it.') + '</p></div></div></div>';
      }

      if (st.state === 'answered') {
        body += renderAnswer(st.query);
      }

      if (st.state === 'timeout') {
        body += U.provenance(L('সহকারী সময়মতো উত্তর দেয়নি — অপেক্ষা করানো হয়নি। নিচের তালিকা থেকে বেছে নিন, হিসাব একই থাকবে।',
          'The assistant did not respond in time, so you are not left waiting. Pick from the list — the figures are identical.'), 'amber', I.warn(15));
      }

      body += '<div class="card flush">' +
        '<div class="card-head"><h3>' + (whole
          ? L('যে ১০টি প্রশ্নের উত্তর দেওয়া যায়', 'The ten answerable questions')
          : L('আপনি যে ' + n(vis.length) + 'টি প্রশ্ন করতে পারেন',
              'The ' + n(vis.length) + ' questions your Role can ask')) + '</h3>' +
        '<span class="chip sm outline">' + L('নির্দিষ্ট তালিকা', 'closed set') + '</span></div>' +
        /* numbered by position in the closed set, not in this list: query 8 is query 8
           whoever is reading, so a Packer's three read 3, 4 and 8 rather than 1, 2, 3 */
        vis.map(function (q) {
          return '<button class="list-item" data-act="ai-run" data-arg="' + q.id + '">' +
            '<span class="lead">' + n(QUERIES.indexOf(q) + 1) + '</span>' +
            '<span class="body"><b>' + L(q.bn, q.en) + '</b></span>' +
            '<span class="chev">' + I.chev(16) + '</span></button>';
        }).join('') + '</div>';

      if (!whole) {
        body += U.provenance(L('বাকি প্রশ্নগুলোর উত্তরে টাকার হিসাব আসে, যা আপনার দায়িত্বে দেখানো হয় না — তাই সেগুলো এখানে নেই। কিছু নষ্ট হয়নি।',
          'The remaining questions answer with money your Role may not see, so they are not listed. Nothing is broken.'),
          'brass', I.lock(15));
      }

      body += U.provenance(L('সংখ্যাগুলো অ্যাপ নিজে হিসাব করে — সহকারী শুধু প্রশ্নটা বোঝে আর উত্তরটা বাংলায় সাজায়। তাই সহকারী বন্ধ থাকলেও উত্তর একই।',
        'The application computes every figure. The assistant only classifies your question and phrases the reply, so the answer is identical when it is off.'),
        'violet', I.info(15));

      body += '</div>';

      return { route: 'insights', title: L('জিজ্ঞাসা করুন', 'Ask SmartBiz'),
        eyebrow: L('সহকারী', 'Assistant'), body: body };
    },
    after: function () {
      var box = document.getElementById('ai-q');
      if (box && App.state.insight && App.state.insight.focus) { box.focus(); App.state.insight.focus = false; }
    }
  };

  function renderAnswer(id) {
    var q = QUERIES.filter(function (x) { return x.id === id; })[0];
    var a = answerFor(id);
    var out = '<div class="card pad ai-answer">' +
      '<div class="row"><span class="chip violet sm">' + I.spark(12) + L('রুট করা হয়েছে', 'routed') + '</span>' +
      '<span class="chip outline sm">' + L(q.bn, q.en) + '</span></div>' +
      '<p class="ai-text">' + L(a.bn, a.en) + '</p>';

    if (a.figures && a.figures.length) {
      out += '<div class="fig-table">' + a.figures.map(function (f) {
        return '<div class="fig-row"><span>' + f[0] + '</span><b class="money">' + tk(f[1]) + '</b></div>';
      }).join('') + '</div>';
    }

    if (a.decomp) {
      /* FR-82 — profit change decomposed into named, signed components */
      var parts = [
        { bn: 'রিটার্নে ক্ষতি', en: 'Loss on returns', v: -330, why: L('২টি চুড়ি সেট নষ্ট হয়ে ফেরত', '2 bangle sets returned damaged') },
        { bn: 'ছাড় দেওয়া হয়েছে', en: 'Discounts given', v: -100, why: L('ORD-1040 — নিয়মিত ক্রেতা', 'ORD-1040 — repeat Customer') },
        { bn: 'কুরিয়ার ও COD ফি', en: 'Courier and COD fees', v: -1310, why: L('১৪টি পার্সেল', '14 parcels') }
      ];
      out += '<div class="decomp">' + parts.map(function (p) {
        return '<div class="dc-line"><span class="lbl">' + L(p.bn, p.en) + '</span>' +
          '<span class="why">' + p.why + '</span>' +
          '<b class="money neg">' + tk(p.v) + '</b></div>';
      }).join('') + '<div class="dc-line total"><span class="lbl">' + L('মোট পরিবর্তন', 'Total change') + '</span>' +
      '<b class="money neg">' + tk(-1740) + '</b></div></div>';
    }

    if (a.risky) {
      out += '<div class="card flush" style="margin-top:var(--s4)">' + a.risky.map(function (c) {
        var r = App.risk(c);
        return '<button class="list-item" data-go="customer/' + c.id + '">' +
          '<span class="lead red">' + esc(L(c.name, c.nameEn).charAt(0)) + '</span>' +
          '<span class="body"><b>' + esc(L(c.name, c.nameEn)) + '</b><span>' +
          L(n(c.returned) + ' / ' + n(r.total) + ' অর্ডার ফেরত', n(c.returned) + ' of ' + n(r.total) + ' orders returned') + '</span></span>' +
          U.riskChip(c, true) + '</button>';
      }).join('') + '</div>';
    }

    out += '<div class="ai-foot">' +
      '<button class="basis-btn" data-act="basis-why">' + U.basisPill(a.basis) + '</button>' +
      U.completeness(a.complete.have, a.complete.of) +
      '<span class="spacer"></span>' +
      '<button class="btn sm ghost" data-go="' + a.go + '">' + L('হিসাব দেখুন', 'See the working') + '</button>' +
      '</div></div>';
    return out;
  }

  App.actions['ai-ask'] = function () {
    var box = document.getElementById('ai-q');
    var typed = (box && box.value || '').trim();
    if (!typed) { U.toast(L('প্রশ্নটি লিখুন', 'Type a question first'), 'warn'); return; }

    App.state.insight = { typed: typed, state: 'routing' };
    App.render();

    setTimeout(function () {
      /* Naive routing, deliberately: keyword hit → one of the ten, else refuse. A real
         classifier sits here in the built product; what matters at this fidelity is that
         the output is constrained to the closed set of eleven outcomes FR-79 allows, and
         that failing to match is a refusal rather than a nearest guess.

         Order is significance, not id order: the first match wins, so a keyword that also
         appears in a longer phrase has to sit below the query that phrase belongs to.
         `আটকে`/`stuck` is the case that bites — it appears in both the courier question and
         the stuck-at-status one — so the courier query is identified by the word courier
         and only q8 claims the stuck wording.

         q1 is keyed on phrases rather than the word for "today", because a question can
         mention today and be about anything at all: on a bare `আজ` the refusal case
         *"আজ ঢাকায় বৃষ্টি হবে কি"* answered with a sales figure. A keyword loose enough to
         catch every phrasing of a query is loose enough to destroy the refusal. */
      var t = typed.toLowerCase();
      var hit = null;
      var map = [
        ['q1', ['আজ কত', 'আজকের', 'আজ কেমন', 'sold today', 'sell today', 'sales today', "today's sales"]],
        ['q7', ['কুরিয়ার', 'courier', 'custody']],
        ['q2', ['বিক্রি', 'sell', 'sold', 'best']],
        ['q3', ['স্টক', 'stock', 'শেষ']],
        ['q4', ['রিটার্ন', 'return', 'ফেরত']],
        ['q5', ['খরচ', 'expense', 'spend', 'spent']],
        ['q6', ['লাভ', 'profit', 'মুনাফা', 'কমল', 'কমেছে']],
        ['q8', ['ধাপ', 'status', 'আটকে', 'stuck', 'pending']],
        ['q9', ['বাকি', 'owe', 'owes', 'due']],
        ['q10', ['অমিল', 'variance', 'settle', 'mismatch']]
      ];
      for (var i = 0; i < map.length && !hit; i++) {
        for (var j = 0; j < map[i][1].length; j++) {
          if (t.indexOf(map[i][1][j]) > -1) { hit = map[i][0]; break; }
        }
      }

      if (hit && !askable(queryById(hit))) App.state.insight = { typed: typed, state: 'gated', query: hit };
      else if (hit) App.state.insight = { typed: typed, state: 'answered', query: hit };
      else App.state.insight = { typed: typed, state: 'refused' };
      App.render();
    }, 900);
  };

  App.actions['ai-run'] = function (id) {
    App.state.insight = { state: 'answered', query: id };
    App.render();
  };
})(window.App);
