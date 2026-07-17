interface ATSms {
  send(opts: { to: string[]; message: string; from: string }): Promise<Record<string, unknown>>;
}
interface ATClient {
  SMS: ATSms;
}
type ATFactory = (cfg: { apiKey: string; username: string }) => ATClient;

let AT: ATClient | null = null;

async function getAT(): Promise<ATClient | null> {
  if (!process.env.AT_API_KEY || !process.env.AT_USERNAME) return null;
  if (!AT) {
    try {
      // Specifier held in a variable so the optional peer dep is resolved at
      // runtime only — it is not a hard build/type dependency.
      const pkg = "africastalking";
      const mod = (await import(/* webpackIgnore: true */ pkg)) as {
        default?: ATFactory;
      } & ATFactory;
      const factory: ATFactory = mod.default ?? (mod as ATFactory);
      AT = factory({
        apiKey: process.env.AT_API_KEY,
        username: process.env.AT_USERNAME,
      });
    } catch {
      console.warn("africastalking SDK failed to load");
      return null;
    }
  }
  return AT;
}

interface SendSmsParams {
  to: string;
  message: string;
}

export async function sendSms({
  to,
  message,
}: SendSmsParams): Promise<{ success?: boolean; error?: unknown; skipped?: boolean }> {
  const at = await getAT();
  if (!at) {
    console.warn("AT_API_KEY or AT_USERNAME not set — skipping SMS");
    return { skipped: true };
  }

  const senderId = process.env.AT_SENDER_ID || "ChamaVault";
  const phone = to.replace(/^0/, "+254").replace(/^(?!\+)/, "+");

  try {
    const sms = at.SMS;
    const result = await sms.send({
      to: [phone],
      message,
      from: senderId,
    });
    return { success: true, ...result };
  } catch (error) {
    console.error("SMS send failed:", error);
    return { error };
  }
}

export function contributionSmsTemplate(params: {
  memberName: string;
  chamaName: string;
  amountKES: number;
  monthLabel: string;
}): string {
  const fmt = new Intl.NumberFormat("en-KE").format(params.amountKES);
  return `Habari ${params.memberName}, your contribution of KES ${fmt} for ${params.monthLabel} is due for ${params.chamaName}. Please pay before the next meeting. — ChamaVault`;
}

export function meetingSmsTemplate(params: {
  memberName: string;
  chamaName: string;
  meetingDate: string;
}): string {
  return `Habari ${params.memberName}, ${params.chamaName} meeting on ${params.meetingDate}. Your participation matters! — ChamaVault`;
}

export function loanApprovalSmsTemplate(params: {
  memberName: string;
  chamaName: string;
  amountKES: number;
}): string {
  const fmt = new Intl.NumberFormat("en-KE").format(params.amountKES);
  return `Habari ${params.memberName}, your loan of KES ${fmt} in ${params.chamaName} has been approved. Log in to ChamaVault for details.`;
}
