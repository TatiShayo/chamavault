
//! chamavault_ledger — ACID double-entry financial ledger engine
//! All monetary values are integer cents to eliminate floating-point rounding.

use std::collections::HashMap;

/// Monetary unit: integer cents (1_00 = $1.00 / KES 1.00)
pub type Cents = i64;

/// System account ID reserved for fees, penalties, and treasury
pub const SYSTEM_ACCOUNT_ID: u64 = 0;

// ─── Errors ──────────────────────────────────────────────────────────────────

#[derive(Debug, PartialEq)]
pub enum LedgerError {
    InsufficientFunds { available: Cents, requested: Cents },
    AccountNotFound(u64),
    InvalidAmount,
    SelfTransfer,
    AccountAlreadyExists(u64),
}

impl std::fmt::Display for LedgerError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            LedgerError::InsufficientFunds { available, requested } =>
                write!(f, "Insufficient funds: available={}, requested={}", available, requested),
            LedgerError::AccountNotFound(id) => write!(f, "Account {} not found", id),
            LedgerError::InvalidAmount       => write!(f, "Amount must be positive"),
            LedgerError::SelfTransfer        => write!(f, "Cannot transfer to same account"),
            LedgerError::AccountAlreadyExists(id) => write!(f, "Account {} already exists", id),
        }
    }
}

// ─── Domain types ─────────────────────────────────────────────────────────────

#[derive(Debug, Clone)]
pub struct Account {
    pub id:      u64,
    pub name:    String,
    pub balance: Cents,
}

#[derive(Debug, Clone)]
pub struct JournalEntry {
    pub id:           u64,
    pub from_id:      u64,
    pub to_id:        u64,
    pub amount:       Cents,
    pub memo:         String,
    pub timestamp_ms: u64,
}

// ─── Ledger ───────────────────────────────────────────────────────────────────

pub struct Ledger {
    accounts:      HashMap<u64, Account>,
    journal:       Vec<JournalEntry>,
    next_entry_id: u64,
}

impl Ledger {
    pub fn new() -> Self {
        let mut ledger = Ledger {
            accounts:      HashMap::new(),
            journal:       Vec::new(),
            next_entry_id: 1,
        };
        // Bootstrap system account
        ledger.accounts.insert(SYSTEM_ACCOUNT_ID, Account {
            id:      SYSTEM_ACCOUNT_ID,
            name:    "SYSTEM".to_string(),
            balance: 0,
        });
        ledger
    }

    pub fn create_account(&mut self, id: u64, name: &str, initial_balance: Cents) -> Result<(), LedgerError> {
        if self.accounts.contains_key(&id) {
            return Err(LedgerError::AccountAlreadyExists(id));
        }
        self.accounts.insert(id, Account { id, name: name.to_string(), balance: initial_balance });
        Ok(())
    }

    pub fn post_transfer(&mut self, from_id: u64, to_id: u64, amount: Cents, memo: &str) -> Result<u64, LedgerError> {
        if amount <= 0 { return Err(LedgerError::InvalidAmount); }
        if from_id == to_id { return Err(LedgerError::SelfTransfer); }

        {
            let from = self.accounts.get(&from_id).ok_or(LedgerError::AccountNotFound(from_id))?;
            if from.balance < amount {
                return Err(LedgerError::InsufficientFunds {
                    available: from.balance,
                    requested: amount,
                });
            }
            if !self.accounts.contains_key(&to_id) {
                return Err(LedgerError::AccountNotFound(to_id));
            }
        }

        self.accounts.get_mut(&from_id).unwrap().balance -= amount;
        self.accounts.get_mut(&to_id).unwrap().balance   += amount;

        let entry_id = self.next_entry_id;
        self.next_entry_id += 1;
        self.journal.push(JournalEntry {
            id: entry_id, from_id, to_id, amount,
            memo: memo.to_string(),
            timestamp_ms: 0,
        });
        Ok(entry_id)
    }

    pub fn balance(&self, id: u64) -> Result<Cents, LedgerError> {
        self.accounts.get(&id).map(|a| a.balance).ok_or(LedgerError::AccountNotFound(id))
    }

    pub fn account_journal(&self, id: u64) -> Vec<&JournalEntry> {
        self.journal.iter().filter(|e| e.from_id == id || e.to_id == id).collect()
    }

    pub fn total_supply(&self) -> Cents {
        self.accounts.values().map(|a| a.balance).sum()
    }

    pub fn apply_late_fee(&mut self, account_id: u64, fee_cents: Cents, max_fee_cents: Cents) -> Result<(), LedgerError> {
        if fee_cents <= 0 { return Err(LedgerError::InvalidAmount); }
        let effective_fee = fee_cents.min(max_fee_cents);
        let available = self.balance(account_id)?;
        if available < effective_fee {
            return Err(LedgerError::InsufficientFunds {
                available,
                requested: effective_fee,
            });
        }
        self.post_transfer(account_id, SYSTEM_ACCOUNT_ID, effective_fee, "late-fee")?;
        Ok(())
    }
}

impl Default for Ledger {
    fn default() -> Self { Self::new() }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::{Arc, Mutex};

    fn ledger_with_accounts() -> Ledger {
        let mut l = Ledger::new();
        l.create_account(1, "Alice", 10_000).unwrap();
        l.create_account(2, "Bob",   5_000).unwrap();
        l
    }

    #[test]
    fn test_create_account_success() {
        let mut l = Ledger::new();
        assert!(l.create_account(1, "Alice", 1_000).is_ok());
        assert_eq!(l.balance(1).unwrap(), 1_000);
    }

