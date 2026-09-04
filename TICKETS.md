# TICKETS — ChamaVault Microfinance Ledger

## [TICKET-001] Linear Late Fee Compounding Engine
- **Blocked by**: None
- **Delivers**: Arithmetic calculator enforcing legal, non-predatory late fee structures.
- **Verification**: `src/lib/late-fee-compounding-invariants.test.ts`

## [TICKET-002] Immutable Round-Robin Rotation Sequencer
- **Blocked by**: TICKET-001
- **Delivers**: Hash-chained payout schedule generator preventing treasurer tampering.
- **Verification**: Sequence immutability tests asserting rejection on unauthorized reordering.

## [TICKET-003] Daraja Transaction Timeout Reconciler
- **Blocked by**: TICKET-002
- **Delivers**: Automated poller checking mobile money transaction status for unconfirmed callbacks.
- **Verification**: Mock Daraja query response reconciliation tests.
