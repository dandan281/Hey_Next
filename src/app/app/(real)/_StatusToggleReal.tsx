"use client";

import { motion } from "framer-motion";
import { useMemo, useState, useTransition } from "react";
import { flipAvailable, flipUnavailable, type RevealRecipient } from "./_actions";
import { RealSendingSMSOverlay } from "./_RealSendingSMSOverlay";
import { LockOverlay } from "@/components/LockOverlay";
import { HeartsOverlay } from "@/components/HeartsOverlay";
import { AvatarOrb } from "@/components/AvatarOrb";

// Multilingual flirt notes. EN + 中文 dominate; sprinkles of other languages
// for flavor. Each under 80 chars (DB constraint on status_note).
const TEASES = [
  // English (≈ half)
  "single now & curious",
  "miss me?",
  "back on the market",
  "feeling like causing problems",
  "ready to be a bad decision",
  "the door's unlocked",
  "lowkey looking",
  "between obligations",
  "available for poor decisions",
  "newly single, freshly chaotic",
  "in my villain era",
  "talk me out of this",
  "soft tonight",
  "i'm bored, fix it",
  "delete-my-number kind of free",
  "say something stupid to me",
  "the curtain's up",
  "tell me i'm pretty",
  "send help (with wine)",
  "in a 'fix me' mood",
  "i'm in the mood to be wrong",
  "softly haunting your DMs",
  "low effort, high crush",
  "running out of patience",
  "between situationships",
  "professionally indecisive",
  "free tonight, dangerous tomorrow",
  "trouble looking for company",
  "lonely & literate",
  "available for a bad idea",
  // 中文 (≈ a third)
  "今晚没人管我",
  "想找点麻烦",
  "翻牌子时间到了",
  "在线发疯",
  "门没锁",
  "暂时单身,谨慎下单",
  "想被人想",
  "今晚有空,看脸再说",
  "出来玩吗,不带钱包",
  "认识我吗?现在可以",
  "无所事事,等人来打扰",
  "今晚状态很好",
  "出来约一下?",
  "失恋治愈中,需要陪伴",
  "心情不错,要不约一下",
  "暂时离婚中",
  "营业时间到了",
  "想被宠",
  "约不约,在线等",
  "海后上线",
  // sprinkles
  "soltera y peligrosa", // ES
  "lista para problemas", // ES
  "célibataire ce soir", // FR
  "envie de bêtises", // FR
  "solteira por hoje", // PT
  "stasera libera", // IT
  "今夜は誰のものでもない", // JA
  "ヒマだから誘って", // JA
  "오늘 밤 자유", // KO
  "сегодня одна", // RU
];

function pickTease(excluding: string): string {
  const pool = TEASES.filter((t) => t !== excluding);
  return pool[Math.floor(Math.random() * pool.length)];
}

type FriendOption = {
  id: string;
  displayName: string;
  avatarHue: number;
  status: "available" | "unavailable";
};

type Props = {
  status: "available" | "unavailable";
  statusNote: string;
  friends: FriendOption[];
};

type AudienceMode = "all" | "selected";

