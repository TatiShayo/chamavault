import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";

const features = [
  {
    title: "Contribution Tracking",
    description: "Track every member's contribution. See who's paid, pending, or overdue at a glance.",
  },
  {
    title: "Loan Management",
    description: "Process loan applications, track repayments, and calculate interest automatically.",
  },
  {
    title: "Meeting Minutes",
    description: "Schedule meetings, record attendance, take minutes, and export PDFs.",
  },
  {
    title: "M-Pesa Friendly",
    description: "Record M-Pesa payments and reconcile with your chama's records.",
  },
  {
    title: "Dividend Calculator",
    description: "Calculate member dividends based on contributions at year-end.",
  },
  {
    title: "WhatsApp Reminders",
    description: "Generate WhatsApp links with payment and meeting reminders for members.",
  },
];

const pricing = [
  { name: "Small", members: "Up to 10", price: "500" },
  { name: "Standard", members: "Up to 30", price: "1,000" },
  { name: "Large", members: "30+", price: "2,000" },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950">
      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 py-20 text-center sm:py-32">
        <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-5xl">
          Simamia Chama Yako Vizuri
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-zinc-600 dark:text-zinc-400">
          Manage your chama with clarity and confidence. Track contributions, loans, meetings, and dividends — all in one place.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            href="/auth/signup"
            className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/80"
          >
            Start Free Trial
          </Link>
          <Link
            href="/auth/login"
            className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-background px-4 text-sm font-medium transition-all hover:bg-muted hover:text-foreground"
          >
            Sign In
          </Link>
        </div>
        <p className="mt-4 text-sm text-zinc-500">
          <a
            href="https://wa.me/?text=Try%20ChamaVault%20for%20chama%20management"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-zinc-700"
          >
            Share on WhatsApp
          </a>
          {" "}to invite your members
        </p>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="mb-10 text-center text-3xl font-bold text-zinc-900 dark:text-zinc-50">
          Everything your chama needs
        </h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <Card key={f.title}>
              <CardContent className="pt-6">
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                  {f.title}
                </h3>
                <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                  {f.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="bg-zinc-50 py-16 dark:bg-zinc-900">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="mb-10 text-center text-3xl font-bold text-zinc-900 dark:text-zinc-50">
            Simple Pricing
          </h2>
          <div className="grid gap-6 sm:grid-cols-3">
            {pricing.map((p) => (
              <Card key={p.name} className="text-center">
                <CardContent className="pt-6">
                  <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                    {p.name}
                  </h3>
                  <p className="text-sm text-zinc-500">{p.members} members</p>
                  <p className="mt-3 text-3xl font-bold text-zinc-900 dark:text-zinc-50">
                    KES {p.price}
                    <span className="text-base font-normal text-zinc-500">/mo</span>
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mx-auto max-w-6xl px-4 py-8 text-center text-sm text-zinc-500">
        ChamaVault &mdash; Your chama. Organized. Transparent. Growing.
      </footer>
    </div>
  );
}
