     1|## ChamaVault Build Plan
     2|
     3|## PHASE 1: STABILIZE
     4|- [x] Build passes, auth works
     5|
     6|## PHASE 2: CHAMA SETUP
     7|- [x] Landing page: Swahili + English, "Simamia Chama Yako Vizuri" headline, feature list, KES pricing, WhatsApp demo CTA
     8|- [x] Create/join chama flow: chairperson creates chama (name, meeting day, contribution amount, frequency)
     9|- [x] Member invitation: chairperson invites by email or phone → members receive link to join
    10|- [x] Member roles: Chairperson, Treasurer, Secretary, Member
    11|- [x] Chama profile: name, photo, founding date, objectives, bank/M-Pesa account info
    12|
    13|## PHASE 3: FINANCIAL MANAGEMENT — CORE
    14|- [x] Contribution tracker: per member, per month — paid/pending/overdue status
    15|- [x] Record contribution: treasurer selects member + month + amount → log to DB
    16|- [x] M-Pesa contribution: member pays via M-Pesa, treasurer confirms receipt
    17|- [x] Contribution summary: table showing all members × all months grid (like a school fees tracker)
    18|- [x] Treasury balance: running total of all contributions minus loans minus expenses
    19|- [x] Fine management: add fine to member (missed meeting, late contribution), track paid/unpaid
    20|- [x] Expense log: record chama expenses (venue, snacks, admin costs) with receipts
    21|
    22|## PHASE 4: LOANS & DIVIDENDS
    23|- [x] Loan applications: member applies, committee votes (approve/reject), disbursement recorded
    24|- [x] Loan repayment: track monthly repayments, outstanding balance, interest accrued
    25|- [x] Dividend calculator: at year-end, calculate each member's share based on contributions
    26|- [x] Dividend distribution: record that dividends were paid out to each member
    27|
    28|## PHASE 5: MEETINGS & GOVERNANCE
    29|- [x] Meeting scheduler: create meeting (date, agenda, venue)
    30|- [x] Attendance register: check off members present/absent per meeting
    31|- [x] Meeting minutes: textarea to record minutes, PDF export
    32|- [x] Voting: create a resolution, members vote yes/no, results recorded
    33|
    34|## PHASE 6: COMMUNICATION
    35|- [x] WhatsApp reminders: generate wa.me link with contribution reminder message per member
    36|- [x] Email notifications: contribution due reminder, meeting reminder, loan approval notice
    37|- [x] Monthly statement: PDF statement per member showing their contributions, loans, balance
    38|
    39|## PHASE 7: TESTING & POLISH
    40|- [x] Mobile-first CSS (most users on Android, small screens) — test at 360px
    41|- [x] Swahili language option (static, just Swahili strings for key UI text)
    42|- [x] Unit tests: contribution calculations, loan balance tracking, dividend splits
    43|- [x] Lighthouse ≥85
    44|
    45|## PHASE 8: ADVANCED
    46|- [x] Chama constitution: upload/store PDF constitution document
    47|- [x] Investment tracker: record chama's investments (property, stock, business) with current value
    48|- [x] Multi-chama: one user can be treasurer for multiple chamas
    49|- [x] Public chama page: read-only page shareable with potential members
    50|- [x] Automated SMS: integrate Africa's Talking API for SMS reminders
    51|
    52|## PHASE 7: PRODUCTION HARDENING
    53|- [x] npm run build: zero errors, zero warnings
    54|- [x] npx tsc --noEmit: zero errors
    55|- [x] All KES amounts: Intl.NumberFormat('en-KE', {style:'currency', currency:'KES'}) — never raw numbers
    56|- [x] Mobile audit at 360px (Infinix/Tecno screen size): every page usable — tables scroll horizontally
    57|- [x] Add loading.tsx and error.tsx to all routes
    58|- [x] Contribution matrix: test with 8 members × 12 months — must render without overflow on mobile
    59|- [x] WhatsApp reminder links: test that wa.me URLs open correctly with pre-filled Swahili message
    60|- [x] Add Open Graph tags + robots.txt
    61|
    62|## PHASE 8: FINANCIAL CALCULATIONS — GET THEM PERFECT
    63|- [x] Treasury balance: implement getTreasuryBalance(chamaId) in src/lib/treasury.ts
    64|- [x] Loan outstanding balance per member: principal + (principal × interest_rate × months_elapsed / 12) - total_repaid
    65|- [x] Arrears calculation: for each member, sum of (amount_due - amount_paid) across all months where amount_paid < amount_due
    66|- [x] Total chama worth: treasury_balance + outstanding_loan_values (money owed TO the chama)
    67|- [x] Per-member equity: (member.share_units / total_share_units) × treasury_balance
    68|- [x] Dividend distribution calculator: at year-end, calculates each member's payout — show as table, exportable
    69|
    70|## PHASE 9: PDF GENERATION — STATEMENTS & MINUTES
    71|- [x] Monthly contribution statement PDF per member
    72|- [x] Meeting minutes PDF
    73|- [x] Annual report PDF
    74|
    75|## PHASE 10: COMMUNICATION SYSTEM
    76|- [x] Bulk WhatsApp reminders
    77|- [x] Contribution due reminder email via Resend
    78|- [x] New member welcome email
    79|- [x] Loan approval notification email
    80|- [x] Payment received notification
    81|
    82|## PHASE 11: MEMBER PORTAL
    83|- [x] /portal/[chamaId] — member self-service portal (no account needed)
    84|- [x] Member enters phone number → sees their personal dashboard
    85|- [x] Generate personal statement PDF button on portal
    86|- [x] Share portal link: treasurer copies link for each member, shares via WhatsApp
    87|
    88|## PHASE 12: ADVANCED FEATURES
    89|- [x] Chama constitution: upload PDF and store in Supabase storage — view button for all members
    90|- [x] Investment tracker: record chama investments with current value, date acquired
    91|- [x] Investment portfolio total on dashboard: sum of all investment current values
    92|- [x] Multi-chama: user can create or join multiple chamas — selector on login
    93|- [x] Africa's Talking SMS integration stub: src/lib/sms.ts with sendSMS()
    94|- [x] Backup/export: "Export all chama data" button → generates comprehensive JSON/CSV zip download
    95|
    96|## PHASE 13: LAUNCH PREP
    97|- [x] Swahili strings audit: i18n context with English/Kiswahili dictionary
    98|- [x] Seed data: "Wema Savings Group" fully populated — 8 members, 12 months history, 2 loans, 3 expenses, 2 past meetings
    99|- [x] Write unit tests: treasury balance, loan outstanding, arrears — all 45 tests pass
   100|- [x] README.md in Swahili + English
   101|- [x] DEPLOY.md with step-by-step Vercel + Supabase setup
   102|- [x] Pricing page: KES 500/1000/2000 plans with Stripe checkout in KES currency
   103|
   104|
   105|## PHASE 14: SACCO COMPLIANCE MODULE
   106|- [x] Research Kenya Sacco Societies Regulatory Authority (SASRA) requirements — document in src/lib/sasra-compliance.md
   107|- [x] Add compliance_type field to chamas table: 'informal_chama' | 'registered_group' | 'sacco'
   108|- [x] SACCO mode: when compliance_type='sacco', unlock additional fields: registration_number, sasra_license, auditor_name
   109|- [ ] Mandatory fields for SACCO: board_members table (chairman, treasurer, secretary, 2 directors), annual_returns table
   110|- [ ] Compliance checklist page /dashboard/[chamaId]/compliance: checklist of SASRA requirements with status
   111|- [ ] AGM (Annual General Meeting) module: schedule AGM, track agenda, record resolutions, generate AGM minutes PDF
   112|- [ ] External audit trail: every financial transaction immutable (no edit/delete — only reversals with notes)
   113|
   114|## PHASE 15: INVESTMENT PORTFOLIO TRACKER
   115|- [ ] investments table: id, chama_id, name, type (land/stock/business/bond/fixed_deposit), amount_invested, current_value, date_acquired, maturity_date, return_rate, notes
   116|- [ ] Investments page /dashboard/[chamaId]/investments: cards per investment with current value, gain/loss, ROI %
   117|- [ ] Add investment form: all fields, receipt/document upload to Supabase storage
   118|- [ ] Portfolio summary: total invested, total current value, total gain/loss, best performer
   119|- [ ] Line chart: portfolio value over time (use monthly snapshots stored in investment_snapshots table)
   120|- [ ] Investment performance vs treasury growth comparison chart
   121|- [ ] Land valuation: for property investments, store acquisition price + area + location + current estimate
   122|
   123|## PHASE 16: WHATSAPP BUSINESS API INTEGRATION
   124|- [ ] Research Meta WhatsApp Business API Cloud API — document setup in src/lib/whatsapp-api-spec.md
   125|- [ ] Create src/lib/whatsapp.ts: sendMessage(phone, message), sendTemplate(phone, templateName, params)
   126|- [ ] If WHATSAPP_API_TOKEN in env: send real WhatsApp messages. If not: open wa.me link (existing fallback)
   127|- [ ] Automated contribution reminder flow: 3 days before meeting → auto-send WhatsApp to all unpaid members
   128|- [ ] Loan repayment reminder: 5 days before due date → WhatsApp reminder to borrower
   129|- [ ] Payment confirmation: when contribution recorded → instant WhatsApp receipt to member
   130|- [ ] New member welcome: when member added → WhatsApp with chama details and first contribution date
   131|- [ ] Monthly statement: WhatsApp with "Your ChamaVault statement is ready" + link to portal
   132|
   133|## PHASE 17: MULTI-CHAMA FEDERATION
   134|- [ ] federations table: id, name, created_by, treasurer_id — umbrella organization for multiple chamas
   135|- [ ] federation_chamas table: federation_id, chama_id, joined_at
   136|- [ ] /dashboard/federation page: overview of all chamas in a federation
   137|- [ ] Federation treasurer view: see aggregate financials across all chamas (total members, total savings, total loans)
   138|- [ ] Inter-chama loans: federation can lend to individual chamas from federation pool
   139|- [ ] Federation reports: PDF report covering all member chamas — useful for umbrella investment groups
   140|
   141|## PHASE 18: MOBILE APP PLANNING & PWA
   142|- [ ] Convert to PWA: add next-pwa package, configure manifest.json
   143|- [ ] manifest.json: app name "ChamaVault", short_name "Chama", theme_color: #f59e0b, icons (generate placeholders)
   144|- [ ] Service worker: cache static assets and last-loaded dashboard data for offline access
   145|- [ ] Install prompt: show "Add to Home Screen" banner on mobile browsers after 3rd visit
   146|- [ ] Offline mode: when offline, show cached data with "Offline" badge — no broken screens
   147|- [ ] Push notifications stub: create src/lib/push.ts with requestPermission(), sendNotification() functions
   148|- [ ] Document mobile app roadmap in MOBILE_ROADMAP.md: PWA now, React Native later
   149|
   150|## PHASE 19: KENYA MARKET LAUNCH PREP
   151|- [ ] Landing page: add "As seen in" section with placeholders for Business Daily, Nation Media, KBC
   152|- [ ] Testimonials: 3 real-sounding Kenyan testimonials (name, chama name, city, quote in mix of English/Swahili)
   153|- [ ] Pricing psychology: show "KES 1,000/mo = KES 33/day — cheaper than a cup of tea" comparison
   154|- [ ] Partnership page /partners: "Register your SACCO or Chama umbrella body as a ChamaVault partner"
   155|- [ ] Demo video placeholder: /demo page with placeholder for a 2-minute walkthrough video
   156|- [ ] WhatsApp business number section on landing: "Chat with us on WhatsApp" link
   157|- [ ] Mpesa till number section: "Pay via M-Pesa" with till number placeholder on pricing page
   158|- [ ] Press kit: logo, screenshots, founder bio, one-pager PDF about Kenya chama problem
   159|- [ ] LAUNCH_CHECKLIST.md: step-by-step Kenya go-live checklist
   160|- [ ] Product Hunt assets: tagline in Swahili + English, first comment, tagline: "Excel yako ya Chama imekufa — karibu ChamaVault"
   161|

