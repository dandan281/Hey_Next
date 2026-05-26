"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type UpdateProfileState = { ok: boolean; error?: string } | null;

export async function updateProfile(
  _prev: UpdateProfileState,
  formData: FormData,
): Promise<UpdateProfileState> {
  const displayName = String(formData.get("displayName") ?? "").trim();
  const bio = String(formData.get("bio") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();

  if (!displayName || displayName.length > 60) {
    return { ok: false, error: "display name must be 1–60 characters" };
  }
  if (bio.length > 280) {
    return { ok: false, error: "bio too long" };
  }

  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, error: "not signed in" };

  const { error: profileError } = await supabase
    .from("profiles")
    .update({ display_name: displayName, bio })
    .eq("id", auth.user.id);

  if (profileError) return { ok: false, error: profileError.message };

  const { error: contactError } = await supabase
    .from("private_contacts")
    .update({ email })
    .eq("user_id", auth.user.id);

  if (contactError) return { ok: false, error: contactError.message };

  revalidatePath("/app");
  revalidatePath("/app/settings");
  return { ok: true };
}

export async function deleteAccount(formData: FormData): Promise<void> {
  const confirmation = String(formData.get("confirm") ?? "").trim();
  if (confirmation !== "delete") {
    redirect("/app/settings?error=confirm");
  }

  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  const userId = auth.user.id;
  const admin = createSupabaseAdminClient();

  // Cascade FKs (profiles.id -> auth.users(id) ON DELETE CASCADE, and
  // everything else cascades from profiles) means a single auth-user delete
  // tears down all the user's data.
  await admin.auth.admin.deleteUser(userId);

  await supabase.auth.signOut();
  redirect("/");
}
