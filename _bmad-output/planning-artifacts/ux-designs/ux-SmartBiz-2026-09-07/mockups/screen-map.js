/* SmartBiz BD — authoritative story-to-screen design map.
   This file belongs to the UX mockup set. The prototype consumes a copy only
   after mockup coverage passes; edits begin here, never in prototype/. */
const RAW_SCREENS = [
  { id:'1.1', epic:1, kind:'proof', mode:'desktop', route:'proof/foundation-runtime', surface:'Deployment readiness', title:'Application skeleton deployed on free-tier infrastructure', state:'Cold-start and runtime proof', action:'Open health evidence', evidence:['Render web service and Neon database connected','Designed cold-start loading state','Backup and restore evidence recorded'] },
  { id:'1.2', epic:1, kind:'auth', mode:'phone', route:'account/register', surface:'Register and recover access', title:'User registration, login, and single-use recovery code', state:'Recovery code shown once', action:'Save recovery code', evidence:['Password registration and sign-in','Single-use recovery code reveal','Reset issues a replacement code'] },
  { id:'1.3', epic:1, kind:'form', mode:'phone', route:'onboarding/business', surface:'Create business', title:'Business creation and Owner assignment', state:'First business setup', action:'Create my business', evidence:['Business name and type','Owner assignment confirmed','Business-scoped workspace opens'] },
  { id:'1.4', epic:1, kind:'auth', mode:'phone', route:'onboarding/join', surface:'Join with invitation code', title:'Invitation Code Member onboarding across five Roles', state:'Code accepted once', action:'Join business', evidence:['Enter single-use invite code','Five Role choices shown','Business and Role confirmed'] },
  { id:'1.5', epic:1, kind:'proof', mode:'desktop', route:'proof/tenant-isolation', surface:'Tenant isolation proof', title:'Server-side tenant isolation', state:'Cross-business access refused', action:'Inspect isolation checks', evidence:['Business A query cannot return Business B','Default data manager applies scope','Named administrator exception only'] },
  { id:'1.6', epic:1, kind:'proof', mode:'desktop', route:'proof/capability-gate', surface:'Capability gate proof', title:'Server-side Role enforcement — the capability gate', state:'Denied fields absent', action:'Compare Role outputs', evidence:['One per-cell capability lookup','Pages, exports and answers filtered','Direct action request refused'] },
  { id:'1.7', epic:1, kind:'list', mode:'desktop', route:'settings/members', surface:'Members and Roles', title:'Member list, Role change, and deactivation', state:'Owner managing access', action:'Update member access', evidence:['Owner can change Role','Owner can deactivate without deletion','Manager sees a read-only list'] },
  { id:'1.8', epic:1, kind:'form', mode:'phone', route:'settings/account', surface:'My account', title:'User account self-service settings', state:'Profile and memberships', action:'Save my settings', evidence:['Update personal details','Persist language preference','List every Business membership'] },
  { id:'1.9', epic:1, kind:'table', mode:'desktop', route:'admin/platform', surface:'Platform overview', title:'Platform Administrator read-only view', state:'Names and counts only', action:'Return to platform list', evidence:['Business names and member counts','User names and access counts','No orders, customers or money'] },
  { id:'1.10', epic:1, kind:'proof', mode:'desktop', route:'proof/design-system', surface:'Design system evidence', title:'Design tokens, contrast test suite, and Bangla-first shell', state:'Accessibility floor passing', action:'Inspect token evidence', evidence:['DESIGN.md token parity','AA contrast and control boundaries','Bangla default with localized numerals'] },

  { id:'2.1', epic:2, kind:'form', mode:'phone', route:'products/new', surface:'New product', title:'Product and category definition', state:'Name and selling price required', action:'Save product', evidence:['Category, SKU, Supplier and minimum stock optional','Product appears in capture immediately','Referenced Products deactivate, never delete'] },
  { id:'2.2', epic:2, kind:'form', mode:'desktop', route:'product/dimensions', surface:'Variant dimensions', title:'Variant Dimensions definition', state:'Three axes configured', action:'Save dimensions', evidence:['Colour, Size and Fabric axes','Values editable before generation','Fourth axis visibly refused'] },
  { id:'2.3', epic:2, kind:'table', mode:'desktop', route:'product/matrix-3d', surface:'Generated variant matrix', title:'Variant matrix generation', state:'All combinations ready', action:'Create variants', evidence:['Every three-axis combination','SKU, zero stock and missing cost','Parent balance migration explained'] },

  { id:'3.1', epic:3, kind:'form', mode:'phone', route:'inventory/stock-in', surface:'Receive stock', title:'Stock-In with mandatory Purchase Cost', state:'Cost is required', action:'Record stock-in', evidence:['Variant and quantity','Purchase Cost cannot be blank','Paid or unpaid state captured'] },
  { id:'3.2', epic:3, kind:'form', mode:'phone', route:'inventory/adjustment', surface:'Adjust stock', title:'Adjustment with reason', state:'Physical count correction', action:'Record adjustment', evidence:['Signed quantity','Enumerated reason required','Projected stock shown before commit'] },
  { id:'3.3', epic:3, kind:'form', mode:'phone', route:'inventory/write-off', surface:'Damage write-off', title:'Damage Write-Off', state:'Unsellable stock selected', action:'Write off damaged units', evidence:['Quantity cannot exceed stock','Cost consequence visible','Original movement remains inspectable'] },
  { id:'3.4', epic:3, kind:'table', mode:'desktop', route:'inventory/movements', surface:'Inventory movement history', title:'Inventory Movement history and reconciliation', state:'Insert-only ledger', action:'Export movement history', evidence:['Quantity and cost_total columns','Running stock and weighted cost folds','No edit or delete controls'] },
  { id:'3.5', epic:3, kind:'list', mode:'phone', route:'inventory/low', surface:'Low stock', title:'Low-stock surfacing', state:'Variants at or below threshold', action:'Start stock-in', evidence:['Specific Variant named','Threshold and current stock shown','Dashboard and inventory agree'] },

  { id:'4.1', epic:4, kind:'form', mode:'phone', route:'capture/manual', surface:'Manual order', title:'Fast manual order entry', state:'Four required fields', action:'Save new order', evidence:['Phone, Product, quantity and price','Existing Customer matched by phone','360px single-column form'] },
  { id:'4.2', epic:4, kind:'detail', mode:'phone', route:'capture/customer-match', surface:'Customer match', title:'Customer identity hardening — normalization and tenant isolation', state:'Canonical phone recognized', action:'Use this Customer', evidence:['Different phone formats normalize','Match stays inside this Business','Duplicate identity warning'] },
  { id:'4.3', epic:4, kind:'form', mode:'phone', route:'capture/pricing', surface:'Order pricing', title:'Order pricing, discount, and delivery charge', state:'COD total calculated', action:'Accept total', evidence:['Line subtotal','Discount guard','Delivery charge and advance applied'] },
  { id:'4.4', epic:4, kind:'detail', mode:'phone', route:'capture/identity', surface:'Order identity', title:'Order identity and source tracking', state:'Identifier reserved', action:'Continue order', evidence:['Business-unique sequential ID','Latin digits in every locale','Capture source assigned automatically'] },
  { id:'4.5', epic:4, kind:'form', mode:'phone', route:'capture/paste', surface:'Paste and parse', title:'Paste-and-parse order capture', state:'Extracted fields awaiting review', action:'Review order', evidence:['Extracted versus missing labels','Ambiguous Product candidates offered','Raw message remains beside form'] },
  { id:'4.6', epic:4, kind:'form', mode:'phone', route:'capture/inline-product', surface:'Inline new product', title:'Inline Product creation from the order screen', state:'Order preserved underneath', action:'Create and select product', evidence:['Name and price only','Optional single Variant','Zero stock and incomplete cost'] },
  { id:'4.7', epic:4, kind:'state', mode:'phone', route:'capture/draft-restore', surface:'Restore order draft', title:'Resilient order drafts', state:'Unsaved draft found', action:'Restore every field', evidence:['Saved within two seconds','Raw message and lines retained','Discard and save clear the draft'] },
  { id:'4.8', epic:4, kind:'state', mode:'phone', route:'order/confirm-stock', surface:'Confirm and allocate', title:'Stock allocation and Purchase Cost snapshot on confirmation', state:'One Variant is short', action:'Acknowledge and confirm', evidence:['Sale allocation preview','Purchase Cost snapshot','Idempotent confirmation and shortfall'] },
  { id:'4.9', epic:4, kind:'flow', mode:'desktop', route:'order/status-transition', surface:'Order status transition', title:'Order Status transitions', state:'Only legal next states enabled', action:'Move to next status', evidence:['Forward lifecycle','Role-specific exceptional actions','Illegal transition explains permitted states'] },
  { id:'4.10', epic:4, kind:'state', mode:'phone', route:'order/cancel', surface:'Cancel order', title:'Cancellation', state:'Compensating stock release', action:'Cancel and restore stock', evidence:['Reason required','Allocation reversal preview','Excluded from sales and profit'] },
  { id:'4.11', epic:4, kind:'form', mode:'phone', route:'order/return-receipt', surface:'Return receipt', title:'Returned status and return-to-stock receipt', state:'Goods physically received', action:'Record receipt', evidence:['Commercial return separate from receipt','Per-line partial quantity','Resalable or damaged condition'] },
  { id:'4.12', epic:4, kind:'state', mode:'phone', route:'order/failed-delivery', surface:'Failed delivery', title:'Failed delivery', state:'Courier could not deliver', action:'Record failed delivery', evidence:['Removed from courier custody','Retry shipment or receive return','Courier charge remains'] },
  { id:'4.13', epic:4, kind:'detail', mode:'desktop', route:'order/edit-constraints', surface:'Edit order', title:'Order editing constraints', state:'Packed order is restricted', action:'Review allowed changes', evidence:['Commercial fields locked after Packed','Courier and status remain editable','Missing cost is the sole exception'] },
  { id:'4.14', epic:4, kind:'list', mode:'phone', route:'orders/filter', surface:'Order list and filters', title:'Order list, search, and filtering', state:'Attention filters applied', action:'Open selected order', evidence:['Status, date, courier, custody, collection, source','Search ID, phone or name','Returns, shortfalls and unsettled orders flagged'] },
  { id:'4.15', epic:4, kind:'report', mode:'phone', route:'order/economics', surface:'Order economics', title:'Per-Order unit economics', state:'Earned unit economics', action:'Explain this margin', evidence:['Revenue, historical cost and courier charge','Resulting margin','Capability-gated cost visibility'] },
  { id:'4.16', epic:4, kind:'form', mode:'phone', route:'order/missing-cost', surface:'Complete missing Purchase Cost', title:'Completing a missing Purchase Cost', state:'One line incomplete', action:'Save Purchase Cost', evidence:['Available at every status','Existing cost cannot be overwritten','Profit completeness recomputes'] },
  { id:'4.17', epic:4, kind:'detail', mode:'phone', route:'capture/repeat', surface:'Repeat past order', title:'Repeat a past Order', state:'Current prices compared', action:'Create repeated order', evidence:['New status and fresh identity','Changed-price marker','Inactive Variant excluded'] },
  { id:'4.18', epic:4, kind:'list', mode:'phone', route:'capture/quick', surface:'Quick-add grid', title:'Quick-add Product grid', state:'Frequency-ranked products', action:'Continue with selected items', evidence:['Tap adds quantity one','Repeat tap increments','Out-of-stock stays tappable and marked'] },
  { id:'4.19', epic:4, kind:'form', mode:'desktop', route:'capture/photo', surface:'Photo beside form', title:'Message image beside the capture form', state:'Session-only image attached', action:'Save typed order', evidence:['Image and form remain side-by-side','Downscaled before display','No OCR promise when unavailable'] },
  { id:'4.20', epic:4, kind:'table', mode:'desktop', route:'capture/import-review', surface:'Spreadsheet order import', title:'Spreadsheet Order import', state:'Three valid, two need attention', action:'Import valid rows', evidence:['Saved Business column mapping','Row-specific validation','Bad rows do not block valid rows'] },
  { id:'4.21', epic:4, kind:'state', mode:'phone', route:'capture/voice', surface:'Voice dictation', title:'Voice dictation into the capture field', state:'Transcript ready to parse', action:'Parse transcript', evidence:['Speech fills the normal capture field','Same parser as pasted text','Control absent when unsupported'] },

  { id:'5.1', epic:5, kind:'list', mode:'desktop', route:'couriers/manage', surface:'Courier management', title:'Courier records', state:'Four Couriers available', action:'Add courier', evidence:['Name and status','Own column mapping','Available during assignment'] },
  { id:'5.2', epic:5, kind:'form', mode:'phone', route:'order/courier-assign', surface:'Assign courier', title:'Order-to-Courier assignment and simulated adapter', state:'Simulated courier selected', action:'Assign and create tracking', evidence:['Courier and tracking reference','Simulator labelled at point of use','Same surface for a real adapter'] },
  { id:'5.3', epic:5, kind:'detail', mode:'phone', route:'order/collection-state', surface:'Delivery and collection facts', title:'Delivered vs cash-collected as two distinct facts', state:'Delivered, cash still pending', action:'Update collection fact', evidence:['Delivery fact','Cash-collected fact','Independent editable timestamps'] },
  { id:'5.4', epic:5, kind:'form', mode:'phone', route:'order/courier-charge', surface:'Courier charge', title:'Courier Charge as a cost', state:'Charge awaiting confirmation', action:'Record courier charge', evidence:['Separate from Customer delivery charge','Applied to both profit bases','Source and date retained'] },
  { id:'5.5', epic:5, kind:'report', mode:'desktop', route:'cod/custody', surface:'Money with Couriers', title:'Money With Couriers visibility', state:'Live custody position', action:'Inspect courier parcels', evidence:['Current custody total','Parcel rows behind the total','Derived from shipment and settlement'] },
  { id:'5.6', epic:5, kind:'form', mode:'desktop', route:'settlement/import-map', surface:'Import settlement file', title:'Settlement file upload and Column Mapping', state:'Remembered mapping found', action:'Preview mapped rows', evidence:['Courier-scoped mapping','Synthetic sample available','Rows staged for review'] },
  { id:'5.7', epic:5, kind:'table', mode:'desktop', route:'settlement/auto-match', surface:'Automatic matching', title:'Automatic Settlement Row matching', state:'Two matched, three exceptions', action:'Review exceptions', evidence:['Consignment identity match','One Order can match once','Duplicate already-settled row surfaced'] },
  { id:'5.8', epic:5, kind:'state', mode:'desktop', route:'settlement/disposition', surface:'Resolve variance', title:'Unmatched-row resolution and Disposition', state:'Paid-short variance', action:'Record disposition', evidence:['Expected, received and gap','Every option states its effect','No unresolved row can disappear'] },
  { id:'5.9', epic:5, kind:'report', mode:'desktop', route:'settlement/realize', surface:'Settlement match result', title:'Settlement Match realizes cash', state:'Money moved to realized once', action:'View matched Order', evidence:['Pending decreases','Realized increases','A second match is unavailable'] },
  { id:'5.10', epic:5, kind:'state', mode:'desktop', route:'settlement/close', surface:'Close settlement batch', title:'Batch review and close', state:'Close blocked by one variance', action:'Resolve remaining variance', evidence:['Whole-batch totals','Open variance named','Close unlocks only at zero'] },
  { id:'5.11', epic:5, kind:'table', mode:'desktop', route:'settlement/history', surface:'Settlement history', title:'Past Batches remain inspectable', state:'Closed batch read-only', action:'Open selected batch', evidence:['Rows, matches and dispositions','Closed timestamp and actor','No edit controls after close'] },
  { id:'5.12', epic:5, kind:'flow', mode:'desktop', route:'settlement/grouped', surface:'Grouped payout resolution', title:'Partial and grouped settlement handling', state:'Group decomposed to clean outcomes', action:'Confirm one-to-one outcomes', evidence:['One-to-one matches only','Shortfall becomes variance','Duplicate file hash recognized'] },

  { id:'6.1', epic:6, kind:'report', mode:'desktop', route:'home/money', surface:'Dashboard money panel', title:'Dashboard money panel', state:'Earned and realized position', action:'Open money detail', evidence:['Money With Couriers','Pending versus realized cash','Live profit derivation'] },
  { id:'6.2', epic:6, kind:'list', mode:'phone', route:'home/attention', surface:'Dashboard attention', title:'Dashboard operational counts', state:'Four decisions need attention', action:'Start first decision', evidence:['Low stock','Unreceived returns and shortfalls','Unsettled delivered Orders'] },
  { id:'6.3', epic:6, kind:'proof', mode:'desktop', route:'proof/recognition', surface:'Recognition Basis coverage', title:'Recognition Basis on every profit figure', state:'All profit surfaces labelled', action:'Inspect surface audit', evidence:['Earned buckets by delivery date','Realized buckets by settlement date','No bare Profit label'] },
  { id:'6.4', epic:6, kind:'proof', mode:'desktop', route:'proof/completeness', surface:'Completeness coverage', title:'Completeness Indicator on every profit figure', state:'Exact gap explained', action:'Inspect missing records', evidence:['Based on N of M','Missing-cost Orders named','Recorded Expense total shown'] },
  { id:'6.5', epic:6, kind:'state', mode:'desktop', route:'home/role', surface:'Role-composed dashboard', title:'Role-composed dashboard', state:'Sales Staff view', action:'Compare with Owner', evidence:['Denied money items absent','Shared components, filtered payload','Labels reinforce amber and brass'] },

  { id:'7.1', epic:7, kind:'detail', mode:'desktop', route:'customer/history', surface:'Customer profile', title:'Customer profile and full history', state:'Complete relationship history', action:'Repeat a previous order', evidence:['Profile and contact details','Orders, payments and dues','Return and cancellation history'] },
  { id:'7.2', epic:7, kind:'report', mode:'phone', route:'customer/risk', surface:'Customer Risk Ratio', title:'Customer Risk Ratio', state:'Return rate plus Due history', action:'Explain this ratio', evidence:['Return rate and Due history formula','Input counts make arithmetic verifiable','Insufficient history shows no score'] },
  { id:'7.3', epic:7, kind:'form', mode:'phone', route:'dues/payment', surface:'Record Customer payment', title:'Customer Due and Customer Payment', state:'Part payment entered', action:'Record payment', evidence:['Remaining Due preview','Ageing bucket updates','Payment remains its own event'] },

  { id:'8.1', epic:8, kind:'detail', mode:'desktop', route:'supplier/history', surface:'Supplier profile', title:'Supplier profile and purchase history', state:'Trading relationship overview', action:'Open purchase record', evidence:['Contact and associated Products','Stock-In purchase history','Computed outstanding balance'] },
  { id:'8.2', epic:8, kind:'form', mode:'phone', route:'supplier/payment', surface:'Supplier payment', title:'Stock-In payment state and Supplier Payment', state:'Unpaid Stock-In selected', action:'Record supplier payment', evidence:['Paid or Unpaid per Stock-In','Ad-hoc payment event','Outstanding balance recomputes'] },

  { id:'9.1', epic:9, kind:'form', mode:'phone', route:'expenses/new', surface:'Add expense', title:'Expense entry', state:'Required fields complete', action:'Save expense', evidence:['Eight categories or custom','Date, amount and note','Filterable expense history'] },
  { id:'9.2', epic:9, kind:'report', mode:'desktop', route:'reports/profit-expenses', surface:'Expense effect on profit', title:'Expenses reduce profit on both bases', state:'Before-and-after comparison', action:'Open source expense', evidence:['Same period expense total','Earned profit reduced','Realized profit reduced'] },

  { id:'10.1', epic:10, kind:'proof', mode:'desktop', route:'proof/rendering', surface:'Bangla document pipeline', title:'Shared Bangla rendering pipeline', state:'PDF and image compared', action:'Inspect rendering fixture', evidence:['One HTML/CSS template set','WeasyPrint then rasterization','Bangla conjunct fixture passes'] },
  { id:'10.2', epic:10, kind:'list', mode:'desktop', route:'reports/all', surface:'All reports', title:'Nine reports with date filtering', state:'Nine report destinations', action:'Run selected report', evidence:['All nine reports named','Custom date range','Role-gated columns'] },
  { id:'10.3', epic:10, kind:'state', mode:'desktop', route:'reports/export-csv', surface:'CSV export', title:'CSV export for all nine reports', state:'Export contents previewed', action:'Download CSV', evidence:['Same columns as screen','Current date range','Capability-gated fields omitted'] },
  { id:'10.4', epic:10, kind:'state', mode:'desktop', route:'reports/export-pdf', surface:'Bangla PDF preview', title:'Bangla PDF export for three reports', state:'Profit Summary ready', action:'Download Bangla PDF', evidence:['Sales, Profit and COD Settlement','Shared rendering pipeline','Basis and completeness retained'] },
  { id:'10.5', epic:10, kind:'report', mode:'phone', route:'home/summary', surface:'Daily Summary digest', title:'Daily Summary digest', state:'Text and image ready', action:'Copy summary text', evidence:['Copyable Bangla text','Saveable rendered image','Orders, COD, basis and completeness'] },

  { id:'11.1', epic:11, kind:'detail', mode:'desktop', route:'audit/change', surface:'Audit entry', title:'Audit Entry on every financial and inventory change', state:'Before and after values', action:'Open affected record', evidence:['Exactly one entry per service call','Actor and timestamp','Before and after money or stock'] },
  { id:'11.2', epic:11, kind:'table', mode:'desktop', route:'audit/filters', surface:'Audit trail filters', title:'Audit trail view and filtering', state:'Member and operation applied', action:'Inspect selected entry', evidence:['Date range','Member and entity type','Operation with Role access'] },
  { id:'11.3', epic:11, kind:'flow', mode:'desktop', route:'audit/reverse', surface:'Compensating reversal', title:'Reversal via Compensating Entry for the seven operations', state:'Eligible entry selected', action:'Write compensating entry', evidence:['Exactly seven operation types','Original stays visible','Already-reversed and ineligible states blocked'] },

  { id:'12.1', epic:12, kind:'state', mode:'desktop', route:'ai/provider-states', surface:'Insight Provider states', title:'Insight Provider configuration and degradation', state:'Absent, failing and exhausted', action:'Compare provider outcomes', evidence:['Three states remain distinct','Numbered query fallback','Key remains server-side'] },
  { id:'12.2', epic:12, kind:'flow', mode:'phone', route:'ai/routing', surface:'Question routing', title:'Question Routing to ten Insight Queries', state:'Routed, withheld or unroutable', action:'Ask the question', evidence:['Bangla, Banglish and English','Exactly ten query destinations','Three outcome vocabulary'] },
  { id:'12.3', epic:12, kind:'report', mode:'phone', route:'ai/answer', surface:'Computed insight answer', title:'Insight Query answers from Business data', state:'Business-scoped answer', action:'Inspect source figures', evidence:['Same domain calculations','Role-filtered result','Allow-listed outbound payload'] },
  { id:'12.4', epic:12, kind:'state', mode:'desktop', route:'ai/validated-composition', surface:'Answer validation', title:'No-invented-number answer composition', state:'Altered numeral rejected', action:'Use safe template', evidence:['Computed figure set shown','Model draft comparison','Template fallback selected'] },
  { id:'12.5', epic:12, kind:'report', mode:'desktop', route:'ai/decomposition', surface:'Profit change decomposition', title:'Profit change decomposition', state:'Arithmetic drivers add exactly', action:'Open underlying report', evidence:['Revenue and cost movement','Expenses, courier charges and variances','Signed components equal total change'] }
];