## PHASE 14: SACCO COMPLIANCE MODULE
- [ ] Research Kenya Sacco Societies Regulatory Authority (SASRA) requirements — document in src/lib/sasra-compliance.md
- [ ] Add compliance_type field to chamas table: 'informal_chama' | 'registered_group' | 'sacco'
- [ ] SACCO mode: when compliance_type='sacco', unlock additional fields: registration_number, sasra_license, auditor_name
- [ ] Mandatory fields for SACCO: board_members table (chairman, treasurer, secretary, 2 directors), annual_returns table
- [ ] Compliance checklist page /dashboard/[chamaId]/compliance: checklist of SASRA requirements with status
- [ ] AGM (Annual General Meeting) module: schedule AGM, track agenda, record resolutions, generate AGM minutes PDF
- [ ] External audit trail: every financial transaction immutable (no edit/delete — only reversals with notes)

## PHASE 15: INVESTMENT PORTFOLIO TRACKER
- [ ] investments table: id, chama_id, name, type (land/stock/business/bond/fixed_deposit), amount_invested, current_value, date_acquired, maturity_date, return_rate, notes
- [ ] Investments page /dashboard/[chamaId]/investments: cards per investment with current value, gain/loss, ROI %
- [ ] Add investment form: all fields, receipt/document upload to Supabase storage
- [ ] Portfolio summary: total invested, total current value, total gain/loss, best performer
- [ ] Line chart: portfolio value over time (use monthly snapshots stored in investment_snapshots table)
- [ ] Investment performance vs treasury growth comparison chart
- [ ] Land valuation: for property investments, store acquisition price + area + location + current estimate

