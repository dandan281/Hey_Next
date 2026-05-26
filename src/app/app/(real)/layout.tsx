import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { LogoLockup } from "@/components/Logo";
import { signOut } from "@/app/login/actions";
import { getUnseenInboundReveals } from "@/lib/db";
import { BottomNav } from "./_BottomNav";
import { RealRevealClient } from "./_RealRevealClient";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    redirect("/login");
  }

  const initialReveals = await getUnseenInboundReveals(supabase);

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col">
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-background/80 px-4 py-3 backdrop-blur-md">
        <Link href="/app" aria-label="Hey Next home">
          <LogoLockup size={26} text="Hey Next" />
        </Link>
        <form action={signOut}>
          <button
            type="submit"
            className="rounded-full border border-border px-3 py-1 text-[10px] uppercase tracking-[0.15em] text-muted transition hover:border-accent hover:text-accent"
          >
            sign out
          </button>
        </form>
      </header>

      <main className="flex-1 pb-20">{children}</main>

      <BottomNav />

      <RealRevealClient
        currentUserId={auth.user.id}
        initialReveals={initialReveals}
      />
    </div>
  );
}
