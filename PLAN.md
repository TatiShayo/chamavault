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
- [ ] Seed data: "Wema Savings Group" fully populated — 8 members, 12 months history, 2 loans, 3 expenses, 2 past meetings
- [x] Write unit tests: treasury balance, loan outstanding, arrears — all 45 tests pass
- [ ] README.md in Swahili + English
- [ ] DEPLOY.md with step-by-step Vercel + Supabase setup
- [ ] Pricing page: KES 500/1000/2000 plans with Stripe checkout in KES currency
