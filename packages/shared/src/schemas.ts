import { z } from "zod";
import {
  SNAPBUG_REPORT_PRIORITIES,
  SNAPBUG_REPORT_TYPES,
  type SnapBugIngestPayload
} from "./types";

export const consoleEntrySchema = z.object({
  level: z.enum(["log", "info", "warn", "error", "debug"]),
  message: z.string().max(4000),
  timestamp: z.string().max(80)
});

export const viewportSchema = z.object({
  width: z.number().int().min(0).max(20000),
  height: z.number().int().min(0).max(20000),
  devicePixelRatio: z.number().min(0).max(10)
});

export const browserInfoSchema = z.object({
  language: z.string().max(80).optional(),
  platform: z.string().max(120).optional(),
  cookieEnabled: z.boolean().optional()
});

export const ingestPayloadSchema: z.ZodType<SnapBugIngestPayload> = z.object({
  key: z.string().min(16).max(200).regex(/^pk_(dev|live)_[A-Za-z0-9_-]+$/),
  developerToken: z.string().min(16).max(200).regex(/^sbdt_[A-Za-z0-9_-]+$/).optional(),
  type: z.enum(SNAPBUG_REPORT_TYPES),
  priority: z.enum(SNAPBUG_REPORT_PRIORITIES).default("medium").optional(),
  title: z.string().trim().max(200).optional(),
  message: z.string().trim().min(1).max(5000),
  reporterName: z.string().trim().max(120).optional(),
  pageUrl: z.string().min(1).max(2048),
  userAgent: z.string().max(1000).optional(),
  browser: browserInfoSchema.default({}).optional(),
  viewport: viewportSchema.optional(),
  metadata: z.record(z.string(), z.unknown()).default({}).optional(),
  screenshotDataUrl: z.string().max(12_000_000).optional(),
  consoleLogs: z.array(consoleEntrySchema).max(200).default([]).optional(),
  replayEvents: z.array(z.unknown()).max(1000).default([]).optional()
});

export type IngestPayloadInput = z.input<typeof ingestPayloadSchema>;
export type IngestPayload = z.output<typeof ingestPayloadSchema>;
