You are continuing ChamaVault. Treasury balance is done. 22 tasks remain.

═══ CURRENT STATE ═══
11 of 33 tasks done. 22 remaining.
PHASE 3: FINANCIAL MANAGEMENT — CORE (in progress)

═══ REMAINING TASKS (build in order) ═══

Task 1: Fine management at /dashboard/[chamaId]/fines
- Create page if not exists (check first: ls src/app/dashboard/chamas/[id]/fines/)
- Table: member name, reason, amount (KES), issued date, paid/unpaid badge
- Add fine modal: member dropdown, reason dropdown (Missed Meeting/Late Contribution/Late Loan Payment/Other), amount, notes
- Mark as paid button per fine row
- Total outstanding fines in header

Task 2: Expense logging at /dashboard/[chamaId]/expenses
- Create page if not exists
- Table: date, description, category badge, amount (KES), recorded_by
- Add expense: date, description, amount, category (Venue/Food&Drinks/Admin/Transport/Other), receipt upload to Supabase storage
- Total expenses this month card

Task 3: Loan system at /dashboard/[chamaId]/loans
- Tabs: Active Loans | Applications | Repayments | History
- Active loans table: member, amount, dates, interest, repaid, outstanding
- Application form: member selector, amount (≤ contributions × 3), purpose, dates, interest rate (default 10%)
- Approve/Reject buttons
- Record repayment modal: amount, date, method

Task 4: Dividend calculator at /dashboard/[chamaId]/reports
- Select year, calculate distributable profit
- Each member's share = (member_units / total_units) × profit
- Preview table, "Distribute" button, PDF report

Task 5: Meeting management at /dashboard/[chamaId]/meetings
- List, create meeting, attendance checklist, minutes editor, AI Generate Minutes, PDF export

Task 6: Voting system — resolution, yes/no/abstain, live results

═══ RULES ═══
Check each page exists before creating. npm run build after every task.
git add -A && git commit -m "done: [task]" per task.
Mark [x] in PLAN.md + PROGRESS.md. Skip after 2 failures.

Start with Task 1: Fine management page.
