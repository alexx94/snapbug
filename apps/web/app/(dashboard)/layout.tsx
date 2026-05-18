import { NavLinks } from "@/components/dashboard/nav-links";
import { UserMenu } from "@/components/dashboard/user-menu";
import { BugIcon } from "@/components/ui/bug-icon";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { signOut } from "./actions";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const email = user?.email || "";
  let fullName: string | null = null;

  if (user) {
    const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).single();
    fullName = profile?.full_name || null;
  }

  return (
    <div className="shell">
      <header className="topbar">
        <Link className="brand row hidden sm:flex" href="/projects" style={{ gap: "0.5rem" }}>
          <span style={{ color: "var(--accent)" }}><BugIcon size={26} /></span>
          SnapBug
        </Link>
        <NavLinks />
        {user ? <UserMenu email={email} fullName={fullName} signOut={signOut} /> : null}
      </header>
      {children}
    </div>
  );
}
