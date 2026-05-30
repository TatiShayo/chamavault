import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { RootClient } from "./root-client";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://chamavault.com"),
  title: "ChamaVault — Simamia Chama Yako Vizuri",
  description:
    "ChamaVault digitizes Kenya's chama (group savings) management. Track contributions, loans, dividends, meetings, and M-Pesa payments — all in one place. Built for East Africa.",
  keywords: [
    "chama",
    "group savings",
    "Kenya",
    "M-Pesa",
    "investment group",
    "chama management",
    "East Africa",
    "savings group",
    "dividend tracker",
    "loan management",
  ],
  authors: [{ name: "ChamaVault" }],
  creator: "ChamaVault",
  publisher: "ChamaVault",
  openGraph: {
    type: "website",
    locale: "en_KE",
    siteName: "ChamaVault",
    title: "ChamaVault — Simamia Chama Yako Vizuri",
    description:
      "Digitize your chama. Track contributions, loans, meetings, and M-Pesa payments. Built for Kenya and East Africa.",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "ChamaVault" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "ChamaVault — Simamia Chama Yako Vizuri",
    description:
      "Digitize your chama. Track contributions, loans, meetings, and M-Pesa payments. Built for Kenya and East Africa.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:rounded focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
        >
          Skip to main content
        </a>
        <RootClient>{children}</RootClient>
      </body>
    </html>
  );
}
