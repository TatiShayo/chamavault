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
