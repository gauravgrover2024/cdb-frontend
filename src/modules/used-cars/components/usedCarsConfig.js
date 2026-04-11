export const USED_CARS_NAV = [
  {
    key: 'overview',
    label: 'Overview',
    path: '/used-cars',
    icon: 'LayoutDashboard',
    description: 'Operating view across intake, work-in-progress, stock, and retail velocity',
  },
  {
    key: 'procurement',
    label: 'Procurement',
    path: '/used-cars/procurement',
    icon: 'SearchCheck',
    description: 'Source cars, inspect opportunities, and lock the right acquisition price',
  },
  {
    key: 'refurb',
    label: 'Refurb',
    path: '/used-cars/refurb',
    icon: 'Wrench',
    description: 'Move cars through workshop, approvals, and cosmetic readiness',
  },
  {
    key: 'sale',
    label: 'Sale',
    path: '/used-cars/sale',
    icon: 'BadgeIndianRupee',
    description: 'Track live listings, negotiations, conversions, and retail realization',
  },
  {
    key: 'stock',
    label: 'Stock',
    path: '/used-cars/stock',
    icon: 'CarFront',
    description: 'Inventory pulse across ageing, pricing posture, and capital parked in stock',
  },
];

export const USED_CAR_JOURNEY_PHASES = [
  {
    key: 'intake',
    title: 'Lead Intake',
    description: 'Capture seller intent, owner identity, and vehicle basics before a field team is deployed.',
    accent: 'sky',
    modules: ['overview', 'procurement'],
    stages: [
      {
        id: 'lead-details',
        step: '01',
        title: 'Lead Details',
        owner: 'Procurement',
        gate: 'Seller identity, source, location, and callback context recorded',
      },
      {
        id: 'car-details',
        step: '02',
        title: 'Car Details',
        owner: 'Procurement',
        gate: 'Registration, make-model, ownership, usage, and asking price captured',
      },
    ],
  },
  {
    key: 'evaluation',
    title: 'Evaluation & Price Discovery',
    description: 'Inspect the vehicle, gather quotes, interpret the result, and shape the walk-away or buy-side ceiling.',
    accent: 'emerald',
    modules: ['overview', 'procurement'],
    stages: [
      {
        id: 'inspection-done',
        step: '03',
        title: 'Inspection Done',
        owner: 'Inspection Desk',
        gate: 'Condition, accident history, photos, and marketability captured',
      },
      {
        id: 'quotes',
        step: '04',
        title: 'Quotes',
        owner: 'Pricing Desk',
        gate: 'Trade, retail, and recon-aware quotes generated',
      },
      {
        id: 'inspection-result',
        step: '05',
        title: 'Inspection Result',
        owner: 'Procurement',
        gate: 'Qualified, hold, or reject decision recorded',
      },
      {
        id: 'final-negotiation',
        step: '06',
        title: 'Final Negotiation',
        owner: 'Procurement Lead',
        gate: 'Seller agrees on final commercials and dependencies',
      },
    ],
  },
  {
    key: 'deal-lock',
    title: 'Deal Lock & Seller Settlement',
    description: 'Secure commitment, execute the agreement, and complete the customer-side payout cleanly.',
    accent: 'violet',
    modules: ['overview', 'procurement'],
    stages: [
      {
        id: 'token-received',
        step: '07',
        title: 'Receipt of Token from Vendor',
        owner: 'Procurement Ops',
        gate: 'Token received and acknowledged against the agreed buy price',
      },
      {
        id: 'agreement',
        step: '08',
        title: 'Agreement',
        owner: 'Procurement Ops',
        gate: 'Vehicle Purchase Agreement and supporting mandates signed',
      },
      {
        id: 'payment-to-customer',
        step: '09',
        title: 'Payment to Customer',
        owner: 'Finance',
        gate: 'Vendor payment released with audit trail and bank proof',
      },
    ],
  },
  {
    key: 'inventory-control',
    title: 'Inventory Control',
    description: 'Bring the unit into stock, branch into refurb where needed, and keep vendor settlement aligned.',
    accent: 'amber',
    modules: ['overview', 'refurb', 'stock'],
    stages: [
      {
        id: 'stock-in',
        step: '10',
        title: 'Stock-In',
        owner: 'Stock Desk',
        gate: 'Vehicle physically inwarded with delivery acknowledgement and yard tagging',
      },
      {
        id: 'balance-payment',
        step: '11',
        title: 'Receipt of Balance Payment from Vendor',
        owner: 'Finance / Stock',
        gate: 'Pending seller-side settlement, holds, and deductions reconciled',
      },
    ],
    overlay: {
      title: 'Refurb Overlay',
      detail: 'When a procured car requires recon, it branches into Refurb after Stock-In and rejoins the journey only once it is retail-ready.',
    },
  },
  {
    key: 'retail-close',
    title: 'Retail Exit & Compliance',
    description: 'Move the car out of stock, complete transfer compliance, and formally close the lead journey.',
    accent: 'rose',
    modules: ['overview', 'sale', 'stock'],
    stages: [
      {
        id: 'stock-out',
        step: '12',
        title: 'Stock-Out',
        owner: 'Sales / Stock',
        gate: 'Vehicle sold or released to the next owner with delivery completion',
      },
      {
        id: 'rc-transfer-status',
        step: '13',
        title: 'RC Transfer Status',
        owner: 'RTO Desk',
        gate: 'RC transfer tracked until completion or exception closure',
      },
      {
        id: 'lead-closed',
        step: '14',
        title: 'Lead Closed',
        owner: 'Ops Control',
        gate: 'Commercials, transfer, and document obligations completed',
      },
    ],
  },
];

