"use client";

import { useState } from "react";
import { deleteAccount } from "./_actions";

type Props = { error: string | null };

export function DeleteAccountSection({ error }: Props) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const armed = typed.trim().toLowerCase() === "delete";

  return (
    <section className="rounded-3xl border border-accent/30 bg-accent/5 p-5">
      <div className="text-[10px] uppercase tracking-[0.25em] text-accent">
        danger zone
      </div>

      {!open ? (
        <>
          <p className="mt-2 text-sm text-foreground/80">
            delete your account, profile, friends, reveal history, and SMS
            log. this cannot be undone.
          </p>
          <button
            onClick={() => setOpen(true)}
            className="mt-3 rounded-full border border-accent px-4 py-2 text-sm text-accent transition hover:bg-accent hover:text-white"
          >
            delete account
          </button>
        </>
      ) : (
        <form action={deleteAccount} className="mt-3 space-y-3">
          <p className="text-sm text-foreground/80">
            type <span className="font-mono text-accent">delete</span> below to
            confirm. your phone will be released so you (or someone else) can
            sign up with it again later.
          </p>
          <input
            name="confirm"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            autoFocus
            autoComplete="off"
            placeholder="type: delete"
            className="w-full rounded-xl border border-accent/40 bg-background px-3 py-2.5 text-sm outline-none focus:border-accent"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setTyped("");
              }}
              className="flex-1 rounded-full border border-border px-4 py-2 text-sm text-muted transition hover:text-foreground"
            >
              cancel
            </button>
            <button
              type="submit"
              disabled={!armed}
              className="flex-1 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:opacity-95 disabled:opacity-30"
            >
              permanently delete
            </button>
          </div>
          {error && (
            <div className="text-xs text-accent">{error}</div>
          )}
        </form>
      )}
    </section>
  );
}
