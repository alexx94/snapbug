export function normalizeOrigin(input: string) {
  try {
    return new URL(input).origin;
  } catch {
    return "";
  }
}

export function isLocalDevelopmentOrigin(origin: string) {
  try {
    const url = new URL(origin);
    return ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
  } catch {
    return false;
  }
}

export function corsHeaders(origin: string | null, allowed = true) {
  const headers = new Headers();
  if (origin && allowed) headers.set("Access-Control-Allow-Origin", origin);
  headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type");
  headers.set("Access-Control-Max-Age", "86400");
  headers.set("Vary", "Origin");
  return headers;
}
