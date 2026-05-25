"use client";

import Link from "next/link";
import { AvatarOrb } from "@/components/AvatarOrb";
import { useActiveUser } from "@/lib/useStore";
import { getMessagesFromUser } from "@/lib/store";
import type { SentMessage } from "@/lib/types";

function formatTime(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return new Date(ts).toLocaleDateString();
}

function statusLabel(m: SentMessage): { label: string; cls: string } {
  switch (m.status) {
    case "sent-real":
      return {
        label: "delivered",
        cls: "bg-available/15 text-available",
      };
    case "sent-demo":
      return {
        label: "demo",
        cls: "bg-accent-2/15 text-accent-2",
      };
    case "failed":
      return { label: "failed", cls: "bg-accent/15 text-accent" };
    case "queued":
    default:
      return { label: "queued", cls: "bg-border/40 text-muted" };
  }
}

export default function ActivityPage() {
  const { store, activeUser } = useActiveUser();
  if (!store || !activeUser) return null;
  const messages = getMessagesFromUser(store, activeUser.id);

  return (
    <div className="space-y-4 px-4 py-6">
      <header>
        <h1 className="text-2xl font-bold">activity</h1>
        <p className="text-sm text-muted">
          every reminder you&apos;ve sent. real SMS goes through Twilio when
          configured — otherwise stays in demo mode.
        </p>
      </header>

      {messages.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center">
          <div className="text-sm text-muted">
            no notifications sent yet. flip to{" "}
            <span className="text-available">available</span> and your friends
            will get a text.
          </div>
          <Link
            href="/app/demo"
            className="mt-4 inline-block rounded-full border border-border px-4 py-2 text-sm text-muted hover:border-accent hover:text-foreground"
          >
            ← back to profile
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {messages.map((m) => {
            const friend = store.users[m.toUserId];
            const status = statusLabel(m);
            return (
              <div
                key={m.id}
                className="rounded-2xl border border-border bg-card p-4"
              >
                <div className="flex items-start gap-3">
                  {friend ? (
                    <AvatarOrb user={friend} size={36} />
                  ) : (
                    <div className="h-9 w-9 rounded-full bg-border" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">
                          {friend?.displayName ?? "unknown"}
                        </div>
                        <div className="truncate font-mono text-[10px] text-muted">
                          {m.toPhone}
                        </div>
                      </div>
                      <div
                        className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider ${status.cls}`}
                      >
                        {status.label}
                      </div>
                    </div>
                    <div className="mt-2 rounded-xl bg-background/60 p-3 text-[13px] leading-snug">
                      {m.body}
                    </div>
                    <div className="mt-2 flex items-center justify-between text-[10px] text-muted">
                      <span>{formatTime(m.createdAt)}</span>
                      {m.error && (
                        <span className="ml-3 truncate italic">{m.error}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="rounded-2xl border border-dashed border-border p-4 text-xs text-muted">
        <div className="mb-1 font-medium text-foreground">demo vs real SMS</div>
        right now you&apos;re probably in <span className="text-accent-2">demo
        mode</span> — the API logs the message but doesn&apos;t actually send.
        Set <code className="font-mono">TWILIO_ACCOUNT_SID</code>,{" "}
        <code className="font-mono">TWILIO_AUTH_TOKEN</code>, and{" "}
        <code className="font-mono">TWILIO_FROM</code> in{" "}
        <code className="font-mono">.env.local</code> and restart{" "}
        <code className="font-mono">npm run dev</code> to send real texts. Note:
        555-prefixed test numbers are always skipped.
      </div>
    </div>
  );
}
