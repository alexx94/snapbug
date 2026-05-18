import type {
  SnapBugConsoleEntry,
  SnapBugEnvironment,
  SnapBugInitOptions,
  SnapBugIngestPayload,
  SnapBugPresentation,
  SnapBugTriggerMode,
  SnapBugWidgetPlacement
} from "@snapbug/shared/types";
import { createAnnotator } from "./annotator";
import html2canvas from "html2canvas";
import type {
  WidgetCloseMessage,
  WidgetReadyMessage,
  WidgetSetPlacementMessage,
  WidgetSubmitMessage,
  WidgetSubmitResultMessage
} from "./messages";

const PLACEMENT_STORAGE_KEY = "snapbug.widgetPlacement";
const MAX_LOGS = 80;
const MAX_REPLAY_EVENTS = 150;

type ConsoleMethod = "log" | "info" | "warn" | "error" | "debug";
type SnapBugOpenOptions = {
  presentation?: SnapBugPresentation;
};

const VALID_PLACEMENTS: SnapBugWidgetPlacement[] = ["bottom-right", "bottom-left", "top-right", "top-left"];

class SnapBugClient {
  private options: Required<Pick<SnapBugInitOptions, "captureConsole" | "captureReplay">> & SnapBugInitOptions;
  private key: string;
  private environment: SnapBugEnvironment;
  private trigger: SnapBugTriggerMode;
  private placement: SnapBugWidgetPlacement;
  private presentation: SnapBugPresentation;
  private apiBaseUrl: string;
  private platformOrigin: string;
  private button?: HTMLButtonElement;
  private iframes: Partial<Record<SnapBugPresentation, HTMLIFrameElement>> = {};
  private activePresentation?: SnapBugPresentation;
  private submitting = false;
  private consoleEntries: SnapBugConsoleEntry[] = [];
  private replayEvents: unknown[] = [];
  private stopReplay?: () => void;
  private originalConsole = new Map<ConsoleMethod, (...args: unknown[]) => void>();

  constructor(options: SnapBugInitOptions) {
    const resolved = this.resolveKey(options);
    this.options = {
      captureConsole: true,
      captureReplay: false,
      ...options
    };
    this.key = resolved.key;
    this.environment = resolved.environment;
    this.trigger = this.environment === "production" ? "none" : (options.trigger ?? "widget");
    this.placement = this.resolvePlacement(options.placement);
    this.presentation = options.presentation ?? (this.trigger === "button" ? "modal" : "popover");
    this.apiBaseUrl = this.resolveApiBaseUrl(options.apiBaseUrl);
    this.platformOrigin = new URL(this.apiBaseUrl).origin;
  }

  start() {
    if (this.options.enabled === false) return;
    if (!this.key.startsWith("pk_dev_") && !this.key.startsWith("pk_live_")) {
      throw new Error("SnapBug key must start with pk_dev_ or pk_live_");
    }

    if (this.options.captureConsole) this.captureConsole();
    if (this.options.captureReplay) void this.captureReplay();

    if (this.trigger !== "none") this.createButton();
    window.addEventListener("message", this.handleMessage);
  }

  destroy() {
    window.removeEventListener("message", this.handleMessage);
    this.stopReplay?.();
    this.restoreConsole();
    this.button?.remove();
    Object.values(this.iframes).forEach((iframe) => iframe?.remove());
    this.iframes = {};
  }

  open(options: SnapBugOpenOptions = {}) {
    if (this.options.enabled === false) return;
    const presentation = options.presentation ?? this.presentation;
    const iframe = this.ensureIframe(presentation);
    this.activePresentation = presentation;
    this.applyIframeLayout(iframe, presentation);
    iframe.style.display = "block";
    this.postContext(iframe);
  }

  close() {
    if (this.activePresentation) {
      this.iframes[this.activePresentation]!.style.display = "none";
      return;
    }
    Object.values(this.iframes).forEach((iframe) => {
      if (iframe) iframe.style.display = "none";
    });
  }

  toggle(options: SnapBugOpenOptions = {}) {
    const presentation = options.presentation ?? this.presentation;
    const iframe = this.iframes[presentation];
    if (!iframe || iframe.style.display === "none") {
      this.open(options);
      return;
    }
    iframe.style.display = "none";
  }

  setPlacement(placement: SnapBugWidgetPlacement) {
    if (!VALID_PLACEMENTS.includes(placement)) return;
    this.placement = placement;
    if (this.environment === "development") {
      try {
        window.localStorage.setItem(PLACEMENT_STORAGE_KEY, placement);
      } catch {
        // Ignore storage failures in locked-down browser contexts.
      }
    }
    this.applyButtonPlacement();
    Object.entries(this.iframes).forEach(([presentation, iframe]) => {
      if (iframe) this.applyIframeLayout(iframe, presentation as SnapBugPresentation);
    });
    this.postContext();
  }

