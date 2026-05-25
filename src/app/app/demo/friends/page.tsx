"use client";

import Link from "next/link";
import { FriendCard } from "@/components/FriendCard";
import { useActiveUser } from "@/lib/useStore";
import { getFriends, removeFriendship } from "@/lib/store";

export default function FriendsPage() {
  const { store, activeUser, update } = useActiveUser();
  if (!activeUser || !store) return null;
  const friends = getFriends(store, activeUser.id).sort((a, b) => {
    if (a.status !== b.status) return a.status === "available" ? -1 : 1;
    return a.displayName.localeCompare(b.displayName);
  });

  return (
    <div className="space-y-4 px-4 py-6">
      <header>
        <h1 className="text-2xl font-bold">friends</h1>
        <p className="text-sm text-muted">
          everyone you&apos;ve traded Hey Next with. their contact info is
          hidden until they flip to{" "}
          <span className="text-available">available</span>.
        </p>
      </header>

      {friends.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center">
          <div className="text-sm text-muted">
            no friends yet. give someone your Hey Next.
          </div>
          <Link
            href="/app/demo/add"
            className="mt-4 inline-block rounded-full bg-gradient-to-r from-accent to-accent-2 px-5 py-2 text-sm font-medium text-white"
          >
            + add friend
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {friends.map((f) => (
            <FriendCard
              key={f.id}
              friend={f}
              onRemove={() => {
                if (confirm(`unfriend ${f.displayName}?`)) {
                  update((prev) => removeFriendship(prev, activeUser.id, f.id));
                }
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