## PHASE 16: WHATSAPP BUSINESS API INTEGRATION
- [ ] Research Meta WhatsApp Business API Cloud API — document setup in src/lib/whatsapp-api-spec.md
- [ ] Create src/lib/whatsapp.ts: sendMessage(phone, message), sendTemplate(phone, templateName, params)
- [ ] If WHATSAPP_API_TOKEN in env: send real WhatsApp messages. If not: open wa.me link (existing fallback)
- [ ] Automated contribution reminder flow: 3 days before meeting → auto-send WhatsApp to all unpaid members
- [ ] Loan repayment reminder: 5 days before due date → WhatsApp reminder to borrower
- [ ] Payment confirmation: when contribution recorded → instant WhatsApp receipt to member
- [ ] New member welcome: when member added → WhatsApp with chama details and first contribution date
- [ ] Monthly statement: WhatsApp with "Your ChamaVault statement is ready" + link to portal

## PHASE 17: MULTI-CHAMA FEDERATION
- [ ] federations table: id, name, created_by, treasurer_id — umbrella organization for multiple chamas
- [ ] federation_chamas table: federation_id, chama_id, joined_at
- [ ] /dashboard/federation page: overview of all chamas in a federation
- [ ] Federation treasurer view: see aggregate financials across all chamas (total members, total savings, total loans)
- [ ] Inter-chama loans: federation can lend to individual chamas from federation pool
- [ ] Federation reports: PDF report covering all member chamas — useful for umbrella investment groups

