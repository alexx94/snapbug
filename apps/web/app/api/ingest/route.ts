import { hashProjectKey, hashSecret } from "@/lib/crypto";
import { corsHeaders, isLocalDevelopmentOrigin } from "@/lib/origins";
import { createAdminClient } from "@/lib/supabase/admin";
import { ingestPayloadSchema } from "@snapbug/shared/schemas";
import type { SnapBugEnvironment } from "@snapbug/shared/types";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const MAX_BODY_BYTES = 15 * 1024 * 1024;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 20;
const rateLimits =
  (globalThis as typeof globalThis & {
    __snapbugRateLimits?: Map<string, { count: number; resetAt: number }>;
  }).__snapbugRateLimits ??
  new Map<string, { count: number; resetAt: number }>();

(globalThis as typeof globalThis & { __snapbugRateLimits?: typeof rateLimits }).__snapbugRateLimits = rateLimits;

export async function OPTIONS(request: Request) {
  const origin = request.headers.get("origin");
  return new Response(null, { status: 204, headers: corsHeaders(origin) });
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  const headers = corsHeaders(origin);

  try {
    if (!origin) {
      return json({ error: "Missing Origin header" }, 403, headers);
    }

    const contentLength = Number(request.headers.get("content-length") || 0);
    if (contentLength > MAX_BODY_BYTES) {
      return json({ error: "Payload too large" }, 413, headers);
    }

    const raw = await request.json();
    const parsed = ingestPayloadSchema.safeParse(raw);
    if (!parsed.success) {
      return json({ error: "Invalid payload", details: parsed.error.flatten() }, 400, headers);
    }

    const payload = parsed.data;
    const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
    const limitKey = `${payload.key}:${origin}:${clientIp}`;
    if (!checkRateLimit(limitKey)) {
      return json({ error: "Rate limit exceeded" }, 429, headers);
    }

    const admin = createAdminClient();
    const keyHash = hashProjectKey(payload.key);

    const { data: keyRow, error: keyError } = await admin
      .from("project_keys")
      .select("id, project_id, environment, enabled")
      .eq("key_hash", keyHash)
      .eq("enabled", true)
      .maybeSingle();

    if (keyError) throw keyError;
    if (!keyRow) return json({ error: "Invalid project key" }, 401, headers);

    const environment = keyRow.environment as SnapBugEnvironment;
    const originAllowed = await isOriginAllowed(admin, keyRow.project_id, environment, origin);
    if (!originAllowed) {
      return json({ error: "Origin is not allowed for this project key" }, 403, headers);
    }

    const developer = environment === "development" ? await validateDeveloperToken(admin, keyRow.project_id, payload.developerToken, headers) : null;

    const { data: report, error: reportError } = await admin
      .from("reports")
      .insert({
        project_id: keyRow.project_id,
        created_by: developer?.userId || null,
        environment,
        type: payload.type,
        priority: payload.priority || "medium",
        title: payload.title || null,
        message: payload.message,
        reporter_name: developer?.email || payload.reporterName || null,
        page_url: payload.pageUrl,
        user_agent: payload.userAgent || null,
        browser: payload.browser || {},
        viewport: payload.viewport || {},
        metadata: payload.metadata || {},
        origin
      })
      .select("id")
      .single();

    if (reportError) throw reportError;

    await admin.from("project_keys").update({ last_used_at: new Date().toISOString() }).eq("id", keyRow.id);

    const artifactErrors = await uploadArtifacts(admin, report.id, payload, developer?.userId || null);

    return json({ ok: true, reportId: report.id, artifactErrors }, 201, headers);
  } catch (error) {
    if (error instanceof IngestResponseError) {
      return json(error.body, error.status, error.headers);
    }
    return json({ error: formatUnknownError(error) }, 500, headers);
  }
}

function json(body: unknown, status: number, headers: Headers) {
  return NextResponse.json(body, { status, headers });
}

function formatUnknownError(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  try {
    return JSON.stringify(error);
  } catch {
    return "Unexpected ingest error";
  }
}

