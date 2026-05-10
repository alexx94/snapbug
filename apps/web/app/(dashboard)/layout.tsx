import { BugIcon } from "@/components/ui/bug-icon";
import { Button } from "@/components/ui/button";
import { Toast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { signOut } from "./actions";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <div className="shell">
      <header className="topbar">
        <div className="row">
          <Link className="brand row" href="/projects" style={{ gap: "0.5rem" }}>
            <span style={{ color: "var(--accent)" }}><BugIcon size={26} /></span>
            SnapBug
          </Link>
          <nav className="nav">
            <Link href="/projects">Projects</Link>
            <Link href="/test-client">Test client</Link>
          </nav>
        </div>
        <form action={signOut}>
          <Button variant="secondary">Sign out</Button>
        </form>
      </header>
      {children}
    </div>
  );
}