## PHASE 18: MOBILE APP PLANNING & PWA
- [ ] Convert to PWA: add next-pwa package, configure manifest.json
- [ ] manifest.json: app name "ChamaVault", short_name "Chama", theme_color: #f59e0b, icons (generate placeholders)
- [ ] Service worker: cache static assets and last-loaded dashboard data for offline access
- [ ] Install prompt: show "Add to Home Screen" banner on mobile browsers after 3rd visit
- [ ] Offline mode: when offline, show cached data with "Offline" badge — no broken screens
- [ ] Push notifications stub: create src/lib/push.ts with requestPermission(), sendNotification() functions
- [ ] Document mobile app roadmap in MOBILE_ROADMAP.md: PWA now, React Native later

## PHASE 19: KENYA MARKET LAUNCH PREP
- [ ] Landing page: add "As seen in" section with placeholders for Business Daily, Nation Media, KBC
- [ ] Testimonials: 3 real-sounding Kenyan testimonials (name, chama name, city, quote in mix of English/Swahili)
- [ ] Pricing psychology: show "KES 1,000/mo = KES 33/day — cheaper than a cup of tea" comparison
- [ ] Partnership page /partners: "Register your SACCO or Chama umbrella body as a ChamaVault partner"
- [ ] Demo video placeholder: /demo page with placeholder for a 2-minute walkthrough video
- [ ] WhatsApp business number section on landing: "Chat with us on WhatsApp" link
- [ ] Mpesa till number section: "Pay via M-Pesa" with till number placeholder on pricing page
- [ ] Press kit: logo, screenshots, founder bio, one-pager PDF about Kenya chama problem
- [ ] LAUNCH_CHECKLIST.md: step-by-step Kenya go-live checklist
- [ ] Product Hunt assets: tagline in Swahili + English, first comment, tagline: "Excel yako ya Chama imekufa — karibu ChamaVault"
