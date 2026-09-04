# CONTEXT.md — Ubiquitous Domain Language (ChamaVault)

## Core Entities
- **ChamaGroup**: An informal cooperative savings association with defined bylaws, contribution cycles, and members.
- **RotationCycle**: A complete round where every member contributes equally each period and one member receives the pool.
- **PayoutSlot**: An immutable sequenced position assigned to a member for collecting the group pot.
- **LateFeeAssessment**: Deterministic penalty levied on overdue member contributions.

## Domain Invariants
- Sum of member contributions in a cycle period must equal the gross payout pot minus pre-agreed reserve fees.
- Payout slot orders cannot be altered once the cycle's first deposit is recorded.
- Penalties do not compound exponentially; calculations use fixed linear basis points.

## Forbidden Terminology
- Do not call groups "clubs"; use "Chama" or "SACCO".
- Do not call payouts "dividends"; use "PayoutPot".
