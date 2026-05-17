import { hashSecret } from "@/lib/crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await context.params;
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: project } = await supabase.from("projects").select("id, owner_id").eq("id", projectId).single();
  if (!project || project.owner_id !== user.id) {
    return NextResponse.json({ error: "Only the project owner can invite members" }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as { email?: string };
  const email = String(body.email || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });
  }

  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const admin = createAdminClient();
  const { data: invite, error } = await admin
    .from("project_invites")
    .insert({
      project_id: projectId,
      email,
      token_hash: hashSecret(token),
      invited_by: user.id,
      expires_at: expiresAt
    })
    .select("id, email, status, expires_at, created_at")
    .single();

  if (error || !invite) {
    const message = error?.code === "23505" ? "This email already has a pending invite" : error?.message || "Could not create invite";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/projects");

  const inviteLink = `${new URL(request.url).origin}/projects?invite=${invite.id}&token=${encodeURIComponent(token)}`;
  return NextResponse.json({ invite, inviteLink }, { status: 201 });
}
