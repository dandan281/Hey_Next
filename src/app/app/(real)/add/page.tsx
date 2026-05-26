import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/db";
import { AddByHandle } from "./_AddByHandle";
import { AvatarOrb } from "@/components/AvatarOrb";
import QRCode from "react-qr-code";

export default async function AddFriendPage() {
  const supabase = await createSupabaseServerClient();
  const profile = await getCurrentProfile(supabase);
  if (!profile) redirect("/app/onboarding");

  // QR encodes a real https URL so scans open the public profile page.
  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto =
    h.get("x-forwarded-proto") ??
    (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
  const handleLink = `${proto}://${host}/u/${profile.handle}`;

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
            <QRCode value={handleLink} size={160} />
          </div>
          <div className="flex items-center gap-3">
            <AvatarOrb user={profile} size={40} />
            <div>
              <div className="font-medium">{profile.displayName}</div>
              <div className="text-xs text-muted">@{profile.handle}</div>
            </div>
          </div>
          <div className="rounded-full bg-background px-3 py-1 font-mono text-xs text-muted">
            {handleLink}
          </div>
        </div>
      </section>

      <AddByHandle />

      <section className="rounded-3xl border border-dashed border-border p-6">
        <div className="text-[10px] uppercase tracking-[0.25em] text-muted">
          want to test cross-device?
        </div>
        <p className="mt-1 text-xs text-muted">
          open Hey Next on a second phone, sign in with a different number,
          finish onboarding, then add each other by handle.
        </p>
      </section>
    </div>
  );
}
