import { hashSecret } from "@/lib/crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ inviteId: string }> }) {
  const { inviteId } = await context.params;
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as { token?: string };
  const admin = createAdminClient();
  const { data: invite, error } = await admin
    .from("project_invites")
    .select("id, project_id, email, token_hash, status, expires_at")
    .eq("id", inviteId)
    .single();

  if (error || !invite) return NextResponse.json({ error: "Invite not found" }, { status: 404 });
  if (invite.email !== user.email.toLowerCase()) return NextResponse.json({ error: "Invite email does not match this account" }, { status: 403 });
  if (body.token && hashSecret(body.token) !== invite.token_hash) return NextResponse.json({ error: "Invalid invite token" }, { status: 403 });
  if (invite.status !== "pending") return NextResponse.json({ error: "Invite is no longer pending" }, { status: 400 });
  if (new Date(invite.expires_at).getTime() <= Date.now()) return NextResponse.json({ error: "Invite has expired" }, { status: 400 });

  const { data: updated, error: updateError } = await admin
    .from("project_invites")
    .update({ status: "accepted", responded_at: new Date().toISOString() })
    .eq("id", inviteId)
    .eq("status", "pending")
    .select("id")
    .single();

  if (updateError || !updated) return NextResponse.json({ error: "Invite could not be accepted" }, { status: 400 });

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
      return NextResponse.json({ error: memberError.message }, { status: 400 });
    }
  }

  revalidatePath("/projects");
  revalidatePath(`/projects/${invite.project_id}`);
  return NextResponse.json({ ok: true, projectId: invite.project_id });
}
