import { generateDeveloperToken, hashSecret } from "@/lib/crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as { name?: string };
  const name = String(body.name || "Development token").trim().slice(0, 120) || "Development token";
  const now = new Date().toISOString();
  const admin = createAdminClient();

  const { error: revokeError } = await admin
    .from("developer_tokens")
    .update({ revoked_at: now })
    .eq("user_id", user.id)
    .is("revoked_at", null);

  if (revokeError) {
    return NextResponse.json({ error: revokeError.message }, { status: 400 });
  }

  const token = generateDeveloperToken();
  const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await admin
    .from("developer_tokens")
    .insert({
      user_id: user.id,
      token_hash: hashSecret(token),
      name,
      expires_at: expiresAt
    })
    .select("id, name, last_used_at, expires_at, revoked_at, created_at")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message || "Could not regenerate developer token" }, { status: 400 });
  }

  revalidatePath("/projects", "layout");
  return NextResponse.json({ token, developerToken: data });
}
