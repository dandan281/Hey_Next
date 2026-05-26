import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getFriendsWithContacts, type ProfileWithContact } from "@/lib/db";
import { AvatarOrb } from "@/components/AvatarOrb";

export default async function FriendsPage() {
  const supabase = await createSupabaseServerClient();
  const friends = await getFriendsWithContacts(supabase);

  // Available first, then by display name
  const sorted = [...friends].sort((a, b) => {
    if (a.status !== b.status) return a.status === "available" ? -1 : 1;
    return a.displayName.localeCompare(b.displayName);
  });

  return (
    <div className="space-y-4 px-4 py-6">
      <header>
        <h1 className="text-2xl font-bold">friends</h1>
        <p className="text-sm text-muted">
          everyone you&apos;ve traded Hey Next with. their contact info is
          hidden until they flip to{" "}
          <span className="text-available">available</span>.
        </p>
      </header>

      {sorted.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center">
          <div className="text-sm text-muted">
            no friends yet. give someone your Hey Next.
          </div>
          <Link
            href="/app/add"
            className="mt-4 inline-block rounded-full bg-gradient-to-r from-accent to-accent-2 px-5 py-2 text-sm font-medium text-white"
          >
            + add friend
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map((f) => (
            <FriendRow key={f.id} friend={f} />
          ))}
        </div>
      )}
    </div>
  );
}

function FriendRow({ friend }: { friend: ProfileWithContact }) {
  const isAvailable = friend.status === "available";

  return (
    <div
      className={`rounded-2xl p-4 transition ${
        isAvailable ? "card-available" : "card-glass hover:bg-card-hover"
      }`}
    >
      <div className="flex items-start gap-3">
        <AvatarOrb user={friend} size={52} showStatus glow={isAvailable} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="truncate font-semibold tracking-tight">
                {friend.displayName}
              </div>
              <div className="truncate text-xs text-muted">
                @{friend.handle}
              </div>
            </div>
            {isAvailable ? (
              <span className="rounded-full bg-accent/15 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.15em] text-accent">
                available
              </span>
            ) : (
              <span className="rounded-full border border-border bg-background/40 px-2.5 py-1 text-[10px] uppercase tracking-[0.15em] text-muted">
                quiet
              </span>
            )}
          </div>
          {friend.statusNote && (
            <div className="mt-1.5 truncate text-xs italic text-muted">
              &ldquo;{friend.statusNote}&rdquo;
            </div>
          )}
          {isAvailable && friend.phone ? (
            <div className="mt-3 space-y-1.5 rounded-xl border border-accent/20 bg-background/40 p-3 font-mono text-xs">
              <a
                href={`tel:${friend.phone}`}
                className="flex items-center justify-between gap-2 text-foreground transition hover:text-accent"
              >
                <span className="text-[10px] uppercase tracking-wider text-muted">
                  phone
                </span>
                <span>{friend.phone}</span>
              </a>
              {friend.email && (
                <a
                  href={`mailto:${friend.email}`}
                  className="flex items-center justify-between gap-2 text-foreground transition hover:text-accent"
                >
                  <span className="text-[10px] uppercase tracking-wider text-muted">
                    email
                  </span>
                  <span className="truncate">{friend.email}</span>
                </a>
              )}
            </div>
          ) : (
            <div className="mt-3 flex items-center gap-2 rounded-xl border border-border bg-background/30 px-3 py-2.5 font-mono text-xs text-muted">
              <LockGlyph />
              <span className="tracking-widest">••• ••• ••••</span>
              <span className="ml-auto text-[10px] uppercase tracking-wider">
                locked
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function LockGlyph() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}
