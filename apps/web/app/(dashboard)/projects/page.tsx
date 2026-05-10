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
    <main className="page">
      <Toast success={query.success} />
      <div className="page-header">
        <div>
          <h1 className="page-title">Projects</h1>
          <p className="page-subtitle">Generate SDK keys and inspect reports.</p>
        </div>
      </div>

      <div className="grid two">
        <CreateProjectForm />
        <Card>
          <CardTitle>Existing projects</CardTitle>
          <div className="stack">
            {(projects || []).length ? (
              projects?.map((project) => (
                <Link className="card row between" href={`/projects/${project.id}`} key={project.id}>
                  <div>
                    <strong>{project.name}</strong>
                    <div className="muted">{project.slug}</div>
                  </div>
                  <span className="muted">Open</span>
                </Link>
              ))
            ) : (
              <p className="muted">No projects yet.</p>
            )}
          </div>
        </Card>
      </div>
    </main>
  );
}
