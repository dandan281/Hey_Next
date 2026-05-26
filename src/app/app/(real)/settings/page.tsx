import { redirect } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/db";
import { SettingsForm } from "./_SettingsForm";
import { DeleteAccountSection } from "./_DeleteAccountSection";

type Props = { searchParams: Promise<{ error?: string }> };

export default async function SettingsPage({ searchParams }: Props) {
  const supabase = await createSupabaseServerClient();
  const profile = await getCurrentProfile(supabase);
  if (!profile) redirect("/app/onboarding");

  const params = await searchParams;
  const inlineError =
    params.error === "confirm"
      ? "type the word \"delete\" exactly to confirm"
      : null;

  return (
    <div className="space-y-6 px-4 py-6">
      <header>
        <h1 className="text-2xl font-bold">settings</h1>
        <p className="text-sm text-muted">
          edit how you show up. your phone is locked to your account and
          can&apos;t be changed here yet.
        </p>
      </header>

      <SettingsForm
        initialDisplayName={profile.displayName}
        initialBio={profile.bio}
        initialEmail={profile.email ?? ""}
        handle={profile.handle}
        phone={profile.phone ?? ""}
      />

      <section className="rounded-3xl border border-border bg-card p-5">
        <div className="text-[10px] uppercase tracking-[0.25em] text-muted">
          shareable link
        </div>
        <Link
          href={`/u/${profile.handle}`}
          className="mt-2 block truncate text-sm text-accent underline"
        >
          /u/{profile.handle}
        </Link>
        <p className="mt-1 text-xs text-muted">
          your QR code on the add screen points here.
        </p>
      </section>

      <DeleteAccountSection error={inlineError} />
    </div>
  );
}
