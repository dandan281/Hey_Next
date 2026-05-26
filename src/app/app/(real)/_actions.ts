"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type RevealRecipient = {
  eventId: string;
  toUserId: string;
  toDisplayName: string;
  toAvatarHue: number;
};

export type FlipResult =
  | { ok: true; status: "available"; recipients: RevealRecipient[]; note: string }
  | { ok: true; status: "unavailable" }
  | { ok: false; error: string };

export async function flipAvailable(
  _prev: FlipResult | null,
  formData: FormData,
): Promise<FlipResult> {
  const note = String(formData.get("note") ?? "").trim().slice(0, 80);
  const mode = String(formData.get("mode") ?? "all") === "selected" ? "selected" : "all";
  const selectedRaw = String(formData.get("selectedIds") ?? "");
  const requestedIds = selectedRaw
    ? selectedRaw.split(",").map((s) => s.trim()).filter(Boolean)
    : [];

  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, error: "not signed in" };

  // 1. Find friends — we need this before flipping so we can validate the
  //    selection against the actual friend graph.
  const { data: friendships } = await supabase
    .from("friendships")
    .select("user_a, user_b");

  const friendIds = (friendships ?? [])
    .map((f) => (f.user_a === auth.user!.id ? f.user_b : f.user_a))
    .filter((id) => id !== auth.user!.id);

  // 2. Decide recipients + revealed-to allowlist
  let recipientIds: string[];
  let revealedToList: string[];
  if (mode === "selected") {
    const friendSet = new Set(friendIds);
    recipientIds = requestedIds.filter((id) => friendSet.has(id));
    if (recipientIds.length === 0) {
      return { ok: false, error: "select at least one friend" };
    }
    revealedToList = recipientIds;
  } else {
    recipientIds = friendIds;
    revealedToList = []; // empty = all friends (legacy behavior)
  }

  // 3. Flip the profile. The `revealed_to_user_ids` column comes from
  //    migration 002; we split the update so "everyone" mode keeps working
  //    even if 002 hasn't been applied yet, and "selected" mode surfaces a
  //    clear migration error instead of a cryptic schema-cache miss.
  const { error: updateError } = await supabase
    .from("profiles")
    .update({
      status: "available",
      status_note: note,
      status_changed_at: new Date().toISOString(),
    })
    .eq("id", auth.user.id);

  if (updateError) return { ok: false, error: updateError.message };

  const { error: allowlistError } = await supabase
    .from("profiles")
    .update({ revealed_to_user_ids: revealedToList })
    .eq("id", auth.user.id);

  if (allowlistError) {
    const isMissingColumn = allowlistError.message
      .toLowerCase()
      .includes("revealed_to_user_ids");
    if (mode === "selected") {
      return {
        ok: false,
        error: isMissingColumn
          ? "selective reveal needs migration 002 — open Supabase Studio → SQL editor and run supabase/migrations/002_selective_reveal.sql"
          : allowlistError.message,
      };
    }
    // "all" mode tolerates a missing column — the legacy behavior was always
    // "every friend sees it," which is what no-column already gives you.
  }

  if (recipientIds.length === 0) {
    revalidatePath("/app");
    return { ok: true, status: "available", recipients: [], note };
  }

  // 4. Insert one reveal_event per recipient
  const rows = recipientIds.map((toUserId) => ({
    from_user_id: auth.user!.id,
    to_user_id: toUserId,
    new_status: "available" as const,
    note,
  }));

  const { data: inserted, error: insertError } = await supabase
    .from("reveal_events")
    .insert(rows)
    .select("id, to_user_id");

  if (insertError) return { ok: false, error: insertError.message };

  // 5. Look up recipient display_name + avatar_hue for the sending overlay.
  const admin = createSupabaseAdminClient();
  const { data: friendProfiles } = await admin
    .from("profiles")
    .select("id, display_name, avatar_hue")
    .in("id", recipientIds);

  const byId = new Map<string, { display_name: string; avatar_hue: number }>();
  for (const p of friendProfiles ?? []) {
    byId.set(p.id, { display_name: p.display_name, avatar_hue: p.avatar_hue });
  }

  const recipients: RevealRecipient[] = (inserted ?? []).map((e) => {
    const p = byId.get(e.to_user_id);
    return {
      eventId: e.id,
      toUserId: e.to_user_id,
      toDisplayName: p?.display_name ?? "unknown",
      toAvatarHue: p?.avatar_hue ?? 200,
    };
  });

  revalidatePath("/app");
  return { ok: true, status: "available", recipients, note };
}

export async function flipUnavailable(): Promise<FlipResult> {
  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, error: "not signed in" };

  const { error } = await supabase
    .from("profiles")
    .update({
      status: "unavailable",
      status_note: "",
      status_changed_at: new Date().toISOString(),
    })
    .eq("id", auth.user.id);

  if (error) return { ok: false, error: error.message };

  // Best-effort clear of the selective allowlist (safe to ignore if column
  // doesn't exist — RLS won't read the column when status='unavailable').
  await supabase
    .from("profiles")
    .update({ revealed_to_user_ids: [] })
    .eq("id", auth.user.id);

  revalidatePath("/app");
  return { ok: true, status: "unavailable" };
}

export async function markRevealSeen(eventId: string): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase
    .from("reveal_events")
    .update({ seen: true })
    .eq("id", eventId);
}

export async function addFriendByHandle(
  _prev: { ok: boolean; message?: string } | null,
  formData: FormData,
): Promise<{ ok: boolean; message?: string }> {
  const handleRaw = String(formData.get("handle") ?? "").toLowerCase().trim();
  const handle = handleRaw.replace(/^@/, "");

  if (!handle) return { ok: false, message: "enter a handle" };

  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, message: "not signed in" };

  const { data: target } = await supabase
    .from("profiles")
    .select("id, display_name")
    .eq("handle", handle)
    .maybeSingle();

  if (!target) return { ok: false, message: `no user @${handle}` };
  if (target.id === auth.user.id)
    return { ok: false, message: "that's you" };

  const [a, b] =
    auth.user.id < target.id
      ? [auth.user.id, target.id]
      : [target.id, auth.user.id];

  const { error } = await supabase
    .from("friendships")
    .insert({ user_a: a, user_b: b });

  if (error) {
    if (error.code === "23505") {
      return { ok: false, message: `already friends with ${target.display_name}` };
    }
    return { ok: false, message: error.message };
  }

  revalidatePath("/app/friends");
  return { ok: true, message: `✓ added ${target.display_name}` };
}
