import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/db";

export default async function AppHomePage() {
  const supabase = await createSupabaseServerClient();
  const profile = await getCurrentProfile(supabase);

  if (!profile) {
    redirect("/app/onboarding");
  }

  const isAvailable = profile.status === "available";

  return (
    <div className="space-y-5 px-4 py-6">
      <section className="card-glass rounded-3xl p-5">
        <div className="flex items-center gap-4">
          <div
            className="flex h-16 w-16 items-center justify-center rounded-full text-xl font-semibold text-white shadow-lg"
            style={{
              background: `linear-gradient(135deg, hsl(${profile.avatarHue} 80% 55%), hsl(${(profile.avatarHue + 50) % 360} 80% 45%))`,
            }}
          >
            {profile.displayName
              .split(" ")
              .map((s) => s[0])
              .join("")
              .slice(0, 2)
              .toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-xl font-semibold tracking-tight">
              {profile.displayName}
            </div>
            <div className="truncate text-sm text-muted">
              @{profile.handle}
            </div>
          </div>
        </div>
      </section>

      <section className="card-glass rounded-3xl p-6">
        <div className="text-[10px] uppercase tracking-[0.3em] text-muted">
          your status
        </div>
        <div className="mt-2 text-3xl font-bold tracking-tight">
          {isAvailable ? (
            <span className="gradient-text">available</span>
          ) : (
            <span className="text-foreground/90">unavailable</span>
          )}
        </div>
        <div className="mt-3 rounded-xl border border-accent-2/30 bg-accent-2/5 p-3 text-xs text-muted">
          <span className="text-foreground">phase 1 ✓ </span>
          you&apos;re signed in and your profile is saved in the real DB.
          friends list, status toggle, QR add, and real-time reveals land in
          phases 2–4.
        </div>
      </section>

      <section className="card-glass rounded-3xl p-6">
        <div className="text-[10px] uppercase tracking-[0.3em] text-muted">
          your private info
        </div>
        <div className="mt-3 space-y-2 font-mono text-sm">
          <div className="flex items-baseline gap-3">
            <span className="w-12 text-[10px] uppercase tracking-wider text-muted">
              phone
            </span>
            <span className="text-foreground">{profile.phone}</span>
          </div>
          {profile.email && (
            <div className="flex items-baseline gap-3">
              <span className="w-12 text-[10px] uppercase tracking-wider text-muted">
                email
              </span>
              <span className="text-foreground">{profile.email}</span>
            </div>
          )}
        </div>
        <div className="mt-3 text-xs text-muted">
          stored in Postgres; protected by Row-Level Security. friends only see
          these when you flip to available.
        </div>
      </section>
    </div>
  );
}
