"use client";

import { Share2, Check, Link2 } from "lucide-react";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function ShareChamaButton({ chamaId }: { chamaId: string }) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = (url: string, label: string) => {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const publicUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/c/${chamaId}`;
  const portalUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/portal/${chamaId}`;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium hover:bg-muted transition-colors">
        {copied ? (
          <Check className="size-4 text-green-600" />
        ) : (
          <Share2 className="size-4" />
        )}
        {copied ? "Copied" : "Share"}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => copyToClipboard(publicUrl, "public")}>
          <Share2 className="size-4" />
          Copy Public Page Link
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => copyToClipboard(portalUrl, "portal")}>
          <Link2 className="size-4" />
          Copy Member Portal Link
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
