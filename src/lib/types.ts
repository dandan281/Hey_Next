export type AvailabilityStatus = "unavailable" | "available";

export type Gender = "her" | "him" | "they";

export type User = {
  id: string;
  handle: string;
  displayName: string;
  email: string;
  phone: string;
  bio: string;
  avatarHue: number;
  gender: Gender;
  status: AvailabilityStatus;
  statusNote: string;
  createdAt: number;
  statusChangedAt: number;
};

export type Friendship = {
  id: string;
  userAId: string;
  userBId: string;
  createdAt: number;
};

export type RevealEvent = {
  id: string;
  fromUserId: string;
  toUserId: string;
  newStatus: AvailabilityStatus;
  note: string;
  createdAt: number;
  seen: boolean;
};

export type SentMessageStatus = "queued" | "sent-real" | "sent-demo" | "failed";

export type SentMessage = {
  id: string;
  fromUserId: string;
  toUserId: string;
  toPhone: string;
  body: string;
  status: SentMessageStatus;
  error?: string;
  createdAt: number;
};

export type FunLmaStore = {
  users: Record<string, User>;
  friendships: Friendship[];
  events: RevealEvent[];
  sentMessages: SentMessage[];
  activePersonaId: string | null;
};
