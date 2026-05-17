import { addOriginAction, deleteOriginAction } from "@/app/(dashboard)/actions";
import { DeveloperTokensPanel } from "@/components/dashboard/developer-tokens-panel";
import { KeyManager } from "@/components/dashboard/key-manager";
import { InviteMemberForm, RemoveMemberButton } from "@/components/dashboard/team-actions";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/fields";
import { Toast } from "@/components/ui/toast";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { SNAPBUG_REPORT_STATUSES, SNAPBUG_REPORT_TYPES, type SnapBugEnvironment } from "@snapbug/shared/types";
import Link from "next/link";
import { notFound } from "next/navigation";

type ProjectSection = "development" | "production" | "config" | "team";
type ReportSort = "newest" | "oldest";
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
  total_count: number;
};
type ReportFilters = {
  type: string;
  status: string;
  dateFrom: string;
  dateTo: string;
  sort: ReportSort;
  limit: number;
  offset: number;
};

const DEFAULT_LIMIT = 25;

export default async function ProjectPage({
  params,
  searchParams
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{
    section?: string;
    type?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
    sort?: string;
    offset?: string;
    teamOffset?: string;
    success?: string;
    error?: string;
  }>;
}) {
  const { projectId } = await params;
  const query = await searchParams;
  const section = normalizeSection(query.section);
  const filters = normalizeFilters(query);
  const teamOffset = Math.max(Number.parseInt(query.teamOffset || "0", 10) || 0, 0);
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const { data: project } = await supabase.from("projects").select("id, name, slug, owner_id").eq("id", projectId).single();
  if (!project) notFound();
  const isOwner = project.owner_id === user?.id;

  const [{ data: keys }, { data: origins }, { data: developerTokens }, reportCountsResult] = await Promise.all([
    supabase.from("project_keys").select("id, environment, key_value, key_prefix, enabled, last_used_at").eq("project_id", projectId),
    supabase.from("project_origins").select("id, environment, origin, enabled").eq("project_id", projectId).order("environment"),
    supabase
      .from("developer_tokens")
      .select("id, name, last_used_at, expires_at, revoked_at, created_at")
      .order("created_at", { ascending: false }),
    supabase.rpc("get_project_report_counts", { p_project_id: projectId })
  ]);
  const teamData = section === "team" ? await loadTeam(supabase, projectId, teamOffset) : null;
  const pendingInvites = isOwner && section === "team" ? await loadPendingProjectInvites(projectId) : [];

  const reportEnvironment: SnapBugEnvironment = section === "production" ? "production" : "development";
  let reports: ReportRow[] = [];
  let reportsError = reportCountsResult.error?.message || "";
  if (section !== "config") {
    const { data, error } = await supabase.rpc("get_project_reports", {
      p_project_id: projectId,
      p_environment: reportEnvironment,
      p_status: filters.status === "all" ? null : filters.status,
      p_type: filters.type === "all" ? null : filters.type,
      p_date_from: filters.dateFrom ? `${filters.dateFrom}T00:00:00.000Z` : null,
      p_date_to: filters.dateTo ? nextUtcDate(filters.dateTo) : null,
      p_sort: filters.sort,
      p_limit: filters.limit,
      p_offset: filters.offset
    });
    if (error) reportsError = error.message;
    reports = (data || []) as ReportRow[];
  }

  const counts = buildCounts((reportCountsResult.data || []) as Array<{ environment: string; status: string; total: number }>);

  return (
    <main className="page dashboard-page">
      <Toast success={query.success} error={query.error} />
      <div className="page-header dashboard-header">
        <div>
          <p className="eyebrow">{project.slug}</p>
          <h1 className="page-title">{project.name}</h1>
          <p className="page-subtitle">Reports are split by runtime environment; keys and origins live in config.</p>
        </div>
        <Link className="button secondary" href="/projects">
          Back
        </Link>
      </div>

      <nav className="tabs dashboard-tabs" aria-label="Project sections">
        <Link className={section === "development" ? "active" : ""} href={projectSectionHref(projectId, "development")}>
          Development
          <span>{counts.development.total}</span>
        </Link>
        <Link className={section === "production" ? "active" : ""} href={projectSectionHref(projectId, "production")}>
          Production
          <span>{counts.production.total}</span>
        </Link>
        <Link className={section === "config" ? "active" : ""} href={projectSectionHref(projectId, "config")}>
          Config
        </Link>
        <Link className={section === "team" ? "active" : ""} href={projectSectionHref(projectId, "team")}>
          Team
        </Link>
      </nav>

      {section === "config" ? (
        <ConfigSection
          developerTokens={developerTokens || []}
          isOwner={isOwner}
          projectId={projectId}
          keys={keys || []}
          origins={origins || []}
        />
      ) : section === "team" ? (
        <TeamSection
          isOwner={isOwner}
          members={teamData?.members || []}
          offset={teamOffset}
          pendingInvites={pendingInvites || []}
          projectId={projectId}
          total={teamData?.total || 0}
        />
      ) : (
        <ReportsSection
          projectId={projectId}
          environment={reportEnvironment}
          reports={reports}
          filters={filters}
          counts={counts[reportEnvironment]}
          error={reportsError}
        />
      )}
    </main>
  );
}

