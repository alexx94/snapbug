"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function updateProfile(formData: FormData) {
  const fullName = String(formData.get("fullName") || "").trim();

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { error } = await supabase
    .from("profiles")
    .update({ full_name: fullName || null, updated_at: new Date().toISOString() })
    .eq("id", user.id);

  if (error) redirect(`/settings?error=${encodeURIComponent(error.message)}`);

  revalidatePath("/settings");
  revalidatePath("/projects", "layout");
  redirect("/settings?success=Profile+updated");
}

export async function changePassword(formData: FormData) {
  const newPassword = String(formData.get("newPassword") || "");
  const confirmPassword = String(formData.get("confirmPassword") || "");

  if (newPassword.length < 6) {
    redirect(`/settings?error=${encodeURIComponent("Password must be at least 6 characters")}`);
  }

  if (newPassword !== confirmPassword) {
    redirect(`/settings?error=${encodeURIComponent("Passwords do not match")}`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: newPassword });

  if (error) redirect(`/settings?error=${encodeURIComponent(error.message)}`);

  redirect("/settings?success=Password+changed+successfully");
}
