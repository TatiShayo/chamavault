/**
 * Canonical money arithmetic for ChamaVault.
 *
 * ── Why this module exists ──
 * All monetary values in ChamaVault represent Kenyan Shillings (KES). The
 * database stores them as NUMERIC(15,2). JavaScript numbers are IEEE-754
 * floats, so naive `a + b` / `x * rate` chains accumulate rounding drift
 * (e.g. `0.1 + 0.2 !== 0.3`). For money movement that drift becomes real
 * shillings gained or lost.
 *
 * The rule for this codebase: **do money math in integer cents, never in
 * float KES.** Convert KES → integer cents at the boundary, add/subtract as
 * integers, split with the largest-remainder method so the parts sum EXACTLY
 * to the whole, then convert back to KES only for display/storage.
 *
 * This module is the single source of truth for:
 *   - currency conversion (toCents / fromCents)
 *   - the canonical loan interest formula (flat rate on principal)
 *   - exact dividend / payout allocation by member shares
 *
 * Any route or component doing money math should call these helpers rather
 * than reimplementing the arithmetic inline.
 */

const CENTS_PER_UNIT = 100;

/**
 * Convert a KES amount (possibly a float or numeric string from the DB/JSON)
 * to an integer number of cents, rounded half-up to the nearest cent.
 * Guards against NaN/Infinity by returning 0.
 */
export function toCents(kes: number | string): number {
  if (kes === null || kes === undefined || typeof kes === "boolean") return 0;
  if (typeof kes === "string") {
    const trimmed = kes.trim();
    // Guard against null bytes, control characters, or hex/octal/binary injections
    if (/[\0\x00-\x1F]/.test(trimmed) || /^0[xXbBoO]/.test(trimmed)) {
      return 0;
    }
  }
  const n = typeof kes === "string" ? Number(kes) : kes;
  if (typeof n !== "number" || !Number.isFinite(n)) return 0;
  // Round half away from zero. A bare `Math.round(n * 100)` mis-rounds the
  // classic float trap `1.005 * 100 === 100.49999999999999` down to 100.
  // `toFixed(4)` re-materialises the value as a decimal string, absorbing the
  // ~1e-13 binary-representation error while preserving the true 3rd decimal,
  // so 1.005 → "100.5000" → 101. Work on the magnitude and re-apply the sign
  // so negatives round away from zero too (Math.round(-0.5) === -0, not -1).
  const sign = n < 0 ? -1 : 1;
  const scaled = Number((Math.abs(n) * CENTS_PER_UNIT).toFixed(4));
  return sign * Math.round(scaled);
}

/**
 * Convert integer cents back to a KES number with 2 decimal places.
 */
export function fromCents(cents: number): number {
  if (!Number.isFinite(cents)) return 0;
  return Math.round(cents) / CENTS_PER_UNIT;
}

/**
 * Sum a list of KES amounts with no float drift. Returns integer cents.
 */
export function sumCents(amounts: Array<number | string>): number {
  if (!Array.isArray(amounts)) return 0;
  return amounts.reduce<number>((acc, a) => acc + toCents(a), 0);
}

// ── Loans ──────────────────────────────────────────────────────────────────
//
// CANONICAL loan interest formula: flat interest on principal for the life of
// the loan. `interest = principal * (rate% / 100)`. This matches how Kenyan
// chamas quote loans ("10% flat") and how every UI/report in this app already
// displays them. Time-based accrual is intentionally NOT used as the canonical
// formula — see REVIEW_FINDINGS.md (conflicting-formula finding) for the
// rationale. All loan-balance call sites should route through here.

export interface LoanBalance {
  principalCents: number;
  interestCents: number;
  totalDueCents: number;
  outstandingCents: number;
}

/**
 * Canonical loan balance in integer cents.
 * @param principalKes principal advanced to the member (KES)
 * @param ratePercent  flat interest rate, e.g. 10 for 10%
 * @param totalRepaidKes sum of repayments made so far (KES)
 */
