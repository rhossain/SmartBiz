/* SmartBiz BD — seeded demo Business.
   One coherent business, one frozen day. Every figure on every screen is
   computed from this object, never hard-coded into a screen, so the money
   adds up across the prototype the way it must in the product. */

window.App = window.App || {};

(function (App) {
  'use strict';

  App.TODAY = '2026-09-07';

  /* ---------------------------------------------------------------- roles */
  App.ROLES = {
    owner:      { name: 'নুসরাত জাহান',  nameEn: 'Nusrat Jahan',  initials: 'নু', money: 'full',  label: 'মালিক',      labelEn: 'Owner' },
    manager:    { name: 'রাকিব হাসান',   nameEn: 'Rakib Hasan',   initials: 'রা', money: 'full',  label: 'ম্যানেজার',  labelEn: 'Manager' },
    accountant: { name: 'মিজানুর রহমান', nameEn: 'Mizanur Rahman',initials: 'মি', money: 'full',  label: 'হিসাবরক্ষক', labelEn: 'Accountant' },
    inventory:  { name: 'জামাল উদ্দিন',  nameEn: 'Jamal Uddin',   initials: 'জা', money: 'cost',  label: 'ইনভেন্টরি কর্মী', labelEn: 'Inventory Staff' },
    sales:      { name: 'সাথী আক্তার',   nameEn: 'Shathi Akter',  initials: 'সা', money: 'price', label: 'বিক্রয় কর্মী', labelEn: 'Sales Staff' }
  };

  /* An avatar showing a Bangla initial next to a Latin name reads as a rendering
     fault, so the initial follows the language. The English form is derived
     rather than stored — the Latin name already carries it. */
  App.initials = function (r) {
    return App.L(r.initials, r.nameEn.split(' ').map(function (w) { return w[0]; }).join(''));
  };

  App.business = {
    name: 'রূপকথা শাড়ি ঘর',
    nameEn: 'Rupkotha Shari Ghar',
    page: 'facebook.com/rupkothashari',
    since: '2024-03-11',
    address: 'বাড়ি ১২, রোড ৫, ধানমন্ডি, ঢাকা ১২০৯',
    phone: '01712-448190',
    packagingCost: 25
  };

  /* ------------------------------------------------------------- products */
  /* variantAxes drives the matrix editor — the highest-risk screen in the PRD */
  App.products = [
    {
      id: 'P-101', sku: 'KRT-EMB',
      name: 'এমব্রয়ডারি কুর্তি', nameEn: 'Embroidered Kurti',
      cat: 'কুর্তি', catEn: 'Kurti',
      price: 1250, cost: 720,
      variantAxes: [
        { key: 'colour', label: 'রঙ', labelEn: 'Colour', values: [
          { v: 'কালো', vEn: 'Black' }, { v: 'মেরুন', vEn: 'Maroon' },
          { v: 'নীল', vEn: 'Navy' }, { v: 'অফ-হোয়াইট', vEn: 'Off-white' }
        ]},
        { key: 'size', label: 'সাইজ', labelEn: 'Size', values: [
          { v: 'S' }, { v: 'M' }, { v: 'L' }, { v: 'XL' }
        ]}
      ],
      stock: {
        'কালো|S': 4, 'কালো|M': 9, 'কালো|L': 6, 'কালো|XL': 2,
        'মেরুন|S': 3, 'মেরুন|M': 7, 'মেরুন|L': 5, 'মেরুন|XL': 0,
        'নীল|S': 0, 'নীল|M': 4, 'নীল|L': 3, 'নীল|XL': 1,
        'অফ-হোয়াইট|S': 2, 'অফ-হোয়াইট|M': 5, 'অফ-হোয়াইট|L': 4, 'অফ-হোয়াইট|XL': 3
      },
      priceOverride: { 'অফ-হোয়াইট|XL': 1350 },
      inactive: ['নীল|XL'],
      reorderAt: 3
    },
    {
      id: 'P-102', sku: 'SAR-JAM',
      name: 'জামদানি শাড়ি', nameEn: 'Jamdani Saree',
      cat: 'শাড়ি', catEn: 'Saree',
      price: 4200, cost: 2950,
      variantAxes: [
        { key: 'colour', label: 'রঙ', labelEn: 'Colour', values: [
          { v: 'লাল', vEn: 'Red' }, { v: 'সবুজ', vEn: 'Green' }, { v: 'সোনালি', vEn: 'Golden' }
        ]}
      ],
      stock: { 'লাল': 5, 'সবুজ': 2, 'সোনালি': 1 },
      priceOverride: { 'সোনালি': 4850 },
      inactive: [],
      reorderAt: 2
    },
    {
      id: 'P-103', sku: 'THP-BLK',
      name: 'থ্রি-পিস ব্লক প্রিন্ট', nameEn: 'Three-piece Block Print',
      cat: 'থ্রি-পিস', catEn: 'Three-piece',
      price: 1850, cost: 1180,
      variantAxes: [
        { key: 'size', label: 'সাইজ', labelEn: 'Size', values: [{ v: 'M' }, { v: 'L' }, { v: 'XL' }] }
      ],
      stock: { 'M': 6, 'L': 8, 'XL': 3 },
      priceOverride: {}, inactive: [], reorderAt: 3
    },
    {
      id: 'P-104', sku: 'ORN-BAN',
      name: 'হাতে তৈরি চুড়ি সেট', nameEn: 'Handmade Bangle Set',
      cat: 'গহনা', catEn: 'Jewellery',
      price: 380, cost: 165,
      variantAxes: [], stock: { '_': 42 }, priceOverride: {}, inactive: [], reorderAt: 10
    },
    {
      id: 'P-105', sku: 'DUP-SLK',
      name: 'সিল্ক ওড়না', nameEn: 'Silk Dupatta',
      cat: 'ওড়না', catEn: 'Dupatta',
      price: 650, cost: 340,
      variantAxes: [
        { key: 'colour', label: 'রঙ', labelEn: 'Colour', values: [
          { v: 'গোলাপি', vEn: 'Pink' }, { v: 'ফিরোজা', vEn: 'Turquoise' }, { v: 'কালো', vEn: 'Black' }
        ]}
      ],
      stock: { 'গোলাপি': 11, 'ফিরোজা': 7, 'কালো': 1 },
      priceOverride: {}, inactive: [], reorderAt: 4
    },
    {
      id: 'P-106', sku: 'BAG-JUT',
      name: 'পাটের ব্যাগ', nameEn: 'Jute Bag',
      cat: 'ব্যাগ', catEn: 'Bag',
      price: 550, cost: 290,
      variantAxes: [], stock: { '_': 18 }, priceOverride: {}, inactive: [], reorderAt: 6
    }
  ];

  /* ------------------------------------------------------------ customers */
  /* delivered / returned drive the Customer Risk Ratio — a stated differentiator */
  App.customers = [
    { id: 'C-01', name: 'ফারজানা আক্তার', nameEn: 'Farzana Akter', phone: '01711-234567',
      area: 'উত্তরা, ঢাকা', areaEn: 'Uttara, Dhaka', address: 'হাউস ৩২, রোড ৭, সেক্টর ৪, উত্তরা, ঢাকা',
      delivered: 11, returned: 0, since: '2024-06-02', note: '' },
    { id: 'C-02', name: 'সাবরিনা হক', nameEn: 'Sabrina Haque', phone: '01819-556677',
      area: 'গুলশান, ঢাকা', areaEn: 'Gulshan, Dhaka', address: 'অ্যাপার্টমেন্ট ৫বি, রোড ১১১, গুলশান ২, ঢাকা',
      delivered: 6, returned: 4, since: '2025-01-14', note: 'বার বার রিটার্ন — অগ্রিম নিন' },
    { id: 'C-03', name: 'তাসনিম রহমান', nameEn: 'Tasnim Rahman', phone: '01912-887766',
      area: 'চট্টগ্রাম', areaEn: 'Chattogram', address: 'ফ্ল্যাট ২, আগ্রাবাদ, চট্টগ্রাম',
      delivered: 4, returned: 1, since: '2025-04-20', note: '' },
    { id: 'C-04', name: 'রুমানা ইসলাম', nameEn: 'Rumana Islam', phone: '01611-445566',
      area: 'মিরপুর, ঢাকা', areaEn: 'Mirpur, Dhaka', address: 'বাড়ি ৯, মিরপুর ১০, ঢাকা',
      delivered: 8, returned: 1, since: '2024-09-30', note: '' },
    { id: 'C-05', name: 'নাজমুন নাহার', nameEn: 'Nazmun Nahar', phone: '01521-334455',
      area: 'সিলেট', areaEn: 'Sylhet', address: 'জিন্দাবাজার, সিলেট',
      delivered: 2, returned: 2, since: '2026-06-11', note: 'নতুন — ঝুঁকি বেশি' },
    { id: 'C-06', name: 'শারমিন সুলতানা', nameEn: 'Sharmin Sultana', phone: '01733-221100',
      area: 'ধানমন্ডি, ঢাকা', areaEn: 'Dhanmondi, Dhaka', address: 'রোড ২৭, ধানমন্ডি, ঢাকা',
      delivered: 14, returned: 1, since: '2024-04-05', note: 'নিয়মিত ক্রেতা' },
    { id: 'C-07', name: 'ইশরাত জাহান', nameEn: 'Ishrat Jahan', phone: '01844-667788',
      area: 'রাজশাহী', areaEn: 'Rajshahi', address: 'শিরোইল, রাজশাহী',
      delivered: 3, returned: 0, since: '2025-11-22', note: '' },
    { id: 'C-08', name: 'মৌসুমী পারভীন', nameEn: 'Mousumi Parveen', phone: '01955-889900',
      area: 'নারায়ণগঞ্জ', areaEn: 'Narayanganj', address: 'চাষাঢ়া, নারায়ণগঞ্জ',
      delivered: 5, returned: 3, since: '2025-07-08', note: '' }
  ];

  /* ------------------------------------------------------------- couriers */
  App.couriers = [
    { id: 'pathao',  name: 'পাঠাও কুরিয়ার', nameEn: 'Pathao Courier', fee: 70, codPct: 1.0, simulated: true },
    { id: 'steadfast', name: 'স্টেডফাস্ট',   nameEn: 'Steadfast',      fee: 65, codPct: 1.0, simulated: true },
    { id: 'redx',    name: 'রেডএক্স',        nameEn: 'RedX',           fee: 75, codPct: 1.2, simulated: true },
    { id: 'self',    name: 'নিজে ডেলিভারি',  nameEn: 'Self delivery',  fee: 0,  codPct: 0,   simulated: false }
  ];

  /* --------------------------------------------------------------- orders */
  /* status ∈ new confirmed packed shipped delivered settled cancelled returned partial */
  App.orders = [
    { id: 'ORD-1042', cust: 'C-01', courier: 'pathao', status: 'new', placed: '2026-09-07 10:42',
      channel: 'messenger', source: 'paste', delivery: 80, discount: 0, advance: 0,
      lines: [{ p: 'P-101', v: 'কালো|M', qty: 1 }, { p: 'P-105', v: 'গোলাপি', qty: 1 }],
      note: 'মেসেঞ্জার থেকে পেস্ট করা' },
    { id: 'ORD-1041', cust: 'C-05', courier: 'pathao', status: 'new', placed: '2026-09-07 09:58',
      channel: 'whatsapp', source: 'paste', delivery: 120, discount: 0, advance: 0,
      lines: [{ p: 'P-102', v: 'সবুজ', qty: 1 }], note: '' },
    { id: 'ORD-1040', cust: 'C-06', courier: 'steadfast', status: 'confirmed', placed: '2026-09-07 08:15',
      channel: 'phone', source: 'manual', delivery: 80, discount: 100, advance: 500,
      lines: [{ p: 'P-103', v: 'L', qty: 2 }], note: 'নিয়মিত ক্রেতা — ১০০ টাকা ছাড়' },
    { id: 'ORD-1039', cust: 'C-04', courier: 'pathao', status: 'confirmed', placed: '2026-09-06 19:30',
      channel: 'messenger', source: 'repeat', delivery: 80, discount: 0, advance: 0,
      lines: [{ p: 'P-104', v: '_', qty: 3 }, { p: 'P-106', v: '_', qty: 1 }], note: '' },
    { id: 'ORD-1038', cust: 'C-07', courier: 'redx', status: 'packed', placed: '2026-09-06 16:04',
      channel: 'instagram', source: 'manual', delivery: 130, discount: 0, advance: 0,
      lines: [{ p: 'P-101', v: 'মেরুন|L', qty: 1 }], note: '' },
    { id: 'ORD-1037', cust: 'C-03', courier: 'pathao', status: 'packed', placed: '2026-09-06 14:22',
      channel: 'messenger', source: 'quickadd', delivery: 130, discount: 0, advance: 0,
      lines: [{ p: 'P-102', v: 'লাল', qty: 1 }, { p: 'P-104', v: '_', qty: 2 }], note: '' },
    { id: 'ORD-1036', cust: 'C-08', courier: 'steadfast', status: 'shipped', placed: '2026-09-05 11:10',
      channel: 'messenger', source: 'paste', delivery: 90, discount: 0, advance: 0,
      lines: [{ p: 'P-103', v: 'M', qty: 1 }], note: '', consignment: 'SF-77104' },
    { id: 'ORD-1035', cust: 'C-01', courier: 'pathao', status: 'shipped', placed: '2026-09-05 09:45',
      channel: 'phone', source: 'manual', delivery: 80, discount: 0, advance: 0,
      lines: [{ p: 'P-101', v: 'অফ-হোয়াইট|XL', qty: 1 }, { p: 'P-105', v: 'ফিরোজা', qty: 1 }],
      note: '', consignment: 'PT-991204' },
    { id: 'ORD-1034', cust: 'C-06', courier: 'pathao', status: 'delivered', placed: '2026-09-04 12:00',
      channel: 'messenger', source: 'repeat', delivery: 80, discount: 0, advance: 0,
      lines: [{ p: 'P-105', v: 'কালো', qty: 2 }], note: '', consignment: 'PT-991198' },
    { id: 'ORD-1033', cust: 'C-04', courier: 'pathao', status: 'delivered', placed: '2026-09-03 17:26',
      channel: 'messenger', source: 'paste', delivery: 80, discount: 0, advance: 0,
      lines: [{ p: 'P-101', v: 'কালো|L', qty: 1 }], note: '', consignment: 'PT-991187' },
    { id: 'ORD-1032', cust: 'C-02', courier: 'redx', status: 'returned', placed: '2026-09-02 13:12',
      channel: 'messenger', source: 'manual', delivery: 80, discount: 0, advance: 0,
      lines: [{ p: 'P-102', v: 'সোনালি', qty: 1 }], note: 'গ্রাহক ফোন ধরেননি',
      consignment: 'RX-40881', returnCondition: 'resalable' },
    { id: 'ORD-1031', cust: 'C-08', courier: 'steadfast', status: 'partial', placed: '2026-09-01 10:05',
      channel: 'whatsapp', source: 'import', delivery: 90, discount: 0, advance: 0,
      lines: [{ p: 'P-104', v: '_', qty: 4, returned: 2 }, { p: 'P-106', v: '_', qty: 1 }],
      note: 'দুইটি চুড়ি সেট ফেরত', consignment: 'SF-77088', returnCondition: 'damaged' },
    { id: 'ORD-1030', cust: 'C-03', courier: 'pathao', status: 'settled', placed: '2026-08-30 15:40',
      channel: 'messenger', source: 'paste', delivery: 130, discount: 0, advance: 0,
      lines: [{ p: 'P-103', v: 'XL', qty: 1 }, { p: 'P-105', v: 'গোলাপি', qty: 1 }],
      note: '', consignment: 'PT-990901', settlement: 'STL-0824' },
    { id: 'ORD-1029', cust: 'C-01', courier: 'pathao', status: 'settled', placed: '2026-08-29 11:18',
      channel: 'phone', source: 'manual', delivery: 80, discount: 0, advance: 0,
      lines: [{ p: 'P-102', v: 'লাল', qty: 1 }], note: '', consignment: 'PT-990877', settlement: 'STL-0824' },
    { id: 'ORD-1028', cust: 'C-05', courier: 'pathao', status: 'cancelled', placed: '2026-08-28 20:02',
      channel: 'messenger', source: 'paste', delivery: 120, discount: 0, advance: 0,
      lines: [{ p: 'P-101', v: 'নীল|M', qty: 1 }], note: 'গ্রাহক নিজেই বাতিল করেছেন' }
  ];

  /* ------------------------------------------------------- settlement run */
  /* The import that produces variances — three of them, each a different kind */
  App.settlementRun = {
    id: 'STL-0831', courier: 'pathao', file: 'pathao_payout_2026-08-31.csv',
    /* declaredTotal must stay equal to the sum of the row nets below. The match
       screen prints it, subtracts the matched rows and calls the remainder
       unmatched — so if it drifts, the headline figure stops being traceable to
       any row on screen, which is the one thing this screen exists to prove. */
    received: '2026-09-06', declaredTotal: 8767,
    rows: [
      { cn: 'PT-991198', order: 'ORD-1034', codCollected: 1380, fee: 70, codFee: 14, net: 1296, expect: 1296, state: 'matched' },
      { cn: 'PT-991187', order: 'ORD-1033', codCollected: 1330, fee: 70, codFee: 13, net: 1247, expect: 1247, state: 'matched' },
      { cn: 'PT-991204', order: 'ORD-1035', codCollected: 2080, fee: 70, codFee: 21, net: 1989, expect: 2069, state: 'short',
        why: 'কুরিয়ার ৮০ টাকা কম দিয়েছে', whyEn: 'Courier paid ৳80 less than expected' },
      { cn: 'PT-991211', order: null, codCollected: 1850, fee: 70, codFee: 19, net: 1761, expect: null, state: 'unmatched',
        why: 'এই কনসাইনমেন্ট নম্বর কোনো অর্ডারে নেই', whyEn: 'No order carries this consignment number' },
      { cn: 'PT-990901', order: 'ORD-1030', codCollected: 2630, fee: 130, codFee: 26, net: 2474, expect: 2474, state: 'duplicate',
        why: 'STL-0824 তে ইতিমধ্যে নিষ্পত্তি হয়েছে', whyEn: 'Already settled in STL-0824' }
    ]
  };

  /* ------------------------------------------------------------- expenses */
  App.expenses = [
    { id: 'E-201', date: '2026-09-07', cat: 'প্যাকেজিং', catEn: 'Packaging', amount: 1200, note: 'পলি ব্যাগ ও টেপ', by: 'manager' },
    { id: 'E-202', date: '2026-09-06', cat: 'বিজ্ঞাপন', catEn: 'Advertising', amount: 3500, note: 'ফেসবুক বুস্ট', by: 'owner' },
    { id: 'E-203', date: '2026-09-05', cat: 'পরিবহন', catEn: 'Transport', amount: 450, note: 'কুরিয়ার হাব পর্যন্ত', by: 'sales' },
    { id: 'E-204', date: '2026-09-03', cat: 'বেতন', catEn: 'Salary', amount: 12000, note: 'সাথী — সেপ্টেম্বর অগ্রিম', by: 'owner' },
    { id: 'E-205', date: '2026-09-02', cat: 'ভাড়া', catEn: 'Rent', amount: 8000, note: 'গুদাম ভাড়া', by: 'owner' },
    { id: 'E-206', date: '2026-09-01', cat: 'ইন্টারনেট', catEn: 'Internet', amount: 1100, note: '', by: 'manager' }
  ];

  /* ----------------------------------------------------------------- dues */
  App.dues = [
    { id: 'D-01', cust: 'C-06', amount: 1450, since: '2026-08-22', orders: ['ORD-1018'], note: 'আংশিক পরিশোধ বাকি' },
    { id: 'D-02', cust: 'C-04', amount: 620, since: '2026-08-29', orders: ['ORD-1024'], note: '' },
    { id: 'D-03', cust: 'C-03', amount: 2100, since: '2026-07-30', orders: ['ORD-0996', 'ORD-1001'], note: 'দুই অর্ডার একসাথে' }
  ];

  /* ------------------------------------------------------------ suppliers */
  App.suppliers = [
    { id: 'S-01', name: 'নিউ মার্কেট হোলসেল', nameEn: 'New Market Wholesale', phone: '01711-990011',
      payable: 18500, lastBuy: '2026-09-02', items: ['P-101', 'P-103'] },
    { id: 'S-02', name: 'তাঁতঘর জামদানি', nameEn: 'Tantghor Jamdani', phone: '01818-220033',
      payable: 42000, lastBuy: '2026-08-27', items: ['P-102'] },
    { id: 'S-03', name: 'ঢাকা ক্রাফট সাপ্লাই', nameEn: 'Dhaka Craft Supply', phone: '01911-440055',
      payable: 0, lastBuy: '2026-08-19', items: ['P-104', 'P-106'] }
  ];

  /* ------------------------------------------------- audit trail (FR-64+) */
  App.audit = [
    { id: 'A-88', at: '2026-09-07 10:42', who: 'sales', act: 'order.create', target: 'ORD-1042', detail: 'মেসেঞ্জার পেস্ট থেকে তৈরি', detailEn: 'Created from messenger paste' },
    { id: 'A-87', at: '2026-09-07 09:12', who: 'manager', act: 'price.override', target: 'P-101 · অফ-হোয়াইট|XL', detail: '১২৫০ → ১৩৫০', detailEn: '1250 → 1350' },
    { id: 'A-86', at: '2026-09-06 21:40', who: 'accountant', act: 'settlement.import', target: 'STL-0831', detail: '৫ সারি, ৩টি অমিল', detailEn: '5 rows, 3 variances' },
    { id: 'A-85', at: '2026-09-06 18:03', who: 'owner', act: 'return.accept', target: 'ORD-1032', detail: 'পুনঃবিক্রয়যোগ্য — স্টকে ফেরত', detailEn: 'Resalable — returned to stock' },
    { id: 'A-84', at: '2026-09-06 17:55', who: 'owner', act: 'entry.reverse', target: 'E-199', detail: 'ভুল খরচ — বিপরীত এন্ট্রি', detailEn: 'Wrong expense — compensating entry' },
    { id: 'A-83', at: '2026-09-06 15:20', who: 'inventory', act: 'order.pack', target: 'ORD-1038', detail: '', detailEn: '' },
    { id: 'A-82', at: '2026-09-05 12:31', who: 'manager', act: 'stock.adjust', target: 'P-105 · কালো', detail: '৪ → ১ (গণনা সংশোধন)', detailEn: '4 → 1 (count correction)' },
    { id: 'A-81', at: '2026-09-04 10:02', who: 'owner', act: 'member.invite', target: 'জামাল উদ্দিন', detail: 'ইনভেন্টরি কর্মী হিসেবে', detailEn: 'as Inventory Staff' },
    { id: 'A-80', at: '2026-09-03 09:14', who: 'accountant', act: 'due.record', target: 'D-02', detail: '৬২০ টাকা বাকি', detailEn: '৳620 outstanding' },
    { id: 'A-79', at: '2026-09-02 16:47', who: 'sales', act: 'customer.create', target: 'C-08', detail: '', detailEn: '' }
  ];

  /* ============================================================ COMPUTED */

  function product(id) { return App.products.filter(function (p) { return p.id === id; })[0]; }
  function customer(id) { return App.customers.filter(function (c) { return c.id === id; })[0]; }
  function courier(id) { return App.couriers.filter(function (c) { return c.id === id; })[0]; }
  function order(id) { return App.orders.filter(function (o) { return o.id === id; })[0]; }

  function unitPrice(p, variant) {
    if (p.priceOverride && p.priceOverride[variant] !== undefined) return p.priceOverride[variant];
    return p.price;
  }

  /* the money shape of one order — one function, used by every screen */
  function econ(o) {
    var goods = 0, cogs = 0, items = 0, returnedValue = 0, returnedCogs = 0;
    o.lines.forEach(function (l) {
      var p = product(l.p);
      var up = unitPrice(p, l.v);
      var live = l.qty - (l.returned || 0);
      goods += up * l.qty;
      cogs += p.cost * l.qty;
      items += l.qty;
      if (l.returned) { returnedValue += up * l.returned; returnedCogs += p.cost * l.returned; }
      l._unitPrice = up; l._live = live;
    });

    var c = courier(o.courier);
    var net = o.status === 'returned' ? 0 : (goods - returnedValue - o.discount);
    var collect = Math.max(0, net + o.delivery - o.advance);
    var courierFee = o.courier === 'self' ? 0 : c.fee;
    var codFee = Math.round(collect * (c.codPct / 100));
    var pack = App.business.packagingCost;
    var goodsCogs = o.status === 'returned' ? 0 : (cogs - returnedCogs);

    /* damaged returns do not come back as sellable value — the loss is real */
    var returnLoss = 0;
    if (o.returnCondition === 'damaged') returnLoss = returnedCogs;
    if (o.status === 'returned' && o.returnCondition === 'damaged') returnLoss = cogs;

    var profit = net - goodsCogs - courierFee - codFee - pack - returnLoss;

    return {
      goods: goods, discount: o.discount, delivery: o.delivery, advance: o.advance,
      net: net, collect: collect, cogs: goodsCogs, courierFee: courierFee, codFee: codFee,
      pack: pack, returnLoss: returnLoss, returnedValue: returnedValue,
      profit: profit, items: items,
      margin: net ? (profit / net) * 100 : 0
    };
  }

  var REALIZED = { settled: 1 };
  var EARNED = { delivered: 1, partial: 1, settled: 1 };

  /* Customer Risk Ratio — returns ÷ (delivered + returns), with a floor on
     sample size so a one-order customer is not branded on one data point */
  function risk(c) {
    var total = c.delivered + c.returned;
    var ratio = total ? c.returned / total : 0;
    var band = 'low';
    if (total < 3) band = 'unknown';
    else if (ratio >= 0.35) band = 'high';
    else if (ratio >= 0.15) band = 'medium';
    return { ratio: ratio, pct: Math.round(ratio * 100), total: total, band: band };
  }

  function stockOf(p) {
    var t = 0, keys = Object.keys(p.stock);
    keys.forEach(function (k) { t += p.stock[k]; });
    return t;
  }

  function lowVariants(p) {
    return Object.keys(p.stock).filter(function (k) {
      return (p.inactive.indexOf(k) === -1) && p.stock[k] <= p.reorderAt;
    });
  }

  /* the dashboard's headline figures, plus what they are missing */
  function summary() {
    var earned = 0, realized = 0, pipeline = 0, custody = 0;
    var earnedCount = 0, earnedTotal = 0;

    App.orders.forEach(function (o) {
      var e = econ(o);
      if (EARNED[o.status]) { earned += e.profit; earnedCount++; }
      if (REALIZED[o.status]) realized += e.profit;
      if (o.status === 'new' || o.status === 'confirmed' || o.status === 'packed') pipeline += e.collect;
      if (o.status === 'shipped') custody += e.collect;
      if (EARNED[o.status] || o.status === 'shipped') earnedTotal++;
    });

    var expenses = App.expenses.reduce(function (s, e) { return s + e.amount; }, 0);
    var duesTotal = App.dues.reduce(function (s, d) { return s + d.amount; }, 0);
    var payable = App.suppliers.reduce(function (s, x) { return s + x.payable; }, 0);
    var unsettled = App.settlementRun.rows.filter(function (r) { return r.state !== 'matched'; }).length;

    var todayOrders = App.orders.filter(function (o) { return o.placed.indexOf(App.TODAY) === 0; });

    return {
      earnedProfit: earned, realizedProfit: realized,
      pipeline: pipeline, custody: custody,
      expenses: expenses, dues: duesTotal, payable: payable,
      unsettled: unsettled,
      /* Completeness Indicator: earned profit is computed over the orders that
         have reached Delivered — the shipped ones are counted in custody, not here */
      completeness: { have: earnedCount, of: earnedTotal },
      todayCount: todayOrders.length,
      todayValue: todayOrders.reduce(function (s, o) { return s + econ(o).collect; }, 0),
      lowStock: App.products.filter(function (p) { return lowVariants(p).length > 0; }).length
    };
  }

  function countByStatus() {
    var m = {};
    App.orders.forEach(function (o) { m[o.status] = (m[o.status] || 0) + 1; });
    return m;
  }

  App.get = { product: product, customer: customer, courier: courier, order: order };
  App.econ = econ;
  App.unitPrice = unitPrice;
  App.risk = risk;
  App.stockOf = stockOf;
  App.lowVariants = lowVariants;
  App.summary = summary;
  App.countByStatus = countByStatus;

  /* 'মেরুন|XL' → 'Maroon XL'. Stock keys are Bangla because Bangla is the source
     of truth; each axis carries the English form of its own values. */
  App.variantLabel = function (p, key, sep) {
    return String(key).split('|').map(function (part, i) {
      var axis = p.variantAxes && p.variantAxes[i];
      var val = axis && axis.values.filter(function (v) { return v.v === part; })[0];
      return App.L(part, (val && val.vEn) || part);
    }).join(sep === undefined ? ' ' : sep);
  };

  App.RECOGNITION = { REALIZED: REALIZED, EARNED: EARNED };
})(window.App);
