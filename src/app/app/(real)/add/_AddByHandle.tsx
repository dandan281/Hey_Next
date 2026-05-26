"use client";

import { useActionState } from "react";
import { addFriendByHandle } from "../_actions";

export function AddByHandle() {
  const [state, formAction, pending] = useActionState<
    { ok: boolean; message?: string } | null,
    FormData
  >(addFriendByHandle, null);

  return (
    <section className="rounded-3xl border border-border bg-card p-6">
      <div className="text-[10px] uppercase tracking-[0.25em] text-muted">
        add by handle
      </div>
      <form action={formAction} className="mt-3 flex gap-2">
        <div className="flex flex-1 items-center rounded-xl border border-border bg-background pl-3 pr-2 focus-within:border-accent">
          <span className="mr-1 text-muted">@</span>
          <input
            name="handle"
            placeholder="velvet_94"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            className="w-full bg-transparent py-2 text-sm outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-gradient-to-r from-accent to-accent-2 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
        >
          {pending ? "adding..." : "add"}
        </button>
      </form>
      {state?.message && (
        <div
          className={`mt-3 text-xs ${
            state.ok ? "text-available" : "text-muted"
          }`}
        >
          {state.message}
        </div>
      )}
    </section>
  );
}
