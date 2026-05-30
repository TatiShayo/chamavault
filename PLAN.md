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
  Formula: total_contributions_paid - loans_disbursed + loan_repayments + interest_collected - expenses
  Show on dashboard as the primary KES figure
- [x] Loan outstanding balance per member: principal + (principal × interest_rate × months_elapsed / 12) - total_repaid
- [x] Arrears calculation: for each member, sum of (amount_due - amount_paid) across all months where amount_paid < amount_due
- [x] Total chama worth: treasury_balance + outstanding_loan_values (money owed TO the chama)
- [x] Per-member equity: (member.share_units / total_share_units) × treasury_balance
- [x] Dividend distribution calculator: at year-end, calculates each member's payout — show as table, exportable

## PHASE 9: PDF GENERATION — STATEMENTS & MINUTES
- [x] Monthly contribution statement PDF per member:
  Header: chama logo, name, statement period
  Member info, contribution history table (month | due | paid | balance)
  Loans section, fines section, total equity
  Footer: generated date, treasurer signature line
- [x] Meeting minutes PDF:
  Formal header: chama name, date, venue, chairperson
  Members present list, apologies
  Agenda items with discussion notes
  Resolutions, next meeting date
  Signature blocks for chair and secretary
- [x] Annual report PDF:
  Cover page, executive summary
  Treasury growth chart (embed as base64 image)
  Member contribution compliance table
  Loan portfolio summary
  Expense breakdown
  Dividend calculation

## PHASE 10: COMMUNICATION SYSTEM
- [ ] Bulk WhatsApp reminders: treasurer clicks "Send All Reminders" → opens batch of wa.me links (one per unpaid member) → clicks send on each
- [ ] Contribution due reminder email via Resend: 3 days before meeting, auto-email all unpaid members
- [ ] New member welcome email: when member added → Resend email with chama details, contribution schedule, treasurer contact
- [ ] Loan approval notification email: when loan approved → email to borrower with terms, disbursement date, repayment schedule
- [ ] Payment received notification: when contribution recorded → SMS-style WhatsApp link: "Umeshukuriwa mchango wako..."

## PHASE 11: MEMBER PORTAL
- [ ] /portal/[chamaId] — member self-service portal (no account needed)
- [ ] Member enters phone number → sees their personal dashboard:
  Contribution history (paid green, unpaid red)
  Active loans and repayment schedule
  Upcoming meeting details
  Total equity in the chama
  Outstanding fines
- [ ] Generate personal statement PDF button on portal
- [ ] Share portal link: treasurer copies link for each member, shares via WhatsApp

## PHASE 12: ADVANCED FEATURES
- [ ] Chama constitution: upload PDF and store in Supabase storage — view button for all members
- [ ] Investment tracker: record chama investments (land, stock, business) with current value, date acquired, expected return
- [ ] Investment portfolio total on dashboard: sum of all investment current values
- [ ] Multi-chama: user can create or join multiple chamas — selector on login shows their chamas
- [ ] Africa's Talking SMS integration stub: create src/lib/sms.ts with sendSMS(phone, message) — uses AT API if AT_API_KEY in env, otherwise logs to console
- [ ] Backup/export: "Export all chama data" button → generates comprehensive JSON/CSV zip download

## PHASE 13: LAUNCH PREP
- [ ] Swahili strings audit: all key UI labels have both English and Swahili (use a simple i18n object, not a library)
- [ ] Seed data: "Wema Savings Group" fully populated — 8 members, 12 months history, 2 loans, 3 expenses, 2 past meetings
- [ ] Write unit tests: treasury balance calculation (various scenarios), loan outstanding balance, arrears calculation
- [ ] README.md in Swahili + English
- [ ] DEPLOY.md with step-by-step Vercel + Supabase setup
- [ ] Pricing page: KES 500/1000/2000 plans with Stripe checkout in KES currency

## PHASE 7: PRODUCTION HARDENING
- [ ] npm run build: zero errors, zero warnings
- [ ] npx tsc --noEmit: zero errors
- [ ] All KES amounts: Intl.NumberFormat('en-KE', {style:'currency', currency:'KES'}) — never raw numbers
- [ ] Mobile audit at 360px (Infinix/Tecno screen size): every page usable — tables scroll horizontally
- [ ] Add loading.tsx and error.tsx to all routes
- [ ] Contribution matrix: test with 8 members × 12 months — must render without overflow on mobile
- [ ] WhatsApp reminder links: test that wa.me URLs open correctly with pre-filled Swahili message
- [ ] Add Open Graph tags + robots.txt

