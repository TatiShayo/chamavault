"use client";

import Link from "next/link";
import { useLang, t } from "@/lib/i18n";
import { LangToggle } from "@/components/lang-toggle";
import { Check, ArrowLeft } from "lucide-react";

interface Plan {
  key: string;
  price: string;
  features: string[];
  popular?: boolean;
}

export default function PricingPage() {
  const { lang } = useLang();

  const plans: Plan[] = [
    {
      key: "free",
      price: "0",
      features: [
        t(lang, "pricing.freeFeatures.1"),
        t(lang, "pricing.freeFeatures.2"),
        t(lang, "pricing.freeFeatures.3"),
      ],
    },
    {
      key: "small",
      price: "500",
      features: [
        t(lang, "pricing.smallFeatures.1"),
        t(lang, "pricing.smallFeatures.2"),
        t(lang, "pricing.smallFeatures.3"),
        t(lang, "pricing.smallFeatures.4"),
        t(lang, "pricing.smallFeatures.5"),
      ],
    },
    {
      key: "standard",
      price: "1,000",
      popular: true,
      features: [
        t(lang, "pricing.standardFeatures.1"),
        t(lang, "pricing.standardFeatures.2"),
        t(lang, "pricing.standardFeatures.3"),
        t(lang, "pricing.standardFeatures.4"),
        t(lang, "pricing.standardFeatures.5"),
        t(lang, "pricing.standardFeatures.6"),
      ],
    },
    {
      key: "large",
      price: "2,000",
      features: [
        t(lang, "pricing.largeFeatures.1"),
        t(lang, "pricing.largeFeatures.2"),
        t(lang, "pricing.largeFeatures.3"),
        t(lang, "pricing.largeFeatures.4"),
        t(lang, "pricing.largeFeatures.5"),
        t(lang, "pricing.largeFeatures.6"),
      ],
    },
  ];

  const membersLabel = (key: string) => {
    switch (key) {
      case "free":
        return t(lang, "pricing.freeMembers");
      case "small":
        return t(lang, "pricing.smallMembers");
      case "standard":
        return t(lang, "pricing.standardMembers");
      case "large":
        return t(lang, "pricing.largeMembers");
      default:
        return "";
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950">
      <header className="mx-auto max-w-6xl px-3 sm:px-4 pt-4 flex justify-between items-center">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back
        </Link>
        <LangToggle />
      </header>

      <main className="mx-auto max-w-6xl px-3 sm:px-4 py-12 sm:py-20">
        <div className="text-center mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold text-zinc-900 dark:text-zinc-50">
            {t(lang, "pricing.heading")}
          </h1>
          <p className="mt-3 text-lg text-zinc-600 dark:text-zinc-400">
            {t(lang, "pricing.subtitle")}
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {plans.map((plan) => (
            <div
              key={plan.key}
              className={`relative rounded-xl border bg-white dark:bg-zinc-900 p-6 flex flex-col ${
                plan.popular
                  ? "border-amber-500 shadow-lg shadow-amber-100 dark:shadow-amber-900/20"
                  : "border-zinc-200 dark:border-zinc-800"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-amber-500 px-3 py-0.5 text-xs font-semibold text-white">
                  Popular
                </div>
              )}
              <div className="text-center">
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                  {t(lang, `pricing.${plan.key}`)}
                </h3>
                <p className="text-sm text-zinc-500 mt-1">{membersLabel(plan.key)}</p>
              </div>
              <div className="mt-4 text-center">
                <span className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
                  {plan.price === "0" ? (
                    "Free"
                  ) : (
                    <>
                      KES {plan.price}
                      <span className="text-base font-normal text-zinc-500">
                        {t(lang, "pricing.perMonth")}
                      </span>
                    </>
                  )}
                </span>
              </div>
              <ul className="mt-6 space-y-3 flex-1">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                    <Check className="size-4 mt-0.5 shrink-0 text-emerald-500" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="/auth/signup"
                className={`mt-6 inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                  plan.popular
                    ? "bg-amber-500 text-white hover:bg-amber-600"
                    : "border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-50 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                }`}
              >
                {t(lang, "pricing.cta")}
              </Link>
            </div>
          ))}
        </div>

        <p className="mt-8 text-center text-sm text-zinc-500">
          {t(lang, "pricing.guarantee")}
        </p>
      </main>
    </div>
  );
}