export const USED_CAR_MODULE_BLUEPRINT = [
  {
    key: 'procurement',
    label: 'Procurement',
    summary: 'Owns sourcing, qualification, negotiation, agreement, and seller payment.',
    stages: ['01', '02', '03', '04', '05', '06', '07', '08', '09'],
  },
  {
    key: 'refurb',
    label: 'Refurb',
    summary: 'Owns the workshop branch after stock-in and before the vehicle becomes retail-ready.',
    stages: ['10*'],
  },
  {
    key: 'stock',
    label: 'Stock',
    summary: 'Owns inwarding, yard control, ageing, settlement follow-through, and inventory posture.',
    stages: ['10', '11', '12'],
  },
  {
    key: 'sale',
    label: 'Sale',
    summary: 'Owns retail exit, buyer handoff, RC transfer follow-up, and final closure discipline.',
    stages: ['12', '13', '14'],
  },
];

export const USED_CAR_JOURNEY_CASES = [
  {
    unit: '2019 Hyundai Creta SX',
    source: 'Repeat seller | East Delhi',
    activeStage: 'Final Negotiation',
    nextAction: 'Seller counter within ceiling by 5 PM',
    owner: 'Procurement Lead',
    module: 'procurement',
  },
  {
    unit: '2021 Maruti Baleno Alpha',
    source: 'Marketplace | Gurgaon',
    activeStage: 'Agreement',
    nextAction: 'Third-party mandate and token receipt pending',
    owner: 'Procurement Ops',
    module: 'procurement',
  },
  {
    unit: '2020 Kia Seltos HTX',
    source: 'Dealer referral',
    activeStage: 'Stock-In',
    nextAction: 'Refurb scope approval and inward photos',
    owner: 'Stock Desk',
    module: 'stock',
  },
  {
    unit: '2018 Honda Amaze VX',
    source: 'In stock 47 days',
    activeStage: 'RC Transfer Status',
    nextAction: 'Buyer file submitted, transfer acknowledgment awaited',
    owner: 'RTO Desk',
    module: 'sale',
  },
];

const sharedPulse = [
  {
    label: 'Cars in system',
    value: '142',
    delta: '+11 this month',
    tone: 'slate',
  },
  {
    label: 'Capital deployed',
    value: 'Rs 4.82 Cr',
    delta: '72% parked in active stock',
    tone: 'sky',
  },
  {
    label: 'Retail realization',
    value: '89.4%',
    delta: '+3.2 pts vs last month',
    tone: 'emerald',
  },
  {
    label: 'Ageing risk',
    value: '19 units',
    delta: 'Over 45 days in stock',
    tone: 'amber',
  },
];

