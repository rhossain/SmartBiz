(function () {
  'use strict';

  const stories = window.SMARTBIZ_SCREEN_MAP || [];
  const coverage = window.SMARTBIZ_COVERAGE || { passed: false, planned: 76, designed: stories.length, failures: ['Coverage manifest missing'] };
  const root = document.getElementById('mockup-app');
  const epicNames = {
    1: 'ভিত্তি, অ্যাকাউন্ট ও ব্যবসা', 2: 'পণ্য ও ভ্যারিয়েন্ট', 3: 'স্টক লেজার', 4: 'অর্ডার নেওয়া ও অবস্থা',
    5: 'কুরিয়ার ও COD', 6: 'সিদ্ধান্তের ড্যাশবোর্ড', 7: 'ক্রেতা ও বাকি', 8: 'সরবরাহকারী ও কেনাকাটা',
    9: 'খরচ', 10: 'রিপোর্ট ও নথি', 11: 'অডিট ও বিপরীত এন্ট্রি', 12: 'নিরাপদ সহকারী'
  };
  const esc = value => String(value).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  const proofAttrs = id => `id="${esc(id)}" data-proof-id="${esc(id)}"`;
  const reports = ['Sales','Order','Product Sales','Inventory','Expense','Profit Summary','Customer Due','Supplier Due','COD Settlement'];
  const queries = ["Today's sales",'Best-selling Products','Products below minimum stock','Customers with highest return rates','Largest Expense categories','Profit change decomposition','Money With Couriers and age','Orders stuck at a Status','Largest Customer Due','Settlement variances'];
  const reversible = ['Stock-In','Adjustment','Order Status transition','Customer Payment','Supplier Payment','Settlement Match','Expense entry'];

  function chrome(content) {
    const passed = coverage.passed === true;
    const status = passed ? `${coverage.designed}/${coverage.planned} যাচাইকৃত` : `গেট বন্ধ · ${coverage.failures.length} সমস্যা`;
    return `<div class="catalog-shell"><header class="catalog-top"><span class="brand-mark">স</span><div class="brand-copy"><strong>SmartBiz BD</strong><span>স্টোরি-টু-স্ক্রিন ডিজাইন সোর্স</span></div><div class="catalog-progress ${passed ? 'gate-pass' : 'gate-fail'}"><span class="progress-track"><i class="progress-fill"></i></span><b>${esc(status)}</b></div><a class="top-button" href="#story/1.1">শুরু থেকে দেখুন</a></header>${content}</div>`;
  }

  function hub() {
    const grouped = stories.reduce((all, story) => ((all[story.epic] ||= []).push(story), all), {});
    const groups = Object.entries(grouped).map(([epic, items]) => `<section class="epic-group" data-epic="${epic}"><div class="epic-heading"><span class="epic-number">${epic}</span><h2>${esc(epicNames[epic])}</h2><span>${items.length} গল্প · ${items.length} ফ্রেম</span></div><div class="story-grid">${items.map(story => `<a class="story-link" href="${story.mockupHash}" data-search="${esc(`${story.id} ${story.title} ${story.surface} ${story.appRoute}`.toLowerCase())}"><span class="story-id">${story.id}</span><span class="story-copy"><strong>${esc(story.title)}</strong><small>${esc(story.surface)} · ${esc(story.appRoute)}</small></span><span class="mode-chip">${story.primaryMode}</span></a>`).join('')}</div></section>`).join('');
    const gate = coverage.passed
      ? `<div class="count"><strong>${coverage.designed}</strong><span>of ${coverage.planned} stories</span></div><p>ফাইল-হ্যাশসহ সর্বশেষ গেট পাস · ০ অনুপস্থিত</p>`
      : `<div class="count"><strong>!</strong><span>coverage unavailable</span></div><p>${esc(coverage.failures.join(' · '))}</p>`;
    root.innerHTML = chrome(`<div class="hub"><section class="hub-hero"><div><p class="eyebrow">প্রেজেন্টেশন হাব · ডিজাইন গেট</p><h1>প্রতিটি গল্পের প্রমাণ অ্যাপের ফ্রেমের ভেতরে।</h1><p class="hub-intro">একটি responsive web app: একই route ও codebase, phone এবং desktop—দুই যাচাইকৃত viewport।</p></div><aside class="coverage-card ${coverage.passed ? '' : 'failed'}">${gate}</aside></section><div class="hub-tools"><input id="story-search" class="search" type="search" aria-label="গল্প খুঁজুন" placeholder="গল্প, surface বা app route খুঁজুন…"><select id="epic-filter" class="filter" aria-label="Epic বাছুন"><option value="all">সব ১২ epic</option>${Object.keys(epicNames).map(n => `<option value="${n}">Epic ${n}</option>`).join('')}</select></div><div class="epic-stack">${groups}</div></div>`);
    document.getElementById('story-search').addEventListener('input', filterHub);
    document.getElementById('epic-filter').addEventListener('change', filterHub);
  }

  function filterHub() {
    const query = document.getElementById('story-search').value.toLowerCase().trim();
    const epic = document.getElementById('epic-filter').value;
    document.querySelectorAll('.epic-group').forEach(group => {
      let visible = 0;
      group.querySelectorAll('.story-link').forEach(link => {
        const show = (!query || link.dataset.search.includes(query)) && (epic === 'all' || group.dataset.epic === epic);
        link.classList.toggle('is-hidden', !show); if (show) visible += 1;
      });
      group.classList.toggle('is-hidden', visible === 0);
    });
  }

  function proofGrid(story) {
    return `<section class="proof-grid" aria-label="স্টোরির দৃশ্যমান প্রমাণ"><h3>এই ফ্রেমে যাচাই করুন</h3><div>${story.proofs.map((proof, index) => `<article class="proof-item" ${proofAttrs(proof.id)}><span>${index + 1}</span><p>${esc(proof.label)}</p></article>`).join('')}</div></section>`;
  }
  function field(label, value, note = '') { return `<div class="field"><label>${esc(label)}</label><div class="control">${esc(value)}</div>${note ? `<small>${esc(note)}</small>` : ''}</div>`; }
  function notice(title, copy, tone = 'teal') { return `<div class="notice ${tone}"><strong>${esc(title)}</strong><p>${esc(copy)}</p></div>`; }
  function chips(items, active = 0) { return `<div class="chips">${items.map((item, index) => `<button type="button" class="chip ${index === active ? 'active' : ''}" aria-pressed="${index === active}">${esc(item)}</button>`).join('')}</div>`; }
  function ledgerRows(items) { return `<div class="ledger-rows">${items.map(item => `<div class="ledger-row"><span class="row-mark">${esc(item[0])}</span><span><strong>${esc(item[1])}</strong><small>${esc(item[2] || '')}</small></span><span class="row-end">${esc(item[3] || 'দেখুন ›')}</span></div>`).join('')}</div>`; }
  function actionBn(story) {
    const label = story.actionModel.label.toLowerCase();
    if (story.id === '10.5') return 'সারাংশের টেক্সট কপি করুন';
    if (label.includes('cancel')) return 'বাতিল করে stock ফেরান';
    if (label.includes('write off')) return 'ক্ষতিগ্রস্ত stock বাদ দিন';
    if (label.includes('close')) return 'Batch বন্ধ করুন';
    if (label.includes('confirm')) return 'নিশ্চিত করুন';
    if (label.includes('record') || label.includes('write')) return 'রেকর্ড লিখুন';
    if (label.includes('create') || label.includes('join') || label.includes('add')) return 'তৈরি করে এগিয়ে যান';
    if (label.includes('save') || label.includes('accept') || label.includes('update')) return 'সংরক্ষণ করুন';
    if (label.includes('download') || label.includes('export')) return 'ফাইল ডাউনলোড করুন';
    if (label.includes('inspect') || label.includes('explain') || label.includes('compare')) return 'প্রমাণ খুলুন';
    if (label.includes('open') || label.includes('view') || label.includes('return')) return 'বিস্তারিত খুলুন';
    return story.actionModel.kind === 'commit' ? 'কাজটি সম্পন্ন করুন' : 'এগিয়ে যান';
  }

  function customContent(story, variant) {
    const v = variant.id.replace(`${story.id}-`, '');
    switch (story.id) {
      case '1.2':
        if (v === 'recovery-reveal' || v === 'replacement-code') return `${notice(v === 'recovery-reveal' ? 'রিকভারি কোড—শুধু একবার দেখা যাবে' : 'পুরোনো কোড বাতিল হয়েছে', 'SB-RC-7K9M-2Q4X নিরাপদ স্থানে লিখে রাখুন।', 'brass')}${field('নতুন একবারের কোড','SB-RC-7K9M-2Q4X')}`;
        if (v === 'login') return `${field('মোবাইল নম্বর','০১৭১১-২৩৪৫৬৭')}${field('পাসওয়ার্ড','••••••••')}`;
        if (v === 'reset') return `${field('একবারের রিকভারি কোড','SB-RC-OLD-CODE')}${field('নতুন পাসওয়ার্ড','••••••••')}${notice('কোডটি এই ব্যবহারের পর বাতিল হবে','রিসেটের পর নতুন কোড একবার দেখানো হবে।')}`;
        return `${field('মোবাইল নম্বর','০১৭১১-২৩৪৫৬৭')}${field('পাসওয়ার্ড','কমপক্ষে ৮ অক্ষর')}${field('পাসওয়ার্ড আবার','••••••••')}`;
      case '1.4':
        if (v === 'generate-code') return `${chips(['Owner','Manager','Accountant','Inventory Staff','Sales Staff'],4)}${notice('একবারের আমন্ত্রণ কোড','JOIN-SALES-8M4Q · দ্বিতীয় সদস্য ব্যবহার করতে পারবেন না।')}`;
        if (v === 'used-code') return notice('এই কোড আগেই ব্যবহার হয়েছে','Owner বা Manager-এর কাছে নতুন কোড চান।','brass');
        return `${field('আমন্ত্রণ কোড','JOIN-SALES-8M4Q')}${notice('রূপকথা শাড়ি ঘর','Role: Sales Staff · যোগ দেওয়ার আগে নিশ্চিত করুন।')}`;
      case '1.9':
        return `${notice('শুধু platform metadata','এখানে order, customer, taka amount বা business transaction নেই।')}${ledgerRows([['ব','রূপকথা শাড়ি ঘর','৫ সদস্য','৫ users'],['ব','নদী বুটিক','৩ সদস্য','৩ users']])}`;
      case '2.1':
        return `<div class="form-grid">${field('পণ্যের নাম','এমব্রয়ডারি কুর্তি')}${field('বিক্রয় মূল্য','৳ ১,২৫০.০০')}${field('Category (ঐচ্ছিক)','কুর্তি')}${field('SKU (ঐচ্ছিক)','KRT-EMB')}${field('Supplier (ঐচ্ছিক)','রহমান টেক্সটাইল')}${field('সর্বনিম্ন stock (ঐচ্ছিক)',v === 'minimum-stock-unset' ? 'সেট করা নেই' : '৫')}</div>${v === 'deactivated-history' ? notice('Delete নয়—deactivate','পুরোনো Order-এ এই Product দেখা যাবে।','brass') : ''}`;
      case '4.5':
        return `<div class="split-source"><article><h3>মূল বার্তা</h3><p>ফারজানা আপা, কালো কুর্তি ১টা, XL, উত্তরা। 01711-234567</p></article><div>${field('মোবাইল নম্বর','০১৭১১-২৩৪৫৬৭','বার্তা থেকে পাওয়া')}${field('পণ্য',v === 'ambiguous-product' ? '২টি মিল—একটি বাছুন' : 'এমব্রয়ডারি কুর্তি','অনুমান করা হয়নি')}${field('Size',v === 'unparseable' ? 'পাওয়া যায়নি' : 'XL','সম্পাদনাযোগ্য')}</div></div>${notice('মানুষই নিশ্চিত করবে','Parser কখনও নিজে Order submit করে না।')}`;
      case '4.8':
        return `${ledgerRows([['−','এমব্রয়ডারি কুর্তি · XL','Stock ৮ → ৭','৳ ৮২০ cost snapshot'],['−','সিল্ক দুপাট্টা','Stock ০ · shortfall','Cost নেই']])}${v === 'shortfall' ? notice('Stock কম','স্বীকার না করা পর্যন্ত confirmation হবে না।','brass') : v === 'already-confirmed' ? notice('আগেই Confirmed','দ্বিতীয়বার allocation লেখা হবে না।') : notice('এক transaction','Status, Sale Allocation ও cost snapshot একসাথে লেখা হবে।')}`;
      case '4.9':
        return `<div class="lifecycle"><span class="done">New</span><span class="done">Confirmed</span><span class="current">Packed</span><span>Shipped</span><span>Delivered</span></div>${v === 'illegal-transition' ? notice('Packed → Returned অনুমোদিত নয়','পরের অনুমোদিত অবস্থা: Shipped বা Cancelled।','brass') : notice('Role অনুযায়ী action','অসাধারণ transition না থাকলে action-ও দেখা যাবে না।')}`;
      case '4.10':
        return `${notice(v === 'ineligible' ? 'এই অবস্থায় Cancel করা যাবে না' : 'মূল allocation বদলাবে না', v === 'ineligible' ? 'Shipped Order-এর পথ Failed Delivery বা Delivered।' : 'সমান বিপরীত movement লিখে stock ফিরবে।', v === 'ineligible' ? 'brass' : 'teal')}${v !== 'ineligible' ? field('কারণ','Customer বাতিল করেছেন') : ''}`;
      case '4.11':
        return `${ledgerRows([['১','এমব্রয়ডারি কুর্তি','বিক্রি ৩ · এসেছে ২','১টি বাকি'],['±','ফেরত quantity','২ / ৩','−  ২  +']])}<div class="choice-pair"><button class="choice selected" aria-pressed="true"><strong>পুনরায় বিক্রিযোগ্য</strong><small>Stock-এ ২টি যোগ হবে</small></button><button class="choice" aria-pressed="false"><strong>ক্ষতিগ্রস্ত</strong><small>Stock নয়; cost loss হবে</small></button></div>${notice('Commercial return আলাদা','পণ্য হাতে পাওয়ার পরেই stock ফিরবে।')}`;
      case '4.14':
        return `${field('Order খুঁজুন','ID, phone বা Customer name')}${chips(['সব','New','Packed','Courier custody','Cash pending','Return due'])}${ledgerRows([['!','ORD-1042 · ফারজানা আক্তার','Return এখনো আসেনি','দেখুন ›'],['!','ORD-1041 · নাজমুন নাহার','Stock shortfall স্বীকার বাকি','দেখুন ›'],['৳','ORD-1039 · রুমানা ইসলাম','Delivered · settlement বাকি','দেখুন ›']])}`;
      case '5.2':
        if (v === 'inventory-handoff-pack-slip') return `${notice('Inventory Staff pack slip','Items, address ও COD amount দেখা যাবে; Purchase Cost ও margin অনুপস্থিত।')}<article class="pack-slip"><h3>পার্সেল স্লিপ <span>#1037</span></h3><p><strong>তাসমিন রহমান</strong><br>কাঠি ২, আগ্রাবাদ, চট্টগ্রাম</p><p>জামদানি শাড়ি × ১<br>হাতে তৈরি চুড়ি সেট × ২</p><strong class="cod-box">ডেলিভারিতে নিতে হবে · ৳ ৮৫,০৯০</strong></article>`;
        return `${field('Courier','Simulated Pathao')}${field('Tracking reference','PT-991204')}${notice('Simulated Courier','একই adapter surface; production courier-এর জন্য আলাদা code path নেই।')}`;
      case '5.8':
        return `<div class="variance"><span>Expected<strong>৳ ১,৯৮০</strong></span><span>Received<strong>৳ ১,৯০০</strong></span><span>Gap<strong>− ৳ ৮০</strong></span></div><div class="choice-stack">${['Manual match—cash realizes once','Courier fee—profit decreases ৳৮০','Customer short-pay—receivable decreases','Dispute—no money effect yet'].map((x,i)=>`<button class="choice ${i===1?'selected':''}" aria-pressed="${i===1}">${esc(x)}</button>`).join('')}</div>${v === 'confirm-effect' ? notice('Commit করার আগে','Earned ও Realized profit—দুটিই ৳৮০ কমবে।','brass') : ''}`;
      case '5.10':
        return `${ledgerRows([['✓','Matched rows','১২টি','৳ ২৪,৫৩০'],['✓','Dispositioned variances','২টি','৳ ১৬০'],[v === 'blocked' ? '!' : '✓','Open variance',v === 'blocked' ? 'STL-0831 এখনো বাকি' : '০টি',v === 'blocked' ? 'সমাধান করুন' : 'Ready']])}${notice(v === 'blocked' ? 'Close বন্ধ' : 'Close করা যাবে',v === 'blocked' ? 'একটি undispositioned variance আছে।' : 'Batch lock-এর ভিতরে আবার পরীক্ষা হবে.',v === 'blocked' ? 'brass':'teal')}`;
      case '6.3':
        return `<div class="basis-audit"><article><span class="basis earned">অর্জিত · Earned</span><strong>৳ ৩,১৬০</strong><small>Delivery-date basis</small></article><article><span class="basis realized">হাতে পাওয়া · Realized</span><strong>৳ ১,৯৯১</strong><small>Settlement-date basis</small></article></div>${notice('Surface audit','Dashboard, Order, report, export ও answer—কোথাও bare “Profit” নেই।')}`;
      case '6.4':
        return `<article class="completeness"><span>অর্জিত লাভ</span><strong>৳ ৩,১৬০</strong><div><i style="width:${v === 'complete' ? '100' : '79'}%"></i></div><button type="button">${v === 'complete' ? '১৯ / ১৯ items-এর হিসাব' : '১৫ / ১৯ items-এর হিসাব · ৪টি cost বাকি'}</button></article>${v === 'gap-detail' ? ledgerRows([['!','ORD-1042','Purchase Cost নেই','খুলুন ›'],['!','ORD-1038','Purchase Cost নেই','খুলুন ›']]) : ''}`;
      case '6.5': {
        const role = v === 'sales-staff' ? 'Sales Staff' : v === 'inventory-staff' ? 'Inventory Staff' : 'Owner';
        const money = role === 'Owner' ? `<div class="basis-audit"><article><span class="basis earned">অর্জিত</span><strong>৳ ৩,১৬০</strong></article><article><span class="basis realized">হাতে পাওয়া</span><strong>৳ ১,৯৯১</strong></article></div>` : notice('এই Role-এর কাজের তালিকা','নিষিদ্ধ money card payload-এ পাঠানো হয়নি।');
        return `${notice(`Role: ${role}`, role === 'Owner' ? 'সব money destination দৃশ্যমান।' : role === 'Sales Staff' ? 'Cost ও profit destination অনুপস্থিত।' : 'Profit, selling price ও settlement destination অনুপস্থিত।')}${money}${ledgerRows([['!','এমব্রয়ডারি কুর্তি · XL','Low stock','Stock-in ›']])}`;
      }
      case '7.2':
        if (v === 'insufficient-history') return notice('যথেষ্ট history নেই','Score দেখানো হচ্ছে না; আরও completed Order দরকার।','brass');
        return `<article class="formula"><span>Customer Risk Ratio</span><strong>৩২%</strong><p>(Return rate ২/১১ × ৬০%) + (Due history ৩/১১ × ৪০%)</p><small>Input counts: ২ returns · ৩ overdue · ১১ completed</small></article>${notice('কোনো prediction নয়','Formula ও input records seller যাচাই করতে পারেন।')}`;
      case '10.2':
        return `${chips(['এই মাস','গত ৩০ দিন','নিজের date range'],2)}<div class="report-grid">${reports.map((name,i)=>`<a href="#story/10.2/${v}" class="report-tile"><span>${i+1}</span><strong>${esc(name)}</strong><small>Role-gated fields · run report</small></a>`).join('')}</div>`;
      case '10.5':
        return `<article class="daily-copy"><h3>আজকের হিসাব · ১১ সেপ্টেম্বর</h3><p>আজ ১২টি Order। কুরিয়ারের কাছে ৳ ৪,০২০। অর্জিত লাভ ৳ ৩,১৬০—১৫ / ১৯ items-এর হিসাবে।</p><div><button type="button" class="secondary" data-demo-action="text-copied">টেক্সট কপি করুন</button><button type="button" class="primary" data-demo-action="image-saved">ছবি সেভ করুন</button></div></article>${notice('দুটি ordinary output','Copy text এবং Save image; কোনো Share integration নেই।')}`;
      case '11.3':
        return `<div class="operation-grid">${reversible.map((name,i)=>`<button type="button" class="choice ${i===2?'selected':''}" aria-pressed="${i===2}">${i+1}. ${esc(name)}</button>`).join('')}</div>${v === 'already-reversed' || v === 'ineligible' ? notice(v === 'already-reversed' ? 'আগেই বিপরীত এন্ট্রি লেখা হয়েছে' : 'এই operation সাতটির মধ্যে নেই','Reverse action দেওয়া হবে না।','brass') : notice('তিনটি entry point','Record · Audit trail · commit toast; original record দৃশ্যমান থাকবে।')}`;
      case '12.1': {
        const states = { configured:['Configured','Hosted model শুধু ভাষা সাজায়।'], absent:['Provider absent','Numbered query list ও template চালু।'], failing:['Provider failing','Manual numbered path চালু; retry পরে।'], exhausted:['Provider exhausted','Quota শেষ; computed answers template-এ।'] };
        const state = states[v] || states.configured;
        return `${notice(state[0],state[1],v === 'configured' ? 'violet' : 'teal')}${ledgerRows([['১',"Today's sales",'App computes figures','চালান ›'],['৬','Profit change decomposition','App computes figures','চালান ›']])}${notice('Secret server-side','Pinned model ID বা API key browser/repository/log-এ আসে না।')}`;
      }
      case '12.2': {
        if (v === 'query-list') return `<ol class="query-list">${queries.map((q,i)=>`<li><span>${i+1}</span>${esc(q)}</li>`).join('')}</ol>`;
        const outcomes = { routing:['প্রশ্ন route করা হচ্ছে','Violet মানে classification; হিসাব নয়।','violet'], routed:['Query 6 বোঝা হয়েছে','Profit change decomposition-এ route হয়েছে।','teal'], withheld:['প্রশ্নটি বোঝা হয়েছে','এই হিসাব আপনার Role দেখতে পারে না; এটি refusal নয়।','brass'], unroutable:['দশটির বাইরে','ভুল উত্তর না দিয়ে সীমাটি জানানো হলো।','brass'] };
        const state = outcomes[v] || outcomes.routed;
        return `${field('প্রশ্ন','গত মাসের তুলনায় লাভ কেন কমেছে?')}${notice(state[0],state[1],state[2])}${chips(['বাংলা','Banglish','English'])}`;
      }
      default:
        if (story.kind === 'proof') return notice('যাচাইযোগ্য system proof','এই প্রমাণ লুকানো promise নয়; acceptance evidence নিচে দেওয়া আছে।');
        if (story.kind === 'table' || story.kind === 'list') return ledgerRows(story.proofs.map((proof,index) => [`${index+1}`, proof.label, story.state, 'দেখুন ›']));
        if (story.kind === 'report') return `<div class="report-summary"><span class="basis realized">যাচাইকৃত হিসাব</span><strong>${esc(epicNames[story.epic])}</strong><p lang="en">${esc(story.state)}</p></div>`;
        return `<div class="form-grid">${field('মূল record',epicNames[story.epic])}${field('বর্তমান অবস্থা',variant.state)}${field('তারিখ / reference','১১ সেপ্টেম্বর ২০২৬')}${field('কারণ / note','প্রয়োজন অনুযায়ী')}</div>`;
    }
  }

  function desktopRail(role) {
    return `<aside class="app-rail"><div class="rail-brand"><span class="rail-dot">স</span><span>SmartBiz BD<small>এক responsive web app</small></span></div><nav class="rail-nav" aria-label="প্রধান navigation"><section><b>কাজ · Work</b><a>ড্যাশবোর্ড</a><a>অর্ডার <em>৫</em></a><a>নতুন অর্ডার</a></section><section><b>পণ্য · Catalogue</b><a>পণ্য</a><a>স্টক <em>৪</em></a></section>${role === 'Inventory Staff' || role === 'Sales Staff' ? '' : '<section><b>টাকা · Money</b><a>কুরিয়ার ও COD</a><a>Settlement</a><a>খরচ</a></section>'}<section><b>বুদ্ধি · Insight</b><a>Ask SmartBiz</a><a>রিপোর্ট</a></section><section><b>সিস্টেম · System</b><a>Settings</a><a>Audit</a></section></nav><div class="rail-member"><span>নু</span><strong>নুসরাত জাহান<small>${esc(role)}</small></strong></div></aside>`;
  }
  function phoneTabs(role) {
    const canCapture = role !== 'Inventory Staff';
    const fifth = role === 'Sales Staff' ? 'ক্রেতা' : role === 'Inventory Staff' ? 'পণ্য' : 'COD';
    return `<nav class="phone-tabs ${canCapture ? '' : 'four'}" aria-label="Phone navigation"><a>হোম</a><a>অর্ডার</a>${canCapture ? '<button type="button" class="capture-tab" aria-label="নতুন অর্ডার">＋</button>' : ''}<a>স্টক</a><a>${fifth}</a></nav>`;
  }

  function appBody(story, variant, mode) {
    const variantName = variant.id.replace(`${story.id}-`, '');
    const role = story.id === '6.5' ? (variantName === 'sales-staff' ? 'Sales Staff' : variantName === 'inventory-staff' ? 'Inventory Staff' : 'Owner') : story.id === '5.2' && variantName === 'inventory-handoff-pack-slip' ? 'Inventory Staff' : 'Owner';
    const inner = `<div class="app-content"><div class="phone-head"><a href="#hub" aria-label="পেছনে">←</a><strong>SmartBiz BD</strong><span>${esc(role)}</span></div><main class="screen-main"><header class="screen-header"><div><p class="eyebrow">Epic ${story.epic} · Story ${story.id}</p><h2>${esc(epicNames[story.epic])}</h2><p lang="en">${esc(story.surface)} · ${esc(story.title)}</p></div><span class="state-chip">${esc(variant.state)}</span></header>${customContent(story, variant)}${proofGrid(story)}${story.actionModel.sticky ? `<footer class="screen-actions"><button type="button" class="secondary">বাতিল</button><button type="button" class="primary" data-demo-action="committed">${esc(actionBn(story))}</button></footer>` : `<div class="inline-action"><a class="primary link-button" href="${esc(story.prototypeJourneyUrl)}">${esc(actionBn(story))}</a></div>`}<p class="screen-footnote">App route: ${esc(story.appRoute)} · একই route phone ও desktop-এ · synthetic data</p><div class="demo-toast" role="status" aria-live="polite"></div></main>${mode === 'phone' && story.shell === 'app' ? phoneTabs(role) : ''}</div>`;
    if (story.shell === 'onboarding') return `<div class="onboarding-shell">${inner}</div>`;
    if (story.shell === 'proof') return `<div class="proof-shell">${inner}</div>`;
    return `<div class="app-shell">${mode === 'desktop' ? desktopRail(role) : ''}${inner}</div>`;
  }

  function productScreen(story, variant, mode) {
    return `<div class="device ${mode}" data-reference-size="${mode === 'phone' ? '390x844' : '1440x900'}"><div class="device-bar"><span>${mode === 'phone' ? '৩৯০ × ৮৪৪ reference canvas' : '১৪৪০ × ৯০০ reference canvas · preview scaled to fit'}</span></div><div class="screen kind-${story.kind}">${appBody(story, variant, mode)}</div></div>`;
  }
  function variantNav(story, variant) {
    if (story.variants.length < 2) return '';
    return `<nav class="variant-nav" aria-label="Addressable story states">${story.variants.map(v => `<a class="${v.id === variant.id ? 'active' : ''}" href="#story/${story.id}/${v.id.replace(`${story.id}-`, '')}">${esc(v.label)}</a>`).join('')}</nav>`;
  }

  function storyView(id, variantName, modeOverride) {
    const story = stories.find(item => item.id === id);
    if (!story) return notFound(id);
    const variant = story.variants.find(item => item.id === `${story.id}-${variantName}`) || story.variants[0];
    const mode = modeOverride === story.secondaryMode ? story.secondaryMode : story.primaryMode;
    const index = stories.indexOf(story), previous = stories[(index - 1 + stories.length) % stories.length], next = stories[(index + 1) % stories.length];
    const variantSlug = variant.id.replace(`${story.id}-`, '');
    root.innerHTML = `<div class="presentation"><nav class="story-toolbar"><a class="back" href="#hub">← সব screen</a><strong>Story ${story.id}</strong><span class="position">${index + 1} / ${stories.length}</span><a class="arrow" aria-label="আগের গল্প" href="${previous.mockupHash}">←</a><a class="arrow" aria-label="পরের গল্প" href="${next.mockupHash}">→</a></nav><div class="stage"><aside class="story-notes"><p class="eyebrow">Epic ${story.epic} · ${esc(epicNames[story.epic])}</p><h1>${esc(story.title)}</h1><dl><dt>Application route</dt><dd>${esc(story.appRoute)}</dd><dt>Mockup frame</dt><dd>${esc(story.mockupHash)}</dd><dt>Prototype journey</dt><dd>${esc(story.prototypeJourneyUrl)}</dd></dl><p><strong>Responsive contract:</strong> ${esc(story.responsive)}</p><div class="mode-switch"><a class="${mode === story.primaryMode ? 'active' : ''}" href="#story/${story.id}/${variantSlug}/${story.primaryMode}">${story.primaryMode} primary</a><a class="${mode === story.secondaryMode ? 'active' : ''}" href="#story/${story.id}/${variantSlug}/${story.secondaryMode}">${story.secondaryMode} parity</a></div>${variantNav(story, variant)}</aside><section class="viewport-wrap"><div class="viewport-label"><span>${mode === 'phone' ? '390 × 844 reference; 360px acceptance floor' : '1440 × 900 reference; scaled presentation preview'}</span><span>${esc(story.shell)} shell · ${esc(story.kind)} pattern</span></div>${productScreen(story, variant, mode)}</section></div></div>`;
    document.querySelectorAll('[data-demo-action]').forEach(button => button.addEventListener('click', () => {
      const toast = document.querySelector('.demo-toast');
      toast.textContent = button.dataset.demoAction === 'text-copied' ? 'Bangla summary text copied.' : button.dataset.demoAction === 'image-saved' ? 'Rendered image saved.' : 'নমুনা action সম্পন্ন হয়েছে—source record অপরিবর্তিত।';
      toast.classList.add('show');
    }));
    document.title = `Story ${story.id} — ${story.title}`;
  }

  function notFound(id) {
    root.innerHTML = chrome(`<main class="not-found"><span>404</span><h1>Story ${esc(id || 'unknown')} পাওয়া যায়নি</h1><p>এই hash কোনো authoritative screen-map entry-র সঙ্গে মেলেনি।</p><a class="primary link-button" href="#hub">সব screen-এ ফিরুন</a></main>`);
    document.title = 'Story not found — SmartBiz BD';
  }
  function route() {
    const match = location.hash.match(/^#story\/(\d+\.\d+)(?:\/([a-z0-9-]+))?(?:\/(phone|desktop))?$/);
    if (match) storyView(match[1], match[2], match[3]);
    else if (!location.hash || location.hash === '#hub') hub();
    else notFound(location.hash.slice(1));
    scrollTo(0, 0);
  }
  window.addEventListener('hashchange', route);
  route();
}());
