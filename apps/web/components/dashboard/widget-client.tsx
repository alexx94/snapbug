"use client";

import type { WidgetContextMessage, WidgetSubmitResultMessage } from "@snapbug/sdk/messages";
import type { SnapBugEnvironment, SnapBugReportPriority, SnapBugReportType, SnapBugWidgetPlacement } from "@snapbug/shared/types";
import { useEffect, useMemo, useRef, useState } from "react";

type View = "form" | "submitting" | "success" | "error";
type FieldErrors = { title?: string; message?: string };

export function WidgetClient({ environment }: { environment: SnapBugEnvironment }) {
  const [context, setContext] = useState<WidgetContextMessage | null>(null);
  const [parentOrigin, setParentOrigin] = useState<string>("*");
  const [type, setType] = useState<SnapBugReportType>("bug");
  const [placement, setPlacement] = useState<SnapBugWidgetPlacement>("bottom-right");
  const [priority, setPriority] = useState<SnapBugReportPriority>("medium");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [view, setView] = useState<View>("form");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const titleRef = useRef<HTMLInputElement>(null);
  const messageRef = useRef<HTMLTextAreaElement>(null);

  function resetForm() {
    setType("bug");
    setTitle("");
    setMessage("");
    setErrorMessage(null);
    setFieldErrors({});
    setView("form");
  }

  useEffect(() => {
    window.parent.postMessage({ source: "snapbug-widget", type: "SNAPBUG_WIDGET_READY" }, "*");

    const onMessage = (event: MessageEvent) => {
      const data = event.data as WidgetContextMessage | WidgetSubmitResultMessage;
      if (data?.source === "snapbug-sdk" && data.type === "SNAPBUG_CONTEXT") {
        setParentOrigin(event.origin);
        setContext(data);
        setPlacement(data.placement);
      }

      if (data?.source === "snapbug-sdk" && data.type === "SNAPBUG_SUBMIT_RESULT") {
        if (data.ok) {
          setView("success");
          setTimeout(() => {
            resetForm();
            window.parent.postMessage({ type: "SNAPBUG_CLOSE" }, parentOrigin);
          }, 2000);
        } else if (data.error === "cancelled") {
          setView("form");
        } else {
          setErrorMessage(data.error || "Something went wrong");
          setView("error");
        }
      }
    };

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  const recentLogs = useMemo(() => context?.consoleLogs?.slice(-8) || [], [context]);

  function validate(): boolean {
    const errors: FieldErrors = {};

    if (!title.trim()) {
      errors.title = "Title is required";
    }
    if (!message.trim()) {
      errors.message = "Details are required";
    }

    setFieldErrors(errors);

    if (errors.title) {
      titleRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    } else if (errors.message) {
      messageRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    return Object.keys(errors).length === 0;
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (view === "submitting") return;
    if (!validate()) return;

    setView("submitting");
    setErrorMessage(null);

    window.parent.postMessage(
      {
        source: "snapbug-widget",
        type: "SNAPBUG_SUBMIT",
        payload: {
          type,
          priority,
          title: title.trim(),
          message: message.trim()
        }
      },
      parentOrigin
    );
  }

  function updatePlacement(nextPlacement: SnapBugWidgetPlacement) {
    setPlacement(nextPlacement);
    window.parent.postMessage(
      {
        source: "snapbug-widget",
        type: "SNAPBUG_SET_PLACEMENT",
        placement: nextPlacement
      },
      parentOrigin
    );
  }

  if (view === "success") {
    return (
      <main className="widget-body widget-result">
        <div className="widget-result-icon widget-result-success">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </div>
        <h2 className="widget-title">Report sent</h2>
        <p className="muted">Your report has been received.</p>
      </main>
    );
  }

  if (view === "error") {
    return (
      <main className="widget-body widget-result">
        <div className="widget-result-icon widget-result-error">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
        </div>
        <h2 className="widget-title">Failed to send</h2>
        <p className="error">{errorMessage}</p>
        <button className="button" type="button" onClick={() => setView("form")}>
          Try again
        </button>
      </main>
    );
  }

  return (
    <main className="widget-body">
      <form className="stack" onSubmit={submit} noValidate>
        <div className="row between">
          <div>
            <h1 className="widget-title">{environment === "development" ? "SnapBug Dev" : "Report a problem"}</h1>
            <div className={environment === "development" ? "badge dev" : "badge prod"}>{environment}</div>
          </div>
          <div className="widget-header-actions">
            <button className="widget-clear" type="button" onClick={resetForm} disabled={view === "submitting"} title="Clear form">
              Clear
            </button>
            <button className="widget-close" type="button" onClick={() => window.parent.postMessage({ type: "SNAPBUG_CLOSE" }, parentOrigin)} title="Close">
              x
            </button>
          </div>
        </div>

        {environment === "development" ? (
          <>
            <div className="grid two">
              <label className="stack">
                <span className="muted">Type</span>
                <select className="select" value={type} onChange={(event) => setType(event.target.value as SnapBugReportType)}>
                  <option value="bug">Bug</option>
                  <option value="todo">TODO</option>
                  <option value="feedback">Feedback</option>
                </select>
              </label>
              <label className="stack">
                <span className="muted">Priority</span>
                <select className="select" value={priority} onChange={(event) => setPriority(event.target.value as SnapBugReportPriority)}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </label>
            </div>
            <label className="stack">
              <span className="muted">Widget position</span>
              <select className="select" value={placement} onChange={(event) => updatePlacement(event.target.value as SnapBugWidgetPlacement)}>
                <option value="bottom-right">Bottom right</option>
                <option value="bottom-left">Bottom left</option>
                <option value="top-right">Top right</option>
                <option value="top-left">Top left</option>
              </select>
            </label>
          </>
        ) : null}

        <label className="stack">
          <span className="muted">Title</span>
          <input
            ref={titleRef}
            className={`input${fieldErrors.title ? " input-error" : ""}`}
            value={title}
            onChange={(event) => { setTitle(event.target.value); if (fieldErrors.title) setFieldErrors((e) => ({ ...e, title: undefined })); }}
            placeholder="Short summary"
          />
          {fieldErrors.title ? <span className="field-error">{fieldErrors.title}</span> : null}
        </label>

        <label className="stack">
          <span className="muted">{environment === "development" ? "Details" : "What is not working?"}</span>
          <textarea
            ref={messageRef}
            className={`textarea${fieldErrors.message ? " input-error" : ""}`}
            value={message}
            onChange={(event) => { setMessage(event.target.value); if (fieldErrors.message) setFieldErrors((e) => ({ ...e, message: undefined })); }}
            placeholder={environment === "development" ? "What should be fixed or remembered?" : "Describe the issue..."}
          />
          {fieldErrors.message ? <span className="field-error">{fieldErrors.message}</span> : null}
        </label>

        {environment === "development" ? (
          <div className="stack">
            <span className="muted">Recent console logs</span>
            <div className="widget-logbox">
              {recentLogs.length ? recentLogs.map((log, index) => <div key={`${log.timestamp}-${index}`}>[{log.level}] {log.message}</div>) : "No logs captured yet."}
            </div>
          </div>
        ) : null}

        {context?.pageUrl ? <div className="muted">Page: {context.pageUrl}</div> : null}

        <button className="button" type="submit" disabled={view === "submitting"}>
          {view === "submitting" ? "Sending..." : "Send report"}
        </button>
      </form>
    </main>
  );
}
