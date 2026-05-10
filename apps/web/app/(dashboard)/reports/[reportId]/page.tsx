import { updateReportAction } from "@/app/(dashboard)/actions";
import { ArtifactViewer } from "@/components/dashboard/artifact-viewer";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/fields";
import { Toast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function ReportPage({
  params,
  searchParams
}: {
  params: Promise<{ reportId: string }>;
  searchParams: Promise<{ success?: string }>;
}) {
  const { reportId } = await params;
  const query = await searchParams;
  const supabase = await createClient();

  const { data: report } = await supabase
    .from("reports")
    .select("id, project_id, environment, type, status, priority, title, message, reporter_name, page_url, user_agent, browser, viewport, metadata, origin, created_at")
    .eq("id", reportId)
    .single();

  if (!report) notFound();

  const { data: artifacts } = await supabase
    .from("report_artifacts")
    .select("id, kind, content_type, byte_size, created_at")
    .eq("report_id", reportId)
    .order("created_at");

  return (
    <main className="page">
      <Toast success={query.success} />
      <div className="page-header">
        <div>
          <h1 className="page-title">{report.title || report.message.slice(0, 90)}</h1>
          <p className="page-subtitle">
            <span className={report.environment === "development" ? "badge dev" : "badge prod"}>{report.environment}</span>{" "}
            <span className="badge">{report.type}</span>
          </p>
        </div>
        <Link className="button secondary" href={`/projects/${report.project_id}`}>
          Back to project
        </Link>
      </div>

      <section className="grid two">
        <Card>
          <CardTitle>Report</CardTitle>
          <div className="stack">
            <p>{report.message}</p>
            <div className="muted">Reporter: {report.reporter_name || "anonymous"}</div>
            <div className="muted">Page: {report.page_url}</div>
            <div className="muted">Origin: {report.origin}</div>
            <div className="muted">Created: {new Date(report.created_at).toLocaleString()}</div>
          </div>
        </Card>

        <Card>
          <CardTitle>Status</CardTitle>
          <form className="stack" action={updateReportAction}>
            <input type="hidden" name="reportId" value={report.id} />
            <label className="stack">
              <span className="muted">Status</span>
              <Select name="status" defaultValue={report.status}>
                <option value="open">Open</option>
                <option value="triaged">Triaged</option>
                <option value="in_progress">In progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </Select>
            </label>
            <label className="stack">
              <span className="muted">Priority</span>
              <Select name="priority" defaultValue={report.priority}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </Select>
            </label>
            <Button>Update</Button>
          </form>
        </Card>
      </section>

      <section className="grid two" style={{ marginTop: 16 }}>
        <Card>
          <CardTitle>Metadata</CardTitle>
          <pre className="code">
            {JSON.stringify(
              {
                browser: report.browser,
                viewport: report.viewport,
                metadata: report.metadata,
                userAgent: report.user_agent
              },
              null,
              2
            )}
          </pre>
        </Card>

        <Card>
          <CardTitle>Artifacts</CardTitle>
          <div className="stack">
            {(artifacts || []).length ? (
              artifacts?.map((artifact) => (
                <div className="stack" key={artifact.id}>
                  <div className="row between">
                    <strong>{artifact.kind}</strong>
                    <span className="muted">{Math.round((artifact.byte_size || 0) / 1024)} KB</span>
                  </div>
                  <ArtifactViewer artifact={artifact} reportId={report.id} />
                </div>
              ))
            ) : (
              <p className="muted">No artifacts saved.</p>
            )}
          </div>
        </Card>
      </section>
    </main>
  );
}