export function loanBalance(
  principalKes: number | string,
  ratePercent: number | string,
  totalRepaidKes: number | string = 0
): LoanBalance {
  const principalCents = Math.max(0, toCents(principalKes));
  const rate = Math.max(0, Number(ratePercent) || 0);
  // interest computed on the cents principal, rounded to whole cents.
  const interestCents = Math.round(principalCents * (rate / 100));
  const totalDueCents = principalCents + interestCents;
  const repaidCents = Math.max(0, toCents(totalRepaidKes));
  const outstandingCents = Math.max(0, totalDueCents - repaidCents);
  return { principalCents, interestCents, totalDueCents, outstandingCents };
}

/** Convenience: outstanding balance of a loan in KES. */
export function loanOutstanding(
  principalKes: number | string,
  ratePercent: number | string,
  totalRepaidKes: number | string = 0
): number {
  return fromCents(loanBalance(principalKes, ratePercent, totalRepaidKes).outstandingCents);
}

// ── Payout / dividend allocation ─────────────────────────────────────────────

export interface Allocation<T> {
  item: T;
  amountCents: number;
}

/**
 * Split `totalCents` among items in proportion to non-negative `weights`,
 * using the **largest-remainder method** so the allocated parts sum EXACTLY
 * to `totalCents` — no shilling created or destroyed by rounding.
 *
 * If every weight is zero, the total is split as evenly as possible instead
 * (each member gets an equal share, remainder cents handed out one at a time).
 *
 * Works correctly for negative totals (a loss distribution) too.
 *
 * @returns one allocation per item, in the same order as `items`.
 */
export interface DividendAllocation {
  memberId: string;
  shareUnits: number;
  amountCents: number;
  amountKes: number;
}

/**
 * Canonical dividend / payout split for a chama.
 *
 * `distributableProfitKes` is split among `members` in proportion to their
 * `share_units` using the largest-remainder method so the parts sum EXACTLY to
 * the profit — no shilling created or lost. When no member has share_units the
 * profit is split evenly. This is the SINGLE source of truth for payout
 * allocation; both the read (`GET`) and the write (`POST`) paths of the
 * dividends route call it so the preview and the persisted records always agree.
 */
export function allocateDividends(
  distributableProfitKes: number,
  members: Array<{ id: string; share_units: number | string | null }>
): DividendAllocation[] {
  const totalCents = toCents(distributableProfitKes);
  const parts = allocateByShares(totalCents, members, (m) => Number(m.share_units) || 0);
  return parts.map(({ item, amountCents }) => ({
    memberId: item.id,
    shareUnits: Number(item.share_units) || 0,
    amountCents,
    amountKes: fromCents(amountCents),
  }));
}

export function allocateByShares<T>(
  totalCents: number,
  items: T[],
  weightOf: (item: T) => number
): Array<Allocation<T>> {
  const n = items.length;
  if (n === 0) return [];

  const total = Math.round(totalCents);
  const weights = items.map((it) => {
    const w = weightOf(it);
    return Number.isFinite(w) && w > 0 ? w : 0;
  });
  const totalWeight = weights.reduce((s, w) => s + w, 0);

  // Even split when there are no meaningful weights.
  const effectiveWeights =
    totalWeight > 0 ? weights : new Array<number>(n).fill(1);
  const effectiveTotalWeight =
    totalWeight > 0 ? totalWeight : n;

  // Floor each share toward zero, track fractional remainder for ranking.
  const raw = effectiveWeights.map((w) => (total * w) / effectiveTotalWeight);
  const floored = raw.map((r) => Math.trunc(r));
  const allocated = floored.reduce((s, f) => s + f, 0);
  let leftover = total - allocated; // signed cents still to hand out

  // Rank indices by fractional part so the members "most owed" a cent get it
  // first. For negative leftovers we take from the members least owed.
  const order = raw
    .map((r, i) => ({ i, frac: r - floored[i] }))
    .sort((a, b) => b.frac - a.frac)
    .map((x) => x.i);

  const result = floored.slice();
  const step = leftover >= 0 ? 1 : -1;
  let k = 0;
  while (leftover !== 0 && k < order.length * 2) {
    const idx = leftover >= 0 ? order[k % order.length] : order[order.length - 1 - (k % order.length)];
    result[idx] += step;
    leftover -= step;
    k++;
  }

  return items.map((item, i) => ({ item, amountCents: result[i] }));
}

// ── Compound Interest & Financial Utilities ─────────────────────────────────

