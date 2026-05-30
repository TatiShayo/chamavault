import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Landmark } from "lucide-react";
import { LangToggle } from "@/components/lang-toggle";

export function AppHeader() {
  return (
    <header className="border-b bg-white dark:bg-zinc-900 sticky top-0 z-40">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-3 sm:px-4 py-3 sm:py-4">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Landmark className="size-5 sm:size-6 text-amber-500" />
          <span className="text-lg sm:text-xl font-bold">ChamaVault</span>
        </Link>
        <div className="flex items-center gap-2">
          <LangToggle />
          <form action="/auth/logout" method="post">
            <Button variant="outline" size="sm" type="submit" className="text-xs sm:text-sm">
              Sign Out
            </Button>
          </form>
        </div>
      </div>
    </header>
  );
}
