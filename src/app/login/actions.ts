"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type LoginState =
  | { stage: "phone"; error?: string }
  | { stage: "otp"; phone: string; error?: string };

function normalizePhone(raw: string): string | null {
  const cleaned = raw.replace(/[^\d+]/g, "");
  // Accept US-only at V1: must start with +1 and be 12 chars total, OR 10 digits we'll prefix.
  if (/^\+1\d{10}$/.test(cleaned)) return cleaned;
  if (/^1\d{10}$/.test(cleaned)) return "+" + cleaned;
  if (/^\d{10}$/.test(cleaned)) return "+1" + cleaned;
  return null;
}

export async function sendOtp(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const rawPhone = String(formData.get("phone") ?? "").trim();
  const phone = normalizePhone(rawPhone);
  if (!phone) {
    return {
      stage: "phone",
      error: "enter a US phone number — 10 digits or +1xxxxxxxxxx",
    };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithOtp({
    phone,
    options: { channel: "sms" },
  });

  if (error) {
    return { stage: "phone", error: error.message };
  }

  return { stage: "otp", phone };
}

export async function verifyOtp(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const phone = String(formData.get("phone") ?? "");
  const token = String(formData.get("token") ?? "").trim();

  if (!/^\d{6}$/.test(token)) {
    return { stage: "otp", phone, error: "enter the 6-digit code from the SMS" };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.verifyOtp({
    phone,
    token,
    type: "sms",
  });

  if (error) {
    return { stage: "otp", phone, error: error.message };
  }

  // The cookie is set on the response; redirect to onboarding (the layout will
  // route to /app if a profile already exists, /app/onboarding otherwise).
  redirect("/app");
}

export async function signOut() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}
