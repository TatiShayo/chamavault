# ADR 0001: Immutable Payout Rotations and Linear Penalty Invariants

## Context
Chama groups pool significant community capital. Corruption or favoritism by treasurers destroys group trust and fractures financial security.

## Decision
1. **Hashed Rotation Sequences**: Member payout order is locked via SHA-256 hash chains upon cycle launch.
2. **Linear Late Fee Rules**: Late fees compute strictly as linear integer penalties.
3. **M-Pesa Daraja Reconciliation**: Automated reconciliation polling handles mobile money carrier delays.

## Consequences
- **Positive**: Total transparency, zero embezzlement opportunity, and fair community accounting.
- **Negative**: Changing a payout slot due to emergency requires formal multi-member ratification.