const ONBOARDING = new Set(['1.2', '1.3', '1.4']);
const COMMIT = new Set([
  '1.2','1.3','1.4','1.7','1.8','2.1','2.2','2.3','3.1','3.2','3.3',
  '4.1','4.3','4.5','4.6','4.7','4.8','4.9','4.10','4.11','4.12','4.13',
  '4.16','4.17','4.18','4.19','4.20','4.21','5.1','5.2','5.3','5.4','5.6',
  '5.7','5.8','5.10','5.12','7.3','8.2','9.1','11.3'
]);
const EXPORT = new Set(['3.4', '10.3', '10.4', '10.5']);

const RESPONSIVE = {
  phone: '360px floor: one readable column, persistent state label, Role-composed bottom tabs, and a sticky footer only when the action commits.',
  desktop: 'Same application route and data model: a width-capped working column beside the 244px grouped rail; keyboard-friendly density without changing behavior.'
};

const VARIANTS = {
  '1.2': ['register','recovery-reveal','login','reset','replacement-code'],
  '1.4': ['generate-code','join','used-code'],
  '1.9': ['names-and-counts','forbidden-fields-absent'],
  '2.1': ['new-product','minimum-stock-unset','deactivated-history'],
  '5.2': ['courier-assignment','inventory-handoff-pack-slip'],
  '4.5': ['parsed','ambiguous-product','unparseable'],
  '4.8': ['allocation-preview','missing-cost','shortfall','already-confirmed'],
  '4.9': ['legal-next','illegal-transition','restricted-role'],
  '4.10': ['eligible','ineligible','cancelled-result'],
  '4.11': ['commercial-return','partial-receipt','resalable','damaged'],
  '4.14': ['phone-triage','filtered-results','empty-results'],
  '5.8': ['paid-short','manual-match','disposition-selected','confirm-effect'],
  '5.10': ['blocked','ready-to-close','closed'],
  '6.3': ['surface-audit','earned','realized'],
  '6.4': ['incomplete','gap-detail','complete'],
  '6.5': ['owner','sales-staff','inventory-staff'],
  '7.2': ['ratio','formula','insufficient-history'],
  '10.2': ['report-index','date-filter','role-filtered'],
  '10.5': ['summary','copy-text','save-image'],
  '11.3': ['eligible-seven','record-entry','audit-entry','toast-undo','already-reversed','ineligible'],
  '12.1': ['configured','absent','failing','exhausted'],
  '12.2': ['query-list','routing','routed','withheld','unroutable']
};

