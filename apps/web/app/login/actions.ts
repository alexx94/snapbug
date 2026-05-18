"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function login(formData: FormData) {
  const supabase = await createClient();
  const email = String(formData.get("email") || "");
  const password = String(formData.get("password") || "");

  const next = String(formData.get("next") || "");

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    const loginParams = new URLSearchParams({ error: error.message });
    if (next) loginParams.set("next", next);
    redirect(`/login?${loginParams}`);
  }

  revalidatePath("/projects", "layout");
  redirect(next && next.startsWith("/") ? next : "/projects?success=Welcome+back");
}
