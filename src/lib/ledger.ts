/**
 * Double-Entry & Auditable Contribution Ledger for ChamaVault
 *
 * Implements:
 * 1. Double-entry bookkeeping: every transaction has equal Debits and Credits in integer cents
 * 2. Fundamental balance invariant: Assets = Liabilities + Equity + (Revenues - Expenses)
 * 3. Tamper-evident sequential hash chaining for audit trails
 * 4. Trial balance generation and ledger integrity verification
 * 5. Reconciliations for member savings, loan portfolios, and treasury accounts
 */

import { toCents, fromCents } from "./money";

export type AccountType =
  | "asset"
  | "liability"
  | "equity"
  | "revenue"
  | "expense";

export interface LedgerAccount {
  id: string;
  name: string;
  type: AccountType;
  normalBalance: "debit" | "credit";
  balanceCents: number;
}

export interface JournalLine {
  accountId: string;
  accountName: string;
  type: AccountType;
  debitCents: number;
  creditCents: number;
}

export interface JournalEntry {
  id: string;
  chamaId: string;
  transactionRef: string;
  description: string;
  timestamp: string;
  lines: JournalLine[];
  totalAmountCents: number;
  previousHash: string;
  hash: string;
}

export interface LedgerState {
  chamaId: string;
  accounts: Record<string, LedgerAccount>;
  journalEntries: JournalEntry[];
  lastHash: string;
}

/**
 * Computes a deterministic checksum/hash for a journal entry line and block.
 */
function computeHash(prevHash: string, data: string): string {
  let hash = 0;
  const str = `${prevHash}:${data}`;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return `h_${Math.abs(hash).toString(16).padStart(8, "0")}`;
}

/**
 * Initializes a standard chart of accounts for a Chama.
 */
export function createChamaLedger(chamaId: string): LedgerState {
  const accounts: Record<string, LedgerAccount> = {
    // Assets
    "101": { id: "101", name: "Bank Account", type: "asset", normalBalance: "debit", balanceCents: 0 },
    "102": { id: "102", name: "M-Pesa Till / Paybill", type: "asset", normalBalance: "debit", balanceCents: 0 },
    "103": { id: "103", name: "Loans Receivable", type: "asset", normalBalance: "debit", balanceCents: 0 },
    "104": { id: "104", name: "Investments Portfolio", type: "asset", normalBalance: "debit", balanceCents: 0 },
    // Liabilities
    "201": { id: "201", name: "Member Savings & Shares", type: "liability", normalBalance: "credit", balanceCents: 0 },
    "202": { id: "202", name: "Dividends Payable", type: "liability", normalBalance: "credit", balanceCents: 0 },
    // Equity
    "301": { id: "301", name: "Retained Chama Surplus", type: "equity", normalBalance: "credit", balanceCents: 0 },
    "302": { id: "302", name: "Emergency Reserve Fund", type: "equity", normalBalance: "credit", balanceCents: 0 },
    // Revenues
    "401": { id: "401", name: "Loan Interest Income", type: "revenue", normalBalance: "credit", balanceCents: 0 },
    "402": { id: "402", name: "Late Fines & Penalties", type: "revenue", normalBalance: "credit", balanceCents: 0 },
    "403": { id: "403", name: "Registration & Membership Fees", type: "revenue", normalBalance: "credit", balanceCents: 0 },
    // Expenses
    "501": { id: "501", name: "Meeting & Refreshment Expenses", type: "expense", normalBalance: "debit", balanceCents: 0 },
    "502": { id: "502", name: "Administrative & Stationery", type: "expense", normalBalance: "debit", balanceCents: 0 },
    "503": { id: "503", name: "Bank & Transaction Charges", type: "expense", normalBalance: "debit", balanceCents: 0 },
  };

  return {
    chamaId,
    accounts,
    journalEntries: [],
    lastHash: "GENESIS_HASH_00000000",
  };
}

/**
 * Posts a balanced double-entry journal entry to the ledger.
 * Invariant: Sum(Debits) === Sum(Credits)
 */