const flowStages = {
  overview: [
    { name: 'Leads screened', count: 86, subtext: '12 awaiting field inspection', progress: 82, accent: 'from-sky-500 to-cyan-400' },
    { name: 'Cars procured', count: 31, subtext: '8 landed this week', progress: 61, accent: 'from-violet-500 to-fuchsia-400' },
    { name: 'Refurb in motion', count: 24, subtext: '5 blocked on parts approval', progress: 49, accent: 'from-amber-500 to-orange-400' },
    { name: 'Retail ready', count: 54, subtext: '16 listed in the last 10 days', progress: 74, accent: 'from-emerald-500 to-lime-400' },
  ],
  procurement: [
    { name: 'Fresh leads', count: 52, subtext: 'Clustered across NCR and Jaipur', progress: 78, accent: 'from-sky-500 to-blue-400' },
    { name: 'Inspections due', count: 18, subtext: '6 due in the next 24 hours', progress: 43, accent: 'from-cyan-500 to-teal-400' },
    { name: 'Negotiation open', count: 9, subtext: '2 above target buy price', progress: 56, accent: 'from-violet-500 to-indigo-400' },
    { name: 'Deals locked', count: 7, subtext: 'Avg margin runway 13.8%', progress: 63, accent: 'from-emerald-500 to-green-400' },
  ],
  refurb: [
    { name: 'Workshop queued', count: 11, subtext: '4 require estimator review', progress: 51, accent: 'from-amber-500 to-yellow-400' },
    { name: 'Mechanical work', count: 8, subtext: '3 due for QA sign-off', progress: 64, accent: 'from-orange-500 to-amber-400' },
    { name: 'Cosmetic finish', count: 6, subtext: 'Paint and detailing in progress', progress: 47, accent: 'from-rose-500 to-orange-400' },
    { name: 'Retail handoff', count: 5, subtext: 'Ready for photography and listing', progress: 71, accent: 'from-emerald-500 to-teal-400' },
  ],
  sale: [
    { name: 'Cars listed', count: 38, subtext: 'Across showroom, web, and channel partners', progress: 74, accent: 'from-sky-500 to-indigo-400' },
    { name: 'Hot leads', count: 21, subtext: '9 repeat follow-ups due today', progress: 58, accent: 'from-violet-500 to-fuchsia-400' },
    { name: 'Negotiations', count: 12, subtext: '4 need manager approval on pricing', progress: 62, accent: 'from-amber-500 to-orange-400' },
    { name: 'Closures', count: 17, subtext: 'Average closure cycle 11.2 days', progress: 79, accent: 'from-emerald-500 to-lime-400' },
  ],
  stock: [
    { name: 'Fresh stock', count: 23, subtext: '0-15 day holding window', progress: 67, accent: 'from-sky-500 to-cyan-400' },
    { name: 'Core stock', count: 66, subtext: 'Healthy listing window', progress: 76, accent: 'from-violet-500 to-indigo-400' },
    { name: 'Attention zone', count: 34, subtext: '31-45 day inventory ageing', progress: 52, accent: 'from-amber-500 to-orange-400' },
    { name: 'Risk stock', count: 19, subtext: 'Needs repricing or faster channel push', progress: 34, accent: 'from-rose-500 to-red-400' },
  ],
};

const moduleMetrics = {
  overview: [
    ...sharedPulse,
  ],
  procurement: [
    { label: 'Target buy spread', value: 'Rs 38.4L', delta: 'Across 9 live deals', tone: 'sky' },
    { label: 'Inspection SLA', value: '6.4 hrs', delta: 'Median lead-to-inspection', tone: 'emerald' },
    { label: 'Walk-away ratio', value: '27%', delta: 'Mostly on accident history', tone: 'amber' },
    { label: 'Lead hit-rate', value: '13.7%', delta: 'Lead to procured car', tone: 'violet' },
  ],
  refurb: [
    { label: 'Workshop WIP', value: '24 cars', delta: 'Rs 18.6L parts + labour', tone: 'amber' },
    { label: 'Avg refurb cycle', value: '8.2 days', delta: 'Improved by 1.4 days', tone: 'emerald' },
    { label: 'Blocked jobs', value: '5 cars', delta: 'Waiting for approvals or parts', tone: 'rose' },
    { label: 'QA pass rate', value: '92%', delta: 'First-pass retail readiness', tone: 'sky' },
  ],
  sale: [
    { label: 'Live retail book', value: 'Rs 3.16 Cr', delta: 'Across 38 listed cars', tone: 'sky' },
    { label: 'Gross margin locked', value: 'Rs 42.8L', delta: 'Open and closed deals combined', tone: 'emerald' },
    { label: 'Negotiation drag', value: '4 deals', delta: 'Need pricing decision', tone: 'amber' },
    { label: 'Test-drive to close', value: '41%', delta: 'Trailing 30-day average', tone: 'violet' },
  ],
  stock: [
    { label: 'Stock value', value: 'Rs 4.82 Cr', delta: 'On books right now', tone: 'sky' },
    { label: 'Ageing > 45 days', value: '19 units', delta: 'Requires liquidation plan', tone: 'rose' },
    { label: 'Average holding', value: '27 days', delta: 'Across entire yard', tone: 'amber' },
    { label: 'Repricing candidates', value: '12 units', delta: 'Spread above market median', tone: 'violet' },
  ],
};

