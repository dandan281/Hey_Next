"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function addFromPublicProfile(otherUserId: string): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  if (auth.user.id === otherUserId) {
    redirect("/app");
  }

  const [a, b] =
    auth.user.id < otherUserId
      ? [auth.user.id, otherUserId]
      : [otherUserId, auth.user.id];

  await supabase.from("friendships").insert({ user_a: a, user_b: b });
  // 23505 (already friends) is fine — we still want to land on /app/friends

  revalidatePath("/app/friends");
  redirect("/app/friends");
}
