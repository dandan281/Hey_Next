"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo } from "react";

type Props = {
  open: boolean;
  onDone: () => void;
};

type Heart = {
  id: number;
  x: number;
  vx: number;
  vy: number;
  size: number;
  rotate: number;
  hue: number;
  delay: number;
  duration: number;
};

const COLORS = [
  "#ff3d7f",
  "#ff5a92",
  "#ff8a5b",
  "#ff6fb5",
  "#ffa8c7",
  "#ff4d6d",
];

function makeHearts(count: number): Heart[] {
  return Array.from({ length: count }, (_, i) => {
    const angle = (Math.PI * (0.2 + Math.random() * 0.6)) - Math.PI / 2;
    const speed = 180 + Math.random() * 320;
    return {
      id: i,
      x: (Math.random() - 0.5) * 80,
      vx: Math.cos(angle) * speed * (Math.random() < 0.5 ? -1 : 1),
      vy: -Math.abs(Math.sin(angle)) * speed - 200,
      size: 18 + Math.random() * 32,
      rotate: (Math.random() - 0.5) * 120,
      hue: Math.floor(Math.random() * COLORS.length),
      delay: Math.random() * 0.4,
      duration: 1.6 + Math.random() * 1.4,
    };
  });
}

export function HeartsOverlay({ open, onDone }: Props) {
  useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(onDone, 2600);
    return () => window.clearTimeout(id);
  }, [open, onDone]);

  const hearts = useMemo(() => (open ? makeHearts(36) : []), [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="hearts-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="pointer-events-none fixed inset-0 z-[60] overflow-hidden"
          style={{
            background:
              "radial-gradient(circle at 50% 60%, rgba(255, 61, 127, 0.25), rgba(8, 8, 13, 0.85) 70%)",
          }}
        >
          {/* center burst flash */}
          <motion.div
            className="absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{
              background:
                "radial-gradient(circle, rgba(255, 138, 91, 0.7), transparent 70%)",
            }}
            initial={{ scale: 0, opacity: 0.9 }}
            animate={{ scale: [0, 2.5, 3], opacity: [0.9, 0.4, 0] }}
            transition={{ duration: 1.2, ease: "easeOut" }}
          />

          {/* hearts */}
          <div className="absolute left-1/2 top-1/2">
            {hearts.map((h) => (
              <motion.div
                key={h.id}
                className="absolute"
                style={{ left: 0, top: 0 }}
                initial={{
                  x: h.x,
                  y: 0,
                  opacity: 0,
                  scale: 0.4,
                  rotate: 0,
                }}
                animate={{
                  x: h.x + h.vx,
                  y: h.vy,
                  opacity: [0, 1, 1, 0],
                  scale: [0.4, 1, 1, 0.8],
                  rotate: h.rotate,
                }}
                transition={{
                  duration: h.duration,
                  delay: h.delay,
                  ease: [0.2, 0.7, 0.4, 1],
                  times: [0, 0.2, 0.75, 1],
                }}
              >
                <HeartIcon size={h.size} color={COLORS[h.hue]} />
              </motion.div>
            ))}
          </div>

          {/* label */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
            className="absolute bottom-[22%] left-1/2 -translate-x-1/2 text-center"
          >
            <div className="text-[10px] uppercase tracking-[0.4em] text-muted">
              the door is open
            </div>
            <div className="mt-2 text-2xl font-semibold tracking-tight">
              <span className="gradient-text">you&rsquo;re available</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function HeartIcon({ size, color }: { size: number; color: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={color}
      aria-hidden
      style={{
        filter: `drop-shadow(0 0 6px ${color}80) drop-shadow(0 2px 4px rgba(0,0,0,0.3))`,
      }}
    >
      <path d="M12 21s-7-4.35-9.5-9A5.5 5.5 0 0 1 12 6.5 5.5 5.5 0 0 1 21.5 12c-2.5 4.65-9.5 9-9.5 9z" />
    </svg>
  );
}
