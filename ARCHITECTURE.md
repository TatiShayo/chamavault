# ChamaVault — Architecture

## 1. What it is

A Next.js 16 (App Router) application for managing a Kenyan **chama** / SACCO:
member contributions, loans and repayments, fines, expenses, investments,
meetings + attendance, resolutions/votes, year-end dividends, PDF statements and
minutes, and SASRA compliance tracking. Data lives in Supabase (Postgres + Auth +
Storage). The app is bilingual (English / Kiswahili) via a React context.

## 2. Runtime shape

```
Browser (React 19 client components)
   │  fetch()
   ▼
Next.js Route Handlers  (src/app/api/**/route.ts)   ← authZ + validation + money logic
   │  supabase-js (anon, RLS-scoped)  │  supabase-js (service role, server-only)
   ▼                                  ▼
Supabase Postgres (RLS)        Supabase Auth admin / Storage
   ▲
   │ proxy.ts (Next 16 middleware) refreshes the auth session cookie on every request
```

- **`src/proxy.ts`** — Next 16's middleware entrypoint; calls
  `updateSession()` (`src/lib/supabase/middleware.ts`) to keep the Supabase auth
  cookie fresh. (Next 16 renamed `middleware.ts` → `proxy.ts`; there must be only
  one.)
- **Server components / route handlers** use `src/lib/supabase/server.ts`
  (cookie-bound, anon key, RLS applies).
- **`src/lib/supabase/admin.ts`** builds a service-role client. Used **only**
  server-side for operations that legitimately cross a user's own RLS scope
  (looking up a member's email to notify them, etc.). Never imported by client code.

## 3. Module map

| Area | Files |
|------|-------|
| Money (canonical) | `src/lib/money.ts` — integer-cents conversion, canonical flat-rate loan formula, `allocateByShares` / `allocateDividends` largest-remainder payout split |
| Treasury reads | `src/lib/treasury.ts` — balance, arrears, total worth, member equity (DB-backed) |
| Pure calculators | `src/lib/calculations.ts` (loan/dividend/status helpers), `src/lib/financials.ts` (mock-DB demo calcs used by the marketing page) |
| Auth/session | `src/proxy.ts`, `src/lib/supabase/{server,client,admin,middleware}.ts` |
| Messaging | `src/lib/email.ts` (Resend), `src/lib/sms.ts` (Africa's Talking), `src/lib/whatsapp.ts` |
| i18n | `src/lib/i18n.tsx`, `src/lib/translations.ts` |
| Rate limiting | `src/lib/rate-limit.ts` (in-process fixed window) |
| API | `src/app/api/**/route.ts` (23 route files) |
| UI | `src/app/dashboard/**` (officer app), `src/app/c/[id]` (public read-only chama page), `src/app/page.tsx` (marketing + interactive demo over a mock store) |
| DB | `supabase/schema.sql` (tables + `increment_contribution` RPC), `supabase/rls-policies.sql` (RLS + constraints + indexes), `supabase/seed.sql` |

## 4. Data model (as used by the code)

Core tables, all `chama_id`-scoped unless noted:

- **chamas** — group settings (name, contribution_amount, meeting_day/frequency, founding_date, compliance fields).
- **chama_members** — `(chama_id, user_id, role, full_name, phone, share_units)`. `role ∈ {chairperson, treasurer, secretary, member}`. `share_units` drives dividend allocation.
- **contributions** — `(chama_id, member_id, month_year, amount_due, amount_paid, payment_method, recorded_by)`. Updated via the atomic `increment_contribution` RPC.
- **loans** — `(chama_id, member_id, amount, interest_rate, status, approved_by, disbursed_at, due_date)`. `status ∈ {pending, approved, rejected, active, repaid}`.
- **loan_repayments** — `(loan_id, amount, paid_at)` (scoped through the parent loan).
- **fines**, **expenses**, **investments** — `chama_id`-scoped money rows.
- **dividends** — `(chama_id, member_id, year, amount, distributed_by)`; unique on `(chama_id, member_id, year)`.
- **meetings** / **meeting_attendance**, **votes** / **vote_records** — governance; child tables scoped through their parent.

## 5. Auth & authorization flow

1. `proxy.ts` refreshes the session cookie on each request.
2. Every route handler calls `supabase.auth.getUser()` → 401 if missing.
3. It then reads `chama_members` for `(chama_id, user.id)`:
   - no row → **403** (not a member);
   - money-mutating actions additionally require an officer role.
4. **RLS** (`rls-policies.sql`) enforces the same membership predicate at the
   database layer as a default-deny backstop, so a forgotten server check cannot
   leak another chama's data.

## 6. Money flow (the sensitive path)

- **Contribution recorded** → officer POST → zod-validated positive amount →
  atomic `increment_contribution` (UPDATE … SET amount_paid = amount_paid + p_amount)
  so two officers recording at once cannot lose a payment.
- **Loan** → flat interest `principal × rate%` (single canonical formula in
  `money.ts`); approval guarded by `WHERE status='pending'` so it can't be
  double-approved/disbursed.
- **Dividends** → `distributableProfit = contributions + repayments − expenses`,
  split by `share_units` with the largest-remainder method so the parts sum
  **exactly** to the profit; POST is idempotent per `(chama, year)` to prevent
  double-payout.
- All conversions go KES → integer cents → KES; floats are never used as the
  unit of record.

## 7. External services

Supabase (DB/Auth/Storage), Resend (email), Africa's Talking (SMS), Anthropic
(AI minutes). All are optional except Supabase; the messaging/AI helpers no-op
cleanly when their keys are unset. There is no local mock harness (Phase 4 was
skipped — no container runtime), so exploit verification was done by static
analysis plus unit tests on the pure money logic.

## 8. Known structural notes

- `schema.sql` predates the app and is out of sync with the columns the code uses;
  `rls-policies.sql` is written against the real columns. Reconcile before deploy.
- The in-process rate limiter is per-instance; a shared store is needed for a
  multi-instance guarantee.
- `src/app/page.tsx` is a large marketing page with an interactive demo backed by
  a client-side mock store (`src/lib/mockDb.ts`) — it does not touch real data.
