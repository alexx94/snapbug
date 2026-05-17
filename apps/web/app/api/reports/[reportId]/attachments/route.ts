import { inferContentType, isAllowedAttachmentType, MAX_ATTACHMENT_BYTES, sanitizeFileName } from "@/lib/report-artifacts";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ reportId: string }> }) {
  const { reportId } = await context.params;
  const supabase = await createClient();

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: report, error: reportError } = await supabase.from("reports").select("id, project_id").eq("id", reportId).single();
  if (reportError || !report) return NextResponse.json({ error: "Report not found" }, { status: 404 });

  const formData = await request.formData();
  const displayName = String(formData.get("displayName") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Choose a file to upload" }, { status: 400 });
  }

  const safeName = sanitizeFileName(file.name || "attachment");
  const contentType = inferContentType(file.type, safeName);

  if (!isAllowedAttachmentType(contentType)) {
    return NextResponse.json({ error: "Unsupported file type" }, { status: 415 });
  }

  if (file.size > MAX_ATTACHMENT_BYTES) {
    return NextResponse.json({ error: "File is larger than 5MB" }, { status: 413 });
  }

  const storagePath = `${reportId}/attachments/${user.id}/${crypto.randomUUID()}-${safeName}`;
  const { data: artifact, error: insertError } = await supabase
    .from("report_artifacts")
    .insert({
      report_id: reportId,
      kind: "attachment",
      storage_path: storagePath,
      content_type: contentType,
      byte_size: file.size,
      display_name: displayName || safeName,
      description: description || null,
      position: Math.floor(Date.now() / 1000),
      is_primary: false,
      uploaded_by: user.id,
      metadata: {
        originalName: file.name
      }
    })
    .select("id")
    .single();

  if (insertError || !artifact) {
    return NextResponse.json({ error: insertError?.message || "Could not create attachment row" }, { status: 400 });
  }

  const { error: uploadError } = await supabase.storage.from("report-artifacts").upload(storagePath, file, {
    contentType,
    upsert: false
  });

  if (uploadError) {
    await supabase.from("report_artifacts").delete().eq("id", artifact.id);
    return NextResponse.json({ error: uploadError.message }, { status: 400 });
  }

  revalidatePath(`/reports/${reportId}`);
  revalidatePath(`/projects/${report.project_id}`);

  return NextResponse.json({ ok: true, artifactId: artifact.id });
}
