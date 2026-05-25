import type { SupabaseClient } from "@supabase/supabase-js";

// ============================================================
// TYPES — mirror the SQL schema (snake_case columns -> camelCase TS)
// ============================================================

export type Gender = "her" | "him" | "they";
export type AvailabilityStatus = "available" | "unavailable";
export type SentMessageStatus = "queued" | "sent-real" | "sent-demo" | "failed";

export type Profile = {
  id: string;
  handle: string;
  displayName: string;
  bio: string;
  avatarHue: number;
  gender: Gender;
  status: AvailabilityStatus;
  statusNote: string;
  statusChangedAt: string;
  createdAt: string;
};

export type PrivateContact = {
  userId: string;
  phone: string;
  email: string;
};

export type Friendship = {
  id: string;
  userA: string;
  userB: string;
  createdAt: string;
};

export type RevealEvent = {
  id: string;
  fromUserId: string;
  toUserId: string;
  newStatus: AvailabilityStatus;
  note: string;
  createdAt: string;
  seen: boolean;
};

export type SentMessage = {
  id: string;
  fromUserId: string;
  toUserId: string;
  toPhone: string;
  body: string;
  status: SentMessageStatus;
  error: string | null;
  createdAt: string;
};

// Profile + private contacts (only present for current user or available friends)
export type ProfileWithContact = Profile & {
  phone: string | null;
  email: string | null;
};

// ============================================================
// MAPPERS (snake_case -> camelCase)
// ============================================================

type ProfileRow = {
  id: string;
  handle: string;
  display_name: string;
  bio: string;
  avatar_hue: number;
  gender: Gender;
  status: AvailabilityStatus;
  status_note: string;
  status_changed_at: string;
  created_at: string;
};

function mapProfile(row: ProfileRow): Profile {
  return {
    id: row.id,
    handle: row.handle,
    displayName: row.display_name,
    bio: row.bio,
    avatarHue: row.avatar_hue,
    gender: row.gender,
    status: row.status,
    statusNote: row.status_note,
    statusChangedAt: row.status_changed_at,
    createdAt: row.created_at,
  };
}

type PrivateContactRow = { user_id: string; phone: string; email: string };

// ============================================================
// PROFILE QUERIES
// ============================================================

/** Returns the signed-in user's profile + contacts. null if not onboarded. */
export async function getCurrentProfile(
  supabase: SupabaseClient,
): Promise<ProfileWithContact | null> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", auth.user.id)
    .maybeSingle<ProfileRow>();

  if (error || !profile) return null;

  const { data: contact } = await supabase
    .from("private_contacts")
    .select("*")
    .eq("user_id", auth.user.id)
    .maybeSingle<PrivateContactRow>();

  return {
    ...mapProfile(profile),
    phone: contact?.phone ?? null,
    email: contact?.email ?? null,
  };
}

export async function createProfile(
  supabase: SupabaseClient,
  input: {
    handle: string;
    displayName: string;
    bio?: string;
    avatarHue: number;
    gender: Gender;
    phone: string;
    email?: string;
  },
): Promise<{ ok: true; profile: ProfileWithContact } | { ok: false; error: string }> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, error: "not signed in" };

  const { error: profileError } = await supabase.from("profiles").insert({
    id: auth.user.id,
    handle: input.handle.toLowerCase(),
    display_name: input.displayName,
    bio: input.bio ?? "",
    avatar_hue: input.avatarHue,
    gender: input.gender,
    status: "unavailable",
    status_note: "",
  });

  if (profileError) {
    if (profileError.code === "23505") {
      return { ok: false, error: "that handle is taken" };
    }
    return { ok: false, error: profileError.message };
  }

  const { error: contactError } = await supabase
    .from("private_contacts")
    .insert({
      user_id: auth.user.id,
      phone: input.phone,
      email: input.email ?? "",
    });

  if (contactError) {
    return { ok: false, error: contactError.message };
  }

  const fresh = await getCurrentProfile(supabase);
  if (!fresh) return { ok: false, error: "profile created but could not read it back" };
  return { ok: true, profile: fresh };
}

export async function findProfileByHandle(
  supabase: SupabaseClient,
  handle: string,
): Promise<Profile | null> {
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("handle", handle.toLowerCase())
    .maybeSingle<ProfileRow>();
  return data ? mapProfile(data) : null;
}

// ============================================================
// FRIENDSHIP QUERIES
// ============================================================

