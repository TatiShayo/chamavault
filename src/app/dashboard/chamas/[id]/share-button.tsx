"use client";

import { Share2, Check } from "lucide-react";
import { useState } from "react";

export function ShareChamaButton({ chamaId }: { chamaId: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const url = `${window.location.origin}/c/${chamaId}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium hover:bg-muted transition-colors"
    >
      {copied ? (
        <Check className="size-4 text-green-600" />
      ) : (
        <Share2 className="size-4" />
      )}
      {copied ? "Copied" : "Share"}
    </button>
  );
}
