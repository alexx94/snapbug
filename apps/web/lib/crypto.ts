import { createHash, randomBytes } from "node:crypto";

export function hashProjectKey(key: string) {
  return createHash("sha256").update(key).digest("hex");
}

export function generateProjectKey(environment: "development" | "production") {
  const prefix = environment === "development" ? "pk_dev" : "pk_live";
  return `${prefix}_${randomBytes(32).toString("base64url")}`;
}

export function visibleKeyPrefix(key: string) {
  return `${key.slice(0, 14)}...${key.slice(-6)}`;
}

export function slugify(input: string) {
  const slug = input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return slug || `project-${randomBytes(3).toString("hex")}`;
}
