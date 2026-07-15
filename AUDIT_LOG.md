# AUDIT LOG — chamavault

**Sweep:** July 14, 2026 (Round 1, Rounds 2-3 applied)

## FIXES APPLIED

### HIGH — Missing security headers
**Finding:** `next.config.ts` was empty.
**Fix:** Added full security header set.
**File:** `next.config.ts`

## DEFERRED — HIGH

- **30 instances** of `error.message` returned directly to clients across 14 API route files. This is the single largest remaining issue in the portfolio. Every route handler returns raw error text from Supabase/SDK calls.
- Custom test runner (`npx tsx src/lib/testRunner.ts`) instead of vitest — should migrate.

---

## ROUND 2 — Adversarial, Reduction & Cross-Angle Sweep (July 14, 2026)

### CRITICAL — `GET /api/portal/[id]` unauthenticated financial data exposure
**Finding:** Endpoint accepted `?phone=` param and returned member's complete financial profile (contributions, loans, meetings, fines, equity, arrears) with zero auth. Anyone could dump a member's entire financial history.
**Fix:** Added `supabase.auth.getUser()` + chama membership check at route entry.
**File:** `src/app/api/portal/[id]/route.ts`

### CRITICAL — `POST /api/ai/minutes` unauthenticated API credit burning
**Finding:** Endpoint accepted any POST and called Anthropic API with zero auth. Anyone could burn Claude credits in a loop.
**Fix:** Added auth check at route entry.
**File:** `src/app/api/ai/minutes/route.ts`

### HIGH — Vote-after-close never rejected server-side
**Finding:** Cast vote endpoint never checked if `closes_at` had passed. Members could vote after polls closed.
**Fix:** Added DB query checking `closes_at > now()` before accepting vote.
**File:** `src/app/api/chamas/[id]/votes/route.ts`

### HIGH — Dead auth middleware wired
**Finding:** Orphaned `proxy.ts` with no `middleware.ts`. Same as billflow/solocrm/studiopilot/reviewpilot/academiaai.
**Fix:** Created `src/middleware.ts`.
**File:** `src/middleware.ts` (NEW)

### MEDIUM — Missing Supabase dependencies in package.json
**Fix:** Added `@supabase/ssr` + `@supabase/supabase-js` — were imported in source but undeclared.
**File:** `package.json`

---

## ROUND 3 — Live Exploitation, Race Conditions & Chaos Engineering (July 14, 2026)

**Note:** Live testing skipped — no staging environment. Static race/business-logic analysis applied.

### CRITICAL — Contribution amount race condition (lost KES)
**Finding:** `SELECT amount_paid → JS addition → UPDATE amount_paid` was not atomic. Two officers recording contributions simultaneously → one amount silently lost.
**Fix:** Created `increment_contribution(p_id, p_amount, p_method, p_recorder)` PostgreSQL function doing atomic `UPDATE SET amount_paid = amount_paid + $2`. Route now calls `supabase.rpc("increment_contribution", ...)`.
**Files:** `supabase/schema.sql` (new function), `src/app/api/chamas/[id]/contributions/route.ts`

### MEDIUM — Loan approval race condition
**Finding:** Two officers can approve/reject the same loan simultaneously — no concurrency control. Last update wins.
**Status:** Deferred — needs `WHERE status = 'pending'` guard on UPDATE or version column.

### MEDIUM — Chama creation not atomic
**Finding:** INSERT chama → INSERT member → manual DELETE rollback. Crash between inserts → orphaned chama.
**Status:** Deferred — needs PostgreSQL function to wrap both inserts in a transaction.

### MEDIUM — Meeting attendance DELETE+INSERT not atomic
**Finding:** DELETE all attendance → INSERT new records. Crash between → permanent data loss.
**Status:** Deferred — should use upsert or transaction.

### MEDIUM — Officer self-dealing path
**Finding:** Officers can self-record contributions (POST) and self-approve loans (POST auto-approves for officers). Combined → self-fund then self-borrow.
**Status:** Noted — requires policy decision on officer permissions.

### LOW — No member removal API

---

## ROUND 4 — Multi-Discipline Review (July 14, 2026)

### Pass A — Legal: no privacy policy, no terms
Status: **Still missing.** ChamaVault collects phone numbers (PII) and financial records — high priority for privacy policy.

### Pass D — SEO: missing OG tags, robots.txt, sitemap
**Fixed:** Added `openGraph` to layout.tsx, created `robots.ts` + `sitemap.ts`.

### Pass G — Math: dividend distribution loses pennies
**Finding:** `POST /dividends` uses `Math.round(share * 100) / 100` without remainder distribution. `calcDividends()` has a correct algorithm, but the API route doesn't use it.
**Status:** Deferred — route should call `calcDividends()` or implement remainder distribution.

### Pass G — Math: conflicting interest formulas
**Finding:** `calcLoan()` uses flat rate; `getLoanOutstanding()` uses time-based simple interest. Same loan valued differently depending on code path.
**Status:** Deferred — need to standardize or document the two purposes.

### Pass B — Design: default interest_rate=10 hidden in form
**Finding:** Loan form defaults `interest_rate` to `10` in a hidden input — users may not realize a rate is being applied.
**Finding:** PATCH only handles role changes. No DELETE. Members can't be removed; if they could, orphan cleanup would be needed across 7 tables (contributions, loans, repayments, fines, dividends, attendance, votes).
**Status:** Deferred — feature gap.

## CONFIRMED SAFE

- No hardcoded secret fallbacks in lib files
- No RLS subscription bypass (chama/voting domain, no subscription_tier column)
