"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RevealOverlay } from "@/components/RevealOverlay";
import { markRevealSeen } from "./_actions";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { InboundReveal } from "@/lib/db";
import type { RevealEvent, User } from "@/lib/types";

type Props = {
  currentUserId: string;
  initialReveals: InboundReveal[];
};

type RevealEventRowFromRealtime = {
  id: string;
  from_user_id: string;
  to_user_id: string;
  new_status: "available" | "unavailable";
  note: string | null;
  created_at: string;
  seen: boolean;
};

type ProfileRowRaw = {
  id: string;
  handle: string;
  display_name: string;
  bio: string;
  avatar_hue: number;
  gender: "her" | "him" | "they";
  status: "available" | "unavailable";
  status_note: string;
  status_changed_at: string;
  created_at: string;
};

type ContactRowRaw = {
  user_id: string;
  phone: string;
  email: string;
};

// The existing RevealOverlay component uses the localStorage-era User /
// RevealEvent types — adapt the Supabase shape on its way in.
function toLegacyEvent(r: InboundReveal): RevealEvent {
  return {
    id: r.event.id,
    fromUserId: r.event.fromUserId,
    toUserId: r.event.toUserId,
    newStatus: r.event.newStatus,
    note: r.event.note,
    createdAt: Date.parse(r.event.createdAt),
    seen: r.event.seen,
  };
}

function toLegacyUser(r: InboundReveal): User {
  const p = r.fromProfile;
  return {
    id: p.id,
    handle: p.handle,
    displayName: p.displayName,
    email: p.email ?? "",
    phone: p.phone ?? "",
    bio: p.bio,
    avatarHue: p.avatarHue,
    gender: p.gender,
    status: p.status,
    statusNote: p.statusNote,
    createdAt: Date.parse(p.createdAt),
    statusChangedAt: Date.parse(p.statusChangedAt),
  };
}

export function RealRevealClient({ currentUserId, initialReveals }: Props) {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [reveals, setReveals] = useState<InboundReveal[]>(initialReveals);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [, startTransition] = useTransition();

  // Deduplicate: events seen from initial load OR from realtime push should
  // not be re-enqueued if both paths happen to deliver the same row.
  const knownEventIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    setReveals(initialReveals);
    setCurrentIdx(0);
    knownEventIds.current = new Set(initialReveals.map((r) => r.event.id));
  }, [initialReveals]);

  useEffect(() => {
    if (!currentUserId) return;

    const channel = supabase
      .channel(`reveal-${currentUserId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "reveal_events",
          filter: `to_user_id=eq.${currentUserId}`,
        },
        async (payload) => {
          const row = payload.new as RevealEventRowFromRealtime;
          if (knownEventIds.current.has(row.id)) return;
          knownEventIds.current.add(row.id);

          // Only show available-flips (unavailable transitions don't pop)
          if (row.new_status !== "available") return;

          // Hydrate sender — RLS allows reading their profile (always public)
          // and their contact (because they are now 'available' and we are
          // friends).
          const [{ data: profile }, { data: contact }] = await Promise.all([
            supabase
              .from("profiles")
              .select(
                "id, handle, display_name, bio, avatar_hue, gender, status, status_note, status_changed_at, created_at",
              )
              .eq("id", row.from_user_id)
              .maybeSingle<ProfileRowRaw>(),
            supabase
              .from("private_contacts")
              .select("user_id, phone, email")
              .eq("user_id", row.from_user_id)
              .maybeSingle<ContactRowRaw>(),
          ]);

          if (!profile) return;

          const newReveal: InboundReveal = {
            event: {
              id: row.id,
              fromUserId: row.from_user_id,
              toUserId: row.to_user_id,
              newStatus: row.new_status,
              note: row.note ?? "",
              createdAt: row.created_at,
              seen: row.seen,
            },
            fromProfile: {
              id: profile.id,
              handle: profile.handle,
              displayName: profile.display_name,
              bio: profile.bio,
              avatarHue: profile.avatar_hue,
              gender: profile.gender,
              status: profile.status,
              statusNote: profile.status_note,
              statusChangedAt: profile.status_changed_at,
              createdAt: profile.created_at,
              phone: contact?.phone ?? null,
              email: contact?.email ?? null,
            },
          };

          setReveals((prev) => [...prev, newReveal]);
          // Refresh background page data (friend list shows new "available"
          // state, profile cards update, etc.) while popup is up.
          router.refresh();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, currentUserId, router]);

  const current = reveals[currentIdx];

  const close = () => {
    if (!current) return;
    const eventId = current.event.id;
    startTransition(async () => {
      await markRevealSeen(eventId);
      if (currentIdx + 1 < reveals.length) {
        setCurrentIdx(currentIdx + 1);
      } else {
        setReveals([]);
        setCurrentIdx(0);
        router.refresh();
      }
    });
  };

  return (
    <RevealOverlay
      event={current ? toLegacyEvent(current) : null}
      fromUser={current ? toLegacyUser(current) : null}
      onClose={close}
    />
  );
}
