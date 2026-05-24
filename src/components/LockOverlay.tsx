"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect } from "react";

type Props = {
  open: boolean;
  onDone: () => void;
};

export function LockOverlay({ open, onDone }: Props) {
  useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(onDone, 1800);
    return () => window.clearTimeout(id);
  }, [open, onDone]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="lock-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[60] flex items-center justify-center"
          style={{
            background:
              "radial-gradient(circle at center, rgba(20, 20, 30, 0.92), rgba(8, 8, 13, 0.98))",
            backdropFilter: "blur(16px)",
          }}
        >
          <motion.div
            key="lock-icon"
            initial={{ y: -220, scale: 0.7, opacity: 0, rotate: -8 }}
            animate={{ y: 0, scale: 1, opacity: 1, rotate: 0 }}
            exit={{ y: 30, scale: 0.9, opacity: 0 }}
            transition={{
              type: "spring",
              stiffness: 180,
              damping: 14,
              mass: 1.1,
            }}
            className="relative"
          >
            <motion.div
              aria-hidden
              className="absolute inset-0 rounded-full blur-3xl"
              style={{
                background:
                  "radial-gradient(circle, rgba(180, 180, 200, 0.25), transparent 70%)",
              }}
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1.8, ease: "easeOut" }}
            />
            <LockIcon />
          </motion.div>

          <motion.div
            key="lock-label"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45, duration: 0.4 }}
            className="absolute bottom-[28%] text-center"
          >
            <div className="text-[10px] uppercase tracking-[0.4em] text-muted">
              curtain drawn
            </div>
            <div className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
              you&rsquo;re unavailable
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function LockIcon() {
  return (
    <svg
      width="160"
      height="200"
      viewBox="0 0 160 200"
      fill="none"
      aria-hidden
    >
      <defs>
        <linearGradient id="lock-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3a3a48" />
          <stop offset="100%" stopColor="#1c1c26" />
        </linearGradient>
        <linearGradient id="lock-shackle" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#c4c4cc" />
          <stop offset="100%" stopColor="#6d7280" />
        </linearGradient>
      </defs>

      {/* shackle */}
      <motion.path
        d="M 45 95 L 45 60 a 35 35 0 0 1 70 0 L 115 95"
        stroke="url(#lock-shackle)"
        strokeWidth="14"
        strokeLinecap="round"
        fill="none"
        initial={{ pathLength: 0, opacity: 0.4 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ delay: 0.15, duration: 0.5, ease: "easeOut" }}
      />

      {/* body */}
      <motion.rect
        x="20"
        y="85"
        width="120"
        height="100"
        rx="16"
        fill="url(#lock-body)"
        stroke="#3a3a48"
        strokeWidth="2"
        initial={{ scaleY: 0.6, originY: 1, opacity: 0 }}
        animate={{ scaleY: 1, opacity: 1 }}
        transition={{ delay: 0.05, duration: 0.35, ease: "easeOut" }}
      />

      {/* keyhole */}
      <motion.g
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.55, type: "spring", stiffness: 220, damping: 16 }}
        style={{ transformOrigin: "80px 135px" }}
      >
        <circle cx="80" cy="128" r="10" fill="#0a0a0f" />
        <rect x="76" y="135" width="8" height="22" rx="2" fill="#0a0a0f" />
      </motion.g>

      {/* click flash */}
      <motion.circle
        cx="80"
        cy="135"
        r="60"
        fill="white"
        initial={{ opacity: 0, scale: 0.4 }}
        animate={{ opacity: [0, 0.25, 0], scale: [0.4, 1.3, 1.3] }}
        transition={{ delay: 0.55, duration: 0.6, ease: "easeOut" }}
      />
    </svg>
  );
}
