"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";
import { Landmark, ChevronDown, Building2 } from "lucide-react";
import { LangToggle } from "@/components/lang-toggle";
import { usePathname } from "next/navigation";

interface ChamaInfo {
  id: string;
  name: string;
  role: string;
}

export function AppHeaderClient({
  chamas,
}: {
  chamas: ChamaInfo[];
}) {
  const pathname = usePathname();
  const currentChamaId = pathname.match(/\/dashboard\/chamas\/([^/]+)/)?.[1] || null;
  const currentChama = chamas.find((c) => c.id === currentChamaId);

  return (
    <header className="border-b bg-white dark:bg-zinc-900 sticky top-0 z-40">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-3 sm:px-4 py-3 sm:py-4">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="flex items-center gap-2">
            <Landmark className="size-5 sm:size-6 text-amber-500" />
            <span className="text-lg sm:text-xl font-bold">ChamaVault</span>
          </Link>

          {chamas.length > 1 && (
            <DropdownMenu>
              <DropdownMenuTrigger className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-border bg-background text-xs font-medium h-7 px-2.5 hover:bg-muted transition-colors outline-none">
                <Building2 className="size-3.5" />
                <span className="hidden sm:inline max-w-[120px] truncate">
                  {currentChama ? currentChama.name : "Switch Chama"}
                </span>
                <ChevronDown className="size-3" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuLabel>Your Chamas</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {chamas.map((c) => (
                  <DropdownMenuItem key={c.id}>
                    <Link
                      href={`/dashboard/chamas/${c.id}`}
                      className="flex w-full items-center justify-between"
                    >
                      <span className="truncate">{c.name}</span>
                      <span className="ml-2 shrink-0 text-xs text-muted-foreground capitalize">
                        {c.role}
                      </span>
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        <div className="flex items-center gap-2">
          <LangToggle />
          <form action="/auth/logout" method="post">
            <button
              type="submit"
              className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-border bg-background text-xs sm:text-sm font-medium h-7 sm:h-8 px-2 sm:px-2.5 hover:bg-muted transition-colors"
            >
              Sign Out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