function checkRateLimit(key: string) {
  const now = Date.now();
  const current = rateLimits.get(key);
  if (!current || current.resetAt < now) {
    rateLimits.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (current.count >= RATE_LIMIT_MAX) return false;
  current.count += 1;
  return true;
}

async function isOriginAllowed(
  admin: ReturnType<typeof createAdminClient>,
  projectId: string,
  environment: SnapBugEnvironment,
  origin: string
) {
  if (environment === "development" && isLocalDevelopmentOrigin(origin)) return true;

  const { data, error } = await admin
    .from("project_origins")
    .select("id")
    .eq("project_id", projectId)
    .eq("environment", environment)
    .eq("origin", origin)
    .eq("enabled", true)
    .maybeSingle();

  if (error) throw error;
  return Boolean(data);
}

async function uploadArtifacts(
  admin: ReturnType<typeof createAdminClient>,
  reportId: string,
  payload: {
    screenshotDataUrl?: string;
    consoleLogs?: unknown[];
    replayEvents?: unknown[];
  },
  uploadedBy: string | null
) {
  const errors: string[] = [];

  if (payload.screenshotDataUrl) {
    try {
      const screenshot = parseDataUrl(payload.screenshotDataUrl);
      if (screenshot) {
        const extension = screenshot.contentType === "image/jpeg" ? "jpg" : "png";
        await uploadArtifact(
          admin,
          reportId,
          "screenshot",
          `${reportId}/screenshot.${extension}`,
          screenshot.contentType,
          screenshot.bytes,
          {
            displayName: "Initial screenshot",
            isPrimary: true,
            position: 0,
            uploadedBy
          }
        );
      }
    } catch (error) {
      errors.push(`screenshot: ${error instanceof Error ? error.message : "failed"}`);
    }
  }

  if (payload.consoleLogs?.length) {
    try {
      const bytes = Buffer.from(JSON.stringify(payload.consoleLogs, null, 2));
      await uploadArtifact(admin, reportId, "console_logs", `${reportId}/console-logs.json`, "application/json", bytes, {
        displayName: "Console logs",
        position: 10,
        uploadedBy
      });
    } catch (error) {
      errors.push(`console_logs: ${error instanceof Error ? error.message : "failed"}`);
    }
  }

  if (payload.replayEvents?.length) {
    try {
      const bytes = Buffer.from(JSON.stringify(payload.replayEvents));
      await uploadArtifact(admin, reportId, "replay", `${reportId}/replay.json`, "application/json", bytes, {
        displayName: "Replay events",
        position: 20,
        uploadedBy
      });
    } catch (error) {
      errors.push(`replay: ${error instanceof Error ? error.message : "failed"}`);
    }
  }

  return errors;
}

function parseDataUrl(dataUrl: string) {
  const match = dataUrl.match(/^data:(image\/(?:png|jpeg));base64,([A-Za-z0-9+/=]+)$/);
  if (!match) return null;
  return {
    contentType: match[1],
    bytes: Buffer.from(match[2], "base64")
  };
}

async function uploadArtifact(
  admin: ReturnType<typeof createAdminClient>,
  reportId: string,
  kind: "screenshot" | "console_logs" | "replay",
  storagePath: string,
  contentType: string,
  bytes: Buffer,
  options: { displayName: string; position: number; isPrimary?: boolean; uploadedBy?: string | null }
) {
  const { error: uploadError } = await admin.storage.from("report-artifacts").upload(storagePath, bytes, {
    contentType,
    upsert: false
  });
  if (uploadError) throw uploadError;

  const { error: insertError } = await admin.from("report_artifacts").insert({
    report_id: reportId,
    kind,
    storage_path: storagePath,
    content_type: contentType,
    byte_size: bytes.byteLength,
    display_name: options.displayName,
    position: options.position,
    is_primary: Boolean(options.isPrimary),
    uploaded_by: options.uploadedBy || null
  });
  if (insertError) throw insertError;
}

async function validateDeveloperToken(
  admin: ReturnType<typeof createAdminClient>,
  projectId: string,
  token: string | undefined,
  headers: Headers
) {
  if (!token) {
    throw new IngestResponseError({ error: "Developer token is required for development reports" }, 401, headers);
  }

  const { data: tokenRow, error: tokenError } = await admin
    .from("developer_tokens")
    .select("id, user_id, expires_at, revoked_at")
    .eq("token_hash", hashSecret(token))
    .maybeSingle();

  if (tokenError) throw tokenError;
  if (!tokenRow || tokenRow.revoked_at || new Date(tokenRow.expires_at).getTime() <= Date.now()) {
    throw new IngestResponseError({ error: "Invalid or expired developer token" }, 401, headers);
  }

  const { data: member, error: memberError } = await admin
    .from("project_members")
    .select("project_id")
    .eq("project_id", projectId)
    .eq("user_id", tokenRow.user_id)
    .maybeSingle();

  if (memberError) throw memberError;
  if (!member) {
    throw new IngestResponseError({ error: "Developer token user is not a member of this project" }, 403, headers);
  }

  const { data: profile, error: profileError } = await admin.from("profiles").select("email").eq("id", tokenRow.user_id).maybeSingle();
  if (profileError) throw profileError;

  await admin.from("developer_tokens").update({ last_used_at: new Date().toISOString() }).eq("id", tokenRow.id);
  return {
    userId: tokenRow.user_id as string,
    email: profile?.email || null
  };
}

class IngestResponseError extends Error {
  constructor(
    readonly body: unknown,
    readonly status: number,
    readonly headers: Headers
  ) {
    super("Ingest response error");
  }
}
