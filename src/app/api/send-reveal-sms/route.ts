import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { buildRevealSmsBody } from "@/lib/db";

type Body = { revealEventId: string };

function normalizeE164(raw: string): string {
  const digits = raw.replace(/[^\d+]/g, "");
  return digits.startsWith("+") ? digits : `+${digits}`;
}

function isLikelyFictitious(e164: string): boolean {
  return /^\+1[2-9]\d{2}555\d{4}$/.test(e164);
}

type SendOutcome =
  | { status: "sent-real"; error: null }
  | { status: "sent-demo"; error: string }
  | { status: "failed"; error: string };

async function sendViaTwilio(
  toPhone: string,
  body: string,
): Promise<SendOutcome> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM;
  const e164 = normalizeE164(toPhone);

  if (!sid || !token || !from) {
    return {
      status: "sent-demo",
      error: "TWILIO_* env vars not configured",
    };
  }
  if (isLikelyFictitious(e164)) {
    return {
      status: "sent-demo",
      error: "555-prefixed reserved number — not sent",
    };
  }

  const params = new URLSearchParams({ To: e164, From: from, Body: body });
  const auth = Buffer.from(`${sid}:${token}`).toString("base64");

  try {
    const resp = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      },
    );
    const data = await resp.json();
    if (!resp.ok) {
      return {
        status: "failed",
        error: data.message ?? `twilio error ${data.code ?? resp.status}`,
      };
    }
    return { status: "sent-real", error: null };
  } catch (e) {
    return {
      status: "failed",
      error: e instanceof Error ? e.message : "twilio request failed",
    };
  }
}

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return Response.json({ ok: false, error: "invalid json" }, { status: 400 });
  }
  if (!body.revealEventId) {
    return Response.json(
      { ok: false, error: "missing revealEventId" },
      { status: 400 },
    );
  }

  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return Response.json({ ok: false, error: "not signed in" }, { status: 401 });
  }

  // Service-role for cross-user lookups (recipient phone is not readable by
  // sender via RLS — sender is the one going available, not the recipient).
  const admin = createSupabaseAdminClient();

  const { data: event, error: eventError } = await admin
    .from("reveal_events")
    .select("id, from_user_id, to_user_id, note")
    .eq("id", body.revealEventId)
    .maybeSingle();

  if (eventError || !event) {
    return Response.json(
      { ok: false, error: "reveal event not found" },
      { status: 404 },
    );
  }

  // Only the originator of a reveal can trigger SMS for it.
  if (event.from_user_id !== auth.user.id) {
    return Response.json(
      { ok: false, error: "not your reveal event" },
      { status: 403 },
    );
  }

  // Idempotency: if we already logged a sent_message for this event, return that.
  const { data: existing } = await admin
    .from("sent_messages")
    .select("id, status, error, to_phone")
    .eq("from_user_id", event.from_user_id)
    .eq("to_user_id", event.to_user_id)
    .gte("created_at", new Date(Date.now() - 60 * 60 * 1000).toISOString())
    .order("created_at", { ascending: false })
    .limit(1);

  if (existing && existing.length > 0 && existing[0].status !== "queued") {
    const prior = existing[0];
    return Response.json({
      ok: prior.status !== "failed",
      mode: prior.status === "sent-real" ? "real" : "demo",
      status: prior.status,
      reason: prior.error ?? undefined,
      idempotent: true,
    });
  }

  // Look up sender + recipient profiles + recipient phone.
  const { data: sender } = await admin
    .from("profiles")
    .select("display_name")
    .eq("id", event.from_user_id)
    .maybeSingle();

  const { data: recipient } = await admin
    .from("profiles")
    .select("display_name")
    .eq("id", event.to_user_id)
    .maybeSingle();

  const { data: recipientContact } = await admin
    .from("private_contacts")
    .select("phone")
    .eq("user_id", event.to_user_id)
    .maybeSingle();

  if (!recipient || !recipientContact?.phone) {
    return Response.json(
      { ok: false, error: "recipient has no phone on file" },
      { status: 422 },
    );
  }

  const message = buildRevealSmsBody(
    sender?.display_name ?? "someone",
    recipient.display_name ?? "",
    event.note ?? "",
  );
  const toPhone = recipientContact.phone;

  const outcome = await sendViaTwilio(toPhone, message);

  await admin.from("sent_messages").insert({
    from_user_id: event.from_user_id,
    to_user_id: event.to_user_id,
    to_phone: toPhone,
    body: message,
    status: outcome.status,
    error: outcome.error,
  });

  return Response.json({
    ok: outcome.status !== "failed",
    mode: outcome.status === "sent-real" ? "real" : "demo",
    status: outcome.status,
    reason: outcome.error ?? undefined,
  });
}
