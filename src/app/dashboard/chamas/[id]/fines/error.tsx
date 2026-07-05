"use client";

import { PageError } from "@/components/page-error";

export default function Error({ error }: { error: Error }) {
  return <PageError message={error.message} />;
}
