import { Resend } from "resend";

let resendClient: Resend | null = null;

function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  if (!resendClient) {
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }
  return resendClient;
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
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h1 style="color: #18181b;">You're invited! 🎉</h1>
        <p>You've been invited to join <strong>${chamaName}</strong> on ChamaVault, the platform for managing your chama contributions, loans, and meetings.</p>
        <p>Click the button below to accept your invitation:</p>
        <a href="${joinUrl}" style="display: inline-block; background: #18181b; color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 16px 0;">
          Join ${chamaName}
        </a>
        <p style="color: #52525b; font-size: 14px;">Or copy this link: <a href="${joinUrl}">${joinUrl}</a></p>
        <p style="color: #71717a; font-size: 12px;">This invitation expires in 7 days.</p>
      </div>
    `,
  });

  if (error) {
    console.error("Failed to send invitation email:", error);
    return { error };
  }

  return { data };
}