window.SMARTBIZ_SCREEN_MAP = RAW_SCREENS.map(raw => {
  const { mode, route, action, evidence, ...story } = raw;
  const proofs = evidence.map((label, index) => ({
    id: `${raw.id}-proof-${index + 1}`,
    label,
    locator: `[data-proof-id="${raw.id}-proof-${index + 1}"]`
  }));
  const names = VARIANTS[raw.id] || ['primary'];
  return {
    ...story,
    primaryMode: mode,
    secondaryMode: mode === 'phone' ? 'desktop' : 'phone',
    responsive: RESPONSIVE[mode],
    shell: raw.kind === 'proof' ? 'proof' : ONBOARDING.has(raw.id) ? 'onboarding' : 'app',
    appRoute: `/${route}`,
    mockupHash: `#story/${raw.id}`,
    prototypeJourneyUrl: `../../../../../prototype/index.html#/journeys/${raw.id}`,
    actionModel: {
      kind: COMMIT.has(raw.id) ? 'commit' : EXPORT.has(raw.id) ? 'export' : raw.kind === 'proof' ? 'inspect' : 'navigate',
      label: action,
      sticky: COMMIT.has(raw.id)
    },
    proofs,
    variants: names.map((name, index) => ({
      id: `${raw.id}-${name}`,
      label: name.replaceAll('-', ' '),
      state: index === 0 ? raw.state : name.replaceAll('-', ' '),
      proofIds: (names.length <= 3
        ? proofs.filter((_, proofIndex) => proofIndex % names.length === index)
        : [proofs[index % 3]]).map(proof => proof.id)
    }))
  };
});
