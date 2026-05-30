export function contributionReminder(
  memberName: string,
  chamaName: string,
  amountKES: number
): string {
  const fmt = new Intl.NumberFormat("en-KE").format(amountKES);
  const body = `Habari ${memberName},

Hii ni ukumbusho kutoka ${chamaName}. Tafadhali lipa mchango wako wa KES ${fmt} kabla ya mkutano ujao.

Asante.`;
  return encodeWhatsAppLink(body);
}

export function meetingReminder(
  memberName: string,
  chamaName: string,
  meetingDay: string,
  meetingDate?: string
): string {
  const dateLine = meetingDate
    ? `Mkutano ujao utakuwa ${meetingDate} (${meetingDay}).`
    : `Mkutano ujao utakuwa siku ya ${meetingDay}.`;

  const body = `Habari ${memberName},

${dateLine} Tafadhali hudhuria. ${chamaName} inategemea ushiriki wako.

Asante.`;
  return encodeWhatsAppLink(body);
}

export function fineReminder(
  memberName: string,
  chamaName: string,
  amountKES: number,
  reason: string
): string {
  const fmt = new Intl.NumberFormat("en-KE").format(amountKES);
  const body = `Habari ${memberName},

Tunakukumbusha kulipa faini yako ya KES ${fmt} kwa sababu ya: ${reason}.

Tafadhali lipa kabla ya mkutano ujao. ${chamaName}.`;
  return encodeWhatsAppLink(body);
}

function encodeWhatsAppLink(body: string): string {
  return `https://wa.me/?text=${encodeURIComponent(body)}`;
}

export function openWhatsApp(message: string, phone?: string) {
  const base = phone
    ? `https://wa.me/${phone.replace(/[^0-9]/g, "")}`
    : "https://wa.me/";
  window.open(`${base}?text=${encodeURIComponent(message)}`, "_blank");
}
