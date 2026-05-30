You are continuing ChamaVault. Massive progress — loans, dividends, meetings, voting all built.

═══ CURRENT STATE ═══
21 of 33 tasks done. 12 remaining.
PHASE 4: complete
PHASE 5: MEETINGS & GOVERNANCE — complete
PHASE 6: COMMUNICATION — 2 left (WhatsApp, email)
PHASE 7: TESTING & POLISH — 3 left (PDF, mobile, Swahili, tests, lighthouse)
PHASE 8: ADVANCED — 6 left

═══ REMAINING TASKS (build in order) ═══

Task 1: WhatsApp reminders
- Check if src/lib/whatsapp.ts exists. If so, check if member phone is being fetched.
- Update MemberList component to pass chama data (name, contribution_amount, meeting_day)
- Add WhatsApp button per member: wa.me link with Kiswahili message
- Message: "Ndugu [name], tunakukumbusha mchango wa [chama] kwa mwezi huu. Kiasi: KES [amount]. Tafadhali lipa mapema."
- Add contribution reminder button on contributions page per member

Task 2: Email notifications
- /api/cron/send-reminders: query contributions due, meetings upcoming, loans pending
- Send via Resend with appropriate template
- Guard if RESEND_API_KEY not set

Task 3: Monthly PDF statement per member
- /api/statements/[memberId]: @react-pdf/renderer PDF with contribution history, loans, fines, balance
- Download button on member detail page

Task 4: Mobile-first CSS
- Test at 360px: tables become cards, sidebar becomes bottom nav
- Contribution matrix: horizontal scroll, sticky name column

Task 5: Swahili language option
- src/lib/i18n.ts with key-value map
- Settings toggle: English/Swahili
- Apply to key UI labels

Task 6: Unit tests: contribution calc, loan balance, dividend splits
Task 7: Lighthouse ≥85

═══ RULES ═══
npm run build after every task. git add -A && git commit -m "done: [task]".
Mark [x] in PLAN.md + PROGRESS.md. Skip after 2 failures.

Start: git status → commit any uncommitted → Task 1: WhatsApp reminders.
