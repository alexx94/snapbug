const ALLOWED_ATTACHMENT_TYPES = new Set(["image/png", "image/jpeg", "application/json", "text/plain", "text/markdown", "application/pdf"]);

export const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;

export function sanitizeFileName(name: string) {
  const sanitized = name.trim().replace(/[^A-Za-z0-9._-]+/g, "-").replace(/-+/g, "-");
  return sanitized.slice(0, 120) || "attachment";
}

export function inferContentType(contentType: string, fileName: string) {
  if (contentType) return contentType;
  const extension = fileName.split(".").pop()?.toLowerCase();
  if (extension === "json") return "application/json";
  if (extension === "md" || extension === "markdown") return "text/markdown";
  if (extension === "txt" || extension === "log") return "text/plain";
  if (extension === "pdf") return "application/pdf";
  if (extension === "png") return "image/png";
  if (extension === "jpg" || extension === "jpeg") return "image/jpeg";
  return "application/octet-stream";
}

export function isAllowedAttachmentType(contentType: string) {
  return ALLOWED_ATTACHMENT_TYPES.has(contentType);
}
