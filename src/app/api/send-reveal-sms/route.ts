type Body = {
  toPhone: string;
  message: string;
};

function normalizeE164(raw: string): string {
  const digits = raw.replace(/[^\d+]/g, "");
  return digits.startsWith("+") ? digits : `+${digits}`;
}

function isLikelyFictitious(e164: string): boolean {
  return /^\+1[2-9]\d{2}555\d{4}$/.test(e164);
}

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return Response.json({ ok: false, error: "invalid json" }, { status: 400 });
  }
  if (!body.toPhone || !body.message) {
    return Response.json(
      { ok: false, error: "missing toPhone or message" },
      { status: 400 },
    );
  }

  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM;
  const e164 = normalizeE164(body.toPhone);

  if (!sid || !token || !from) {
    return Response.json({
      ok: true,
      mode: "demo",
      reason: "TWILIO_ACCOUNT_SID/TWILIO_AUTH_TOKEN/TWILIO_FROM not configured",
      toPhone: e164,
      body: body.message,
    });
  }

  if (isLikelyFictitious(e164)) {
    return Response.json({
      ok: true,
      mode: "demo",
      reason: "555-prefixed reserved number — not sent",
      toPhone: e164,
      body: body.message,
    });
  }

  const params = new URLSearchParams({
    To: e164,
    From: from,
    Body: body.message,
  });

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
      return Response.json(
        {
          ok: false,
          mode: "real",
          error: data.message ?? "twilio error",
          twilioCode: data.code,
        },
        { status: 502 },
      );
    }
    return Response.json({
      ok: true,
      mode: "real",
      sid: data.sid,
      toPhone: e164,
    });
  } catch (e) {
    return Response.json(
      {
        ok: false,
        mode: "real",
        error: e instanceof Error ? e.message : "twilio request failed",
      },
      { status: 502 },
    );
  }
}
