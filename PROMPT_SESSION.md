You are continuing ChamaVault. 12 of 33 tasks done.

═══ CURRENT STATE ═══
PHASE 3: FINANCIAL MANAGEMENT — CORE (in progress)
Uncommitted work: expenses page exists but needs commit.

═══ FIRST: COMMIT EXISTING WORK ═══
Run: git status --short
If expenses files are untracked/uncommitted:
  git add -A && git commit -m "done: expense logging with receipts and categories"
Then read PLAN.md and mark [x] for:
- [ ] Expense log (if it's built)
- [ ] Fine management (if it's already done — there's a file at fines/)
Then re-count: grep -c '\[x\]' PLAN.md — should be 14.

═══ REMAINING TASKS (build in order) ═══

Task 1: Loan system at /dashboard/[chamaId]/loans
- Create page if not exists (check first)
- Tabs: Active Loans | Applications | Repayments | History
- Active loans table: member, amount, disbursed date, due date, interest rate, total repaid, outstanding, status badge
- Application form: member selector, amount (validate ≤ contributions × 3), purpose, dates, interest rate (default 10%)
- Approve/Reject buttons
- Record repayment modal: loan selector, amount, date, method

Task 2: Dividend calculator at /dashboard/[chamaId]/reports
- Select year, calculate distributable profit
- Each member's share = (member_units / total_units) × profit
- Preview table, "Distribute" button

Task 3: Meeting management at /dashboard/[chamaId]/meetings
- List of past/upcoming meetings
- Create meeting: date, agenda, venue
- Meeting detail: attendance checklist, minutes editor
- "Generate Minutes with AI" button → /api/ai/minutes

Task 4: Voting system
- Create resolution: title, description, deadline
- Yes/No/Abstain per member
- Live results with bars

Task 5: WhatsApp reminder links
- wa.me link per member for contribution/meeting reminders
- src/lib/whatsapp.ts with pre-filled Kiswahili messages

Task 6: PDF monthly statements
- /api/statements/[memberId] → @react-pdf/renderer PDF
- Download button on member detail

═══ RULES ═══
Start: git status → commit → update PLAN.md → start Task 1 (loans)
npm run build after every task. git commit per task. Mark [x] in PLAN.md. Skip after 2 failures.
