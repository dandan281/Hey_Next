"use client";

import { useState } from "react";
import QRCode from "react-qr-code";
import { AvatarOrb } from "@/components/AvatarOrb";
import { useActiveUser } from "@/lib/useStore";
import { addFriendship, areFriends } from "@/lib/store";

export default function AddFriendPage() {
  const { store, activeUser, update } = useActiveUser();
  const [handleInput, setHandleInput] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);

  if (!activeUser || !store) return null;

  const myUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/app/demo/add?h=${activeUser.handle}`
      : "";

  const others = Object.values(store.users).filter(
    (u) => u.id !== activeUser.id,
  );

  const addByHandle = (handle: string) => {
    const target = Object.values(store.users).find(
      (u) => u.handle.toLowerCase() === handle.toLowerCase().trim(),
    );
    if (!target) {
      setFeedback(`no user @${handle} on this device`);
      return;
    }
    if (target.id === activeUser.id) {
      setFeedback("that's you, weirdo");
      return;
    }
    if (areFriends(store, activeUser.id, target.id)) {
      setFeedback(`already friends with ${target.displayName}`);
      return;
    }
    update((prev) => addFriendship(prev, activeUser.id, target.id));
    setFeedback(`✓ added ${target.displayName}`);
    setHandleInput("");
  };

  return (
    <div className="space-y-6 px-4 py-6">
      <header>
        <h1 className="text-2xl font-bold">add a friend</h1>
        <p className="text-sm text-muted">
          show them your QR, or punch in their handle. no phone numbers
          exchanged.
        </p>
      </header>

      <section className="rounded-3xl border border-border bg-card p-6">
        <div className="text-[10px] uppercase tracking-[0.25em] text-muted">
          your Hey Next card
        </div>
        <div className="mt-4 flex flex-col items-center gap-4">
          <div className="rounded-2xl bg-white p-4">
            <QRCode value={myUrl} size={160} />
          </div>
          <div className="flex items-center gap-3">
            <AvatarOrb user={activeUser} size={40} />
            <div>
              <div className="font-medium">{activeUser.displayName}</div>
              <div className="text-xs text-muted">@{activeUser.handle}</div>
            </div>
          </div>
          <div className="rounded-full bg-background px-3 py-1 font-mono text-xs text-muted">
            heynext://{activeUser.handle}
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-border bg-card p-6">
        <div className="text-[10px] uppercase tracking-[0.25em] text-muted">
          add by handle
        </div>
        <div className="mt-3 flex gap-2">
          <input
            value={handleInput}
            onChange={(e) => setHandleInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && handleInput) addByHandle(handleInput);
            }}
            placeholder="alice"
            className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <button
            onClick={() => addByHandle(handleInput)}
            disabled={!handleInput.trim()}
            className="rounded-full bg-gradient-to-r from-accent to-accent-2 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
          >
            add
          </button>
        </div>
        {feedback && (
          <div className="mt-3 text-xs text-muted">{feedback}</div>
        )}
      </section>

      {others.length > 0 && (
        <section className="rounded-3xl border border-dashed border-border p-6">
          <div className="text-[10px] uppercase tracking-[0.25em] text-muted">
            demo: other personas on this device
          </div>
          <p className="mt-1 text-xs text-muted">
            tap to instantly add — simulates two phones bumping into each other
          </p>
          <div className="mt-3 space-y-2">
            {others.map((u) => {
              const already = areFriends(store, activeUser.id, u.id);
              return (
                <button
                  key={u.id}
                  disabled={already}
                  onClick={() => {
                    update((prev) =>
                      addFriendship(prev, activeUser.id, u.id),
                    );
                    setFeedback(`✓ added ${u.displayName}`);
                  }}
                  className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-3 text-left transition hover:bg-card-hover disabled:opacity-50"
                >
                  <AvatarOrb user={u} size={36} showStatus />
                  <div className="flex-1 min-w-0">
                    <div className="truncate text-sm font-medium">
                      {u.displayName}
                    </div>
                    <div className="truncate text-xs text-muted">
                      @{u.handle}
                    </div>
                  </div>
                  <span className="text-xs text-muted">
                    {already ? "already friends" : "+ add"}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
