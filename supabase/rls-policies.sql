-- ============================================================================
-- ChamaVault — Row Level Security (default-deny) + integrity constraints
-- ============================================================================
--
-- WHY THIS FILE EXISTS
-- --------------------
-- Cross-chama isolation ("a member of chama A must never read or modify chama
-- B's money") was previously enforced ONLY by per-route server checks. That is
-- a single layer: the day one route forgets the membership check (exactly what
-- happened historically with GET /api/portal/[id]), every member's financial
-- history leaks. RLS is the default-deny safety net UNDER those server checks.
--
-- IMPORTANT — APPLY & REVIEW BEFORE PRODUCTION
-- --------------------------------------------
-- supabase/schema.sql in this repo is stale (its column names predate the app,
-- e.g. it still has contributions.amount / contribution_date while the code
-- uses amount_paid / amount_due / month_year). This file is written against the
-- columns the APPLICATION actually uses. Diff it against your live Supabase
-- schema before running. Run once in the Supabase SQL editor / a migration.
--
-- MODEL
-- -----
-- Membership predicate: a user belongs to a chama iff a chama_members row links
-- their auth.uid() to that chama_id. All financial tables are scoped through
-- that. Enabling RLS with NO permissive policy = deny-all, so every table below
-- is explicitly enabled AND given membership-scoped policies.
-- ============================================================================

-- Membership check as SECURITY DEFINER to avoid infinite RLS recursion when a
-- chama_members policy needs to read chama_members.
CREATE OR REPLACE FUNCTION public.is_chama_member(p_chama_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM chama_members
    WHERE chama_id = p_chama_id AND user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_chama_officer(p_chama_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM chama_members
    WHERE chama_id = p_chama_id
      AND user_id = auth.uid()
      AND role IN ('chairperson', 'treasurer', 'secretary')
  );
$$;

-- ── chamas ──────────────────────────────────────────────────────────────────
ALTER TABLE chamas ENABLE ROW LEVEL SECURITY;
ALTER TABLE chamas FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS chamas_select ON chamas;
CREATE POLICY chamas_select ON chamas FOR SELECT
  USING (public.is_chama_member(id));
DROP POLICY IF EXISTS chamas_update ON chamas;
CREATE POLICY chamas_update ON chamas FOR UPDATE
  USING (public.is_chama_officer(id));
-- INSERT of a new chama is handled by a SECURITY DEFINER RPC (creator becomes
-- the first member atomically); no direct client INSERT policy on purpose.

-- ── chama_members ───────────────────────────────────────────────────────────
ALTER TABLE chama_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE chama_members FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS members_select ON chama_members;
CREATE POLICY members_select ON chama_members FOR SELECT
  USING (public.is_chama_member(chama_id));
DROP POLICY IF EXISTS members_write ON chama_members;
CREATE POLICY members_write ON chama_members FOR ALL
  USING (public.is_chama_officer(chama_id))
  WITH CHECK (public.is_chama_officer(chama_id));

-- ── Generic per-chama financial tables ──────────────────────────────────────
-- SELECT: any member of the chama. WRITE: officers only.
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'contributions', 'fines', 'loans', 'expenses', 'dividends',
    'meetings', 'votes', 'investments'
  ]
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY;', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I;', t || '_select', t);
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR SELECT USING (public.is_chama_member(chama_id));',
      t || '_select', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I;', t || '_write', t);
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR ALL USING (public.is_chama_officer(chama_id)) WITH CHECK (public.is_chama_officer(chama_id));',
      t || '_write', t);
  END LOOP;
END $$;

-- ── Child tables scoped through their parent (no direct chama_id column) ─────
-- loan_repayments -> loans.chama_id
ALTER TABLE loan_repayments ENABLE ROW LEVEL SECURITY;
ALTER TABLE loan_repayments FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS repayments_select ON loan_repayments;
CREATE POLICY repayments_select ON loan_repayments FOR SELECT
  USING (EXISTS (SELECT 1 FROM loans l WHERE l.id = loan_id AND public.is_chama_member(l.chama_id)));
