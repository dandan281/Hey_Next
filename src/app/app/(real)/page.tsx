import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/db";
import { StatusToggleReal } from "./_StatusToggleReal";

export default async function AppHomePage() {
  const supabase = await createSupabaseServerClient();
  const profile = await getCurrentProfile(supabase);

  if (!profile) {
    redirect("/app/onboarding");
  }

  // Friends — passed to the toggle for the selective-reveal picker
  const { data: friendships } = await supabase
    .from("friendships")
    .select("user_a, user_b");
  const friendIds = (friendships ?? [])
    .map((f) => (f.user_a === profile.id ? f.user_b : f.user_a))
    .filter((id) => id !== profile.id);

  type FriendOption = {
    id: string;
    displayName: string;
    avatarHue: number;
    status: "available" | "unavailable";
  };
  let friends: FriendOption[] = [];
  if (friendIds.length > 0) {
    const { data: friendProfiles } = await supabase
      .from("profiles")
      .select("id, display_name, avatar_hue, status")
      .in("id", friendIds);
    friends = (friendProfiles ?? []).map((p) => ({
      id: p.id,
      displayName: p.display_name,
      avatarHue: p.avatar_hue,
      status: p.status,
    }));
  }

  return (
    <div className="space-y-5 px-4 py-6">
      <Link
        href="/app/settings"
        className="block rounded-3xl card-glass p-5 transition hover:bg-card-hover"
      >
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
          <span className="text-[10px] uppercase tracking-[0.2em] text-muted">
            edit
          </span>
        </div>
      </Link>

      <StatusToggleReal
        status={profile.status}
        statusNote={profile.statusNote}
        friends={friends}
      />

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
