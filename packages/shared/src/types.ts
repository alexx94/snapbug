export const SNAPBUG_ENVIRONMENTS = ["development", "production"] as const;
export const SNAPBUG_REPORT_TYPES = ["bug", "todo", "feedback"] as const;
export const SNAPBUG_REPORT_STATUSES = ["open", "triaged", "in_progress", "resolved", "closed"] as const;
export const SNAPBUG_REPORT_PRIORITIES = ["low", "medium", "high", "critical"] as const;
export const SNAPBUG_WIDGET_PLACEMENTS = ["bottom-right", "bottom-left", "top-right", "top-left"] as const;
export const SNAPBUG_TRIGGER_MODES = ["widget", "button", "none"] as const;
export const SNAPBUG_PRESENTATIONS = ["popover", "modal"] as const;

export type SnapBugEnvironment = (typeof SNAPBUG_ENVIRONMENTS)[number];
export type SnapBugReportType = (typeof SNAPBUG_REPORT_TYPES)[number];
export type SnapBugReportStatus = (typeof SNAPBUG_REPORT_STATUSES)[number];
export type SnapBugReportPriority = (typeof SNAPBUG_REPORT_PRIORITIES)[number];
export type SnapBugWidgetPlacement = (typeof SNAPBUG_WIDGET_PLACEMENTS)[number];
export type SnapBugTriggerMode = (typeof SNAPBUG_TRIGGER_MODES)[number];
export type SnapBugPresentation = (typeof SNAPBUG_PRESENTATIONS)[number];

export type SnapBugConsoleLevel = "log" | "info" | "warn" | "error" | "debug";

export interface SnapBugConsoleEntry {
  level: SnapBugConsoleLevel;
  message: string;
  timestamp: string;
}

export interface SnapBugViewport {
  width: number;
  height: number;
  devicePixelRatio: number;
}

export interface SnapBugBrowserInfo {
  language?: string;
  platform?: string;
  cookieEnabled?: boolean;
}

export interface SnapBugIngestPayload {
  key: string;
  type: SnapBugReportType;
  priority?: SnapBugReportPriority;
  title?: string;
  message: string;
  reporterName?: string;
  pageUrl: string;
  userAgent?: string;
  browser?: SnapBugBrowserInfo;
  viewport?: SnapBugViewport;
  metadata?: Record<string, unknown>;
  screenshotDataUrl?: string;
  consoleLogs?: SnapBugConsoleEntry[];
  replayEvents?: unknown[];
}

export interface SnapBugInitOptions {
  key?: string;
  developmentKey?: string;
  productionKey?: string;
  environment?: SnapBugEnvironment | "auto";
  apiBaseUrl?: string;
  enabled?: boolean;
  captureConsole?: boolean;
  captureReplay?: boolean;
  trigger?: SnapBugTriggerMode;
  placement?: SnapBugWidgetPlacement;
  presentation?: SnapBugPresentation;
  buttonLabel?: string;
}
