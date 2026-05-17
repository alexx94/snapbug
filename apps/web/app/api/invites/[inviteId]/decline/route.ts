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
    .select("id, project_id, email, token_hash, status")
    .eq("id", inviteId)
    .single();

  if (error || !invite) return NextResponse.json({ error: "Invite not found" }, { status: 404 });
  if (invite.email !== user.email.toLowerCase()) return NextResponse.json({ error: "Invite email does not match this account" }, { status: 403 });
  if (body.token && hashSecret(body.token) !== invite.token_hash) return NextResponse.json({ error: "Invalid invite token" }, { status: 403 });
  if (invite.status !== "pending") return NextResponse.json({ error: "Invite is no longer pending" }, { status: 400 });

  const { error: updateError } = await admin
    .from("project_invites")
    .update({ status: "declined", responded_at: new Date().toISOString() })
    .eq("id", inviteId)
    .eq("status", "pending");

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 400 });

  revalidatePath("/projects");
  revalidatePath(`/projects/${invite.project_id}`);
  return NextResponse.json({ ok: true });
}
