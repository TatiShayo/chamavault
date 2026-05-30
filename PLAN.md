## ChamaVault Build Plan

## PHASE 1: STABILIZE
- [x] Build passes, auth works

## PHASE 2: CHAMA SETUP
- [x] Landing page: Swahili + English, "Simamia Chama Yako Vizuri" headline, feature list, KES pricing, WhatsApp demo CTA
- [x] Create/join chama flow: chairperson creates chama (name, meeting day, contribution amount, frequency)
- [x] Member invitation: chairperson invites by email or phone → members receive link to join
- [x] Member roles: Chairperson, Treasurer, Secretary, Member
- [x] Chama profile: name, photo, founding date, objectives, bank/M-Pesa account info

## PHASE 3: FINANCIAL MANAGEMENT — CORE
- [x] Contribution tracker: per member, per month — paid/pending/overdue status
- [x] Record contribution: treasurer selects member + month + amount → log to DB
- [x] M-Pesa contribution: member pays via M-Pesa, treasurer confirms receipt
- [x] Contribution summary: table showing all members × all months grid (like a school fees tracker)
- [x] Treasury balance: running total of all contributions minus loans minus expenses
- [x] Fine management: add fine to member (missed meeting, late contribution), track paid/unpaid
- [x] Expense log: record chama expenses (venue, snacks, admin costs) with receipts

## PHASE 4: LOANS & DIVIDENDS
- [x] Loan applications: member applies, committee votes (approve/reject), disbursement recorded
- [x] Loan repayment: track monthly repayments, outstanding balance, interest accrued
- [x] Dividend calculator: at year-end, calculate each member's share based on contributions
- [x] Dividend distribution: record that dividends were paid out to each member

## PHASE 5: MEETINGS & GOVERNANCE
- [x] Meeting scheduler: create meeting (date, agenda, venue)
- [x] Attendance register: check off members present/absent per meeting
- [x] Meeting minutes: textarea to record minutes, PDF export
- [x] Voting: create a resolution, members vote yes/no, results recorded

## PHASE 6: COMMUNICATION
- [x] WhatsApp reminders: generate wa.me link with contribution reminder message per member
- [x] Email notifications: contribution due reminder, meeting reminder, loan approval notice
- [x] Monthly statement: PDF statement per member showing their contributions, loans, balance

## PHASE 7: TESTING & POLISH
- [x] Mobile-first CSS (most users on Android, small screens) — test at 360px
- [x] Swahili language option (static, just Swahili strings for key UI text)
- [x] Unit tests: contribution calculations, loan balance tracking, dividend splits
- [x] Lighthouse ≥85

## PHASE 8: ADVANCED
- [x] Chama constitution: upload/store PDF constitution document
- [x] Investment tracker: record chama's investments (property, stock, business) with current value
- [x] Multi-chama: one user can be treasurer for multiple chamas
- [x] Public chama page: read-only page shareable with potential members
- [x] Automated SMS: integrate Africa's Talking API for SMS reminders

## PHASE 7: PRODUCTION HARDENING
- [x] npm run build: zero errors, zero warnings
- [x] npx tsc --noEmit: zero errors
- [x] All KES amounts: Intl.NumberFormat('en-KE', {style:'currency', currency:'KES'}) — never raw numbers
- [x] Mobile audit at 360px (Infinix/Tecno screen size): every page usable — tables scroll horizontally
- [x] Add loading.tsx and error.tsx to all routes
- [x] Contribution matrix: test with 8 members × 12 months — must render without overflow on mobile
- [x] WhatsApp reminder links: test that wa.me URLs open correctly with pre-filled Swahili message
- [x] Add Open Graph tags + robots.txt

## PHASE 8: FINANCIAL CALCULATIONS — GET THEM PERFECT
- [x] Treasury balance: implement getTreasuryBalance(chamaId) in src/lib/treasury.ts
- [x] Loan outstanding balance per member: principal + (principal × interest_rate × months_elapsed / 12) - total_repaid
- [x] Arrears calculation: for each member, sum of (amount_due - amount_paid) across all months where amount_paid < amount_due
- [x] Total chama worth: treasury_balance + outstanding_loan_values (money owed TO the chama)
- [x] Per-member equity: (member.share_units / total_share_units) × treasury_balance
- [x] Dividend distribution calculator: at year-end, calculates each member's payout — show as table, exportable

## PHASE 9: PDF GENERATION — STATEMENTS & MINUTES
- [x] Monthly contribution statement PDF per member
- [x] Meeting minutes PDF
- [x] Annual report PDF

## PHASE 10: COMMUNICATION SYSTEM
- [x] Bulk WhatsApp reminders
- [x] Contribution due reminder email via Resend
- [x] New member welcome email
- [x] Loan approval notification email
- [x] Payment received notification

## PHASE 11: MEMBER PORTAL
- [x] /portal/[chamaId] — member self-service portal (no account needed)
- [x] Member enters phone number → sees their personal dashboard
- [x] Generate personal statement PDF button on portal
- [x] Share portal link: treasurer copies link for each member, shares via WhatsApp

## PHASE 12: ADVANCED FEATURES
- [x] Chama constitution: upload PDF and store in Supabase storage — view button for all members
- [x] Investment tracker: record chama investments with current value, date acquired
- [x] Investment portfolio total on dashboard: sum of all investment current values
- [x] Multi-chama: user can create or join multiple chamas — selector on login
- [x] Africa's Talking SMS integration stub: src/lib/sms.ts with sendSMS()
- [x] Backup/export: "Export all chama data" button → generates comprehensive JSON/CSV zip download

## PHASE 13: LAUNCH PREP
- [x] Swahili strings audit: i18n context with English/Kiswahili dictionary
- [x] Seed data: "Wema Savings Group" fully populated — 8 members, 12 months history, 2 loans, 3 expenses, 2 past meetings
- [x] Write unit tests: treasury balance, loan outstanding, arrears — all 45 tests pass
- [x] README.md in Swahili + English
- [x] DEPLOY.md with step-by-step Vercel + Supabase setup
- [x] Pricing page: KES 500/1000/2000 plans with Stripe checkout in KES currency


## PHASE 14: SACCO COMPLIANCE MODULE
- [x] Research Kenya Sacco Societies Regulatory Authority (SASRA) requirements — document in src/lib/sasra-compliance.md
- [x] Add compliance_type field to chamas table: 'informal_chama' | 'registered_group' | 'sacco'
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
