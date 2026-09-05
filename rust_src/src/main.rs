//! chamavault-ledger benchmark binary
use std::time::Instant;
use chamavault_ledger::Ledger;

fn main() {
    println!("=== chamavault ACID Ledger Engine (Rust) ===");
    let mut ledger = Ledger::new();
    let n_accounts: u64 = 100;
    let n_transactions: usize = 100_000;

    for i in 1..=n_accounts {
        ledger.create_account(i, &format!("Account-{}", i), 1_000_000).unwrap();
    }

    let supply_before = ledger.total_supply();
    let mut latencies: Vec<f64> = Vec::with_capacity(n_transactions);

    let start = Instant::now();
    for i in 0..n_transactions {
        let from = (i as u64 % n_accounts) + 1;
        let to = ((i as u64 + 1) % n_accounts) + 1;
        let t0 = Instant::now();
        let _ = ledger.post_transfer(from, to, 1, "bench");
        latencies.push(t0.elapsed().as_nanos() as f64 / 1000.0);
    }
    let elapsed = start.elapsed().as_secs_f64();
    let supply_after = ledger.total_supply();

    latencies.sort_by(|a, b| a.partial_cmp(b).unwrap());
    let n = latencies.len();
    let tps = n_transactions as f64 / elapsed;

    println!("Transactions: {}", n_transactions);
    println!("Elapsed:      {:.3}s", elapsed);
    println!("TPS:          {:.0} tx/sec", tps);
    println!("p50 lat:      {:.2} µs", latencies[n / 2]);
    println!("p99 lat:      {:.2} µs", latencies[(n as f64 * 0.99) as usize]);
    println!("Supply conservation: {} (before={}, after={})",
        if supply_before == supply_after { "PASS" } else { "FAIL" },
        supply_before, supply_after);
}