    #[test]
    fn test_transfer_happy_path() {
        let mut l = ledger_with_accounts();
        let initial_supply = l.total_supply();
        l.post_transfer(1, 2, 500, "payment").unwrap();
        assert_eq!(l.balance(1).unwrap(), 9_500);
        assert_eq!(l.balance(2).unwrap(), 5_500);
        assert_eq!(l.total_supply(), initial_supply);
    }

    #[test]
    fn test_insufficient_funds_error() {
        let mut l = ledger_with_accounts();
        let result = l.post_transfer(2, 1, 99_999, "too much");
        assert!(matches!(result, Err(LedgerError::InsufficientFunds { available: 5_000, requested: 99_999 })));
    }

    #[test]
    fn test_self_transfer_rejected() {
        let mut l = ledger_with_accounts();
        assert!(matches!(l.post_transfer(1, 1, 100, "self"), Err(LedgerError::SelfTransfer)));
    }

    #[test]
    fn test_account_not_found() {
        let mut l = Ledger::new();
        l.create_account(1, "Alice", 1_000).unwrap();
        assert!(matches!(l.post_transfer(1, 999, 100, "x"), Err(LedgerError::AccountNotFound(999))));
    }

    #[test]
    fn test_zero_amount_rejected() {
        let mut l = ledger_with_accounts();
        assert!(matches!(l.post_transfer(1, 2, 0, "zero"), Err(LedgerError::InvalidAmount)));
    }

    #[test]
    fn test_negative_amount_rejected() {
        let mut l = ledger_with_accounts();
        assert!(matches!(l.post_transfer(1, 2, -50, "negative"), Err(LedgerError::InvalidAmount)));
    }

    #[test]
    fn test_total_supply_conserved_across_1000_transfers() {
        let mut l = Ledger::new();
        for i in 1u64..=100 { l.create_account(i, "acct", 1_000_000).unwrap(); }
        let supply_before = l.total_supply();
        for i in 0u64..1000 {
            let from = (i % 100) + 1;
            let to = ((i + 1) % 100) + 1;
            let _ = l.post_transfer(from, to, 1, "stress");
        }
        assert_eq!(l.total_supply(), supply_before);
    }

    #[test]
    fn test_journal_entry_recorded() {
        let mut l = ledger_with_accounts();
        let entry_id = l.post_transfer(1, 2, 250, "rent").unwrap();
        let entries = l.account_journal(1);
        assert_eq!(entries.len(), 1);
        assert_eq!(entries[0].id, entry_id);
        assert_eq!(entries[0].amount, 250);
        assert_eq!(entries[0].memo, "rent");
    }

    #[test]
    fn test_account_journal_shows_all_entries() {
        let mut l = ledger_with_accounts();
        for _ in 0..5 { l.post_transfer(1, 2, 10, "x").unwrap(); }
        for _ in 0..3 { l.post_transfer(2, 1, 5, "y").unwrap(); }
        let alice_entries = l.account_journal(1);
        assert_eq!(alice_entries.len(), 8); // 5 sent + 3 received
    }

    #[test]
    fn test_multiple_sequential_transfers_accurate() {
        let mut l = ledger_with_accounts();
        for _ in 0..100 { l.post_transfer(1, 2, 10, "x").unwrap(); }
        assert_eq!(l.balance(1).unwrap(), 10_000 - 1_000);
        assert_eq!(l.balance(2).unwrap(), 5_000 + 1_000);
    }

    #[test]
    fn test_late_fee_capped_at_max() {
        let mut l = ledger_with_accounts();
        let supply_before = l.total_supply();
        // Request 200 cents fee, max 100 cents — should apply 100
        l.apply_late_fee(1, 200, 100).unwrap();
        assert_eq!(l.balance(1).unwrap(), 9_900); // 10000 - 100
        assert_eq!(l.balance(SYSTEM_ACCOUNT_ID).unwrap(), 100);
        assert_eq!(l.total_supply(), supply_before);
    }

    #[test]
    fn test_late_fee_insufficient_balance() {
        let mut l = Ledger::new();
        l.create_account(5, "Broke", 50).unwrap();
        let result = l.apply_late_fee(5, 200, 200);
        assert!(matches!(result, Err(LedgerError::InsufficientFunds { available: 50, requested: 200 })));
    }

    #[test]
    fn test_system_account_receives_fees() {
        let mut l = ledger_with_accounts();
        l.apply_late_fee(1, 50, 1000).unwrap();
        l.apply_late_fee(2, 30, 1000).unwrap();
        assert_eq!(l.balance(SYSTEM_ACCOUNT_ID).unwrap(), 80);
    }

    #[test]
    fn test_concurrent_transfers_no_corruption() {
        let ledger = Arc::new(Mutex::new(Ledger::new()));
        {
            let mut l = ledger.lock().unwrap();
            l.create_account(1, "Alice", 10_000_000).unwrap();
            l.create_account(2, "Bob",   10_000_000).unwrap();
        }
        let mut handles = vec![];
        for _ in 0..8 {
            let l = Arc::clone(&ledger);
            handles.push(std::thread::spawn(move || {
                for _ in 0..1000 {
                    let mut lock = l.lock().unwrap();
                    let _ = lock.post_transfer(1, 2, 1, "concurrent");
                    let _ = lock.post_transfer(2, 1, 1, "concurrent");
                }
            }));
        }
        for h in handles { h.join().unwrap(); }
        let l = ledger.lock().unwrap();
        // Supply must be exactly conserved
        assert_eq!(l.total_supply(), 20_000_000);
    }

    #[test]
    fn test_account_already_exists_error() {
        let mut l = Ledger::new();
        l.create_account(1, "Alice", 100).unwrap();
        assert!(matches!(l.create_account(1, "Alice2", 200), Err(LedgerError::AccountAlreadyExists(1))));
    }
}
