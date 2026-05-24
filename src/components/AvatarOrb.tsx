"use client";

import type { User } from "@/lib/types";

type Props = {
  user: Pick<User, "displayName" | "avatarHue" | "status">;
  size?: number;
  showStatus?: boolean;
  glow?: boolean;
};

export function AvatarOrb({ user, size = 48, showStatus = false, glow = false }: Props) {
  const initials = user.displayName
    .split(" ")
    .map((s) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const hue = user.avatarHue;
  const bg = `linear-gradient(135deg, hsl(${hue} 80% 55%), hsl(${(hue + 50) % 360} 80% 45%))`;
  const isAvailable = user.status === "available";
  const showGlow = glow && isAvailable;

  return (
    <div className="relative inline-block" style={{ width: size, height: size }}>
      {showGlow && (
        <span
          aria-hidden
          className="pulse-ring absolute inset-0 rounded-full"
          style={{ boxShadow: "0 0 0 0 rgba(255, 61, 127, 0.5)" }}
        />
      )}
      <div
        className="rounded-full flex items-center justify-center font-semibold text-white"
        style={{
          width: size,
          height: size,
          background: bg,
          fontSize: size * 0.35,
          boxShadow: showGlow
            ? "0 0 24px -4px rgba(255, 61, 127, 0.55), 0 8px 20px -8px rgba(0,0,0,0.6)"
            : "0 8px 20px -8px rgba(0,0,0,0.6)",
        }}
      >
        {initials}
      </div>
      {showStatus && (
        <span
          className="absolute bottom-0 right-0 rounded-full ring-2 ring-background"
          style={{
            width: size * 0.28,
            height: size * 0.28,
            backgroundColor: isAvailable
              ? "var(--color-available)"
              : "var(--color-unavailable)",
          }}
          aria-label={user.status}
        />
      )}
    </div>
  );
}