  private resolveKey(options: SnapBugInitOptions): { key: string; environment: SnapBugEnvironment } {
    const requestedEnvironment = options.environment && options.environment !== "auto" ? options.environment : this.inferRuntimeEnvironment();
    const key = options.key ?? (requestedEnvironment === "development" ? options.developmentKey : options.productionKey);
    if (!key) {
      throw new Error(
        `SnapBug ${requestedEnvironment} key is missing. Pass key, or pass developmentKey and productionKey for automatic environment selection.`
      );
    }

    const environment = key.startsWith("pk_dev_") ? "development" : key.startsWith("pk_live_") ? "production" : requestedEnvironment;
    return { key, environment };
  }

  private inferRuntimeEnvironment(): SnapBugEnvironment {
    const processEnv = (globalThis as typeof globalThis & { process?: { env?: Record<string, string | undefined> } }).process?.env;
    const viteEnv = (import.meta as ImportMeta & { env?: { DEV?: boolean; MODE?: string } }).env;

    if (processEnv?.NODE_ENV === "development" || viteEnv?.DEV || viteEnv?.MODE === "development") return "development";
    if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") return "development";
    return "production";
  }

  private resolvePlacement(explicit?: SnapBugWidgetPlacement): SnapBugWidgetPlacement {
    if (explicit) return explicit;
    if (this.environment !== "development") return "bottom-right";

    try {
      const stored = window.localStorage.getItem(PLACEMENT_STORAGE_KEY) as SnapBugWidgetPlacement | null;
      if (stored && VALID_PLACEMENTS.includes(stored)) return stored;
    } catch {
      // Keep the default if storage is unavailable.
    }

    return "bottom-right";
  }

  private resolveApiBaseUrl(explicit?: string) {
    if (explicit) return explicit.replace(/\/$/, "");

    const script = document.currentScript as HTMLScriptElement | null;
    if (script?.src) return new URL(script.src).origin;

    return window.location.origin;
  }

