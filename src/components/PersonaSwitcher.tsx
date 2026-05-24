"use client";

import { useState } from "react";
import { useStore } from "@/lib/useStore";
import { setActivePersona } from "@/lib/store";
import { AvatarOrb } from "./AvatarOrb";

export function PersonaSwitcher() {
  const { store, update } = useStore();
  const [open, setOpen] = useState(false);
  if (!store) return null;
  const users = Object.values(store.users);
  const active = store.activePersonaId
    ? store.users[store.activePersonaId]
    : null;

  if (users.length === 0) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-sm transition hover:bg-card-hover"
      >
        {active ? (
          <>
            <AvatarOrb user={active} size={24} />
            <span className="font-medium">{active.displayName}</span>
            <span className="text-xs text-muted">switch ▾</span>
          </>
        ) : (
          <span className="text-muted">pick persona ▾</span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-2 w-64 rounded-2xl border border-border bg-card p-1 shadow-2xl">
          <div className="px-3 py-2 text-[10px] uppercase tracking-[0.2em] text-muted">
            demo persona
          </div>
          {users.map((u) => (
            <button
              key={u.id}
              onClick={() => {
                update((prev) => setActivePersona(prev, u.id));
                setOpen(false);
              }}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition hover:bg-card-hover ${
                active?.id === u.id ? "bg-card-hover" : ""
              }`}
            >
              <AvatarOrb user={u} size={32} showStatus />
              <div className="flex-1 min-w-0">
                <div className="truncate text-sm font-medium">
                  {u.displayName}
                </div>
                <div className="truncate text-xs text-muted">@{u.handle}</div>
              </div>
              {u.status === "available" && (
                <span className="text-[10px] uppercase tracking-wider text-available">
                  open
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
