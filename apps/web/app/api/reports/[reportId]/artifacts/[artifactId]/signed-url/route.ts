import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ reportId: string; artifactId: string }> }
) {
  const { reportId, artifactId } = await context.params;
  const supabase = await createClient();

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: artifact, error } = await supabase
    .from("report_artifacts")
    .select("id, report_id, storage_path")
    .eq("id", artifactId)
    .eq("report_id", reportId)
    .single();

  if (error || !artifact) {
    return NextResponse.json({ error: "Artifact not found" }, { status: 404 });
  }

  const admin = createAdminClient();
  const { data, error: signedError } = await admin.storage
    .from("report-artifacts")
    .createSignedUrl(artifact.storage_path, 60 * 10);

  if (signedError) {
    return NextResponse.json({ error: signedError.message }, { status: 500 });
  }

  return NextResponse.json({ signedUrl: data.signedUrl });
}
