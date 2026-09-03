import { describe, it, expect } from "vitest";
import {
  hasPermission,
  assertPermission,
  isOfficer,
  canChangeMemberRole,
  verifyResourceAccess,
} from "./permissions";

describe("Role-Based Access Control & Permission Matrix", () => {
  describe("Role Capability Matrix", () => {
    it("grants full administrative & financial actions to Chairperson", () => {
      expect(hasPermission("chairperson", "chama:manage_settings")).toBe(true);
      expect(hasPermission("chairperson", "contributions:record")).toBe(true);
      expect(hasPermission("chairperson", "loans:approve")).toBe(true);
      expect(hasPermission("chairperson", "dividends:distribute")).toBe(true);
      expect(hasPermission("chairperson", "members:change_role")).toBe(true);
      expect(hasPermission("chairperson", "multisig:execute")).toBe(true);
      expect(hasPermission("chairperson", "rosca:create_cycle")).toBe(true);
    });

    it("grants financial management but restricts role changes and delete to Treasurer", () => {
      expect(hasPermission("treasurer", "contributions:record")).toBe(true);
      expect(hasPermission("treasurer", "loans:approve")).toBe(true);
      expect(hasPermission("treasurer", "dividends:distribute")).toBe(true);
      expect(hasPermission("treasurer", "expenses:create")).toBe(true);
      // Restrictions
      expect(hasPermission("treasurer", "members:change_role")).toBe(false);
      expect(hasPermission("treasurer", "chama:delete")).toBe(false);
    });

    it("grants meeting, minutes, and attendance management to Secretary", () => {
      expect(hasPermission("secretary", "meetings:create")).toBe(true);
      expect(hasPermission("secretary", "meetings:edit_minutes")).toBe(true);
      expect(hasPermission("secretary", "meetings:mark_attendance")).toBe(true);
      expect(hasPermission("secretary", "ai:generate_minutes")).toBe(true);
      // Financial restrictions
      expect(hasPermission("secretary", "loans:approve")).toBe(false);
      expect(hasPermission("secretary", "dividends:distribute")).toBe(false);
    });

    it("restricts standard Member to self-service and participation", () => {
      expect(hasPermission("member", "contributions:view_own")).toBe(true);
      expect(hasPermission("member", "loans:apply")).toBe(true);
      expect(hasPermission("member", "votes:cast_vote")).toBe(true);
      expect(hasPermission("member", "meetings:view")).toBe(true);
      // Restricted
      expect(hasPermission("member", "contributions:record")).toBe(false);
      expect(hasPermission("member", "loans:approve")).toBe(false);
      expect(hasPermission("member", "dividends:distribute")).toBe(false);
      expect(hasPermission("member", "expenses:create")).toBe(false);
    });

    it("gives Auditor read-only access across financial records", () => {
      expect(hasPermission("auditor", "contributions:view_all")).toBe(true);
      expect(hasPermission("auditor", "loans:view_all")).toBe(true);
      expect(hasPermission("auditor", "dividends:view_all")).toBe(true);
      expect(hasPermission("auditor", "chama:export_data")).toBe(true);
      // Write restrictions
      expect(hasPermission("auditor", "contributions:record")).toBe(false);
      expect(hasPermission("auditor", "loans:approve")).toBe(false);
    });

    it("handles undefined or invalid role gracefully", () => {
      expect(hasPermission(undefined, "chama:view")).toBe(false);
      expect(hasPermission(null, "chama:view")).toBe(false);
      expect(hasPermission("unknown_role", "chama:view")).toBe(false);
    });
  });

  describe("assertPermission Helper", () => {
    it("does not throw when role has permission", () => {
      expect(() => assertPermission("chairperson", "chama:view")).not.toThrow();
    });

    it("throws Forbidden error when role lacks permission", () => {
      expect(() => assertPermission("member", "loans:approve")).toThrow("Forbidden: Role 'member' lacks permission for 'loans:approve'");
    });
  });

  describe("Officer Verification", () => {
    it("correctly identifies officer roles", () => {
      expect(isOfficer("chairperson")).toBe(true);
      expect(isOfficer("treasurer")).toBe(true);
      expect(isOfficer("secretary")).toBe(true);
      expect(isOfficer("member")).toBe(false);
      expect(isOfficer("auditor")).toBe(false);
      expect(isOfficer(undefined)).toBe(false);
    });
  });

  describe("Member Role Change Governance Rules", () => {
    it("allows Chairperson to promote a member to Treasurer", () => {
      const res = canChangeMemberRole({
        actorId: "u1",
        actorRole: "chairperson",
        targetId: "u2",
        targetCurrentRole: "member",
        targetNewRole: "treasurer",
        totalChairpersonsInChama: 1,
      });
      expect(res.allowed).toBe(true);
    });

    it("blocks Secretary from promoting a member to Chairperson", () => {
      const res = canChangeMemberRole({
        actorId: "u3",
        actorRole: "secretary",
        targetId: "u4",
        targetCurrentRole: "member",
        targetNewRole: "chairperson",
        totalChairpersonsInChama: 1,
      });
      expect(res.allowed).toBe(false);
      expect(res.error).toContain("Only the Chairperson can assign Chairperson or Treasurer roles");
    });

    it("blocks an officer from changing their own role", () => {
      const res = canChangeMemberRole({
        actorId: "u1",
        actorRole: "chairperson",
        targetId: "u1", // self
        targetCurrentRole: "chairperson",
        targetNewRole: "member",
        totalChairpersonsInChama: 1,
      });
      expect(res.allowed).toBe(false);
      expect(res.error).toContain("Officers cannot change their own role");
    });

    it("blocks demoting the last remaining Chairperson", () => {
      const res = canChangeMemberRole({
        actorId: "u2",
        actorRole: "chairperson", // co-chair or acting
        targetId: "u1",
        targetCurrentRole: "chairperson",
        targetNewRole: "member",
        totalChairpersonsInChama: 1,
      });
      expect(res.allowed).toBe(false);
      expect(res.error).toContain("Cannot demote the only Chairperson");
    });
  });

  describe("IDOR / BOLA Resource Access Verification", () => {
    it("allows member to view their own contribution record", () => {
      const res = verifyResourceAccess({
        actorMembershipId: "m1",
        actorRole: "member",
        resourceOwnerMemberId: "m1",
        officerAction: "contributions:view_all",
        ownAction: "contributions:view_own",
      });
      expect(res.allowed).toBe(true);
    });

    it("blocks member from accessing another member's contribution record (IDOR prevention)", () => {
      const res = verifyResourceAccess({
        actorMembershipId: "m1",
        actorRole: "member",
        resourceOwnerMemberId: "m2", // different member!
        officerAction: "contributions:view_all",
        ownAction: "contributions:view_own",
      });
      expect(res.allowed).toBe(false);
      expect(res.reason).toContain("Cannot access resources of another member");
    });

    it("allows officer (Treasurer) to view another member's contribution record", () => {
      const res = verifyResourceAccess({
        actorMembershipId: "m_treasurer",
        actorRole: "treasurer",
        resourceOwnerMemberId: "m2",
        officerAction: "contributions:view_all",
        ownAction: "contributions:view_own",
      });
      expect(res.allowed).toBe(true);
    });
  });
});
