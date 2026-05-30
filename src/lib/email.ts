import { Resend } from "resend";

let resendClient: Resend | null = null;

function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  if (!resendClient) {
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }
  return resendClient;
}

function emailCard(children: string): string {
  return `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; border: 1px solid #e4e4e7; border-radius: 12px; background: #fafafa;">
      ${children}
    </div>
  `;
}

function emailButton(label: string, href: string): string {
  return `<a href="${href}" style="display: inline-block; background: #f59e0b; color: #18181b; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 16px 0;">${label}</a>`;
}

interface SendInvitationParams {
  to: string;
  chamaName: string;
  joinUrl: string;
}

export async function sendInvitationEmail({
  to,
  chamaName,
  joinUrl,
}: SendInvitationParams) {
  const resend = getResend();
  if (!resend) {
    console.warn("RESEND_API_KEY not set — skipping email");
    return { skipped: true };
  }

  const { data, error } = await resend.emails.send({
    from: "ChamaVault <noreply@chamavault.com>",
    to,
    subject: `You've been invited to join ${chamaName} on ChamaVault`,
    html: emailCard(`
      <h1 style="color: #18181b;">You're invited! 🎉</h1>
      <p>You've been invited to join <strong>${chamaName}</strong> on ChamaVault, the platform for managing your chama contributions, loans, and meetings.</p>
      ${emailButton(`Join ${chamaName}`, joinUrl)}
      <p style="color: #52525b; font-size: 14px;">Or copy this link: <a href="${joinUrl}">${joinUrl}</a></p>
      <p style="color: #71717a; font-size: 12px;">This invitation expires in 7 days.</p>
    `),
  });

  if (error) {
    console.error("Failed to send invitation email:", error);
    return { error };
  }

  return { data };
}

interface SendContributionReminderParams {
  to: string;
  memberName: string;
  chamaName: string;
  amountKES: number;
  monthLabel: string;
  chamaLink: string;
}

export async function sendContributionReminder({
  to,
  memberName,
  chamaName,
  amountKES,
  monthLabel,
  chamaLink,
}: SendContributionReminderParams) {
  const resend = getResend();
  if (!resend) {
    console.warn("RESEND_API_KEY not set — skipping email");
    return { skipped: true };
  }

  const { data, error } = await resend.emails.send({
    from: "ChamaVault <noreply@chamavault.com>",
    to,
    subject: `Contribution Reminder: ${chamaName} — ${monthLabel}`,
    html: emailCard(`
      <h1 style="color: #18181b;">Contribution Reminder</h1>
      <p>Habari <strong>${memberName}</strong>,</p>
      <p>This is a reminder that your contribution of <strong>KES ${amountKES.toLocaleString()}</strong> for <strong>${monthLabel}</strong> is due for <strong>${chamaName}</strong>.</p>
      <p>Please make your payment before the next meeting.</p>
      ${emailButton("View Chama", chamaLink)}
      <p style="color: #71717a; font-size: 12px;">Simamia Chama Yako Vizuri — ChamaVault</p>
    `),
  });

  if (error) {
    console.error("Failed to send contribution reminder:", error);
    return { error };
  }

  return { data };
}

interface SendMeetingReminderParams {
  to: string;
  memberName: string;
  chamaName: string;
  meetingDate: string;
  venue?: string;
  agenda?: string;
  chamaLink: string;
}

export async function sendMeetingReminder({
  to,
  memberName,
  chamaName,
  meetingDate,
  venue,
  agenda,
  chamaLink,
}: SendMeetingReminderParams) {
  const resend = getResend();
  if (!resend) {
    console.warn("RESEND_API_KEY not set — skipping email");
    return { skipped: true };
  }

  const venueBlock = venue ? `<p><strong>Venue:</strong> ${venue}</p>` : "";
  const agendaBlock = agenda ? `<p><strong>Agenda:</strong> ${agenda}</p>` : "";

  const { data, error } = await resend.emails.send({
    from: "ChamaVault <noreply@chamavault.com>",
    to,
    subject: `Meeting Reminder: ${chamaName} — ${meetingDate}`,
    html: emailCard(`
      <h1 style="color: #18181b;">Meeting Reminder 📅</h1>
      <p>Habari <strong>${memberName}</strong>,</p>
      <p>You have a <strong>${chamaName}</strong> meeting coming up on <strong>${meetingDate}</strong>.</p>
      ${venueBlock}
      ${agendaBlock}
      <p>Your participation matters!</p>
      ${emailButton("View Meeting", chamaLink)}
      <p style="color: #71717a; font-size: 12px;">Simamia Chama Yako Vizuri — ChamaVault</p>
    `),
  });

  if (error) {
    console.error("Failed to send meeting reminder:", error);
    return { error };
  }

  return { data };
}

interface SendLoanApprovalParams {
  to: string;
  memberName: string;
  chamaName: string;
  amountKES: number;
  interestRate: number;
  dueDate?: string;
  chamaLink: string;
}

export async function sendLoanApprovalEmail({
  to,
  memberName,
  chamaName,
  amountKES,
  interestRate,
  dueDate,
  chamaLink,
}: SendLoanApprovalParams) {
  const resend = getResend();
  if (!resend) {
    console.warn("RESEND_API_KEY not set — skipping email");
    return { skipped: true };
  }

  const interestAmount = amountKES * (interestRate / 100);
  const totalDue = amountKES + interestAmount;
  const dueLine = dueDate ? `<p><strong>Due date:</strong> ${dueDate}</p>` : "";

  const { data, error } = await resend.emails.send({
    from: "ChamaVault <noreply@chamavault.com>",
    to,
    subject: `Loan Approved: ${chamaName} — KES ${amountKES.toLocaleString()}`,
    html: emailCard(`
      <h1 style="color: #18181b;">Loan Approved! ✅</h1>
      <p>Habari <strong>${memberName}</strong>,</p>
      <p>Your loan application in <strong>${chamaName}</strong> has been approved.</p>
      <div style="background: #fef3c7; border-radius: 8px; padding: 16px; margin: 16px 0;">
        <p style="margin: 0 0 4px;"><strong>Amount:</strong> KES ${amountKES.toLocaleString()}</p>
        <p style="margin: 0 0 4px;"><strong>Interest Rate:</strong> ${interestRate}%</p>
        <p style="margin: 0 0 4px;"><strong>Total Due:</strong> KES ${totalDue.toLocaleString()}</p>
        ${dueLine}
      </div>
      ${emailButton("View Loan", chamaLink)}
      <p style="color: #71717a; font-size: 12px;">Simamia Chama Yako Vizuri — ChamaVault</p>
    `),
  });

  if (error) {
    console.error("Failed to send loan approval email:", error);
    return { error };
  }

  return { data };
}
