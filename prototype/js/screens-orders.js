/* SmartBiz BD — order list, the seven capture paths, order detail.
   The paste parser here is real, not staged: it anchors on an 11-digit phone
   number and works outward, which is exactly the rule the PRD specifies. */

(function (App) {
  'use strict';

  var L = App.L, n = App.n, tk = App.tk, I = App.I, U = App.ui, esc = App.esc;

  /* ================================================== ORDER LIST ======== */

  var FILTERS = [
    { key: 'all',       bn: 'সব',            en: 'All' },
    { key: 'todo',      bn: 'কাজ বাকি',      en: 'Needs action' },
    { key: 'new',       bn: 'নতুন',          en: 'New' },
    { key: 'shipped',   bn: 'পথে',           en: 'In transit' },
    { key: 'delivered', bn: 'ডেলিভারি হয়েছে', en: 'Delivered' },
    { key: 'returned',  bn: 'ফেরত',          en: 'Returns' }
  ];

  function matchFilter(o, key) {
    if (key === 'all') return true;
    if (key === 'todo') return o.status === 'new' || o.status === 'confirmed' || o.status === 'packed';
    if (key === 'returned') return o.status === 'returned' || o.status === 'partial';
    return o.status === key;
  }

  App.screens.orders = {
    view: function () {
      var f = App.state.orderFilter || 'all';
      var list = App.orders.filter(function (o) { return matchFilter(o, f); });
      var counts = App.countByStatus();

      var body = '<div class="stack g4">' +
        '<div class="searchbar"><span>' + I.search(17) + '</span>' +
        '<input class="input" placeholder="' + esc(L('নাম, নম্বর বা অর্ডার আইডি', 'Name, phone or order ID')) + '">' +
        '<button class="iconbtn" data-act="noop">' + I.filter(17) + '</button></div>' +

        '<div class="chip-scroll">' + FILTERS.map(function (x) {
          var c = App.orders.filter(function (o) { return matchFilter(o, x.key); }).length;
          return '<button class="chip selectable' + (x.key === f ? '' : ' outline') + '" aria-pressed="' +
            (x.key === f ? 'true' : 'false') + '" data-act="order-filter" data-arg="' + x.key + '">' +
            L(x.bn, x.en) + ' ' + n(c) + '</button>';
        }).join('') + '</div>';

      if (App.seesProfit()) {
        var s = App.summary();
        body += '<div class="grid c2 strip">' +
          '<div class="card pad cash-cell"><span class="eyebrow">' + L('পাঠানো বাকি', 'Not yet shipped') + '</span>' +
          '<span class="money mid">' + tk(s.pipeline) + '</span><span class="cell-sub">' +
          App.unit((counts.new || 0) + (counts.confirmed || 0) + (counts.packed || 0),
            ' অর্ডার', 'order', 'orders') + '</span></div>' +
          '<div class="card pad cash-cell"><span class="eyebrow">' + L('কুরিয়ারের কাছে', 'In custody') + '</span>' +
          '<span class="money mid amber">' + tk(s.custody) + '</span><span class="cell-sub">' +
          App.unit(counts.shipped || 0, ' পার্সেল', 'parcel', 'parcels') + '</span></div>' +
          '</div>';
      }

      body += list.length
        ? '<div class="card flush">' + list.map(App.orderRow).join('') + '</div>'
        : U.emptyState({ icon: I.orders(24), title: L('কোনো অর্ডার নেই', 'No orders here'),
            body: L('এই ফিল্টারে কিছু নেই। ফিল্টার বদলান বা নতুন অর্ডার নিন।', 'Nothing matches this filter. Change it, or take a new order.'),
            action: '<button class="btn primary" data-go="capture">' + L('নতুন অর্ডার', 'New order') + '</button>' });

      body += '</div>';

      return { route: 'orders', nav: 'orders', noBack: true,
        title: L('অর্ডার', 'Orders'),
        eyebrow: App.unit(App.orders.length, ' টি মোট', 'order total', 'orders total'),
        acts: '<button class="btn sm primary" data-go="capture">' + I.plus(15) + L('নতুন', 'New') + '</button>',
        body: body };
    }
  };

  App.actions['order-filter'] = function (key) { App.state.orderFilter = key; App.render(); };

  /* ================================================== CAPTURE HUB ======= */

  var PATHS = [
    { key: 'paste',  icon: 'orders', bn: 'মেসেজ পেস্ট করুন', en: 'Paste a message',
      subBn: 'মেসেঞ্জার বা হোয়াটসঅ্যাপ থেকে কপি করে বসিয়ে দিন', subEn: 'Copy from Messenger or WhatsApp',
      tag: 'সবচেয়ে দ্রুত', tagEn: 'Fastest', tone: 'green' },
    { key: 'manual', icon: 'plus', bn: 'নিজে লিখুন', en: 'Type it in',
      subBn: 'ফোনে অর্ডার এলে', subEn: 'When the order comes by phone', tone: '' },
    { key: 'repeat', icon: 'repeat', bn: 'আগের অর্ডার আবার', en: 'Repeat a past order',
      subBn: 'পুরনো ক্রেতা একই জিনিস চাইলে', subEn: 'Same Customer, same items', tone: 'teal' },
    { key: 'quick',  icon: 'grid', bn: 'দ্রুত যোগ', en: 'Quick-add grid',
      subBn: 'হাতে গোনা কয়েকটা পণ্য হলে ট্যাপ করেই শেষ', subEn: 'Tap through a small catalogue', tone: 'brass' },
    { key: 'photo',  icon: 'camera', bn: 'ছবি পাশে রেখে লিখুন', en: 'Photo beside the form',
      subBn: 'স্ক্রিনশট দেখে দেখে টাইপ করুন — লেখা পড়ার চেষ্টাও করা হবে', subEn: 'Read from a screenshot; text extraction is attempted', tone: 'teal' },
    { key: 'import', icon: 'sheet', bn: 'এক্সেল থেকে আনুন', en: 'Import a spreadsheet',
      subBn: 'অনেক অর্ডার একসাথে', subEn: 'Many orders at once', tone: '' },
    { key: 'voice',  icon: 'mic', bn: 'বলে অর্ডার নিন', en: 'Dictate the order',
      subBn: 'হাত ব্যস্ত থাকলে — ফোন যদি বাংলা বোঝে', subEn: 'Hands busy — if the phone supports Bangla', tone: 'violet' }
  ];

  App.screens.capture = {
    /* every capture path shows a selling price and a delivery charge */
    price: true,
    view: function (args) {
      var path = args[0];
      if (path === 'paste')  return pasteScreen();
      if (path === 'manual') return manualScreen(App.state.parsed);
      if (path === 'repeat') return repeatScreen();
      if (path === 'quick')  return quickScreen();
      if (path === 'photo')  return photoScreen();
      if (path === 'voice')  return voiceScreen();
      if (path === 'import') return importScreen(args[1]);

      return { route: 'capture', nav: 'orders',
        title: L('নতুন অর্ডার', 'New order'),
        eyebrow: L('সাতটি উপায়', 'Seven ways in'),
        body: '<div class="stack g4">' +
          U.provenance(L('যেভাবে অর্ডার আসে সেভাবেই নেওয়া যায় — সব পথ একই ফর্মে গিয়ে শেষ হয়, তাই একটা শিখলেই সব জানা হয়ে যায়।',
            'Take the order the way it arrived — every path ends in the same form, so learning one teaches all of them.'), 'teal') +
          '<div class="stack g3">' + PATHS.map(function (p) {
            return '<button class="path-card" data-go="capture/' + p.key + '">' +
              '<span class="pc-ic ' + p.tone + '">' + I[p.icon](20) + '</span>' +
              '<span class="pc-body"><b>' + L(p.bn, p.en) +
                (p.tag ? ' <i class="chip green sm">' + L(p.tag, p.tagEn) + '</i>' : '') + '</b>' +
              '<span>' + L(p.subBn, p.subEn) + '</span></span>' +
              '<span class="chev">' + I.chev(16) + '</span></button>';
          }).join('') + '</div></div>' };
    }
  };

  /* ------------------------------------------------- 1. PASTE AND PARSE */

  var DEMO_MSG =
    'আপা এই কালো কুর্তিটা M সাইজ লাগবে ১টা\n' +
    'আর গোলাপি সিল্ক ওড়না ১টা দিয়েন\n' +
    'নাম: ফারজানা আক্তার\n' +
    '01711234567\n' +
    'হাউস ৩২, রোড ৭, সেক্টর ৪, উত্তরা, ঢাকা\n' +
    'ক্যাশ অন ডেলিভারি করে দিয়েন';

  /* The parser. Phone number is the anchor because it is the only field with a
     shape you cannot mistake — 11 digits starting 01. Everything else is found
     relative to it, and anything not found is flagged rather than guessed. */
  function parseMessage(raw) {
    var BN = '০১২৩৪৫৬৭৮৯';
    var text = String(raw || '');
    var latin = text.replace(/[০-৯]/g, function (d) { return String(BN.indexOf(d)); });
    var lines = text.split('\n').map(function (s) { return s.trim(); }).filter(Boolean);
    var latinLines = latin.split('\n').map(function (s) { return s.trim(); }).filter(Boolean);

    var found = { fields: {}, items: [], missing: [], notes: [] };

    /* --- phone: the anchor --- */
    var phoneIdx = -1, phone = null;
    for (var i = 0; i < latinLines.length; i++) {
      var m = latinLines[i].replace(/[\s\-+]/g, '').match(/(01[0-9]{9})/);
      if (m) { phone = m[1]; phoneIdx = i; break; }
    }
    if (phone) {
      found.fields.phone = { value: phone.slice(0, 5) + '-' + phone.slice(5), state: 'extracted',
        flag: L('মেসেজ থেকে', 'from message') };
    } else {
      found.missing.push('phone');
      found.fields.phone = { value: '', state: 'unknown', flag: L('পাওয়া যায়নি', 'not found') };
    }

    /* --- name: an explicit label wins; else the line just above the phone --- */
    var name = null;
    for (var j = 0; j < lines.length; j++) {
      var nm = lines[j].match(/^(?:নাম|name)\s*[:：]\s*(.+)$/i);
      if (nm) { name = nm[1].trim(); break; }
    }
    if (!name && phoneIdx > 0) {
      var cand = lines[phoneIdx - 1];
      if (cand && cand.length < 40 && !/[০-৯0-9]{4,}/.test(cand)) name = cand;
    }
    if (name) {
      found.fields.name = { value: name, state: 'extracted', flag: L('মেসেজ থেকে', 'from message') };
      var known = App.customers.filter(function (c) { return c.name === name || c.phone.replace(/\D/g, '') === (phone || ''); })[0];
      if (known) found.notes.push({ type: 'known', customer: known });
    } else {
      found.missing.push('name');
      found.fields.name = { value: '', state: 'unknown', flag: L('পাওয়া যায়নি', 'not found') };
    }

    /* --- address: the line below the phone, or the longest line with a place word --- */
    var AREA = ['ঢাকা', 'উত্তরা', 'মিরপুর', 'ধানমন্ডি', 'গুলশান', 'চট্টগ্রাম', 'সিলেট', 'রাজশাহী',
                'নারায়ণগঞ্জ', 'রোড', 'সেক্টর', 'হাউস', 'বাড়ি', 'ফ্ল্যাট'];
    var addr = null;
    if (phoneIdx > -1 && lines[phoneIdx + 1]) {
      var below = lines[phoneIdx + 1];
      if (AREA.some(function (a) { return below.indexOf(a) > -1; })) addr = below;
    }
    if (!addr) {
      lines.forEach(function (l) {
        var hits = AREA.filter(function (a) { return l.indexOf(a) > -1; }).length;
        if (hits >= 2 && (!addr || l.length > addr.length)) addr = l;
      });
    }
    if (addr) {
      found.fields.address = { value: addr, state: 'extracted', flag: L('মেসেজ থেকে', 'from message') };
    } else {
      found.missing.push('address');
      found.fields.address = { value: '', state: 'unknown', flag: L('পাওয়া যায়নি', 'not found') };
    }

    /* --- items: match product words and variant words, take quantity nearby --- */

    /* An item's details must come from the item's own words. Scanning the whole
       message attributed one product's colour to every product — the sample's
       pink dupatta came out black, because the kurti's কালো appeared later in
       the text and the last match won. So the message is cut into segments at
       its natural item boundaries and each product reads only its own. */
    var segments = text.split(/\n|[,;+·]| আর | এবং | and /i)
      .map(function (s) { return s.trim(); }).filter(Boolean);

    /* A short Latin value must match as a word: 'L' is a substring of 'XL'. */
    var mentions = function (scope, val) {
      if (!/^[\x20-\x7E]+$/.test(val)) return scope.indexOf(val) > -1;
      var esc2 = val.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return new RegExp('(^|[^A-Za-z0-9])' + esc2 + '($|[^A-Za-z0-9])', 'i').test(scope);
    };

    App.products.forEach(function (p) {
      var words = L(p.name, p.name).split(/\s+/);
      var hitWord = words.filter(function (w) { return w.length > 2 && text.indexOf(w) > -1; });
      if (!hitWord.length) return;

      var mine = segments.filter(function (s) {
        return hitWord.some(function (w) { return s.indexOf(w) > -1; });
      });
      var scope = (mine.length ? mine : [text]).join(' ');

      var variant = null;
      if (p.variantAxes.length) {
        var picks = p.variantAxes.map(function (ax) {
          /* Two values from one axis in the item's own words is a genuine
             ambiguity. Leave it unresolved and let her pick, rather than
             choosing for her — a wrong value is worse than an empty one. */
          var hits = ax.values.filter(function (v) {
            return mentions(scope, v.v) || (v.vEn && mentions(scope, v.vEn));
          });
          return hits.length === 1 ? hits[0].v : null;
        });
        variant = picks.map(function (x) { return x || '?'; }).join('|');
      } else {
        variant = '_';
      }

      /* quantity: a number followed by টা/টি/pcs within the item's own words */
      var qty = 1;
      mine.forEach(function (s) {
        var st = s.replace(/[০-৯]/g, function (d) { return String(BN.indexOf(d)); });
        var q = st.match(/(\d+)\s*(?:টা|টি|পিস|pcs?|piece)/i);
        if (q) qty = +q[1];
      });

      found.items.push({ p: p.id, v: variant, qty: qty, incomplete: variant.indexOf('?') > -1 });
    });

    if (!found.items.length) found.missing.push('items');
    if (/ক্যাশ অন|cod|ক্যাশ/i.test(text)) found.notes.push({ type: 'cod' });

    return found;
  }
  App.parseMessage = parseMessage;

  function pasteScreen() {
    var st = App.state.paste || { text: '' };

    var body = '<div class="stack g4">' +
      U.provenance(L('মেসেজটা যেমন আছে তেমনই বসান — সাজানোর দরকার নেই। ১১ সংখ্যার ফোন নম্বর ধরে বাকি তথ্য খুঁজে নেওয়া হবে।',
        'Paste the message exactly as it is. The 11-digit phone number anchors the parse; everything else is found around it.'), 'teal') +

      '<div class="card pad">' +
        U.field({ type: 'textarea', id: 'paste-box', rows: 7,
          label: L('মেসেজ', 'The message'),
          value: st.text,
          placeholder: L('মেসেঞ্জার থেকে কপি করে এখানে পেস্ট করুন…', 'Paste the copied message here…') }) +
        '<div class="row" style="margin-top:var(--s3)">' +
          '<button class="btn quiet sm" data-act="paste-demo">' + L('ডেমো মেসেজ বসান', 'Use a sample message') + '</button>' +
          '<span class="spacer"></span>' +
          '<button class="btn primary" data-act="paste-parse">' + L('তথ্য বের করুন', 'Extract') + '</button>' +
        '</div>' +
      '</div>';

    if (st.parsed) {
      var pr = st.parsed;
      var gotCount = Object.keys(pr.fields).filter(function (k) { return pr.fields[k].state === 'extracted'; }).length;

      body += '<div class="card flush parse-result">' +
        '<div class="card-head"><h3>' + L('যা পাওয়া গেল', 'What was extracted') + '</h3>' +
        '<span class="chip ' + (pr.missing.length ? 'brass' : 'green') + ' sm">' +
        L(n(gotCount) + '/৩ ঘর ভরেছে', n(gotCount) + '/3 fields filled') + '</span></div>' +
        '<div class="parse-fields">' +
          U.field({ label: L('ক্রেতার নাম', 'Customer name'), value: pr.fields.name.value,
            state: pr.fields.name.state, flag: pr.fields.name.flag,
            placeholder: L('নাম লিখুন', 'Type the name') }) +
          U.field({ label: L('মোবাইল নম্বর', 'Mobile number'), value: pr.fields.phone.value,
            state: pr.fields.phone.state, flag: pr.fields.phone.flag }) +
          U.field({ label: L('ঠিকানা', 'Address'), type: 'textarea', rows: 2, value: pr.fields.address.value,
            state: pr.fields.address.state, flag: pr.fields.address.flag }) +
        '</div>';

      if (pr.notes.some(function (x) { return x.type === 'known'; })) {
        var kc = pr.notes.filter(function (x) { return x.type === 'known'; })[0].customer;
        var r = App.risk(kc);
        body += '<div class="known-cust">' + U.provenance(
          L('এই নম্বরটি চেনা — <b>' + esc(kc.name) + '</b>, ' + n(kc.delivered) + 'টি অর্ডার ডেলিভারি হয়েছে, ' +
            n(kc.returned) + 'টি ফেরত এসেছে।',
            'This number is known — <b>' + esc(kc.nameEn) + '</b>, ' + n(kc.delivered) + ' delivered, ' +
            n(kc.returned) + ' returned.'),
          r.band === 'high' ? 'red' : 'teal', r.band === 'high' ? I.warn(15) : I.check(15)) + '</div>';
      }

      body += '<div class="parse-items"><div class="card-head" style="border-top:1px solid var(--line)">' +
        '<h3>' + L('পণ্য', 'Items') + '</h3>' +
        '<span class="chip teal sm">' + n(pr.items.length) + L(' টি মিলেছে', ' matched') + '</span></div>';

      if (pr.items.length) {
        body += pr.items.map(function (it) {
          var p = App.get.product(it.p);
          var vLabel = it.v === '_' ? L('একটাই ধরন', 'single variant') : App.variantLabel(p, it.v);
          return '<div class="list-item' + (it.incomplete ? ' needs' : '') + '">' +
            '<span class="lead ' + (it.incomplete ? 'brass' : 'teal') + '">' + I.tag(17) + '</span>' +
            '<span class="body"><b>' + esc(L(p.name, p.nameEn)) + '</b>' +
            '<span>' + vLabel + ' · ' + L('পরিমাণ', 'qty') + ' ' + n(it.qty) + '</span></span>' +
            (it.incomplete
              ? '<button class="btn sm brass" data-act="pick-variant" data-arg="' + it.p + '">' + L('ধরন বাছুন', 'Pick variant') + '</button>'
              : (App.seesPrice() ? '<span class="trail"><span class="money">' + tk(App.unitPrice(p, it.v) * it.qty) + '</span></span>' : '')) +
            '</div>';
        }).join('');
      } else {
        body += '<div style="padding:var(--s4)">' + U.provenance(
          L('কোনো পণ্য চেনা গেল না। নিচের ফর্মে নিজে যোগ করুন — মেসেজটা পাশে থাকবে।',
            'No product was recognised. Add them in the form — the message stays beside you.'), 'brass', I.warn(15)) + '</div>';
      }

      body += '</div>';

      if (pr.missing.length) {
        body += '<div style="padding:0 var(--s4) var(--s4)">' + U.provenance(
          L('<b>' + n(pr.missing.length) + 'টি তথ্য পাওয়া যায়নি</b> — অনুমান করা হয়নি, ঘরগুলো খালি রাখা হয়েছে। ভুল তথ্যের চেয়ে খালি ঘর ভালো।',
            '<b>' + n(pr.missing.length) + ' fields were not found</b> — nothing was guessed, the boxes were left empty. An empty box beats a wrong value.'),
          'brass', I.warn(15)) + '</div>';
      }

      body += '</div>';

      body += '<div class="sticky-foot">' +
        '<button class="btn ghost" data-act="paste-clear">' + L('মুছুন', 'Clear') + '</button>' +
        '<button class="btn primary" data-act="paste-continue">' + L('ফর্মে যান', 'Continue to form') + '</button></div>';
    }

    body += '</div>';

    return { route: 'capture', nav: 'orders', title: L('মেসেজ পেস্ট করুন', 'Paste & parse'),
      eyebrow: L('অর্ডার নেওয়ার উপায় ১', 'Capture path 1'), body: body };
  }

  App.actions['paste-demo'] = function () {
    var box = document.getElementById('paste-box');
    if (box) box.value = DEMO_MSG;
    App.state.paste = { text: DEMO_MSG };
    App.render();
    U.toast(L('ডেমো মেসেজ বসানো হয়েছে — এখন “তথ্য বের করুন” চাপুন', 'Sample message inserted — now press Extract'));
  };

  App.actions['paste-parse'] = function () {
    var box = document.getElementById('paste-box');
    var text = box ? box.value : '';
    if (!text.trim()) { U.toast(L('আগে মেসেজটা বসান', 'Paste a message first'), 'warn'); return; }
    var parsed = parseMessage(text);
    App.state.paste = { text: text, parsed: parsed };
    App.state.parsed = parsed;
    App.render();
    var got = 3 - parsed.missing.filter(function (m) { return m !== 'items'; }).length;
    U.toast(L(n(got) + 'টি ঘর ভরেছে, ' + n(parsed.items.length) + 'টি পণ্য মিলেছে',
              n(got) + ' fields filled, ' + n(parsed.items.length) + ' items matched'));
  };

  App.actions['paste-clear'] = function () { App.state.paste = { text: '' }; App.render(); };
  App.actions['paste-continue'] = function () { App.go('capture/manual'); };

  App.actions['pick-variant'] = function (pid) {
    var p = App.get.product(pid);
    var ax = p.variantAxes[p.variantAxes.length - 1];
    U.openSheet({
      title: L(ax.label + ' বাছুন', 'Choose ' + ax.labelEn),
      sub: esc(L(p.name, p.nameEn)) + ' — ' + L('মেসেজে এটি লেখা ছিল না', 'the message did not state it'),
      body: '<div class="chip-grid">' + ax.values.map(function (v) {
        return '<button class="pick-tile" data-act="variant-picked" data-arg="' + esc(v.v) + '">' +
          '<b>' + esc(L(v.v, v.vEn || v.v)) + '</b></button>';
      }).join('') + '</div>',
      foot: '<button class="btn ghost" data-act="close-sheet">' + L('বাতিল', 'Cancel') + '</button>'
    });
  };

  App.actions['variant-picked'] = function (v) {
    U.closeSheet();
    var pr = App.state.paste && App.state.paste.parsed;
    if (pr) {
      pr.items.forEach(function (it) {
        if (it.incomplete) { it.v = it.v.replace('?', v); it.incomplete = it.v.indexOf('?') > -1; }
      });
    }
    App.render();
    U.toast(L('ধরন বসানো হয়েছে: ' + v, 'Variant set: ' + v));
  };

  /* ------------------------------------------------------- 2. MANUAL FORM */

  function manualScreen(prefill) {
    var pr = prefill;
    var items = (pr && pr.items) || [{ p: 'P-101', v: 'কালো|M', qty: 1 }];
    var f = (pr && pr.fields) || {};

    var goods = 0;
    items.forEach(function (it) { goods += App.unitPrice(App.get.product(it.p), it.v) * it.qty; });
    var delivery = 80, advance = 0, discount = 0;
    var collect = goods + delivery - advance - discount;
    var courier = App.get.courier('pathao');
    var codFee = Math.round(collect * courier.codPct / 100);
    var cogs = 0;
    items.forEach(function (it) { cogs += App.get.product(it.p).cost * it.qty; });
    var profit = goods - discount - cogs - courier.fee - codFee - App.business.packagingCost;

    var body = '<div class="stack g4">';

    if (pr) body += U.provenance(L('মেসেজ থেকে আনা ঘরগুলো সবুজ দিয়ে চিহ্নিত — আপনি বদলালে রঙ বদলে যাবে, তাই কোনটা আপনার আর কোনটা মেশিনের তা লুকিয়ে থাকে না।',
      'Fields taken from the message are marked. Editing one changes its mark, so what came from the machine and what came from you is never hidden.'), 'teal');

    body += '<div class="card pad"><div class="section-title"><h2>' + L('ক্রেতা', 'Customer') + '</h2></div>' +
      '<div class="stack g3">' +
      U.field({ label: L('নাম', 'Name'), required: true, value: (f.name && f.name.value) || '',
        state: f.name && f.name.state, flag: f.name && f.name.flag }) +
      U.field({ label: L('মোবাইল', 'Mobile'), required: true, prefix: '+৮৮০', value: (f.phone && f.phone.value) || '',
        state: f.phone && f.phone.state, flag: f.phone && f.phone.flag,
        hint: L('এই নম্বর দিয়েই ক্রেতা চেনা হয় — একই নম্বর দুইবার দিলে আগের ইতিহাস যোগ হয়ে যাবে।',
                'The number identifies the Customer — entering it again links to their history.') }) +
      U.field({ label: L('ঠিকানা', 'Address'), type: 'textarea', rows: 2, value: (f.address && f.address.value) || '',
        state: f.address && f.address.state, flag: f.address && f.address.flag }) +
      '</div></div>';

    body += '<div class="card flush"><div class="card-head"><h3>' + L('পণ্য', 'Items') + '</h3>' +
      '<span class="acts"><button class="btn sm ghost" data-act="add-line">' + I.plus(14) + L('যোগ', 'Add') + '</button></span></div>' +
      items.map(function (it) {
        var p = App.get.product(it.p);
        return '<div class="line-item">' +
          '<div class="li-main"><b>' + esc(L(p.name, p.nameEn)) + '</b>' +
          '<span>' + (it.v === '_' ? p.sku : App.variantLabel(p, it.v, ' · ')) + '</span></div>' +
          '<div class="qty-stepper"><button data-act="noop">−</button><span>' + n(it.qty) + '</span><button data-act="noop">+</button></div>' +
          (App.seesPrice() ? '<div class="li-money"><span class="money">' + tk(App.unitPrice(p, it.v) * it.qty) + '</span>' +
            '<span class="cell-sub">' + tk(App.unitPrice(p, it.v)) + L(' / টি', ' ea') + '</span></div>' : '') +
          '<button class="iconbtn" data-act="noop">' + I.x(15) + '</button></div>';
      }).join('') +
      '<button class="list-item add-row" data-act="add-line"><span class="lead teal">' + I.plus(17) + '</span>' +
      '<span class="body"><b>' + L('পণ্য যোগ করুন', 'Add an item') + '</b>' +
      '<span>' + L('তালিকায় না থাকলে এখানেই নতুন পণ্য বানানো যাবে', 'Not in the catalogue? Create it here') + '</span></span></button>' +
      '</div>';

    body += '<div class="card pad"><div class="section-title"><h2>' + L('ডেলিভারি', 'Delivery') + '</h2></div>' +
      '<div class="stack g3">' +
      U.field({ label: L('কুরিয়ার', 'Courier'), type: 'select', options: App.couriers.map(function (c, i) {
        return { label: L(c.name, c.nameEn) + (c.fee ? ' — ' + App.tkPlain(c.fee) : ''), selected: i === 0 };
      }) }) +
      U.field({ label: L('ডেলিভারি চার্জ', 'Delivery charge'), prefix: '৳', value: '80', money: true }) +
      U.field({ label: L('অগ্রিম নেওয়া হয়েছে', 'Advance taken'), prefix: '৳', value: '0', money: true,
        hint: L('ঝুঁকি বেশি এমন ক্রেতার কাছে অগ্রিম নিলে ফেরতের ক্ষতি কমে।',
                'Taking an advance from a high-risk Customer limits the loss on a return.') }) +
      '</div></div>';

    if (App.seesProfit()) {
      body += '<div class="econ"><span class="eyebrow">' + L('এই অর্ডারে কী থাকছে', 'What this order leaves you') + '</span>' +
        '<div class="line"><span>' + L('পণ্যের দাম', 'Goods') + '</span><span class="v">' + tk(goods) + '</span></div>' +
        '<div class="line"><span>' + L('ক্রয়মূল্য', 'Cost of goods') + '</span><span class="v">−' + tk(cogs) + '</span></div>' +
        '<div class="line"><span>' + L('কুরিয়ার ফি', 'Courier fee') + '</span><span class="v">−' + tk(courier.fee) + '</span></div>' +
        '<div class="line"><span>' + L('COD ফি', 'COD fee') + '</span><span class="v">−' + tk(codFee) + '</span></div>' +
        '<div class="line"><span>' + L('প্যাকেজিং', 'Packaging') + '</span><span class="v">−' + tk(App.business.packagingCost) + '</span></div>' +
        '<div class="line total"><span>' + L('সম্ভাব্য লাভ', 'Profit if delivered') + '</span><span class="v">' + tk(profit) + '</span></div>' +
        '<div class="econ-note">' + L('ডেলিভারি হলে এই লাভ অর্জিত হবে; কুরিয়ার টাকা পাঠালে হাতে আসবে।',
          'This becomes earned on delivery, and realized when the courier pays out.') + '</div></div>';
    }

    body += '<div class="card pad"><div class="row"><div><b style="font-size:var(--fs-sm)">' +
      L('ক্রেতা যা দেবেন', 'Customer pays') + '</b><span class="cell-sub" style="display:block">' +
      L('পণ্য + ডেলিভারি − অগ্রিম', 'goods + delivery − advance') + '</span></div>' +
      '<span class="spacer"></span><span class="money big">' + (App.seesPrice() ? tk(collect) : '•••') + '</span></div></div>';

    body += '<div class="sticky-foot">' +
      '<button class="btn ghost" data-act="back">' + L('বাতিল', 'Cancel') + '</button>' +
      '<button class="btn primary" data-act="save-order">' + L('অর্ডার তৈরি করুন', 'Create order') + '</button></div>';

    body += '</div>';

    return { route: 'capture', nav: 'orders',
      title: pr ? L('তথ্য যাচাই করুন', 'Check the details') : L('নতুন অর্ডার', 'New order'),
      eyebrow: pr ? L('মেসেজ থেকে আনা', 'From a pasted message') : L('অর্ডার নেওয়ার উপায় ২', 'Capture path 2'),
      body: body };
  }

  App.actions['add-line'] = function () {
    U.openSheet({
      title: L('পণ্য বাছুন', 'Choose an item'),
      sub: L('তালিকায় নেই? নিচে নতুন পণ্য বানান — অর্ডার থামবে না।', 'Not listed? Create it below — the order does not stop.'),
      body: '<div class="searchbar sheet-search"><span>' + I.search(17) + '</span>' +
        '<input class="input" placeholder="' + esc(L('পণ্যের নাম', 'Product name')) + '"></div>' +
        '<div class="card flush" style="margin-top:var(--s3)">' + App.products.map(function (p) {
          return '<button class="list-item" data-act="close-sheet">' +
            '<span class="lead teal">' + I.tag(17) + '</span>' +
            '<span class="body"><b>' + esc(L(p.name, p.nameEn)) + '</b><span>' + p.sku + ' · ' +
            (p.variantAxes.length ? n(Object.keys(p.stock).length) + L(' ধরন', ' variants') : L('একটাই ধরন', 'single')) +
            ' · ' + L('স্টক', 'stock') + ' ' + n(App.stockOf(p)) + '</span></span>' +
            (App.seesPrice() ? '<span class="trail"><span class="money">' + tk(p.price) + '</span></span>' : '') + '</button>';
        }).join('') + '</div>',
      foot: '<button class="btn ghost" data-act="new-product-inline">' + I.plus(15) + L('নতুন পণ্য', 'New product') + '</button>'
    });
  };

  App.actions['new-product-inline'] = function () {
    U.closeSheet();
    U.openSheet({
      title: L('দ্রুত নতুন পণ্য', 'Quick new product'),
      sub: L('শুধু নাম আর দাম দিলেই চলবে — বাকিটা পরে পূরণ করা যাবে।', 'Name and price are enough; finish the rest later.'),
      body: '<div class="stack g3">' +
        U.field({ label: L('নাম', 'Name'), required: true, placeholder: L('যেমন: প্রিন্টেড কুর্তি', 'e.g. Printed Kurti') }) +
        U.field({ label: L('বিক্রয় মূল্য', 'Selling price'), prefix: '৳', money: true, required: true }) +
        U.field({ label: L('ক্রয়মূল্য', 'Cost price'), prefix: '৳', money: true,
          hint: L('না দিলে লাভের হিসাব অসম্পূর্ণ দেখানো হবে — লুকানো হবে না।',
                  'Leave it blank and profit is shown as incomplete rather than wrong.') }) +
        '</div>',
      foot: '<button class="btn ghost" data-act="close-sheet">' + L('বাতিল', 'Cancel') + '</button>' +
        '<button class="btn primary" data-act="saved-product">' + L('যোগ করুন', 'Add') + '</button>'
    });
  };

  App.actions['saved-product'] = function () {
    U.closeSheet();
    U.toast(L('পণ্য যোগ হয়েছে এবং অর্ডারে বসানো হয়েছে', 'Product created and added to the order'));
  };

  App.actions['save-order'] = function () {
    U.toast(L('অর্ডার তৈরি হয়েছে — ORD-১০৪৩', 'Order created — ORD-1043'), '', L('ফিরিয়ে নিন', 'Undo'));
    setTimeout(function () { App.go('order/ORD-1042'); }, 700);
  };

  /* ------------------------------------------------------- 3. REPEAT */

  function repeatScreen() {
    var past = App.orders.filter(function (o) { return o.status === 'settled' || o.status === 'delivered'; });
    return { route: 'capture', nav: 'orders', title: L('আগের অর্ডার আবার', 'Repeat an order'),
      eyebrow: L('অর্ডার নেওয়ার উপায় ৩', 'Capture path 3'),
      body: '<div class="stack g4">' +
        U.provenance(L('পুরনো অর্ডারে চাপ দিলে ক্রেতা, ঠিকানা আর পণ্য — সব বসে যাবে। শুধু পরিমাণ দেখে নিন।',
          'Tap a past order and the Customer, address and items are all filled. Only check the quantities.'), 'teal') +
        '<div class="searchbar"><span>' + I.search(17) + '</span>' +
        '<input class="input" placeholder="' + esc(L('ক্রেতার নাম বা নম্বর', 'Customer name or phone')) + '"></div>' +
        '<div class="card flush">' + past.map(function (o) {
          var c = App.get.customer(o.cust);
          var e = App.econ(o);
          return '<button class="list-item" data-act="do-repeat" data-arg="' + o.id + '">' +
            '<span class="lead teal">' + I.repeat(17) + '</span>' +
            '<span class="body"><b>' + esc(L(c.name, c.nameEn)) + '</b>' +
            '<span>' + o.lines.map(function (l) { return esc(L(App.get.product(l.p).name, App.get.product(l.p).nameEn)); }).join(', ') +
            ' · ' + App.date(o.placed) + '</span></span>' +
            (App.seesPrice() ? '<span class="trail"><span class="money">' + tk(e.collect) + '</span></span>' : '') +
            '<span class="chev">' + I.chev(16) + '</span></button>';
        }).join('') + '</div></div>' };
  }

  App.actions['do-repeat'] = function (id) {
    var o = App.get.order(id);
    var c = App.get.customer(o.cust);
    App.state.parsed = {
      fields: {
        name: { value: L(c.name, c.nameEn), state: 'extracted', flag: L('আগের অর্ডার থেকে', 'from past order') },
        phone: { value: c.phone, state: 'extracted', flag: L('আগের অর্ডার থেকে', 'from past order') },
        address: { value: c.address, state: 'extracted', flag: L('আগের অর্ডার থেকে', 'from past order') }
      },
      items: o.lines.map(function (l) { return { p: l.p, v: l.v, qty: l.qty }; }),
      missing: [], notes: []
    };
    App.go('capture/manual');
  };

  /* ------------------------------------------------------- 4. QUICK GRID */

  function quickScreen() {
    var picked = App.state.quick || {};
    var total = 0, count = 0;
    Object.keys(picked).forEach(function (k) {
      var parts = k.split('::');
      var p = App.get.product(parts[0]);
      total += App.unitPrice(p, parts[1]) * picked[k];
      count += picked[k];
    });

    var tiles = [];
    App.products.forEach(function (p) {
      Object.keys(p.stock).forEach(function (v) {
        if (p.inactive.indexOf(v) > -1) return;
        var key = p.id + '::' + v;
        var q = picked[key] || 0;
        tiles.push('<button class="qa-tile' + (q ? ' is-on' : '') + (p.stock[v] === 0 ? ' is-out' : '') + '"' +
          ' data-act="quick-tap" data-arg="' + key + '">' +
          (q ? '<span class="qa-badge">' + n(q) + '</span>' : '') +
          '<span class="qa-name">' + esc(L(p.name, p.nameEn)) + '</span>' +
          '<span class="qa-var">' + (v === '_' ? p.sku : App.variantLabel(p, v, ' · ')) + '</span>' +
          (App.seesPrice() ? '<span class="qa-price money">' + tk(App.unitPrice(p, v)) + '</span>' : '') +
          '<span class="qa-stock">' + (p.stock[v] === 0 ? L('শেষ', 'out') : L('স্টক ' + n(p.stock[v]), n(p.stock[v]) + ' left')) + '</span>' +
          '</button>');
      });
    });

    return { route: 'capture', nav: 'orders', title: L('দ্রুত যোগ', 'Quick-add'),
      eyebrow: L('অর্ডার নেওয়ার উপায় ৪', 'Capture path 4'),
      body: '<div class="stack g4">' +
        U.provenance(L('ট্যাপ করলে পরিমাণ বাড়বে। শেষ হয়ে যাওয়া ধরনগুলো ধূসর — অতিরিক্ত বিক্রি ঠেকানোর জন্য, কিন্তু চাইলে ট্যাপ করেই বেচা যাবে।',
          'Tap to increase the quantity. Sold-out variants are dimmed to prevent overselling, but you can still tap to sell one.'), 'brass') +
        '<div class="qa-grid">' + tiles.join('') + '</div>' +
        (count ? '<div class="sticky-foot rich">' +
          '<div><b>' + App.unit(count, ' টি পণ্য', 'item', 'items') + '</b>' +
          (App.seesPrice() ? '<span class="money mid" style="display:block">' + tk(total) + '</span>' : '') + '</div>' +
          '<button class="btn primary" data-go="capture/manual">' + L('ক্রেতার তথ্য দিন', 'Add Customer') + '</button></div>' : '') +
        '</div>' };
  }

  App.actions['quick-tap'] = function (key) {
    App.state.quick = App.state.quick || {};
    App.state.quick[key] = (App.state.quick[key] || 0) + 1;
    App.render();
  };

  /* ------------------------------------------------------- 5. PHOTO */

  function photoScreen() {
    var st = App.state.photo || {};
    return { route: 'capture', nav: 'orders', title: L('ছবি পাশে রেখে', 'Photo beside the form'),
      eyebrow: L('অর্ডার নেওয়ার উপায় ৫', 'Capture path 5'),
      body: '<div class="stack g4">' +
        U.provenance(L('ছবি থেকে লেখা পড়ার চেষ্টা করা হয়, কিন্তু সেটা মূল কাজ নয় — মূল কাজ হলো ছবিটা পাশে রেখে দেখে দেখে লেখা। পড়তে না পারলেও কাজ থামে না।',
          'Text extraction from the image is attempted, but it is not the point — the point is having the screenshot beside the form. If extraction fails, nothing stops.'), 'teal', I.camera(15)) +

        (st.loaded ? '' :
        '<div class="drop-zone" data-act="photo-load">' + I.camera(30) +
          '<b>' + L('স্ক্রিনশট বাছুন বা ছবি তুলুন', 'Pick a screenshot or take a photo') + '</b>' +
          '<span>' + L('মেসেঞ্জারের স্ক্রিনশটই সবচেয়ে বেশি ব্যবহার হয়', 'A Messenger screenshot is the usual case') + '</span></div>') +

        (st.loaded ?
        '<div class="photo-split">' +
          '<div class="photo-pane">' +
            '<div class="fake-shot">' +
              '<div class="fs-head">' + I.people(15) + '<b>' + L('ফারজানা আক্তার', 'Farzana Akter') + '</b></div>' +
              DEMO_MSG.split('\n').map(function (l, i) {
                return '<div class="fs-bubble' + (i > 3 ? ' me' : '') + '">' + esc(l) + '</div>';
              }).join('') +
            '</div>' +
            '<div class="photo-tools">' +
              '<button class="chip outline sm" data-act="noop">' + L('বড় করুন', 'Zoom') + '</button>' +
              '<button class="chip outline sm" data-act="noop">' + L('ঘোরান', 'Rotate') + '</button>' +
              '<button class="chip violet sm" data-act="photo-ocr">' + L('লেখা পড়ার চেষ্টা', 'Try text extraction') + '</button>' +
            '</div>' +
          '</div>' +
          '<div class="form-pane">' +
            (st.ocr === 'partial' ? U.provenance(L('ছবি থেকে ফোন নম্বর পড়া গেছে, নাম পড়া যায়নি। যা পড়া গেছে তাই বসানো হলো।',
              'The phone number was read from the image; the name was not. Only what was read has been filled.'), 'brass', I.warn(15)) : '') +
            '<div class="stack g3" style="margin-top:var(--s3)">' +
            U.field({ label: L('নাম', 'Name'), value: '',
              state: st.ocr === 'partial' ? 'unknown' : '', flag: st.ocr === 'partial' ? L('পড়া যায়নি', 'not read') : '' }) +
            U.field({ label: L('মোবাইল', 'Mobile'), value: st.ocr === 'partial' ? '01711-234567' : '',
              state: st.ocr === 'partial' ? 'extracted' : '', flag: st.ocr === 'partial' ? L('ছবি থেকে', 'from image') : '' }) +
            U.field({ label: L('ঠিকানা', 'Address'), type: 'textarea', rows: 2, value: '' }) +
            '</div>' +
            '<button class="btn primary block" style="margin-top:var(--s4)" data-go="capture/manual">' +
              L('বাকিটা ফর্মে', 'Continue in the form') + '</button>' +
          '</div>' +
        '</div>' : '') +
        '</div>' };
  }

  App.actions['photo-load'] = function () { App.state.photo = { loaded: true }; App.render(); };
  App.actions['photo-ocr'] = function () {
    App.state.photo = { loaded: true, ocr: 'partial' };
    App.render();
    U.toast(L('একটি ঘর ভরেছে, একটি পড়া যায়নি', 'One field read, one could not be'), 'warn');
  };

  /* ------------------------------------------------------- 6. VOICE */

  function voiceScreen() {
    var st = App.state.voice || {};
    return { route: 'capture', nav: 'orders', title: L('বলে অর্ডার নিন', 'Dictate the order'),
      eyebrow: L('অর্ডার নেওয়ার উপায় ৬', 'Capture path 6'),
      body: '<div class="stack g4">' +
        U.provenance(L('এটি ফোনের নিজের বাংলা ডিকটেশন ব্যবহার করে। ফোন বাংলা না বুঝলে এই উপায়টি দেখানোই হয় না — অচল বাটন থাকে না।',
          'This uses the phone\'s own Bangla dictation. If the phone does not support it, this path is not offered at all — no dead buttons.'), 'violet', I.mic(15)) +
        '<div class="mic-stage' + (st.listening ? ' is-live' : '') + '">' +
          '<button class="mic-btn" data-act="voice-toggle">' + I.mic(30) +
            (st.listening ? '<span class="pulse"></span><span class="pulse d"></span>' : '') + '</button>' +
          '<b>' + (st.listening ? L('শুনছি…', 'Listening…') : L('চাপ দিয়ে বলুন', 'Tap and speak')) + '</b>' +
          '<span>' + L('“ফারজানা আপা, কালো কুর্তি এম সাইজ একটা, উত্তরা”',
                       '“Farzana, one black kurti size M, Uttara”') + '</span>' +
        '</div>' +
        (st.text ? '<div class="card pad">' +
          '<span class="eyebrow">' + L('যা শোনা গেল', 'What was heard') + '</span>' +
          '<p class="dictated">' + esc(st.text) + '</p>' +
          '<div class="row" style="margin-top:var(--s3)"><button class="btn ghost sm" data-act="voice-toggle">' +
            L('আবার বলুন', 'Say it again') + '</button><span class="spacer"></span>' +
            '<button class="btn primary sm" data-act="voice-parse">' + L('তথ্য বের করুন', 'Extract') + '</button></div>' +
          '</div>' : '') +
        '</div>' };
  }

  App.actions['voice-toggle'] = function () {
    if (App.state.voice && App.state.voice.listening) { App.state.voice = { text: '' }; App.render(); return; }
    App.state.voice = { listening: true };
    App.render();
    setTimeout(function () {
      App.state.voice = { text: 'ফারজানা আপা কালো কুর্তি এম সাইজ ১টা উত্তরা ০১৭১১২৩৪৫৬৭' };
      App.render();
    }, 1400);
  };

  App.actions['voice-parse'] = function () {
    App.state.parsed = parseMessage(App.state.voice.text);
    App.go('capture/manual');
  };

  /* ------------------------------------------------------- 7. IMPORT */

  var IMPORT_COLS = ['Customer', 'Mobile No', 'Full Address', 'Item', 'Qty', 'Amount', 'Note'];
  var IMPORT_ROWS = [
    ['Rumana Islam', '01611445566', 'House 9, Mirpur 10, Dhaka', 'Kurti Black M', '1', '1250', ''],
    ['ইশরাত জাহান', '০১৮৪৪৬৬৭৭৮৮', 'Shiroil, Rajshahi', 'Jamdani Red', '1', '4200', 'urgent'],
    ['Mousumi P.', '01955889900', 'Chashara, Narayanganj', 'Bangle Set', '4', '1520', ''],
    ['Sharmin', '0173322110', 'Road 27, Dhanmondi', 'Dupatta Pink', '2', '1300', 'phone short'],
    ['Nazmun Nahar', '01521334455', 'Zindabazar, Sylhet', 'Three-piece L', '1', '', 'no amount']
  ];
  var TARGETS = [
    { key: 'name',    bn: 'ক্রেতার নাম', en: 'Customer name', req: true },
    { key: 'phone',   bn: 'মোবাইল',      en: 'Mobile',        req: true },
    { key: 'address', bn: 'ঠিকানা',      en: 'Address',       req: true },
    { key: 'item',    bn: 'পণ্য',        en: 'Item',          req: true },
    { key: 'qty',     bn: 'পরিমাণ',      en: 'Quantity',      req: false },
    { key: 'amount',  bn: 'টাকা',        en: 'Amount',        req: false },
    { key: 'skip',    bn: 'বাদ দিন',     en: 'Ignore',        req: false }
  ];

  function importScreen(step) {
    if (step === 'map') return mapScreen();
    if (step === 'preview') return previewScreen();

    return { route: 'capture', nav: 'orders', title: L('এক্সেল থেকে আনুন', 'Import a spreadsheet'),
      eyebrow: L('অর্ডার নেওয়ার উপায় ৭', 'Capture path 7'),
      body: '<div class="stack g4">' +
        '<div class="steps" style="margin-bottom:var(--s2)">' +
          '<span class="st now"><span class="n">১</span>' + L('ফাইল', 'File') + '</span><span class="sep"></span>' +
          '<span class="st"><span class="n">২</span>' + L('কলাম মিলান', 'Map') + '</span><span class="sep"></span>' +
          '<span class="st"><span class="n">৩</span>' + L('দেখে নিন', 'Preview') + '</span>' +
        '</div>' +
        U.provenance(L('আপনার ফাইলের কলামের নাম যা-ই হোক চলবে — কোন কলাম কী, সেটা পরের ধাপে আপনি বলে দেবেন। ফাইল বদলে নিতে হবে না।',
          'Your column names can be anything — you tell us what each one means in the next step. No need to reshape the file.'), 'teal') +
        '<div class="drop-zone" data-go="capture/import/map">' + I.sheet(30) +
          '<b>' + L('CSV বা এক্সেল ফাইল বাছুন', 'Pick a CSV or Excel file') + '</b>' +
          '<span>' + L('সর্বোচ্চ ৫০০ সারি একবারে', 'Up to 500 rows at a time') + '</span></div>' +
        '<div class="card pad"><span class="eyebrow">' + L('উদাহরণ', 'Example') + '</span>' +
        '<p style="font-size:var(--fs-sm);color:var(--text-2);margin-top:var(--s2)">' +
        L('কুরিয়ারের পোর্টাল থেকে নামানো ফাইল, বা নিজের খাতার এক্সেল — দুইটাই চলবে।',
          'A file downloaded from a courier portal, or your own spreadsheet — both work.') + '</p></div>' +
        '</div>' };
  }

  function mapScreen() {
    var guess = { 'Customer': 'name', 'Mobile No': 'phone', 'Full Address': 'address',
      'Item': 'item', 'Qty': 'qty', 'Amount': 'amount', 'Note': 'skip' };
    return { route: 'capture', nav: 'orders', title: L('কলাম মিলান', 'Map the columns'),
      eyebrow: L('ধাপ ২ / ৩', 'Step 2 of 3'),
      body: '<div class="stack g4">' +
        '<div class="steps"><span class="st done"><span class="n">✓</span></span><span class="sep"></span>' +
        '<span class="st now"><span class="n">২</span>' + L('কলাম মিলান', 'Map') + '</span><span class="sep"></span>' +
        '<span class="st"><span class="n">৩</span></span></div>' +
        U.provenance(L('অনুমান করা মিলগুলো আগে থেকেই বসানো — শুধু দেখে নিন। প্রতিটি অনুমান দেখানো হচ্ছে, লুকানো নেই।',
          'The guessed mappings are pre-filled — just check them. Every guess is shown, not hidden.'), 'teal', I.check(15)) +
        '<div class="card flush">' + IMPORT_COLS.map(function (col, i) {
          var g = guess[col];
          var t = TARGETS.filter(function (x) { return x.key === g; })[0];
          return '<div class="map-row">' +
            '<div class="mr-src"><b>' + esc(col) + '</b>' +
            '<span>' + esc(IMPORT_ROWS[0][i] || '—') + '</span></div>' +
            '<span class="mr-arrow">' + I.chev(16) + '</span>' +
            '<div class="mr-dst">' +
              '<select class="select">' + TARGETS.map(function (x) {
                return '<option' + (x.key === g ? ' selected' : '') + '>' + L(x.bn, x.en) + '</option>';
              }).join('') + '</select>' +
              '<span class="mr-flag' + (g === 'skip' ? ' skip' : '') + '">' +
              (g === 'skip' ? L('বাদ যাবে', 'ignored') : L('অনুমান করা', 'guessed')) + '</span>' +
            '</div></div>';
        }).join('') + '</div>' +
        '<div class="sticky-foot">' +
          '<button class="btn ghost" data-act="back">' + L('পেছনে', 'Back') + '</button>' +
          '<button class="btn primary" data-go="capture/import/preview">' + L('দেখে নিন', 'Preview') + '</button></div>' +
        '</div>' };
  }

  function previewScreen() {
    var issues = [
      { row: 4, bn: 'ফোন নম্বর ১০ সংখ্যার — ১১ হওয়া উচিত', en: 'Phone has 10 digits, needs 11' },
      { row: 5, bn: 'টাকার ঘর খালি — পণ্যের দাম থেকে বসানো হবে', en: 'Amount blank — will use the catalogue price' }
    ];
    return { route: 'capture', nav: 'orders', title: L('আনার আগে দেখে নিন', 'Before importing'),
      eyebrow: L('ধাপ ৩ / ৩', 'Step 3 of 3'),
      body: '<div class="stack g4">' +
        '<div class="row wrap" style="gap:var(--s2)">' +
          '<span class="chip green">' + L('৩টি সারি ঠিক আছে', '3 rows are clean') + '</span>' +
          '<span class="chip brass">' + L('২টি সারিতে সমস্যা', '2 rows need attention') + '</span>' +
          '<span class="chip outline">' + L('০টি বাদ যাবে', '0 will be skipped') + '</span>' +
        '</div>' +
        U.provenance(L('সমস্যাযুক্ত সারিগুলো বাদ দেওয়া হয় না — আলাদা করে দেখানো হয়, যাতে আপনি ঠিক করে নিতে পারেন। খারাপ সারির জন্য পুরো ফাইল আটকায় না।',
          'Problem rows are not dropped — they are shown so you can fix them. One bad row does not block the file.'), 'brass', I.warn(15)) +
        '<div class="card flush"><div class="tbl-wrap"><table class="tbl">' +
          '<thead><tr><th>#</th><th>' + L('নাম', 'Name') + '</th><th>' + L('মোবাইল', 'Mobile') + '</th>' +
          '<th>' + L('পণ্য', 'Item') + '</th><th class="num">' + L('পরিমাণ', 'Qty') + '</th>' +
          '<th class="num">' + L('টাকা', 'Amount') + '</th><th>' + L('অবস্থা', 'State') + '</th></tr></thead><tbody>' +
          IMPORT_ROWS.map(function (r, i) {
            var bad = issues.filter(function (x) { return x.row === i + 1; })[0];
            return '<tr class="' + (bad ? 'flagged' : 'matched') + '"><td>' + n(i + 1) + '</td>' +
              '<td>' + esc(r[0]) + '</td><td>' + esc(r[1]) + '</td><td>' + esc(r[3]) + '</td>' +
              '<td class="num">' + esc(r[4]) + '</td><td class="num">' + (r[5] ? esc(r[5]) : '—') + '</td>' +
              '<td>' + (bad ? '<span class="chip red sm">' + L(bad.bn, bad.en) + '</span>'
                            : '<span class="chip green sm">' + I.check(12) + L('ঠিক', 'ok') + '</span>') + '</td></tr>';
          }).join('') + '</tbody></table></div></div>' +
        '<div class="sticky-foot">' +
          '<button class="btn ghost" data-go="capture/import/map">' + L('মিল বদলান', 'Change mapping') + '</button>' +
          '<button class="btn primary" data-act="do-import">' + L('৫টি অর্ডার আনুন', 'Import 5 orders') + '</button></div>' +
        '</div>' };
  }

  App.actions['do-import'] = function () {
    U.toast(L('৩টি অর্ডার তৈরি হয়েছে, ২টি ঠিক করার জন্য রাখা হয়েছে',
              '3 orders created, 2 held for you to fix'), 'warn', L('তালিকা দেখুন', 'View'));
    setTimeout(function () { App.go('orders'); }, 900);
  };

  /* ================================================== ORDER DETAIL ====== */

  var FLOW = ['new', 'confirmed', 'packed', 'shipped', 'delivered', 'settled'];

  App.screens.order = {
    view: function (args) {
      var o = App.get.order(args[0]);
      if (!o) return { route: 'orders', title: L('অর্ডার নেই', 'No such order'),
        body: U.emptyState({ title: L('অর্ডারটি পাওয়া যায়নি', 'Order not found'), body: '' }) };

      if (args[1] === 'timeline') return timelineScreen(o);
      if (args[1] === 'slip') return slipScreen(o);

      var c = App.get.customer(o.cust);
      var e = App.econ(o);
      var courier = App.get.courier(o.courier);
      var r = App.risk(c);
      var stepIdx = FLOW.indexOf(o.status);

      var body = '<div class="stack g4">';

      /* --- status + next action --- */
      body += '<div class="card pad status-card">' +
        '<div class="row">' + U.statusChip(o.status) +
        '<span class="spacer"></span>' +
        '<button class="btn sm quiet" data-go="order/' + o.id + '/timeline">' + L('ইতিহাস', 'History') + ' ' + I.chev(13) + '</button></div>';

      if (stepIdx >= 0) {
        body += '<div class="track" style="margin-top:var(--s4)">' + FLOW.map(function (s, i) {
          return '<span class="tk-node' + (i < stepIdx ? ' done' : i === stepIdx ? ' now' : '') + '">' +
            '<i></i><span>' + L(App.STATUS[s].bn, App.STATUS[s].en) + '</span></span>';
        }).join('') + '</div>';
      } else {
        body += '<div style="margin-top:var(--s3)">' + U.provenance(
          o.status === 'cancelled'
            ? L('অর্ডারটি বাতিল হয়েছে। স্টক ফিরিয়ে দেওয়া হয়েছে, কোনো লাভ ধরা হয়নি।',
                'This order was cancelled. Stock was returned and no profit was recognised.')
            : L('পণ্য ফেরত এসেছে। ফেরতের হিসাব বিপরীত এন্ট্রি দিয়ে করা হয়েছে — মূল অর্ডার মুছে ফেলা হয়নি।',
                'Goods came back. The reversal is a compensating entry — the original order was not deleted.'),
          o.status === 'cancelled' ? '' : 'red', I.info(15)) + '</div>';
      }

      body += nextAction(o) + '</div>';

      /* --- customer --- */
      body += '<div class="card flush">' +
        '<button class="list-item" data-go="customer/' + c.id + '">' +
        '<span class="lead ' + (r.band === 'high' ? 'red' : 'green') + '">' + esc(L(c.name, c.nameEn).charAt(0)) + '</span>' +
        '<span class="body"><b>' + esc(L(c.name, c.nameEn)) + '</b><span>' + esc(c.phone) + ' · ' + esc(L(c.area, c.areaEn)) + '</span></span>' +
        U.riskChip(c, true) + '<span class="chev">' + I.chev(16) + '</span></button>' +
        '<div class="addr-block"><span class="eyebrow">' + L('ঠিকানা', 'Address') + '</span>' +
        '<p>' + esc(L(c.address, c.address)) + '</p>' +
        '<div class="row" style="gap:var(--s2)"><button class="chip outline sm" data-act="copy-addr">' + L('কপি', 'Copy') + '</button>' +
        '<button class="chip outline sm" data-act="noop">' + L('কল করুন', 'Call') + '</button></div></div>';

      if (r.band === 'high') {
        body += '<div style="padding:0 var(--s4) var(--s4)">' + U.provenance(
          L('এই ক্রেতার ' + n(r.total) + 'টি অর্ডারের ' + n(c.returned) + 'টি ফেরত এসেছে (' + n(r.pct) + '%)। ' +
            'অগ্রিম নিলে ফেরতের ক্ষতি কমে — সিদ্ধান্ত আপনার, ব্লক করা হয়নি।',
            n(c.returned) + ' of this Customer\'s ' + n(r.total) + ' orders came back (' + n(r.pct) + '%). ' +
            'An advance limits the loss — the call is yours, nothing is blocked.'), 'red', I.warn(15)) + '</div>';
      }

      body += '</div>';

      /* --- items --- */
      body += '<div class="card flush"><div class="card-head"><h3>' + L('পণ্য', 'Items') + '</h3>' +
        '<span class="chip sm">' + App.unit(e.items, ' টি', 'item', 'items') + '</span></div>' +
        o.lines.map(function (l) {
          var p = App.get.product(l.p);
          var ret = l.returned || 0;
          return '<div class="list-item"><span class="lead">' + I.tag(17) + '</span>' +
            '<span class="body"><b>' + esc(L(p.name, p.nameEn)) + (ret ? ' <i class="chip red sm">' + n(ret) + L('টি ফেরত', ' back') + '</i>' : '') + '</b>' +
            '<span>' + (l.v === '_' ? p.sku : App.variantLabel(p, l.v, ' · ')) + ' · ' + L('পরিমাণ', 'qty') + ' ' + n(l.qty) + '</span></span>' +
            (App.seesPrice() ? '<span class="trail"><span class="money">' + tk(l._unitPrice * l.qty) + '</span>' +
              '<span>' + tk(l._unitPrice) + L(' / টি', ' ea') + '</span></span>' : '') + '</div>';
        }).join('') + '</div>';

      /* --- money --- */
      if (App.seesProfit()) {
        var basis = App.RECOGNITION.REALIZED[o.status] ? 'realized'
          : App.RECOGNITION.EARNED[o.status] ? 'earned' : null;

        body += '<div class="econ"><div class="row"><span class="eyebrow">' + L('এই অর্ডারের হিসাব', 'Unit economics') + '</span>' +
          '<span class="spacer"></span>' +
          (basis ? '<button class="basis-btn dark" data-act="basis-why">' + U.basisPill(basis) + '</button>'
                 : '<span class="chip ink sm">' + L('এখনো ধরা হয়নি', 'not recognised yet') + '</span>') + '</div>' +
          '<div class="line"><span>' + L('পণ্যের দাম', 'Goods') + '</span><span class="v">' + tk(e.goods) + '</span></div>' +
          (e.returnedValue ? '<div class="line"><span>' + L('ফেরত পণ্যের দাম', 'Returned goods') + '</span><span class="v">−' + tk(e.returnedValue) + '</span></div>' : '') +
          (e.discount ? '<div class="line"><span>' + L('ছাড়', 'Discount') + '</span><span class="v">−' + tk(e.discount) + '</span></div>' : '') +
          '<div class="line"><span>' + L('ক্রয়মূল্য', 'Cost of goods') + '</span><span class="v">−' + tk(e.cogs) + '</span></div>' +
          '<div class="line"><span>' + L('কুরিয়ার ফি', 'Courier fee') + ' · ' + esc(L(courier.name, courier.nameEn)) + '</span><span class="v">−' + tk(e.courierFee) + '</span></div>' +
          '<div class="line"><span>' + L('COD ফি', 'COD fee') + '</span><span class="v">−' + tk(e.codFee) + '</span></div>' +
          '<div class="line"><span>' + L('প্যাকেজিং', 'Packaging') + '</span><span class="v">−' + tk(e.pack) + '</span></div>' +
          (e.returnLoss ? '<div class="line"><span>' + L('নষ্ট ফেরতে ক্ষতি', 'Loss on damaged return') + '</span><span class="v">−' + tk(e.returnLoss) + '</span></div>' : '') +
          '<div class="line total"><span>' + (basis === 'realized' ? L('হাতে পাওয়া লাভ', 'Realized profit')
            : basis === 'earned' ? L('অর্জিত লাভ', 'Earned profit') : L('সম্ভাব্য লাভ', 'Profit if delivered')) +
            '</span><span class="v">' + tk(e.profit) + '</span></div>' +
          '<div class="econ-note">' + L('মার্জিন ' + n(e.margin, 1) + '% · ক্রেতা দেবেন ' + App.tkPlain(e.collect),
            'Margin ' + n(e.margin, 1) + '% · Customer pays ' + App.tkPlain(e.collect)) + '</div>' +
          '</div>';
      } else if (App.seesPrice()) {
        body += '<div class="card pad"><div class="row"><b style="font-size:var(--fs-sm)">' + L('ক্রেতা দেবেন', 'Customer pays') + '</b>' +
          '<span class="spacer"></span><span class="money big">' + tk(e.collect) + '</span></div>' +
          '<div style="margin-top:var(--s3)">' + U.provenance(L('ক্রয়মূল্য ও লাভ আপনার ভূমিকায় দেখানো হয় না।',
            'Cost and profit are not shown to your Role.'), 'brass', I.lock(15)) + '</div></div>';
      }

      /* --- courier --- */
      body += '<div class="card flush"><div class="card-head"><h3>' + L('কুরিয়ার', 'Courier') + '</h3>' +
        (courier.simulated ? '<span class="chip teal sm">' + L('সিমুলেটেড', 'simulated') + '</span>' : '') + '</div>' +
        '<div class="dl-block"><dl class="dl">' +
        '<dt>' + L('কুরিয়ার', 'Courier') + '</dt><dd>' + esc(L(courier.name, courier.nameEn)) + '</dd>' +
        '<dt>' + L('কনসাইনমেন্ট', 'Consignment') + '</dt><dd>' + (o.consignment ? esc(o.consignment) : '—') + '</dd>' +
        '<dt>' + L('ডেলিভারি চার্জ', 'Delivery charge') + '</dt><dd>' + (App.seesPrice() ? App.tkPlain(o.delivery) : '•••') + '</dd>' +
        '</dl>' +
        (courier.simulated ? '<div style="margin-top:var(--s3)">' + U.provenance(
          L('এই কুরিয়ারের সাথে সরাসরি সংযোগ নেই — অবস্থা সিমুলেটর থেকে আসে। আসল সংযোগ যোগ করলে এই স্ক্রিন বদলাবে না, শুধু তথ্যের উৎস বদলাবে।',
            'There is no live link to this courier — statuses come from a simulator. Adding a real link changes the source, not this screen.'),
          'teal', I.info(15)) + '</div>' : '') +
        '</div></div>';

      /* --- actions --- */
      body += '<div class="card pad"><span class="eyebrow">' + L('অন্য কাজ', 'Other actions') + '</span>' +
        '<div class="act-grid" style="margin-top:var(--s3)">' +
        '<button class="act-tile" data-go="order/' + o.id + '/slip">' + I.print(18) + L('পার্সেল স্লিপ', 'Pack slip') + '</button>' +
        '<button class="act-tile" data-act="noop">' + I.share(18) + L('ক্রেতাকে পাঠান', 'Send to Customer') + '</button>' +
        (App.seesProfit() ? '<button class="act-tile" data-act="open-return" data-arg="' + o.id + '">' + I.undo(18) + L('ফেরত নিন', 'Accept a return') + '</button>' : '') +
        '<button class="act-tile danger" data-act="open-cancel" data-arg="' + o.id + '">' + I.x(18) + L('বাতিল করুন', 'Cancel') + '</button>' +
        '</div></div>';

      body += '</div>';

      return { route: 'orders', nav: 'orders', title: o.id.replace('ORD-', '#'),
        eyebrow: App.date(o.placed, true) + ' · ' + L(CHANNEL[o.channel].bn, CHANNEL[o.channel].en),
        acts: '<button class="iconbtn bordered" data-go="order/' + o.id + '/slip">' + I.print(17) + '</button>',
        body: body };
    }
  };

  var CHANNEL = {
    messenger: { bn: 'মেসেঞ্জার', en: 'Messenger' },
    whatsapp:  { bn: 'হোয়াটসঅ্যাপ', en: 'WhatsApp' },
    phone:     { bn: 'ফোন', en: 'Phone' },
    instagram: { bn: 'ইনস্টাগ্রাম', en: 'Instagram' }
  };

  function nextAction(o) {
    var next = {
      new:       { bn: 'অর্ডার নিশ্চিত করুন', en: 'Confirm the order', to: 'confirmed' },
      confirmed: { bn: 'প্যাক করা হয়েছে', en: 'Mark as packed', to: 'packed' },
      packed:    { bn: 'কুরিয়ারে দেওয়া হয়েছে', en: 'Hand to courier', to: 'shipped' },
      shipped:   { bn: 'ডেলিভারি হয়েছে', en: 'Mark delivered', to: 'delivered' },
      delivered: { bn: 'নিষ্পত্তিতে যোগ করুন', en: 'Match to a settlement', to: 'settled' }
    }[o.status];
    if (!next) return '';
    if (App.moneyLevel() === 'none' && o.status !== 'confirmed') return '';
    return '<button class="btn primary block lg" style="margin-top:var(--s4)" data-act="advance" data-arg="' + o.id + '|' + next.to + '">' +
      I.check(17) + L(next.bn, next.en) + '</button>';
  }

  App.actions['advance'] = function (arg) {
    var parts = arg.split('|');
    var o = App.get.order(parts[0]);
    var prev = o.status;
    o.status = parts[1];
    if (parts[1] === 'shipped' && !o.consignment) o.consignment = 'PT-9912' + (10 + App.orders.indexOf(o));
    App.render();
    U.toast(L('অবস্থা বদলেছে: ' + App.STATUS[parts[1]].bn, 'Status is now ' + App.STATUS[parts[1]].en),
      '', L('ফিরিয়ে নিন', 'Undo'));
    App.state.lastAdvance = { order: o, prev: prev };
  };

  App.actions['undo-toast'] = function () {
    var la = App.state.lastAdvance;
    if (la) { la.order.status = la.prev; App.state.lastAdvance = null; App.render();
      U.toast(L('ফিরিয়ে নেওয়া হয়েছে — বিপরীত এন্ট্রি রাখা হলো', 'Reversed — a compensating entry was recorded')); return; }
    U.toast(L('ফিরিয়ে নেওয়া হয়েছে', 'Reversed'));
  };

  App.actions['copy-addr'] = function () { U.toast(L('ঠিকানা কপি হয়েছে', 'Address copied')); };

  /* ------------------------------------------------------- cancel + return */

  App.actions['open-cancel'] = function (id) {
    U.openSheet({
      title: L('অর্ডার বাতিল করবেন?', 'Cancel this order?'),
      sub: L('বাতিল করলে অর্ডার মুছে যায় না — বাতিল হিসেবে থেকে যায়, যাতে হিসাবের ইতিহাস অটুট থাকে।',
             'Cancelling does not delete the order — it stays, marked cancelled, so the record remains whole.'),
      body: '<div class="stack g3">' +
        U.field({ label: L('কেন বাতিল?', 'Why?'), type: 'select', options: [
          { label: L('ক্রেতা নিজে বাতিল করেছেন', 'Customer cancelled') },
          { label: L('ফোন ধরছেন না', 'Not reachable') },
          { label: L('স্টকে নেই', 'Out of stock') },
          { label: L('ঠিকানা ভুল', 'Bad address') },
          { label: L('অন্য কারণ', 'Other') }
        ] }) +
        U.field({ label: L('মন্তব্য (ঐচ্ছিক)', 'Note (optional)'), type: 'textarea', rows: 2 }) +
        U.toggleRow({ title: L('স্টক ফিরিয়ে দিন', 'Return the stock'),
          sub: L('পণ্যগুলো আবার বিক্রির জন্য পাওয়া যাবে', 'The items become sellable again'), on: true }) +
        '</div>',
      foot: '<button class="btn ghost" data-act="close-sheet">' + L('থাক', 'Keep it') + '</button>' +
        '<button class="btn danger" data-act="do-cancel" data-arg="' + id + '">' + L('বাতিল করুন', 'Cancel order') + '</button>'
    });
  };

  App.actions['do-cancel'] = function (id) {
    U.closeSheet();
    var o = App.get.order(id);
    App.state.lastAdvance = { order: o, prev: o.status };
    o.status = 'cancelled';
    App.render();
    U.toast(L('বাতিল করা হয়েছে, স্টক ফেরত দেওয়া হয়েছে', 'Cancelled and stock returned'), 'warn', L('ফিরিয়ে নিন', 'Undo'));
  };

  App.actions['open-return'] = function (id) {
    var o = App.get.order(id);
    U.openSheet({
      title: L('ফেরত নিন', 'Accept a return'),
      sub: L('অবস্থা অনুযায়ী পণ্যটি স্টকে ফিরবে কি না ঠিক হবে — এটাই লাভের হিসাব বদলায়।',
             'The condition decides whether the item returns to stock — and that is what moves the profit.'),
      body: '<div class="stack g4">' +
        '<div><span class="eyebrow">' + L('কোন পণ্য ফেরত?', 'Which items?') + '</span>' +
        '<div class="card flush" style="margin-top:var(--s2)">' + o.lines.map(function (l) {
          var p = App.get.product(l.p);
          return '<div class="list-item"><span class="lead">' + I.tag(16) + '</span>' +
            '<span class="body"><b>' + esc(L(p.name, p.nameEn)) + '</b><span>' + L('পাঠানো হয়েছে', 'shipped') + ' ' + n(l.qty) + '</span></span>' +
            '<div class="qty-stepper sm"><button data-act="noop">−</button><span>' + n(l.returned || 0) + '</span><button data-act="noop">+</button></div></div>';
        }).join('') + '</div></div>' +
        '<div><span class="eyebrow">' + L('পণ্যের অবস্থা', 'Condition') + '</span>' +
        '<div class="cond-grid" style="margin-top:var(--s2)">' +
          '<button class="cond-tile" data-act="pick" aria-pressed="true">' + I.check(18) +
            '<b>' + L('আবার বিক্রি করা যাবে', 'Resalable') + '</b>' +
            '<span>' + L('স্টকে ফিরবে · ক্রয়মূল্যের ক্ষতি নেই', 'Returns to stock · no cost loss') + '</span></button>' +
          '<button class="cond-tile bad" data-act="pick" aria-pressed="false">' + I.warn(18) +
            '<b>' + L('নষ্ট হয়েছে', 'Damaged') + '</b>' +
            '<span>' + L('স্টকে ফিরবে না · ক্রয়মূল্য ক্ষতি', 'Not restocked · cost is lost') + '</span></button>' +
        '</div></div>' +
        U.provenance(L('মূল অর্ডার বদলানো হবে না। ফেরতটি একটি বিপরীত এন্ট্রি হিসেবে যোগ হবে, তাই আগের হিসাবও দেখা যাবে।',
          'The original order is not edited. The return is added as a compensating entry, so the earlier figures remain visible.'), 'teal') +
        '</div>',
      foot: '<button class="btn ghost" data-act="close-sheet">' + L('বাতিল', 'Cancel') + '</button>' +
        '<button class="btn primary" data-act="do-return" data-arg="' + id + '">' + L('ফেরত নিশ্চিত করুন', 'Record the return') + '</button>'
    });
  };

  App.actions['do-return'] = function (id) {
    U.closeSheet();
    U.toast(L('ফেরত লেখা হয়েছে — স্টকে ফিরেছে, লাভ কমেছে', 'Return recorded — restocked, profit reduced'), 'warn',
      L('ফিরিয়ে নিন', 'Undo'));
    App.go('order/' + id);
  };

  /* ------------------------------------------------------------ timeline */

  /* Each step is timed from the order's own capture, not from a fixed date: an
     order captured after that date would show a history running backwards. */
  var STEP_HOURS = { confirmed: 2, packed: 6, shipped: 22, delivered: 52, settled: 100 };

  function stepTime(placed, status) {
    var d = new Date(placed.replace(' ', 'T') + ':00');
    d.setHours(d.getHours() + STEP_HOURS[status]);
    var p = function (x) { return (x < 10 ? '0' : '') + x; };
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) +
      ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
  }
  App.stepTime = stepTime;

  function timelineScreen(o) {
    var c = App.get.customer(o.cust);
    var events = [
      { at: o.placed, bn: 'অর্ডার নেওয়া হয়েছে', en: 'Order captured',
        sub: L(SOURCE[o.source].bn, SOURCE[o.source].en) + ' · ' + L(App.ROLES.staff.name, App.ROLES.staff.nameEn), state: 'done' }
    ];
    var idx = FLOW.indexOf(o.status);
    ['confirmed', 'packed', 'shipped', 'delivered', 'settled'].forEach(function (s) {
      var pos = FLOW.indexOf(s);
      if (pos <= idx) {
        events.push({ at: stepTime(o.placed, s), bn: App.STATUS[s].bn, en: App.STATUS[s].en,
          sub: s === 'shipped' ? L('কনসাইনমেন্ট ' + (o.consignment || ''), 'Consignment ' + (o.consignment || ''))
             : s === 'settled' ? L('নিষ্পত্তি ' + (o.settlement || ''), 'Settlement ' + (o.settlement || ''))
             : L(App.ROLES.manager.name, App.ROLES.manager.nameEn), state: pos === idx ? 'now' : 'done' });
      } else {
        events.push({ at: null, bn: App.STATUS[s].bn, en: App.STATUS[s].en, sub: L('এখনো হয়নি', 'not yet'), state: '' });
      }
    });

    return { route: 'orders', nav: 'orders', title: L('ইতিহাস', 'History'),
      eyebrow: o.id.replace('ORD-', '#') + ' · ' + esc(L(c.name, c.nameEn)),
      body: '<div class="stack g4">' +
        U.provenance(L('প্রত্যেক ধাপে কে, কখন — সব লেখা থাকে। কিছু মুছে ফেলা যায় না, শুধু বিপরীত এন্ট্রি দিয়ে ঠিক করা যায়।',
          'Every step records who and when. Nothing can be deleted — only corrected with a compensating entry.'), 'teal', I.shield(15)) +
        '<div class="card pad"><div class="timeline">' + events.map(function (ev) {
          return '<div class="tl-item ' + ev.state + '"><b>' + L(ev.bn, ev.en) + '</b>' +
            '<span>' + (ev.at ? App.date(ev.at, true) : '—') + ' · ' + ev.sub + '</span></div>';
        }).join('') + '</div></div>' +
        (App.seesProfit() ? '<button class="btn ghost block" data-go="audit">' + I.shield(15) + L('পুরো অডিট ট্রেইল', 'Full audit trail') + '</button>' : '') +
        '</div>' };
  }

  var SOURCE = {
    paste:    { bn: 'মেসেজ পেস্ট', en: 'Pasted message' },
    manual:   { bn: 'হাতে লেখা', en: 'Typed manually' },
    repeat:   { bn: 'আগের অর্ডার থেকে', en: 'Repeat order' },
    quickadd: { bn: 'দ্রুত যোগ', en: 'Quick-add' },
    import:   { bn: 'এক্সেল থেকে', en: 'Spreadsheet import' }
  };

  /* ------------------------------------------------------------ pack slip */

  function slipScreen(o) {
    var c = App.get.customer(o.cust);
    var e = App.econ(o);
    return { route: 'orders', nav: 'orders', title: L('পার্সেল স্লিপ', 'Pack slip'),
      eyebrow: o.id.replace('ORD-', '#'),
      acts: '<button class="btn sm ghost" data-act="print-slip">' + I.print(14) + L('প্রিন্ট', 'Print') + '</button>',
      body: '<div class="stack g4">' +
        U.provenance(L('বাংলা লেখা ছবিতে বসিয়ে PDF বানানো হয়, তাই যেকোনো প্রিন্টারে ঠিক আসবে — ফন্ট না থাকলেও ভাঙবে না।',
          'The Bangla text is rendered into the PDF, so it prints correctly even where the font is missing.'), 'teal', I.print(15)) +
        '<div class="slip">' +
          '<div class="slip-head"><div><b>' + esc(L(App.business.name, App.business.nameEn)) + '</b>' +
          '<span>' + esc(App.business.phone) + '</span></div>' +
          '<div class="slip-code">' + o.id.replace('ORD-', '#') + '</div></div>' +
          '<div class="slip-to"><span class="eyebrow">' + L('প্রাপক', 'Deliver to') + '</span>' +
          '<b>' + esc(L(c.name, c.nameEn)) + '</b><span>' + esc(c.phone) + '</span>' +
          '<p>' + esc(c.address) + '</p></div>' +
          '<table class="slip-tbl"><tbody>' + o.lines.map(function (l) {
            var p = App.get.product(l.p);
            return '<tr><td>' + esc(L(p.name, p.nameEn)) + '<br><small>' + (l.v === '_' ? p.sku : App.variantLabel(p, l.v, ' · ')) + '</small></td>' +
              '<td class="num">' + n(l.qty) + '</td></tr>';
          }).join('') + '</tbody></table>' +
          '<div class="slip-cod"><span>' + L('ডেলিভারিতে নিতে হবে', 'Collect on delivery') + '</span>' +
          '<b>' + App.tkPlain(e.collect) + '</b></div>' +
          '<div class="slip-foot">' + L('পণ্য গুনে নিন। সমস্যা হলে ' + App.business.phone + ' নম্বরে জানান।',
            'Please count the items. Any problem, call ' + App.business.phone + '.') + '</div>' +
        '</div>' +
        '<div class="grid c2">' +
          '<button class="btn ghost" data-act="print-slip">' + I.print(15) + L('প্রিন্ট', 'Print') + '</button>' +
          '<button class="btn primary" data-act="advance" data-arg="' + o.id + '|packed">' + I.check(15) + L('প্যাক হয়েছে', 'Packed') + '</button>' +
        '</div></div>' };
  }

  App.actions['print-slip'] = function () { U.toast(L('PDF তৈরি হয়েছে', 'PDF generated')); };
})(window.App);
