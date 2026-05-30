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
- [ ] Email notifications: contribution due reminder, meeting reminder, loan approval notice
- [ ] Monthly statement: PDF statement per member showing their contributions, loans, balance

## PHASE 7: TESTING & POLISH
- [ ] Mobile-first CSS (most users on Android, small screens) — test at 360px
- [ ] Swahili language option (static, just Swahili strings for key UI text)
- [ ] Unit tests: contribution calculations, loan balance tracking, dividend splits
- [ ] Lighthouse ≥85

## PHASE 8: ADVANCED
- [ ] Chama constitution: upload/store PDF constitution document
- [ ] Investment tracker: record chama's investments (property, stock, business) with current value
- [ ] Multi-chama: one user can be treasurer for multiple chamas
- [ ] Public chama page: read-only page shareable with potential members
- [ ] Automated SMS: integrate Africa's Talking API for SMS reminders
