import { ArtifactUploadModal } from "@/components/dashboard/artifact-upload-modal";
import { ArtifactViewer } from "@/components/dashboard/artifact-viewer";
import { MetadataPanel } from "@/components/dashboard/metadata-panel";
import { ReportStatusForm } from "@/components/dashboard/report-status-form";
import { Card, CardTitle } from "@/components/ui/card";
import { Toast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/server";
import { Download } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

type ArtifactRow = {
  id: string;
  kind: string;
  content_type: string;
  byte_size: number;
  created_at: string;
  display_name: string | null;
  description: string | null;
  is_primary: boolean;
  storage_path: string;
  uploaded_by: string | null;
  uploader_email?: string | null;
  signed_url?: string | null;
};

type AuditEvent = {
  id: string;
  action: string;
  actor_email: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  created_at: string;
};

export default async function ReportPage({
  params,
  searchParams
}: {
  params: Promise<{ reportId: string }>;
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  const { reportId } = await params;
  const query = await searchParams;
  const supabase = await createClient();

  const { data: report } = await supabase
    .from("reports")
    .select(
      "id, project_id, environment, type, status, priority, title, message, reporter_name, page_url, user_agent, browser, viewport, metadata, origin, created_at"
    )
    .eq("id", reportId)
    .single();

  if (!report) notFound();

  const { data: artifacts } = await supabase
    .from("report_artifacts")
    .select("id, kind, content_type, byte_size, created_at, display_name, description, is_primary, storage_path, uploaded_by")
    .eq("report_id", reportId)
    .order("is_primary", { ascending: false })
    .order("position", { ascending: true })
    .order("created_at");

  const artifactRowsWithUploaders = await attachUploaderEmails(supabase, (artifacts || []) as ArtifactRow[]);
  const artifactRows = await withSignedUrls(supabase, artifactRowsWithUploaders.sort((a, b) => Number(b.is_primary) - Number(a.is_primary)));
  const primaryArtifact = artifactRows.find((artifact) => artifact.is_primary) || artifactRows.find((artifact) => artifact.content_type.startsWith("image/"));
  const secondaryArtifacts = artifactRows.filter((artifact) => artifact.id !== primaryArtifact?.id);
  const { data: auditEvents } = await supabase
    .from("project_audit_events")
    .select("id, action, actor_email, old_values, new_values, created_at")
    .eq("report_id", reportId)
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <main className="page dashboard-page">
      <Toast success={query.success} error={query.error} />
      <div className="page-header dashboard-header">
        <div>
          <p className="eyebrow">{report.reporter_name || safeHost(report.page_url)}</p>
          <h1 className="page-title">{report.title || report.message.slice(0, 90)}</h1>
          <p className="page-subtitle">
            <span className={report.environment === "development" ? "badge dev" : "badge prod"}>{report.environment}</span>{" "}
            <span className={`badge type-${report.type}`}>{report.type}</span>{" "}
            <span className={`badge priority-${report.priority}`}>{report.priority}</span>
          </p>
        </div>
        <Link className="button secondary" href={`/projects/${report.project_id}?section=${report.environment}&status=open&sort=newest`}>
          Back to project
        </Link>
      </div>

      <section className="report-detail-layout">
        <div className="stack">
          <Card>
            <CardTitle>Report</CardTitle>
            <div className="report-summary">
              <p>{report.message}</p>
              <div className="metadata-grid compact">
                <div className="metadata-item">
                  <span>Reporter</span>
                  <strong title={report.reporter_name || "Anonymous"}>{report.reporter_name || "Anonymous"}</strong>
                </div>
                <div className="metadata-item">
                  <span>Page</span>
                  <strong title={report.page_url}>{report.page_url}</strong>
                </div>
                <div className="metadata-item">
                  <span>Origin</span>
                  <strong title={report.origin}>{report.origin}</strong>
                </div>
                <div className="metadata-item">
                  <span>Created</span>
                  <strong>{new Date(report.created_at).toLocaleString()}</strong>
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <div className="row between attachments-heading">
              <div>
                <CardTitle>Attachments</CardTitle>
                <p className="muted">Initial screenshot plus supporting files for this report.</p>
              </div>
              <ArtifactUploadModal reportId={report.id} />
            </div>

            {primaryArtifact ? (
              <div className="primary-attachment">
                <div className="row between artifact-card-header">
                  <div>
                    <strong>{primaryArtifact.display_name || "Initial screenshot"}</strong>
                    <p className="muted">
                      {formatBytes(primaryArtifact.byte_size || 0)} - {new Date(primaryArtifact.created_at).toLocaleString()}
                    </p>
                    <p className="muted">Uploaded by {primaryArtifact.uploader_email || "SnapBug"}</p>
                  </div>
                  {primaryArtifact.signed_url ? (
                    <a className="button secondary" href={primaryArtifact.signed_url} rel="noreferrer" target="_blank">
                      <Download size={16} />
                      Download
                    </a>
                  ) : null}
                </div>
                <ArtifactViewer artifact={toViewerArtifact(primaryArtifact)} initialUrl={primaryArtifact.signed_url} reportId={report.id} />
              </div>
            ) : (
              <div className="empty-state">
                <strong>No primary screenshot.</strong>
                <p className="muted">Add attachments to include screenshots, notes, JSON, or PDF documentation.</p>
              </div>
            )}

            {secondaryArtifacts.length ? (
              <div className="attachment-list">
                {secondaryArtifacts.map((artifact) => (
                  <div className="attachment-list-item" key={artifact.id}>
                    <div>
                      <strong>{artifact.display_name || artifact.kind}</strong>
                      {artifact.description ? <p className="muted">{artifact.description}</p> : null}
                      <span className="muted">
                        {artifact.content_type} - {formatBytes(artifact.byte_size || 0)} - {new Date(artifact.created_at).toLocaleString()}
                      </span>
                      <span className="muted">Uploaded by {artifact.uploader_email || "SnapBug"}</span>
                    </div>
                    {artifact.signed_url ? (
                      <a className="button secondary" href={artifact.signed_url} rel="noreferrer" target="_blank">
                        <Download size={16} />
                        Download
                      </a>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : null}
          </Card>
        </div>

        <aside className="stack">
          <Card>
            <CardTitle>Status</CardTitle>
            <ReportStatusForm priority={report.priority} reportId={report.id} status={report.status} />
          </Card>

          <Card>
            <CardTitle>Metadata</CardTitle>
            <MetadataPanel
              browser={report.browser}
              createdAt={report.created_at}
              metadata={report.metadata}
              origin={report.origin}
              pageUrl={report.page_url}
              userAgent={report.user_agent}
              viewport={report.viewport}
            />
          </Card>

          <Card>
            <CardTitle>Activity</CardTitle>
            <ActivityList events={(auditEvents || []) as AuditEvent[]} />
          </Card>
        </aside>
      </section>
    </main>
  );
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function safeHost(pageUrl: string) {
  try {
    return new URL(pageUrl).hostname;
  } catch {
    return pageUrl;
  }
}

async function withSignedUrls(supabase: Awaited<ReturnType<typeof createClient>>, artifacts: ArtifactRow[]) {
  if (!artifacts.length) return artifacts;

  return Promise.all(
    artifacts.map(async (artifact) => {
      const { data } = await supabase.storage.from("report-artifacts").createSignedUrl(artifact.storage_path, 60 * 10);
      return { ...artifact, signed_url: data?.signedUrl || null };
    })
  );
}

async function attachUploaderEmails(supabase: Awaited<ReturnType<typeof createClient>>, artifacts: ArtifactRow[]) {
  const uploaderIds = [...new Set(artifacts.map((artifact) => artifact.uploaded_by).filter(Boolean))] as string[];
  if (!uploaderIds.length) return artifacts;

  const { data: profiles } = await supabase.from("profiles").select("id, email").in("id", uploaderIds);
  return artifacts.map((artifact) => ({
    ...artifact,
    uploader_email: profiles?.find((profile) => profile.id === artifact.uploaded_by)?.email || null
  }));
}

function toViewerArtifact(artifact: ArtifactRow) {
  return {
    id: artifact.id,
    kind: artifact.kind,
    content_type: artifact.content_type,
    display_name: artifact.display_name
  };
}

function ActivityList({ events }: { events: AuditEvent[] }) {
  if (!events.length) return <p className="muted">No activity recorded yet.</p>;

  return (
    <div className="activity-list">
      {events.map((event) => (
        <div className="activity-item" key={event.id}>
          <strong>{activityLabel(event)}</strong>
          <p className="muted">
            {event.actor_email || "System"} - {new Date(event.created_at).toLocaleString()}
          </p>
        </div>
      ))}
    </div>
  );
}

function activityLabel(event: AuditEvent) {
  if (event.action === "report.status_updated") {
    const oldStatus = String(event.old_values?.status || "unknown").replace("_", " ");
    const newStatus = String(event.new_values?.status || "unknown").replace("_", " ");
    const oldPriority = String(event.old_values?.priority || "unknown");
    const newPriority = String(event.new_values?.priority || "unknown");
    if (oldStatus !== newStatus && oldPriority !== newPriority) return `Changed status to ${newStatus} and priority to ${newPriority}`;
    if (oldStatus !== newStatus) return `Changed status to ${newStatus}`;
    return `Changed priority to ${newPriority}`;
  }
  if (event.action === "artifact.uploaded") return `Uploaded ${String(event.new_values?.display_name || "attachment")}`;
  return event.action.replaceAll(".", " ").replaceAll("_", " ");
}
