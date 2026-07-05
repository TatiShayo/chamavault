import { createClient } from "@/lib/supabase/server";
import { AppHeaderClient } from "./app-header-client";

export async function AppHeader() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <header className="border-b bg-white dark:bg-zinc-900 sticky top-0 z-40">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-3 sm:px-4 py-3 sm:py-4">
          <span className="text-lg sm:text-xl font-bold">ChamaVault</span>
        </div>
      </header>
    );
  }

  const { data: memberships } = await supabase
    .from("chama_members")
    .select("chama_id, role, chamas:chama_id(name)")
    .eq("user_id", user.id);

  const chamas = (memberships || []).map((m: Record<string, unknown>) => {
    const chama = m.chamas as { name: string } | { name: string }[] | null;
    const name =
      chama && !Array.isArray(chama) && (chama as { name: string }).name
        ? (chama as { name: string }).name
        : "";
    return {
      id: m.chama_id as string,
      name,
      role: m.role as string,
    };
  });

  return <AppHeaderClient chamas={chamas} />;
}
