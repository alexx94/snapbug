"use server";

import { generateProjectKey, hashProjectKey, slugify, visibleKeyPrefix } from "@/lib/crypto";
import { normalizeOrigin } from "@/lib/origins";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type CreateProjectState = {
  error?: string;
  projectId?: string;
  devKey?: string;
  liveKey?: string;
};

export type RegenerateKeyState = {
  error?: string;
  key?: string;
  environment?: "development" | "production";
};

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/projects", "layout");
  redirect("/");
}

export async function createProjectAction(_state: CreateProjectState, formData: FormData): Promise<CreateProjectState> {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) return { error: "Unauthorized" };

  const name = String(formData.get("name") || "").trim();
  if (!name) return { error: "Project name is required" };

  const admin = createAdminClient();

  const { data: project, error: projectError } = await admin
    .from("projects")
    .insert({ owner_id: user.id, name, slug: slugify(name) })
    .select("id")
    .single();

  if (projectError || !project) return { error: projectError?.message || "Project creation failed" };
  const { error: memberError } = await admin
    .from("project_members")
    .insert({ project_id: project.id, user_id: user.id, role: "owner" });
  if (memberError) return { error: memberError.message };

  const devKey = generateProjectKey("development");
  const liveKey = generateProjectKey("production");

  const { error: keysError } = await supabase.from("project_keys").insert([
    {
      project_id: project.id,
      environment: "development",
      key_value: devKey,
      key_hash: hashProjectKey(devKey),
      key_prefix: visibleKeyPrefix(devKey)
    },
    {
      project_id: project.id,
      environment: "production",
      key_value: liveKey,
      key_hash: hashProjectKey(liveKey),
      key_prefix: visibleKeyPrefix(liveKey)
    }
  ]);

  if (keysError) return { error: keysError.message };

  const defaultOrigins = [
    { environment: "development", origin: "http://localhost:3000" },
    { environment: "development", origin: "http://localhost:5173" },
    { environment: "development", origin: "http://127.0.0.1:3000" },
    { environment: "development", origin: "http://127.0.0.1:5173" },
    { environment: "production", origin: "http://localhost:3000" }
  ];

  await supabase.from("project_origins").insert(defaultOrigins.map((origin) => ({ project_id: project.id, ...origin })));

  revalidatePath("/projects");
  return { projectId: project.id, devKey, liveKey };
}

export async function regenerateProjectKeyAction(
  _state: RegenerateKeyState,
  formData: FormData
): Promise<RegenerateKeyState> {
  const supabase = await createClient();
  const projectId = String(formData.get("projectId") || "");
  const environment = String(formData.get("environment") || "") as "development" | "production";

  if (!projectId || !["development", "production"].includes(environment)) {
    return { error: "Invalid project or environment" };
  }

  const key = generateProjectKey(environment);
  const { error } = await supabase
    .from("project_keys")
    .upsert(
      {
        project_id: projectId,
        environment,
        key_value: key,
        key_hash: hashProjectKey(key),
        key_prefix: visibleKeyPrefix(key),
        enabled: true,
        last_used_at: null
      },
      { onConflict: "project_id,environment" }
    );

  if (error) return { error: error.message, environment };

  revalidatePath(`/projects/${projectId}`);
  return { key, environment };
}

export async function addOriginAction(formData: FormData) {
  const supabase = await createClient();
  const projectId = String(formData.get("projectId") || "");
  const environment = String(formData.get("environment") || "");
  const origin = normalizeOrigin(String(formData.get("origin") || ""));

  if (!projectId || !origin || !["development", "production"].includes(environment)) {
    redirect(`/projects/${projectId}?section=config&error=Invalid+origin+or+environment`);
  }

  const { error } = await supabase.from("project_origins").insert({ project_id: projectId, environment, origin });
  if (error) {
    const msg = error.code === "23505" ? "Origin already exists" : error.message;
    redirect(`/projects/${projectId}?section=config&error=${encodeURIComponent(msg)}`);
  }

  redirect(`/projects/${projectId}?section=config&success=Origin+added`);
}

export async function deleteOriginAction(formData: FormData) {
  const supabase = await createClient();
  const projectId = String(formData.get("projectId") || "");
  const originId = String(formData.get("originId") || "");

  if (!projectId || !originId) return;

  const { error } = await supabase.from("project_origins").delete().eq("id", originId);
  if (error) {
    redirect(`/projects/${projectId}?section=config&error=${encodeURIComponent(error.message)}`);
  }

  redirect(`/projects/${projectId}?section=config&success=Origin+removed`);
}
