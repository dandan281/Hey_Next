"use client";

import type { User } from "@/lib/types";
import { AvatarOrb } from "./AvatarOrb";

type Props = {
  friend: User;
  onRemove?: () => void;
};

export function FriendCard({ friend, onRemove }: Props) {
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
          {isAvailable ? (
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
              <a
                href={`mailto:${friend.email}`}
                className="flex items-center justify-between gap-2 text-foreground transition hover:text-accent"
              >
                <span className="text-[10px] uppercase tracking-wider text-muted">
                  email
                </span>
                <span className="truncate">{friend.email}</span>
              </a>
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
      {onRemove && (
        <div className="mt-3 flex justify-end">
          <button
            onClick={onRemove}
            className="text-[10px] uppercase tracking-wider text-muted transition hover:text-accent"
          >
            unfriend
          </button>
        </div>
      )}
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
