import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/fields";
import Link from "next/link";
import { signup } from "./actions";

export default async function SignupPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="page" style={{ maxWidth: 460 }}>
      <Card>
        <form className="stack" action={signup}>
          {params.next ? <input type="hidden" name="next" value={params.next} /> : null}
          <div>
            <CardTitle>Create account</CardTitle>
            <p className="muted">Create a SnapBug account to start managing projects and reports.</p>
          </div>
          {params.error ? <p className="error">{params.error}</p> : null}
          <label className="stack">
            <span className="muted">Email</span>
            <Input name="email" type="email" required />
          </label>
          <label className="stack">
            <span className="muted">Password</span>
            <Input name="password" type="password" minLength={6} required />
          </label>
          <label className="stack">
            <span className="muted">Confirm password</span>
            <Input name="confirmPassword" type="password" minLength={6} required />
          </label>
          <Button>Create account</Button>
          <p className="muted">
            Already have an account? <Link href={params.next ? `/login?next=${encodeURIComponent(params.next)}` : "/login"} style={{ textDecoration: "underline" }}>Login</Link>
          </p>
        </form>
      </Card>
    </main>
  );
}
