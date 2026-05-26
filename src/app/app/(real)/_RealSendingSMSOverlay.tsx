"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AvatarOrb } from "@/components/AvatarOrb";
import type { RevealRecipient } from "./_actions";

type DeliveryStatus =
  | { status: "sending" }
  | { status: "sent-real" }
  | { status: "sent-demo"; reason?: string }
  | { status: "failed"; error: string };

type Props = {
  recipients: RevealRecipient[] | null;
  onClose: () => void;
};

export function RealSendingSMSOverlay({ recipients, onClose }: Props) {
  const router = useRouter();
  const [results, setResults] = useState<Record<string, DeliveryStatus>>({});
  const startedRef = useRef<string | null>(null);
  const open = !!recipients && recipients.length > 0;

  useEffect(() => {
    if (!recipients || recipients.length === 0) {
      startedRef.current = null;
      setResults({});
      return;
    }
    const key = recipients.map((r) => r.eventId).join(",");
    if (startedRef.current === key) return;
    startedRef.current = key;
    setResults(
      Object.fromEntries(
        recipients.map((r) => [r.eventId, { status: "sending" } as DeliveryStatus]),
      ),
    );

    let cancelled = false;

    (async () => {
      for (let i = 0; i < recipients.length; i++) {
        const r = recipients[i];
        await new Promise((res) => setTimeout(res, 350));
        if (cancelled) return;
        try {
          const resp = await fetch("/api/send-reveal-sms", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ revealEventId: r.eventId }),
          });
          const data = await resp.json();
          if (cancelled) return;

          let next: DeliveryStatus;
          if (!resp.ok || data.status === "failed") {
            next = {
              status: "failed",
              error: data.error ?? data.reason ?? "send failed",
            };
          } else if (data.mode === "real") {
            next = { status: "sent-real" };
          } else {
            next = { status: "sent-demo", reason: data.reason };
          }
          setResults((prev) => ({ ...prev, [r.eventId]: next }));
        } catch (e) {
          if (cancelled) return;
          setResults((prev) => ({
            ...prev,
            [r.eventId]: {
              status: "failed",
              error: e instanceof Error ? e.message : "network error",
            },
          }));
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [recipients]);

  const allDone =
    !!recipients &&
    recipients.length > 0 &&
    recipients.every((r) => {
      const s = results[r.eventId]?.status;
      return s && s !== "sending";
    });

  const realCount = recipients
    ? recipients.filter((r) => results[r.eventId]?.status === "sent-real").length
    : 0;
  const demoCount = recipients
    ? recipients.filter((r) => results[r.eventId]?.status === "sent-demo").length
    : 0;
  const failCount = recipients
    ? recipients.filter((r) => results[r.eventId]?.status === "failed").length
    : 0;
  const successCount = realCount + demoCount;

  const handleClose = () => {
    router.refresh();
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="sms-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-40 flex items-end justify-center bg-black/70 px-4 pb-6 backdrop-blur-md sm:items-center sm:pb-0"
          onClick={allDone ? handleClose : undefined}
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
                    ? `${successCount}/${recipients?.length ?? 0} delivered`
                    : `sending to ${recipients?.length ?? 0} ${
                        recipients?.length === 1 ? "person" : "people"
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
              {recipients?.map((r, idx) => (
                <SMSBubble
                  key={r.eventId}
                  index={idx}
                  recipient={r}
                  result={results[r.eventId]}
                />
              ))}
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
                  onClick={handleClose}
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
  recipient,
  result,
}: {
  index: number;
  recipient: RevealRecipient;
  result: DeliveryStatus | undefined;
}) {
  const [bubbleVisible, setBubbleVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setBubbleVisible(true), index * 200 + 100);
    return () => clearTimeout(t);
  }, [index]);

  // AvatarOrb takes a User-shape — synthesize the minimum it needs.
  const avatarUser = {
    displayName: recipient.toDisplayName,
    avatarHue: recipient.toAvatarHue,
    status: "unavailable" as const,
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
      className="rounded-2xl border border-border bg-background/60 p-3"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AvatarOrb user={avatarUser} size={26} />
          <div className="min-w-0">
            <div className="truncate text-xs font-medium">
              {recipient.toDisplayName}
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
              just flipped to available on Hey Next. open the app to see my
              number.
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {result?.status === "failed" && (
        <div className="mt-2 text-[10px] italic text-muted">{result.error}</div>
      )}
    </motion.div>
  );
}

function StatusBadge({ result }: { result: DeliveryStatus | undefined }) {
  if (!result || result.status === "sending") {
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
