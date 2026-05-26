import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSentMessages, type SentMessage } from "@/lib/db";

export default async function ActivityPage() {
  const supabase = await createSupabaseServerClient();
  const messages = await getSentMessages(supabase);

  // Look up recipient display names via admin (RLS won't let us read arbitrary
  // recipients unless they're available to us).
  const toUserIds = Array.from(new Set(messages.map((m) => m.toUserId)));
  const nameByUserId = new Map<string, string>();

  if (toUserIds.length > 0) {
    const admin = createSupabaseAdminClient();
    const { data: profs } = await admin
      .from("profiles")
      .select("id, display_name")
      .in("id", toUserIds);
    for (const p of profs ?? []) nameByUserId.set(p.id, p.display_name);
  }

  const realCount = messages.filter((m) => m.status === "sent-real").length;
  const demoCount = messages.filter((m) => m.status === "sent-demo").length;
  const failCount = messages.filter((m) => m.status === "failed").length;

  return (
    <div className="space-y-4 px-4 py-6">
      <header>
        <h1 className="text-2xl font-bold">activity</h1>
        <p className="text-sm text-muted">
          every reveal SMS you&apos;ve sent. real, demo, or failed.
        </p>
      </header>

      {messages.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted">
          nothing here yet. flip to{" "}
          <span className="text-foreground">available</span> to send your first
          reveal.
        </div>
      ) : (
        <>
          <div className="flex gap-2 text-[10px] uppercase tracking-[0.15em]">
            {realCount > 0 && (
              <span className="rounded-full bg-available/15 px-2.5 py-1 text-available">
                {realCount} delivered
              </span>
            )}
            {demoCount > 0 && (
              <span className="rounded-full bg-accent-2/15 px-2.5 py-1 text-accent-2">
                {demoCount} demo
              </span>
            )}
            {failCount > 0 && (
              <span className="rounded-full bg-accent/15 px-2.5 py-1 text-accent">
                {failCount} failed
              </span>
            )}
          </div>

          <div className="space-y-3">
            {messages.map((m) => (
              <MessageRow
                key={m.id}
                message={m}
                recipientName={nameByUserId.get(m.toUserId) ?? "unknown"}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function MessageRow({
  message,
  recipientName,
}: {
  message: SentMessage;
  recipientName: string;
}) {
  const stamp = new Date(message.createdAt).toLocaleString();

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <div className="truncate text-sm font-medium">{recipientName}</div>
          <div className="truncate font-mono text-[10px] text-muted">
            {message.toPhone}
          </div>
        </div>
        <StatusBadge status={message.status} />
      </div>
      <div className="mt-2 rounded-xl border border-border bg-background/40 px-3 py-2 text-xs leading-snug text-foreground/90">
        {message.body}
      </div>
      <div className="mt-2 flex items-center justify-between text-[10px] uppercase tracking-wider text-muted">
        <span>{stamp}</span>
        {message.error && (
          <span className="italic normal-case text-accent/80">
            {message.error}
          </span>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: SentMessage["status"] }) {
  if (status === "sent-real") {
    return (
      <span className="rounded-full bg-available/15 px-2 py-0.5 text-[10px] uppercase tracking-wider text-available">
        sent
      </span>
    );
  }
  if (status === "sent-demo") {
    return (
      <span className="rounded-full bg-accent-2/15 px-2 py-0.5 text-[10px] uppercase tracking-wider text-accent-2">
        demo
      </span>
    );
  }
  if (status === "failed") {
    return (
      <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] uppercase tracking-wider text-accent">
        failed
      </span>
    );
  }
  return (
    <span className="rounded-full border border-border bg-background/40 px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted">
      queued
    </span>
  );
}
