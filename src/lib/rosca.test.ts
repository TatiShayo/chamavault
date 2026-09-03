import { describe, it, expect } from "vitest";
import {
  createRoscaCycle,
  activateRoscaCycle,
  transitionRoscaStatus,
  startRound,
  recordRoscaContribution,
  disburseRoscaPot,
  handleRoscaDefault,
  calculateEarlyExitSettlement,
  auditRoscaInvariants,
  type RoscaCycleConfig,
} from "./rosca";
import { toCents } from "./money";

describe("ROSCA (Merry-Go-Round) Lifecycle & Invariants", () => {
  const baseConfig: RoscaCycleConfig = {
    id: "rosca-1",
    chamaId: "chama-wema",
    name: "Wema 2026 Rotation",
    contributionPerShareKes: 5000,
    frequency: "monthly",
    payoutMode: "fixed_order",
    earlyExitPenaltyPct: 10,
    defaultPenaltyFeeKes: 1000,
  };

  const initialMembers = [
    { id: "m1", name: "Grace Kiputo", shareMultiplier: 1 },
    { id: "m2", name: "David Ochieng", shareMultiplier: 1 },
    { id: "m3", name: "Amina Yusuf", shareMultiplier: 1 },
    { id: "m4", name: "John Mwangi", shareMultiplier: 1 },
  ];

  describe("Cycle Creation & Validation", () => {
    it("creates a valid cycle in registration status", () => {
      const cycle = createRoscaCycle(baseConfig, initialMembers);
      expect(cycle.status).toBe("registration");
      expect(cycle.members).toHaveLength(4);
      expect(cycle.rounds).toHaveLength(0);
      expect(cycle.currentRoundNumber).toBe(0);
    });

    it("rejects cycle creation with fewer than 2 members", () => {
      expect(() =>
        createRoscaCycle(baseConfig, [{ id: "m1", name: "Grace" }])
      ).toThrow("requires at least 2 members");
    });

    it("rejects non-positive contribution per share", () => {
      expect(() =>
        createRoscaCycle(
          { ...baseConfig, contributionPerShareKes: 0 },
          initialMembers
        )
      ).toThrow("Contribution per share must be positive");
    });
  });

  describe("Cycle Activation & Round Scheduling", () => {
    it("activates the cycle and generates equal rounds for single-share members", () => {
      const cycle = createRoscaCycle(baseConfig, initialMembers);
      const active = activateRoscaCycle(cycle, ["m1", "m2", "m3", "m4"], "2026-01-01");

      expect(active.status).toBe("active");
      expect(active.rounds).toHaveLength(4);
      expect(active.rounds[0].recipientMemberId).toBe("m1");
      expect(active.rounds[1].recipientMemberId).toBe("m2");
      expect(active.rounds[2].recipientMemberId).toBe("m3");
      expect(active.rounds[3].recipientMemberId).toBe("m4");

      // 4 members x 5000 KES = 20,000 KES pot (2,000,000 cents)
      expect(active.rounds[0].targetPotCents).toBe(toCents(20000));
    });

    it("handles multi-share members by creating multiple rounds", () => {
      const multiShareMembers = [
        { id: "m1", name: "Grace", shareMultiplier: 2 }, // 2 shares
        { id: "m2", name: "David", shareMultiplier: 1 }, // 1 share
      ];
      const cycle = createRoscaCycle(baseConfig, multiShareMembers);
      const active = activateRoscaCycle(cycle, ["m1", "m2"], "2026-01-01");

      // 3 total rounds: m1 (round 1), m1 (round 2), m2 (round 3)
      expect(active.rounds).toHaveLength(3);
      expect(active.rounds[0].targetPotCents).toBe(toCents(15000)); // 3 shares x 5000
    });

    it("cannot activate an already active cycle", () => {
      const cycle = createRoscaCycle(baseConfig, initialMembers);
      const active = activateRoscaCycle(cycle);
      expect(() => activateRoscaCycle(active)).toThrow("Cannot activate ROSCA cycle in 'active' status");
    });
  });

  describe("State Transitions & Guard Invariants", () => {
    it("allows valid transitions through the complete lifecycle", () => {
      let cycle = createRoscaCycle(baseConfig, initialMembers);
      cycle = activateRoscaCycle(cycle, ["m1", "m2", "m3", "m4"]);
      expect(cycle.status).toBe("active");

      cycle = startRound(cycle, 1);
      expect(cycle.status).toBe("round_in_progress");

      // All members contribute
      cycle = recordRoscaContribution(cycle, 1, "m1", 5000);
      cycle = recordRoscaContribution(cycle, 1, "m2", 5000);
      cycle = recordRoscaContribution(cycle, 1, "m3", 5000);
      cycle = recordRoscaContribution(cycle, 1, "m4", 5000);

      // Disburse round 1
      cycle = disburseRoscaPot(cycle, 1);
      expect(cycle.status).toBe("payout_disbursed");

      // Progress through remaining rounds to completion
      for (let r = 2; r <= 4; r++) {
        cycle = startRound(cycle, r);
        cycle = recordRoscaContribution(cycle, r, "m1", 5000);
        cycle = recordRoscaContribution(cycle, r, "m2", 5000);
        cycle = recordRoscaContribution(cycle, r, "m3", 5000);
        cycle = recordRoscaContribution(cycle, r, "m4", 5000);
        cycle = disburseRoscaPot(cycle, r);
      }

      expect(cycle.status).toBe("completed");
    });

    it("rejects illegal transitions", () => {
      const cycle = createRoscaCycle(baseConfig, initialMembers);
      expect(() => transitionRoscaStatus(cycle, "completed")).toThrow(
        "Invalid ROSCA transition from 'registration' to 'completed'"
      );
      expect(() => transitionRoscaStatus(cycle, "payout_disbursed")).toThrow(
        "Invalid ROSCA transition from 'registration' to 'payout_disbursed'"
      );
    });
  });

  describe("Pot Collection & Balance Invariants", () => {
    it("maintains strict pot invariant: collectedPotCents === sum of member contributions", () => {
      let cycle = createRoscaCycle(baseConfig, initialMembers);
      cycle = activateRoscaCycle(cycle, ["m1", "m2", "m3", "m4"]);
      cycle = startRound(cycle, 1);

      cycle = recordRoscaContribution(cycle, 1, "m1", 2500);
      cycle = recordRoscaContribution(cycle, 1, "m1", 2500); // partial in two steps
      cycle = recordRoscaContribution(cycle, 1, "m2", 5000);

      const round1 = cycle.rounds[0];
      expect(round1.collectedPotCents).toBe(toCents(10000));
      expect(round1.contributions["m1"]).toBe(toCents(5000));
      expect(round1.contributions["m2"]).toBe(toCents(5000));
    });

    it("rejects non-positive contributions", () => {
      let cycle = createRoscaCycle(baseConfig, initialMembers);
      cycle = activateRoscaCycle(cycle);
      cycle = startRound(cycle, 1);

      expect(() => recordRoscaContribution(cycle, 1, "m1", 0)).toThrow("greater than 0");
      expect(() => recordRoscaContribution(cycle, 1, "m1", -100)).toThrow("greater than 0");
    });

    it("rejects contributions to a non-existent round or non-existent member", () => {
      let cycle = createRoscaCycle(baseConfig, initialMembers);
      cycle = activateRoscaCycle(cycle);
      cycle = startRound(cycle, 1);

      expect(() => recordRoscaContribution(cycle, 1, "m999", 5000)).toThrow("not part of this ROSCA");
      expect(() => recordRoscaContribution(cycle, 99, "m1", 5000)).toThrow("Round 99 not found");
    });
  });

  describe("Auction / Bidding ROSCA Mechanism", () => {
    it("distributes auction discount dividend among other contributing members", () => {
      let cycle = createRoscaCycle(baseConfig, initialMembers);
      cycle = activateRoscaCycle(cycle, ["m1", "m2", "m3", "m4"]);
      cycle = startRound(cycle, 1);

      cycle = recordRoscaContribution(cycle, 1, "m1", 5000);
      cycle = recordRoscaContribution(cycle, 1, "m2", 5000);
      cycle = recordRoscaContribution(cycle, 1, "m3", 5000);
      cycle = recordRoscaContribution(cycle, 1, "m4", 5000);

      // m1 bids a discount of KES 600 to get pot early.
      // Net payout to m1 = 20,000 - 600 = 19,400 KES.
      // 600 KES dividend split among m2, m3, m4 = 200 KES each.
      cycle = disburseRoscaPot(cycle, 1, 600);

      const m1 = cycle.members.find((m) => m.id === "m1")!;
      const m2 = cycle.members.find((m) => m.id === "m2")!;
      const m3 = cycle.members.find((m) => m.id === "m3")!;
      const m4 = cycle.members.find((m) => m.id === "m4")!;

      expect(m1.totalReceivedCents).toBe(toCents(19400));
      expect(m2.totalReceivedCents).toBe(toCents(200));
      expect(m3.totalReceivedCents).toBe(toCents(200));
      expect(m4.totalReceivedCents).toBe(toCents(200));

      // Sum of all disbursements == total pot collected
      const totalDisbursed =
        m1.totalReceivedCents +
        m2.totalReceivedCents +
        m3.totalReceivedCents +
        m4.totalReceivedCents;
      expect(totalDisbursed).toBe(toCents(20000));
    });
  });

  describe("Default Handling & Guarantor Allocation", () => {
    it("flags defaulting member and calculates guarantor liability", () => {
      let cycle = createRoscaCycle(baseConfig, initialMembers);
      cycle = activateRoscaCycle(cycle, ["m1", "m2", "m3", "m4"]);
      cycle = startRound(cycle, 1);

      cycle = recordRoscaContribution(cycle, 1, "m1", 5000);
      cycle = recordRoscaContribution(cycle, 1, "m2", 2000); // partial (shortfall 3000)

      const result = handleRoscaDefault(cycle, "m2", 1);
      expect(result.state.status).toBe("defaulted");
      expect(result.shortfallCents).toBe(toCents(3000));
      expect(result.penaltyCents).toBe(toCents(1000)); // fixed fine from config

      // 3 remaining guarantors share 3000 KES shortfall -> 1000 KES each
      expect(result.liabilityPerGuarantorCents).toBe(toCents(1000));
    });

    it("rejects further contributions from defaulted member", () => {
      let cycle = createRoscaCycle(baseConfig, initialMembers);
      cycle = activateRoscaCycle(cycle);
      cycle = startRound(cycle, 1);
      const { state: defaultedState } = handleRoscaDefault(cycle, "m1", 1);

      expect(() => recordRoscaContribution(defaultedState, 1, "m1", 5000)).toThrow(
        "Cannot accept contribution from defaulted member"
      );
    });
  });

  describe("Early Exit Settlement", () => {
    it("calculates refund for member exiting before receiving payout", () => {
      let cycle = createRoscaCycle(baseConfig, initialMembers);
      cycle = activateRoscaCycle(cycle, ["m1", "m2", "m3", "m4"]);
      cycle = startRound(cycle, 1);
      cycle = recordRoscaContribution(cycle, 1, "m2", 5000);

      // m2 contributed 5000 KES, has received 0 payout.
      // 10% early exit penalty = 500 KES.
      // Net refund = 4500 KES.
      const settlement = calculateEarlyExitSettlement(cycle, "m2");
      expect(settlement.status).toBe("refund_owed");
      expect(settlement.penaltyAppliedCents).toBe(toCents(500));
      expect(settlement.netRefundCents).toBe(toCents(4500));
      expect(settlement.netDebtCents).toBe(0);
    });

    it("calculates debt for member exiting after receiving pot early", () => {
      let cycle = createRoscaCycle(baseConfig, initialMembers);
      cycle = activateRoscaCycle(cycle, ["m1", "m2", "m3", "m4"]);
      cycle = startRound(cycle, 1);

      cycle = recordRoscaContribution(cycle, 1, "m1", 5000);
      cycle = recordRoscaContribution(cycle, 1, "m2", 5000);
      cycle = recordRoscaContribution(cycle, 1, "m3", 5000);
      cycle = recordRoscaContribution(cycle, 1, "m4", 5000);
      cycle = disburseRoscaPot(cycle, 1);

      // m1 received 20,000 KES pot in round 1, having contributed only 5,000 KES.
      // Full cycle obligation = 4 rounds x 5,000 = 20,000 KES.
      // Unearned pot = 20,000 - 5,000 = 15,000 KES.
      // 10% exit penalty = 1,500 KES.
      // Total debt owed = 15,000 + 1,500 = 16,500 KES.
      const settlement = calculateEarlyExitSettlement(cycle, "m1");
      expect(settlement.status).toBe("debt_owed");
      expect(settlement.penaltyAppliedCents).toBe(toCents(1500));
      expect(settlement.netDebtCents).toBe(toCents(16500));
      expect(settlement.netRefundCents).toBe(0);
    });
  });

  describe("Comprehensive Invariant Audit", () => {
    it("passes mathematical audit for an honest completed cycle", () => {
      let cycle = createRoscaCycle(baseConfig, initialMembers);
      cycle = activateRoscaCycle(cycle, ["m1", "m2", "m3", "m4"]);

      for (let r = 1; r <= 4; r++) {
        cycle = startRound(cycle, r);
        cycle = recordRoscaContribution(cycle, r, "m1", 5000);
        cycle = recordRoscaContribution(cycle, r, "m2", 5000);
        cycle = recordRoscaContribution(cycle, r, "m3", 5000);
        cycle = recordRoscaContribution(cycle, r, "m4", 5000);
        cycle = disburseRoscaPot(cycle, r);
      }

      const audit = auditRoscaInvariants(cycle);
      expect(audit.isValid).toBe(true);
      expect(audit.errors).toHaveLength(0);
      expect(audit.potConservationSatisfied).toBe(true);
      expect(audit.totalContributedAllMembersCents).toBe(toCents(80000));
      expect(audit.totalDisbursedAllRoundsCents).toBe(toCents(80000));
    });
  });
});