/**
 * Calculate compound interest in integer cents:
 * A = P * (1 + r/n)^(n*t) - P
 * @param principalKes Principal amount in KES
 * @param annualRatePercent Annual nominal rate, e.g. 12 for 12%
 * @param periods Total number of compounding periods elapsed
 * @param periodsPerYear Compounding frequency per year (e.g. 12 for monthly, 365 for daily)
 */
export function compoundInterestCents(
  principalKes: number | string,
  annualRatePercent: number | string,
  periods: number,
  periodsPerYear: number = 12
): { interestCents: number; totalDueCents: number } {
  const principalCents = toCents(principalKes);
  if (principalCents <= 0 || periods <= 0) {
    return { interestCents: 0, totalDueCents: principalCents };
  }
  const rate = (Number(annualRatePercent) || 0) / 100;
  const periodicRate = rate / Math.max(1, periodsPerYear);
  const factor = Math.pow(1 + periodicRate, periods);
  const totalDueCents = Math.round(principalCents * factor);
  const interestCents = Math.max(0, totalDueCents - principalCents);
  return { interestCents, totalDueCents };
}

export interface LatePenaltyRule {
  type: "flat" | "percentage" | "daily";
  value: number; // KES flat amount, or percentage (e.g. 5 for 5%), or daily percentage (e.g. 0.1 for 0.1%/day)
  daysOverdue?: number;
  graceDays?: number;
}

/**
 * Calculate late penalty fee in integer cents.
 */
export function calculateLatePenaltyCents(
  dueAmountKes: number | string,
  rule: LatePenaltyRule
): number {
  const dueCents = toCents(dueAmountKes);
  if (dueCents <= 0) return 0;

  const daysOverdue = Math.max(0, rule.daysOverdue || 0);
  const graceDays = Math.max(0, rule.graceDays || 0);

  if (daysOverdue <= graceDays) {
    return 0;
  }

  const effectiveDays = daysOverdue - graceDays;

  switch (rule.type) {
    case "flat":
      return toCents(rule.value);
    case "percentage":
      return Math.round(dueCents * (rule.value / 100));
    case "daily":
      return Math.round(dueCents * (rule.value / 100) * effectiveDays);
    default:
      return 0;
  }
}

export interface WaterfallObligation {
  penaltiesKes: number | string;
  interestKes: number | string;
  principalKes: number | string;
}

export interface WaterfallResult {
  paidPenaltiesCents: number;
  paidInterestCents: number;
  paidPrincipalCents: number;
  remainingPaymentCents: number;
  remainingPenaltiesCents: number;
  remainingInterestCents: number;
  remainingPrincipalCents: number;
  totalRemainingDueCents: number;
}

/**
 * Priority payment waterfall:
 * 1. Penalties & Fines
 * 2. Accrued Interest
 * 3. Principal
 */
export function applyPaymentWaterfall(
  paymentKes: number | string,
  obligations: WaterfallObligation
): WaterfallResult {
  let availableCents = toCents(paymentKes);
  const penaltiesDue = toCents(obligations.penaltiesKes);
  const interestDue = toCents(obligations.interestKes);
  const principalDue = toCents(obligations.principalKes);

  // 1. Settle penalties
  const paidPenaltiesCents = Math.min(availableCents, penaltiesDue);
  availableCents -= paidPenaltiesCents;
  const remainingPenaltiesCents = penaltiesDue - paidPenaltiesCents;

  // 2. Settle interest
  const paidInterestCents = Math.min(availableCents, interestDue);
  availableCents -= paidInterestCents;
  const remainingInterestCents = interestDue - paidInterestCents;

  // 3. Settle principal
  const paidPrincipalCents = Math.min(availableCents, principalDue);
  availableCents -= paidPrincipalCents;
  const remainingPrincipalCents = principalDue - paidPrincipalCents;

  const totalRemainingDueCents =
    remainingPenaltiesCents + remainingInterestCents + remainingPrincipalCents;

  return {
    paidPenaltiesCents,
    paidInterestCents,
    paidPrincipalCents,
    remainingPaymentCents: availableCents,
    remainingPenaltiesCents,
    remainingInterestCents,
    remainingPrincipalCents,
    totalRemainingDueCents,
  };
}