export function StatusToggleReal({ status, statusNote, friends }: Props) {
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [pendingNote, setPendingNote] = useState("");
  const [audienceMode, setAudienceMode] = useState<AudienceMode>("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recipients, setRecipients] = useState<RevealRecipient[] | null>(null);
  const [showLock, setShowLock] = useState(false);
  const [showHearts, setShowHearts] = useState(false);
  const [isPending, startTransition] = useTransition();

  const isAvailable = status === "available";
  const friendCount = friends.length;

  const effectiveRecipientCount =
    audienceMode === "all" ? friendCount : selectedIds.size;

  const sortedFriends = useMemo(
    () =>
      [...friends].sort((a, b) => a.displayName.localeCompare(b.displayName)),
    [friends],
  );

  const onFlipAvailable = () => {
    setShowNoteInput(true);
    setPendingNote(statusNote || "i'm around.");
    setAudienceMode("all");
    setSelectedIds(new Set());
    setConfirming(false);
    setError(null);
  };

  const toggleFriend = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setConfirming(false);
  };

  const onConfirmAvailable = () => {
    if (audienceMode === "selected" && selectedIds.size === 0) {
      setError("select at least one friend, or switch to 'everyone'");
      setConfirming(false);
      return;
    }

    const note = pendingNote.trim();
    const formData = new FormData();
    formData.set("note", note);
    formData.set("mode", audienceMode);
    if (audienceMode === "selected") {
      formData.set("selectedIds", Array.from(selectedIds).join(","));
    }

    startTransition(async () => {
      const result = await flipAvailable(null, formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setShowNoteInput(false);
      setConfirming(false);
      setShowHearts(true);
      if (result.status === "available" && result.recipients.length > 0) {
        setRecipients(result.recipients);
      }
    });
  };

  const onFlipUnavailable = () => {
    setError(null);
    startTransition(async () => {
      const result = await flipUnavailable();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setShowLock(true);
    });
  };

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
            {statusNote && (
              <div className="mt-1 text-sm italic text-muted">
                &ldquo;{statusNote}&rdquo;
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
              onClick={isAvailable ? onFlipUnavailable : onFlipAvailable}
              disabled={isPending}
              className={`relative h-11 w-20 overflow-hidden rounded-full transition-colors disabled:opacity-60 ${
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

        {showNoteInput && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="mt-5 space-y-4 overflow-hidden"
          >
            {/* Note input + dice */}
            <div>
              <div className="text-[10px] uppercase tracking-[0.25em] text-muted">
                note ·{" "}
                {audienceMode === "all"
                  ? "everyone will see this"
                  : `${selectedIds.size} selected will see this`}
              </div>
              <div className="mt-2 flex items-center rounded-xl border border-border bg-background/60 pl-4 pr-1.5 transition focus-within:border-accent focus-within:bg-background">
                <input
                  value={pendingNote}
                  onChange={(e) => setPendingNote(e.target.value)}
                  maxLength={80}
                  placeholder="single now & curious"
                  className="w-full bg-transparent py-3 text-sm outline-none"
                />
                <button
                  type="button"
                  onClick={() => setPendingNote(pickTease(pendingNote))}
                  aria-label="roll a random tease"
                  title="roll a random tease"
                  className="group ml-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted transition hover:bg-card-hover hover:text-accent active:scale-90"
                >
                  <DiceIcon />
                </button>
              </div>
            </div>

            {/* Audience picker */}
            <div>
              <div className="text-[10px] uppercase tracking-[0.25em] text-muted">
                who sees this?
              </div>
              <div className="mt-2 flex gap-2">
                <AudienceButton
                  active={audienceMode === "all"}
                  onClick={() => {
                    setAudienceMode("all");
                    setConfirming(false);
                  }}
                >
                  everyone ({friendCount})
                </AudienceButton>
                <AudienceButton
                  active={audienceMode === "selected"}
                  onClick={() => {
                    setAudienceMode("selected");
                    setConfirming(false);
                  }}
                  disabled={friendCount === 0}
                >
                  just selected
                  {audienceMode === "selected" && selectedIds.size > 0 && (
                    <> ({selectedIds.size})</>
                  )}
                </AudienceButton>
              </div>

              {audienceMode === "selected" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="mt-3 max-h-56 space-y-1.5 overflow-y-auto rounded-xl border border-border bg-background/30 p-2"
                >
                  {sortedFriends.length === 0 ? (
                    <div className="px-2 py-3 text-center text-xs text-muted">
                      no friends yet
                    </div>
                  ) : (
                    sortedFriends.map((f) => {
                      const checked = selectedIds.has(f.id);
                      return (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => toggleFriend(f.id)}
                          className={`flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition ${
                            checked
                              ? "bg-accent/15"
                              : "hover:bg-card-hover"
                          }`}
                        >
                          <AvatarOrb user={f} size={32} />
                          <div className="min-w-0 flex-1 truncate text-sm">
                            {f.displayName}
                          </div>
                          <div
                            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition ${
                              checked
                                ? "border-accent bg-accent text-white"
                                : "border-border bg-background/60"
                            }`}
                          >
                            {checked && <CheckGlyph />}
                          </div>
                        </button>
                      );
                    })
                  )}
                </motion.div>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowNoteInput(false);
                  setConfirming(false);
                }}
                disabled={isPending}
                className="flex-1 rounded-full border border-border px-4 py-2.5 text-sm text-muted transition hover:bg-card-hover hover:text-foreground disabled:opacity-50"
              >
                cancel
              </button>
              {!confirming ? (
                <button
                  onClick={() => setConfirming(true)}
                  disabled={
                    isPending ||
                    (audienceMode === "selected" && selectedIds.size === 0)
                  }
                  className="flex-1 rounded-full bg-gradient-to-r from-accent to-accent-2 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_0_20px_-4px_rgba(255,61,127,0.6)] transition hover:opacity-95 disabled:opacity-40"
                >
                  go available →
                </button>
              ) : (
                <button
                  onClick={onConfirmAvailable}
                  disabled={isPending}
                  className="flex-1 rounded-full bg-foreground px-4 py-2.5 text-sm font-semibold text-background transition hover:opacity-90 disabled:opacity-60"
                >
                  {isPending
                    ? "flipping..."
                    : audienceMode === "all"
                      ? "yes, tell everyone"
                      : `yes, tell ${selectedIds.size}`}
                </button>
              )}
            </div>

            {/* No-take-backs warning at confirmation */}
            {confirming && (
              <div className="space-y-2">
                <div className="rounded-xl border border-accent/30 bg-accent/5 p-3 text-xs leading-relaxed text-muted">
                  this will text{" "}
                  <span className="text-foreground">
                    {effectiveRecipientCount} friend
                    {effectiveRecipientCount === 1 ? "" : "s"}
                  </span>{" "}
                  that you&apos;re available and reveal your phone &amp; email
                  to {audienceMode === "all" ? "them" : "the selected ones"} in
                  the app.
                </div>
                <div className="rounded-xl border border-accent/50 bg-accent/10 p-3 text-xs leading-relaxed">
                  <div className="flex items-center gap-1.5 text-accent">
                    <WarnGlyph />
                    <span className="font-semibold uppercase tracking-wider">
                      no take-backs
                    </span>
                  </div>
                  <div className="mt-1 text-foreground/80">
                    SMS can&apos;t be unsent. once they have your number, you
                    can&apos;t pull it back — flipping unavailable later locks
                    the app view but doesn&apos;t recall what already went out.
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {error && (
          <div className="mt-3 rounded-xl border border-accent/30 bg-accent/5 p-3 text-xs text-accent">
            {error}
          </div>
        )}
      </div>

      <RealSendingSMSOverlay
        recipients={recipients}
        onClose={() => setRecipients(null)}
      />

      <LockOverlay open={showLock} onDone={() => setShowLock(false)} />
      <HeartsOverlay open={showHearts} onDone={() => setShowHearts(false)} />
    </>
  );
}

function AudienceButton({
  active,
  children,
  onClick,
  disabled,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex-1 rounded-xl border px-3 py-2 text-sm transition ${
        active
          ? "border-accent bg-accent/10 text-foreground"
          : "border-border bg-background text-muted hover:border-accent/40 hover:text-foreground"
      } disabled:opacity-40 disabled:hover:border-border disabled:hover:text-muted`}
    >
      {children}
    </button>
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

function DiceIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="transition-transform group-hover:rotate-12 group-active:rotate-[-12deg]"
    >
      <rect x="3" y="3" width="18" height="18" rx="3.5" />
      <circle cx="8.5" cy="8.5" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="15.5" cy="8.5" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="8.5" cy="15.5" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="15.5" cy="15.5" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  );
}

function CheckGlyph() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M5 12l5 5L20 7" />
    </svg>
  );
}

function WarnGlyph() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 2L2 21h20L12 2z" />
      <line x1="12" y1="9" x2="12" y2="14" />
      <circle cx="12" cy="17.5" r="0.7" fill="currentColor" />
    </svg>
  );
}