function ConfigSection({
  developerTokens,
  isOwner,
  projectId,
  keys,
  origins
}: {
  developerTokens: Array<{
    id: string;
    name: string;
    last_used_at: string | null;
    expires_at: string;
    revoked_at: string | null;
    created_at: string;
  }>;
  isOwner: boolean;
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
        <KeyManager canManage={isOwner} projectId={projectId} keys={keys} />
        {!isOwner ? <p className="muted">Project members can copy keys, but only the owner can regenerate them.</p> : null}
      </Card>

      <Card>
        <CardTitle>Allowed origins</CardTitle>
        {isOwner ? (
          <form className="row origin-form" action={addOriginAction}>
            <input type="hidden" name="projectId" value={projectId} />
            <Select name="environment" defaultValue="development">
              <option value="development">Development</option>
              <option value="production">Production</option>
            </Select>
            <Input name="origin" placeholder="http://localhost:3000" required />
            <Button>Add</Button>
          </form>
        ) : (
          <p className="muted">Only the project owner can manage allowed origins.</p>
        )}
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
                {isOwner ? <Button variant="secondary">Remove</Button> : null}
              </form>
            ))
          ) : (
            <p className="muted">No origins configured.</p>
          )}
        </div>
      </Card>

      <Card>
        <CardTitle>Developer tokens</CardTitle>
        <DeveloperTokensPanel tokens={developerTokens} />
      </Card>
    </section>
  );
}

