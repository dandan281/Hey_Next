"use client";

import { useActionState } from "react";
import Link from "next/link";
import { sendOtp, verifyOtp, type LoginState } from "./actions";
import { BrokenHeart } from "@/components/Logo";

const initialPhoneState: LoginState = { stage: "phone" };

export default function LoginPage() {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(
    async (prev, formData) => {
      if (prev.stage === "phone") return sendOtp(prev, formData);
      return verifyOtp(prev, formData);
    },
    initialPhoneState,
  );

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-4 py-8">
      <div className="flex flex-col items-center gap-3">
        <BrokenHeart size={64} />
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">Hey Next</h1>
          <p className="mt-1 text-xs uppercase tracking-[0.3em] text-muted">
            the next is the best
          </p>
        </div>
      </div>

      <form
        action={formAction}
        className="mt-10 w-full card-glass rounded-3xl p-6"
      >
        {state.stage === "phone" ? (
          <>
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted">
              your phone (US only)
            </div>
            <input
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="+1 415 555 0100"
              defaultValue=""
              required
              className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-accent"
            />
            <p className="mt-2 text-xs text-muted">
              we&apos;ll text you a 6-digit code. standard rates apply.
            </p>
            <button
              type="submit"
              disabled={pending}
              className="mt-5 w-full rounded-full bg-gradient-to-r from-accent to-accent-2 px-6 py-3 text-sm font-semibold text-white transition hover:opacity-95 disabled:opacity-50"
            >
              {pending ? "sending..." : "send code →"}
            </button>
          </>
        ) : (
          <>
            <input type="hidden" name="phone" value={state.phone} />
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted">
              6-digit code sent to {state.phone}
            </div>
            <input
              name="token"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="\d{6}"
              maxLength={6}
              placeholder="123456"
              required
              autoFocus
              className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 text-center text-2xl font-mono tracking-[0.4em] outline-none focus:border-accent"
            />
            <button
              type="submit"
              disabled={pending}
              className="mt-5 w-full rounded-full bg-gradient-to-r from-accent to-accent-2 px-6 py-3 text-sm font-semibold text-white transition hover:opacity-95 disabled:opacity-50"
            >
              {pending ? "verifying..." : "verify & continue →"}
            </button>
            <div className="mt-3 text-center text-xs text-muted">
              didn&apos;t get it?{" "}
              <Link
                href="/login"
                className="text-accent underline hover:opacity-80"
              >
                try a different number
              </Link>
            </div>
          </>
        )}

        {state.error && (
          <div className="mt-3 rounded-xl border border-accent/30 bg-accent/5 p-3 text-xs text-accent">
            {state.error}
          </div>
        )}
      </form>

      <div className="mt-6 text-center text-xs text-muted">
        just looking?{" "}
        <Link
          href="/app/demo"
          className="text-foreground underline hover:text-accent"
        >
          try the demo
        </Link>{" "}
        — no signup, runs in your browser.
      </div>
    </div>
  );
}
