# SPEC 001: Chama Microfinance & Rotation Ledger Engine

## Problem Statement
Informal African investment groups (Chamas) lose funds and experience social friction due to paper-based record keeping, delayed payments, and disputed payout orders.

## Solution
A digital ledger with M-Pesa integration, automated contribution reminders, immutable rotation schedules, and transparent penalty calculations.

## User Stories
1. As a chama member, I want to see my locked payout date, so that I can plan my financial investments with confidence.
2. As a treasurer, I want M-Pesa contributions automatically matched to members, so that I don't have to reconcile bank statements manually.
3. As a member, I want fair and predictable late fee calculations, so that penalties are transparent and non-predatory.

## Implementation Decisions
- Implement rotation logic in `src/lib/chama.ts`.
- Late fee compounding invariants in `src/lib/penalties.ts`.
- Daraja callback reconciliation in `src/lib/mpesa.ts`.

## Testing Decisions
- Seam: `src/lib/late-fee-compounding-invariants.test.ts`.
- Verify mathematical invariance of late penalties across multi-week delinquency.
