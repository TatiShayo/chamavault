import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: {
    padding: 48,
    fontFamily: "Helvetica",
    fontSize: 11,
    color: "#18181b",
  },
  header: {
    marginBottom: 24,
    borderBottom: "2 solid #f59e0b",
    paddingBottom: 12,
    textAlign: "center" as const,
  },
  chamaName: {
    fontSize: 18,
    fontWeight: 700,
    color: "#18181b",
  },
  meetingTitle: {
    fontSize: 14,
    marginTop: 8,
    color: "#52525b",
  },
  section: {
    marginBottom: 18,
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
    paddingVertical: 3,
  },
  label: {
    color: "#52525b",
    width: "40%",
  },
  value: {
    fontWeight: 700,
    width: "60%",
  },
  memberItem: {
    paddingVertical: 2,
    paddingLeft: 8,
  },
  present: {
    color: "#16a34a",
  },
  absent: {
    color: "#dc2626",
  },
  resolutionItem: {
    marginBottom: 8,
    padding: 6,
    backgroundColor: "#fafaf9",
    borderRadius: 4,
  },
  resolutionText: {
    fontWeight: 700,
    marginBottom: 4,
  },
  resolutionResult: {
    fontSize: 10,
    color: "#52525b",
  },
  minutesText: {
    lineHeight: 1.5,
    marginTop: 4,
  },
  footer: {
    position: "absolute" as const,
    bottom: 48,
    left: 48,
    right: 48,
    fontSize: 9,
    color: "#a1a1aa",
    textAlign: "center" as const,
  },
  signatureRow: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    marginTop: 40,
  },
  signatureBlock: {
    width: "40%",
    borderTop: "1 solid #18181b",
    paddingTop: 4,
    fontSize: 10,
    textAlign: "center" as const,
  },
});

interface MeetingMinutesData {
  chamaName: string;
  chairpersonName: string;
  meetingDate: string;
  venue: string;
  agenda: string;
  minutesText: string;
  membersPresent: { name: string; present: boolean }[];
  resolutions: { text: string; yes: number; no: number; abstain: number }[];
  nextMeetingDate?: string;
}

export function MeetingMinutesPDF({ data }: { data: MeetingMinutesData }) {
  const presentCount = data.membersPresent.filter((m) => m.present).length;
  const absentCount = data.membersPresent.length - presentCount;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.chamaName}>{data.chamaName}</Text>
          <Text style={styles.meetingTitle}>Meeting Minutes</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Meeting Details</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Date</Text>
            <Text style={styles.value}>{data.meetingDate}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Venue</Text>
            <Text style={styles.value}>{data.venue || "N/A"}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Chairperson</Text>
            <Text style={styles.value}>{data.chairpersonName}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Agenda</Text>
            <Text style={styles.value}>{data.agenda}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Members Present ({presentCount})
          </Text>
          {data.membersPresent.filter((m) => m.present).map((m, i) => (
            <View key={i} style={styles.memberItem}>
              <Text style={styles.present}>
                ✓ {m.name}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Apologies ({absentCount})
          </Text>
          {data.membersPresent.filter((m) => !m.present).map((m, i) => (
            <View key={i} style={styles.memberItem}>
              <Text style={styles.absent}>
                {m.name}
              </Text>
            </View>
          ))}
          {absentCount === 0 && (
            <Text style={{ color: "#52525b" }}>None</Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Minutes</Text>
          <Text style={styles.minutesText}>
            {data.minutesText || "No minutes recorded."}
          </Text>
        </View>

        {data.resolutions.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Resolutions</Text>
            {data.resolutions.map((r, i) => (
              <View key={i} style={styles.resolutionItem}>
                <Text style={styles.resolutionText}>{r.text}</Text>
                <Text style={styles.resolutionResult}>
                  Yes: {r.yes} | No: {r.no} | Abstain: {r.abstain}
                </Text>
              </View>
            ))}
          </View>
        )}

        {data.nextMeetingDate && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Next Meeting</Text>
            <Text>{data.nextMeetingDate}</Text>
          </View>
        )}

        <View style={styles.signatureRow}>
          <View style={styles.signatureBlock}>
            <Text>{data.chairpersonName}</Text>
            <Text style={{ fontSize: 9, color: "#71717a", marginTop: 2 }}>Chairperson</Text>
          </View>
          <View style={styles.signatureBlock}>
            <Text>Secretary</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text>Generated by ChamaVault — Simamia Chama Yako Vizuri</Text>
        </View>
      </Page>
    </Document>
  );
}
