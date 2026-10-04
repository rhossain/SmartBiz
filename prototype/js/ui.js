/* SmartBiz BD — shared components.
   Everything a screen renders comes from here, so a change to how a figure
   declares its Recognition Basis changes it on every screen at once. */

window.App = window.App || {};

(function (App) {
  'use strict';

  var L = App.L, n = App.n, tk = App.tk;

  /* The screen modules load before the router, so the registries they write
     into have to exist by the time this file is done. */
  App.screens = App.screens || {};
  App.actions = App.actions || {};
  App.state = App.state || {};

  /* ---------------------------------------------------------------- icons */
  function svg(d, size) {
    return '<svg width="' + (size || 18) + '" height="' + (size || 18) + '" viewBox="0 0 24 24" fill="none" ' +
      'stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' + d + '</svg>';
  }
  var I = {
    home:    function (s) { return svg('<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/>', s); },
    orders:  function (s) { return svg('<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/>', s); },
    plus:    function (s) { return svg('<path d="M12 5v14M5 12h14"/>', s); },
    box:     function (s) { return svg('<path d="M21 8.5 12 4 3 8.5v7L12 20l9-4.5v-7Z"/><path d="M3 8.5 12 13l9-4.5M12 13v7"/>', s); },
    money:   function (s) { return svg('<rect x="2.5" y="6" width="19" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 9v6M18 9v6"/>', s); },
    people:  function (s) { return svg('<circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5"/><path d="M16 5.5a3 3 0 0 1 0 5.6M17.5 20c0-2.4-1-4.2-2.5-5"/>', s); },
    tag:     function (s) { return svg('<path d="M12.6 3H20a1 1 0 0 1 1 1v7.4a2 2 0 0 1-.6 1.4l-7.6 7.6a2 2 0 0 1-2.8 0l-6-6a2 2 0 0 1 0-2.8l7.6-7.6A2 2 0 0 1 12.6 3Z"/><circle cx="16.5" cy="7.5" r="1.3" fill="currentColor" stroke="none"/>', s); },
    truck:   function (s) { return svg('<path d="M2 7h11v9H2z"/><path d="M13 10h4.5l3 3v3H13z"/><circle cx="6.5" cy="18.5" r="1.8"/><circle cx="17" cy="18.5" r="1.8"/>', s); },
    chart:   function (s) { return svg('<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>', s); },
    receipt: function (s) { return svg('<path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z"/><path d="M9 8h6M9 12h6"/>', s); },
    shield:  function (s) { return svg('<path d="M12 3l7 3v6c0 4.5-3 7.6-7 9-4-1.4-7-4.5-7-9V6l7-3Z"/><path d="M9.5 12l1.8 1.8L15 10"/>', s); },
    gear:    function (s) { return svg('<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>', s); },
    spark:   function (s) { return svg('<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3Z"/><path d="M18.5 15.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7.7-1.8Z"/>', s); },
    back:    function (s) { return svg('<path d="M15 5l-7 7 7 7"/>', s); },
    chev:    function (s) { return svg('<path d="M9 5l7 7-7 7"/>', s); },
    check:   function (s) { return svg('<path d="M5 12.5l4.5 4.5L19 7"/>', s); },
    x:       function (s) { return svg('<path d="M6 6l12 12M18 6L6 18"/>', s); },
    info:    function (s) { return svg('<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>', s); },
    warn:    function (s) { return svg('<path d="M12 3.5 21 19H3l9-15.5Z"/><path d="M12 9.5v4M12 16.5h.01"/>', s); },
    search:  function (s) { return svg('<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>', s); },
    filter:  function (s) { return svg('<path d="M4 6h16M7 12h10M10 18h4"/>', s); },
    camera:  function (s) { return svg('<path d="M3 8.5h3l1.5-2h9L18 8.5h3v11H3z"/><circle cx="12" cy="14" r="3.2"/>', s); },
    mic:     function (s) { return svg('<rect x="9.5" y="3" width="5" height="10" rx="2.5"/><path d="M6 11.5a6 6 0 0 0 12 0M12 17.5V21"/>', s); },
    sheet:   function (s) { return svg('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9.5h18M9 4v16M15 4v16"/>', s); },
    repeat:  function (s) { return svg('<path d="M4 9V7a2 2 0 0 1 2-2h11l-2.5-2.5M20 15v2a2 2 0 0 1-2 2H7l2.5 2.5"/>', s); },
    grid:    function (s) { return svg('<rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.5"/>', s); },
    print:   function (s) { return svg('<path d="M7 8V3h10v5"/><rect x="4" y="8" width="16" height="8" rx="2"/><path d="M7 16h10v5H7z"/>', s); },
    share:   function (s) { return svg('<circle cx="17" cy="5.5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="17" cy="18.5" r="2.5"/><path d="M8.3 10.8 14.7 6.8M8.3 13.2l6.4 4"/>', s); },
    undo:    function (s) { return svg('<path d="M4 10h9a5 5 0 0 1 0 10H8M4 10l4-4M4 10l4 4"/>', s); },
    flow:    function (s) { return svg('<rect x="3" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="10" width="7" height="5" rx="1.5"/><rect x="3" y="17" width="7" height="4" rx="1.5"/><path d="M10 5.5h2.5a1.5 1.5 0 0 1 1.5 1.5v3M14 15v3a1.5 1.5 0 0 1-1.5 1.5H10"/>', s); },
    lock:    function (s) { return svg('<rect x="4.5" y="10" width="15" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>', s); },
    shop:    function (s) { return svg('<path d="M4 9.5V20h16V9.5"/><path d="M3 9.5 5 4h14l2 5.5z"/><path d="M9.5 20v-6h5v6"/>', s); },

    /* one glyph per order status — the state machine reads as a sequence, so
       each status gets a mark that carries a little of its meaning */
    new:       function (s) { return svg('<circle cx="12" cy="12" r="8.5"/><path d="M12 8.5v7M8.5 12h7"/>', s); },
    confirmed: function (s) { return svg('<circle cx="12" cy="12" r="8.5"/><path d="M8.5 12.3l2.6 2.6L15.8 9.7"/>', s); },
    packed:    function (s) { return svg('<path d="M20.5 8.5 12 4.2 3.5 8.5v7L12 19.8l8.5-4.3v-7Z"/><path d="M3.5 8.5 12 12.8l8.5-4.3"/><path d="M12 12.8v7"/><path d="M7.5 6.3 16 10.6"/>', s); },
    delivered: function (s) { return svg('<path d="M4 12.5l4 4 8-9"/><path d="M12 16.5h8"/>', s); },
    settled:   function (s) { return svg('<circle cx="12" cy="12" r="8.5"/><path d="M14.5 9.2A3 3 0 0 0 9.6 11c0 2.6 5 1.4 5 4a3 3 0 0 1-4.9 1.8"/><path d="M12 7.2v9.6"/>', s); },
    cancelled: function (s) { return svg('<circle cx="12" cy="12" r="8.5"/><path d="M9.2 9.2l5.6 5.6M14.8 9.2l-5.6 5.6"/>', s); },
    returned:  function (s) { return svg('<path d="M20 14h-9a5 5 0 0 1 0-10h5M20 14l-4 4M20 14l-4-4"/>', s); },
    partial:   function (s) { return svg('<path d="M20 14h-9a5 5 0 0 1 0-10h5M20 14l-4 4M20 14l-4-4"/><path d="M4.5 19.5h5"/>', s); }
  };
  App.I = I;

  /* --------------------------------------------------------------- escape */
  function esc(s) {
    return String(s === undefined || s === null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  App.esc = esc;

  /* --------------------------------------------------- role money gating */
  /* FR-45 / §6.2: a Role that may not see money must not see the column at all */
  function moneyLevel() { return App.ROLES[App.role].money; }
  function seesProfit() { return moneyLevel() === 'full'; }
  function seesPrice() { return moneyLevel() === 'full' || moneyLevel() === 'price'; }
  function seesCost() { return moneyLevel() === 'full' || moneyLevel() === 'cost'; }
  function canCreateOrders() { return ['owner', 'manager', 'sales'].indexOf(App.role) >= 0; }

  /* One predicate, so every surface that offers a destination agrees with the router
     that refuses it. Two levels because the matrix has two: `money` needs profit,
     `price` needs selling price and `cost` needs Purchase Cost. These capabilities are
     deliberately independent for Sales Staff and Inventory Staff.

     `roles` is the third form, and it exists because PRD §6.2 is a capability matrix
     rather than a money ladder. The audit trail is Owner and Accountant; the Manager is
     excluded from it while seeing every figure in the product, so no money level can
     express that row. A screen naming its Roles outright is the only honest encoding. */
  function canReach(route) {
    var s = App.screens[String(route).split('/')[0]];
    if (!s) return true;
    if (s.roles && s.roles.indexOf(App.role) < 0) return false;
    if (s.money && !seesProfit()) return false;
    if (s.price && !seesPrice()) return false;
    if (s.cost && !seesCost()) return false;
    return true;
  }
  App.moneyLevel = moneyLevel;
  App.seesProfit = seesProfit;
  App.seesPrice = seesPrice;
  App.seesCost = seesCost;
  App.canCreateOrders = canCreateOrders;
  App.canReach = canReach;

  /* ---------------------------------------------------- status vocabulary */
  var STATUS = {
    new:       { bn: 'নতুন',           en: 'New',        tone: 'teal' },
    confirmed: { bn: 'নিশ্চিত',        en: 'Confirmed',  tone: 'brass' },
    packed:    { bn: 'প্যাক হয়েছে',    en: 'Packed',     tone: 'brass' },
    shipped:   { bn: 'পাঠানো হয়েছে',   en: 'Shipped',    tone: 'amber' },
    delivered: { bn: 'ডেলিভারি হয়েছে', en: 'Delivered',  tone: 'green' },
    settled:   { bn: 'টাকা বুঝে পেয়েছি', en: 'Settled',   tone: 'green' },
    cancelled: { bn: 'বাতিল',          en: 'Cancelled',  tone: '' },
    returned:  { bn: 'ফেরত এসেছে',      en: 'Returned',   tone: 'red' },
    partial:   { bn: 'আংশিক ফেরত',      en: 'Part return',tone: 'red' }
  };
  App.STATUS = STATUS;

  function statusChip(status, small) {
    var s = STATUS[status];
    return '<span class="chip ' + s.tone + (small ? ' sm' : '') + '"><i class="dot"></i>' + L(s.bn, s.en) + '</span>';
  }

  /* ------------------------------------------------------- money elements */
  /* Every figure states its Recognition Basis. This is the product's thesis
     compressed into one component — remove it and the numbers become opinions. */
  function basisPill(basis) {
    return '<span class="basis ' + basis + '">' +
      (basis === 'realized' ? L('হাতে পাওয়া', 'realized') : L('অর্জিত', 'earned')) + '</span>';
  }

  function completeness(have, of, opts) {
    opts = opts || {};
    var full = have >= of;
    var pct = of ? Math.round((have / of) * 100) : 100;
    return '<button class="completeness' + (full ? ' full' : '') + '" data-act="' + (opts.act || 'completeness-why') + '"' +
      (opts.arg ? ' data-arg="' + esc(opts.arg) + '"' : '') + '>' +
      '<span class="bar"><i style="width:' + pct + '%"></i></span>' +
      L(n(have) + ' / ' + n(of) + ' আইটেম ধরে হিসাব', 'based on ' + n(have) + ' of ' + n(of) + ' items') +
      (full ? '' : ' ' + I.info(12)) +
      '</button>';
  }

  function moneyEl(value, cls) {
    var neg = Number(value) < 0;
    return '<span class="money ' + (cls || '') + (neg ? ' neg' : '') + '">' + tk(value) + '</span>';
  }

  /* ------------------------------------------------------------ nav model */
  App.NAV = [
    { group: 'কাজ', groupEn: 'Work', items: [
      { route: 'home',      icon: 'home',   bn: 'ড্যাশবোর্ড', en: 'Dashboard' },
      { route: 'orders',    icon: 'orders', bn: 'অর্ডার',     en: 'Orders',  count: function () { return App.orders.length; } },
      { route: 'capture',   icon: 'plus',   bn: 'নতুন অর্ডার', en: 'New order' },
      { route: 'customers', icon: 'people', bn: 'ক্রেতা',      en: 'Customers' }
    ]},
    { group: 'পণ্য', groupEn: 'Catalogue', items: [
      { route: 'products',  icon: 'tag',  bn: 'পণ্য',    en: 'Products' },
      { route: 'inventory', icon: 'box',  bn: 'স্টক',    en: 'Inventory', warn: function () { return App.summary().lowStock; } }
    ]},
    { group: 'টাকা', groupEn: 'Money', items: [
      { route: 'cod',        icon: 'truck',   bn: 'কুরিয়ার ও COD', en: 'Courier & COD', warn: function () { return App.summary().unsettled; } },
      { route: 'settlement', icon: 'money',   bn: 'নিষ্পত্তি',      en: 'Settlement' },
      { route: 'expenses',   icon: 'receipt', bn: 'খরচ',            en: 'Expenses' },
      { route: 'dues',       icon: 'money',   bn: 'বাকি',           en: 'Dues', count: function () { return App.dues.length; } },
      { route: 'suppliers',  icon: 'truck',   bn: 'সরবরাহকারী',     en: 'Suppliers' }
    ]},
    { group: 'বুদ্ধি', groupEn: 'Insight', items: [
      { route: 'insights', icon: 'spark', bn: 'জিজ্ঞাসা করুন', en: 'Ask SmartBiz' },
      { route: 'reports',  icon: 'chart', bn: 'রিপোর্ট',        en: 'Reports' }
    ]},
    { group: 'ব্যবস্থা', groupEn: 'System', items: [
      { route: 'audit',    icon: 'shield', bn: 'অডিট ট্রেইল', en: 'Audit trail' },
      { route: 'settings', icon: 'gear',   bn: 'সেটিংস',      en: 'Settings' },
      { route: 'flows',    icon: 'flow',   bn: 'প্রসেস ফ্লো',  en: 'Process flows' }
    ]}
  ];

  /* The item carries no gate of its own. It used to hold a `money` flag alongside the
     screen's, and the two then disagreed the moment a screen's rule changed — the audit
     trail stayed listed for a Manager the router already refused. The destination decides. */
  function navVisible(item) {
    return canReach(item.route);
  }
  App.navVisible = navVisible;

  /* --------------------------------------------------------- app chrome */
  function statusbar() {
    return '<div class="statusbar"><span>' + L('৯:৪১', '9:41') + '</span>' +
      '<span class="sb-right">' +
      '<svg width="16" height="11" viewBox="0 0 16 11" fill="currentColor"><rect x="0" y="7" width="3" height="4" rx="1"/><rect x="4.3" y="5" width="3" height="6" rx="1"/><rect x="8.6" y="2.5" width="3" height="8.5" rx="1"/><rect x="12.9" y="0" width="3" height="11" rx="1" opacity=".35"/></svg>' +
      '<svg width="24" height="11" viewBox="0 0 24 11" fill="none" stroke="currentColor"><rect x=".5" y=".5" width="20" height="10" rx="3"/><rect x="2" y="2" width="14" height="7" rx="2" fill="currentColor" stroke="none"/><path d="M22 4v3" stroke-width="2" stroke-linecap="round"/></svg>' +
      '</span></div>';
  }

  function sidebar(active) {
    var s = App.summary();
    var groups = App.NAV.map(function (g) {
      var items = g.items.filter(navVisible);
      if (!items.length) return '';
      return '<div class="sb-group"><h4>' + L(g.group, g.groupEn) + '</h4>' +
        items.map(function (it) {
          var badge = '';
          if (it.warn && it.warn()) badge = '<span class="count warn">' + n(it.warn()) + '</span>';
          else if (it.count && it.count()) badge = '<span class="count">' + n(it.count()) + '</span>';
          return '<button class="sb-item' + (it.route === active ? ' active' : '') + '" data-go="' + it.route + '">' +
            I[it.icon](17) + '<span>' + L(it.bn, it.en) + '</span>' + badge + '</button>';
        }).join('') + '</div>';
    }).join('');

    var r = App.ROLES[App.role];
    return '<aside class="sidebar">' +
      '<div class="sb-brand"><span class="glyph">স</span><span class="biz">' +
        '<b>' + esc(L(App.business.name, App.business.nameEn)) + '</b>' +
        '<span>' + L('অর্ডার ও টাকার হিসাব', 'Orders & money') + '</span></span></div>' +
      '<div class="sb-scroll">' + groups + '</div>' +
      '<div class="sb-foot"><div class="sb-role"><span class="av">' + App.initials(r) + '</span>' +
        '<span class="who"><b>' + esc(L(r.name, r.nameEn)) + '</b><span>' + L(r.label, r.labelEn) + '</span></span>' +
        '<button class="iconbtn" data-go="settings/members" title="' + L('সদস্য', 'Members') + '">' + I.gear(15) + '</button>' +
      '</div></div></aside>';
  }

  function tabbar(active) {
    var tabs = [
      { route: 'home',   icon: 'home',   bn: 'হোম',   en: 'Home' },
      { route: 'orders', icon: 'orders', bn: 'অর্ডার', en: 'Orders' },
      /* Order capture belongs to Owner, Manager, and Sales Staff. */
      { route: 'capture', fab: true, hide: !App.canCreateOrders() },
      { route: 'inventory', icon: 'box', bn: 'স্টক', en: 'Stock' },
      { route: App.seesProfit() ? 'cod' : (App.role === 'sales' ? 'customers' : 'products'),
        icon: App.seesProfit() ? 'truck' : (App.role === 'sales' ? 'people' : 'tag'),
        bn: App.seesProfit() ? 'COD' : (App.role === 'sales' ? 'ক্রেতা' : 'পণ্য'),
        en: App.seesProfit() ? 'COD' : (App.role === 'sales' ? 'People' : 'Products') }
    ];
    return '<nav class="tabbar">' + tabs.filter(function (t) { return !t.hide; }).map(function (t) {
      if (t.fab) return '<button class="tab" data-go="capture" aria-label="' + L('নতুন অর্ডার', 'New order') + '">' +
        '<span class="tab-fab">' + I.plus(24) + '</span></button>';
      return '<button class="tab' + (t.route === active ? ' active' : '') + '" data-go="' + t.route + '">' +
        I[t.icon](21) + '<span>' + L(t.bn, t.en) + '</span></button>';
    }).join('') + '</nav>';
  }

  /* topbar: back arrow appears when the screen is not a root tab */
  var ROOTS = { home: 1, orders: 1, inventory: 1, cod: 1, customers: 1 };
  function topbar(opts) {
    var back = (!ROOTS[opts.route] || App.device === 'desktop' && false)
      ? '<button class="back" data-act="back" aria-label="' + L('পেছনে', 'Back') + '">' + I.back(19) + '</button>' : '';
    if (opts.noBack) back = '';
    return '<header class="topbar">' + back +
      '<div class="titles">' + (opts.eyebrow ? '<div class="eyebrow">' + opts.eyebrow + '</div>' : '') +
      '<h1>' + opts.title + '</h1></div>' +
      '<div class="acts">' + (opts.acts || '') + '</div></header>';
  }

  /* ------------------------------------------------------------- shell */
  function shell(opts) {
    /* onboarding screens carry no app chrome — there is no app to navigate yet */
    if (opts.chromeless) return '<div class="fullscreen">' + opts.body + '</div>';

    var main = '<div class="main">' + topbar(opts) +
      '<div class="scroll"><div class="page' + (App.device === 'phone' ? ' has-tabs' : '') + '">' +
      opts.body + '</div></div>' + '</div>';

    if (App.device === 'desktop') return sidebar(opts.nav || opts.route) + main;
    return statusbar() + main + tabbar(opts.nav || opts.route);
  }

  /* ------------------------------------------------------- sheet + toast */
  App.sheetStack = [];

  function openSheet(cfg) {
    var app = document.getElementById('app');
    var wrap = document.createElement('div');
    wrap.className = 'scrim';
    wrap.setAttribute('data-scrim', '1');
    wrap.innerHTML = '<div class="sheet' + (cfg.wide ? ' wide' : '') + '" role="dialog" aria-modal="true">' +
      '<div class="grabber"></div>' +
      '<div class="sheet-head"><div class="titles"><h3>' + cfg.title + '</h3>' +
        (cfg.sub ? '<p>' + cfg.sub + '</p>' : '') + '</div>' +
        '<button class="iconbtn" data-act="close-sheet" aria-label="' + L('বন্ধ', 'Close') + '">' + I.x(18) + '</button></div>' +
      '<div class="sheet-body">' + cfg.body + '</div>' +
      (cfg.foot ? '<div class="sheet-foot">' + cfg.foot + '</div>' : '') + '</div>';
    wrap.addEventListener('click', function (e) { if (e.target === wrap) closeSheet(); });
    app.appendChild(wrap);
    App.sheetStack.push(wrap);
  }

  function closeSheet() {
    var w = App.sheetStack.pop();
    if (w && w.parentNode) w.parentNode.removeChild(w);
  }

  function toast(msg, kind, undoLabel) {
    var host = document.getElementById('toasts');
    if (!host) {
      host = document.createElement('div');
      host.id = 'toasts';
      document.getElementById('app').appendChild(host);
    }
    var el = document.createElement('div');
    el.className = 'toast' + (kind ? ' ' + kind : '');
    var ic = kind === 'err' ? I.warn(17) : (kind === 'warn' ? I.warn(17) : I.check(17));
    el.innerHTML = '<span class="ic">' + ic + '</span><span>' + msg + '</span>' +
      (undoLabel ? '<button class="undo" data-act="undo-toast">' + undoLabel + '</button>' : '');
    host.appendChild(el);
    setTimeout(function () {
      el.classList.add('out');
      setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 220);
    }, undoLabel ? 4200 : 2600);
  }

  /* ------------------------------------------------------------ fragments */
  function provenance(text, tone, icon) {
    return '<div class="provenance ' + (tone || '') + '">' + (icon || I.info(15)) + '<span>' + text + '</span></div>';
  }

  function emptyState(cfg) {
    return '<div class="empty"><div class="ico">' + (cfg.icon || I.box(24)) + '</div>' +
      '<h3>' + cfg.title + '</h3><p>' + cfg.body + '</p>' +
      (cfg.action || '') + '</div>';
  }

  /* One definition, because a second one drifts: the money gate fires both from
     the router (a screen flagged `money`) and from inside a Role-adaptive screen
     that cannot carry the flag, and both must refuse identically. */
  function roleLock() {
    var r = App.ROLES[App.role];
    return emptyState({
      icon: I.lock(24),
      title: L('এই তথ্য আপনার জন্য নয়', 'This information is not for your Role'),
      body: L('আপনার ভূমিকা "' + r.label + '" — টাকার হিসাব দেখার অনুমতি নেই। মালিক চাইলে অনুমতি বদলাতে পারেন।',
              'Your Role is ' + r.labelEn + ', which cannot see money figures. The Owner can change this.'),
      action: '<button class="btn ghost" data-go="orders">' + L('অর্ডারে ফিরুন', 'Back to orders') + '</button>'
    });
  }

  function field(cfg) {
    var state = cfg.state ? ' ' + cfg.state : '';
    var flag = cfg.flag ? ' data-flag="' + esc(cfg.flag) + '"' : '';
    var input;
    if (cfg.type === 'textarea') {
      input = '<textarea class="input" rows="' + (cfg.rows || 4) + '" placeholder="' + esc(cfg.placeholder || '') + '"' +
        (cfg.id ? ' id="' + cfg.id + '"' : '') + '>' + esc(cfg.value || '') + '</textarea>';
    } else if (cfg.type === 'select') {
      input = '<select class="select"' + (cfg.id ? ' id="' + cfg.id + '"' : '') + '>' +
        cfg.options.map(function (o) {
          return '<option' + (o.selected ? ' selected' : '') + ' value="' + esc(o.value || o.label) + '">' + esc(o.label) + '</option>';
        }).join('') + '</select>';
    } else {
      input = '<input class="input' + (cfg.money ? ' money-input' : '') + '" type="' + (cfg.type || 'text') + '"' +
        ' value="' + esc(cfg.value === undefined ? '' : cfg.value) + '" placeholder="' + esc(cfg.placeholder || '') + '"' +
        (cfg.id ? ' id="' + cfg.id + '"' : '') + (cfg.autocomplete ? ' autocomplete="' + esc(cfg.autocomplete) + '"' : '') +
        (cfg.required ? ' required' : '') + (cfg.readonly ? ' readonly' : '') + '>';
      if (cfg.addon) input = '<div class="input-group">' + input + '<span class="addon">' + cfg.addon + '</span></div>';
      if (cfg.prefix) input = '<div class="input-group"><span class="addon pre">' + cfg.prefix + '</span>' + input + '</div>';
    }
    return '<div class="field' + state + '"' + flag + '>' +
      (cfg.label ? '<label' + flag + '>' + cfg.label + (cfg.required ? ' <span class="req">*</span>' : '') + '</label>' : '') +
      input + (cfg.hint ? '<span class="hint">' + cfg.hint + '</span>' : '') + '</div>';
  }

  function toggleRow(cfg) {
    return '<div class="toggle-row"><div class="tr-body"><b>' + cfg.title + '</b>' +
      (cfg.sub ? '<span>' + cfg.sub + '</span>' : '') + '</div>' +
      '<button class="switch" role="switch" aria-checked="' + (cfg.on ? 'true' : 'false') + '"' +
      (cfg.act ? ' data-act="' + cfg.act + '"' : ' data-act="toggle"') + '></button></div>';
  }

  function riskChip(c, small) {
    var r = App.risk(c);
    var map = {
      low:     { tone: 'green', bn: 'কম ঝুঁকি',     en: 'Low risk' },
      medium:  { tone: 'amber', bn: 'মাঝারি ঝুঁকি', en: 'Medium risk' },
      high:    { tone: 'red',   bn: 'বেশি ঝুঁকি',   en: 'High risk' },
      unknown: { tone: 'outline', bn: 'তথ্য কম',    en: 'Too few orders' }
    }[r.band];
    var label = L(map.bn, map.en);
    if (r.band !== 'unknown') label += ' · ' + n(r.pct) + '%';
    return '<span class="chip ' + map.tone + (small ? ' sm' : '') + '">' + label + '</span>';
  }

  function barRow(label, value, max, tone) {
    var pct = max ? Math.min(100, (value / max) * 100) : 0;
    return '<div class="bar-row"><span class="lbl">' + label + '</span>' +
      '<span class="track"><i class="' + (tone || '') + '" style="width:' + pct + '%"></i></span>' +
      '<span class="val">' + tk(value) + '</span></div>';
  }

  App.ui = {
    shell: shell, topbar: topbar, sidebar: sidebar, tabbar: tabbar,
    statusChip: statusChip, basisPill: basisPill, completeness: completeness, moneyEl: moneyEl,
    openSheet: openSheet, closeSheet: closeSheet, toast: toast,
    provenance: provenance, emptyState: emptyState, roleLock: roleLock, field: field, toggleRow: toggleRow,
    riskChip: riskChip, barRow: barRow
  };
})(window.App);
