import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/fields";
import Link from "next/link";
import { login } from "./actions";

export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="page" style={{ maxWidth: 460 }}>
      <Card>
        <form className="stack" action={login}>
          {params.next ? <input type="hidden" name="next" value={params.next} /> : null}
          <div>
            <CardTitle>SnapBug login</CardTitle>
            <p className="muted">Sign in to manage projects, keys, and reports.</p>
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
          <Button>Login</Button>
          <p className="muted">
            Don&apos;t have an account? <Link href={params.next ? `/signup?next=${encodeURIComponent(params.next)}` : "/signup"} style={{ textDecoration: "underline" }}>Create account</Link>
          </p>
        </form>
      </Card>
    </main>
  );
}
