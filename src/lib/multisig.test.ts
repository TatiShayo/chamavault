import { describe, it, expect } from "vitest";
import {
  createProposal,
  signProposal,
  revokeSignature,
  executeProposal,
} from "./multisig";
import { toCents } from "./money";

describe("Multi-Signature Approval Engine", () => {
  const signers = [
    { id: "u1", name: "Grace Kiputo", role: "chairperson" },
    { id: "u2", name: "David Ochieng", role: "treasurer" },
    { id: "u3", name: "Amina Yusuf", role: "secretary" },
  ];

  describe("Proposal Creation & Policy Validation", () => {
    it("creates a proposal in pending_approval status", () => {
      const proposal = createProposal({
        id: "p-1",
        chamaId: "chama-1",
        creatorId: "u1",
        title: "Disburse Emergency Relief Loan",
        type: "payout_disbursement",
        payload: { amountKes: 50000, recipientId: "m5", description: "Medical relief" },
        policy: { type: "m_of_n", requiredCount: 2 },
        authorizedSigners: signers,
      });

      expect(proposal.status).toBe("pending_approval");
      expect(proposal.signatures).toHaveLength(0);
      expect(proposal.authorizedSigners).toHaveLength(3);
    });

    it("rejects proposal creation with empty title or no signers", () => {
      expect(() =>
        createProposal({
          id: "p-2",
          chamaId: "chama-1",
          creatorId: "u1",
          title: "   ",
          type: "loan_approval",
          payload: { description: "test" },
          policy: { type: "m_of_n", requiredCount: 2 },
          authorizedSigners: signers,
        })
      ).toThrow("Proposal title cannot be empty");

      expect(() =>
        createProposal({
          id: "p-3",
          chamaId: "chama-1",
          creatorId: "u1",
          title: "Valid Title",
          type: "loan_approval",
          payload: { description: "test" },
          policy: { type: "m_of_n", requiredCount: 2 },
          authorizedSigners: [],
        })
      ).toThrow("at least one authorized signer");
    });

    it("rejects impossible M-of-N requirements", () => {
      expect(() =>
        createProposal({
          id: "p-4",
          chamaId: "chama-1",
          creatorId: "u1",
          title: "Valid Title",
          type: "loan_approval",
          payload: { description: "test" },
          policy: { type: "m_of_n", requiredCount: 5 }, // 5 required out of 3 signers
          authorizedSigners: signers,
        })
      ).toThrow("Invalid M-of-N requirement");
    });
  });

  describe("M-of-N (e.g. 2-of-3) Approval Thresholds", () => {
    it("approves when required threshold of 2 signatures is reached", () => {
      let proposal = createProposal({
        id: "p-1",
        chamaId: "chama-1",
        creatorId: "u1",
        title: "Disburse Loan",
        type: "loan_approval",
        payload: { amountKes: 10000, description: "Business Loan" },
        policy: { type: "m_of_n", requiredCount: 2 },
        authorizedSigners: signers,
      });

      // Signer 1 approves
      proposal = signProposal(proposal, signers[0], "approve", "Approved by Chair");
      expect(proposal.status).toBe("pending_approval");

      // Signer 2 approves -> threshold met!
      proposal = signProposal(proposal, signers[1], "approve", "Approved by Treasurer");
      expect(proposal.status).toBe("approved");
    });

    it("rejects proposal when impossible to reach threshold", () => {
      let proposal = createProposal({
        id: "p-1",
        chamaId: "chama-1",
        creatorId: "u1",
        title: "Disburse Loan",
        type: "loan_approval",
        payload: { amountKes: 10000, description: "Business Loan" },
        policy: { type: "m_of_n", requiredCount: 2 },
        authorizedSigners: signers,
      });

      // 2 signers reject out of 3 -> max approvals possible is 1 < 2 required
      proposal = signProposal(proposal, signers[0], "reject", "Denied");
      expect(proposal.status).toBe("pending_approval");

      proposal = signProposal(proposal, signers[1], "reject", "Denied");
      expect(proposal.status).toBe("rejected");
    });
  });

  describe("Majority Policy", () => {
    it("requires > 50% approval to pass", () => {
      let proposal = createProposal({
        id: "p-maj",
        chamaId: "chama-1",
        creatorId: "u1",
        title: "Change Meeting Schedule",
        type: "constitution_amendment",
        payload: { description: "Change to biweekly" },
        policy: { type: "majority" },
        authorizedSigners: signers, // 3 signers -> strict majority = 2
      });

      proposal = signProposal(proposal, signers[0], "approve");
      expect(proposal.status).toBe("pending_approval");

      proposal = signProposal(proposal, signers[1], "approve");
      expect(proposal.status).toBe("approved");
    });
  });

  describe("Unanimous Policy", () => {
    it("requires all signers to approve and fails on a single rejection", () => {
      let proposal = createProposal({
        id: "p-unan",
        chamaId: "chama-1",
        creatorId: "u1",
        title: "Dissolve Chama Reserve",
        type: "emergency_withdrawal",
        payload: { amountKes: 100000, description: "Emergency fund access" },
        policy: { type: "unanimous" },
        authorizedSigners: signers,
      });

      proposal = signProposal(proposal, signers[0], "approve");
      proposal = signProposal(proposal, signers[1], "reject", "I oppose");
      expect(proposal.status).toBe("rejected");
    });
  });

  describe("Role-Based Policy (Chairperson + Treasurer)", () => {
    it("approves only when both Chairperson and Treasurer approve", () => {
      let proposal = createProposal({
        id: "p-role",
        chamaId: "chama-1",
        creatorId: "u1",
        title: "Bank Wire",
        type: "payout_disbursement",
        payload: { amountKes: 30000, description: "Wire transfer" },
        policy: { type: "chair_and_treasurer" },
        authorizedSigners: signers,
      });

      // Chairperson + Secretary approve -> still pending (needs Treasurer!)
      proposal = signProposal(proposal, signers[0], "approve"); // Chair
      proposal = signProposal(proposal, signers[2], "approve"); // Sec
      expect(proposal.status).toBe("pending_approval");

      // Treasurer approves -> now approved!
      proposal = signProposal(proposal, signers[1], "approve"); // Treasurer
      expect(proposal.status).toBe("approved");
    });
  });

  describe("Replay Protection & Signer Authorization", () => {
    it("updates existing signature instead of duplicating if signer signs twice", () => {
      let proposal = createProposal({
        id: "p-1",
        chamaId: "chama-1",
        creatorId: "u1",
        title: "Loan",
        type: "loan_approval",
        payload: { description: "test" },
        policy: { type: "m_of_n", requiredCount: 2 },
        authorizedSigners: signers,
      });

      proposal = signProposal(proposal, signers[0], "reject", "Initial thought");
      expect(proposal.signatures).toHaveLength(1);

      // Signer changes mind to approve
      proposal = signProposal(proposal, signers[0], "approve", "Changed mind");
      expect(proposal.signatures).toHaveLength(1);
      expect(proposal.signatures[0].decision).toBe("approve");
    });

    it("rejects signature from unauthorized member", () => {
      const proposal = createProposal({
        id: "p-1",
        chamaId: "chama-1",
        creatorId: "u1",
        title: "Loan",
        type: "loan_approval",
        payload: { description: "test" },
        policy: { type: "m_of_n", requiredCount: 2 },
        authorizedSigners: signers,
      });

      const rogueMember = { id: "u99", name: "Intruder", role: "member" };
      expect(() => signProposal(proposal, rogueMember, "approve")).toThrow(
        "is not authorized to sign this proposal"
      );
    });
  });

  describe("Signature Revocation", () => {
    it("allows a signer to revoke signature before execution", () => {
      let proposal = createProposal({
        id: "p-1",
        chamaId: "chama-1",
        creatorId: "u1",
        title: "Loan",
        type: "loan_approval",
        payload: { description: "test" },
        policy: { type: "m_of_n", requiredCount: 2 },
        authorizedSigners: signers,
      });

      proposal = signProposal(proposal, signers[0], "approve");
      proposal = signProposal(proposal, signers[1], "approve");
      expect(proposal.status).toBe("approved");

      // Signer 1 revokes signature -> goes back to pending_approval
      proposal = revokeSignature(proposal, signers[0].id);
      expect(proposal.signatures).toHaveLength(1);
      expect(proposal.status).toBe("pending_approval");
    });

    it("rejects revocation if member never signed", () => {
      const proposal = createProposal({
        id: "p-1",
        chamaId: "chama-1",
        creatorId: "u1",
        title: "Loan",
        type: "loan_approval",
        payload: { description: "test" },
        policy: { type: "m_of_n", requiredCount: 2 },
        authorizedSigners: signers,
      });

      expect(() => revokeSignature(proposal, signers[0].id)).toThrow("has not signed this proposal");
    });
  });

  describe("Execution & Solvency Checks", () => {
    it("executes an approved proposal successfully", () => {
      let proposal = createProposal({
        id: "p-exec",
        chamaId: "chama-1",
        creatorId: "u1",
        title: "Payout",
        type: "payout_disbursement",
        payload: { amountKes: 15000, description: "Dividend" },
        policy: { type: "m_of_n", requiredCount: 2 },
        authorizedSigners: signers,
      });

      proposal = signProposal(proposal, signers[0], "approve");
      proposal = signProposal(proposal, signers[1], "approve");

      const result = executeProposal(proposal, "u1", 50000); // 50,000 available
      expect(result.success).toBe(true);
      expect(result.proposal.status).toBe("executed");
      expect(result.disbursedAmountCents).toBe(toCents(15000));
    });

    it("rejects execution if proposal is not approved", () => {
      const proposal = createProposal({
        id: "p-exec",
        chamaId: "chama-1",
        creatorId: "u1",
        title: "Payout",
        type: "payout_disbursement",
        payload: { amountKes: 15000, description: "Dividend" },
        policy: { type: "m_of_n", requiredCount: 2 },
        authorizedSigners: signers,
      });

      expect(() => executeProposal(proposal, "u1", 50000)).toThrow(
        "Cannot execute proposal in status 'pending_approval'"
      );
    });

    it("rejects execution if available treasury funds are insufficient", () => {
      let proposal = createProposal({
        id: "p-exec",
        chamaId: "chama-1",
        creatorId: "u1",
        title: "Payout",
        type: "payout_disbursement",
        payload: { amountKes: 100000, description: "Dividend" },
        policy: { type: "m_of_n", requiredCount: 2 },
        authorizedSigners: signers,
      });

      proposal = signProposal(proposal, signers[0], "approve");
      proposal = signProposal(proposal, signers[1], "approve");

      expect(() => executeProposal(proposal, "u1", 20000)).toThrow(
        "Insufficient treasury funds"
      );
    });
  });
});
