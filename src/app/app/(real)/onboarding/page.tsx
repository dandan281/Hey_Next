"use client";

import { useActionState, useState } from "react";
import { completeOnboarding, type OnboardingState } from "./actions";
import type { Gender } from "@/lib/db";

const initial: OnboardingState = null;

const GENDER_LABELS: Record<Gender, string> = {
  her: "she / her",
  him: "he / him",
  they: "they / them",
};

const NAME_SUGGESTIONS: Record<Gender, string[]> = {
  her: ["Little Kitty", "Peach", "Honey", "Cherry", "Velvet", "Bunny"],
  him: ["Wolfie", "Tiger", "Cosmo", "Indigo", "Atlas", "Bandit"],
  they: ["Mango", "Mochi", "Plum", "Night Owl", "Cinnamon", "Strawberry"],
};

export default function RealOnboardingPage() {
  const [state, formAction, pending] = useActionState<OnboardingState, FormData>(
    completeOnboarding,
    initial,
  );

  const [gender, setGender] = useState<Gender>("they");
  const [displayName, setDisplayName] = useState("");

  const pool = NAME_SUGGESTIONS[gender];

  const rollName = () => {
    const candidates = pool.filter((p) => p !== displayName);
    setDisplayName(candidates[Math.floor(Math.random() * candidates.length)]);
  };

  return (
    <div className="space-y-6 px-4 py-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">
          create your <span className="gradient-text">Hey Next</span>
        </h1>
        <p className="mt-1 text-xs uppercase tracking-[0.3em] text-muted">
          the next is the best
        </p>
        <p className="mt-3 text-sm text-muted">
          one-time setup. your phone is already verified — just pick how
          you&apos;ll show up to friends.
        </p>
      </header>

      <form action={formAction} className="space-y-4">
        <input type="hidden" name="gender" value={gender} />

        <div>
          <div className="mb-1 text-[10px] uppercase tracking-[0.2em] text-muted">
            pronouns
          </div>
          <div className="grid grid-cols-3 gap-2">
            {(Object.keys(GENDER_LABELS) as Gender[]).map((opt) => {
              const active = gender === opt;
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setGender(opt)}
                  className={`rounded-xl border px-3 py-2.5 text-sm transition ${
                    active
                      ? "border-accent bg-accent/10 text-foreground"
                      : "border-border bg-background text-muted hover:border-accent/40 hover:text-foreground"
                  }`}
                >
                  {GENDER_LABELS[opt]}
                </button>
              );
            })}
          </div>
          <div className="mt-1.5 text-[10px] text-muted">
            nudges your default avatar color &amp; name picks. pick any name
            regardless.
          </div>
        </div>

        <label className="block">
          <div className="mb-1 text-[10px] uppercase tracking-[0.2em] text-muted">
            display name
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-border bg-background pl-3 pr-1.5 py-1.5 focus-within:border-accent">
            <input
              name="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder={pool[0]}
              required
              className="w-full bg-transparent text-sm outline-none"
            />
            <button
              type="button"
              onClick={rollName}
              aria-label="roll a random name"
              title="roll a random name"
              className="group flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted transition hover:bg-card-hover hover:text-accent active:scale-90"
            >
              <DiceIcon />
            </button>
          </div>
          <div className="mt-2 text-xs leading-relaxed text-muted">
            no need to use your real name — tap the dice for a random one, or
            write anything soft, silly, or sweet.
          </div>
        </label>

        <Field
          label="handle"
          name="handle"
          prefix="@"
          placeholder="velvet_94"
        />
        <Field
          label="email (optional, hidden until available)"
          name="email"
          type="email"
          placeholder="you@example.com"
        />
        <Field
          label="bio (optional)"
          name="bio"
          placeholder="something flirty"
        />

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-full bg-gradient-to-r from-accent to-accent-2 px-6 py-3 font-medium text-white transition hover:opacity-90 disabled:opacity-40"
        >
          {pending ? "creating..." : "create profile →"}
        </button>

        {state?.error && (
          <div className="rounded-xl border border-accent/30 bg-accent/5 p-3 text-xs text-accent">
            {state.error}
          </div>
        )}
      </form>
    </div>
  );
}

function Field({
  label,
  name,
  placeholder,
  prefix,
  type = "text",
}: {
  label: string;
  name: string;
  placeholder?: string;
  prefix?: string;
  type?: string;
}) {
  return (
    <label className="block">
      <div className="mb-1 text-[10px] uppercase tracking-[0.2em] text-muted">
        {label}
      </div>
      <div className="flex items-center rounded-xl border border-border bg-background px-3 py-2 focus-within:border-accent">
        {prefix && <span className="mr-1 text-muted">{prefix}</span>}
        <input
          name={name}
          type={type}
          placeholder={placeholder}
          className="w-full bg-transparent text-sm outline-none"
        />
      </div>
    </label>
  );
}

function DiceIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="transition-transform group-hover:rotate-12"
    >
      <rect x="3" y="3" width="18" height="18" rx="3.5" />
      <circle cx="8.5" cy="8.5" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="15.5" cy="8.5" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="8.5" cy="15.5" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="15.5" cy="15.5" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  );
}
