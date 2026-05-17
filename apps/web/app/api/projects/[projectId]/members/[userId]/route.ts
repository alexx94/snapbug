import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function DELETE(_request: Request, context: { params: Promise<{ projectId: string; userId: string }> }) {
  const { projectId, userId } = await context.params;
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: project } = await supabase.from("projects").select("id, owner_id").eq("id", projectId).single();
  if (!project || project.owner_id !== user.id) {
    return NextResponse.json({ error: "Only the project owner can remove members" }, { status: 403 });
  }
  if (userId === project.owner_id) {
    return NextResponse.json({ error: "Project owner cannot be removed" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: member } = await admin
    .from("project_members")
    .select("role")
    .eq("project_id", projectId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!member) return NextResponse.json({ error: "Member not found" }, { status: 404 });
  if (member.role === "owner") return NextResponse.json({ error: "Project owner cannot be removed" }, { status: 400 });

  const { data: profile } = await admin.from("profiles").select("email").eq("id", userId).maybeSingle();
  const { error: deleteError } = await admin.from("project_members").delete().eq("project_id", projectId).eq("user_id", userId);
  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 400 });

  await admin.from("project_audit_events").insert({
    project_id: projectId,
    actor_user_id: user.id,
    actor_email: user.email || null,
    action: "team.member_removed",
    old_values: {
      user_id: userId,
      role: member.role,
      email: profile?.email || null
    }
  });

  revalidatePath(`/projects/${projectId}`);
  return NextResponse.json({ ok: true });
}
