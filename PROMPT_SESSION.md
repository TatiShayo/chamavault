You are a senior fullstack engineer. Continue building chamavault autonomously.

SESSION STATE:
Tasks remaining: 11
Tasks completed: 22
Current phase: PHASE 6: COMMUNICATION
Recent commits:
df124aa chore: pre-task cleanup
e397679 done: voting system with resolutions, live results, and per-member voting
6ab6243 done: meeting management with attendance, minutes editor, and AI generation
4052e7c done: dividend calculator and distribution
e2cf00d done: loan system with applications, approvals, repayments

KNOWN ISSUES FROM PREVIOUS SESSIONS:
# ChamaVault Learnings & Known Issues


═══ PRODUCT SPECIFICATION (from batch2-build-prompts) ═══
## PROMPT 4 — BUILD CHAMAVAULT
*(Open chamavault/ in a new CMD → paste this)*

---

```
You are a senior fullstack engineer. Build ChamaVault — a complete digital chama (group savings) management SaaS for Kenya — in this Next.js project. YOLO MODE. Build everything. No questions.

═══════════════════════════════════════
PRODUCT OVERVIEW
═══════════════════════════════════════
ChamaVault digitizes Kenya's 1M+ investment/savings groups (chamas) that currently run on WhatsApp messages, Excel spreadsheets, and handwritten notebooks. Mobile-first, Swahili-friendly, M-Pesa native.

Tagline: "Simamia Chama Yako Vizuri." (Manage Your Chama Well.)
Target: Chama chairpersons, treasurers, secretaries. Any group savings scheme in Kenya and East Africa.

Pricing:
- Free: 1 chama, up to 5 members, basic tracking only
- Small (KES 500/mo): 1 chama, up to 10 members, full features
- Standard (KES 1,000/mo): 3 chamas, up to 30 members, PDF statements, meeting minutes
- Large (KES 2,000/mo): Unlimited chamas, unlimited members, full feature set

═══════════════════════════════════════
TECH STACK
═══════════════════════════════════════
- Next.js 14 App Router + TypeScript
- Supabase (auth + DB + storage)
- Stripe (for international payments) + M-Pesa Daraja API (document, build with mock if no sandbox)
- OpenAI GPT-4o-mini (meeting minutes assistant)
- Resend (email notifications)
- @react-pdf/renderer (member statements, meeting minutes PDF)
- shadcn/ui + Tailwind (dark, gold/amber accent #f59e0b)
- Recharts (savings growth charts)
- Framer Motion + Sonner
- papaparse (CSV import for bulk member add)

═══════════════════════════════════════
ALL PAGES TO BUILD
═══════════════════════════════════════

1. LANDING PAGE (src/app/page.tsx)
   - Navbar: ChamaVault logo, Features, Pricing, Login, "Anza Bure" (Start Free)
   - Hero section: TWO language versions side by side or tabbed (English/Kiswahili)
     English: "Manage Your Chama. No More Spreadsheets."
     Kiswahili: "Simamia Chama Yako Vizuri. Acha Kutumia Excel."
   - Gold CTA button. Background with subtle kanga-inspired geometric pattern in CSS (not image)
   - Social proof: "Trusted by 500+ chamas in Kenya, Uganda, Tanzania"
   - Feature list: 8 features with icons (Contributions tracker, Loan management, Meeting minutes, Member statements PDF, WhatsApp reminders, Fines, Dividends, Investment tracking)
   - "How it works" for a treasurer: 3 steps (Create chama → Add members → Record contributions every month)
   - Pricing in KES: 4 cards (Free / KES 500 / KES 1,000 / KES 2,000)
   - Testimonials: 3 in mix of English and Kiswahili, from real-sounding Kenyan names
   - FAQ: 8 questions (does it work with M-Pesa, can members log in too, is data safe, etc.)
   - Footer: English + Kiswahili mix

2. AUTH: login, signup, reset, callback

3. CHAMA SELECTOR (src/app/dashboard/page.tsx)
   - If user belongs to multiple chamas: show a card grid — click to enter that chama's dashboard
   - If user belongs to 1 chama: go directly to that chama's dashboard
   - "Create New Chama" card button
   - Create chama modal: name, meeting day (Mon–Sun), frequency (weekly/bi-weekly/monthly), contribution amount (KES), objective

4. CHAMA DASHBOARD (src/app/dashboard/[chamaId]/page.tsx)
   - Chama header: name, photo/logo, founding date badge, member count, your role badge (Chairperson / Treasurer / Secretary / Member)
   - Treasury balance card: large KES amount, calculated as (total contributions + loan interest paid - loans disbursed - expenses)
   - Stats: This month's collection %, Outstanding contributions (KES), Active loans, Meetings this quarter
   - Contribution status grid: mini table showing each member and whether they've paid this month (green = paid, red = overdue, gray = not yet due)
   - Quick actions: Record Contribution, Record Expense, View Loans, Schedule Meeting
   - Activity feed: last 10 transactions/events

5. CONTRIBUTIONS (src/app/dashboard/[chamaId]/contributions/page.tsx)
   - Matrix g
═══ END SPEC ═══

STARTUP SEQUENCE (do this first, every session):
1. Run: git log --oneline -10
2. Run: npm run build 2>&1 | tail -20
3. Run: npx tsc --noEmit 2>&1 | head -15
4. Read PLAN.md — find the first unchecked [ ] task in the lowest-numbered phase
5. Read LEARNINGS.md — avoid known blocked approaches

LOOP PROTOCOL:
Read PLAN.md → first [ ] task → implement it → run npm run build (must pass) →
git add -A && git commit -m "done: [task name]" → mark [x] in PLAN.md →
append to PROGRESS.md → move to next task IMMEDIATELY.

Never stop between tasks.
Never ask for confirmation.
Never wait for input.
If a task fails twice: write to LEARNINGS.md as BLOCKED, skip it, continue to next.
Install any npm package you need: npm install [package].
Search the web if stuck on an error.

Build exactly to the PRODUCT SPECIFICATION above. Every page, feature, and design detail must match.

You have 11 tasks remaining. Complete as many as possible before context runs out.
Start now. First task. Go.
