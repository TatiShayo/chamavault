import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";

const fmt = (n: number) => new Intl.NumberFormat("en-KE").format(n);

const styles = StyleSheet.create({
  page: {
    padding: 48,
    fontFamily: "Helvetica",
    fontSize: 10,
    color: "#18181b",
  },
  cover: {
    justifyContent: "center" as const,
    alignItems: "center" as const,
    gap: 16,
  },
  coverTitle: {
    fontSize: 24,
    fontWeight: 700,
    color: "#f59e0b",
    marginBottom: 8,
  },
  coverSub: {
    fontSize: 16,
    color: "#52525b",
    marginBottom: 4,
  },
  coverYear: {
    fontSize: 36,
    fontWeight: 700,
    color: "#18181b",
    marginTop: 16,
  },
  header: {
    marginBottom: 20,
    borderBottom: "2 solid #f59e0b",
    paddingBottom: 10,
  },
  chamaName: {
    fontSize: 16,
    fontWeight: 700,
  },
  reportTitle: {
    fontSize: 12,
    color: "#52525b",
    marginTop: 4,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 700,
    color: "#f59e0b",
    marginBottom: 6,
    borderBottom: "1 solid #e4e4e7",
    paddingBottom: 3,
    textTransform: "uppercase" as const,
  },
  row: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    paddingVertical: 2,
  },
  label: { color: "#52525b" },
  value: { fontWeight: 700 },
  table: { marginTop: 4 },
  tableHeader: {
    flexDirection: "row" as const,
    backgroundColor: "#fafaf9",
    paddingVertical: 4,
    paddingHorizontal: 4,
    borderBottom: "1 solid #e4e4e7",
  },
  tableRow: {
    flexDirection: "row" as const,
    paddingVertical: 3,
    paddingHorizontal: 4,
    borderBottom: "1 solid #f4f4f5",
  },
  col1: { width: "40%" },
  col2: { width: "20%", textAlign: "right" as const },
  col3: { width: "20%", textAlign: "right" as const },
  col4: { width: "20%", textAlign: "right" as const },
  th: { fontWeight: 700, fontSize: 9 },
  footer: {
    position: "absolute" as const,
    bottom: 48,
    left: 48,
    right: 48,
    fontSize: 9,
    color: "#a1a1aa",
    textAlign: "center" as const,
  },
  pageNumber: {
    position: "absolute" as const,
    top: 24,
    right: 48,
    fontSize: 9,
    color: "#a1a1aa",
  },
});

interface MemberRow {
  name: string;
  totalPaid: number;
  totalDue: number;
  compliance: number;
}

interface LoanRow {
  member: string;
  amount: number;
  interestRate: number;
  outstanding: number;
}

interface ExpenseRow {
  description: string;
  amount: number;
  category: string;
}

interface InvestmentRow {
  name: string;
  cost: number;
  currentValue: number;
  gain: number;
}

interface AnnualReportData {
  chamaName: string;
  year: number;
  treasury: {
    balance: number;
    totalContributions: number;
    totalLoansDisbursed: number;
    totalLoanRepayments: number;
    interestCollected: number;
    totalExpenses: number;
  };
  members: MemberRow[];
  loans: LoanRow[];
  expenses: ExpenseRow[];
  totalWorth: number;
  investments: InvestmentRow[];
}

