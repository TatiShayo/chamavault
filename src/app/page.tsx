"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { useLang, t } from "@/lib/i18n";
import { LangToggle } from "@/components/lang-toggle";

const featureKeys = [
  "contributions",
  "loans",
  "meetings",
  "mpesa",
  "dividends",
  "whatsapp",
] as const;

const pricing = [
  { key: "small", price: "500" },
  { key: "standard", price: "1,000" },
  { key: "large", price: "2,000" },
];

export default function Home() {
  const { lang } = useLang();

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950">
      {/* Lang toggle absolute top-right */}
      <div className="mx-auto max-w-6xl px-3 sm:px-4 pt-4 flex justify-end">
        <LangToggle />
      </div>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-3 sm:px-4 py-12 sm:py-32 text-center">
        <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          {t(lang, "landing.hero")}
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-zinc-600 dark:text-zinc-400">
          {t(lang, "landing.subtitle")}
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            href="/auth/signup"
            className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/80"
          >
            {t(lang, "landing.cta")}
          </Link>
          <Link
            href="/auth/login"
            className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-background px-4 text-sm font-medium transition-all hover:bg-muted hover:text-foreground"
          >
            {t(lang, "landing.signin")}
          </Link>
        </div>
        <p className="mt-4 text-sm text-zinc-500">
          <a
            href="https://wa.me/?text=Try%20ChamaVault%20for%20chama%20management"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-zinc-700"
          >
            {t(lang, "landing.whatsapp")}
          </a>
          {" "}{t(lang, "landing.whatsappHint")}
        </p>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-3 sm:px-4 py-12 sm:py-16">
        <h2 className="mb-10 text-center text-3xl font-bold text-zinc-900 dark:text-zinc-50">
          {t(lang, "landing.featuresTitle")}
        </h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {featureKeys.map((fk) => (
            <Card key={fk}>
              <CardContent className="pt-6">
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                  {t(lang, `feature.${fk}`)}
                </h3>
                <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                  {t(lang, `feature.${fk}Desc`)}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="bg-zinc-50 py-12 sm:py-16 dark:bg-zinc-900">
        <div className="mx-auto max-w-6xl px-3 sm:px-4">
          <h2 className="mb-10 text-center text-3xl font-bold text-zinc-900 dark:text-zinc-50">
            {t(lang, "landing.pricingTitle")}
          </h2>
          <div className="grid gap-6 sm:grid-cols-3">
            {pricing.map((p) => (
              <Card key={p.key} className="text-center">
                <CardContent className="pt-6">
                  <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                    {t(lang, `landing.pricing${p.key.charAt(0).toUpperCase() + p.key.slice(1)}`)}
                  </h3>
                  <p className="text-sm text-zinc-500">
                    {p.key === "small" ? "Up to 10" : p.key === "standard" ? "Up to 30" : "30+"}{" "}
                    {t(lang, "landing.pricingMembers")}
                  </p>
                  <p className="mt-3 text-3xl font-bold text-zinc-900 dark:text-zinc-50">
                    KES {p.price}
                    <span className="text-base font-normal text-zinc-500">{t(lang, "landing.pricingMo")}</span>
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mx-auto max-w-6xl px-3 sm:px-4 py-6 sm:py-8 text-center text-sm text-zinc-500">
        {t(lang, "landing.footer")}
      </footer>
    </div>
  );
}
