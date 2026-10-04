/* SmartBiz BD — audit trail, settings, roles, the AI assistant panel, and the
   process-flow diagrams.

   Two things this module is really about. First, that nothing is ever deleted:
   the audit trail is append-only and a correction is a new opposite entry, so
   A-84 shows a reversal sitting next to what it reversed rather than in place
   of it. Second, that the model's job is small and stated plainly — it routes a
   question and phrases an answer; it never touches a figure. */

(function (App) {
  'use strict';

  var L = App.L, n = App.n, tk = App.tk, I = App.I, U = App.ui, esc = App.esc;

  /* ================================================== AUDIT ============= */

  var ACTS = {
    'order.create':       { bn: 'অর্ডার তৈরি',        en: 'Order created',        ic: 'orders',  tone: 'green' },
    'order.pack':         { bn: 'প্যাক করা হয়েছে',    en: 'Order packed',         ic: 'packed',  tone: 'teal' },
    'price.override':     { bn: 'দাম বদলানো',         en: 'Price overridden',     ic: 'tag',     tone: 'amber' },
    'settlement.import':  { bn: 'নিষ্পত্তি আনা',      en: 'Settlement imported',  ic: 'sheet',   tone: 'teal' },
    'return.accept':      { bn: 'ফেরত নেওয়া',        en: 'Return accepted',      ic: 'returned',tone: 'amber' },
    'entry.reverse':      { bn: 'এন্ট্রি ফিরিয়ে নেওয়া', en: 'Entry reversed',    ic: 'undo',    tone: 'red' },
    'stock.adjust':       { bn: 'স্টক সংশোধন',        en: 'Stock adjusted',       ic: 'box',     tone: 'brass' },
    'member.invite':      { bn: 'সদস্য যোগ',          en: 'Member invited',       ic: 'people',  tone: 'green' },
    'due.record':         { bn: 'বাকি লেখা',          en: 'Due recorded',         ic: 'money',   tone: 'amber' },
    'customer.create':    { bn: 'ক্রেতা যোগ',         en: 'Customer added',       ic: 'people',  tone: '' }
  };

  var AUDIT_FILTERS = [
    { key: 'all',   bn: 'সব',              en: 'Everything' },
    { key: 'money', bn: 'টাকা সংক্রান্ত',  en: 'Money' },
    { key: 'rev',   bn: 'ফিরিয়ে নেওয়া',   en: 'Reversals' },
    { key: 'stock', bn: 'স্টক',            en: 'Stock' }
  ];

  App.screens.audit = {
    /* PRD §6.2 names two Roles on the View Audit Entries row: Owner and Accountant. The
       Manager is not one of them, and that is the whole reason this is a Role list rather
       than the `money: true` it used to be — a Manager sees every figure in the product,
       so a money gate let them straight in. Entries do carry the amounts of the operations
       they record, which is why the surface looks like a money surface and was mistaken
       for one; the matrix is about who may audit, not about who may read a number. */
    roles: ['owner', 'accountant'],
    title: function () { return L('কে কী করেছে', 'Audit trail'); },
    view: function (args) {
      if (args[0]) return auditEntry(args[0]);
      var f = App.state.auditFilter || 'all';

      var rows = App.audit.filter(function (a) {
        if (f === 'all') return true;
        if (f === 'money') return /settlement|due|entry|price/.test(a.act);
        if (f === 'rev') return a.act === 'entry.reverse';
        if (f === 'stock') return /stock|order\.pack/.test(a.act);
        return true;
      });

      /* group by day so the trail reads as a diary rather than a log file */
      var days = [];
      rows.forEach(function (a) {
        var d = a.at.slice(0, 10);
        var g = days.filter(function (x) { return x.d === d; })[0];
        if (!g) { g = { d: d, items: [] }; days.push(g); }
        g.items.push(a);
      });

      return { route: 'audit', nav: 'audit', noBack: true,
        title: L('কে কী করেছে', 'Audit trail'),
        eyebrow: L('কিছু মুছে যায় না — ভুল ঠিক করা হয় উল্টো এন্ট্রি দিয়ে',
                   'Nothing is deleted — a mistake is corrected by an opposite entry'),
        body: '<div class="stack g4">' +
          U.provenance(L('এই তালিকায় শুধু যোগ হয়, কখনো বদলায় না বা মোছা যায় না। কর্মচারী বদলালেও পুরনো এন্ট্রি কার নামে ছিল তা থেকে যায়।',
            'This list only ever grows. Entries are never edited or removed, and a departed member\'s past entries keep their name.'), 'teal', I.shield(15)) +
          '<div class="chip-scroll">' + AUDIT_FILTERS.map(function (x) {
            return '<button class="chip selectable' + (x.key === f ? '' : ' outline') + '" aria-pressed="' +
              (x.key === f ? 'true' : 'false') + '" data-act="audit-filter" data-arg="' + x.key + '">' +
              L(x.bn, x.en) + '</button>';
          }).join('') + '</div>' +
          days.map(function (g) {
            return '<div class="daygroup"><div class="dg-head">' + App.date(g.d) +
              (g.d === App.TODAY ? ' · ' + L('আজ', 'today') : '') + '</div>' +
              '<div class="card flush">' + g.items.map(auditRow).join('') + '</div></div>';
          }).join('') +
          (rows.length ? '' : U.emptyState({ icon: I.search(24),
            title: L('এই ধরনের কিছু নেই', 'Nothing of this kind'),
            body: L('অন্য ছাঁকনি বেছে দেখুন।', 'Try another filter.') })) +
          U.provenance(L('তালিকা ছয় মাস দেখা যায়। এর আগের হিসাব দরকার হলে ফাইল হিসেবে নামানো যাবে।',
            'Six months are browsable here. Anything older can be exported as a file.'), '', I.info(15)) +
          '</div>' };
    }
  };

  App.actions['audit-filter'] = function (k) { App.state.auditFilter = k; App.render(); };

  function auditRow(a) {
    var meta = ACTS[a.act] || { bn: a.act, en: a.act, ic: 'info', tone: '' };
    var who = App.ROLES[a.who];
    return '<button class="list-item" data-go="audit/' + a.id + '">' +
      '<span class="lead ' + meta.tone + '">' + I[meta.ic](17) + '</span>' +
      '<span class="body"><b>' + L(meta.bn, meta.en) + ' · ' + esc(a.target) + '</b>' +
      '<span>' + esc(L(who.name, who.nameEn)) + ' (' + L(who.label, who.labelEn) + ') · ' +
      App.time(a.at) + (a.detail ? ' · ' + esc(L(a.detail, a.detailEn)) : '') + '</span></span>' +
      '<span class="chev">' + I.chev(16) + '</span></button>';
  }

  function auditEntry(id) {
    var a = App.audit.filter(function (x) { return x.id === id; })[0];
    if (!a) return notFound();
    var meta = ACTS[a.act] || { bn: a.act, en: a.act, ic: 'info', tone: '' };
    var who = App.ROLES[a.who];
    var isReversal = a.act === 'entry.reverse';

    var body = '<div class="stack g4">' +
      '<div class="card pad audit-hero">' +
      '<span class="ah-ic ' + meta.tone + '">' + I[meta.ic](22) + '</span>' +
      '<h2>' + L(meta.bn, meta.en) + '</h2>' +
      '<span class="prof-sub">' + esc(a.target) + '</span>' +
      '<div class="dl-block" style="margin-top:var(--s4);text-align:left"><dl class="dl">' +
      '<dt>' + L('কে', 'Who') + '</dt><dd>' + esc(L(who.name, who.nameEn)) + ' · ' + L(who.label, who.labelEn) + '</dd>' +
      '<dt>' + L('কখন', 'When') + '</dt><dd>' + App.date(a.at, true) + '</dd>' +
      '<dt>' + L('এন্ট্রি নম্বর', 'Entry') + '</dt><dd>' + a.id + '</dd>' +
      (a.detail ? '<dt>' + L('বিবরণ', 'Detail') + '</dt><dd>' + esc(L(a.detail, a.detailEn)) + '</dd>' : '') +
      '</dl></div></div>';

    if (isReversal) {
      /* the whole point of the pattern, drawn as a pair */
      body += '<div class="card pad"><div class="section-title"><h2>' + L('বিপরীত এন্ট্রির জোড়া', 'The compensating pair') + '</h2></div>' +
        '<div class="rev-pair">' +
        '<div class="rp-card struck"><span class="eyebrow">' + L('মূল এন্ট্রি — থেকে যাচ্ছে', 'The original — still there') + '</span>' +
        '<b>E-199 · ' + L('বিজ্ঞাপন খরচ', 'Advertising expense') + '</b>' +
        '<span class="money">' + tk(3500) + '</span>' +
        '<i>' + App.date('2026-09-04') + ' · ' + L('মিজানুর রহমান', 'Mizanur Rahman') + '</i></div>' +
        '<div class="rp-op">' + I.undo(18) + '</div>' +
        '<div class="rp-card"><span class="eyebrow">' + L('উল্টো এন্ট্রি — নতুন যোগ হলো', 'The reversal — newly added') + '</span>' +
        '<b>E-199-R · ' + L('বিজ্ঞাপন খরচ বাতিল', 'Advertising expense reversed') + '</b>' +
        '<span class="money red">−' + App.tkPlain(3500) + '</span>' +
        '<i>' + App.date('2026-09-06') + ' · ' + L('নুসরাত জাহান', 'Nusrat Jahan') + '</i></div>' +
        '</div>' +
        '<div class="fig-table" style="margin-top:var(--s4)">' +
        '<div class="fig-row total"><span>' + L('দুইটি মিলে দাঁড়ায়', 'The two together come to') + '</span><b class="money">' + tk(0) + '</b></div></div>' +
        '<div style="margin-top:var(--s3)">' + U.provenance(
          L('মূল এন্ট্রিটি মুছে ফেলা হয়নি। তাই আগের মাসের রিপোর্ট যেমন ছিল তেমনই থাকে, আর ভুলটা কখন ধরা পড়েছিল সেটাও জানা যায়।',
            'The original was not deleted. Last month\'s report still reads as it did, and the date the mistake was caught is knowable.'),
          'teal', I.shield(15)) + '</div></div>';

      body += '<div class="card pad"><span class="eyebrow">' + L('কারণ যা লেখা হয়েছিল', 'The reason recorded') + '</span>' +
        '<p class="quote">' + L('“একই বিজ্ঞাপনের বিল দুইবার তোলা হয়েছিল। বিকাশের কাগজ দেখে মিলিয়ে দেখা গেছে একবারই দেওয়া হয়েছে।”',
          '"The same advertising bill was entered twice. Checking the bKash record showed it was only paid once."') + '</p></div>';
    }

    body += '<div class="card pad"><span class="eyebrow">' + L('যেগুলো ফিরিয়ে নেওয়া যায়', 'What can be reversed') + '</span>' +
      '<p class="note-text">' + L('সাতটি কাজ ফিরিয়ে নেওয়া যায়, আর তার বাইরে কিছু নয় — তালিকাটা ছোট রাখা হয়েছে যাতে কোন কাজ ফেরানো যাবে তা নিয়ে সন্দেহ না থাকে।',
        'Seven operations are reversible and nothing else. The list is kept short so there is never doubt about whether something can be undone.') + '</p>' +
      '<div class="chip-grid" style="margin-top:var(--s3)">' +
      [['অর্ডার বাতিল', 'Order cancellation'], ['ফেরত গ্রহণ', 'Return acceptance'],
       ['খরচের এন্ট্রি', 'Expense entry'], ['স্টক সংশোধন', 'Stock adjustment'],
       ['বাকি পরিশোধ', 'Due payment'], ['নিষ্পত্তির সিদ্ধান্ত', 'Settlement disposition'],
       ['দাম বদল', 'Price override']].map(function (x) {
        return '<span class="chip outline sm">' + L(x[0], x[1]) + '</span>';
      }).join('') + '</div></div>';

    if (!isReversal) {
      body += '<button class="btn ghost block brass" data-act="reverse-entry" data-arg="' + a.id + '">' + I.undo(15) +
        L('এই এন্ট্রি ফিরিয়ে নিন', 'Reverse this entry') + '</button>';
    }

    body += '</div>';

    return { route: 'audit', nav: 'audit', title: L('এন্ট্রির বিবরণ', 'Entry detail'), eyebrow: a.id, body: body };
  }

  App.actions['reverse-entry'] = function (id) {
    U.openSheet({
      title: L('ফিরিয়ে নিতে চান?', 'Reverse this entry?'),
      sub: L('মূল এন্ট্রি মুছবে না। একটি উল্টো এন্ট্রি যোগ হবে, আর দুইটিই তালিকায় থাকবে।',
             'The original is not removed. An opposite entry is added and both stay in the list.'),
      body: U.field({ label: L('কেন ফিরিয়ে নিচ্ছেন', 'Why are you reversing it'), type: 'textarea', rows: 3,
        required: true, hint: L('কারণ ছাড়া ফিরিয়ে নেওয়া যায় না — ছয় মাস পরে আপনিই জানতে চাইবেন কেন।',
          'A reason is required; in six months you will be the one asking why.') }),
      foot: '<button class="btn ghost" data-act="close-sheet">' + L('বাতিল', 'Cancel') + '</button>' +
        '<button class="btn danger" data-act="reverse-save">' + L('উল্টো এন্ট্রি লিখুন', 'Write the reversal') + '</button>'
    });
  };

  App.actions['reverse-save'] = function () {
    U.closeSheet();
    U.toast(L('উল্টো এন্ট্রি লেখা হয়েছে', 'Reversal recorded'), '', L('ফিরিয়ে নিন', 'Undo'));
    App.go('audit');
  };

  /* ================================================== SETTINGS ========== */

  App.screens.settings = {
    title: function () { return L('সেটিংস', 'Settings'); },
    view: function (args) {
      if (args[0] === 'members') return members();
      if (args[0] === 'business') return businessProfile();
      if (args[0] === 'ai') return aiSettings();

      var GROUPS = [
        { bn: 'ব্যবসা', en: 'Business', items: [
          { go: 'settings/business', ic: 'shop', bn: 'ব্যবসার তথ্য', en: 'Business profile', roles: ['owner'],
            sub: App.business.name, subEn: App.business.nameEn },
          { go: 'settings/members', ic: 'people', bn: 'সদস্য ও দায়িত্ব', en: 'Members & roles', roles: ['owner', 'manager'],
            sub: '৫ জন', subEn: '5 people' },
          { go: 'suppliers', ic: 'truck', bn: 'সরবরাহকারী', en: 'Suppliers', sub: '৩ জন', subEn: '3 suppliers' }
        ] },
        { bn: 'কাজের ধরন', en: 'How it works', items: [
          { go: 'settings/ai', ic: 'spark', bn: 'সহকারী', en: 'Assistant',
            sub: 'চালু আছে', subEn: 'On', tone: 'violet' },
          { go: 'flows', ic: 'flow', bn: 'কাজের ধারা', en: 'Process flows',
            sub: 'তিনটি ছবি', subEn: 'three diagrams' },
          { go: 'audit', ic: 'shield', bn: 'কে কী করেছে', en: 'Audit trail', sub: '', subEn: '' }
        ] }
      ];

      return { route: 'settings', nav: 'settings', noBack: true, title: L('সেটিংস', 'Settings'),
        eyebrow: esc(L(App.business.name, App.business.nameEn)),
        body: '<div class="stack g4">' +
          '<div class="card pad prof-head"><div class="prof-av green">' +
          esc(L(App.ROLES[App.role].name, App.ROLES[App.role].nameEn).charAt(0)) + '</div>' +
          '<h2>' + esc(L(App.ROLES[App.role].name, App.ROLES[App.role].nameEn)) + '</h2>' +
          '<span class="prof-sub">' + L(App.ROLES[App.role].label, App.ROLES[App.role].labelEn) + ' · ' +
          esc(App.business.phone) + '</span></div>' +

          /* gate by absence, not by a row that refuses when pressed */
          GROUPS.map(function (g) {
            return '<div class="card flush"><div class="card-head"><h3>' + L(g.bn, g.en) + '</h3></div>' +
              g.items.filter(function (it) { return (!it.roles || it.roles.indexOf(App.role) >= 0) && App.canReach(it.go); }).map(function (it) {
                return '<button class="list-item" data-go="' + it.go + '">' +
                  '<span class="lead ' + (it.tone || '') + '">' + I[it.ic](17) + '</span>' +
                  '<span class="body"><b>' + L(it.bn, it.en) + '</b>' +
                  (it.sub ? '<span>' + esc(L(it.sub, it.subEn)) + '</span>' : '') + '</span>' +
                  '<span class="chev">' + I.chev(16) + '</span></button>';
              }).join('') + '</div>';
          }).join('') +

          '<div class="card flush"><div class="card-head"><h3>' + L('পছন্দ', 'Preferences') + '</h3></div>' +
          U.toggleRow({ title: L('বাংলা সংখ্যা দেখান', 'Show Bangla digits'),
            sub: L('১২৩ নাকি 123', '১২৩ or 123'), on: App.lang === 'bn' }) +
          U.toggleRow({ title: L('স্টক কমলে জানান', 'Warn when stock runs low'),
            sub: L('যে সংখ্যা আপনি ঠিক করে দিয়েছেন তার নিচে নামলে', 'When it drops below your own threshold'), on: true }) +
          U.toggleRow({ title: L('অফলাইনে কাজ করুন', 'Work offline'),
            sub: L('নেট না থাকলেও অর্ডার নেওয়া যাবে, পরে নিজে থেকে মিলে যাবে',
                   'Orders can be taken without a connection and sync later'), on: true }) +
          '</div>' +

          '<button class="btn ghost block quiet" data-act="noop">' + L('সাইন আউট', 'Sign out') + '</button>' +
          '<div class="version">SmartBiz BD · ' + L('প্রোটোটাইপ', 'prototype') + ' · v0.1</div>' +
          '</div>' };
    }
  };

  /* -------------------------------------------------- MEMBERS & ROLES ---- */

  var PERMS = [
    { bn: 'অর্ডার নেওয়া',        en: 'Take orders',            has: ['owner', 'manager', 'sales'] },
    { bn: 'অর্ডার এগিয়ে নেওয়া', en: 'Advance orders',         has: ['owner', 'manager', 'sales'] },
    { bn: 'বিক্রয়মূল্য দেখা',    en: 'See selling prices',     has: ['owner', 'manager', 'accountant', 'sales'] },
    { bn: 'ক্রয়মূল্য দেখা',      en: 'See Purchase Cost',      has: ['owner', 'manager', 'accountant', 'inventory'] },
    { bn: 'লাভ দেখা',             en: 'See profit',             has: ['owner', 'manager', 'accountant'] },
    { bn: 'খরচ লেখা',             en: 'Record expenses',        has: ['owner', 'manager', 'accountant'] },
    { bn: 'নিষ্পত্তি মেলানো',     en: 'Reconcile settlements',  has: ['owner', 'manager', 'accountant'] },
    { bn: 'দাম বদলানো',           en: 'Override a price',       has: ['owner', 'manager'] },
    { bn: 'স্টক এন্ট্রি ফিরিয়ে নেওয়া', en: 'Reverse a stock entry', has: ['owner', 'manager', 'inventory'] },
    { bn: 'সদস্য যোগ করা',        en: 'Invite members',         has: ['owner', 'manager'] }
  ];

  function members() {
    if (['owner', 'manager'].indexOf(App.role) < 0) {
      return { route: 'settings', nav: 'settings', title: L('সদস্য ও দায়িত্ব', 'Members & roles'),
        body: U.emptyState({ icon: I.lock(24), title: L('এই তালিকা আপনার Role-এ নেই', 'This list is not available to your Role'),
          body: L('শুধু Owner ও Manager সদস্য এবং বাকি আমন্ত্রণ দেখতে পারেন।',
            'Only an Owner or Manager can view Members and outstanding invitations.'),
          action: '<button class="btn ghost" data-go="settings">' + L('সেটিংসে ফিরুন', 'Back to settings') + '</button>' }) };
    }
    var order = ['owner', 'manager', 'accountant', 'inventory', 'sales'];
    var MONEY = {
      full:  { bn: 'সব টাকার তথ্য', en: 'All money', tone: 'green' },
      price: { bn: 'শুধু বিক্রয়মূল্য', en: 'Selling prices only', tone: 'amber' },
      cost:  { bn: 'শুধু ক্রয়মূল্য', en: 'Purchase Cost only', tone: 'teal' }
    };

    return { route: 'settings', nav: 'settings', title: L('সদস্য ও দায়িত্ব', 'Members & roles'),
      eyebrow: L('কে কী দেখতে পাবে', 'Who can see what'),
      acts: ['owner', 'manager'].indexOf(App.role) >= 0 ? '<button class="btn sm primary" data-go="invitations/generate">' + I.plus(15) + L('যোগ করুন', 'Invite') + '</button>' : '',
      body: '<div class="stack g4">' +
        U.provenance(L('দায়িত্ব ঠিক করে দিলে টাকার তথ্য আপনা থেকেই লুকিয়ে যায়। কর্মী দাম দেখবে, কিন্তু ক্রয়মূল্য বা লাভ নয় — আর তাকে খালি পর্দা দেখানো হবে না, কারণটা লেখা থাকবে।',
          'Choosing a Role composes the interface. Sales Staff see selling prices; Inventory Staff see Purchase Cost; neither sees profit or settlement.'), 'teal', I.lock(15)) +

        '<div class="card flush">' + order.map(function (k) {
          var r = App.ROLES[k];
          var m = MONEY[r.money];
          return '<button class="list-item' + (k === App.role ? ' is-me' : '') + '" data-act="switch-role" data-arg="' + k + '">' +
            '<span class="lead ' + m.tone + '">' + esc(App.initials(r)) + '</span>' +
            '<span class="body"><b>' + esc(L(r.name, r.nameEn)) +
            (k === App.role ? ' <i class="chip green sm">' + L('আপনি', 'you') + '</i>' : '') + '</b>' +
            '<span>' + L(r.label, r.labelEn) + ' · ' + L(m.bn, m.en) + '</span></span>' +
            '<span class="chev">' + I.chev(16) + '</span></button>';
        }).join('') + '</div>' +

        '<div class="card pad"><div class="section-title"><h2>' + L('দায়িত্ব অনুযায়ী কী করা যায়', 'What each Role can do') + '</h2></div>' +
        '<div class="tbl-wrap"><table class="tbl perm-tbl"><thead><tr><th></th>' +
        order.map(function (k) { return '<th>' + esc(App.initials(App.ROLES[k])) + '</th>'; }).join('') +
        '</tr></thead><tbody>' + PERMS.map(function (p) {
          return '<tr><td class="rowh">' + L(p.bn, p.en) + '</td>' +
            order.map(function (k) {
              var yes = p.has.indexOf(k) >= 0;
              return '<td class="' + (yes ? 'yes' : 'no') + '">' + (yes ? I.check(13) : '·') + '</td>';
            }).join('') + '</tr>';
        }).join('') + '</tbody></table></div>' +
        '<div class="grid-legend" style="margin-top:var(--s3)">' +
        order.map(function (k) {
          return '<span><b>' + esc(App.initials(App.ROLES[k])) + '</b> ' + L(App.ROLES[k].label, App.ROLES[k].labelEn) + '</span>';
        }).join('') + '</div></div>' +

        '<div class="card pad"><span class="eyebrow">' + L('যোগ করার নিয়ম', 'How joining works') + '</span>' +
        '<div class="steps vert" style="margin-top:var(--s3)">' +
        [['কোড তৈরি হয়', 'A code is generated'],
         ['কোডটি যেভাবে খুশি পাঠান — হোয়াটসঅ্যাপ, খাতায় লিখে, মুখে বলে', 'Send it however you like — WhatsApp, on paper, spoken aloud'],
         ['Role-বাঁধা কোডটি একবার ব্যবহার করেই সে যোগ দেয়', 'They redeem the Role-bound code once to join']].map(function (s, i) {
          return '<div class="vstep"><span class="n">' + App.bnDigits(String(i + 1)) + '</span>' +
            '<span>' + L(s[0], s[1]) + '</span></div>';
        }).join('') + '</div>' +
        '<div style="margin-top:var(--s3)">' + U.provenance(
          L('ইমেইল লাগে না। থাকলে কোডটা ইমেইলেও যাবে, না থাকলেও যোগ করা আটকাবে না।',
            'Email is not required. If it is configured the code also goes by email; if not, joining still works.'), 'teal') + '</div></div>' +
        '</div>' };
  }

  App.actions['invite-member'] = function () {
    U.openSheet({
      title: L('নতুন সদস্য যোগ করুন', 'Invite a member'),
      sub: L('একটা কোড তৈরি হবে। কোডটাই আসল জিনিস — ইমেইল থাকলে বাড়তি সুবিধা।',
             'A code is generated. The code is the primitive; email is a convenience on top.'),
      body: '<div class="stack g3">' +
        U.field({ label: L('নাম', 'Name'), placeholder: L('যেমন: রুমা বেগম', 'e.g. Ruma Begum') }) +
        U.field({ label: L('দায়িত্ব', 'Role'), type: 'select', options: [
          { label: L('Owner', 'Owner') },
          { label: L('Manager', 'Manager') },
          { label: L('Accountant', 'Accountant') },
          { label: L('Inventory Staff', 'Inventory Staff') },
          { label: L('Sales Staff', 'Sales Staff'), selected: true }
        ] }) +
        '<div class="code-box"><span class="eyebrow">' + L('যোগ দেওয়ার কোড', 'Join code') + '</span>' +
        '<b class="join-code">SB-4K92-7T</b>' +
        '<span class="cell-sub">' + L('৪৮ ঘণ্টা পর্যন্ত কাজ করবে', 'Valid for 48 hours') + '</span></div>' +
        U.toggleRow({ title: L('ইমেইলেও পাঠান', 'Also send by email'),
          sub: L('ইমেইল সেট করা নেই — চাইলে এখন করা যাবে', 'No email is configured — you can set it up now'), on: false }) +
        '</div>',
      foot: '<button class="btn ghost" data-act="close-sheet">' + L('বাতিল', 'Cancel') + '</button>' +
        '<button class="btn primary" data-act="copy-code">' + I.share(15) + L('কোড কপি করুন', 'Copy the code') + '</button>'
    });
  };

  App.actions['copy-code'] = function () {
    U.closeSheet();
    U.toast(L('কোড কপি হয়েছে — যেভাবে খুশি পাঠান', 'Code copied — send it however you like'));
  };

  App.actions['switch-role'] = function (k) {
    App.role = k;
    document.body.setAttribute('data-role', k);
    var sel = document.getElementById('c-role');
    if (sel) sel.value = k;
    App.render();
    U.toast(L('এখন ' + App.ROLES[k].label + ' হিসেবে দেখছেন', 'Now viewing as ' + App.ROLES[k].labelEn));
  };

  /* -------------------------------------------------- BUSINESS PROFILE -- */

  function businessProfile() {
    var b = App.business;
    return { route: 'settings', nav: 'settings', title: L('ব্যবসার তথ্য', 'Business profile'),
      eyebrow: L('স্লিপ আর রিপোর্টে এই তথ্যই ছাপা হয়', 'This is what prints on slips and reports'),
      body: '<div class="stack g4">' +
        '<div class="card pad"><div class="stack g3">' +
        U.field({ label: L('ব্যবসার নাম', 'Business name'), value: L(b.name, b.nameEn) }) +
        U.field({ label: L('ফোন', 'Phone'), value: b.phone }) +
        U.field({ label: L('পেজ', 'Page'), value: b.page }) +
        U.field({ label: L('ঠিকানা', 'Address'), type: 'textarea', rows: 2, value: b.address }) +
        '</div></div>' +
        '<div class="card pad"><span class="eyebrow">' + L('হিসাবের ধরন', 'How money is counted') + '</span>' +
        '<div class="stack g3" style="margin-top:var(--s3)">' +
        U.field({ label: L('প্রতি পার্সেলে প্যাকেজিং খরচ', 'Packaging cost per parcel'), prefix: '৳',
          money: true, value: String(b.packagingCost),
          hint: L('প্রতিটি অর্ডারের লাভ থেকে এই টাকা বাদ যাবে', 'Deducted from every order\'s profit') }) +
        U.field({ label: L('ডিফল্ট কুরিয়ার', 'Default courier'), type: 'select',
          options: App.couriers.map(function (c, i) { return { label: L(c.name, c.nameEn), selected: i === 0 }; }) }) +
        '</div>' +
        '<div style="margin-top:var(--s4)">' +
        U.toggleRow({ title: L('ফেরত এলে ক্ষতি হিসেবে ধরুন', 'Count returns as a loss'),
          sub: L('পুনঃবিক্রয়যোগ্য হলে শুধু কুরিয়ার খরচ, নষ্ট হলে পুরো ক্রয়মূল্য',
                 'Resalable returns cost only the courier fee; damaged ones cost the full purchase price'), on: true }) +
        U.toggleRow({ title: L('অগ্রিম নেওয়া টাকা আলাদা দেখান', 'Show advance payments separately'),
          sub: L('ক্রেতা কত দিয়েছে আর কত বাকি — দুইটাই দেখাবে', 'Both what was paid and what remains'), on: true }) +
        '</div></div>' +
        U.provenance(L('হিসাবের নিয়ম বদলালে আগের রিপোর্ট বদলায় না — নতুন নিয়ম কেবল আজ থেকে কাজ করবে।',
          'Changing an accounting rule does not rewrite past reports; the new rule applies from today onward.'), 'brass', I.warn(15)) +
        '<div class="sticky-foot"><button class="btn ghost" data-act="back">' + L('বাতিল', 'Cancel') + '</button>' +
        '<button class="btn primary" data-act="save-business">' + L('সংরক্ষণ', 'Save') + '</button></div>' +
        '</div>' };
  }

  App.actions['save-business'] = function () {
    U.toast(L('সংরক্ষিত হয়েছে', 'Saved'), '', L('ফিরিয়ে নিন', 'Undo'));
  };

  /* -------------------------------------------------- AI SETTINGS ------- */

  function aiSettings() {
    var on = App.state.aiOn !== false;

    var SENDS = [
      { ok: true,  bn: 'আপনার প্রশ্নের লেখাটা', en: 'The words of your question' },
      { ok: true,  bn: 'কোন ধরনের প্রশ্ন হতে পারে তার তালিকা', en: 'The list of question kinds it may choose from' },
      { ok: true,  bn: 'উত্তরে বসানোর জন্য শুধু সংখ্যাগুলো — নাম ছাড়া', en: 'Bare figures to phrase into a sentence — with no names' },
      { ok: false, bn: 'ক্রেতার নাম, ফোন বা ঠিকানা', en: 'Any Customer name, phone or address' },
      { ok: false, bn: 'আপনার খাতার কোনো সারি', en: 'Any row from your books' },
      { ok: false, bn: 'পণ্যের ক্রয়মূল্য', en: 'Product cost prices' }
    ];

    return { route: 'settings', nav: 'settings', title: L('সহকারী', 'The assistant'),
      eyebrow: L('কী করে, আর কী করে না', 'What it does, and what it does not'),
      body: '<div class="stack g4">' +
        '<div class="card pad ai-hero"><span class="ai-badge">' + I.spark(20) + '</span>' +
        '<h2>' + L('সহকারী সংখ্যা বানায় না', 'The assistant does not produce figures') + '</h2>' +
        '<p>' + L('এটি শুধু দুইটি কাজ করে — আপনার প্রশ্নটা কোন ধরনের প্রশ্ন তা বুঝে নেয়, আর উত্তরটা বাংলায় সাজিয়ে বলে। সংখ্যা সব হিসাব করে অ্যাপ নিজে, আপনার দায়িত্ব অনুযায়ী।',
          'It does exactly two things — works out which kind of question you asked, and phrases the answer in Bangla. Every figure is computed by the app itself, under your Role.') + '</p>' +
        U.toggleRow({ title: L('সহকারী চালু রাখুন', 'Keep the assistant on'),
          sub: L('বন্ধ করলে বাকি সব কাজ আগের মতোই চলবে — শুধু প্রশ্ন করা যাবে না',
                 'Turning it off changes nothing else — you simply cannot ask questions'), on: on, act: 'ai-toggle' }) +
        '</div>' +

        '<div class="card pad"><div class="section-title"><h2>' + L('কীভাবে কাজ করে', 'How a question travels') + '</h2></div>' +
        '<div class="ai-pipe">' +
        '<div class="ap-step"><span class="n">' + App.bnDigits('1') + '</span>' +
        '<b>' + L('আপনি প্রশ্ন করেন', 'You ask') + '</b>' +
        '<span>' + L('“এই মাসে লাভ কত?”', '"How much profit this month?"') + '</span></div>' +
        '<div class="ap-arrow">' + I.chev(14) + '</div>' +
        '<div class="ap-step violet"><span class="n">' + App.bnDigits('2') + '</span>' +
        '<b>' + L('সহকারী ধরন বাছে', 'It picks the kind') + '</b>' +
        '<span>' + L('দশটি চেনা প্রশ্নের একটি — নাহলে “বুঝিনি”', 'One of ten known questions — or "I did not understand"') + '</span></div>' +
        '<div class="ap-arrow">' + I.chev(14) + '</div>' +
        '<div class="ap-step green"><span class="n">' + App.bnDigits('3') + '</span>' +
        '<b>' + L('অ্যাপ হিসাব করে', 'The app computes') + '</b>' +
        '<span>' + L('আপনার খাতা থেকে, আপনার দায়িত্ব অনুযায়ী', 'From your own books, under your Role') + '</span></div>' +
        '<div class="ap-arrow">' + I.chev(14) + '</div>' +
        '<div class="ap-step violet"><span class="n">' + App.bnDigits('4') + '</span>' +
        '<b>' + L('সহকারী বাংলায় বলে', 'It phrases it in Bangla') + '</b>' +
        '<span>' + L('সংখ্যাগুলো ছুঁয়েও দেখে না', 'It never alters the numbers') + '</span></div>' +
        '</div>' +
        '<div style="margin-top:var(--s4)">' + U.provenance(
          L('তাই সহকারী ভুল সংখ্যা বলতে পারে না। বেশির খারাপ যা হতে পারে — প্রশ্নটা ভুল বুঝে বলবে “বুঝতে পারিনি”।',
            'This is why it cannot state a wrong figure. The worst it can do is misread the question and say it did not understand.'),
          'violet', I.shield(15)) + '</div></div>' +

        '<div class="card pad"><div class="section-title"><h2>' + L('বাইরে কী যায়, কী যায় না', 'What leaves, and what never does') + '</h2></div>' +
        '<div class="allow-list">' + SENDS.map(function (s) {
          return '<div class="al-row ' + (s.ok ? 'ok' : 'no') + '">' +
            '<span class="al-ic">' + (s.ok ? I.check(14) : I.x(14)) + '</span>' +
            '<span>' + L(s.bn, s.en) + '</span></div>';
        }).join('') + '</div>' +
        '<div style="margin-top:var(--s3)">' + U.provenance(
          L('তালিকাটা উল্টো করে বানানো — যা যাওয়ার অনুমতি আছে কেবল তাই যায়, বাকি সব আটকে থাকে।',
            'The list works the other way around: only what is explicitly permitted leaves, and everything else is held back.'), 'teal', I.lock(15)) + '</div></div>' +

        '<div class="card pad"><span class="eyebrow">' + L('যে দশটি প্রশ্ন চেনে', 'The ten questions it knows') + '</span>' +
        '<div class="q-chips" style="margin-top:var(--s3)">' +
        [['এই মাসে লাভ কত', 'Profit this month'], ['আজ কত বিক্রি', 'Sales today'],
         ['কোন পণ্য বেশি চলছে', 'Best-selling product'], ['কার কাছে কত বাকি', 'Who owes what'],
         ['কুরিয়ারের কাছে কত টাকা', 'Cash with couriers'], ['কোন স্টক শেষ হচ্ছে', 'What is running low'],
         ['খরচ কোথায় বেশি', 'Where expenses went'], ['কোন ক্রেতা বেশি ফেরত দেয', 'Who returns most'],
         ['কোন কুরিয়ার ভালো', 'Which courier is better'], ['গত মাসের সাথে তুলনা', 'Compared to last month']].map(function (q) {
          /* the chips document the closed set for every Role; they only navigate for a
             Role that may read an answer, so a gated Member is not walked into a refusal */
          return App.seesProfit()
            ? '<button class="q-chip" data-go="insights">' + L(q[0], q[1]) + '</button>'
            : '<span class="q-chip">' + L(q[0], q[1]) + '</span>';
        }).join('') + '</div>' +
        '<p class="note-text" style="margin-top:var(--s3)">' + L('এর বাইরের প্রশ্ন করলে সহকারী আন্দাজে উত্তর দেবে না — সোজা বলবে যে এটা সে জানে না।',
          'Anything outside this set gets a plain admission rather than a guess.') + '</p></div>' +

        '<div class="card pad"><span class="eyebrow">' + L('কোন সেবা ব্যবহার হচ্ছে', 'Which service is used') + '</span>' +
        '<div class="card flush" style="margin-top:var(--s3)">' +
        '<div class="list-item"><span class="lead violet">' + I.spark(16) + '</span>' +
        '<span class="body"><b>' + L('বর্তমান সেবা', 'Current provider') + '</b>' +
        '<span>' + L('সেবা বদলালে পর্দার কিছুই বদলাবে না', 'Swapping the provider changes nothing on screen') + '</span></span>' +
        '<span class="chip outline sm">' + L('পরিবর্তনযোগ্য', 'swappable') + '</span></div>' +
        '<div class="list-item"><span class="lead brass">' + I.lock(16) + '</span>' +
        '<span class="body"><b>' + L('চাবি সার্ভারে থাকে', 'The key lives on the server') + '</b>' +
        '<span>' + L('ব্রাউজারে কখনো আসে না', 'It never reaches the browser') + '</span></span></div>' +
        '</div></div>' +

        (App.seesProfit() ? '<button class="btn ghost block" data-go="insights">' + I.spark(15) +
          L('সহকারীকে কিছু জিজ্ঞেস করুন', 'Ask the assistant something') + '</button>' : '') +
        '</div>' };
  }

  App.actions['ai-toggle'] = function () {
    App.state.aiOn = App.state.aiOn === false;
    App.render();
    U.toast(App.state.aiOn !== false
      ? L('সহকারী চালু হলো', 'Assistant turned on')
      : L('সহকারী বন্ধ — বাকি সব আগের মতোই চলবে', 'Assistant off — everything else works as before'));
  };

  /* ================================================== PROCESS FLOWS ===== */

  var FLOW_TABS = [
    { key: 'o2c',  bn: 'অর্ডার থেকে টাকা', en: 'Order to cash' },
    { key: 'state', bn: 'অর্ডারের অবস্থা',  en: 'Order statuses' },
    { key: 'settle', bn: 'নিষ্পত্তি মেলানো', en: 'Settlement' }
  ];

  App.screens.flows = {
    title: function () { return L('কাজের ধারা', 'Process flows'); },
    view: function () {
      var t = App.state.flowTab || 'o2c';
      return { route: 'flows', nav: 'settings', title: L('কাজের ধারা', 'Process flows'),
        eyebrow: L('পুরো কাজটা এক নজরে', 'The whole shape, at a glance'),
        body: '<div class="stack g4">' +
          '<div class="seg small full">' + FLOW_TABS.map(function (x) {
            return '<button data-act="flow-tab" data-arg="' + x.key + '" aria-pressed="' +
              (x.key === t ? 'true' : 'false') + '">' + L(x.bn, x.en) + '</button>';
          }).join('') + '</div>' +
          (t === 'o2c' ? flowO2C() : t === 'state' ? flowState() : flowSettle()) +
          '</div>' };
    }
  };

  App.actions['flow-tab'] = function (k) { App.state.flowTab = k; App.render(); };

  function fnode(cfg) {
    /* the node stays in the diagram; only the link goes, for a Role that would be
       refused on arrival — a flow chart may show a step you are not allowed to take */
    var go = cfg.go && App.canReach(cfg.go) ? cfg.go : '';
    return '<div class="fnode ' + (cfg.tone || '') + (go ? ' tappable' : '') + '"' +
      (go ? ' data-go="' + go + '"' : '') + '>' +
      (cfg.ic ? '<span class="fn-ic">' + I[cfg.ic](15) + '</span>' : '') +
      '<b>' + L(cfg.bn, cfg.en) + '</b>' +
      (cfg.sub ? '<span>' + L(cfg.sub, cfg.subEn) + '</span>' : '') +
      (cfg.mark ? '<i class="fn-mark ' + (cfg.markTone || '') + '">' + L(cfg.mark, cfg.markEn) + '</i>' : '') +
      '</div>';
  }

  function fdown(label, labelEn) {
    return '<div class="fdown">' + (label ? '<span>' + L(label, labelEn) + '</span>' : '') + '</div>';
  }

  function flowO2C() {
    return '<div class="card pad flow-card">' +
      '<div class="section-title"><h2>' + L('অর্ডার থেকে টাকা — পুরো পথ', 'Order to cash — end to end') + '</h2></div>' +
      '<p class="note-text">' + L('প্রতি ধাপে কে কাজটা করছে, আর সেই কাজে টাকার হিসাব কীভাবে বদলায় — দুইটাই লেখা আছে। লক্ষ করুন, লাভ দুইবার নড়ে, দুইবার ভিন্ন কারণে।',
        'Each step names who acts and how the money figure changes. Notice that profit moves twice, for two different reasons.') + '</p>' +
      '<div class="flow-diagram">' +
        fnode({ bn: 'মেসেঞ্জারে মেসেজ আসে', en: 'A message arrives', sub: 'ক্রেতা', subEn: 'Customer', ic: 'new', tone: 'teal' }) +
        fdown('পেস্ট, ছবি, ভয়েস বা হাতে', 'pasted, photographed, spoken or typed') +
        fnode({ bn: 'অর্ডার লেখা হয়', en: 'Order captured', sub: 'বিক্রয় কর্মী · খসড়া', subEn: 'Sales Staff · Draft',
          ic: 'orders', go: 'capture', tone: '' }) +
        fdown('ক্রেতা রাজি', 'Customer agrees') +
        fnode({ bn: 'নিশ্চিত', en: 'Confirmed', ic: 'confirmed', tone: 'green',
          mark: 'স্টক আটকে যায়', markEn: 'stock is held' }) +
        fdown() +
        fnode({ bn: 'প্যাক করা হয়', en: 'Packed', sub: 'ইনভেন্টরি কর্মী', subEn: 'Inventory Staff', ic: 'packed', tone: 'teal',
          mark: 'স্লিপ ছাপা হয়', markEn: 'a slip is printed' }) +
        fdown() +
        fnode({ bn: 'কুরিয়ারে দেওয়া হয়', en: 'Shipped', ic: 'truck', tone: 'amber', go: 'cod',
          mark: 'টাকা কুরিয়ারের হাতে', markEn: 'cash enters courier custody', markTone: 'amber' }) +
        fdown('কুরিয়ার পৌঁছে দেয়', 'the courier delivers') +
        fnode({ bn: 'ডেলিভারি হয়েছে', en: 'Delivered', ic: 'delivered', tone: 'green',
          mark: '▲ অর্জিত লাভ বাড়ে', markEn: '▲ earned profit rises', markTone: 'earned' }) +
        fdown('কুরিয়ার সপ্তাহ বা মাস শেষে টাকা পাঠায়', 'the courier pays out weekly or monthly') +
        fnode({ bn: 'নিষ্পত্তির ফাইল আসে', en: 'A payout file arrives', ic: 'sheet', tone: 'teal',
          go: 'settlement', sub: 'হিসাবরক্ষক', subEn: 'Accountant' }) +
        fdown('মিলিয়ে দেখা হয়', 'it is reconciled') +
        fnode({ bn: 'টাকা হাতে এলো', en: 'Cash received', ic: 'settled', tone: 'green',
          mark: '▲ হাতে পাওয়া লাভ বাড়ে', markEn: '▲ realized profit rises', markTone: 'realized' }) +
      '</div>' +

      '<div class="flow-branches"><span class="fb-title">' + L('যে দুইটি পথে বেরিয়ে যেতে পারে', 'The two ways out') + '</span>' +
      '<div class="grid c2">' +
        fnode({ bn: 'বাতিল', en: 'Cancelled', ic: 'cancelled', tone: 'red',
          sub: 'যেকোনো সময় — কিছু মুছে যায় না', subEn: 'at any point — nothing is deleted' }) +
        fnode({ bn: 'ফেরত', en: 'Returned', ic: 'returned', tone: 'amber',
          sub: 'পুনঃবিক্রয়যোগ্য নাকি নষ্ট — ক্ষতি আলাদা', subEn: 'resalable or damaged — the loss differs' }) +
      '</div></div>' +

      U.provenance(L('দুইটি লাভ কখনো একসাথে বাড়ে না। এই ফাঁকটাই বাংলাদেশের ছোট বিক্রেতার আসল সমস্যা — খাতায় লাভ, হাতে টাকা নেই।',
        'The two profits never rise together. That gap is the real problem for a small Bangladeshi seller: profit on paper, no cash in hand.'),
        'brass', I.info(15)) +
      '</div>';
  }

  function flowState() {
    var NODES = ['new', 'confirmed', 'packed', 'shipped', 'delivered', 'partial', 'settled', 'returned', 'cancelled'];
    var LEGAL = {
      new:       ['confirmed', 'cancelled'],
      confirmed: ['packed', 'cancelled'],
      packed:    ['shipped', 'cancelled'],
      shipped:   ['delivered', 'partial', 'returned'],
      delivered: ['settled', 'returned'],
      partial:   ['settled', 'returned'],
      settled:   [],
      returned:  [],
      cancelled: []
    };
    var pick = App.state.flowNode || 'shipped';
    var st = App.STATUS[pick];

    return '<div class="card pad flow-card">' +
      '<div class="section-title"><h2>' + L('অর্ডার কোন অবস্থা থেকে কোথায় যেতে পারে', 'Which status can follow which') + '</h2></div>' +
      '<p class="note-text">' + L('নয়টি অবস্থা, আর নির্দিষ্ট কিছু পথ। একটা অবস্থায় চাপ দিন — সেখান থেকে কোথায় যাওয়া যায় দেখা যাবে। বাকি পথগুলো বন্ধ, তাই ভুল ক্রমে কিছু ঘটতে পারে না।',
        'Nine statuses and only certain paths between them. Tap one to see where it can go. Everything else is closed, so an order cannot move out of order.') + '</p>' +

      '<div class="state-grid">' + NODES.map(function (k) {
        var s = App.STATUS[k];
        var isPick = k === pick;
        var isNext = LEGAL[pick].indexOf(k) >= 0;
        var isTerm = LEGAL[k].length === 0;
        return '<button class="snode ' + s.tone + (isPick ? ' is-pick' : '') + (isNext ? ' is-next' : '') +
          (isTerm ? ' is-term' : '') + '" data-act="flow-node" data-arg="' + k + '">' +
          '<b>' + L(s.bn, s.en) + '</b>' +
          (isTerm ? '<i>' + L('শেষ', 'final') + '</i>' : '') +
          (isNext ? '<i class="nx">' + L('এখানে যেতে পারে', 'can go here') + '</i>' : '') +
          '</button>';
      }).join('') + '</div>' +

      '<div class="state-detail"><span class="eyebrow">' +
      L('“' + st.bn + '” থেকে', 'From "' + st.en + '"') + '</span>' +
      (LEGAL[pick].length
        ? '<div class="row wrap" style="gap:6px;margin-top:6px">' + LEGAL[pick].map(function (k) {
            return '<span class="chip ' + App.STATUS[k].tone + ' sm">' + L(App.STATUS[k].bn, App.STATUS[k].en) + '</span>';
          }).join('') + '</div>'
        : '<p class="note-text">' + L('এটি শেষ অবস্থা। এখান থেকে আর কোথাও যায় না — ভুল হলে উল্টো এন্ট্রি দিয়ে ঠিক করতে হয়, অবস্থা পাল্টে নয়।',
            'This is a final status. Nothing follows it — a mistake here is fixed with a compensating entry, not by changing the status.') + '</p>') +
      '</div>' +

      '<div class="grid-legend" style="margin-top:var(--s4)">' +
      '<span><i class="sw green"></i>' + L('টাকা আসার পথে', 'money on its way in') + '</span>' +
      '<span><i class="sw amber"></i>' + L('কুরিয়ারের হাতে', 'with the courier') + '</span>' +
      '<span><i class="sw red"></i>' + L('ফেরত বা আংশিক', 'returned or partial') + '</span>' +
      '<span><i class="sw"></i>' + L('বাতিল', 'cancelled') + '</span>' +
      '</div>' +

      U.provenance(L('“আংশিক” আছে কারণ বাস্তবে অনেক সময় তিনটার দুইটা রাখা হয়, একটা ফেরত যায়। সেটাকে জোর করে “ডেলিভারি” বা “ফেরত” বলা মানে হিসাবটা মিথ্যা করা।',
        'Partial exists because in practice a Customer keeps two of three items and returns one. Forcing that into Delivered or Returned would make the books lie.'),
        'amber', I.partial(15)) +
      '</div>';
  }

  App.actions['flow-node'] = function (k) { App.state.flowNode = k; App.render(); };

  function flowSettle() {
    return '<div class="card pad flow-card">' +
      '<div class="section-title"><h2>' + L('নিষ্পত্তির ফাইল যেভাবে মেলানো হয়', 'How a payout file is reconciled') + '</h2></div>' +
      '<p class="note-text">' + L('মেলানোর কাজটা কনসাইনমেন্ট নম্বর ধরে হয়, কারণ ওইটাই দুই পাশে একই থাকে। যা মেলে না, তা জোর করে মেলানো হয় না — আলাদা করে রাখা হয় সিদ্ধান্তের জন্য।',
        'Matching keys on the consignment number, because that is the one value both sides share. What does not match is never forced — it is set aside for a decision.') + '</p>' +

      '<div class="flow-diagram">' +
        fnode({ bn: 'কুরিয়ার টাকা পাঠায়, সাথে ফাইল', en: 'The courier pays and sends a file', ic: 'money', tone: 'teal' }) +
        fdown() +
        fnode({ bn: 'ফাইল আনা হয়', en: 'File imported', ic: 'sheet', go: 'settlement/import' }) +
        fdown('প্রথমবার শুধু', 'first time only') +
        fnode({ bn: 'কলাম মিলিয়ে দেওয়া হয়', en: 'Columns mapped', ic: 'grid', go: 'settlement/import/map',
          sub: 'প্রতি কুরিয়ারের জন্য একবার — পরে মনে থাকে', subEn: 'once per courier, then remembered' }) +
        fdown() +
        fnode({ bn: 'কনসাইনমেন্ট নম্বর ধরে মেলানো হয়', en: 'Matched on consignment number', ic: 'filter', tone: 'teal' }) +
      '</div>' +

      '<div class="fork-label">' + L('চার রকম ফল', 'Four possible outcomes') + '</div>' +
      '<div class="fork-grid">' +
        fnode({ bn: 'মিলে গেছে', en: 'Matched', ic: 'check', tone: 'green',
          sub: 'টাকা হাতে পাওয়া ধরা হয়', subEn: 'recognised as realized' }) +
        fnode({ bn: 'কম এসেছে', en: 'Paid short', ic: 'warn', tone: 'red',
          sub: 'কারণ জানা দরকার', subEn: 'needs an explanation' }) +
        fnode({ bn: 'অচেনা নম্বর', en: 'Unrecognised', ic: 'search', tone: 'brass',
          sub: 'কোনো অর্ডারের সাথে মেলেনি', subEn: 'matches no order' }) +
        fnode({ bn: 'দুইবার এসেছে', en: 'Duplicate', ic: 'repeat', tone: 'amber',
          sub: 'আগেই নিষ্পত্তি হয়েছে', subEn: 'already settled' }) +
      '</div>' +

      fdown('প্রতিটির জন্য সিদ্ধান্ত', 'each gets a decision') +

      '<div class="flow-diagram">' +
        fnode({ bn: 'আপনি সিদ্ধান্ত নেন', en: 'You decide', ic: 'money', tone: 'violet',
          go: 'settlement/STL-0831/PT-991204',
          sub: 'কোন সংখ্যা কীভাবে বদলাবে তা আগেই বলা থাকে', subEn: 'each option states which figure it moves' }) +
        fdown() +
        fnode({ bn: 'এন্ট্রি লেখা হয়', en: 'Entries written', ic: 'shield', tone: 'green', go: 'audit',
          mark: 'কে কখন নিয়েছিল লেখা থাকে', markEn: 'who decided when is recorded' }) +
        fdown() +
        fnode({ bn: 'হাতে পাওয়া লাভ হালনাগাদ হয়', en: 'Realized profit updates', ic: 'chart', tone: 'green',
          go: 'reports/profit', mark: 'যতটুকু মিলেছে ততটুকুই', markEn: 'only as far as it reconciled', markTone: 'realized' }) +
      '</div>' +

      U.provenance(L('অমিল বাকি থাকলে লাভের হিসাবে “কত আইটেম ধরে হিসাব” লেখা থাকবে। সংখ্যাটা সাজানো হয় না — অসম্পূর্ণ হলে অসম্পূর্ণই বলা হয়।',
        'While a variance is open, the profit figure carries its own "based on N of M" line. The number is not dressed up — incomplete is stated as incomplete.'),
        'teal', I.info(15)) +
      '</div>';
  }

  function notFound() {
    return { route: 'audit', title: L('পাওয়া যায়নি', 'Not found'),
      body: U.emptyState({ icon: I.search(24), title: L('এটি নেই', 'No such record'), body: '' }) };
  }
})(window.App);