const attentionFeed = {
  overview: [
    { title: 'Cars entering risk ageing faster than retail exits', detail: 'Mahindra XUV700, Hyundai Creta, and two Baleno units crossed 40+ days with light inquiry depth.', severity: 'warning' },
    { title: 'Procurement yield is strongest in repeat seller channels', detail: 'Dealer referrals are converting at 2.3x compared to marketplace leads this week.', severity: 'info' },
    { title: 'Workshop capacity is the current throttle', detail: 'Five cars are margin-ready but waiting for paint approval or final photography slot.', severity: 'critical' },
  ],
  procurement: [
    { title: 'Raise ceiling for premium SUVs selectively', detail: 'Fortuner and XUV700 inventory is selling faster than forecast with enough margin cushion to stretch buy price.', severity: 'info' },
    { title: 'Avoid two high-km diesel lots', detail: 'Expected recon cost is clipping margin under target by more than 3 points.', severity: 'warning' },
    { title: 'Speed up inspection dispatch today', detail: 'Six strong leads will age out by evening if field evaluation is delayed.', severity: 'critical' },
  ],
  refurb: [
    { title: 'Paint booth is a bottleneck', detail: 'Three cars cleared mechanically but cannot move to sale because cosmetic finish is blocked.', severity: 'warning' },
    { title: 'Parts approvals need faster closure', detail: 'Two units are carrying idle capital for less than Rs 18k worth of pending approvals.', severity: 'critical' },
    { title: 'QA pass rate supports a faster photography SLA', detail: 'Retail-ready cars can be listed the same day with a tighter handoff protocol.', severity: 'info' },
  ],
  sale: [
    { title: 'Three hot leads need deal desk attention', detail: 'Price decision lag is likely to push closures into next week.', severity: 'critical' },
    { title: 'Retail margin is healthiest on compact SUVs', detail: 'Creta, Seltos, and Brezza mix is outperforming sedans by 4.6 points.', severity: 'info' },
    { title: 'Listing freshness is driving lead velocity', detail: 'Cars shot and listed within 48 hours are getting 1.8x higher inquiry rate.', severity: 'warning' },
  ],
  stock: [
    { title: 'Reprice 12 units before weekend traffic', detail: 'These cars sit above market median with shallow lead volume and rising holding costs.', severity: 'critical' },
    { title: 'Capital concentration is high in premium diesel stock', detail: 'Four units account for 18% of deployed capital and need sharper merchandising.', severity: 'warning' },
    { title: 'Fast movers deserve deeper replenishment', detail: 'Compact SUV mix is turning quickly and can absorb more procurement weight.', severity: 'info' },
  ],
};

