import { addOriginAction, deleteOriginAction } from "@/app/(dashboard)/actions";
import { KeyManager } from "@/components/dashboard/key-manager";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/fields";
import { Toast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/server";
import { SNAPBUG_REPORT_STATUSES, SNAPBUG_REPORT_TYPES, type SnapBugEnvironment } from "@snapbug/shared/types";
import Link from "next/link";
import { notFound } from "next/navigation";

type ProjectSection = "development" | "production" | "config";
type ReportRow = {
  id: string;
  environment: string;
  type: string;
  status: string;
  priority: string;
  title: string | null;
  message: string;
  reporter_name: string | null;
  page_url: string;
  created_at: string;
  updated_at: string | null;
};

export default async function ProjectPage({
  params,
  searchParams
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ section?: string; type?: string; status?: string; success?: string; error?: string }>;
}) {
  const { projectId } = await params;
  const query = await searchParams;
  const section = normalizeSection(query.section);
  const supabase = await createClient();

  const { data: project } = await supabase.from("projects").select("id, name, slug").eq("id", projectId).single();
  if (!project) notFound();

  const [{ data: keys }, { data: origins }, { data: reportStats }] = await Promise.all([
    supabase.from("project_keys").select("id, environment, key_value, key_prefix, enabled, last_used_at").eq("project_id", projectId),
    supabase.from("project_origins").select("id, environment, origin, enabled").eq("project_id", projectId).order("environment"),
    supabase.from("reports").select("environment, type, status").eq("project_id", projectId)
  ]);

  const reportEnvironment: SnapBugEnvironment = section === "production" ? "production" : "development";
  const selectedType: string =
    query.type && SNAPBUG_REPORT_TYPES.includes(query.type as (typeof SNAPBUG_REPORT_TYPES)[number]) ? query.type : "all";
  const selectedStatus: string =
    query.status && SNAPBUG_REPORT_STATUSES.includes(query.status as (typeof SNAPBUG_REPORT_STATUSES)[number]) ? query.status : "all";

  let reports: ReportRow[] = [];
  if (section !== "config") {
    let reportQuery = supabase
      .from("reports")
      .select("id, environment, type, status, priority, title, message, reporter_name, page_url, created_at, updated_at")
      .eq("project_id", projectId)
      .eq("environment", reportEnvironment)
      .order("created_at", { ascending: false })
      .limit(150);

    if (selectedType !== "all") reportQuery = reportQuery.eq("type", selectedType);
    if (selectedStatus !== "all") reportQuery = reportQuery.eq("status", selectedStatus);

    const { data } = await reportQuery;
    reports = data || [];
  }

  const counts = buildCounts(reportStats || []);

  return (
    <main className="page">
      <Toast success={query.success} error={query.error} />
      <div className="page-header">
        <div>
          <h1 className="page-title">{project.name}</h1>
          <p className="page-subtitle">Reports are split by runtime environment; keys and origins live in config.</p>
        </div>
        <Link className="button secondary" href="/projects">
          Back
        </Link>
      </div>

      <nav className="tabs" aria-label="Project sections">
        <Link className={section === "development" ? "active" : ""} href={`/projects/${projectId}?section=development`}>
          Development reports
          <span>{counts.development.total}</span>
        </Link>
        <Link className={section === "production" ? "active" : ""} href={`/projects/${projectId}?section=production`}>
          Production reports
          <span>{counts.production.total}</span>
        </Link>
        <Link className={section === "config" ? "active" : ""} href={`/projects/${projectId}?section=config`}>
          Config
        </Link>
      </nav>

      {section === "config" ? (
        <ConfigSection projectId={projectId} keys={keys || []} origins={origins || []} />
      ) : (
        <ReportsSection
          projectId={projectId}
          environment={reportEnvironment}
          reports={reports}
          selectedType={selectedType}
          selectedStatus={selectedStatus}
          counts={counts[reportEnvironment]}
        />
      )}
    </main>
  );
}

function ConfigSection({
  projectId,
  keys,
  origins
}: {
  projectId: string;
  keys: Array<{
    id: string;
    environment: string;
    key_value: string | null;
    key_prefix: string;
    enabled: boolean;
    last_used_at: string | null;
  }>;
  origins: Array<{ id: string; environment: string; origin: string; enabled: boolean }>;
}) {
  return (
    <section className="grid two">
      <Card>
        <CardTitle>Project keys</CardTitle>
        <KeyManager projectId={projectId} keys={keys} />
      </Card>

      <Card>
        <CardTitle>Allowed origins</CardTitle>
        <form className="row origin-form" action={addOriginAction}>
          <input type="hidden" name="projectId" value={projectId} />
          <Select name="environment" defaultValue="development">
            <option value="development">Development</option>
            <option value="production">Production</option>
          </Select>
          <Input name="origin" placeholder="http://localhost:3000" required />
          <Button>Add</Button>
        </form>
        <div className="stack" style={{ marginTop: 14 }}>
          {origins.length ? (
            origins.map((origin) => (
              <form className="row between origin-row" action={deleteOriginAction} key={origin.id}>
                <input type="hidden" name="projectId" value={projectId} />
                <input type="hidden" name="originId" value={origin.id} />
                <div>
                  <span className={origin.environment === "development" ? "badge dev" : "badge prod"}>{origin.environment}</span>{" "}
                  <span>{origin.origin}</span>
                </div>
                <Button variant="secondary">Remove</Button>
              </form>
            ))
          ) : (
            <p className="muted">No origins configured.</p>
          )}
        </div>
      </Card>
    </section>
  );
}