export function postJournalEntry(
  ledger: LedgerState,
  params: {
    id: string;
    transactionRef: string;
    description: string;
    lines: Array<{
      accountId: string;
      debitKes?: number | string;
      creditKes?: number | string;
    }>;
  }
): LedgerState {
  if (params.lines.length < 2) {
    throw new Error("Journal entry must have at least 2 lines (double-entry requirement)");
  }

  let totalDebitCents = 0;
  let totalCreditCents = 0;

  const resolvedLines: JournalLine[] = [];

  for (const line of params.lines) {
    const account = ledger.accounts[line.accountId];
    if (!account) {
      throw new Error(`Ledger account ${line.accountId} does not exist`);
    }

    const debitCents = line.debitKes !== undefined ? toCents(line.debitKes) : 0;
    const creditCents = line.creditKes !== undefined ? toCents(line.creditKes) : 0;

    if (debitCents < 0 || creditCents < 0) {
      throw new Error("Debit and credit amounts must be non-negative");
    }
    if (debitCents > 0 && creditCents > 0) {
      throw new Error("A single line cannot have both debit and credit amounts");
    }
    if (debitCents === 0 && creditCents === 0) {
      continue;
    }

    totalDebitCents += debitCents;
    totalCreditCents += creditCents;

    resolvedLines.push({
      accountId: account.id,
      accountName: account.name,
      type: account.type,
      debitCents,
      creditCents,
    });
  }

  // Enforce the fundamental double-entry invariant
  if (totalDebitCents !== totalCreditCents) {
    throw new Error(
      `Double-entry imbalance: Total debits (${fromCents(
        totalDebitCents
      )}) != Total credits (${fromCents(totalCreditCents)})`
    );
  }
  if (totalDebitCents === 0) {
    throw new Error("Journal entry cannot have zero total value");
  }

  // Update account balances
  const updatedAccounts = { ...ledger.accounts };
  for (const line of resolvedLines) {
    const acct = updatedAccounts[line.accountId];
    let newBalance = acct.balanceCents;

    if (acct.normalBalance === "debit") {
      newBalance += line.debitCents - line.creditCents;
    } else {
      newBalance += line.creditCents - line.debitCents;
    }

    updatedAccounts[line.accountId] = {
      ...acct,
      balanceCents: newBalance,
    };
  }

  // Construct hash-chained journal entry
  const lineSummary = resolvedLines
    .map((l) => `${l.accountId}:${l.debitCents}:${l.creditCents}`)
    .join(";");
  const payloadData = `${params.id}:${params.transactionRef}:${totalDebitCents}:${lineSummary}`;
  const newHash = computeHash(ledger.lastHash, payloadData);

  const entry: JournalEntry = {
    id: params.id,
    chamaId: ledger.chamaId,
    transactionRef: params.transactionRef,
    description: params.description,
    timestamp: new Date().toISOString(),
    lines: resolvedLines,
    totalAmountCents: totalDebitCents,
    previousHash: ledger.lastHash,
    hash: newHash,
  };

  return {
    ...ledger,
    accounts: updatedAccounts,
    journalEntries: [...ledger.journalEntries, entry],
    lastHash: newHash,
  };
}

/**
 * Convenience helper: Record member contribution.
 * Debit: M-Pesa Till (102)
 * Credit: Member Savings & Shares (201)
 */
export function recordContributionTransaction(
  ledger: LedgerState,
  entryId: string,
  ref: string,
  memberId: string,
  amountKes: number | string
): LedgerState {
  return postJournalEntry(ledger, {
    id: entryId,
    transactionRef: ref,
    description: `Member contribution from ${memberId}`,
    lines: [
      { accountId: "102", debitKes: amountKes },
      { accountId: "201", creditKes: amountKes },
    ],
  });
}

/**
 * Convenience helper: Disburse a loan.
 * Debit: Loans Receivable (103)
 * Credit: M-Pesa Till (102)
 */
export function recordLoanDisbursementTransaction(
  ledger: LedgerState,
  entryId: string,
  ref: string,
  loanId: string,
  principalKes: number | string
): LedgerState {
  return postJournalEntry(ledger, {
    id: entryId,
    transactionRef: ref,
    description: `Loan disbursement for ${loanId}`,
    lines: [
      { accountId: "103", debitKes: principalKes },
      { accountId: "102", creditKes: principalKes },
    ],
  });
}

/**
 * Convenience helper: Record loan repayment (principal + interest).
 * Debit: M-Pesa Till (102)
 * Credit: Loans Receivable (103) for principal
 * Credit: Loan Interest Income (401) for interest
 */
export function recordLoanRepaymentTransaction(
  ledger: LedgerState,
  entryId: string,
  ref: string,
  loanId: string,
  principalPaidKes: number | string,
  interestPaidKes: number | string
): LedgerState {
  return postJournalEntry(ledger, {
    id: entryId,
    transactionRef: ref,
    description: `Loan repayment for ${loanId}`,
    lines: [
      { accountId: "102", debitKes: fromCents(toCents(principalPaidKes) + toCents(interestPaidKes)) },
      { accountId: "103", creditKes: principalPaidKes },
      { accountId: "401", creditKes: interestPaidKes },
    ],
  });
}

