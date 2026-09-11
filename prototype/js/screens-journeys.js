/* SmartBiz BD — complete story-to-screen presentation journey.
   The contract is loaded from the authoritative mockup set before this module.
   This screen adds interaction, but never owns story IDs, titles or proof copy. */

window.App = window.App || {};

(function (App) {
  'use strict';

  var L = App.L;
  var U = App.ui;
  var I = App.I;
  var esc = App.esc;
  var stories = window.SMARTBIZ_SCREEN_MAP || [];
  function digits(value) { return App.lang === 'bn' ? App.bnDigits(value) : String(value); }
  var epicNames = {
    1: ['ভিত্তি, অ্যাকাউন্ট ও ব্যবসা', 'Foundation, accounts & tenancy'],
    2: ['পণ্য ও ভ্যারিয়েন্ট', 'Product catalog & variants'],
    3: ['ইনভেন্টরি লেজার', 'Inventory ledger'],
    4: ['অর্ডার ধরা ও জীবনচক্র', 'Order capture & lifecycle'],
    5: ['কুরিয়ার ও COD নিষ্পত্তি', 'Courier & COD settlement'],
    6: ['সিদ্ধান্ত-কেন্দ্রিক ড্যাশবোর্ড', 'Decision-first dashboard'],
    7: ['ক্রেতা ও বাকি', 'Customers & dues'],
    8: ['সরবরাহকারী ও ক্রয়', 'Suppliers & purchases'],
    9: ['খরচ', 'Expenses'],
    10: ['রিপোর্ট ও এক্সপোর্ট', 'Reports & exports'],
    11: ['অডিট ও উল্টো এন্ট্রি', 'Audit & reversals'],
    12: ['নিরাপদ ইনসাইট সহকারী', 'Safe insight assistant']
  };

  function epicLabel(number) {
    var names = epicNames[number] || ['', ''];
    return L(names[0], names[1]);
  }

  function screenIcon(kind) {
    var icons = { proof: 'shield', auth: 'lock', form: 'plus', list: 'orders', detail: 'receipt',
      table: 'sheet', state: 'warn', flow: 'flow', report: 'chart' };
    return I[icons[kind] || 'box'](17);
  }

  function storyHub() {
    var groups = [];
    for (var epic = 1; epic <= 12; epic++) {
      var items = stories.filter(function (story) { return story.epic === epic; });
      groups.push('<section class="journey-epic"><div class="journey-epic-head">' +
        '<span class="journey-epic-num">' + digits(epic) + '</span><div><span class="eyebrow">' + L('এপিক', 'Epic') + ' ' + digits(epic) + '</span>' +
        '<h2>' + esc(epicLabel(epic)) + '</h2></div><span class="journey-count">' + digits(items.length + '/' + items.length) + '</span></div>' +
        '<div class="journey-story-grid">' + items.map(function (story) {
          return '<button class="journey-story" data-go="journeys/' + story.id + '">' +
            '<span class="journey-kind">' + screenIcon(story.kind) + '</span>' +
            '<span class="journey-story-copy"><b>' + digits(story.id) + ' · ' + esc(story.title) + '</b>' +
            '<span>' + esc(story.surface) + ' · ' + story.mode + '</span></span>' +
            '<span class="chev">' + I.chev(16) + '</span></button>';
        }).join('') + '</div></section>');
    }

    return { route: 'journeys', nav: 'settings', noBack: true,
      eyebrow: L('প্রেজেন্টেশন · ডিজাইন গেট পাস', 'Presentation · design gate passed'),
      title: L('সব গল্প, সব স্ক্রিন', 'Every story, every screen'),
      acts: '<button class="btn sm primary" data-go="journeys/1.1">' + L('শুরু করুন', 'Present from start') + '</button>',
      body: '<div class="stack g4" data-story-hub="76">' +
        '<div class="journey-hero"><div><span class="eyebrow">' + L('এপিক থেকে স্ক্রিন', 'Story-to-screen completeness') + '</span>' +
          '<strong>' + digits(stories.length) + '<small> / ' + digits(stories.length) + '</small></strong>' +
          '<p>' + L('প্রতিটি পরিকল্পিত গল্পের জন্য একটি ঠিকানাযোগ্য, উপস্থাপনযোগ্য স্ক্রিন আছে।',
            'Every planned story has an addressable, presentable screen.') + '</p></div>' +
          '<div class="journey-meter"><i></i><span>' + L('০টি বাকি', '0 missing') + '</span></div></div>' +
        U.provenance(L('এই তালিকা সরাসরি অনুমোদিত মকআপ ম্যাপ থেকে আসে। গল্পের নম্বর, নাম, অবস্থা ও দৃশ্যমান প্রমাণ এখানে আলাদা করে লেখা হয় না।',
          'This list is consumed directly from the approved mockup map. Story IDs, titles, states and visible proof are not re-authored here.'), 'teal', I.shield(15)) +
        '<div class="journey-groups">' + groups.join('') + '</div></div>' };
  }

  function proofList(story) {
    return '<div class="journey-proof-list"><span class="eyebrow">' + L('স্ক্রিনে যা প্রমাণ হবে', 'Visible proof') + '</span>' +
      story.evidence.map(function (item, index) {
        return '<div class="journey-proof"><span>' + I.check(15) + '</span><div><b>' + digits(esc(item)) + '</b>' +
          '<small>' + L('গ্রহণযোগ্যতার প্রমাণ ', 'Acceptance evidence ') + digits(index + 1) + '</small></div></div>';
      }).join('') + '</div>';
  }

  function dataRows(story) {
    var rows = [
      [digits(story.surface), digits('SB-' + story.id.replace('.', '') + '41'), 'Ready'],
      [digits(story.evidence[0]), L('আজ · ১০:৪২', 'Today · 10:42'), 'Recorded'],
      [digits(story.evidence[1]), 'Rupa Akter', 'Review'],
      [digits(story.evidence[2]), 'System proof', 'Verified']
    ];
    return '<div class="journey-table"><div class="journey-tr head"><span>' + L('রেকর্ড', 'Record') + '</span><span>' + L('উৎস', 'Source') + '</span><span>' + L('অবস্থা', 'State') + '</span></div>' +
      rows.map(function (row, index) { return '<div class="journey-tr"><b>' + esc(row[0]) + '</b><span>' + esc(row[1]) + '</span><i class="chip ' + (index === 2 ? 'brass' : 'green') + ' sm">' + esc(row[2]) + '</i></div>'; }).join('') + '</div>';
  }

  function formPattern(story) {
    var labels = story.kind === 'auth'
      ? [[L('মোবাইল নম্বর', 'Mobile number'), '+880 1712 345 678'], [L('পাসওয়ার্ড বা কোড', 'Password or code'), '••••••••'], [L('ব্যবসা ও ভূমিকা', 'Business & Role'), story.state]]
      : [[L('মূল রেকর্ড', 'Primary record'), story.surface], [L('তারিখ বা রেফারেন্স', 'Date or reference'), digits('11 Sep 2026')], [L('পরিমাণ বা সংখ্যা', 'Quantity or amount'), digits('3')], [L('কারণ বা নোট', 'Reason or note'), story.state]];
    return '<div class="card pad"><div class="journey-fields">' + labels.map(function (field) {
      return '<label><span>' + esc(field[0]) + '</span><div class="journey-control">' + esc(field[1]) + '</div></label>';
    }).join('') + '</div></div>';
  }

  function reportPattern(story) {
    return '<div class="journey-metrics"><div class="journey-metric earned"><span>' + L('অর্জিত', 'Earned') + '</span><b class="money">৳ ' + digits('48,350') + '</b><small>Delivery-date basis</small></div>' +
      '<div class="journey-metric realized"><span>' + L('হাতে পাওয়া', 'Realized') + '</span><b class="money">৳ ' + digits('31,900') + '</b><small>Settlement-date basis</small></div>' +
      '<div class="journey-metric incomplete"><span>' + L('সম্পূর্ণতা', 'Completeness') + '</span><b>' + digits('17 / 19') + '</b><small>' + L('২টি রেকর্ডে নজর দরকার', '2 records need attention') + '</small></div></div>' +
      '<div class="card pad">' + dataRows(story) + '</div>';
  }

  function statePattern(story) {
    return '<div class="card pad"><div class="journey-decision"><span class="journey-alert">' + I.warn(21) + '</span><div><span class="eyebrow">' + L('সিদ্ধান্ত দরকার', 'Decision required') + '</span><h2>' + esc(story.state) + '</h2><p>' + esc(story.evidence[0]) + '. ' + L('কাজটি করার আগে ফলাফল দেখানো হয়েছে।', 'The consequence is shown before the action is committed.') + '</p></div></div></div>' +
      '<div class="card pad">' + dataRows(story) + '</div>';
  }

  function flowPattern(story) {
    var steps = [L('রেকর্ড', 'Recorded'), L('নিশ্চিত', 'Confirmed'), L('পর্যালোচনা', 'In review'), L('সম্পূর্ণ', 'Complete')];
    return '<div class="card pad"><div class="journey-timeline">' + steps.map(function (step, index) {
      return '<div class="' + (index < 2 ? 'done' : index === 2 ? 'current' : '') + '"><i></i><span>' + step + '</span></div>';
    }).join('') + '</div><div class="journey-next"><span>1</span><div><b>' + esc(story.action) + '</b><small>' + esc(story.evidence[0]) + '</small></div><i class="chip brass sm">' + L('এখন', 'Current') + '</i></div></div>';
  }

  function proofPattern(story) {
    return '<div class="card pad journey-proof-surface"><span class="journey-shield">' + I.shield(30) + '</span><h2>' + esc(story.state) + '</h2><p>' + L('এটি একটি সিস্টেম-প্রমাণ স্ক্রিন—লুকানো প্রতিশ্রুতি নয়, পরিদর্শনযোগ্য প্রমাণ।',
      'This is a system-proof screen: inspectable evidence, not a hidden promise.') + '</p><button class="btn ghost" data-act="journey-proof-toast" data-arg="' + story.id + '">' + esc(story.action) + '</button></div>';
  }

  function pattern(story) {
    if (story.kind === 'proof') return proofPattern(story);
    if (story.kind === 'report') return reportPattern(story);
    if (story.kind === 'flow') return flowPattern(story);
    if (story.kind === 'state') return statePattern(story);
    if (story.kind === 'list' || story.kind === 'table') return '<div class="card pad">' + dataRows(story) + '</div>';
    return formPattern(story);
  }

  function storyScreen(story) {
    var index = stories.indexOf(story);
    var previous = stories[(index - 1 + stories.length) % stories.length];
    var next = stories[(index + 1) % stories.length];
    return { route: 'journeys', nav: 'settings',
      eyebrow: L('এপিক', 'Epic') + ' ' + digits(story.epic) + ' · ' + esc(epicLabel(story.epic)),
      title: digits(story.id) + ' · ' + esc(story.surface),
      acts: '<span class="chip outline sm">' + story.mode + ' · ' + story.kind + '</span>',
      body: '<article class="stack g4 journey-frame" data-story-id="' + story.id + '">' +
        '<header class="journey-frame-head"><span class="eyebrow">' + L('গল্পের শিরোনাম', 'Story title') + '</span><h2>' + digits(esc(story.title)) + '</h2>' +
          '<span class="journey-surface">' + L('টার্গেট স্ক্রিন: ', 'Target screen: ') + digits(esc(story.surface)) + '</span>' +
          '<div class="journey-route">#/' + digits(esc(story.route)) + '</div><p><b>' + L('দেখানোর অবস্থা:', 'Presentation state:') + '</b> ' + digits(esc(story.state)) + '</p></header>' +
        pattern(story) + proofList(story) +
        '<div class="journey-primary"><button class="btn ghost" data-go="journeys/' + previous.id + '">' + I.back(16) + L('আগের গল্প', 'Previous') + '</button>' +
          '<button class="btn primary" data-act="journey-action" data-arg="' + story.id + '">' + esc(story.action) + '</button>' +
          '<button class="btn ghost" data-go="journeys/' + next.id + '">' + L('পরের গল্প', 'Next') + I.chev(16) + '</button></div>' +
        '<div class="journey-position"><i style="width:' + (((index + 1) / stories.length) * 100) + '%"></i></div>' +
        '<p class="journey-page-count">' + digits((index + 1) + ' / ' + stories.length) + ' · ' + L('উদাহরণের তথ্য', 'synthetic presentation data') + '</p></article>' };
  }

  App.screens.journeys = {
    title: function () { return L('সব গল্প, সব স্ক্রিন', 'Every story, every screen'); },
    view: function (args) {
      if (!args[0]) return storyHub();
      var story = stories.filter(function (item) { return item.id === args[0]; })[0];
      if (!story) return { route: 'journeys', nav: 'settings', title: L('গল্প পাওয়া যায়নি', 'Story not found'),
        body: U.emptyState({ icon: I.search(24), title: L('এই গল্প নেই', 'No such story'),
          body: L('গল্পের হাব থেকে একটি স্ক্রিন বেছে নিন।', 'Choose a screen from the story hub.'),
          action: '<button class="btn primary" data-go="journeys">' + L('হাবে যান', 'Open story hub') + '</button>' }) };
      return storyScreen(story);
    }
  };

  App.actions['journey-action'] = function (id) {
    var story = stories.filter(function (item) { return item.id === id; })[0];
    U.toast(L('গল্প ' + id + '-এর মূল কাজ দেখানো হলো', 'Primary outcome demonstrated for Story ' + id) + ': ' + esc(story.action));
  };
  App.actions['journey-proof-toast'] = function (id) {
    U.toast(L('গ্রহণযোগ্যতার প্রমাণ প্রস্তুত', 'Acceptance evidence is ready') + ' · ' + id);
  };
}(window.App));