const boardByModule = {
  overview: [
    { lane: 'Immediate actions', items: ['Approve 5 refurb estimates', 'Price reset for 3 ageing SUVs', 'Dispatch inspection team to 6 hot leads'] },
    { lane: 'This week', items: ['List 8 ready cars', 'Close 4 live negotiations', 'Review procurement source hit-rate'] },
    { lane: 'Management focus', items: ['Capital deployed vs retail exits', 'Workshop cycle compression', 'Ageing risk liquidation plan'] },
  ],
  procurement: [
    { lane: 'Hot leads', items: ['2019 Creta SX(O) petrol', '2021 Baleno Alpha CVT', '2020 Venue SX diesel'] },
    { lane: 'Negotiation desk', items: ['Fortuner asking above ceiling', 'Brezza seller ready for same-day closure', 'City V CVT awaiting RC verification'] },
    { lane: 'Source review', items: ['Repeat seller network up 2.3x', 'Marketplace quality drifting down', 'Need more corporate fleet intros'] },
  ],
  refurb: [
    { lane: 'Mechanical', items: ['Brake set and suspension on Creta', 'AC + compressor on Baleno', 'Clutch pack on Venue'] },
    { lane: 'Cosmetic', items: ['Paint booth slot for XUV300', 'Detailing + touch-up on i20', 'Interior deep clean on Amaze'] },
    { lane: 'Release queue', items: ['Photography slot for Seltos', 'Listing copy for City ZX', 'Retail QA closeout for Brezza'] },
  ],
  sale: [
    { lane: 'Live deals', items: ['Creta buyer wants same-day delivery', 'Venue lead waiting for finance nod', 'Fortuner negotiation at final offer'] },
    { lane: 'Retail push', items: ['Weekend digital push on compact SUVs', 'Refresh photography for 3 slow movers', 'Channel blast for sedans under Rs 8L'] },
    { lane: 'Manager review', items: ['Approve price drop on 2 diesel units', 'Margin guardrails for trade-ins', 'Salesperson callback compliance'] },
  ],
  stock: [
    { lane: 'Fresh stock', items: ['7 units need photography', '3 need detailing closeout', '4 ready for premium placement'] },
    { lane: 'Ageing action', items: ['Liquidation list for 19 units', 'Dealer-offload options', 'Price reset review by Friday'] },
    { lane: 'Capital plan', items: ['Rebalance into faster-turn SUVs', 'Cap diesel exposure', 'Raise margin threshold on slow segments'] },
  ],
};

const ledgerRows = {
  overview: [
    { unit: 'Maruti Brezza ZXi 2021', stage: 'Retail ready', age: '18 days', owner: 'Retail desk', value: 'Rs 9.4L', note: 'Freshly photographed and priced aggressively' },
    { unit: 'Hyundai Creta SX 2020', stage: 'Negotiation open', age: '27 days', owner: 'Procurement / Sales', value: 'Rs 12.8L', note: 'Hot lead but pricing decision pending' },
    { unit: 'Mahindra XUV300 W8 2019', stage: 'Refurb QA', age: '11 days', owner: 'Workshop', value: 'Rs 8.7L', note: 'Ready after brake and paint sign-off' },
    { unit: 'Honda Amaze VX 2018', stage: 'Ageing attention', age: '49 days', owner: 'Stock desk', value: 'Rs 6.2L', note: 'Needs repricing before weekend' },
  ],
  procurement: [
    { unit: 'Hyundai Venue SX 2020', stage: 'Inspection due', age: 'Lead age 9h', owner: 'Field team', value: 'Target buy Rs 8.9L', note: 'Seller available only till evening' },
    { unit: 'Toyota Glanza V 2021', stage: 'Negotiation open', age: '2 days', owner: 'Procurement lead', value: 'Target buy Rs 7.6L', note: 'Margin strong if recon stays under Rs 22k' },
    { unit: 'Kia Seltos HTX 2020', stage: 'Deal locked', age: 'Same-day closure', owner: 'Sourcing desk', value: 'Buy locked Rs 11.7L', note: 'Awaiting inward documentation' },
  ],
  refurb: [
    { unit: 'Hyundai i20 Asta 2019', stage: 'Paint + detailing', age: '3 workshop days', owner: 'Cosmetic team', value: 'Budget Rs 24k', note: 'Retail-ready after touch-up and photography' },
    { unit: 'Honda City ZX 2018', stage: 'QA pending', age: '7 workshop days', owner: 'Workshop supervisor', value: 'Budget Rs 31k', note: 'Waiting on final brake road test' },
    { unit: 'Maruti Baleno Alpha 2021', stage: 'Parts approval', age: '2 workshop days', owner: 'Ops manager', value: 'Budget Rs 18k', note: 'Stalled only on final approval' },
  ],
  sale: [
    { unit: 'Kia Sonet HTK Plus 2022', stage: 'Hot lead', age: '5 listing days', owner: 'Retail desk', value: 'Ask Rs 10.6L', note: 'Test drive completed, finance docs awaited' },
    { unit: 'Hyundai Creta SX 2020', stage: 'Negotiation', age: '27 stock days', owner: 'Sales manager', value: 'Ask Rs 12.8L', note: 'Customer counter-offer within 1.3%' },
    { unit: 'Toyota Fortuner 2018', stage: 'Deal desk', age: '34 stock days', owner: 'Senior RM', value: 'Ask Rs 24.9L', note: 'Requires decision on final margin floor' },
  ],
  stock: [
    { unit: 'Honda Amaze VX 2018', stage: 'Ageing 49 days', age: '49 days', owner: 'Stock desk', value: 'Market gap -Rs 22k', note: 'Candidate for immediate repricing' },
    { unit: 'Maruti Ciaz Alpha 2019', stage: 'Ageing 42 days', age: '42 days', owner: 'Stock desk', value: 'Market gap -Rs 18k', note: 'Low inquiry depth despite good condition' },
    { unit: 'Hyundai Venue SX 2020', stage: 'Fresh stock', age: '7 days', owner: 'Retail desk', value: 'Healthy spread', note: 'Strong chance of fast retail exit' },
  ],
};