function TeamSection({
  isOwner,
  members,
  offset,
  pendingInvites,
  projectId,
  total
}: {
  isOwner: boolean;
  members: Array<{ user_id: string; role: string; created_at: string; email: string; full_name: string | null }>;
  offset: number;
  pendingInvites: Array<{ id: string; email: string; status: string; expires_at: string; created_at: string }>;
  projectId: string;
  total: number;
}) {
  const limit = 25;
  const nextOffset = offset + limit;
  const previousOffset = Math.max(offset - limit, 0);

  return (
    <section className="grid two">
      <Card>
        <div className="row between card-heading">
          <CardTitle>Team members</CardTitle>
          <span className="muted">{total} total</span>
        </div>
        <div className="attachment-list">
          {members.length ? (
            members.map((member) => (
              <div className="attachment-list-item" key={member.user_id}>
                <div>
                  <strong>{member.full_name || member.email}</strong>
                  <p className="muted">{member.email}</p>
                  <span className={member.role === "owner" ? "badge role-badge priority-critical" : "badge role-badge priority-low"}>
                    {member.role}
                  </span>
                </div>
                {isOwner && member.role !== "owner" ? <RemoveMemberButton projectId={projectId} userId={member.user_id} /> : null}
              </div>
            ))
          ) : (
            <p className="muted">No team members found.</p>
          )}
        </div>
        <div className="pagination-row">
          <Link
            aria-disabled={offset === 0}
            className={`button secondary${offset === 0 ? " disabled" : ""}`}
            href={`/projects/${projectId}?section=team&teamOffset=${previousOffset}`}
          >
            Previous
          </Link>
          <span className="muted">Page {Math.floor(offset / limit) + 1}</span>
          <Link
            aria-disabled={nextOffset >= total}
            className={`button secondary${nextOffset >= total ? " disabled" : ""}`}
            href={`/projects/${projectId}?section=team&teamOffset=${nextOffset}`}
          >
            Next
          </Link>
        </div>
      </Card>

      <Card>
        <CardTitle>Invite developers</CardTitle>
        {isOwner ? <InviteMemberForm projectId={projectId} /> : <p className="muted">Only the project owner can invite members.</p>}
        <div className="stack" style={{ marginTop: 18 }}>
          <strong>Pending invites</strong>
          {pendingInvites.length ? (
            <div className="attachment-list">
              {pendingInvites.map((invite) => (
                <div className="attachment-list-item" key={invite.id}>
                  <div>
                    <strong>{invite.email}</strong>
                    <p className="muted">Expires {new Date(invite.expires_at).toLocaleDateString()}</p>
                  </div>
                  <span className="badge priority-low">{invite.status}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="muted">No pending invites.</p>
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
  filters,
  counts,
  error
}: {
  projectId: string;
  environment: SnapBugEnvironment;
  reports: ReportRow[];
  filters: ReportFilters;
  counts: ReturnType<typeof emptyEnvironmentCounts>;
  error: string;
}) {
  const label = environment === "development" ? "Development" : "Production";
  const totalCount = reports[0]?.total_count || 0;
  const nextOffset = filters.offset + filters.limit;
  const previousOffset = Math.max(filters.offset - filters.limit, 0);

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
            <p className="muted">
              Showing {reports.length ? filters.offset + 1 : 0}-{filters.offset + reports.length} of {totalCount} matching reports.
            </p>
          </div>
        </div>
        <form className="filter-bar report-filter-grid">
          <input type="hidden" name="section" value={environment} />
          <label>
            <span className="filter-label">Type</span>
            <Select name="type" defaultValue={filters.type}>
              <option value="all">All types</option>
              {SNAPBUG_REPORT_TYPES.map((type) => (
                <option value={type} key={type}>
                  {type === "todo" ? "TODO" : type}
                </option>
              ))}
            </Select>
          </label>
          <label>
            <span className="filter-label">Status</span>
            <Select name="status" defaultValue={filters.status}>
              <option value="all">All statuses</option>
              {SNAPBUG_REPORT_STATUSES.map((status) => (
                <option value={status} key={status}>
                  {status.replace("_", " ")}
                </option>
              ))}
            </Select>
          </label>
          <label>
            <span className="filter-label">From</span>
            <Input name="dateFrom" type="date" defaultValue={filters.dateFrom} />
          </label>
          <label>
            <span className="filter-label">To</span>
            <Input name="dateTo" type="date" defaultValue={filters.dateTo} />
          </label>
          <label>
            <span className="filter-label">Sort</span>
            <Select name="sort" defaultValue={filters.sort}>
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </Select>
          </label>
          <Button variant="secondary">Apply</Button>
        </form>
        {error ? (
          <div className="empty-state error-state">
            <strong>Reports could not be loaded.</strong>
            <p>{error}</p>
          </div>
        ) : (
          <ReportTable reports={reports} />
        )}
        <div className="pagination-row">
          <Link
            aria-disabled={filters.offset === 0}
            className={`button secondary${filters.offset === 0 ? " disabled" : ""}`}
            href={reportHref(projectId, environment, filters, previousOffset)}
          >
            Previous
          </Link>
          <span className="muted">Page {Math.floor(filters.offset / filters.limit) + 1}</span>
          <Link
            aria-disabled={nextOffset >= totalCount}
            className={`button secondary${nextOffset >= totalCount ? " disabled" : ""}`}
            href={reportHref(projectId, environment, filters, nextOffset)}
          >
            Next
          </Link>
        </div>
      </Card>
    </section>
  );
}

function ReportTable({ reports }: { reports: ReportRow[] }) {
  return (
    <div className="report-list">
      {reports.length ? (
        reports.map((report) => (
          <Link className="report-row-card" href={`/reports/${report.id}`} key={report.id}>
            <div className="report-row-main">
              <div className="row report-row-badges">
                <span className={`badge type-${report.type}`}>{report.type}</span>
                <span className={`badge priority-${report.priority}`}>{report.priority}</span>
              </div>
              <strong>{report.title || report.message.slice(0, 80)}</strong>
              <p className="muted">{report.message}</p>
              <span className="muted">{report.reporter_name || safeHost(report.page_url)}</span>
            </div>
            <div className="report-row-meta">
              <span>{report.status.replace("_", " ")}</span>
              <span className="muted">{new Date(report.created_at).toLocaleString()}</span>
              {report.updated_at && report.updated_at !== report.created_at ? (
                <span className="muted">Updated {new Date(report.updated_at).toLocaleString()}</span>
              ) : null}
            </div>
          </Link>
        ))
      ) : (
        <div className="empty-state">
          <strong>No reports match these filters.</strong>
          <p className="muted">Try another status, type, or date range.</p>
        </div>
      )}
    </div>
  );
}

function normalizeSection(section?: string): ProjectSection {
  if (section === "production" || section === "config" || section === "team") return section;
  return "development";
}

function normalizeFilters(query: { type?: string; status?: string; dateFrom?: string; dateTo?: string; sort?: string; offset?: string }): ReportFilters {
  const type = query.type && SNAPBUG_REPORT_TYPES.includes(query.type as (typeof SNAPBUG_REPORT_TYPES)[number]) ? query.type : "all";
  const status =
    query.status === "all" || (query.status && SNAPBUG_REPORT_STATUSES.includes(query.status as (typeof SNAPBUG_REPORT_STATUSES)[number]))
      ? query.status
      : "open";
  const sort: ReportSort = query.sort === "oldest" ? "oldest" : "newest";
  const offset = Math.max(Number.parseInt(query.offset || "0", 10) || 0, 0);

  return {
    type,
    status,
    dateFrom: validDate(query.dateFrom) ? query.dateFrom! : "",
    dateTo: validDate(query.dateTo) ? query.dateTo! : "",
    sort,
    limit: DEFAULT_LIMIT,
    offset
  };
}

function validDate(value?: string) {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
}

function nextUtcDate(value: string) {
  const date = new Date(`${value}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString();
}

function emptyEnvironmentCounts() {
  return {
    total: 0,
    byStatus: Object.fromEntries(SNAPBUG_REPORT_STATUSES.map((status) => [status, 0])) as Record<string, number>
  };
}

function buildCounts(rows: Array<{ environment: string; status: string; total: number }>) {
  const counts = {
    development: emptyEnvironmentCounts(),
    production: emptyEnvironmentCounts()
  };

  rows.forEach((row) => {
    if (row.environment !== "development" && row.environment !== "production") return;
    const total = Number(row.total || 0);
    counts[row.environment].total += total;
    counts[row.environment].byStatus[row.status] = total;
  });

  return counts;
}

function projectSectionHref(projectId: string, section: ProjectSection) {
  if (section === "config") return `/projects/${projectId}?section=config`;
  if (section === "team") return `/projects/${projectId}?section=team`;
  return `/projects/${projectId}?section=${section}&status=open&sort=newest`;
}

function reportHref(projectId: string, environment: SnapBugEnvironment, filters: ReportFilters, offset: number) {
  const params = new URLSearchParams();
  params.set("section", environment);
  params.set("status", filters.status);
  params.set("type", filters.type);
  params.set("sort", filters.sort);
  params.set("offset", String(offset));
  if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
  if (filters.dateTo) params.set("dateTo", filters.dateTo);
  return `/projects/${projectId}?${params.toString()}`;
}

async function loadTeam(supabase: Awaited<ReturnType<typeof createClient>>, projectId: string, offset: number) {
  const limit = 25;
  const { data: members, count } = await supabase
    .from("project_members")
    .select("user_id, role, created_at", { count: "exact" })
    .eq("project_id", projectId)
    .order("role")
    .order("created_at")
    .range(offset, offset + limit - 1);

  if (!members?.length) return { members: [], total: count || 0 };

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, email, full_name")
    .in("id", members.map((member) => member.user_id));

  return {
    total: count || 0,
    members: members.map((member) => {
      const profile = profiles?.find((item) => item.id === member.user_id);
      return {
        user_id: member.user_id,
        role: member.role,
        created_at: member.created_at,
        email: profile?.email || "Unknown email",
        full_name: profile?.full_name || null
      };
    })
  };
}

async function loadPendingProjectInvites(projectId: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("project_invites")
    .select("id, email, status, expires_at, created_at")
    .eq("project_id", projectId)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(25);

  return data || [];
}

function safeHost(pageUrl: string) {
  try {
    return new URL(pageUrl).hostname;
  } catch {
    return pageUrl;
  }
}
