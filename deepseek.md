# chamavault — DeepSeek Audit

**Date:** 2026-07-13
**Path:** `C:\Users\TATI\Desktop\DEV\chamavault\`
**Stack:** TypeScript / Next.js 16 + Supabase
**Tier:** 1 — Critical
**Dependencies:** None installed

---

## 🔴 Security Vulnerabilities

| Severity | File | Line(s) | Vulnerability | Exact Fix |
|----------|------|---------|---------------|-----------|
| 🟡 MEDIUM | `src/app/api/chamas/[id]/export/route.ts` | 27-35 | 9 parallel `select("*")` queries — fetches entire database for export. No column limiting, no pagination. If DB has years of contributions, this blows up memory. | Add column projection: `.select("id, amount, created_at")` instead of `"*"`. Add date range filter. Stream large exports in chunks. |
| 🟡 MEDIUM | `src/app/api/chamas/[id]/members/[memberId]/route.ts` | — | RBAC: only chairperson can assign roles, prevents self-role-change. Good. | — |
| ✅ | Multiple API routes | — | Full RBAC with 4 roles (chairperson, treasurer, secretary, member). Server-side verification on every endpoint. Good. | — |
| ✅ | Supabase RLS | — | Additional RLS protection. Good. | — |

---

## 🟠 Performance Issues

| Severity | File | Line(s) | Issue | Exact Fix |
|----------|------|---------|-------|-----------|
| 🔴 CRITICAL | `src/app/page.tsx` | 140, 157, 164, 170, 175, 191, 206, 233, 245, 2159, 2205, 2209, 2251, 2267, 2426, 2430, 2526, 2530, 2611, 2615, 2769, 2773-2774 | **15+ repeated `.filter()` calls on every React render.** Same arrays (`db.loans`, `db.expenses`, `db.fines`, `db.meetings`) filtered 3-5 times each within neighboring JSX blocks. Each render is O(n×k) where k = number of filter calls. | Wrap ALL derived arrays in `useMemo` keyed by `[db, currentChamaId]`: `const chamaLoans = useMemo(() => db.loans.filter(l => l.chama_id === currentChamaId), [db, currentChamaId]);` then derive `activeLoans`, `pendingLoans`, etc. from cached `chamaLoans`. |
| 🔴 CRITICAL | `src/app/page.tsx` | 1-3050 | **Single monolithic 3050-line component.** Every state change re-renders the entire tree. No code splitting, no per-route segments. | Split into route-based pages using Next.js App Router: `/dashboard`, `/dashboard/contributions`, `/dashboard/loans`, `/dashboard/meetings`, `/dashboard/voting`, `/dashboard/fines`, `/dashboard/treasury`, `/dashboard/communication`, `/dashboard/settings`. Use `React.lazy` + `Suspense` for code splitting. |
| 🟠 HIGH | `src/app/api/chamas/[id]/export/route.ts` | 27-35 | 9 `select("*")` queries, no LIMIT, no date range filter. For a chama with 5 years of data → tens of thousands of rows into memory. | Add column projection + date range filter + chunked streaming. |
| 🟠 HIGH | All API route files | — | Every query filters by `chama_id` — no confirmation that indexes exist on `chama_members(chama_id)`, `contributions(chama_id)`, `loans(chama_id)`, etc. | Verify/create B-tree indexes on all `chama_id` foreign key columns in Supabase schema. |
| 🟡 MEDIUM | `src/app/page.tsx` | — | `useMemo` used for 11 derived values (good) but still not enough given the function is 3050 lines and re-executes fully on every render. | After splitting into route pages, each page will have its own `useMemo` scope, reducing re-computation dramatically. |

---

## 🟡 UI/UX Improvements

| Severity | File | Line(s) | Issue | Exact Fix |
|----------|------|---------|-------|-----------|
| 🔴 CRITICAL | `src/app/page.tsx` | 1-3050 | **Entire app is one page.** No route-based navigation, no deep links, no browser back/forward support. | Split into Next.js App Router routes: `/dashboard/(contributions|loans|meetings|voting|treasury|members|settings)`. |
| 🔴 CRITICAL | `src/app/page.tsx` | 2000+ lines | **272 hardcoded hex color values.** `#f59e0b`, `#0a0900`, `#2a2510`, `#14120a` repeated hundreds of times. No design tokens. | Create CSS custom properties: `:root { --color-accent: #f59e0b; --color-bg: #0a0900; --color-surface: #2a2510; --color-surface-alt: #14120a; }` and use `var(--color-accent)` everywhere. |
| 🔴 CRITICAL | `src/app/page.tsx` | 1326-1331 | **Custom useState toast** — not accessible: no `role="alert"`, no `aria-live` region, no screen reader announcement. | Replace with sonner `toast.success()`, `toast.error()` which handles accessibility automatically. |
| 🟠 HIGH | All forms | — | **Forms lack inline validation.** All validation is toast-based — no per-field error states, no `aria-invalid` attributes, no error text near fields. | Add inline validation: `aria-invalid="true"` on invalid fields, error message `<p role="alert">` below each field, red border on invalid inputs. |
| 🟡 MEDIUM | `src/components/page-loading.tsx` | 3-4 | All loading states show a simple spinner — no skeleton UI matching page layout. | Create skeleton components matching the card/grid layout: `DashboardSkeleton`, `ContributionSkeleton`, etc. |
| 🟡 MEDIUM | `src/app/page.tsx` | 1626 | No `<main>` landmark in dashboard. Content not wrapped in semantic HTML. | Wrap in `<main id="main-content" className="...">`. Add skip-to-content link. |
| 🟡 MEDIUM | PDF generators | — | `member-statement-pdf.tsx`, `meeting-minutes-pdf.tsx`, `annual-report-pdf.tsx` all use hardcoded hex colors. | Reference the same CSS custom properties or theme tokens. |
| ✅ | Various routes | — | Most routes have `error.tsx` boundaries. Skeleton UI component exists. Good. | — |

