"use client";

type Props = {
  size?: number;
  className?: string;
};

export function BrokenHeart({ size = 28, className }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <defs>
        <linearGradient id="bh-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ff77a8" />
          <stop offset="60%" stopColor="#ff3d7f" />
          <stop offset="100%" stopColor="#e02468" />
        </linearGradient>
        <linearGradient id="bh-shine" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* LEFT HALF of heart */}
      <path
        d="M32 18
           C 28 8, 12 8, 8 20
           C 6 28, 12 38, 24 48
           L 28 52
           L 30 44
           L 26 38
           L 30 34
           L 26 28
           L 30 24
           L 28 18
           Z"
        fill="url(#bh-fill)"
        stroke="#1a0612"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />

      {/* RIGHT HALF of heart (offset slightly to show the break) */}
      <path
        d="M34 18
           C 38 8, 54 8, 58 20
           C 60 28, 54 38, 42 48
           L 38 52
           L 34 44
           L 38 38
           L 34 34
           L 38 28
           L 34 24
           L 36 18
           Z"
        fill="url(#bh-fill)"
        stroke="#1a0612"
        strokeWidth="2.2"
        strokeLinejoin="round"
        transform="translate(1.5 1)"
      />

      {/* shine highlight on the left half — cartoon style */}
      <ellipse
        cx="16"
        cy="20"
        rx="4"
        ry="6"
        fill="url(#bh-shine)"
        transform="rotate(-25 16 20)"
      />
    </svg>
  );
}

export function Wordmark({
  text = "Hey Next",
  className = "",
}: {
  text?: string;
  className?: string;
}) {
  return (
    <span
      className={`font-bold tracking-[0.06em] ${className}`}
      style={{ fontFeatureSettings: '"ss01"' }}
    >
      {text}
    </span>
  );
}

export function LogoLockup({
  size = 28,
  text = "Hey Next",
  className = "",
}: {
  size?: number;
  text?: string;
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <BrokenHeart size={size} />
      <Wordmark text={text} className="text-lg" />
    </span>
  );
}
