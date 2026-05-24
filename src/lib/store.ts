"use client";

import { nanoid } from "nanoid";
import type {
  AvailabilityStatus,
  Friendship,
  FunLmaStore,
  Gender,
  RevealEvent,
  SentMessage,
  SentMessageStatus,
  User,
} from "./types";

// her: warm pinks/peaches/roses · him: cool blues/teals · they: violet/purple
const HUE_RANGES: Record<Gender, [number, number]> = {
  her: [330, 380],
  him: [190, 240],
  they: [265, 305],
};

export function pickAvatarHue(gender: Gender): number {
  const [lo, hi] = HUE_RANGES[gender];
  return Math.floor(lo + Math.random() * (hi - lo)) % 360;
}

const STORAGE_KEY = "funlma.v2";

const emptyStore: FunLmaStore = {
  users: {},
  friendships: [],
  events: [],
  sentMessages: [],
  activePersonaId: null,
};

function seedStore(): FunLmaStore {
  const aliceId = "u_alice";
  const bobId = "u_bob";
  const now = Date.now();
  const alice: User = {
    id: aliceId,
    handle: "alice",
    displayName: "Alice",
    email: "alice@example.com",
    phone: "+1 415 555 0101",
    bio: "into vintage cameras & dive bars. taken... for now.",
    avatarHue: 340,
    gender: "her",
    status: "unavailable",
    statusNote: "in a relationship",
    createdAt: now - 1000 * 60 * 60 * 24 * 30,
    statusChangedAt: now - 1000 * 60 * 60 * 24 * 30,
  };
  const bob: User = {
    id: bobId,
    handle: "bob",
    displayName: "Bob",
    email: "bob@example.com",
    phone: "+1 415 555 0199",
    bio: "tech, surf, slow mornings.",
    avatarHue: 210,
    gender: "him",
    status: "available",
    statusNote: "single & curious",
    createdAt: now - 1000 * 60 * 60 * 24 * 60,
    statusChangedAt: now - 1000 * 60 * 60 * 24 * 7,
  };
  const friendship: Friendship = {
    id: nanoid(10),
    userAId: aliceId,
    userBId: bobId,
    createdAt: now - 1000 * 60 * 60 * 24 * 14,
  };
  return {
    users: { [aliceId]: alice, [bobId]: bob },
    friendships: [friendship],
    events: [],
    sentMessages: [],
    activePersonaId: bobId,
  };
}

export function loadStore(): FunLmaStore {
  if (typeof window === "undefined") return emptyStore;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const seeded = seedStore();
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
      return seeded;
    }
    const parsed = JSON.parse(raw) as FunLmaStore;
    if (!parsed.users || !parsed.friendships || !parsed.events) {
      return emptyStore;
    }
    if (!parsed.sentMessages) parsed.sentMessages = [];
    for (const u of Object.values(parsed.users)) {
      if (!u.gender) u.gender = "they";
    }
    return parsed;
  } catch {
    return emptyStore;
  }
}

function notifyStoreChanged() {
  // Defer to a microtask so listeners (other useStore instances) don't fire
  // their setState while React is still inside the current render/commit phase.
  queueMicrotask(() => {
    window.dispatchEvent(new CustomEvent("funlma:store-changed"));
  });
}

export function saveStore(store: FunLmaStore) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  notifyStoreChanged();
}

export function resetStore(): FunLmaStore {
  if (typeof window === "undefined") return emptyStore;
  const seeded = seedStore();
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
  notifyStoreChanged();
  return seeded;
}

export function clearStore() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
  notifyStoreChanged();
}

export function createUser(input: {
  displayName: string;
  handle: string;
  email: string;
  phone: string;
  bio?: string;
  gender?: Gender;
  status?: AvailabilityStatus;
  statusNote?: string;
}): User {
  const now = Date.now();
  const gender = input.gender ?? "they";
  return {
    id: `u_${nanoid(8)}`,
    handle: input.handle.toLowerCase().replace(/[^a-z0-9_]/g, ""),
    displayName: input.displayName,
    email: input.email,
    phone: input.phone,
    bio: input.bio ?? "",
    avatarHue: pickAvatarHue(gender),
    gender,
    status: input.status ?? "unavailable",
    statusNote: input.statusNote ?? "",
    createdAt: now,
    statusChangedAt: now,
  };
}

export function upsertUser(store: FunLmaStore, user: User): FunLmaStore {
  return {
    ...store,
    users: { ...store.users, [user.id]: user },
  };
}

export function setActivePersona(
  store: FunLmaStore,
  userId: string | null,
): FunLmaStore {
  return { ...store, activePersonaId: userId };
}

