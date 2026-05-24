"use client";

import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import type { SentMessage, User } from "@/lib/types";
import { getFriendIds, getQueuedMessagesFrom, setStatus } from "@/lib/store";
import { useStore } from "@/lib/useStore";
import { SendingSMSOverlay } from "./SendingSMSOverlay";
import { LockOverlay } from "./LockOverlay";
import { HeartsOverlay } from "./HeartsOverlay";

export function StatusToggle({ user }: { user: User }) {
  const { store, update } = useStore();
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [pendingNote, setPendingNote] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [sendingBatchId, setSendingBatchId] = useState<string | null>(null);
  const [showLock, setShowLock] = useState(false);
  const [showHearts, setShowHearts] = useState(false);

  const isAvailable = user.status === "available";

  const sendingMessages = useMemo<SentMessage[]>(() => {
    if (!sendingBatchId || !store) return [];
    return store.sentMessages.filter(
      (m) => m.fromUserId === user.id && m.createdAt >= Number(sendingBatchId),
    );
  }, [sendingBatchId, store, user.id]);

  const flipToAvailable = () => {
    setShowNoteInput(true);
    setPendingNote(user.statusNote || "i'm around.");
  };

  const confirmAvailable = () => {
    const note = pendingNote.trim();
    const batchStartedAt = Date.now();
    update((prev) => setStatus(prev, user.id, "available", note));
    setShowNoteInput(false);
    setConfirming(false);
    setShowHearts(true);

    if (store && getFriendIds(store, user.id).length > 0) {
      setSendingBatchId(String(batchStartedAt));
    }
  };

  const flipToUnavailable = () => {
    update((prev) =>
      setStatus(prev, user.id, "unavailable", "back behind the curtain"),
    );
    setShowLock(true);
  };

  const friendCount = store ? getFriendIds(store, user.id).length : 0;
  const queuedCount = store ? getQueuedMessagesFrom(store, user.id).length : 0;

  return (
    <>
      <div
        className={`relative rounded-3xl p-6 transition ${
          isAvailable ? "card-available" : "card-glass"
        }`}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-[0.3em] text-muted">
              your status
            </div>
            <div className="mt-2 text-3xl font-bold tracking-tight">
              {isAvailable ? (
                <span className="gradient-text">available</span>
              ) : (
                <span className="text-foreground/90">unavailable</span>
              )}
            </div>
            {user.statusNote && (
              <div className="mt-1 text-sm italic text-muted">
                &ldquo;{user.statusNote}&rdquo;
              </div>
            )}
          </div>

          <div className="relative h-11 w-20 shrink-0">
            {isAvailable && (
              <span
                aria-hidden
                className="pulse-ring pointer-events-none absolute inset-0 rounded-full"
              />
            )}
            <motion.button
              whileTap={{ scale: 0.94 }}
              onClick={isAvailable ? flipToUnavailable : flipToAvailable}
              className={`relative h-11 w-20 overflow-hidden rounded-full transition-colors ${
                isAvailable
                  ? "bg-gradient-to-r from-accent to-accent-2 shadow-[0_0_20px_-2px_rgba(255,61,127,0.55)]"
                  : "border border-border bg-card-hover"
              }`}
              aria-label="toggle availability"
            >
              <motion.span
                animate={{ x: isAvailable ? 40 : 4 }}
                transition={{ type: "spring", stiffness: 320, damping: 34, mass: 0.9 }}
                className={`absolute top-1 left-0 flex h-9 w-9 items-center justify-center rounded-full shadow-md ${
                  isAvailable ? "bg-white text-accent" : "bg-foreground/90 text-background"
                }`}
              >
                {isAvailable ? <HeartGlyph /> : <LockGlyph />}
              </motion.span>
            </motion.button>
          </div>
        </div>

        <div className="mt-5 text-xs leading-relaxed text-muted">
          {isAvailable ? (
            <>
              your phone &amp; email are{" "}
              <span className="text-foreground">visible</span> to every Hey Next
              friend. flip off when you want the curtain back.
            </>
          ) : (
            <>
              friends can see you exist, not your number. flip to{" "}
              <span className="text-foreground">available</span> and they&apos;ll
              all get a real SMS with a link back to Hey Next.
            </>
          )}
        </div>

        {queuedCount > 0 && !sendingBatchId && (
          <div className="mt-4 rounded-xl border border-accent-2/30 bg-accent-2/5 p-3 text-xs text-muted">
            {queuedCount} SMS notification{queuedCount === 1 ? "" : "s"} still
            queued from a previous flip. they&apos;ll be retried next time you
            go available.
          </div>
        )}

        {showNoteInput && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="mt-5 space-y-3 overflow-hidden"
          >
            <div className="text-[10px] uppercase tracking-[0.25em] text-muted">
              note · everyone will see this
            </div>
            <input
              value={pendingNote}
              onChange={(e) => setPendingNote(e.target.value)}
              maxLength={80}
              placeholder="single now & curious"
              className="w-full rounded-xl border border-border bg-background/60 px-4 py-3 text-sm outline-none transition focus:border-accent focus:bg-background"
            />
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowNoteInput(false);
                  setConfirming(false);
                }}
                className="flex-1 rounded-full border border-border px-4 py-2.5 text-sm text-muted transition hover:bg-card-hover hover:text-foreground"
              >
                cancel
              </button>
              {!confirming ? (
                <button
                  onClick={() => setConfirming(true)}
                  className="flex-1 rounded-full bg-gradient-to-r from-accent to-accent-2 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_0_20px_-4px_rgba(255,61,127,0.6)] transition hover:opacity-95"
                >
                  go available →
                </button>
              ) : (
                <button
                  onClick={confirmAvailable}
                  className="flex-1 rounded-full bg-foreground px-4 py-2.5 text-sm font-semibold text-background transition hover:opacity-90"
                >
                  yes, tell everyone
                </button>
              )}
            </div>
            {confirming && (
              <div className="rounded-xl border border-accent/30 bg-accent/5 p-3 text-xs leading-relaxed text-muted">
                this will text{" "}
                <span className="text-foreground">
                  {friendCount} friend{friendCount === 1 ? "" : "s"}
                </span>{" "}
                that you&apos;re available, and reveal your phone &amp; email in
                the app. last chance to back out.
              </div>
            )}
          </motion.div>
        )}
      </div>

      <SendingSMSOverlay
        open={!!sendingBatchId && sendingMessages.length > 0}
        messages={sendingMessages}
        onClose={() => setSendingBatchId(null)}
      />

      <LockOverlay open={showLock} onDone={() => setShowLock(false)} />
      <HeartsOverlay open={showHearts} onDone={() => setShowHearts(false)} />
    </>
  );
}

function LockGlyph() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

function HeartGlyph() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M12 21s-7-4.35-9.5-9A5.5 5.5 0 0 1 12 6.5 5.5 5.5 0 0 1 21.5 12c-2.5 4.65-9.5 9-9.5 9z" />
    </svg>
  );
}
