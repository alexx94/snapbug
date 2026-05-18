import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function DELETE(_request: Request, context: { params: Promise<{ reportId: string; artifactId: string }> }) {
  const { reportId, artifactId } = await context.params;
  const supabase = await createClient();

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data: artifact } = await admin
    .from("report_artifacts")
    .select("id, report_id, storage_path, uploaded_by, is_primary, kind")
    .eq("id", artifactId)
    .eq("report_id", reportId)
    .single();

  if (!artifact) return NextResponse.json({ error: "Attachment not found" }, { status: 404 });
  if (artifact.is_primary) return NextResponse.json({ error: "Cannot delete the primary screenshot" }, { status: 403 });

  const { data: report } = await admin.from("reports").select("project_id").eq("id", reportId).single();
  if (!report) return NextResponse.json({ error: "Report not found" }, { status: 404 });

  const isUploader = artifact.uploaded_by === user.id;
  const { data: membership } = await admin
    .from("project_members")
    .select("role")
    .eq("project_id", report.project_id)
    .eq("user_id", user.id)
    .maybeSingle();

  const isOwner = membership?.role === "owner";
  if (!isUploader && !isOwner) return NextResponse.json({ error: "Only the uploader or project owner can delete attachments" }, { status: 403 });

  await admin.storage.from("report-artifacts").remove([artifact.storage_path]);
  const { error: deleteError } = await admin.from("report_artifacts").delete().eq("id", artifactId);

  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 400 });

  revalidatePath(`/reports/${reportId}`);
  revalidatePath(`/projects/${report.project_id}`);

  return NextResponse.json({ ok: true });
}
