"use client";

import { useLang } from "@/lib/i18n";
import { Globe } from "lucide-react";

export function LangToggle() {
  const { lang, setLang } = useLang();

  return (
    <button
      onClick={() => setLang(lang === "en" ? "sw" : "en")}
      className="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium hover:bg-muted transition-colors"
      title={lang === "en" ? "Badilisha kwa Kiswahili" : "Switch to English"}
    >
      <Globe className="size-3.5" />
      <span className="hidden sm:inline">{lang === "en" ? "SW" : "EN"}</span>
    </button>
  );
}