---

## 🔧 Session: 2026-07-14 — Multi-Agent Deep Audit Sweep (Round 1)

### Security fixes applied

| Severity | Issue | Fix | Files |
|----------|-------|-----|-------|
| 🟠 HIGH | No security headers configured | Added HSTS, X-Frame-Options: DENY, X-Content-Type-Options, Referrer-Policy | `next.config.ts` |

### Deferred — highest priority
- **30 instances** of `error.message` returned directly to clients across 14 API route files — largest remaining issue in the portfolio. Every route handler returns raw Supabase/SDK errors. Batch replace with generic messages.

### Confirmed safe
- No hardcoded secret fallbacks, no RLS subscription bypass (chama/voting domain)

### Artifacts created
- `AUDIT_LOG.md` — full audit trail

---

## 🔧 Session: 2026-07-14 — Round 2: Adversarial, Reduction & Cross-Angle Sweep

### CRITICAL fixes
- **`GET /api/portal/[id]` secured:** Was completely unauthenticated — returned member's full financial profile by phone number. Added `getUser()` + chama membership check.
- **`POST /api/ai/minutes` secured:** Was unauthenticated Anthropic API credit burning endpoint. Added auth check.
- **Vote-after-close blocked:** Server now checks `closes_at > now()` before accepting vote. Previously any member could vote after polls closed.

### Infrastructure
- Created `src/middleware.ts` (orphaned `proxy.ts` now wired)
- Added missing `@supabase/ssr` + `@supabase/supabase-js` to package.json

---

## 🔧 Session: 2026-07-14 — Round 3: Race Conditions & Business Logic (Static)

### Race condition fixes
- **CRITICAL: Contribution amount race** — Replaced `SELECT → JS addition → UPDATE` with atomic `increment_contribution()` PostgreSQL function via `supabase.rpc()`. Prevents lost KES when two officers record contributions simultaneously.
- Documented other races: loan approval (no concurrency control), chama creation (two-table insert without transaction), meeting attendance (DELETE+INSERT crash = data loss).

### Business logic findings
- Officers can self-deal: self-record contributions + self-approve loans
- No member removal API — if ever added, needs cascading cleanup across 7 tables
- Loan eligibility check (3× contributions) uses non-atomic SELECT before INSERT

---

## 🔧 Session: 2026-07-14 — Round 4: Multi-Discipline Review

### Fixes applied
- Added `openGraph` metadata, `robots.ts` + `sitemap.ts`
- Math: dividend POST loses pennies (no remainder distribution), conflicting interest formulas (flat vs time-based)
- Legal: collects phone PII with no privacy policy

| Category | Package | Issue | Fix |
|----------|---------|-------|-----|
| 🟡 MEDIUM | `next 16.2.6`, `react 19.0.0` | Pinned — good. | — |
| 🟡 MEDIUM | Only 4 prod deps (next, react, react-dom, lucide-react) — minimal and good choice. | — |
| 🟡 MEDIUM | Dev deps | `^4` on tailwindcss, `^9` on eslint, `^5` on typescript — loose. | Pin to exact versions. |

### Missing Dev Tooling
- No `typecheck` script
- No test framework (vitest/jest)
- No `.nvmrc`
- No `verify` script

---

## 📋 Priority Fix Queue

1. **[CRITICAL — Monolithic Component]** `src/app/page.tsx` — Split 3050-line file into route-based pages using App Router. Each section (contributions, loans, meetings, voting, treasury, members, settings) becomes its own route at `/dashboard/[section]`.
2. **[CRITICAL — Render Performance]** `src/app/page.tsx:140-2774` — Wrap ALL `.filter()` calls in `useMemo` BEFORE splitting routes. After split, each route page uses its own memo scope.
3. **[CRITICAL — Design Tokens]** `src/app/page.tsx` — Replace 272 hardcoded hex values with CSS custom properties. Create `src/app/theme.css` with `:root { ... }` variables.
4. **[CRITICAL — Toast Accessibility]** `src/app/page.tsx:1326-1331` — Replace custom useState toast with sonner `toast()` for automatic `role="alert"` and `aria-live` support.
5. **[HIGH — Form Validation]** All forms — Add inline `aria-invalid` + `<p role="alert">` per-field errors alongside toast notifications.
6. **[HIGH — DB Indexes]** Verify Supabase indexes on all `chama_id` FK columns: `chama_members`, `contributions`, `loans`, `expenses`, `fines`, `meetings`, `investments`, `votes`.
7. **[MEDIUM — Loading Skeletons]** `src/components/page-loading.tsx` — Replace spinner-only with skeleton UI matching actual layout.
8. **[MEDIUM — Semantic HTML]** Add `<main>` landmark, skip-to-content link.