/** All friends of the signed-in user, with contact info present iff friend is currently available. */
export async function getFriendsWithContacts(
  supabase: SupabaseClient,
): Promise<ProfileWithContact[]> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return [];

  // Pull all friendships I'm part of
  const { data: friendships } = await supabase
    .from("friendships")
    .select("user_a, user_b");

  if (!friendships || friendships.length === 0) return [];

  const friendIds = friendships
    .map((f) => (f.user_a === auth.user!.id ? f.user_b : f.user_a))
    .filter((id) => id !== auth.user!.id);

  if (friendIds.length === 0) return [];

  // Fetch profiles
  const { data: profiles } = await supabase
    .from("profiles")
    .select("*")
    .in("id", friendIds);

  if (!profiles) return [];

  // Fetch private contacts; RLS only returns rows we're allowed to see
  // (i.e., friends whose status is currently 'available').
  const { data: contacts } = await supabase
    .from("private_contacts")
    .select("*")
    .in("user_id", friendIds);

  const contactByUserId = new Map<string, PrivateContactRow>();
  for (const c of contacts ?? []) contactByUserId.set(c.user_id, c);

  return profiles.map((p: ProfileRow) => {
    const c = contactByUserId.get(p.id);
    return {
      ...mapProfile(p),
      phone: c?.phone ?? null,
      email: c?.email ?? null,
    };
  });
}

export async function addFriendship(
  supabase: SupabaseClient,
  otherUserId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, error: "not signed in" };
  if (auth.user.id === otherUserId) return { ok: false, error: "can't friend yourself" };

  // Canonical ordering enforced by trigger, but we still order client-side for clarity
  const [a, b] =
    auth.user.id < otherUserId
      ? [auth.user.id, otherUserId]
      : [otherUserId, auth.user.id];

  const { error } = await supabase
    .from("friendships")
    .insert({ user_a: a, user_b: b });

  if (error) {
    if (error.code === "23505") return { ok: true }; // already friends
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

export async function removeFriendship(
  supabase: SupabaseClient,
  otherUserId: string,
): Promise<{ ok: boolean }> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false };

  const [a, b] =
    auth.user.id < otherUserId
      ? [auth.user.id, otherUserId]
      : [otherUserId, auth.user.id];

  const { error } = await supabase
    .from("friendships")
    .delete()
    .eq("user_a", a)
    .eq("user_b", b);

  return { ok: !error };
}

// ============================================================
// STATUS / REVEAL
// ============================================================

export async function setStatus(
  supabase: SupabaseClient,
  status: AvailabilityStatus,
  note: string,
): Promise<{ ok: true; friendsNotified: number } | { ok: false; error: string }> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, error: "not signed in" };

  const { error: updateError } = await supabase
    .from("profiles")
    .update({
      status,
      status_note: note,
      status_changed_at: new Date().toISOString(),
    })
    .eq("id", auth.user.id);

  if (updateError) return { ok: false, error: updateError.message };

  // On flip to available, write reveal_events for each friend so they get an in-app notification.
  if (status === "available") {
    const { data: friendships } = await supabase
      .from("friendships")
      .select("user_a, user_b");

    const friendIds = (friendships ?? [])
      .map((f) => (f.user_a === auth.user!.id ? f.user_b : f.user_a))
      .filter((id) => id !== auth.user!.id);

    if (friendIds.length > 0) {
      const events = friendIds.map((toUserId) => ({
        from_user_id: auth.user!.id,
        to_user_id: toUserId,
        new_status: "available" as const,
        note,
      }));
      await supabase.from("reveal_events").insert(events);
    }

    return { ok: true, friendsNotified: friendIds.length };
  }

  return { ok: true, friendsNotified: 0 };
}

// ============================================================
// REVEAL EVENTS (in-app notifications)
// ============================================================

type RevealEventRow = {
  id: string;
  from_user_id: string;
  to_user_id: string;
  new_status: AvailabilityStatus;
  note: string;
  created_at: string;
  seen: boolean;
};

function mapRevealEvent(row: RevealEventRow): RevealEvent {
  return {
    id: row.id,
    fromUserId: row.from_user_id,
    toUserId: row.to_user_id,
    newStatus: row.new_status,
    note: row.note,
    createdAt: row.created_at,
    seen: row.seen,
  };
}

export async function getUnseenEvents(
  supabase: SupabaseClient,
): Promise<RevealEvent[]> {
  const { data } = await supabase
    .from("reveal_events")
    .select("*")
    .eq("seen", false)
    .order("created_at", { ascending: false });
  return (data ?? []).map(mapRevealEvent);
}

export async function markEventSeen(
  supabase: SupabaseClient,
  eventId: string,
): Promise<void> {
  await supabase
    .from("reveal_events")
    .update({ seen: true })
    .eq("id", eventId);
}

export async function markAllEventsSeen(
  supabase: SupabaseClient,
): Promise<void> {
  await supabase
    .from("reveal_events")
    .update({ seen: true })
    .eq("seen", false);
}

// ============================================================
// SENT MESSAGES (SMS log)
// ============================================================

export function buildRevealSmsBody(
  fromName: string,
  toName: string,
  note: string,
): string {
  const greeting = toName ? `Hey ${toName}` : "Hey";
  const tail = note ? ` "${note}"` : "";
  return `${greeting} — ${fromName} just flipped to available on Hey Next.${tail} Open the app to see their number.`;
}
