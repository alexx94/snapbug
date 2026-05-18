# @snapbug/sdk

Browser SDK for SnapBug — capture bug reports with screenshots, console logs, and session replay directly from your web app.

## Installation

Build the SDK first, then install it in your project.

**Step 1 — build:**
```bash
# From the SnapBug monorepo root
pnpm sdk:build
```

**Step 2 — install in your project:**
```bash
# Option A: pack into a tarball (portable)
cd packages/sdk
npm pack
# → produces snapbug-sdk-0.1.0.tgz

npm install /path/to/snapbug-sdk-0.1.0.tgz
```

```bash
# Option B: install directly from local path (same machine)
npm install /absolute/path/to/snapbug/packages/sdk
```

**Or include the UMD build via script tag (no bundler needed):**
```html
<script src="/path/to/dist/snapbug.umd.cjs"></script>
<script>
  window.SnapBug.init({ developmentKey: "pk_dev_..." });
</script>
```

## Quick Start

```ts
import { SnapBug } from "@snapbug/sdk";

SnapBug.init({
  developmentKey: "pk_dev_...",
  productionKey: "pk_live_...",
});
```

In development the SDK shows a floating widget button. In production the widget is hidden by default — call `SnapBug.open()` from your own UI to trigger the report flow.

## Configuration

All options are passed to `SnapBug.init()`:

| Option | Type | Default | Description |
|---|---|---|---|
| `developmentKey` | `string` | — | Development key (`pk_dev_...`). Get it from your project dashboard. |
| `productionKey` | `string` | — | Production key (`pk_live_...`). Get it from your project dashboard. |
| `key` | `string` | — | Single key shorthand — use this OR the dev/prod pair above. |
| `developerToken` | `string` | — | Optional developer token (`sbdt_...`) to attribute dev reports to you. |
| `environment` | `"development" \| "production" \| "auto"` | `"auto"` | Force an environment or let the SDK detect it automatically. |
| `apiBaseUrl` | `string` | Inferred from script origin | Override the SnapBug API base URL. |
| `enabled` | `boolean` | `true` | Set to `false` to disable the SDK entirely. |
| `captureConsole` | `boolean` | `true` | Capture the last 80 console log entries with each report. |
| `captureReplay` | `boolean` | `true` | Capture the last 150 session replay events via rrweb. |
| `trigger` | `"widget" \| "button" \| "none"` | `"widget"` (dev) / `"none"` (prod) | How the report UI is triggered. |
| `placement` | `"bottom-right" \| "bottom-left" \| "top-right" \| "top-left"` | `"bottom-right"` | Position of the floating widget button. |
| `presentation` | `"popover" \| "modal"` | `"popover"` (dev) / `"modal"` (prod) | How the report form is displayed. |
| `buttonLabel` | `string` | `"Report a problem"` | Label on the trigger button (when `trigger: "button"`). |

## API Reference

| Method | Description |
|---|---|
| `SnapBug.init(options)` | Initialize the SDK. Call once on app startup. |
| `SnapBug.open(options?)` | Open the report UI. Accepts optional `{ presentation: "popover" \| "modal" }`. |
| `SnapBug.close()` | Close the report UI. |
| `SnapBug.toggle(options?)` | Toggle the report UI open/closed. |
| `SnapBug.setPlacement(placement)` | Move the floating widget to a different corner at runtime. |
| `SnapBug.destroy()` | Tear down the SDK, remove all DOM elements, and restore patched console methods. |

## Framework Examples

### Vite / vanilla JS

```ts
import { SnapBug } from "@snapbug/sdk";

SnapBug.init({
  developmentKey: import.meta.env.VITE_SNAPBUG_DEV_KEY,
  productionKey: import.meta.env.VITE_SNAPBUG_LIVE_KEY,
});
```

### React (Create React App / Vite)

```tsx
// src/main.tsx
import { SnapBug } from "@snapbug/sdk";

SnapBug.init({
  developmentKey: import.meta.env.VITE_SNAPBUG_DEV_KEY,
  productionKey: import.meta.env.VITE_SNAPBUG_LIVE_KEY,
});
```

Call it once at the top level, outside any component. No `useEffect` needed.

### Next.js (App Router)

```tsx
// app/snapbug.tsx
"use client";

import { SnapBug } from "@snapbug/sdk";
import { useEffect } from "react";

export function SnapBugProvider() {
  useEffect(() => {
    SnapBug.init({
      developmentKey: process.env.NEXT_PUBLIC_SNAPBUG_DEV_KEY,
      productionKey: process.env.NEXT_PUBLIC_SNAPBUG_LIVE_KEY,
    });
    return () => SnapBug.destroy();
  }, []);

  return null;
}
```

```tsx
// app/layout.tsx
import { SnapBugProvider } from "./snapbug";

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <SnapBugProvider />
        {children}
      </body>
    </html>
  );
}
```

### Custom trigger button (production)

```tsx
<button onClick={() => SnapBug.open({ presentation: "modal" })}>
  Report a bug
</button>
```

## Environment Detection

When `environment` is `"auto"` (default), the SDK picks the mode by:

1. If `developmentKey` is set and the page runs on `localhost`, `127.0.0.1`, or `[::1]` → development mode.
2. If `productionKey` is set → production mode.
3. Falls back to development.

You can override this by passing `environment: "development"` or `environment: "production"` explicitly.

## Excluding Elements from Screenshots

Add `data-snapbug-ignore` to any HTML element to exclude it from the screenshot capture:

```html
<div data-snapbug-ignore>Sensitive content</div>
```

## Report Contents

Each submitted report includes:

- Annotated screenshot (PNG, lossless, up to native device resolution)
- Console logs (last 80 entries)
- Session replay (last 150 rrweb events)
- Page URL, viewport dimensions, user agent
- User-provided title, description, report type, and priority

## Building

```bash
pnpm sdk:build   # Vite build + TypeScript declaration emit
pnpm sdk:lint    # Type-check only, no output
```

Build output in `packages/sdk/dist/`:
- `snapbug.js` — ESM bundle
- `snapbug.umd.cjs` — UMD bundle (script tag / CommonJS)