/**
 * Convenience helper: Record expense payment.
 * Debit: Meeting & Refreshment Expenses (501) or Admin (502)
 * Credit: M-Pesa Till (102) or Bank (101)
 */
export function recordExpenseTransaction(
  ledger: LedgerState,
  entryId: string,
  ref: string,
  categoryAccountId: "501" | "502" | "503",
  amountKes: number | string,
  description: string
): LedgerState {
  return postJournalEntry(ledger, {
    id: entryId,
    transactionRef: ref,
    description,
    lines: [
      { accountId: categoryAccountId, debitKes: amountKes },
      { accountId: "102", creditKes: amountKes },
    ],
  });
}

/**
 * Generates a Trial Balance and validates fundamental accounting equations.
 */
export function generateTrialBalance(ledger: LedgerState): {
  isBalanced: boolean;
  totalDebitsCents: number;
  totalCreditsCents: number;
  assetsTotalCents: number;
  liabilitiesTotalCents: number;
  equityTotalCents: number;
  revenueTotalCents: number;
  expensesTotalCents: number;
  netIncomeCents: number;
  accountingEquationSatisfied: boolean;
  accountsSummary: Array<{
    id: string;
    name: string;
    type: AccountType;
    balanceKes: number;
    debitKes: number;
    creditKes: number;
  }>;
} {
  let totalDebitsCents = 0;
  let totalCreditsCents = 0;
  let assetsTotalCents = 0;
  let liabilitiesTotalCents = 0;
  let equityTotalCents = 0;
  let revenueTotalCents = 0;
  let expensesTotalCents = 0;

  const accountsSummary = [];

  for (const acct of Object.values(ledger.accounts)) {
    const bal = acct.balanceCents;
    let debitCents = 0;
    let creditCents = 0;

    if (acct.normalBalance === "debit") {
      debitCents = bal;
      totalDebitsCents += bal;
    } else {
      creditCents = bal;
      totalCreditsCents += bal;
    }

    if (acct.type === "asset") assetsTotalCents += bal;
    else if (acct.type === "liability") liabilitiesTotalCents += bal;
    else if (acct.type === "equity") equityTotalCents += bal;
    else if (acct.type === "revenue") revenueTotalCents += bal;
    else if (acct.type === "expense") expensesTotalCents += bal;

    accountsSummary.push({
      id: acct.id,
      name: acct.name,
      type: acct.type,
      balanceKes: fromCents(bal),
      debitKes: fromCents(debitCents),
      creditKes: fromCents(creditCents),
    });
  }

  const netIncomeCents = revenueTotalCents - expensesTotalCents;
  // Assets = Liabilities + Equity + Net Income
  const rightHandSide = liabilitiesTotalCents + equityTotalCents + netIncomeCents;
  const accountingEquationSatisfied = assetsTotalCents === rightHandSide;

  return {
    isBalanced: totalDebitsCents === totalCreditsCents,
    totalDebitsCents,
    totalCreditsCents,
    assetsTotalCents,
    liabilitiesTotalCents,
    equityTotalCents,
    revenueTotalCents,
    expensesTotalCents,
    netIncomeCents,
    accountingEquationSatisfied,
    accountsSummary,
  };
}

/**
 * Audits ledger hash chain integrity to detect any tampering or deletion.
 */
export function verifyLedgerAuditChain(ledger: LedgerState): {
  isValid: boolean;
  entriesVerified: number;
  brokenAtEntryId?: string;
  error?: string;
} {
  let currentExpectedPrev = "GENESIS_HASH_00000000";

  for (let i = 0; i < ledger.journalEntries.length; i++) {
    const entry = ledger.journalEntries[i];
    if (entry.previousHash !== currentExpectedPrev) {
      return {
        isValid: false,
        entriesVerified: i,
        brokenAtEntryId: entry.id,
        error: `Hash chain broken at entry ${entry.id}: previousHash was '${entry.previousHash}', expected '${currentExpectedPrev}'`,
      };
    }

    const lineSummary = entry.lines
      .map((l) => `${l.accountId}:${l.debitCents}:${l.creditCents}`)
      .join(";");
    const payloadData = `${entry.id}:${entry.transactionRef}:${entry.totalAmountCents}:${lineSummary}`;
    const expectedHash = computeHash(entry.previousHash, payloadData);

    if (entry.hash !== expectedHash) {
      return {
        isValid: false,
        entriesVerified: i,
        brokenAtEntryId: entry.id,
        error: `Tampered hash at entry ${entry.id}: stored hash '${entry.hash}', recomputed '${expectedHash}'`,
      };
    }

    currentExpectedPrev = entry.hash;
  }

  return {
    isValid: true,
    entriesVerified: ledger.journalEntries.length,
  };
}
