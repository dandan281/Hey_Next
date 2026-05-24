"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { RevealEvent, User } from "@/lib/types";
import { AvatarOrb } from "./AvatarOrb";

type Props = {
  event: RevealEvent | null;
  fromUser: User | null;
  onClose: () => void;
};

export function RevealOverlay({ event, fromUser, onClose }: Props) {
  return (
    <AnimatePresence>
      {event && fromUser && (
        <motion.div
          key="reveal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{
            background:
              "radial-gradient(circle at center, rgba(255, 61, 127, 0.35), rgba(10, 10, 15, 0.95))",
            backdropFilter: "blur(20px)",
          }}
          onClick={onClose}
        >
          <motion.div
            key="reveal-card"
            initial={{ scale: 0.5, opacity: 0, y: 40 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 20 }}
            transition={{ type: "spring", stiffness: 220, damping: 22 }}
            className="relative w-full max-w-md rounded-3xl border border-border bg-card p-8 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.4 }}
              className="text-center text-xs uppercase tracking-[0.3em] text-muted"
            >
              status update
            </motion.div>

            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{
                delay: 0.3,
                type: "spring",
                stiffness: 220,
                damping: 18,
              }}
              className="mt-6 flex flex-col items-center"
            >
              <div className="relative">
                <motion.div
                  className="absolute inset-0 rounded-full"
                  style={{
                    background:
                      "radial-gradient(circle, rgba(255, 61, 127, 0.4), transparent 70%)",
                  }}
                  animate={{
                    scale: [1, 1.4, 1],
                    opacity: [0.6, 0, 0.6],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeOut",
                  }}
                />
                <AvatarOrb user={fromUser} size={96} />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.4 }}
              className="mt-6 text-center"
            >
              <div className="text-3xl font-bold tracking-tight">
                <span className="gradient-text">{fromUser.displayName}</span>{" "}
                <span className="text-foreground">is available.</span>
              </div>
              {event.note && (
                <div className="mt-2 text-sm italic text-muted">
                  &ldquo;{event.note}&rdquo;
                </div>
              )}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7, duration: 0.4 }}
              className="mt-8 space-y-3"
            >
              <ContactRow label="phone" value={fromUser.phone} type="tel" />
              <ContactRow label="email" value={fromUser.email} type="mailto" />
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.0, duration: 0.4 }}
              className="mt-8 text-center"
            >
              <button
                onClick={onClose}
                className="rounded-full bg-foreground px-6 py-3 text-sm font-medium text-background transition hover:opacity-90"
              >
                I got it
              </button>
              <div className="mt-3 text-xs text-muted">
                please reach out — but don&apos;t be weird about it
              </div>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function ContactRow({
  label,
  value,
  type,
}: {
  label: string;
  value: string;
  type: "tel" | "mailto";
}) {
  const href = `${type}:${value}`;
  return (
    <a
      href={href}
      className="flex items-center justify-between rounded-2xl border border-border bg-background/40 px-4 py-3 transition hover:border-accent hover:bg-card-hover"
    >
      <div>
        <div className="text-[10px] uppercase tracking-[0.2em] text-muted">
          {label}
        </div>
        <div className="font-mono text-sm">{value}</div>
      </div>
      <span className="text-xs text-accent">tap to {label === "phone" ? "call" : "email"}</span>
    </a>
  );
}