export function AnnualReportPDF({ data }: { data: AnnualReportData }) {
  const complianceAvg =
    data.members.length > 0
      ? data.members.reduce((s, m) => s + m.compliance, 0) / data.members.length
      : 0;

  const totalInvestmentValue = data.investments.reduce(
    (s, i) => s + i.currentValue,
    0
  );
  const totalInvestmentCost = data.investments.reduce(
    (s, i) => s + i.cost,
    0
  );

  return (
    <Document>
      {/* Cover Page */}
      <Page size="A4" style={[styles.page, styles.cover]}>
        <Text style={styles.coverTitle}>ChamaVault</Text>
        <Text style={styles.coverSub}>Annual Report</Text>
        <Text style={styles.coverSub}>{data.chamaName}</Text>
        <Text style={styles.coverYear}>{data.year}</Text>
        <Text style={{ marginTop: 32, color: "#71717a" }}>
          Simamia Chama Yako Vizuri
        </Text>
      </Page>

      {/* Executive Summary */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.chamaName}>{data.chamaName}</Text>
          <Text style={styles.reportTitle}>
            Annual Report — {data.year}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Executive Summary</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Treasury Balance</Text>
            <Text style={styles.value}>KES {fmt(data.treasury.balance)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Total Contributions</Text>
            <Text style={styles.value}>KES {fmt(data.treasury.totalContributions)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Loans Disbursed</Text>
            <Text style={styles.value}>KES {fmt(data.treasury.totalLoansDisbursed)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Loan Repayments</Text>
            <Text style={styles.value}>KES {fmt(data.treasury.totalLoanRepayments)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Interest Collected</Text>
            <Text style={styles.value}>KES {fmt(data.treasury.interestCollected)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Total Expenses</Text>
            <Text style={styles.value}>KES {fmt(data.treasury.totalExpenses)}</Text>
          </View>
          {data.investments.length > 0 && (
            <>
              <View style={styles.row}>
                <Text style={styles.label}>Total Investment Cost</Text>
                <Text style={styles.value}>KES {fmt(totalInvestmentCost)}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Total Investment Value</Text>
                <Text style={styles.value}>KES {fmt(totalInvestmentValue)}</Text>
              </View>
            </>
          )}
          <View style={[{ ...styles.row, borderTop: "1 solid #e4e4e7", marginTop: 4, paddingTop: 4 }]}>
            <Text style={styles.label}>Total Chama Worth</Text>
            <Text style={styles.value}>KES {fmt(data.totalWorth)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Member Compliance</Text>
            <Text style={styles.value}>{complianceAvg.toFixed(1)}%</Text>
          </View>
        </View>

        {/* Member Contributions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Member Contribution Compliance</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.col1, styles.th]}>Member</Text>
              <Text style={[styles.col2, styles.th]}>Paid</Text>
              <Text style={[styles.col3, styles.th]}>Due</Text>
              <Text style={[styles.col4, styles.th]}>Compliance</Text>
            </View>
            {data.members.map((m, i) => (
              <View key={i} style={styles.tableRow}>
                <Text style={styles.col1}>{m.name}</Text>
                <Text style={styles.col2}>{fmt(m.totalPaid)}</Text>
                <Text style={styles.col3}>{fmt(m.totalDue)}</Text>
                <Text style={styles.col4}>{m.compliance.toFixed(0)}%</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.footer}>
          <Text>Generated by ChamaVault — Simamia Chama Yako Vizuri</Text>
        </View>
      </Page>

      {/* Loans and Expenses */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.chamaName}>{data.chamaName}</Text>
          <Text style={styles.reportTitle}>Loans &amp; Expenses — {data.year}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Loan Portfolio</Text>
          {data.loans.length === 0 ? (
            <Text>No loans recorded.</Text>
          ) : (
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.col1, styles.th]}>Member</Text>
                <Text style={[styles.col2, styles.th]}>Amount</Text>
                <Text style={[styles.col3, styles.th]}>Rate</Text>
                <Text style={[styles.col4, styles.th]}>Outstanding</Text>
              </View>
              {data.loans.map((l, i) => (
                <View key={i} style={styles.tableRow}>
                  <Text style={styles.col1}>{l.member}</Text>
                  <Text style={styles.col2}>{fmt(l.amount)}</Text>
                  <Text style={styles.col3}>{l.interestRate}%</Text>
                  <Text style={styles.col4}>{fmt(l.outstanding)}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Expense Breakdown</Text>
          {data.expenses.length === 0 ? (
            <Text>No expenses recorded.</Text>
          ) : (
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.col1, styles.th]}>Description</Text>
                <Text style={[styles.col2, styles.th]}>Category</Text>
                <Text style={[styles.col3, styles.th]}>Amount</Text>
              </View>
              {data.expenses.map((e, i) => (
                <View key={i} style={styles.tableRow}>
                  <Text style={styles.col1}>{e.description}</Text>
                  <Text style={styles.col2}>{e.category}</Text>
                  <Text style={styles.col3}>{fmt(e.amount)}</Text>
                </View>
              ))}
              <View style={[{ ...styles.tableRow, borderTop: "1 solid #e4e4e7" }]}>
                <Text style={[styles.col1, { fontWeight: 700 }]}>Total</Text>
                <Text style={styles.col2}></Text>
                <Text style={[styles.col3, { fontWeight: 700 }]}>
                  {fmt(data.treasury.totalExpenses)}
                </Text>
              </View>
            </View>
          )}
        </View>

        <View style={styles.footer}>
          <Text>Generated by ChamaVault — Simamia Chama Yako Vizuri</Text>
        </View>
      </Page>

      {/* Investments (if any) */}
      {data.investments.length > 0 && (
        <Page size="A4" style={styles.page}>
          <View style={styles.header}>
            <Text style={styles.chamaName}>{data.chamaName}</Text>
            <Text style={styles.reportTitle}>Investments — {data.year}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Investment Portfolio</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.col1, styles.th]}>Investment</Text>
                <Text style={[styles.col2, styles.th]}>Cost</Text>
                <Text style={[styles.col3, styles.th]}>Value</Text>
                <Text style={[styles.col4, styles.th]}>Gain/Loss</Text>
              </View>
              {data.investments.map((inv, i) => (
                <View key={i} style={styles.tableRow}>
                  <Text style={styles.col1}>{inv.name}</Text>
                  <Text style={styles.col2}>{fmt(inv.cost)}</Text>
                  <Text style={styles.col3}>{fmt(inv.currentValue)}</Text>
                  <Text
                    style={[
                      styles.col4,
                      {
                        color: inv.gain >= 0 ? "#16a34a" : "#dc2626",
                      },
                    ]}
                  >
                    {inv.gain >= 0 ? "+" : ""}
                    {fmt(inv.gain)}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.footer}>
            <Text>Generated by ChamaVault — Simamia Chama Yako Vizuri</Text>
          </View>
        </Page>
      )}
    </Document>
  );
}
