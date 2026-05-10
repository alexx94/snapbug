"use client";

import { createProjectAction, type CreateProjectState } from "@/app/(dashboard)/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/fields";
import { useActionState } from "react";

const initialState: CreateProjectState = {};

export function CreateProjectForm() {
  const [state, action, pending] = useActionState(createProjectAction, initialState);

  return (
    <form className="card stack" action={action}>
      <h2 className="card-title">Create project</h2>
      <label className="stack">
        <span className="muted">Project name</span>
        <Input name="name" placeholder="My app" required />
      </label>
      <Button disabled={pending}>{pending ? "Creating..." : "Create project"}</Button>
      {state.error ? <p className="error">{state.error}</p> : null}
      {state.devKey && state.liveKey ? (
        <div className="stack">
          <div className="widget-toast">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
            Project created successfully
          </div>
          <p className="muted">
            Open it from the list and use Project keys to copy the variables in the right format for your client app.
          </p>
        </div>
      ) : null}
    </form>
  );
}
