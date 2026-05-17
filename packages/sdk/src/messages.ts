import type {
  SnapBugConsoleEntry,
  SnapBugEnvironment,
  SnapBugWidgetPlacement,
  SnapBugReportPriority,
  SnapBugReportType
} from "@snapbug/shared/types";

export type WidgetContextMessage = {
  source: "snapbug-sdk";
  type: "SNAPBUG_CONTEXT";
  environment: SnapBugEnvironment;
  placement: SnapBugWidgetPlacement;
  consoleLogs: SnapBugConsoleEntry[];
  pageUrl: string;
};

export type WidgetReadyMessage = {
  source: "snapbug-widget";
  type: "SNAPBUG_WIDGET_READY";
};

export type WidgetSubmitMessage = {
  source: "snapbug-widget";
  type: "SNAPBUG_SUBMIT";
  payload: {
    type: SnapBugReportType;
    priority: SnapBugReportPriority;
    title?: string;
    message: string;
    reporterName?: string;
  };
};

export type WidgetCloseMessage = {
  source?: "snapbug-widget";
  type: "SNAPBUG_CLOSE";
};

export type WidgetSetPlacementMessage = {
  source: "snapbug-widget";
  type: "SNAPBUG_SET_PLACEMENT";
  placement: SnapBugWidgetPlacement;
};

export type WidgetSubmitResultMessage = {
  source: "snapbug-sdk";
  type: "SNAPBUG_SUBMIT_RESULT";
  ok: boolean;
  error?: string;
  reportId?: string;
};
