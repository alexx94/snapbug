# Installing the SDK locally in an external project

The SDK (`@snapbug/sdk`) is a private package — not published on npm. To use it in a separate React/Vite/Next.js project on your machine, follow these steps.

## Step 1 — Build the SDK

From the monorepo root:

```bash
pnpm sdk:build
```

This outputs the bundle to `packages/sdk/dist/`.

## Step 2 — Install in your project

**Option A — `npm pack` (recommended, portable)**

Creates a `.tgz` tarball you can install anywhere, even copy to another machine.

```bash
cd packages/sdk
npm pack
# → snapbug-sdk-0.1.0.tgz
```

Then in your external project:

```bash
npm install /absolute/path/to/snapbug/packages/sdk/snapbug-sdk-0.1.0.tgz
# or with pnpm:
pnpm add /absolute/path/to/snapbug/packages/sdk/snapbug-sdk-0.1.0.tgz
```

**Option B — install from local path directly**

Simpler, but tied to this machine and this directory.

```bash
# In your external project
npm install /absolute/path/to/snapbug/packages/sdk
```

> Make sure you run `pnpm sdk:build` first — the install picks up `dist/`, not the source files.

## Step 3 — Use it

```ts
import { SnapBug } from "@snapbug/sdk";

SnapBug.init({
  developmentKey: "pk_dev_...",
  productionKey: "pk_live_...",
});
```

Keys are generated in the SnapBug dashboard under your project → Configuration.

## Re-installing after SDK changes

If you modify the SDK and want to update an existing project:

```bash
# 1. Rebuild
pnpm sdk:build

# 2a. If you used Option A (tarball) — repack and reinstall
cd packages/sdk && npm pack
# then in your project:
npm install /path/to/new-tarball.tgz

# 2b. If you used Option B (local path) — just rebuild, no reinstall needed
# (the symlink already points to dist/)
```
