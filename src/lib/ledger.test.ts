import { describe, it, expect } from "vitest";
import {
  createChamaLedger,
  postJournalEntry,
  recordContributionTransaction,
  recordLoanDisbursementTransaction,
  recordLoanRepaymentTransaction,
  recordExpenseTransaction,
  generateTrialBalance,
  verifyLedgerAuditChain,
} from "./ledger";
import { toCents } from "./money";

describe("Double-Entry & Auditable Contribution Ledger", () => {
  describe("Ledger Initialization", () => {
    it("creates a standard chart of accounts with zero balances", () => {
      const ledger = createChamaLedger("chama-1");
      expect(ledger.chamaId).toBe("chama-1");
      expect(ledger.journalEntries).toHaveLength(0);
      expect(ledger.accounts["101"].balanceCents).toBe(0); // Bank
      expect(ledger.accounts["201"].balanceCents).toBe(0); // Member Savings
      expect(ledger.lastHash).toBe("GENESIS_HASH_00000000");
    });
  });

  describe("Double-Entry Balance Invariants", () => {
    it("enforces Debits === Credits on every journal entry", () => {
      const ledger = createChamaLedger("chama-1");

      const updated = postJournalEntry(ledger, {
        id: "tx-1",
        transactionRef: "DEP-001",
        description: "Initial member deposits",
        lines: [
          { accountId: "102", debitKes: 10000 }, // M-Pesa (Asset) +10,000
          { accountId: "201", creditKes: 10000 }, // Member Savings (Liability) +10,000
        ],
      });

      expect(updated.journalEntries).toHaveLength(1);
      expect(updated.accounts["102"].balanceCents).toBe(toCents(10000));
      expect(updated.accounts["201"].balanceCents).toBe(toCents(10000));
    });

    it("rejects unbalanced journal entries (Debits != Credits)", () => {
      const ledger = createChamaLedger("chama-1");

      expect(() =>
        postJournalEntry(ledger, {
          id: "tx-err",
          transactionRef: "DEP-ERR",
          description: "Unbalanced entry",
          lines: [
            { accountId: "102", debitKes: 10000 },
            { accountId: "201", creditKes: 9500 }, // missing 500!
          ],
        })
      ).toThrow("Double-entry imbalance");
    });

    it("rejects entries with fewer than 2 lines or negative amounts", () => {
      const ledger = createChamaLedger("chama-1");

      expect(() =>
        postJournalEntry(ledger, {
          id: "tx-err",
          transactionRef: "ERR",
          description: "One line",
          lines: [{ accountId: "102", debitKes: 1000 }],
        })
      ).toThrow("must have at least 2 lines");

      expect(() =>
        postJournalEntry(ledger, {
          id: "tx-err2",
          transactionRef: "ERR2",
          description: "Negative amount",
          lines: [
            { accountId: "102", debitKes: -1000 },
            { accountId: "201", creditKes: -1000 },
          ],
        })
      ).toThrow("must be non-negative");
    });
  });

  describe("Chama Transaction Workflows", () => {
    it("processes complete Chama lifecycle: contribution -> loan -> repayment -> expense", () => {
      let ledger = createChamaLedger("chama-1");

      // 1. Member contributes KES 20,000
      ledger = recordContributionTransaction(ledger, "tx-1", "MPESA-C-01", "m1", 20000);

      // 2. Chama disburses KES 10,000 loan to member
      ledger = recordLoanDisbursementTransaction(ledger, "tx-2", "LOAN-D-01", "l-1", 10000);

      // 3. Member repays KES 11,000 (10,000 principal + 1,000 interest)
      ledger = recordLoanRepaymentTransaction(ledger, "tx-3", "LOAN-R-01", "l-1", 10000, 1000);

      // 4. Chama pays KES 2,000 meeting refreshments expense
      ledger = recordExpenseTransaction(
        ledger,
        "tx-4",
        "EXP-01",
        "501",
        2000,
        "Meeting refreshments"
      );

      // Verify trial balance and accounting equations
      const tb = generateTrialBalance(ledger);
      expect(tb.isBalanced).toBe(true);
      expect(tb.accountingEquationSatisfied).toBe(true);

      // Cash in M-Pesa = 20,000 - 10,000 + 11,000 - 2,000 = 19,000 KES
      expect(ledger.accounts["102"].balanceCents).toBe(toCents(19000));
      // Loans receivable = 10,000 - 10,000 = 0
      expect(ledger.accounts["103"].balanceCents).toBe(0);
      // Member savings liability = 20,000 KES
      expect(ledger.accounts["201"].balanceCents).toBe(toCents(20000));
      // Net income = 1,000 interest - 2,000 expense = -1,000 KES
      expect(tb.netIncomeCents).toBe(toCents(-1000));
      // Total Assets (19,000) === Liabilities (20,000) + Net Income (-1,000) = 19,000
      expect(tb.assetsTotalCents).toBe(toCents(19000));
    });
  });

  describe("Audit Trail & Hash Chaining Integrity", () => {
    it("verifies clean sequential hash chain for untouched ledger", () => {
      let ledger = createChamaLedger("chama-1");
      ledger = recordContributionTransaction(ledger, "tx-1", "C-01", "m1", 5000);
      ledger = recordContributionTransaction(ledger, "tx-2", "C-02", "m2", 5000);
      ledger = recordExpenseTransaction(ledger, "tx-3", "E-01", "501", 1000, "Snacks");

      const audit = verifyLedgerAuditChain(ledger);
      expect(audit.isValid).toBe(true);
      expect(audit.entriesVerified).toBe(3);
    });

    it("detects tampering when a transaction amount or line is altered", () => {
      let ledger = createChamaLedger("chama-1");
      ledger = recordContributionTransaction(ledger, "tx-1", "C-01", "m1", 5000);
      ledger = recordContributionTransaction(ledger, "tx-2", "C-02", "m2", 5000);

      // Maliciously tamper with entry 1
      ledger.journalEntries[0].totalAmountCents = toCents(999999);

      const audit = verifyLedgerAuditChain(ledger);
      expect(audit.isValid).toBe(false);
      expect(audit.brokenAtEntryId).toBe("tx-1");
      expect(audit.error).toContain("Tampered hash");
    });

    it("detects when a transaction is deleted from the middle of the chain", () => {
      let ledger = createChamaLedger("chama-1");
      ledger = recordContributionTransaction(ledger, "tx-1", "C-01", "m1", 5000);
      ledger = recordContributionTransaction(ledger, "tx-2", "C-02", "m2", 5000);
      ledger = recordContributionTransaction(ledger, "tx-3", "C-03", "m3", 5000);

      // Remove tx-2 from middle
      ledger.journalEntries.splice(1, 1);

      const audit = verifyLedgerAuditChain(ledger);
      expect(audit.isValid).toBe(false);
      expect(audit.brokenAtEntryId).toBe("tx-3");
      expect(audit.error).toContain("Hash chain broken");
    });
  });
});
