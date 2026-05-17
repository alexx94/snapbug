import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { SNAPBUG_REPORT_PRIORITIES, SNAPBUG_REPORT_STATUSES } from "@snapbug/shared/types";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function PATCH(request: Request, context: { params: Promise<{ reportId: string }> }) {
  const { reportId } = await context.params;
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as { status?: string; priority?: string };
  const status = String(body.status || "");
  const priority = String(body.priority || "");

  if (
    !SNAPBUG_REPORT_STATUSES.includes(status as (typeof SNAPBUG_REPORT_STATUSES)[number]) ||
    !SNAPBUG_REPORT_PRIORITIES.includes(priority as (typeof SNAPBUG_REPORT_PRIORITIES)[number])
  ) {
    return NextResponse.json({ error: "Invalid status or priority" }, { status: 400 });
  }

  const { data: report } = await supabase.from("reports").select("id, project_id").eq("id", reportId).single();
  if (!report) return NextResponse.json({ error: "Report not found" }, { status: 404 });

  const admin = createAdminClient();
  const { error } = await admin.from("reports").update({ status, priority, updated_by: user.id }).eq("id", reportId);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  revalidatePath(`/reports/${reportId}`);
  revalidatePath(`/projects/${report.project_id}`);
  return NextResponse.json({ ok: true });
}
