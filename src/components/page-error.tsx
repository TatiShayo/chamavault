"use client";

import { Button } from "@/components/ui/button";

export function PageError({ message }: { message?: string }) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <h2 className="text-xl font-semibold">Something went wrong</h2>
      <p className="text-muted-foreground max-w-md">
        {message || "An unexpected error occurred. Please try again."}
      </p>
      <Button onClick={() => window.location.reload()}>Try Again</Button>
    </div>
  );
}
