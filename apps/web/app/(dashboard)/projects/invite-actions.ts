"use server";

import { hashSecret } from "@/lib/crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function acceptInviteAction(formData: FormData) {
  const inviteId = String(formData.get("inviteId") || "");
  const token = String(formData.get("token") || "");

  if (!inviteId || !token) redirect("/projects?error=Invalid+invite+link");

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user?.email) redirect("/login?next=" + encodeURIComponent(`/projects?invite=${inviteId}&token=${token}`));

  const admin = createAdminClient();
  const { data: invite } = await admin
    .from("project_invites")
    .select("id, project_id, email, token_hash, status, expires_at")
    .eq("id", inviteId)
    .single();

  if (!invite) redirect("/projects?error=Invite+not+found");
  if (invite.status !== "pending") redirect("/projects?error=Invite+is+no+longer+pending");
  if (new Date(invite.expires_at).getTime() <= Date.now()) redirect("/projects?error=Invite+has+expired");
  if (invite.email !== user.email.toLowerCase()) redirect("/projects?error=Invite+email+does+not+match+this+account");
  if (hashSecret(token) !== invite.token_hash) redirect("/projects?error=Invalid+invite+token");

  const { error: updateError } = await admin
    .from("project_invites")
    .update({ status: "accepted", responded_at: new Date().toISOString() })
    .eq("id", inviteId)
    .eq("status", "pending")
    .select("id")
    .single();

  if (updateError) redirect("/projects?error=Could+not+accept+invite");

  const { data: existing } = await admin
    .from("project_members")
    .select("role")
    .eq("project_id", invite.project_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!existing) {
    const { error: memberError } = await admin.from("project_members").insert({
      project_id: invite.project_id,
      user_id: user.id,
      role: "member"
    });
    if (memberError && memberError.code !== "23505") {
      redirect("/projects?error=" + encodeURIComponent(memberError.message));
    }
  }

  revalidatePath("/projects");
  revalidatePath(`/projects/${invite.project_id}`);
  redirect(`/projects/${invite.project_id}?success=Invite+accepted`);
}

export async function declineInviteAction(formData: FormData) {
  const inviteId = String(formData.get("inviteId") || "");
  const token = String(formData.get("token") || "");

  if (!inviteId || !token) redirect("/projects?error=Invalid+invite+link");

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user?.email) redirect("/login?next=" + encodeURIComponent(`/projects?invite=${inviteId}&token=${token}`));

  const admin = createAdminClient();
  const { data: invite } = await admin
    .from("project_invites")
    .select("id, email, token_hash, status, expires_at")
    .eq("id", inviteId)
    .single();

  if (!invite) redirect("/projects?error=Invite+not+found");
  if (invite.status !== "pending") redirect("/projects?error=Invite+is+no+longer+pending");
  if (invite.email !== user.email.toLowerCase()) redirect("/projects?error=Invite+email+does+not+match+this+account");
  if (hashSecret(token) !== invite.token_hash) redirect("/projects?error=Invalid+invite+token");

  const { error: updateError } = await admin
    .from("project_invites")
    .update({ status: "declined", responded_at: new Date().toISOString() })
    .eq("id", inviteId)
    .eq("status", "pending");

  if (updateError) redirect("/projects?error=Could+not+decline+invite");

  revalidatePath("/projects");
  redirect("/projects?success=Invite+declined");
}
