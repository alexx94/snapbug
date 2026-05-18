import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/fields";
import { Toast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { changePassword, updateProfile } from "./actions";

export default async function SettingsPage({
  searchParams
}: {
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  const query = await searchParams;
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("full_name, email").eq("id", user.id).single();

  return (
    <main className="page" style={{ maxWidth: 600 }}>
      <Toast success={query.success} error={query.error} />
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Manage your profile and account security.</p>
      </div>

      <div className="stack">
        <Card>
          <form className="stack" action={updateProfile}>
            <CardTitle>Profile</CardTitle>
            <label className="stack">
              <span className="muted">Email</span>
              <Input type="email" defaultValue={user.email || ""} disabled />
            </label>
            <label className="stack">
              <span className="muted">Full name</span>
              <Input name="fullName" type="text" defaultValue={profile?.full_name || ""} placeholder="Your name" />
            </label>
            <Button>Save profile</Button>
          </form>
        </Card>

        <Card>
          <form className="stack" action={changePassword}>
            <CardTitle>Change password</CardTitle>
            <label className="stack">
              <span className="muted">New password</span>
              <Input name="newPassword" type="password" minLength={6} required />
            </label>
            <label className="stack">
              <span className="muted">Confirm new password</span>
              <Input name="confirmPassword" type="password" minLength={6} required />
            </label>
            <Button>Change password</Button>
          </form>
        </Card>
      </div>
    </main>
  );
}
