"use client";

import Link from "next/link";
import { AvatarOrb } from "@/components/AvatarOrb";
import { StatusToggle } from "@/components/StatusToggle";
import { useActiveUser } from "@/lib/useStore";
import { getFriends } from "@/lib/store";

export default function AppHomePage() {
  const { store, activeUser } = useActiveUser();
  if (!activeUser || !store) return null;
  const friends = getFriends(store, activeUser.id);
  const availableCount = friends.filter((f) => f.status === "available").length;
  const isAvailable = activeUser.status === "available";

  return (
    <div className="space-y-5 px-4 py-6">
      <section className="card-glass flex items-center gap-4 rounded-3xl p-5">
        <AvatarOrb user={activeUser} size={64} showStatus glow={isAvailable} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-xl font-semibold tracking-tight">
            {activeUser.displayName}
          </div>
          <div className="truncate text-sm text-muted">@{activeUser.handle}</div>
        </div>
      </section>

      <StatusToggle user={activeUser} />

      <section className="card-glass rounded-3xl p-6">
        <div className="flex items-center justify-between">
          <div className="text-[10px] uppercase tracking-[0.3em] text-muted">
            your private info
          </div>
          <span
            className={`rounded-full px-2.5 py-1 text-[10px] uppercase tracking-[0.15em] ${
              isAvailable
                ? "bg-accent/15 text-accent"
                : "border border-border bg-background/40 text-muted"
            }`}
          >
            {isAvailable ? "shared" : "hidden"}
          </span>
        </div>
        <div className="mt-4 space-y-2.5 font-mono text-sm">
          <div className="flex items-baseline gap-3">
            <span className="w-12 text-[10px] uppercase tracking-wider text-muted">
              phone
            </span>
            <span className={isAvailable ? "text-foreground" : "text-muted"}>
              {activeUser.phone}
            </span>
          </div>
          <div className="flex items-baseline gap-3">
            <span className="w-12 text-[10px] uppercase tracking-wider text-muted">
              email
            </span>
            <span className={isAvailable ? "text-foreground" : "text-muted"}>
              {activeUser.email}
            </span>
          </div>
        </div>
        <div className="mt-4 text-xs text-muted">
          {isAvailable
            ? "friends can see these right now."
            : "shown to friends only when you flip available."}
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3">
        <Link
          href="/app/demo/friends"
          className="card-glass rounded-2xl p-4 transition hover:bg-card-hover"
        >
          <div className="text-3xl font-bold tracking-tight">
            {friends.length}
          </div>
          <div className="text-xs text-muted">friends</div>
          {availableCount > 0 && (
            <div className="mt-2 inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-accent">
              <span className="h-1.5 w-1.5 rounded-full bg-accent shadow-[0_0_6px_rgba(255,61,127,0.8)]" />
              {availableCount} open now
            </div>
          )}
        </Link>
        <Link
          href="/app/demo/add"
          className="flex flex-col justify-center rounded-2xl border border-accent/40 bg-gradient-to-br from-accent/15 to-accent-2/10 p-4 transition hover:from-accent/25"
          style={{ boxShadow: "0 0 24px -8px rgba(255,61,127,0.4)" }}
        >
          <div className="text-2xl font-semibold gradient-text">+ add</div>
          <div className="text-xs text-muted">give someone your Hey Next</div>
        </Link>
      </section>
    </div>
  );
}
