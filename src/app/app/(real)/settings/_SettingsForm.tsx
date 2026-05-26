"use client";

import { useActionState } from "react";
import { updateProfile, type UpdateProfileState } from "./_actions";

type Props = {
  initialDisplayName: string;
  initialBio: string;
  initialEmail: string;
  handle: string;
  phone: string;
};

const initial: UpdateProfileState = null;

export function SettingsForm({
  initialDisplayName,
  initialBio,
  initialEmail,
  handle,
  phone,
}: Props) {
  const [state, formAction, pending] = useActionState<
    UpdateProfileState,
    FormData
  >(updateProfile, initial);

  return (
    <form action={formAction} className="space-y-4">
      <Field label="handle" value={`@${handle}`} readOnly />
      <Field label="phone (verified)" value={phone} readOnly mono />

      <LabelledInput
        label="display name"
        name="displayName"
        defaultValue={initialDisplayName}
        maxLength={60}
        required
      />

      <LabelledInput
        label="email (hidden until you're available)"
        name="email"
        type="email"
        defaultValue={initialEmail}
        placeholder="you@example.com"
      />

      <LabelledInput
        label="bio"
        name="bio"
        defaultValue={initialBio}
        maxLength={280}
        placeholder="something flirty"
      />

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-full bg-gradient-to-r from-accent to-accent-2 px-6 py-3 text-sm font-semibold text-white transition hover:opacity-95 disabled:opacity-50"
      >
        {pending ? "saving..." : "save"}
      </button>

      {state?.ok && (
        <div className="rounded-xl border border-available/30 bg-available/5 p-3 text-xs text-available">
          ✓ saved
        </div>
      )}
      {state?.error && (
        <div className="rounded-xl border border-accent/30 bg-accent/5 p-3 text-xs text-accent">
          {state.error}
        </div>
      )}
    </form>
  );
}

function Field({
  label,
  value,
  readOnly,
  mono,
}: {
  label: string;
  value: string;
  readOnly?: boolean;
  mono?: boolean;
}) {
  return (
    <div>
      <div className="mb-1 text-[10px] uppercase tracking-[0.2em] text-muted">
        {label}
      </div>
      <div
        className={`rounded-xl border border-border bg-background/40 px-3 py-2 text-sm ${
          mono ? "font-mono" : ""
        } ${readOnly ? "text-muted" : "text-foreground"}`}
      >
        {value}
      </div>
    </div>
  );
}

function LabelledInput({
  label,
  name,
  defaultValue,
  placeholder,
  type = "text",
  required,
  maxLength,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  placeholder?: string;
  type?: string;
  required?: boolean;
  maxLength?: number;
}) {
  return (
    <label className="block">
      <div className="mb-1 text-[10px] uppercase tracking-[0.2em] text-muted">
        {label}
      </div>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        placeholder={placeholder}
        required={required}
        maxLength={maxLength}
        className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-accent"
      />
    </label>
  );
}
