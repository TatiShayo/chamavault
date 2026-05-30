# ChamaVault — Simamia Chama Yako Vizuri

**ChamaVault** is a complete digital chama (group savings) management platform built for Kenya's 1M+ investment and savings groups. Manage contributions, loans, meetings, fines, investments, and member statements — all in one place.

## Features

- **Contribution Tracker** — Per-member, per-month grid showing paid/overdue/pending status
- **Loan Management** — Applications, approvals, repayment tracking with interest
- **Meeting Minutes** — Schedule meetings, mark attendance, record minutes, export PDF
- **Member Statements** — Monthly PDF statements with contributions, loans, fines, equity
- **Annual Reports** — Treasury growth, member compliance, loan portfolio, expense breakdown
- **Dividend Calculator** — Year-end profit distribution based on share units
- **WhatsApp & SMS** — Bulk reminders via wa.me links + Africa's Talking SMS integration
- **Email Notifications** — Contribution reminders, welcome emails, loan approvals via Resend
- **Fines & Expenses** — Track fines, record chama expenses with categories
- **Investment Tracker** — Record property, stock, and business investments with current value
- **Member Portal** — Self-service portal where members check their status by phone number
- **Data Export** — Download all chama data as JSON
- **Swahili + English** — Full bilingual support
- **Mobile-First** — Works on 360px screens (Infinix/Tecno)

## Tech Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Supabase (Auth, Database, Storage)
- **Payments**: Stripe (international) + M-Pesa Daraja API
- **Email**: Resend
- **SMS**: Africa's Talking
- **PDF**: @react-pdf/renderer
- **AI**: OpenAI GPT-4o-mini (meeting minutes assistant)

## Getting Started

### Prerequisites

- Node.js 18+
- Supabase account (free tier works)
- Resend API key (for email notifications)

### Setup

```bash
# Clone the repo
git clone https://github.com/your-org/chamavault.git
cd chamavault

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local
```

### Environment Variables

Edit `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
RESEND_API_KEY=your-resend-api-key
AT_API_KEY=your-africastalking-api-key (optional)
AT_USERNAME=your-africastalking-username (optional)
AT_SENDER_ID=ChamaVault (optional)
OPENAI_API_KEY=your-openai-api-key (optional)
```

### Database Setup

1. Go to your Supabase SQL Editor
2. Run `supabase/schema.sql` to create all tables and policies
3. (Optional) Run `supabase/seed.sql` for demo data — replace `USER-UUID-HERE` with your user's UUID

### Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Build

```bash
npm run build
npm start
```

## Pricing

| Plan | Price (KES) | Chamas | Members | Features |
|------|------------|--------|---------|----------|
| Free | Bure | 1 | 5 | Basic tracking |
| Small | 500/mo | 1 | 10 | Full features |
| Standard | 1,000/mo | 3 | 30 | PDF statements, minutes |
| Large | 2,000/mo | Unlimited | Unlimited | Everything |

## Testing

```bash
npm test
```

---

## Kiswahili

### Kuhusu ChamaVault

ChamaVault ni jukwaa kamili la kusimamia chama za kuweka na kuwekeza nchini Kenya. Dhibiti michango, mikopo, mikutano, faini, uwekezaji, na taarifa za wanachama — yote kwa mahali pamoja.

### Vipengele

- **Kifuatiliaji cha Michango** — Jedwali la kila mwanachama kwa kila mwezi linaloonyesha hali ya malipo
- **Usimamizi wa Mikopo** — Maombi, uidhinishaji, ufuatiliaji wa marejesho na riba
- **Kumbukumbu za Mikutano** — Panga mikutano, alama mahudhurio, rekodi kumbukumbu
- **Taarifa za Wanachama** — Taarifa za kila mwezi za PDF zenye michango, mikopo, faini, hisa
- **Ripoti za Mwaka** — Ukuaji wa hazina, uzingativu wa wanachama, kwingineko ya mikopo
- **Kikokotoo cha Gawio** — Mgawanyo wa faida ya mwisho wa mwaka kulingana na vitengo vya hisa
- **WhatsApp na SMS** — Vikumbusho vya jumla kupitia viungo vya wa.me + Africa's Talking
- **Arifa za Barua Pepe** — Vikumbusho vya michango, barua za kukaribisha, uidhinishaji wa mikopo
- **Faini na Matumizi** — Fuatilia faini, rekodi matumizi ya chama kwa kategoria
- **Kifuatiliaji cha Uwekezaji** — Rekodi uwekezaji wa ardhi, hisa, na biashara
- **Tovuti ya Mwanachama** — Tovuti ya kujihudumia ambapo wanachama hukagua hali zao kwa nambari ya simu
- **Hamisha Data** — Pakua data yote ya chama kama JSON
- **Kiswahili + Kiingereza** — Msaada kamili wa lugha mbili
- **Simu ya Mkono** — Inafanya kazi kwenye skrini za 360px (Infinix/Tecno)

### Anza

```bash
# Nakili repo
git clone https://github.com/your-org/chamavault.git
cd chamavault

# Sakinisha vitegemezi
npm install

# Nakili vigezo vya mazingira
cp .env.example .env.local

# Endesha
npm run dev
```

Fungua [http://localhost:3000](http://localhost:3000).

### Bei

| Mpango | Bei (KES) | Vyama | Wanachama | Vipengele |
|--------|----------|-------|-----------|-----------|
| Bure | Bure | 1 | 5 | Ufuatiliaji wa msingi |
| Ndogo | 500/mwezi | 1 | 10 | Vipengele vyote |
| Kawaida | 1,000/mwezi | 3 | 30 | Taarifa za PDF, kumbukumbu |
| Kubwa | 2,000/mwezi | Bila kikomo | Bila kikomo | Kila kitu |

## License

MIT
