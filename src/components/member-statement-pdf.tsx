import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";

Font.register({
  family: "Inter",
  fonts: [
    { src: "https://fonts.gstatic.com/s/inter/v18/UcC73FwrK3iLTeHuS_nVMrMxCp50SjIa1ZL7W0Q5nw.woff2", fontWeight: 400 },
    { src: "https://fonts.gstatic.com/s/inter/v18/UcC73FwrK3iLTeHuS_nVMrMxCp50SjIa25L7W0Q5nw.woff2", fontWeight: 600 },
  ],
});

const styles = StyleSheet.create({
  page: {
    padding: 48,
    fontFamily: "Inter",
    fontSize: 11,
    color: "#18181b",
  },
  header: {
    marginBottom: 32,
    borderBottom: "2 solid #f59e0b",
    paddingBottom: 16,
  },
  chamaName: {
    fontSize: 20,
    fontWeight: 600,
    color: "#18181b",
  },
  subtitle: {
    fontSize: 10,
    color: "#71717a",
    marginTop: 4,
  },
  statementTitle: {
    fontSize: 16,
    fontWeight: 600,
    marginBottom: 8,
  },
  period: {
    fontSize: 12,
    color: "#52525b",
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 600,
    color: "#f59e0b",
    marginBottom: 8,
    borderBottom: "1 solid #e4e4e7",
    paddingBottom: 4,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  rowAlt: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
    backgroundColor: "#fafaf9",
  },
  label: {
    color: "#52525b",
  },
  value: {
    fontWeight: 600,
  },
  paid: {
    color: "#16a34a",
    fontWeight: 600,
  },
  overdue: {
    color: "#dc2626",
    fontWeight: 600,
  },
  divider: {
    borderTop: "1 solid #e4e4e7",
    marginVertical: 8,
  },
  footer: {
    position: "absolute",
    bottom: 48,
    left: 48,
    right: 48,
    fontSize: 9,
    color: "#a1a1aa",
    textAlign: "center",
  },
  signatureBlock: {
    marginTop: 48,
    borderTop: "1 solid #18181b",
    paddingTop: 4,
    width: "45%",
    fontSize: 10,
    textAlign: "center",
  },
  signatureLabel: {
    fontSize: 9,
    color: "#71717a",
    marginTop: 2,
  },
  colMonth: { width: "25%" },
  colDue: { width: "18%", textAlign: "right" },
  colPaid: { width: "18%", textAlign: "right" },
  colBalance: { width: "18%", textAlign: "right" },
  colStatus: { width: "21%", textAlign: "right" },
  th: { fontWeight: 700, fontSize: 9 },
});

interface ContributionRow {
  monthYear: string;
  amountDue: number;
  amountPaid: number;
  paidAt: string | null;
  status: "paid" | "overdue" | "pending";
}

interface LoanRow {
  amount: number;
  interestRate: number;
  status: string;
  outstanding: number;
}

interface MemberStatementData {
  memberName: string;
  chamaName: string;
  period: string;
  contributionAmount: number;
  contributions: ContributionRow[];
  totalPaid: number;
  totalDue: number;
  totalEquity: number;
  treasurerName: string;
  loans: LoanRow[];
  totalLoanOutstanding: number;
  fines: { reason: string; amount: number; paid: boolean }[];
  totalUnpaidFines: number;
}

