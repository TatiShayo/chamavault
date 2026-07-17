# ChamaVault — Review Findings

Money-movement fintech; audited with extra caution. Severity: **CRITICAL** (money
loss / cross-tenant data / credential burn), **HIGH**, **MEDIUM**, **LOW**.
Status: **FIXED**, **MITIGATED**, **FLAGGED** (needs a human/ops decision).

---

## CRITICAL

### C1 — Gate was unbuildable: missing runtime dependencies — FIXED
`@base-ui/react`, `react-hook-form`, `@hookform/resolvers`, `@react-pdf/renderer`,
`class-variance-authority`, `clsx`, `cmdk`, `resend`, `sonner`, `tailwind-merge`
were imported throughout `src/` but absent from `package.json`; `tsc` and
`next build` both failed. Installed and pinned. The whole gate now passes.

### C2 — Dividend double-payout (money abuse chain) — FIXED
`POST /api/chamas/[id]/dividends` inserted one dividend row per member with **no
idempotency guard**. Calling it twice for the same year inserted a second full set
of dividend records — **every member's payout doubled**. Proven by reading the
handler: nothing checked for existing `(chama, year)` rows before insert.
**Fix:** pre-check existing dividends for the year → 409; unique index
`(chama_id, member_id, year)` in `rls-policies.sql`; a losing race now returns
23505 → 409 instead of a duplicate insert.

### C3 — Negative-amount contribution (money abuse chain) — FIXED
`POST …/contributions` passed `amount` straight into the atomic
`increment_contribution` RPC (`amount_paid = amount_paid + p_amount`). A **negative
amount** would DECREMENT a member's paid balance — silent theft / balance
manipulation. **Fix:** zod schema rejects non-positive, non-finite, and >2-decimal
amounts before the RPC; a Postgres CHECK (`amount_paid >= 0`) backs it.

### C4 — No Row Level Security at all — FIXED (migration authored; apply required)
`schema.sql` defined tables but **zero** `ENABLE ROW LEVEL SECURITY` and **zero**
policies. Cross-chama isolation rested solely on per-route server checks — a single
missing check (as already happened in the portal route, see H-history) leaks a
member's whole financial history. **Fix:** `supabase/rls-policies.sql` enables +
forces RLS on every table with membership/officer-scoped policies via
`is_chama_member` / `is_chama_officer` SECURITY DEFINER helpers (recursion-safe).
**FLAGGED for ops:** must be applied to the live database; verify against the real
schema first (see M1).

### C5 — Money-rounding bug in `toCents` — FIXED
`toCents(1.005)` returned **100** cents, not 101 — the `Number.EPSILON` nudge was
far too small to overcome the `1.005 * 100 === 100.4999…` float representation
error, so half-values rounded the wrong way. A characterization test asserted the
correct value and failed. **Fix:** sign-aware `toFixed(4)` rematerialisation →
`toCents(1.005) === 101`, `toCents(2.675) === 268`. Test now green.

---

## HIGH

### H1 — Dividend allocation lost pennies — FIXED
Both the GET preview and POST persist used `Math.round(share * 100) / 100` per
member with no remainder distribution, so the sum of member dividends did not
equal the distributable profit (pennies vanished or appeared). **Fix:** both paths
now call the canonical `allocateDividends` (integer cents, largest-remainder) — the
parts sum **exactly** to the profit. Locked by tests in `money.test.ts`.

### H2 — Conflicting loan-interest formulas — FIXED
`money.ts`/loans route used flat interest (`principal × rate%`) while
`treasury.ts:getLoanOutstanding` used time-based accrual
(`principal × rate% × months/12`) — the same loan valued two different ways. The
time-based function was **dead code** (never imported). **Fix:** removed it; the
flat-rate formula in `money.ts` is the single canonical loan formula.

### H3 — Raw DB `error.message` returned to clients — FIXED
~40 handlers across 14 route files returned Supabase `error.message` verbatim,
leaking table/column/constraint internals. **Fix:** all now log server-side and
return a generic `"Something went wrong. Please try again."` with status 500.

