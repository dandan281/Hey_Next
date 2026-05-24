"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import type { SentMessage, SentMessageStatus, User } from "@/lib/types";
import { updateMessageStatus } from "@/lib/store";
import { useStore } from "@/lib/useStore";
import { AvatarOrb } from "./AvatarOrb";

type Props = {
  open: boolean;
  messages: SentMessage[];
  onClose: () => void;
};

type Result = {
  status: SentMessageStatus;
  error?: string;
};

export function SendingSMSOverlay({ open, messages, onClose }: Props) {
  const { store, update } = useStore();
  const [results, setResults] = useState<Record<string, Result>>({});
  const startedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!open) {
      startedRef.current = null;
      setResults({});
      return;
    }
    const key = messages.map((m) => m.id).join(",");
    if (startedRef.current === key) return;
    startedRef.current = key;
    setResults({});

    let cancelled = false;

    (async () => {
      for (let i = 0; i < messages.length; i++) {
        const msg = messages[i];
        await new Promise((r) => setTimeout(r, 350));
        if (cancelled) return;
        try {
          const resp = await fetch("/api/send-reveal-sms", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ toPhone: msg.toPhone, message: msg.body }),
          });
          const data = await resp.json();
          if (cancelled) return;
          let status: SentMessageStatus;
          let error: string | undefined;
          if (!data.ok) {
            status = "failed";
            error = data.error ?? "send failed";
          } else if (data.mode === "real") {
            status = "sent-real";
          } else {
            status = "sent-demo";
            error = data.reason;
          }
          update((prev) => updateMessageStatus(prev, msg.id, status, error));
          setResults((prev) => ({ ...prev, [msg.id]: { status, error } }));
        } catch (e) {
          if (cancelled) return;
          const error = e instanceof Error ? e.message : "network error";
          update((prev) =>
            updateMessageStatus(prev, msg.id, "failed", error),
          );
          setResults((prev) => ({
            ...prev,
            [msg.id]: { status: "failed", error },
          }));
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, messages, update]);

  const allDone =
    messages.length > 0 &&
    messages.every((m) => results[m.id] !== undefined);
  const successCount = Object.values(results).filter(
    (r) => r.status === "sent-real" || r.status === "sent-demo",
  ).length;
  const realCount = Object.values(results).filter(
    (r) => r.status === "sent-real",
  ).length;
  const demoCount = Object.values(results).filter(
    (r) => r.status === "sent-demo",
  ).length;
  const failCount = Object.values(results).filter(
    (r) => r.status === "failed",
  ).length;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="sms-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-40 flex items-end justify-center bg-black/70 px-4 pb-6 backdrop-blur-md sm:items-center sm:pb-0"
          onClick={allDone ? onClose : undefined}
        >
          <motion.div
            key="sms-sheet"
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: "spring", stiffness: 220, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md overflow-hidden rounded-3xl border border-border bg-card shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div>
                <div className="text-[10px] uppercase tracking-[0.25em] text-muted">
                  notifying friends
                </div>
                <div className="mt-0.5 text-sm font-medium">
                  {allDone
                    ? `${successCount}/${messages.length} delivered`
                    : `sending to ${messages.length} ${
                        messages.length === 1 ? "person" : "people"
                      }...`}
                </div>
              </div>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-background">
                {!allDone ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                    className="h-4 w-4 rounded-full border-2 border-accent border-t-transparent"
                  />
                ) : (
                  <span className="text-available">✓</span>
                )}
              </div>
            </div>

            <div className="max-h-[55vh] space-y-3 overflow-y-auto px-5 py-4">
              {messages.map((msg, idx) => {
                const friend = store?.users[msg.toUserId];
                const result = results[msg.id];
                return (
                  <SMSBubble
                    key={msg.id}
                    index={idx}
                    friend={friend}
                    body={msg.body}
                    toPhone={msg.toPhone}
                    result={result}
                  />
                );
              })}
            </div>

            {allDone && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="border-t border-border bg-background/40 px-5 py-4"
              >
                <SummaryRow
                  realCount={realCount}
                  demoCount={demoCount}
                  failCount={failCount}
                />
                <button
                  onClick={onClose}
                  className="mt-3 w-full rounded-full bg-foreground py-3 text-sm font-medium text-background transition hover:opacity-90"
                >
                  done
                </button>
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function SMSBubble({
  index,
  friend,
  body,
  toPhone,
  result,
}: {
  index: number;
  friend: User | undefined;
  body: string;
  toPhone: string;
  result: Result | undefined;
}) {
  const [bubbleVisible, setBubbleVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setBubbleVisible(true), index * 200 + 100);
    return () => clearTimeout(t);
  }, [index]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
      className="rounded-2xl border border-border bg-background/60 p-3"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {friend ? (
            <AvatarOrb user={friend} size={26} />
          ) : (
            <div className="h-6 w-6 rounded-full bg-border" />
          )}
          <div className="min-w-0">
            <div className="truncate text-xs font-medium">
              {friend?.displayName ?? "unknown"}
            </div>
            <div className="truncate font-mono text-[10px] text-muted">
              {toPhone}
            </div>
          </div>
        </div>
        <StatusBadge result={result} />
      </div>

      <AnimatePresence>
        {bubbleVisible && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, x: 30 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 22 }}
            className="mt-2 flex justify-end"
          >
            <div className="max-w-[85%] rounded-2xl rounded-br-md bg-[#0a84ff] px-3 py-2 text-[13px] leading-snug text-white shadow-md">
              {body}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {result?.error && (
        <div className="mt-2 text-[10px] italic text-muted">{result.error}</div>
      )}
    </motion.div>
  );
}

function StatusBadge({ result }: { result: Result | undefined }) {
  if (!result) {
    return (
      <motion.div
        animate={{ opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 1.2, repeat: Infinity }}
        className="text-[10px] uppercase tracking-wider text-muted"
      >
        sending
      </motion.div>
    );
  }
  if (result.status === "sent-real") {
    return (
      <div className="rounded-full bg-available/15 px-2 py-0.5 text-[10px] uppercase tracking-wider text-available">
        sent
      </div>
    );
  }
  if (result.status === "sent-demo") {
    return (
      <div className="rounded-full bg-accent-2/15 px-2 py-0.5 text-[10px] uppercase tracking-wider text-accent-2">
        demo
      </div>
    );
  }
  return (
    <div className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] uppercase tracking-wider text-accent">
      failed
    </div>
  );
}

function SummaryRow({
  realCount,
  demoCount,
  failCount,
}: {
  realCount: number;
  demoCount: number;
  failCount: number;
}) {
  return (
    <div className="space-y-1 text-xs">
      {realCount > 0 && (
        <div className="flex items-center gap-2 text-available">
          <span>●</span>
          <span>
            {realCount} real SMS{realCount === 1 ? "" : "es"} delivered via
            Twilio
          </span>
        </div>
      )}
      {demoCount > 0 && (
        <div className="flex items-center gap-2 text-accent-2">
          <span>●</span>
          <span>
            {demoCount} in demo mode — set{" "}
            <code className="font-mono">TWILIO_*</code> env vars to send for
            real
          </span>
        </div>
      )}
      {failCount > 0 && (
        <div className="flex items-center gap-2 text-accent">
          <span>●</span>
          <span>{failCount} failed — see activity log</span>
        </div>
      )}
    </div>
  );
}
