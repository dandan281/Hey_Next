import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { AvatarOrb } from "@/components/AvatarOrb";
import { LogoLockup, BrokenHeart } from "@/components/Logo";
import { addFromPublicProfile } from "./_actions";

type Props = { params: Promise<{ handle: string }> };

type ViewerState =
  | { kind: "anon" }
  | { kind: "self" }
  | { kind: "friend" }
  | { kind: "stranger" };

export default async function PublicProfilePage({ params }: Props) {
  const handle = (await params).handle.toLowerCase();

  // RLS only lets `authenticated` read profiles — visitors here may be
  // signed-out, so we go via admin client. We deliberately only select
  // non-sensitive columns; phone/email never come out of this query.
  const admin = createSupabaseAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select(
      "id, handle, display_name, bio, avatar_hue, gender, status, status_note",
    )
    .eq("handle", handle)
    .maybeSingle();

  if (!profile) notFound();

  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();

  let viewer: ViewerState = { kind: "anon" };
  if (auth.user) {
    if (auth.user.id === profile.id) {
      viewer = { kind: "self" };
    } else {
      const [a, b] =
        auth.user.id < profile.id
          ? [auth.user.id, profile.id]
          : [profile.id, auth.user.id];
      const { count } = await supabase
        .from("friendships")
        .select("id", { count: "exact", head: true })
        .eq("user_a", a)
        .eq("user_b", b);
      viewer = (count ?? 0) > 0 ? { kind: "friend" } : { kind: "stranger" };
    }
  }

  const isAvailable = profile.status === "available";

  const cardUser = {
    displayName: profile.display_name,
    avatarHue: profile.avatar_hue,
    status: profile.status as "available" | "unavailable",
  };

  const addAction = addFromPublicProfile.bind(null, profile.id);

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col px-4 py-6">
      <header className="flex items-center justify-between">
        <Link href="/" aria-label="Hey Next home">
          <LogoLockup size={26} text="Hey Next" />
        </Link>
        {viewer.kind === "anon" ? (
          <Link
            href="/login"
            className="rounded-full border border-border px-3 py-1 text-[10px] uppercase tracking-[0.15em] text-muted transition hover:border-accent hover:text-accent"
          >
            sign in
          </Link>
        ) : (
          <Link
            href="/app"
            className="rounded-full border border-border px-3 py-1 text-[10px] uppercase tracking-[0.15em] text-muted transition hover:border-accent hover:text-accent"
          >
            open app
          </Link>
        )}
      </header>

      <main className="mt-10 flex-1">
        <section
          className={`rounded-3xl p-8 ${isAvailable ? "card-available" : "card-glass"}`}
        >
          <div className="flex flex-col items-center gap-4 text-center">
            <AvatarOrb user={cardUser} size={96} glow={isAvailable} showStatus />
            <div>
              <div className="text-2xl font-bold tracking-tight">
                {profile.display_name}
              </div>
              <div className="mt-0.5 text-sm text-muted">@{profile.handle}</div>
            </div>
            {profile.bio && (
              <p className="text-sm text-foreground/80">{profile.bio}</p>
            )}
            <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-border bg-background/40 px-3 py-1 text-[10px] uppercase tracking-[0.2em]">
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{
                  backgroundColor: isAvailable
                    ? "var(--color-available)"
                    : "var(--color-unavailable)",
                }}
              />
              <span className={isAvailable ? "text-available" : "text-muted"}>
                {isAvailable ? "available now" : "quiet"}
              </span>
            </div>
            {isAvailable && profile.status_note && (
              <div className="text-sm italic text-muted">
                &ldquo;{profile.status_note}&rdquo;
              </div>
            )}
          </div>
        </section>

        <section className="mt-6">
          {viewer.kind === "anon" && (
            <div className="space-y-3">
              <Link
                href="/login"
                className="block w-full rounded-full bg-gradient-to-r from-accent to-accent-2 px-6 py-3 text-center text-sm font-semibold text-white transition hover:opacity-95"
              >
                sign in to add {profile.display_name}
              </Link>
              <p className="text-center text-xs text-muted">
                Hey Next keeps your number private until you decide it&apos;s
                time. <span className="block mt-1">no apps to install — just a phone number.</span>
              </p>
            </div>
          )}

          {viewer.kind === "self" && (
            <Link
              href="/app"
              className="block w-full rounded-full border border-border bg-card px-6 py-3 text-center text-sm font-medium text-muted transition hover:border-accent hover:text-foreground"
            >
              this is you — open your app
            </Link>
          )}

          {viewer.kind === "friend" && (
            <div className="rounded-2xl border border-accent/20 bg-accent/5 p-4 text-center text-sm">
              <div className="font-medium text-foreground">
                you&apos;re already friends
              </div>
              <Link
                href="/app/friends"
                className="mt-1 inline-block text-xs text-accent underline"
              >
                see in friend list →
              </Link>
            </div>
          )}

          {viewer.kind === "stranger" && (
            <form action={addAction}>
              <button
                type="submit"
                className="w-full rounded-full bg-gradient-to-r from-accent to-accent-2 px-6 py-3 text-sm font-semibold text-white transition hover:opacity-95"
              >
                + add {profile.display_name} to Hey Next
              </button>
              <p className="mt-2 text-center text-xs text-muted">
                their phone stays hidden until they flip to available.
              </p>
            </form>
          )}
        </section>

        <section className="mt-10 flex flex-col items-center gap-3 text-center">
          <BrokenHeart size={32} />
          <p className="max-w-xs text-xs uppercase tracking-[0.3em] text-muted">
            the next is the best
          </p>
        </section>
      </main>
    </div>
  );
}