## PHASE 8: FINANCIAL CALCULATIONS — GET THEM PERFECT
- [ ] Treasury balance: implement getTreasuryBalance(chamaId) in src/lib/treasury.ts
  Formula: total_contributions_paid - loans_disbursed + loan_repayments + interest_collected - expenses
  Show on dashboard as the primary KES figure
- [ ] Loan outstanding balance per member: principal + (principal × interest_rate × months_elapsed / 12) - total_repaid
- [ ] Arrears calculation: for each member, sum of (amount_due - amount_paid) across all months where amount_paid < amount_due
- [ ] Total chama worth: treasury_balance + outstanding_loan_values (money owed TO the chama)
- [ ] Per-member equity: (member.share_units / total_share_units) × treasury_balance
- [ ] Dividend distribution calculator: at year-end, calculates each member's payout — show as table, exportable

## PHASE 9: PDF GENERATION — STATEMENTS & MINUTES
- [x] Monthly contribution statement PDF per member:
  Header: chama logo, name, statement period
  Member info, contribution history table (month | due | paid | balance)
  Loans section, fines section, total equity
  Footer: generated date, treasurer signature line
- [x] Meeting minutes PDF:
  Formal header: chama name, date, venue, chairperson
  Members present list, apologies
  Agenda items with discussion notes
  Resolutions, next meeting date
  Signature blocks for chair and secretary
- [x] Annual report PDF:
  Cover page, executive summary
  Treasury growth chart (embed as base64 image)
  Member contribution compliance table
  Loan portfolio summary
  Expense breakdown
  Dividend calculation

## PHASE 10: COMMUNICATION SYSTEM
- [ ] Bulk WhatsApp reminders: treasurer clicks "Send All Reminders" → opens batch of wa.me links (one per unpaid member) → clicks send on each
- [ ] Contribution due reminder email via Resend: 3 days before meeting, auto-email all unpaid members
- [ ] New member welcome email: when member added → Resend email with chama details, contribution schedule, treasurer contact
- [ ] Loan approval notification email: when loan approved → email to borrower with terms, disbursement date, repayment schedule
- [ ] Payment received notification: when contribution recorded → SMS-style WhatsApp link: "Umeshukuriwa mchango wako..."

## PHASE 11: MEMBER PORTAL
- [ ] /portal/[chamaId] — member self-service portal (no account needed)
- [ ] Member enters phone number → sees their personal dashboard:
  Contribution history (paid green, unpaid red)
  Active loans and repayment schedule
  Upcoming meeting details
  Total equity in the chama
  Outstanding fines
- [ ] Generate personal statement PDF button on portal
- [ ] Share portal link: treasurer copies link for each member, shares via WhatsApp

## PHASE 12: ADVANCED FEATURES
- [ ] Chama constitution: upload PDF and store in Supabase storage — view button for all members
- [ ] Investment tracker: record chama investments (land, stock, business) with current value, date acquired, expected return
- [ ] Investment portfolio total on dashboard: sum of all investment current values
- [ ] Multi-chama: user can create or join multiple chamas — selector on login shows their chamas
- [ ] Africa's Talking SMS integration stub: create src/lib/sms.ts with sendSMS(phone, message) — uses AT API if AT_API_KEY in env, otherwise logs to console
- [ ] Backup/export: "Export all chama data" button → generates comprehensive JSON/CSV zip download

## PHASE 13: LAUNCH PREP
- [ ] Swahili strings audit: all key UI labels have both English and Swahili (use a simple i18n object, not a library)
- [ ] Seed data: "Wema Savings Group" fully populated — 8 members, 12 months history, 2 loans, 3 expenses, 2 past meetings
- [ ] Write unit tests: treasury balance calculation (various scenarios), loan outstanding balance, arrears calculation
- [ ] README.md in Swahili + English
- [ ] DEPLOY.md with step-by-step Vercel + Supabase setup
- [ ] Pricing page: KES 500/1000/2000 plans with Stripe checkout in KES currency