  private createButton() {
    const button = document.createElement("button");
    button.type = "button";
    button.setAttribute("data-snapbug-ignore", "true");
    button.setAttribute("aria-label", "Open SnapBug report");
    button.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m8 2 1.88 1.88"/><path d="M14.12 3.88 16 2"/><path d="M9 7.13v-1a3.003 3.003 0 1 1 6 0v1"/><path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6"/><path d="M12 20v-9"/><path d="M6.53 9C4.6 8.8 3 7.1 3 5"/><path d="M6 13H2"/><path d="M3 21c0-2.1 1.7-3.9 3.8-4"/><path d="M20.97 5c0 2.1-1.6 3.8-3.5 4"/><path d="M22 13h-4"/><path d="M17.2 17c2.1.1 3.8 1.9 3.8 4"/></svg>`;
    button.style.cssText = [
      "position:fixed",
      "z-index:2147483646",
      "border:3px solid #121c2b",
      "border-radius:50%",
      "background:#fe00fe",
      "color:#fff",
      "font:600 13px/1 system-ui,-apple-system,Segoe UI,sans-serif",
      "padding:12px",
      "box-shadow:4px 4px 0 0 #121c2b",
      "cursor:pointer",
      "display:flex",
      "align-items:center",
      "justify-content:center",
      "transition:transform 150ms ease,box-shadow 150ms ease"
    ].join(";");
    button.addEventListener("click", () => {
      this.toggle({ presentation: this.trigger === "button" ? "modal" : "popover" });
    });
    document.documentElement.appendChild(button);
    this.button = button;
    this.applyButtonPlacement();
  }

  private ensureIframe(presentation: SnapBugPresentation) {
    const existing = this.iframes[presentation];
    if (existing) return existing;

    const iframe = document.createElement("iframe");
    iframe.src = `${this.apiBaseUrl}/widget?environment=${this.environment}`;
    iframe.title = "SnapBug";
    iframe.setAttribute("data-snapbug-ignore", "true");
    iframe.allow = "clipboard-write";
    iframe.style.cssText = [
      "position:fixed",
      "z-index:2147483647",
      "border:1px solid rgba(17,24,39,.12)",
      "border-radius:12px",
      "box-shadow:0 24px 70px rgba(15,23,42,.28)",
      "background:#fff"
    ].join(";");
    iframe.style.display = "none";
    document.documentElement.appendChild(iframe);
    this.iframes[presentation] = iframe;
    this.applyIframeLayout(iframe, presentation);
    return iframe;
  }

  private applyButtonPlacement() {
    if (!this.button) return;
    this.resetPlacement(this.button);
    const vertical = this.placement.startsWith("top") ? "top" : "bottom";
    const horizontal = this.placement.endsWith("left") ? "left" : "right";
    this.button.style[vertical] = "18px";
    this.button.style[horizontal] = "18px";
  }

  private applyIframeLayout(iframe: HTMLIFrameElement, presentation: SnapBugPresentation) {
    this.resetPlacement(iframe);

    if (presentation === "modal") {
      iframe.style.top = "50%";
      iframe.style.left = "50%";
      iframe.style.transform = "translate(-50%,-50%)";
      iframe.style.width = "min(460px,calc(100vw - 32px))";
      iframe.style.height = "min(560px,calc(100vh - 32px))";
      return;
    }

    iframe.style.transform = "";
    iframe.style.width = "min(420px,calc(100vw - 32px))";
    iframe.style.height = "min(620px,calc(100vh - 96px))";

    const vertical = this.placement.startsWith("top") ? "top" : "bottom";
    const horizontal = this.placement.endsWith("left") ? "left" : "right";
    iframe.style[vertical] = "74px";
    iframe.style[horizontal] = "18px";
  }

  private resetPlacement(element: HTMLElement) {
    element.style.top = "";
    element.style.right = "";
    element.style.bottom = "";
    element.style.left = "";
    element.style.transform = "";
  }

  private handleMessage = (event: MessageEvent) => {
    if (event.origin !== this.platformOrigin) return;
    const data = event.data as WidgetReadyMessage | WidgetSubmitMessage | WidgetCloseMessage | WidgetSetPlacementMessage;
    const iframe = this.getIframeForSource(event.source);
    if (!iframe) return;

    if (data?.source === "snapbug-widget" && data.type === "SNAPBUG_WIDGET_READY") {
      this.postContext(iframe);
      return;
    }

    if (data?.source === "snapbug-widget" && data.type === "SNAPBUG_SUBMIT") {
      void this.submit(data.payload, iframe);
      return;
    }

    if (data?.source === "snapbug-widget" && data.type === "SNAPBUG_SET_PLACEMENT") {
      if (this.environment === "development") this.setPlacement(data.placement);
      return;
    }

    if (data?.type === "SNAPBUG_CLOSE") {
      iframe.style.display = "none";
    }
  };

  private getIframeForSource(source: MessageEventSource | null) {
    return Object.values(this.iframes).find((iframe) => iframe?.contentWindow === source);
  }

  private postContext(target?: HTMLIFrameElement) {
    const targets = target ? [target] : Object.values(this.iframes);
    targets.forEach((iframe) => iframe?.contentWindow?.postMessage(
      {
        source: "snapbug-sdk",
        type: "SNAPBUG_CONTEXT",
        environment: this.environment,
        placement: this.placement,
        consoleLogs: this.consoleEntries,
        pageUrl: window.location.href
      },
      this.platformOrigin
    ));
  }

  private async submit(form: WidgetSubmitMessage["payload"], sourceFrame: HTMLIFrameElement) {
    if (this.submitting) return;
    this.submitting = true;

    try {
      this.setChromeVisibility(false);
      let screenshotDataUrl: string | null = await this.captureScreenshot();
      this.setChromeVisibility(true);

      if (this.environment === "development") {
        screenshotDataUrl = await createAnnotator(screenshotDataUrl);
        if (screenshotDataUrl === null) {
          this.postResult(sourceFrame, { ok: false, error: "cancelled" });
          return;
        }
      }

      const payload: SnapBugIngestPayload = {
        key: this.key,
        developerToken: this.environment === "development" ? this.options.developerToken : undefined,
        type: this.environment === "production" ? "bug" : form.type,
        priority: form.priority,
        title: form.title,
        message: form.message,
        reporterName: this.environment === "production" ? form.reporterName : undefined,
        pageUrl: window.location.href,
        userAgent: navigator.userAgent,
        browser: {
          language: navigator.language,
          platform: navigator.platform,
          cookieEnabled: navigator.cookieEnabled
        },
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight,
          devicePixelRatio: window.devicePixelRatio || 1
        },
        metadata: {
          referrer: document.referrer || null,
          timestamp: new Date().toISOString()
        },
        screenshotDataUrl,
        consoleLogs: this.consoleEntries.slice(-MAX_LOGS),
        replayEvents: this.options.captureReplay ? this.replayEvents.slice(-MAX_REPLAY_EVENTS) : []
      };

      const response = await fetch(`${this.apiBaseUrl}/api/ingest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        mode: "cors"
      });

      const result = (await response.json().catch(() => ({}))) as { reportId?: string; error?: string };
      if (!response.ok) throw new Error(result.error || "Report failed");

      this.postResult(sourceFrame, { ok: true, reportId: result.reportId });
    } catch (error) {
      this.setChromeVisibility(true);
      this.postResult(sourceFrame, { ok: false, error: error instanceof Error ? error.message : "Report failed" });
    } finally {
      this.submitting = false;
    }
  }

  private postResult(target: HTMLIFrameElement, result: Omit<WidgetSubmitResultMessage, "source" | "type">) {
    target.contentWindow?.postMessage(
      {
        source: "snapbug-sdk",
        type: "SNAPBUG_SUBMIT_RESULT",
        ...result
      },
      this.platformOrigin
    );
  }

  private async captureScreenshot() {
    const dpr = window.devicePixelRatio || 1;
    const canvas = await html2canvas(document.documentElement, {
      useCORS: true,
      logging: false,
      scale: dpr,
      x: window.scrollX,
      y: window.scrollY,
      width: window.innerWidth,
      height: window.innerHeight,
      windowWidth: window.innerWidth,
      windowHeight: window.innerHeight,
      ignoreElements: (element) => element.hasAttribute("data-snapbug-ignore"),
      onclone: (clonedDoc) => {
        clonedDoc.querySelectorAll('img[loading="lazy"]').forEach((img) => {
          (img as HTMLImageElement).loading = "eager";
        });
      }
    });
    const maxWidth = 1920;
    if (canvas.width <= maxWidth) {
      return canvas.toDataURL("image/png");
    }

    const resized = document.createElement("canvas");
    const ratio = maxWidth / canvas.width;
    resized.width = maxWidth;
    resized.height = Math.round(canvas.height * ratio);
    const ctx = resized.getContext("2d");
    if (ctx) {
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(canvas, 0, 0, resized.width, resized.height);
    }
    return resized.toDataURL("image/png");
  }

  private setChromeVisibility(visible: boolean) {
    const display = visible ? "" : "none";
    if (this.button) this.button.style.display = display;
  }

  private captureConsole() {
    const methods: ConsoleMethod[] = ["log", "info", "warn", "error", "debug"];
    methods.forEach((method) => {
      if (this.originalConsole.has(method)) return;
      const original = console[method].bind(console);
      this.originalConsole.set(method, original);
      console[method] = (...args: unknown[]) => {
        this.consoleEntries.push({
          level: method,
          message: args.map((arg) => this.stringifyConsoleArg(arg)).join(" "),
          timestamp: new Date().toISOString()
        });
        this.consoleEntries = this.consoleEntries.slice(-MAX_LOGS);
        original(...args);
      };
    });
  }

  private restoreConsole() {
    this.originalConsole.forEach((original, method) => {
      console[method] = original;
    });
    this.originalConsole.clear();
  }

  private stringifyConsoleArg(arg: unknown) {
    if (typeof arg === "string") return arg;
    if (arg instanceof Error) return `${arg.name}: ${arg.message}`;
    try {
      return JSON.stringify(arg);
    } catch {
      return String(arg);
    }
  }

  private async captureReplay() {
    try {
      const { record } = await import("@rrweb/record");
      this.stopReplay = record({
        emit: (event) => {
          this.replayEvents.push(event);
          this.replayEvents = this.replayEvents.slice(-MAX_REPLAY_EVENTS);
        },
        maskAllInputs: true
      });
    } catch (error) {
      this.consoleEntries.push({
        level: "warn",
        message: `Replay capture unavailable: ${error instanceof Error ? error.message : "unknown error"}`,
        timestamp: new Date().toISOString()
      });
    }
  }
}

let activeClient: SnapBugClient | undefined;

export const SnapBug = {
  init(options: SnapBugInitOptions) {
    activeClient?.destroy();
    activeClient = new SnapBugClient(options);
    activeClient.start();
    return activeClient;
  },
  open(options?: SnapBugOpenOptions) {
    activeClient?.open(options);
  },
  close() {
    activeClient?.close();
  },
  toggle(options?: SnapBugOpenOptions) {
    activeClient?.toggle(options);
  },
  setPlacement(placement: SnapBugWidgetPlacement) {
    activeClient?.setPlacement(placement);
  },
  destroy() {
    activeClient?.destroy();
    activeClient = undefined;
  }
};

declare global {
  interface Window {
    SnapBug?: typeof SnapBug;
  }
}

if (typeof window !== "undefined") {
  window.SnapBug = SnapBug;
}
