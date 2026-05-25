"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createProfile, type Gender } from "@/lib/db";

const GENDERS: Gender[] = ["her", "him", "they"];

const HUE_RANGES: Record<Gender, [number, number]> = {
  her: [330, 380],
  him: [190, 240],
  they: [265, 305],
};

function pickAvatarHue(gender: Gender): number {
  const [lo, hi] = HUE_RANGES[gender];
  return Math.floor(lo + Math.random() * (hi - lo)) % 360;
}

export type OnboardingState = { error?: string } | null;

export async function completeOnboarding(
  _prev: OnboardingState,
  formData: FormData,
): Promise<OnboardingState> {
  const displayName = String(formData.get("displayName") ?? "").trim();
  const handle = String(formData.get("handle") ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "");
  const email = String(formData.get("email") ?? "").trim();
  const bio = String(formData.get("bio") ?? "").trim();
  const gender = String(formData.get("gender") ?? "they") as Gender;

  if (!displayName) return { error: "pick a display name" };
  if (handle.length < 2 || handle.length > 30) {
    return { error: "handle must be 2–30 letters, numbers, or underscores" };
  }
  if (!GENDERS.includes(gender)) return { error: "pick your pronouns" };

  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  // Use the phone from the auth.user (set during OTP signup)
  const phone = auth.user.phone ? "+" + auth.user.phone : "";
  if (!phone) return { error: "no phone on auth user — sign out and try again" };

  const result = await createProfile(supabase, {
    handle,
    displayName,
    bio,
    avatarHue: pickAvatarHue(gender),
    gender,
    phone,
    email,
  });

  if (!result.ok) return { error: result.error };

  redirect("/app");
}