function ReportsSection({
  projectId,
  environment,
  reports,
  selectedType,
  selectedStatus,
  counts
}: {
  projectId: string;
  environment: SnapBugEnvironment;
  reports: ReportRow[];
  selectedType: string;
  selectedStatus: string;
  counts: ReturnType<typeof emptyEnvironmentCounts>;
}) {
  const label = environment === "development" ? "Development" : "Production";

  return (
    <section className="stack">
      <div className="summary-strip">
        <div className="mini-stat">
          <span>Total</span>
          <strong>{counts.total}</strong>
        </div>
        {SNAPBUG_REPORT_STATUSES.map((status) => (
          <div className="mini-stat" key={status}>
            <span>{status.replace("_", " ")}</span>
            <strong>{counts.byStatus[status] || 0}</strong>
          </div>
        ))}
      </div>

      <Card>
        <div className="row between report-heading">
          <div>
            <CardTitle>{label} reports</CardTitle>
            <p className="muted">Newest reports are shown first.</p>
          </div>
          <form className="filter-bar">
            <input type="hidden" name="section" value={environment} />
            <Select name="type" defaultValue={selectedType}>
              <option value="all">All types</option>
              {SNAPBUG_REPORT_TYPES.map((type) => (
                <option value={type} key={type}>
                  {type === "todo" ? "TODO" : type}
                </option>
              ))}
            </Select>
            <Select name="status" defaultValue={selectedStatus}>
              <option value="all">All statuses</option>
              {SNAPBUG_REPORT_STATUSES.map((status) => (
                <option value={status} key={status}>
                  {status.replace("_", " ")}
                </option>
              ))}
            </Select>
            <Button variant="secondary">Filter</Button>
          </form>
        </div>
        <ReportTable reports={reports} />
      </Card>
    </section>
  );
}

function ReportTable({ reports }: { reports: ReportRow[] }) {
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th>Type</th>
            <th>Summary</th>
            <th>Priority</th>
            <th>Status</th>
            <th>Created</th>
          </tr>
        </thead>
        <tbody>
          {reports.length ? (
            reports.map((report) => (
              <tr key={report.id}>
                <td>
                  <span className={`badge type-${report.type}`}>{report.type}</span>
                </td>
                <td>
                  <Link href={`/reports/${report.id}`}>
                    <strong>{report.title || report.message.slice(0, 70)}</strong>
                  </Link>
                  <div className="muted">{report.reporter_name || safeHost(report.page_url)}</div>
                </td>
                <td>
                  <span className={`badge priority-${report.priority}`}>{report.priority}</span>
                </td>
                <td>
                  <span>{report.status.replace("_", " ")}</span>
                </td>
                <td className="muted">
                  <div>{new Date(report.created_at).toLocaleString()}</div>
                  {report.updated_at && report.updated_at !== report.created_at && (
                    <div style={{ fontSize: "0.75rem", opacity: 0.55, marginTop: 2 }}>
                      ↻ {new Date(report.updated_at).toLocaleString()}
                    </div>
                  )}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td className="muted" colSpan={5}>
                No reports match these filters.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function normalizeSection(section?: string): ProjectSection {
  if (section === "production" || section === "config") return section;
  return "development";
}

function emptyEnvironmentCounts() {
  return {
    total: 0,
    byStatus: Object.fromEntries(SNAPBUG_REPORT_STATUSES.map((status) => [status, 0])) as Record<string, number>
  };
}

function buildCounts(rows: Array<{ environment: string; status: string }>) {
  const counts = {
    development: emptyEnvironmentCounts(),
    production: emptyEnvironmentCounts()
  };

  rows.forEach((row) => {
    if (row.environment !== "development" && row.environment !== "production") return;
    counts[row.environment].total += 1;
    counts[row.environment].byStatus[row.status] = (counts[row.environment].byStatus[row.status] || 0) + 1;
  });

  return counts;
}

function safeHost(pageUrl: string) {
  try {
    return new URL(pageUrl).hostname;
  } catch {
    return pageUrl;
  }
}
