/* SmartBiz BD — router, chrome wiring, global action dispatch.
   Hash routing so the prototype opens straight from the filesystem with no
   server: every screen is a shareable link, which is the point of a prototype. */

window.App = window.App || {};

(function (App) {
  'use strict';

  var L = App.L;

  App.screens = App.screens || {};
  App.actions = App.actions || {};
  App.state = App.state || {};

  App.device = 'phone';
  App.role = 'owner';
  App.aiOn = true;
  App.history = [];

  /* ------------------------------------------------------------- routing */
  function parse() {
    var h = (location.hash || '#/home').replace(/^#\/?/, '');
    var parts = h.split('/').filter(Boolean);
    return { route: parts[0] || 'home', args: parts.slice(1), raw: h };
  }

  function go(path, replace) {
    var target = '#/' + String(path).replace(/^#?\/?/, '');
    if (location.hash === target) { render(); return; }
    if (replace) location.replace(target); else location.hash = target;
  }

  function back() {
    if (App.history.length > 1) {
      App.history.pop();
      var prev = App.history[App.history.length - 1];
      App.history.pop();
      go(prev, true);
    } else {
      go('home', true);
    }
  }

  function render() {
    var r = parse();
    var last = App.history[App.history.length - 1];
    if (last !== r.raw) App.history.push(r.raw);
    if (App.history.length > 40) App.history.shift();

    /* close any open sheet on navigation */
    while (App.sheetStack.length) App.ui.closeSheet();

    var screen = App.screens[r.route];
    var app = document.getElementById('app');

    /* A toast raised just before a navigation has to survive the render that
       follows it, so the host is detached and put back rather than rebuilt. */
    var toasts = document.getElementById('toasts');
    if (toasts) toasts.parentNode.removeChild(toasts);

    if (!screen) {
      app.innerHTML = App.ui.shell({
        route: r.route, title: L('পাওয়া যায়নি', 'Not found'),
        body: App.ui.emptyState({
          icon: App.I.search(24),
          title: L('এই স্ক্রিন নেই', 'No such screen'),
          body: L('উপরের তালিকা থেকে একটি স্ক্রিন বেছে নিন।', 'Pick a screen from the list above.'),
          action: '<button class="btn primary" data-go="home">' + L('ড্যাশবোর্ডে যান', 'Go to dashboard') + '</button>'
        })
      });
    } else {
      /* a money screen viewed by a Role that may not see money is not a blank
         screen — it says so, because silence looks like a bug (FR-45) */
      if (!App.canReach(r.route)) {
        app.innerHTML = App.ui.shell({
          route: r.route, title: screen.title ? screen.title() : '',
          body: App.ui.roleLock()
        });
      } else {
        app.innerHTML = App.ui.shell(screen.view(r.args));
      }
    }

    var scroll = app.querySelector('.scroll');
    if (scroll) scroll.firstElementChild.classList.add('screen-in');

    if (!toasts) {
      toasts = document.createElement('div');
      toasts.id = 'toasts';
    }
    app.appendChild(toasts);

    syncChrome(r.route);
    if (screen && screen.after) screen.after(r.args);
  }

  App.go = go;
  App.back = back;
  App.render = render;
  App.rerender = render;

  /* --------------------------------------------------- chrome: screen list */
  /* Every screen the prototype can reach, in walkthrough order. This doubles
     as the review checklist for the UX phase. */
  App.SCREEN_INDEX = [
    ['— Presentation —', ''],
    ['Story journey hub · 76/76', 'journeys'],
    ['— Onboarding —', ''],
    ['Splash / language', 'splash'],
    ['Sign in', 'signin'],
    ['Verify code', 'verify'],
    ['Create business', 'setup'],
    ['Seed catalogue', 'setup/catalogue'],
    ['Invite team', 'setup/team'],
    ['Ready', 'setup/done'],
    ['— Daily —', ''],
    ['Dashboard', 'home'],
    ['Daily summary card', 'home/summary'],
    ['Ask SmartBiz', 'insights'],
    ['— Orders —', ''],
    ['Order list', 'orders'],
    ['Capture hub', 'capture'],
    ['Paste & parse', 'capture/paste'],
    ['Manual form', 'capture/manual'],
    ['Repeat order', 'capture/repeat'],
    ['Quick-add grid', 'capture/quick'],
    ['Photo beside form', 'capture/photo'],
    ['Spreadsheet import', 'capture/import'],
    ['Column mapping', 'capture/import/map'],
    ['Import preview', 'capture/import/preview'],
    ['Voice dictation', 'capture/voice'],
    ['Order detail', 'order/ORD-1035'],
    ['Order · delivered', 'order/ORD-1033'],
    ['Order · part return', 'order/ORD-1031'],
    ['Status timeline', 'order/ORD-1035/timeline'],
    ['Pack slip', 'order/ORD-1037/slip'],
    ['— Customers —', ''],
    ['Customer list', 'customers'],
    ['Customer detail', 'customer/C-02'],
    ['— Catalogue —', ''],
    ['Product list', 'products'],
    ['Product detail', 'product/P-101'],
    ['Variant matrix', 'product/P-101/variants'],
    ['New product', 'products/new'],
    ['Inventory', 'inventory'],
    ['Stock adjust', 'inventory/P-105'],
    ['Low stock', 'inventory/low'],
    ['Stock count', 'inventory/count'],
    ['— Money —', ''],
    ['Courier & COD', 'cod'],
    ['Consignment detail', 'cod/PT-991204'],
    ['Settlement runs', 'settlement'],
    ['Import payout', 'settlement/import'],
    ['Map columns', 'settlement/import/map'],
    ['Match review', 'settlement/STL-0831'],
    ['Variance disposition', 'settlement/STL-0831/PT-991204'],
    ['Expenses', 'expenses'],
    ['Add expense', 'expenses/new'],
    ['Dues', 'dues'],
    ['Due detail', 'dues/D-03'],
    ['Suppliers', 'suppliers'],
    ['Supplier detail', 'supplier/S-02'],
    ['— Insight —', ''],
    ['Reports', 'reports'],
    ['Profit report', 'reports/profit'],
    ['— System —', ''],
    ['Audit trail', 'audit'],
    ['Audit entry', 'audit/A-84'],
    ['Settings', 'settings'],
    ['Members & roles', 'settings/members'],
    ['Business profile', 'settings/business'],
    ['AI assistant', 'settings/ai'],
    ['Process flows', 'flows']
  ];

  function buildScreenSelect() {
    var sel = document.getElementById('c-screen');
    sel.innerHTML = App.SCREEN_INDEX.map(function (row) {
      if (!row[1]) return '<option disabled>' + row[0] + '</option>';
      return '<option value="' + row[1] + '">' + row[0] + '</option>';
    }).join('');
    sel.addEventListener('change', function () { if (sel.value) go(sel.value); });
  }

  function syncChrome(route) {
    var sel = document.getElementById('c-screen');
    var raw = parse().raw;
    var found = false;
    for (var i = 0; i < sel.options.length; i++) {
      if (sel.options[i].value === raw) { sel.selectedIndex = i; found = true; break; }
    }
    if (found) return;

    /* Routes carrying a different record id are not in the index by name, so
       score the closest listed screen: same first segment, and same last
       segment, which is what distinguishes order/X from order/X/timeline.
       Without this the dropdown keeps a stale, wrong label. */
    var parts = raw.split('/');
    var best = -1, bestScore = 0;
    for (var j = 0; j < sel.options.length; j++) {
      var v = sel.options[j].value;
      if (!v) continue;
      var vp = v.split('/');
      var score = (vp[0] === parts[0] ? 1 : 0);
      if (!score) continue;
      if (vp.length === parts.length) score++;
      if (vp[vp.length - 1] === parts[parts.length - 1]) score++;
      if (score > bestScore) { bestScore = score; best = j; }
    }
    if (best > -1) sel.selectedIndex = best;
  }

  /* ------------------------------------------------------- chrome wiring */
  function wireChrome() {
    document.getElementById('c-device').addEventListener('click', function (e) {
      var b = e.target.closest('button[data-device]');
      if (!b) return;
      App.device = b.dataset.device;
      document.body.dataset.device = App.device;
      [].forEach.call(this.querySelectorAll('button'), function (x) {
        x.setAttribute('aria-pressed', x === b ? 'true' : 'false');
      });
      render();
    });

    document.getElementById('c-lang').addEventListener('click', function (e) {
      var b = e.target.closest('button[data-lang]');
      if (!b) return;
      App.lang = b.dataset.lang;
      document.body.dataset.lang = App.lang;
      document.documentElement.lang = App.lang;
      [].forEach.call(this.querySelectorAll('button'), function (x) {
        x.setAttribute('aria-pressed', x === b ? 'true' : 'false');
      });
      render();
    });

    document.getElementById('c-role').addEventListener('change', function () {
      App.role = this.value;
      document.body.dataset.role = App.role;
      render();
      var r = App.ROLES[App.role];
      App.ui.toast(L('এখন দেখছেন: ' + r.name + ' — ' + r.label,
                     'Now viewing as ' + r.nameEn + ' — ' + r.labelEn));
    });

    document.getElementById('c-flows').addEventListener('click', function () { go('flows'); });

    document.getElementById('c-ai').addEventListener('click', function () {
      App.aiOn = !App.aiOn;
      this.classList.toggle('on', App.aiOn);
      this.textContent = App.aiOn ? 'AI on' : 'AI off';
      render();
      App.ui.toast(App.aiOn
        ? L('ইনসাইট প্রোভাইডার চালু — প্রশ্ন লিখে জিজ্ঞাসা করা যাবে', 'Insight Provider configured — free-text questions enabled')
        : L('ইনসাইট প্রোভাইডার নেই — বাটনের তালিকা থেকে বেছে নিন', 'No Insight Provider — the ten queries appear as buttons'),
        App.aiOn ? '' : 'warn');
    });
  }

  /* --------------------------------------------------- global delegation */
  function wireBody() {
    document.getElementById('app').addEventListener('click', function (e) {
      var goEl = e.target.closest('[data-go]');
      var actEl = e.target.closest('[data-act]');

      if (actEl && (!goEl || actEl.contains(goEl) === false && goEl.contains(actEl))) {
        /* action wins when it is the nearer ancestor */
      }
      if (actEl && (!goEl || nearer(e.target, actEl, goEl) === actEl)) {
        var name = actEl.dataset.act;
        var arg = actEl.dataset.arg;
        if (name === 'back') { back(); return; }
        if (name === 'close-sheet') { App.ui.closeSheet(); return; }
        if (name === 'noop') { return; }
        if (name === 'toggle') {
          var on = actEl.getAttribute('aria-checked') === 'true';
          actEl.setAttribute('aria-checked', on ? 'false' : 'true');
          return;
        }
        if (name === 'press') {
          var p = actEl.getAttribute('aria-pressed') === 'true';
          actEl.setAttribute('aria-pressed', p ? 'false' : 'true');
          return;
        }
        /* An exclusive choice among siblings. 'press' toggles in place, which lets
           a mutually exclusive pair sit with both options looking chosen. */
        if (name === 'pick') {
          [].forEach.call(actEl.parentNode.children, function (x) {
            x.setAttribute('aria-pressed', x === actEl ? 'true' : 'false');
          });
          return;
        }
        if (App.actions[name]) { App.actions[name](arg, actEl, e); return; }
        App.ui.toast(L('এই অংশটি প্রোটোটাইপে দেখানো হয়নি', 'Not wired in this prototype'), 'warn');
        return;
      }

      if (goEl) { go(goEl.dataset.go); }
    });

    /* Enter on an input inside a sheet should not reload the page */
    document.getElementById('app').addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && e.target.tagName === 'INPUT') e.preventDefault();
    });

    window.addEventListener('hashchange', render);

    /* arrow keys walk the screen index — a presenter's convenience */
    document.addEventListener('keydown', function (e) {
      if (e.target.matches('input, textarea, select')) return;
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      var sel = document.getElementById('c-screen');
      var i = sel.selectedIndex;
      var dir = e.key === 'ArrowRight' ? 1 : -1;
      do { i += dir; } while (i > 0 && i < sel.options.length && sel.options[i].disabled);
      if (i >= 0 && i < sel.options.length && sel.options[i].value) {
        sel.selectedIndex = i;
        go(sel.options[i].value);
      }
    });
  }

  /* which of two ancestors is nearer to the event target */
  function nearer(target, a, b) {
    var node = target;
    while (node) {
      if (node === a) return a;
      if (node === b) return b;
      node = node.parentElement;
    }
    return a;
  }

  /* --------------------------------------------------- shared actions */
  App.actions['completeness-why'] = function (arg) {
    var s = App.summary();
    var R = App.RECOGNITION;
    /* Only the courier-custody orders are actually excluded from the figure —
       they are the gap between have and of. The other two causes can move the
       figure later without being missing from it, so they are counted but not
       presented as part of the same arithmetic. */
    var custodyN = s.completeness.of - s.completeness.have;
    var pendingN = App.orders.filter(function (o) {
      return R.EARNED[o.status] && !R.REALIZED[o.status];
    }).length;
    function cause(title, why, count) {
      return '<div class="card pad"><div class="row"><b style="font-size:var(--fs-sm)">' + title + '</b>' +
        '<span class="spacer"></span><span class="chip sm">' + count + '</span></div>' +
        '<p style="font-size:var(--fs-xs);color:var(--text-2);margin-top:6px;line-height:var(--lh-snug)">' + why + '</p></div>';
    }
    App.ui.openSheet({
      title: L('এই হিসাব কতটা সম্পূর্ণ?', 'How complete is this figure?'),
      sub: L('যে তথ্য নেই, সেটা লুকানো হয় না — বলা হয়।', 'Missing data is disclosed, not hidden.'),
      body:
        App.ui.provenance(L(
          'এই সংখ্যাটি <b>' + App.n(s.completeness.have) + ' টি</b> অর্ডার ধরে হিসাব করা, মোট <b>' + App.n(s.completeness.of) + ' টি</b> এর মধ্যে।',
          'This figure is computed over <b>' + App.n(s.completeness.have) + '</b> of <b>' + App.n(s.completeness.of) + '</b> relevant orders.'), 'brass', App.I.warn(15)) +
        '<div class="stack g3" style="margin-top:var(--s4)">' +
        '<span class="eyebrow">' + L('বাদ পড়েছে — ' + App.n(custodyN) + ' টি', 'Left out of the figure — ' + App.n(custodyN)) + '</span>' +
        cause(L('কুরিয়ারের কাছে আছে', 'Still with the courier'),
          L('পাঠানো হয়েছে কিন্তু ডেলিভারি নিশ্চিত হয়নি — তাই লাভ এখনো অর্জিত নয়।',
            'Shipped but delivery not yet confirmed, so no profit is earned yet.'), App.n(custodyN)) +
        '<span class="eyebrow">' + L('সংখ্যাটা পরে বদলাতে পারে', 'What can still move this figure') + '</span>' +
        cause(L('নিষ্পত্তি বাকি', 'Settlement pending'),
          L('ডেলিভারি হয়েছে, কিন্তু কুরিয়ার এখনো টাকা পাঠায়নি — অর্জিত, হাতে পাওয়া নয়।',
            'Delivered, but the courier has not paid out — earned, not realized.'), App.n(pendingN)) +
        cause(L('অমিল সমাধান বাকি', 'Unresolved variance'),
          L('নিষ্পত্তির ফাইলে ' + App.n(s.unsettled) + 'টি সারি মেলেনি — সেগুলো ঠিক না হলে হিসাব বদলাতে পারে।',
            App.n(s.unsettled) + ' rows in the payout file did not match; resolving them can move this figure.'), App.n(s.unsettled)) +
        '</div>',
      foot: '<button class="btn ghost" data-act="close-sheet">' + L('বুঝেছি', 'Understood') + '</button>' +
            '<button class="btn primary" data-go="settlement/STL-0831">' + L('অমিল দেখুন', 'Review variances') + '</button>'
    });
  };

  App.actions['basis-why'] = function () {
    App.ui.openSheet({
      title: L('অর্জিত বনাম হাতে পাওয়া', 'Earned versus realized'),
      sub: L('একই বিক্রি, দুইটি সত্য।', 'One sale, two truthful figures.'),
      body:
        '<div class="stack g3">' +
        '<div class="card pad"><span class="basis earned">' + L('অর্জিত', 'earned') + '</span>' +
        '<p style="margin-top:var(--s3);font-size:var(--fs-sm);line-height:var(--lh-body)">' +
        L('পণ্য গ্রাহকের হাতে পৌঁছেছে। বিক্রি সম্পন্ন, লাভ হিসাবের খাতায় উঠেছে — কিন্তু টাকা এখনো কুরিয়ারের কাছে।',
          'The goods reached the Customer. The sale is complete and the profit is on the books — but the cash is still with the courier.') +
        '</p></div>' +
        '<div class="card pad"><span class="basis realized">' + L('হাতে পাওয়া', 'realized') + '</span>' +
        '<p style="margin-top:var(--s3);font-size:var(--fs-sm);line-height:var(--lh-body)">' +
        L('কুরিয়ার টাকা পাঠিয়েছে এবং সেটা আপনার হিসাবের সাথে মিলেছে। এই টাকা খরচ করা যায়।',
          'The courier has paid out and the amount matched your record. This is money you can spend.') +
        '</p></div>' +
        App.ui.provenance(L(
          'পার্থক্যটাই ব্যবসার নগদ ঝুঁকি। দুইটি সংখ্যা একসাথে দেখানো হয় কারণ একটিকে অন্যটির জায়গায় ধরলে ভুল সিদ্ধান্ত হয়।',
          'The gap between them is the cash risk. Both are shown because treating one as the other is how sellers make bad calls.'), 'violet', App.I.info(15)) +
        '</div>',
      foot: '<button class="btn primary" data-act="close-sheet">' + L('বুঝেছি', 'Understood') + '</button>'
    });
  };

  /* -------------------------------------------------------------- boot */
  function boot() {
    document.body.dataset.device = App.device;
    document.body.dataset.lang = App.lang;
    document.body.dataset.role = App.role;
    buildScreenSelect();
    wireChrome();
    wireBody();
    if (!location.hash) location.replace('#/splash');
    render();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})(window.App);
