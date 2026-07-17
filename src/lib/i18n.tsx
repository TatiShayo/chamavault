"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "en" | "sw";

type TranslationValue = string | ((...args: string[]) => string);

const translations: Record<Lang, Record<string, TranslationValue>> = {
  en: {
    // Landing
    "landing.hero": "Simamia Chama Yako Vizuri",
    "landing.subtitle":
      "Manage your chama with clarity and confidence. Track contributions, loans, meetings, and dividends — all in one place.",
    "landing.cta": "Start Free Trial",
    "landing.signin": "Sign In",
    "landing.whatsapp": "Share on WhatsApp",
    "landing.whatsappHint": "to invite your members",
    "landing.featuresTitle": "Everything your chama needs",
    "landing.pricingTitle": "Simple Pricing",
    "landing.pricingSmall": "Small",
    "landing.pricingStandard": "Standard",
    "landing.pricingLarge": "Large",
    "landing.pricingMembers": "members",
    "landing.pricingMo": "/mo",
    "landing.footer": "ChamaVault — Your chama. Organized. Transparent. Growing.",

    // Features
    "feature.contributions": "Contribution Tracking",
    "feature.contributionsDesc":
      "Track every member's contribution. See who's paid, pending, or overdue at a glance.",
    "feature.loans": "Loan Management",
    "feature.loansDesc":
      "Process loan applications, track repayments, and calculate interest automatically.",
    "feature.meetings": "Meeting Minutes",
    "feature.meetingsDesc":
      "Schedule meetings, record attendance, take minutes, and export PDFs.",
    "feature.mpesa": "M-Pesa Friendly",
    "feature.mpesaDesc":
      "Record M-Pesa payments and reconcile with your chama's records.",
    "feature.dividends": "Dividend Calculator",
    "feature.dividendsDesc":
      "Calculate member dividends based on contributions at year-end.",
    "feature.whatsapp": "WhatsApp Reminders",
    "feature.whatsappDesc":
      "Generate WhatsApp links with payment and meeting reminders for members.",

    // Auth
    "auth.loginTitle": "Sign in to manage your chama",
    "auth.loginJoin": (name: string) => `Sign in to join ${name}`,
    "auth.signupTitle": "Create your account",
    "auth.signupJoin": (name: string) => `Create your account to join ${name}`,
    "auth.email": "Email",
    "auth.password": "Password",
    "auth.confirmPassword": "Confirm Password",
    "auth.fullName": "Full Name",
    "auth.signingIn": "Signing in...",
    "auth.signIn": "Sign In",
    "auth.creatingAccount": "Creating account...",
    "auth.createAccount": "Create Account",
    "auth.noAccount": "Don't have an account?",
    "auth.hasAccount": "Already have an account?",
    "auth.signUp": "Sign up",

    // Dashboard
    "dashboard.welcome": "Welcome,",
    "dashboard.createChama": "Create Chama",
    "dashboard.noChama": "You haven't joined a chama yet. Create one or ask your chairperson for an invite.",
    "dashboard.back": "Back to Dashboard",
    "dashboard.members": "members",
    "dashboard.treasury": "Treasury Balance",
    "dashboard.contributions": "Contributions",
    "dashboard.expenses": "Expenses",
    "dashboard.activeLoans": "Active Loans",
    "dashboard.repaid": "Repaid",
    "dashboard.signOut": "Sign Out",
    "dashboard.contributionsTab": "Contributions",
    "dashboard.finesTab": "Fines",
    "dashboard.loansTab": "Loans",
    "dashboard.meetingsTab": "Meetings",
    "dashboard.votesTab": "Votes",
    "dashboard.inviteTab": "Invite",
    "dashboard.edit": "Edit",
    "dashboard.founded": "Founded",

    // Chama creation
    "create.title": "Create a New Chama",
    "create.name": "Chama Name",
    "create.objective": "Objective (optional)",
    "create.contribution": "Contribution Amount (KES)",
    "create.frequency": "Frequency",
    "create.meetingDay": "Meeting Day",
    "create.bank": "Bank Account (optional)",
    "create.mpesa": "M-Pesa Number (optional)",
    "create.submit": "Create Chama",
    "create.creating": "Creating...",

    // Pricing page
    "pricing.heading": "Choose Your Plan",
    "pricing.subtitle": "Start free. Upgrade as your chama grows.",
    "pricing.free": "Free",
    "pricing.freeMembers": "Up to 5",
    "pricing.freeFeatures.1": "Basic contribution tracking",
    "pricing.freeFeatures.2": "1 chama",
    "pricing.freeFeatures.3": "Member management",
    "pricing.small": "Small",
    "pricing.smallMembers": "Up to 10",
    "pricing.smallFeatures.1": "Everything in Free",
    "pricing.smallFeatures.2": "Loan management",
    "pricing.smallFeatures.3": "Meeting minutes & attendance",
    "pricing.smallFeatures.4": "Fines & expenses",
    "pricing.smallFeatures.5": "WhatsApp & email reminders",
    "pricing.standard": "Standard",
    "pricing.standardMembers": "Up to 30",
    "pricing.standardFeatures.1": "Everything in Small",
    "pricing.standardFeatures.2": "3 chamas",
    "pricing.standardFeatures.3": "PDF statements & minutes",
    "pricing.standardFeatures.4": "Annual report generation",
    "pricing.standardFeatures.5": "Dividend calculator",
    "pricing.standardFeatures.6": "Investment tracker",
    "pricing.large": "Large",
    "pricing.largeMembers": "Unlimited",
    "pricing.largeFeatures.1": "Everything in Standard",
    "pricing.largeFeatures.2": "Unlimited members & chamas",
    "pricing.largeFeatures.3": "SMS reminders (Africa's Talking)",
    "pricing.largeFeatures.4": "Priority support",
    "pricing.largeFeatures.5": "AI meeting minutes assistant",
    "pricing.largeFeatures.6": "Data export & backup",
    "pricing.perMonth": "/month",
    "pricing.cta": "Start Free Trial",
    "pricing.guarantee": "No credit card required. Cancel anytime.",
  },

  sw: {
    // Landing
    "landing.hero": "Simamia Chama Yako Vizuri",
    "landing.subtitle":
      "Simamia chama yako kwa uwazi na ujasiri. Fuatilia michango, mikopo, mikutano, na gawio — yote mahali pamoja.",
    "landing.cta": "Anza Bure",
    "landing.signin": "Ingia",
    "landing.whatsapp": "Shiriki kwa WhatsApp",
    "landing.whatsappHint": "kuwaalika wanachama wako",
    "landing.featuresTitle": "Kila kitu chama chako kinahitaji",
    "landing.pricingTitle": "Bei Rahisi",
    "landing.pricingSmall": "Ndogo",
    "landing.pricingStandard": "Kati",
    "landing.pricingLarge": "Kubwa",
    "landing.pricingMembers": "wanachama",
    "landing.pricingMo": "/mwezi",
    "landing.footer": "ChamaVault — Chama chako. Kimepangwa. Kina uwazi. Kinakua.",

    // Features
    "feature.contributions": "Ufuatiliaji wa Michango",
    "feature.contributionsDesc":
      "Fuatilia mchango wa kila mwanachama. Ona nani amelipa, anasubiri, au amechelewa kwa haraka.",
    "feature.loans": "Usimamizi wa Mikopo",
    "feature.loansDesc":
      "Shughulikia maombi ya mikopo, fuatilia marejesho, na hesabu riba kiotomatiki.",
    "feature.meetings": "Kumbukumbu za Mikutano",
    "feature.meetingsDesc":
      "Panga mikutano, rekodi mahudhurio, andika kumbukumbu, na toa PDF.",
    "feature.mpesa": "Inafaa kwa M-Pesa",
    "feature.mpesaDesc":
      "Rekodi malipo ya M-Pesa na ulinganishe na rekodi za chama chako.",
    "feature.dividends": "Kikokotoo cha Gawio",
    "feature.dividendsDesc":
      "Hesabu gawio la wanachama kulingana na michango mwishoni mwa mwaka.",
    "feature.whatsapp": "Vikumbusho vya WhatsApp",
    "feature.whatsappDesc":
      "Tengeneza viungo vya WhatsApp na vikumbusho vya malipo na mikutano kwa wanachama.",

    // Auth
    "auth.loginTitle": "Ingia kusimamia chama chako",
    "auth.loginJoin": (name: string) => `Ingia kujiunga na ${name}`,
    "auth.signupTitle": "Fungua akaunti yako",
    "auth.signupJoin": (name: string) => `Fungua akaunti kujiunga na ${name}`,
    "auth.email": "Barua Pepe",
    "auth.password": "Nenosiri",
    "auth.confirmPassword": "Thibitisha Nenosiri",
    "auth.fullName": "Jina Kamili",
    "auth.signingIn": "Inaingia...",
    "auth.signIn": "Ingia",
    "auth.creatingAccount": "Inafungua akaunti...",
    "auth.createAccount": "Fungua Akaunti",
    "auth.noAccount": "Huna akaunti?",
    "auth.hasAccount": "Tayari una akaunti?",
    "auth.signUp": "Jisajili",

    // Dashboard
    "dashboard.welcome": "Karibu,",
    "dashboard.createChama": "Anzisha Chama",
    "dashboard.noChama": "Bado haujajiunga na chama. Anzisha chama au muulize mwenyekiti wako mwaliko.",
    "dashboard.back": "Rudi kwenye Dashibodi",
    "dashboard.members": "wanachama",
    "dashboard.treasury": "Salio la Hazina",
    "dashboard.contributions": "Michango",
    "dashboard.expenses": "Matumizi",
    "dashboard.activeLoans": "Mikopo Inayoendelea",
    "dashboard.repaid": "Imelipwa",
    "dashboard.signOut": "Ondoka",
    "dashboard.contributionsTab": "Michango",
    "dashboard.finesTab": "Faini",
    "dashboard.loansTab": "Mikopo",
    "dashboard.meetingsTab": "Mikutano",
    "dashboard.votesTab": "Kura",
    "dashboard.inviteTab": "Alika",
    "dashboard.edit": "Hariri",
    "dashboard.founded": "Ilianzishwa",

    // Chama creation
    "create.title": "Anzisha Chama Kipya",
    "create.name": "Jina la Chama",
    "create.objective": "Lengo (si lazima)",
    "create.contribution": "Kiasi cha Mchango (KES)",
    "create.frequency": "Marudio",
    "create.meetingDay": "Siku ya Mkutano",
    "create.bank": "Akaunti ya Benki (si lazima)",
    "create.mpesa": "Nambari ya M-Pesa (si lazima)",
    "create.submit": "Anzisha Chama",
    "create.creating": "Inaanzisha...",

    // Pricing page
    "pricing.heading": "Chagua Mpango Wako",
    "pricing.subtitle": "Anza bure. Boresha kadri chama chako kinavyokua.",
    "pricing.free": "Bure",
    "pricing.freeMembers": "Hadi 5",
    "pricing.freeFeatures.1": "Ufuatiliaji msingi wa michango",
    "pricing.freeFeatures.2": "Chama 1",
    "pricing.freeFeatures.3": "Usimamizi wa wanachama",
    "pricing.small": "Ndogo",
    "pricing.smallMembers": "Hadi 10",
    "pricing.smallFeatures.1": "Kila kitu katika Bure",
    "pricing.smallFeatures.2": "Usimamizi wa mikopo",
    "pricing.smallFeatures.3": "Kumbukumbu na mahudhurio ya mikutano",
    "pricing.smallFeatures.4": "Faini na matumizi",
    "pricing.smallFeatures.5": "Vikumbusho vya WhatsApp na barua pepe",
    "pricing.standard": "Kawaida",
    "pricing.standardMembers": "Hadi 30",
    "pricing.standardFeatures.1": "Kila kitu katika Ndogo",
    "pricing.standardFeatures.2": "Vyama 3",
    "pricing.standardFeatures.3": "Taarifa za PDF na kumbukumbu",
    "pricing.standardFeatures.4": "Uzalishaji wa ripoti ya mwaka",
    "pricing.standardFeatures.5": "Kikokotoo cha gawio",
    "pricing.standardFeatures.6": "Kifuatiliaji cha uwekezaji",
    "pricing.large": "Kubwa",
    "pricing.largeMembers": "Bila kikomo",
    "pricing.largeFeatures.1": "Kila kitu katika Kawaida",
    "pricing.largeFeatures.2": "Wanachama na vyama bila kikomo",
    "pricing.largeFeatures.3": "Vikumbusho vya SMS (Africa's Talking)",
    "pricing.largeFeatures.4": "Msaada wa kipaumbele",
    "pricing.largeFeatures.5": "Msaidizi wa AI wa kumbukumbu za mikutano",
    "pricing.largeFeatures.6": "Uhamishaji na hifadhi ya data",
    "pricing.perMonth": "/mwezi",
    "pricing.cta": "Anza Bure",
    "pricing.guarantee": "Hakuna kadi ya mkopo inahitajika. Ghairi wakati wowote.",
  },
};

export function t(lang: Lang, key: string, ...args: string[]): string {
  const val = translations[lang]?.[key] ?? translations.en[key] ?? key;
  if (typeof val === "function") {
    return (val as (...a: string[]) => string)(...args);
  }
  return val;
}

interface LanguageContextType {
  lang: Lang;
  setLang: (lang: Lang) => void;
}

const LanguageContext = createContext<LanguageContextType>({
  lang: "en",
  setLang: () => {},
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    const stored = localStorage.getItem("chamavault-lang") as Lang | null;
    if (stored === "en" || stored === "sw") {
      // Client-only hydration of persisted language; cannot run during SSR.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLangState(stored);
    }
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    localStorage.setItem("chamavault-lang", l);
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLang() {
  return useContext(LanguageContext);
}
