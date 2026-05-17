import { CreateProjectForm } from "@/components/dashboard/create-project-form";
import { PendingInvites } from "@/components/dashboard/pending-invites";
import { Card, CardTitle } from "@/components/ui/card";
import { Toast } from "@/components/ui/toast";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ success?: string }> }) {
  const query = await searchParams;
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  const { data: projects } = await supabase.from("projects").select("id, name, slug, created_at").order("created_at", { ascending: false });
  const pendingInvites = user?.email ? await loadPendingInvites(user.email) : [];

  return (
    <main className="page dashboard-page">
      <Toast success={query.success} />
      <div className="page-header dashboard-header">
        <div>
          <h1 className="page-title">Projects</h1>
          <p className="page-subtitle">Generate SDK keys, configure origins, and inspect incoming reports.</p>
        </div>
      </div>

      <div className="projects-layout">
        <div className="stack">
          <CreateProjectForm />
          <Card>
            <PendingInvites invites={pendingInvites} />
            {!pendingInvites.length ? (
              <div className="stack">
                <CardTitle>Pending invites</CardTitle>
                <p className="muted">Project invites for your email will appear here.</p>
              </div>
            ) : null}
          </Card>
        </div>
        <Card>
          <div className="row between card-heading">
            <CardTitle>Existing projects</CardTitle>
            <span className="muted">{projects?.length || 0} total</span>
          </div>
          <div className="project-list">
            {(projects || []).length ? (
              projects?.map((project) => (
                <Link className="project-list-item" href={`/projects/${project.id}`} key={project.id}>
                  <div>
                    <strong>{project.name}</strong>
                    <div className="muted">{project.slug}</div>
                  </div>
                  <div className="project-list-meta">
                    <span className="muted">{new Date(project.created_at).toLocaleDateString()}</span>
                    <span>Open</span>
                  </div>
                </Link>
              ))
            ) : (
              <div className="empty-state">
                <strong>No projects yet.</strong>
                <p className="muted">Create one to generate development and production keys.</p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </main>
  );
}

async function loadPendingInvites(email: string) {
  const admin = createAdminClient();
  const { data: invites } = await admin
    .from("project_invites")
    .select("id, project_id, invited_by, expires_at, created_at")
    .eq("email", email.toLowerCase())
    .eq("status", "pending")
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(10);

  if (!invites?.length) return [];

  const projectIds = [...new Set(invites.map((invite) => invite.project_id))];
  const inviterIds = [...new Set(invites.map((invite) => invite.invited_by))];
  const [{ data: projects }, { data: inviters }] = await Promise.all([
    admin.from("projects").select("id, name").in("id", projectIds),
    admin.from("profiles").select("id, email").in("id", inviterIds)
  ]);

  return invites.map((invite) => ({
    id: invite.id,
    project_id: invite.project_id,
    project_name: projects?.find((project) => project.id === invite.project_id)?.name || "Project invite",
    invited_by_email: inviters?.find((profile) => profile.id === invite.invited_by)?.email || null,
    expires_at: invite.expires_at,
    created_at: invite.created_at
  }));
}