DROP POLICY IF EXISTS repayments_write ON loan_repayments;
CREATE POLICY repayments_write ON loan_repayments FOR ALL
  USING (EXISTS (SELECT 1 FROM loans l WHERE l.id = loan_id AND public.is_chama_officer(l.chama_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM loans l WHERE l.id = loan_id AND public.is_chama_officer(l.chama_id)));

-- meeting_attendance -> meetings.chama_id
ALTER TABLE meeting_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_attendance FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS attendance_select ON meeting_attendance;
CREATE POLICY attendance_select ON meeting_attendance FOR SELECT
  USING (EXISTS (SELECT 1 FROM meetings m WHERE m.id = meeting_id AND public.is_chama_member(m.chama_id)));
DROP POLICY IF EXISTS attendance_write ON meeting_attendance;
CREATE POLICY attendance_write ON meeting_attendance FOR ALL
  USING (EXISTS (SELECT 1 FROM meetings m WHERE m.id = meeting_id AND public.is_chama_officer(m.chama_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM meetings m WHERE m.id = meeting_id AND public.is_chama_officer(m.chama_id)));

-- vote_records -> votes.chama_id. Any member may cast (INSERT) their own vote;
-- the unique(vote_id, member_id) constraint enforces one vote per member.
ALTER TABLE vote_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE vote_records FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS vote_records_select ON vote_records;
CREATE POLICY vote_records_select ON vote_records FOR SELECT
  USING (EXISTS (SELECT 1 FROM votes v WHERE v.id = vote_id AND public.is_chama_member(v.chama_id)));
DROP POLICY IF EXISTS vote_records_insert ON vote_records;
CREATE POLICY vote_records_insert ON vote_records FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM votes v WHERE v.id = vote_id AND public.is_chama_member(v.chama_id)));

-- ============================================================================
-- INTEGRITY CONSTRAINTS (money correctness backstops)
-- ============================================================================

-- Hard backstop for the double-payout guard in the dividends route: one payout
-- row per member per year. A concurrent second POST hits 23505 (handled → 409).
CREATE UNIQUE INDEX IF NOT EXISTS uniq_dividend_member_year
  ON dividends (chama_id, member_id, year);

-- Contributions/loans/repayments/fines/expenses must never be negative.
ALTER TABLE contributions DROP CONSTRAINT IF EXISTS chk_contrib_nonneg;
ALTER TABLE contributions ADD CONSTRAINT chk_contrib_nonneg
  CHECK (amount_paid >= 0 AND amount_due >= 0);
ALTER TABLE loans DROP CONSTRAINT IF EXISTS chk_loan_pos;
ALTER TABLE loans ADD CONSTRAINT chk_loan_pos
  CHECK (amount > 0 AND interest_rate >= 0);
ALTER TABLE loan_repayments DROP CONSTRAINT IF EXISTS chk_repay_pos;
ALTER TABLE loan_repayments ADD CONSTRAINT chk_repay_pos CHECK (amount > 0);
ALTER TABLE expenses DROP CONSTRAINT IF EXISTS chk_expense_pos;
ALTER TABLE expenses ADD CONSTRAINT chk_expense_pos CHECK (amount >= 0);

-- ============================================================================
-- PERFORMANCE INDEXES (the app filters every financial read by chama_id)
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_members_chama_user   ON chama_members (chama_id, user_id);
CREATE INDEX IF NOT EXISTS idx_contrib_chama_month  ON contributions (chama_id, month_year);
CREATE INDEX IF NOT EXISTS idx_contrib_member       ON contributions (member_id);
CREATE INDEX IF NOT EXISTS idx_loans_chama_status   ON loans (chama_id, status);
CREATE INDEX IF NOT EXISTS idx_repay_loan           ON loan_repayments (loan_id);
CREATE INDEX IF NOT EXISTS idx_expenses_chama_date  ON expenses (chama_id, expense_date);
CREATE INDEX IF NOT EXISTS idx_fines_chama          ON fines (chama_id);
CREATE INDEX IF NOT EXISTS idx_dividends_chama_year ON dividends (chama_id, year);
