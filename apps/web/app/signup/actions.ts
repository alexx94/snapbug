"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function signup(formData: FormData) {
  const email = String(formData.get("email") || "");
  const password = String(formData.get("password") || "");
  const confirmPassword = String(formData.get("confirmPassword") || "");

  const next = String(formData.get("next") || "");

  if (password !== confirmPassword) {
    const p = new URLSearchParams({ error: "Passwords do not match" });
    if (next) p.set("next", next);
    redirect(`/signup?${p}`);
  }

  if (password.length < 6) {
    const p = new URLSearchParams({ error: "Password must be at least 6 characters" });
    if (next) p.set("next", next);
    redirect(`/signup?${p}`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({ email, password });
  if (error) {
    const p = new URLSearchParams({ error: error.message });
    if (next) p.set("next", next);
    redirect(`/signup?${p}`);
  }

  revalidatePath("/projects", "layout");
  redirect(next && next.startsWith("/") ? next : "/projects?success=Account+created+successfully");
}