export function getFriendIds(store: FunLmaStore, userId: string): string[] {
  return store.friendships
    .filter((f) => f.userAId === userId || f.userBId === userId)
    .map((f) => (f.userAId === userId ? f.userBId : f.userAId));
}

export function getFriends(store: FunLmaStore, userId: string): User[] {
  return getFriendIds(store, userId)
    .map((id) => store.users[id])
    .filter(Boolean);
}

export function areFriends(
  store: FunLmaStore,
  a: string,
  b: string,
): boolean {
  return store.friendships.some(
    (f) =>
      (f.userAId === a && f.userBId === b) ||
      (f.userAId === b && f.userBId === a),
  );
}

export function addFriendship(
  store: FunLmaStore,
  a: string,
  b: string,
): FunLmaStore {
  if (a === b) return store;
  if (areFriends(store, a, b)) return store;
  const friendship: Friendship = {
    id: nanoid(10),
    userAId: a,
    userBId: b,
    createdAt: Date.now(),
  };
  return { ...store, friendships: [...store.friendships, friendship] };
}

export function removeFriendship(
  store: FunLmaStore,
  a: string,
  b: string,
): FunLmaStore {
  return {
    ...store,
    friendships: store.friendships.filter(
      (f) =>
        !(
          (f.userAId === a && f.userBId === b) ||
          (f.userAId === b && f.userBId === a)
        ),
    ),
  };
}

export function setStatus(
  store: FunLmaStore,
  userId: string,
  status: AvailabilityStatus,
  note: string,
): FunLmaStore {
  const user = store.users[userId];
  if (!user) return store;
  const updated: User = {
    ...user,
    status,
    statusNote: note,
    statusChangedAt: Date.now(),
  };
  let next: FunLmaStore = {
    ...store,
    users: { ...store.users, [userId]: updated },
  };
  if (status === "available") {
    const friendIds = getFriendIds(store, userId);
    const now = Date.now();
    const newEvents: RevealEvent[] = friendIds.map((friendId) => ({
      id: `e_${nanoid(8)}`,
      fromUserId: userId,
      toUserId: friendId,
      newStatus: "available",
      note,
      createdAt: now,
      seen: false,
    }));
    const newMessages: SentMessage[] = friendIds.map((friendId) => {
      const friend = store.users[friendId];
      return {
        id: `m_${nanoid(8)}`,
        fromUserId: userId,
        toUserId: friendId,
        toPhone: friend?.phone ?? "",
        body: buildRevealSmsBody(user.displayName, friend?.displayName ?? "", note),
        status: "queued",
        createdAt: now,
      };
    });
    next = {
      ...next,
      events: [...store.events, ...newEvents],
      sentMessages: [...store.sentMessages, ...newMessages],
    };
  }
  return next;
}

export function buildRevealSmsBody(
  fromName: string,
  toName: string,
  note: string,
): string {
  const greeting = toName ? `Hey ${toName}` : "Hey";
  const tail = note ? ` "${note}"` : "";
  return `${greeting} — ${fromName} just flipped to available on Hey Next.${tail} Open the app to see their number.`;
}

export function updateMessageStatus(
  store: FunLmaStore,
  messageId: string,
  status: SentMessageStatus,
  error?: string,
): FunLmaStore {
  return {
    ...store,
    sentMessages: store.sentMessages.map((m) =>
      m.id === messageId ? { ...m, status, error } : m,
    ),
  };
}

export function getQueuedMessagesFrom(
  store: FunLmaStore,
  userId: string,
): SentMessage[] {
  return store.sentMessages.filter(
    (m) => m.fromUserId === userId && m.status === "queued",
  );
}

export function getMessagesFromUser(
  store: FunLmaStore,
  userId: string,
): SentMessage[] {
  return [...store.sentMessages]
    .filter((m) => m.fromUserId === userId)
    .sort((a, b) => b.createdAt - a.createdAt);
}

export function getUnseenEvents(
  store: FunLmaStore,
  userId: string,
): RevealEvent[] {
  return store.events.filter((e) => e.toUserId === userId && !e.seen);
}

export function markEventSeen(
  store: FunLmaStore,
  eventId: string,
): FunLmaStore {
  return {
    ...store,
    events: store.events.map((e) =>
      e.id === eventId ? { ...e, seen: true } : e,
    ),
  };
}

export function markAllSeen(store: FunLmaStore, userId: string): FunLmaStore {
  return {
    ...store,
    events: store.events.map((e) =>
      e.toUserId === userId ? { ...e, seen: true } : e,
    ),
  };
}
