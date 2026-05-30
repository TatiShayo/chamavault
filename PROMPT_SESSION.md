You are a senior fullstack engineer finishing ChamaVault — a digital chama (group savings) management SaaS for Kenya.

═══ CURRENT STATE ═══
10 of 33 tasks done. In PHASE 3: FINANCIAL MANAGEMENT — CORE.
23 tasks remaining. Basic chama setup, contributions matrix, and member management exist. Need treasury balance, fines, expenses, loans, dividends, meetings, voting, WhatsApp, PDF statements, mobile, Swahili.

═══ REMAINING TASKS (build in this order — prioritize the treasurer's daily needs) ═══

Task 1: Treasury balance calculation
- Create src/lib/treasury.ts: getTreasuryBalance(chamaId) → {balance, totalContributions, totalExpenses, activeLoans, totalRepaid}
- Formula: balance = SUM(contributions.amount_paid) + SUM(loan_repayments.amount) - SUM(loans.amount WHERE status != 'rejected') - SUM(expenses.amount)
- Display on chama dashboard as large KES amount card with gold gradient background
- Format: new Intl.NumberFormat('en-KE', {style:'currency', currency:'KES'})

Task 2: Fine management at /dashboard/[chamaId]/fines
- Table: member name, reason, amount (KES), issued date, paid/unpaid badge
- Add fine modal: member dropdown, reason dropdown (Missed Meeting/Late Contribution/Late Loan Payment/Other), amount input, notes
- Mark as paid button per fine row
- Total outstanding fines amount shown in header
- Paid fines auto-calculate into treasury disbursed

Task 3: Expense logging at /dashboard/[chamaId]/expenses
- Table: date, description, category badge, amount (KES), recorded_by name
- Add expense: date picker, description, amount, category dropdown (Venue/Food&Drinks/Admin/Transport/Other), receipt file upload (store in Supabase storage bucket 'receipts')
- Total expenses this month card
- Receipt thumbnail column with view/download link

Task 4: Loan system at /dashboard/[chamaId]/loans
- Tabs: Active Loans | Applications | Repayments | History
- Active loans table: member name, amount, disbursed date, due date, interest rate, total repaid, outstanding balance, status badge
- New application: member selector, amount (validate ≤ member's total contributions × 3), purpose, disbursement date, due date, interest rate (default 10%)
- Approve/Reject buttons for pending applications
- Record repayment: loan selector, amount, date, payment method
- Loan calc: outstanding = principal + (principal * interest_rate/100) - total_repaid

Task 5: Dividend calculator at /dashboard/[chamaId]/reports
- "Calculate Dividends" section: selects year, shows total treasury profit, divides by total member units
- Each member's dividend = (member_units / total_units) * distributable_profit
- Preview table before distributing
- "Distribute" button: records dividend distribution per member
- Generates PDF report of the distribution

Task 6: Meeting management at /dashboard/[chamaId]/meetings
- List: past and upcoming meetings with date, agenda preview, attendance count
- Create meeting: date picker, agenda textarea, venue input
- Meeting detail page: agenda display, attendance checklist (member name + present/absent toggle), minutes text editor with save
- AI Generate Minutes button: sends agenda + attendance data to /api/ai/minutes → receives draft formal minutes
- Export minutes as PDF button (use @react-pdf/renderer on server)

Task 7: Voting system
- Create a resolution: title, description, voting deadline date
- Voting page: shows resolution, members see Yes/No/Abstain buttons
- Results: live count of yes/no/abstain, percentage bar
- Record results in a voting_results table

Task 8: WhatsApp reminders
- src/lib/whatsapp.ts: generateReminderLink(member, chama, month) → wa.me URL with pre-filled Kiswahili message
- Contribution reminder button per member on /dashboard/contributions
- Meeting reminder button per member on /dashboard/meetings
- Auto-generate reminder links when contributions are due

Task 9: Monthly PDF statement per member
- Server route /api/statements/[memberId]: generates PDF with member name, chama name, contribution history table, loan history, fines, treasury balance
- Use @react-pdf/renderer Document, Page, Text, View, Table components
- Download button on member detail page

Task 10: Mobile-first CSS polish
- All pages tested at 360px width
- Contribution matrix: horizontal scroll, sticky first column (member names)
- Tables: use card layout on mobile (each row becomes a card)
- Navigation: bottom nav bar on mobile, sidebar on desktop

Task 11: Swahili language option
- Create src/lib/i18n.ts with key-value map for Swahili translations of common UI labels
- Settings gets language toggle (English/Swahili)
- Apply throughout: "Mchango" / "Contribution", "Mkopo" / "Loan", "Faini" / "Fine", "Wanachama" / "Members"

Task 12: Multi-chama support
- Chama selector at /dashboard shows all chamas the user belongs to
- Create new chama button
- Nav bar shows current chama name with dropdown to switch

═══ DESIGN ═══
Dark theme: bg #0a0900, surface #14120a, border #2a2510, gold accent #f59e0b #f97316 orange secondary.
Contribution matrix: green=#10b981 paid, red=#ef4444 unpaid, gray=future.
Amounts always in KES format. Mobile-first for Kenyan users.

═══ RULES ═══
npm run build after every task — must pass. Fix all tsc errors.
git add -A && git commit -m "done: [task]" per task.
Mark [x] in PLAN.md + append to PROGRESS.md.
Skip failed after 2 tries, write BLOCKED to LEARNINGS.md. Keep going.

Start with Task 1: Treasury balance calculation.
