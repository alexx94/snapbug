# @snapbug/sdk

Browser SDK for [SnapBug](https://github.com/snapbug) — capture bug reports with screenshots, console logs, and session replay from your web app.

## Installation

```bash
# Inside the monorepo
pnpm add @snapbug/sdk
```

Or include the UMD build via a script tag:

```html
<script src="/path/to/snapbug.umd.cjs"></script>
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

In development mode the widget appears as a floating button. In production the widget is hidden — call `SnapBug.open()` from your own UI to trigger the report flow.

## Configuration

All options are passed to `SnapBug.init()`:

| Option | Type | Default | Description |
|---|---|---|---|
| `key` | `string` | — | Single API key (use this OR the dev/prod pair below) |
| `developmentKey` | `string` | — | Development environment key (`pk_dev_...`) |
| `productionKey` | `string` | — | Production environment key (`pk_live_...`) |
| `developerToken` | `string` | — | Optional developer token (`sbdt_...`) for attribution in dev reports |
| `environment` | `"development" \| "production" \| "auto"` | `"auto"` | Environment mode. `"auto"` detects based on which key is provided or `localhost` |
| `apiBaseUrl` | `string` | Inferred from script origin | Base URL of the SnapBug API |
| `enabled` | `boolean` | `true` | Set to `false` to disable the SDK entirely |
| `captureConsole` | `boolean` | `true` | Capture console logs (last 80 entries) |
| `captureReplay` | `boolean` | `true` | Capture session replay via rrweb (last 150 events) |
| `trigger` | `"widget" \| "button" \| "none"` | `"widget"` (dev) / `"none"` (prod) | How the report UI is triggered |
| `placement` | `"bottom-right" \| "bottom-left" \| "top-right" \| "top-left"` | `"bottom-right"` | Position of the floating widget button |
| `presentation` | `"popover" \| "modal"` | `"popover"` (dev) / `"modal"` (prod) | How the report form is displayed |
| `buttonLabel` | `string` | `"Report a problem"` | Label for the trigger button (when `trigger: "button"`) |

## API Reference

| Method | Description |
|---|---|
| `SnapBug.init(options)` | Initialize the SDK. Must be called once before any other method. |
| `SnapBug.open(options?)` | Open the report UI. Accepts optional `{ presentation: "popover" \| "modal" }`. |
| `SnapBug.close()` | Close the report UI. |
| `SnapBug.toggle(options?)` | Toggle the report UI open/closed. |
| `SnapBug.setPlacement(placement)` | Move the floating widget to a different corner. |
| `SnapBug.destroy()` | Tear down the SDK, remove all DOM elements, and restore console methods. |

## Framework Examples

### Vite / vanilla JS

```ts
import { SnapBug } from "@snapbug/sdk";

SnapBug.init({
  developmentKey: import.meta.env.VITE_SNAPBUG_DEV_KEY,
  productionKey: import.meta.env.VITE_SNAPBUG_LIVE_KEY,
});
```

### Next.js (App Router)

```tsx
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

### Custom trigger button (production)

```tsx
<button onClick={() => SnapBug.open({ presentation: "modal" })}>
  Report a bug
</button>
```

## Environment Detection

When `environment` is `"auto"` (default), the SDK determines the mode by:

1. If a `developmentKey` is provided and the page is on `localhost` / `127.0.0.1` / `[::1]`, it uses development mode.
2. If a `productionKey` is provided, it uses production mode.
3. Falls back to development.

## Screenshot Behavior

- Uses the native device pixel ratio for full-fidelity capture.
- Resizes to a maximum width of 1920px (FullHD) if the captured canvas exceeds it, using high-quality image smoothing.
- Output format is lossless PNG.
- Add `data-snapbug-ignore` to any HTML element to exclude it from the screenshot.
- After capture, users can annotate the screenshot with draw, arrow, and text tools before submitting.

## Report Contents

Each submitted report includes:

- Screenshot (annotated PNG)
- Console logs (last 80 entries, if `captureConsole` is enabled)
- Session replay (last 150 rrweb events, if `captureReplay` is enabled)
- Page URL, viewport size, user agent, browser info
- User-provided title, message, report type, and priority

## Building

```bash
pnpm sdk:build    # vite build + tsc declaration emit
pnpm sdk:lint     # type-check only
```

Output:
- ESM: `dist/snapbug.js`
- UMD: `dist/snapbug.umd.cjs`