### H4 — AI route: authentication without authorization + no rate limit — FIXED
`POST /api/ai/minutes` checked only that *a* user was logged in, not that they
belonged to `chamaId`, and had no throttle — any authenticated user could burn
Anthropic credits in a loop. **Fix:** membership check on `chamaId` + per-user rate
limit (10 / 5 min) + zod on the payload.

### H5 — Loan approval race — FIXED
`PATCH …/loans` approve/reject updated by id with no status guard; two officers
acting at once both "won", and an already-disbursed loan could be re-approved.
**Fix:** `WHERE status = 'pending'` on the UPDATE with a `.select()` row-count check
→ 409 when the loan is no longer pending.

### H6 — Missing security headers — FIXED (extended)
Added `Content-Security-Policy` and `Permissions-Policy` (HSTS/X-Frame-Options/
X-Content-Type-Options/Referrer-Policy were already present).

### H-history (prior rounds, already fixed) — portal endpoint returned a member's
full financial profile with `?phone=` and **no auth**; AI route accepted
unauthenticated POSTs; vote-after-close was accepted server-side. All fixed in
earlier passes and re-verified present.

---

## MEDIUM

### M1 — `schema.sql` is stale — FLAGGED
`schema.sql` still declares `contributions.amount` / `contribution_date` / member
`name,email`, while the code uses `amount_paid` / `amount_due` / `month_year` /
`user_id` / `share_units` / `full_name`. The live DB clearly differs. `rls-policies.sql`
targets the real columns. **Action:** reconcile `schema.sql` with the live schema
and treat it as source of truth going forward.

### M2 — Outbound SMS/email cost abuse — MITIGATED
Officer-only, but bulk-send had no throttle. Added a per-chama rate limit
(60 messages / 10 min) on the notifications route.

### M3 — Receipt upload hardening — FIXED
Expenses receipt upload derived the stored filename extension from the untrusted
client filename and enforced no type/size limit. **Fix:** allow-list MIME types,
5 MB cap, extension derived from MIME.

### M4 — Officer self-dealing — FLAGGED
An officer can self-record a contribution and (as officer) self-approve a loan →
self-fund then self-borrow. This is a **policy** decision (many real chamas do
allow officer transactions with minutes). Flagged for a maker/checker rule rather
than silently changing behavior.

### M5 — Non-atomic multi-step writes — FLAGGED
Chama-create (insert chama → insert member, JS rollback) and meeting-attendance
(DELETE-all → INSERT) can leave partial state on a mid-operation crash. Should move
into SECURITY DEFINER transactional RPCs (like `increment_contribution`).

### M6 — In-process rate limiter is per-instance — FLAGGED
`src/lib/rate-limit.ts` is a single-node guard. For a multi-instance/edge deploy,
back it with a shared store (Upstash/Redis) or the platform WAF.

---

## LOW

- **L1 — No member-removal API.** PATCH on members handles role changes only; there
  is no DELETE, and if added it would need orphan cleanup across 7 tables. FLAGGED
  (feature gap, not a bug).
- **L2 — No privacy policy / ToS** despite collecting phone numbers (PII) and
  financial records. FLAGGED (legal).
- **L3 — Zod not yet on every write route.** Applied to the money-sensitive routes
  (contributions, dividends, ai/minutes) and amount guards added to expenses/fines/
  loans; remaining low-risk routes (board-members, meetings, votes metadata) still
  validate manually. FLAGGED for follow-up.

---

## Confirmed safe
- No hardcoded secrets — every credential via `process.env`; service-role key
  server-only.
- Integer-cents money module is the single source of truth for conversion, loan
  interest, and payout allocation, and is test-locked.
- All 23 API route files authenticate; 22 additionally scope to chama membership.

## Money tests (lock current correct behavior)
`src/lib/money.test.ts` (incl. new `allocateDividends` suite), plus
`financials.test.ts` and `calculations.test.ts` — **79 tests, all green.** They lock
integer-cents conversion, half-away-from-zero rounding, flat-rate loan interest,
and exact largest-remainder payout allocation before any further refactor.