export function MemberStatementPDF({ data }: { data: MemberStatementData }) {
  const paidCount = data.contributions.filter((c) => c.status === "paid").length;
  const overdueCount = data.contributions.filter((c) => c.status === "overdue").length;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.chamaName}>{data.chamaName}</Text>
          <Text style={styles.subtitle}>Monthly Member Statement</Text>
        </View>

        <Text style={styles.statementTitle}>Statement for {data.memberName}</Text>
        <Text style={styles.period}>{data.period}</Text>

        {/* Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Summary</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Monthly Contribution</Text>
            <Text style={styles.value}>
              KES {new Intl.NumberFormat("en-KE").format(data.contributionAmount)}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Total Paid ({paidCount} months)</Text>
            <Text style={styles.paid}>
              KES {new Intl.NumberFormat("en-KE").format(data.totalPaid)}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>
              Outstanding ({overdueCount} overdue)
            </Text>
            <Text style={styles.overdue}>
              KES {new Intl.NumberFormat("en-KE").format(data.totalDue - data.totalPaid)}
            </Text>
          </View>
          {data.totalEquity > 0 && (
            <View style={styles.row}>
              <Text style={styles.label}>Total Equity</Text>
              <Text style={styles.value}>
                KES {new Intl.NumberFormat("en-KE").format(data.totalEquity)}
              </Text>
            </View>
          )}
          {data.totalLoanOutstanding > 0 && (
            <View style={styles.row}>
              <Text style={styles.label}>Active Loans</Text>
              <Text style={styles.value}>
                KES {new Intl.NumberFormat("en-KE").format(data.totalLoanOutstanding)}
              </Text>
            </View>
          )}
          {data.totalUnpaidFines > 0 && (
            <View style={styles.row}>
              <Text style={styles.label}>Unpaid Fines</Text>
              <Text style={styles.overdue}>
                KES {new Intl.NumberFormat("en-KE").format(data.totalUnpaidFines)}
              </Text>
            </View>
          )}
        </View>

        {/* Contributions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contribution History</Text>
          <View style={[styles.row, { borderBottom: "1 solid #e4e4e7", paddingBottom: 4, marginBottom: 4 }]}>
            <Text style={[styles.colMonth, styles.th]}>Month</Text>
            <Text style={[styles.colDue, styles.th]}>Due</Text>
            <Text style={[styles.colPaid, styles.th]}>Paid</Text>
            <Text style={[styles.colBalance, styles.th]}>Balance</Text>
            <Text style={[styles.colStatus, styles.th]}>Status</Text>
          </View>
          {data.contributions.slice(0, 24).map((c, i) => {
            const rowStyle = i % 2 === 0 ? styles.row : styles.rowAlt;
            const balance = c.amountDue - c.amountPaid;
            return (
              <View key={c.monthYear} style={rowStyle}>
                <Text style={styles.colMonth}>{c.monthYear}</Text>
                <Text style={styles.colDue}>{new Intl.NumberFormat("en-KE").format(c.amountDue)}</Text>
                <Text style={styles.colPaid}>{new Intl.NumberFormat("en-KE").format(c.amountPaid)}</Text>
                <Text style={[styles.colBalance, balance > 0 ? styles.overdue : styles.paid]}>
                  {new Intl.NumberFormat("en-KE").format(balance)}
                </Text>
                <Text style={[styles.colStatus, c.status === "paid" ? styles.paid : c.status === "overdue" ? styles.overdue : styles.label]}>
                  {c.status === "paid" ? "Paid" : c.status === "overdue" ? "Overdue" : "Pending"}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Loans */}
        {data.loans.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Loans</Text>
            {data.loans.map((l, i) => (
              <View key={i} style={i % 2 === 0 ? styles.row : styles.rowAlt}>
                <Text style={styles.label}>
                  KES {new Intl.NumberFormat("en-KE").format(l.amount)} @ {l.interestRate}%
                </Text>
                <Text style={styles.label}>
                  {l.status === "active" ? "Outstanding:" : "Repaid:"}
                </Text>
                <Text style={l.outstanding > 0 ? styles.overdue : styles.paid}>
                  KES {new Intl.NumberFormat("en-KE").format(l.outstanding)}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Fines */}
        {data.fines.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Fines</Text>
            {data.fines.map((f, i) => (
              <View key={i} style={i % 2 === 0 ? styles.row : styles.rowAlt}>
                <Text style={styles.label}>{f.reason}</Text>
                <Text style={f.paid ? styles.paid : styles.overdue}>
                  KES {new Intl.NumberFormat("en-KE").format(f.amount)}
                </Text>
                <Text style={f.paid ? styles.paid : styles.overdue}>
                  {f.paid ? "Paid" : "Unpaid"}
                </Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.signatureBlock}>
          <Text>{data.treasurerName}</Text>
          <Text style={styles.signatureLabel}>Treasurer</Text>
        </View>

        <View style={styles.footer}>
          <Text>
            Generated on {new Date().toLocaleDateString("en-KE", { weekday: "long", year: "numeric", month: "long", day: "numeric" })} by ChamaVault — Simamia Chama Yako Vizuri
          </Text>
        </View>
      </Page>
    </Document>
  );
}