export const USED_CARS_CONTENT = {
  overview: {
    title: 'Used Cars Control Tower',
    subtitle: 'One operating lens for sourcing, workshop throughput, stock ageing, and retail realization.',
    accent: 'sky',
    kicker: 'Integrated used-car desk',
    metrics: moduleMetrics.overview,
    flow: flowStages.overview,
    attention: attentionFeed.overview,
    board: boardByModule.overview,
    ledger: ledgerRows.overview,
  },
  procurement: {
    title: 'Procurement Dashboard',
    subtitle: 'Source faster, inspect smarter, and protect buy-side margin before stock lands in the yard.',
    accent: 'emerald',
    kicker: 'Buy-side command',
    metrics: moduleMetrics.procurement,
    flow: flowStages.procurement,
    attention: attentionFeed.procurement,
    board: boardByModule.procurement,
    ledger: ledgerRows.procurement,
  },
  refurb: {
    title: 'Refurb Dashboard',
    subtitle: 'Track workshop throughput, approval bottlenecks, and the handoff from recon to retail-ready.',
    accent: 'amber',
    kicker: 'Workshop command',
    metrics: moduleMetrics.refurb,
    flow: flowStages.refurb,
    attention: attentionFeed.refurb,
    board: boardByModule.refurb,
    ledger: ledgerRows.refurb,
  },
  sale: {
    title: 'Sale Dashboard',
    subtitle: 'Run listings, negotiations, closure pace, and retail margin from one decision surface.',
    accent: 'violet',
    kicker: 'Retail command',
    metrics: moduleMetrics.sale,
    flow: flowStages.sale,
    attention: attentionFeed.sale,
    board: boardByModule.sale,
    ledger: ledgerRows.sale,
  },
  stock: {
    title: 'Stock Dashboard',
    subtitle: 'See capital parked in inventory, ageing risk, repricing needs, and where stock turns faster.',
    accent: 'rose',
    kicker: 'Inventory command',
    metrics: moduleMetrics.stock,
    flow: flowStages.stock,
    attention: attentionFeed.stock,
    board: boardByModule.stock,
    ledger: ledgerRows.stock,
  },
};

export const TONE_CLASS = {
  slate: {
    value: 'text-slate-900 dark:text-slate-100',
    glow: 'from-slate-500/18 via-slate-400/6 to-transparent',
    chip: 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900',
  },
  sky: {
    value: 'text-sky-700 dark:text-sky-300',
    glow: 'from-sky-500/18 via-cyan-400/8 to-transparent',
    chip: 'bg-sky-600 text-white',
  },
  emerald: {
    value: 'text-emerald-700 dark:text-emerald-300',
    glow: 'from-emerald-500/18 via-lime-400/8 to-transparent',
    chip: 'bg-emerald-600 text-white',
  },
  amber: {
    value: 'text-amber-700 dark:text-amber-300',
    glow: 'from-amber-500/18 via-orange-400/8 to-transparent',
    chip: 'bg-amber-500 text-white',
  },
  violet: {
    value: 'text-violet-700 dark:text-violet-300',
    glow: 'from-violet-500/18 via-fuchsia-400/8 to-transparent',
    chip: 'bg-violet-600 text-white',
  },
  rose: {
    value: 'text-rose-700 dark:text-rose-300',
    glow: 'from-rose-500/18 via-orange-400/8 to-transparent',
    chip: 'bg-rose-600 text-white',
  },
};
