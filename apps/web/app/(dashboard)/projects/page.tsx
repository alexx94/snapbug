import { CreateProjectForm } from "@/components/dashboard/create-project-form";
import { Card, CardTitle } from "@/components/ui/card";
import { Toast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ success?: string }> }) {
  const query = await searchParams;
  const supabase = await createClient();
  const { data: projects } = await supabase.from("projects").select("id, name, slug, created_at").order("created_at", { ascending: false });

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
        <CreateProjectForm />
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
