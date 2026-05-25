"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useStore } from "@/lib/useStore";
import {
  createUser,
  upsertUser,
  setActivePersona,
  resetStore,
} from "@/lib/store";
import type { Gender } from "@/lib/types";

export default function OnboardingPage() {
  const { store, update } = useStore();
  const router = useRouter();
  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [gender, setGender] = useState<Gender>("they");

  const existingHandles = store
    ? Object.values(store.users).map((u) => u.handle)
    : [];
  const handleTaken =
    handle && existingHandles.includes(handle.toLowerCase());

  const canSubmit =
    name.trim() && handle.trim() && email.trim() && phone.trim() && !handleTaken;

  const submit = () => {
    if (!canSubmit) return;
    const user = createUser({
      displayName: name.trim(),
      handle: handle.trim(),
      email: email.trim(),
      phone: phone.trim(),
      bio: bio.trim(),
      gender,
      status: "unavailable",
      statusNote: "just here, vibing",
    });
    update((prev) => setActivePersona(upsertUser(prev, user), user.id));
    router.replace("/app/demo");
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
          your phone &amp; email are hidden by default. only revealed when you
          flip the switch.
        </p>
      </header>

      <div className="space-y-4">
        <GenderPicker value={gender} onChange={setGender} />
        <NameField value={name} onChange={setName} gender={gender} />
        <Field
          label="handle"
          prefix="@"
          value={handle}
          onChange={(v) =>
            setHandle(v.toLowerCase().replace(/[^a-z0-9_]/g, ""))
          }
          placeholder="alex_b"
          error={
            handleTaken ? "taken on this device — try another" : undefined
          }
        />
        <Field
          label="phone (hidden until available)"
          value={phone}
          onChange={setPhone}
          placeholder="+1 415 555 0100"
        />
        <Field
          label="email (hidden until available)"
          value={email}
          onChange={setEmail}
          placeholder="alex@example.com"
        />
        <Field
          label="bio (optional)"
          value={bio}
          onChange={setBio}
          placeholder="something flirty"
        />
      </div>

      <button
        disabled={!canSubmit}
        onClick={submit}
        className="w-full rounded-full bg-gradient-to-r from-accent to-accent-2 px-6 py-3 font-medium text-white transition hover:opacity-90 disabled:opacity-40"
      >
        create persona
      </button>

      <div className="rounded-2xl border border-dashed border-border p-4 text-xs text-muted">
        <div className="mb-1 font-medium text-foreground">demo mode</div>
        this app runs entirely in your browser with no backend. all personas
        are stored locally on this device. use the persona switcher (top
        right) to see both sides of an exchange.
        <button
          onClick={() => {
            if (
              confirm(
                "wipe all local data and reseed with Alice + Bob demo personas?",
              )
            ) {
              resetStore();
              router.replace("/app/demo");
            }
          }}
          className="mt-3 block underline hover:text-accent"
        >
          reset to demo state
        </button>
      </div>
    </div>
  );
}

const GENDER_LABELS: Record<Gender, string> = {
  her: "she / her",
  him: "he / him",
  they: "they / them",
};

function GenderPicker({
  value,
  onChange,
}: {
  value: Gender;
  onChange: (g: Gender) => void;
}) {
  const options: Gender[] = ["her", "him", "they"];
  return (
    <div>
      <div className="mb-1 text-[10px] uppercase tracking-[0.2em] text-muted">
        pronouns
      </div>
      <div className="grid grid-cols-3 gap-2">
        {options.map((opt) => {
          const active = value === opt;
          return (
            <button
              key={opt}
              type="button"
              onClick={() => onChange(opt)}
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
        nudges your default avatar color &amp; name picks. you can pick any
        name regardless.
      </div>
    </div>
  );
}

const NAME_SUGGESTIONS: Record<Gender, string[]> = {
  her: ["Little Kitty", "Peach", "Honey", "Cherry", "Velvet", "Bunny"],
  him: ["Wolfie", "Tiger", "Cosmo", "Indigo", "Atlas", "Bandit"],
  they: ["Mango", "Mochi", "Plum", "Night Owl", "Cinnamon", "Strawberry"],
};

function NameField({
  value,
  onChange,
  gender,
}: {
  value: string;
  onChange: (v: string) => void;
  gender: Gender;
}) {
  const pool = NAME_SUGGESTIONS[gender];
  const placeholder = pool[0];

  const rollName = () => {
    // pick a name different from current value when possible
    const candidates = pool.filter((p) => p !== value);
    const next = candidates[Math.floor(Math.random() * candidates.length)];
    onChange(next);
  };

  return (
    <label className="block">
      <div className="mb-1 text-[10px] uppercase tracking-[0.2em] text-muted">
        display name
      </div>
      <div className="flex items-center gap-2 rounded-xl border border-border bg-background pl-3 pr-1.5 py-1.5 focus-within:border-accent">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
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
        no need to use your real name — tap the dice for a random one, or write
        anything soft, silly, or sweet.
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

function Field({
  label,
  value,
  onChange,
  placeholder,
  prefix,
  error,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  prefix?: string;
  error?: string;
}) {
  return (
    <label className="block">
      <div className="mb-1 text-[10px] uppercase tracking-[0.2em] text-muted">
        {label}
      </div>
      <div
        className={`flex items-center rounded-xl border bg-background px-3 py-2 ${
          error ? "border-accent" : "border-border focus-within:border-accent"
        }`}
      >
        {prefix && <span className="mr-1 text-muted">{prefix}</span>}
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-transparent text-sm outline-none"
        />
      </div>
      {error && <div className="mt-1 text-xs text-accent">{error}</div>}
    </label>
  );
}
