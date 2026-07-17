# ChamaVault

**Group-savings ("chama" / SACCO) management for Kenyan investment groups.** ChamaVault
gives a chama's officers one place to record member contributions, issue and track
loans, log fines and expenses, run resolutions/votes, distribute year-end dividends,
and generate PDF statements and meeting minutes — bilingual (English / Kiswahili).

> Chamas move real money. ChamaVault treats contribution, loan, and dividend logic
> as money-movement code: monetary math is done in **integer cents**, payout and
> interest use a **single canonical formula**, and the arithmetic is locked by tests.

---

## Stack

| Layer     | Choice                                             |
|-----------|----------------------------------------------------|
| Framework | Next.js 16 (App Router, React 19, Turbopack)       |
| Language  | TypeScript (strict)                                |
| Data      | Supabase (Postgres + Auth + Storage), RLS-scoped   |
| UI        | Tailwind CSS v4, Base UI, lucide-react             |
| Validation| Zod on money-mutation inputs                       |
| PDF       | @react-pdf/renderer (statements, minutes, reports) |
| Messaging | Resend (email), Africa's Talking (SMS)             |
| AI        | Anthropic API (draft meeting minutes)              |
| Tests     | Vitest                                             |

## Getting started

```bash
npm install
cp .env.example .env.local   # then fill in the values below
npm run dev                  # http://localhost:3000
```

### Required environment variables

| Variable                          | Purpose                                  |
|-----------------------------------|------------------------------------------|
| `NEXT_PUBLIC_SUPABASE_URL`        | Supabase project URL                     |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`   | Supabase anon key (browser)              |
| `SUPABASE_SERVICE_ROLE_KEY`       | Server-only admin key (never exposed)    |
| `NEXT_PUBLIC_SITE_URL`            | Canonical site URL for links in emails   |
| `RESEND_API_KEY`                  | Email delivery (optional; skipped if unset) |
| `AT_API_KEY` / `AT_USERNAME` / `AT_SENDER_ID` | SMS via Africa's Talking (optional) |
| `ANTHROPIC_API_KEY`               | AI meeting-minutes drafting (optional)   |

No secret is hardcoded — every credential is read from the environment.

### Database setup

1. Run `supabase/schema.sql` **then reconcile it with the live schema** — note that
   `schema.sql` is older than the app and does not yet reflect all columns the code
   uses (see `REVIEW_FINDINGS.md`).
2. **Apply `supabase/rls-policies.sql`** — this enables default-deny Row Level
   Security on every table, the membership/officer-scoped policies, the unique
   dividend index, non-negative money constraints, and performance indexes.

## Scripts

```bash
npm run dev         # dev server
npm run build       # production build
npm run typecheck   # tsc --noEmit
npm run lint        # eslint
npm run test        # vitest run
npm run ci          # typecheck + lint + test
```

## Security model

- **Authentication** on every API route (`supabase.auth.getUser()`).
- **Authorization** on every route: a caller must be a member of the chama in the
  URL, and money-mutating actions require an officer role. RLS is the default-deny
  net underneath, so a member of chama A can never read or write chama B's data.
- **Money integrity**: integer-cents arithmetic, one canonical payout/interest
  formula, idempotency guards against double-payout, atomic increments/updates
  against concurrent officers.
- **Headers**: HSTS, CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy,
  Permissions-Policy.
- **Rate limiting** on the paid AI route and outbound SMS/email.

See `ARCHITECTURE.md` for the system model and `AUDIT_LOG.md` / `REVIEW_FINDINGS.md`
for the full security and money-correctness audit trail.
