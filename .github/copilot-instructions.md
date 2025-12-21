

# GitHub Copilot / Codex Instructions for Spotfire® Mods

## Quick context

* This repository contains the Spotfire® Mods examples, SDK, dev server, and tools for creating Spotfire action and visualization mods.
* Top-level folders include: `catalog/`, `examples/`, `prototypes/`, and `tools/`.
* Most example projects are **TypeScript visualization mods** that use `@spotfire/mods-api` typings and are built with the `@spotfire/mods-sdk` CLI.

---

## Scope limitation (IMPORTANT)

* Unless explicitly instructed otherwise, make changes **ONLY within a single example mod folder under `examples/`**.
* Do **NOT** modify:

  * `tools/`
  * SDK source code
  * SDK templates
  * other examples
  * repository root configuration
* Assume each task targets **one visualization mod** unless explicitly stated otherwise.

---

## When you start a task

* Identify whether the task targets an example under `examples/`.
* Prefer making changes **only in the relevant example folder**, which is self-contained and has its own `package.json`.
* Inspect the example’s existing structure and follow its established patterns.

---

## Important commands & workflows

* Typical per-example workflow:

  * `cd` into the example folder (e.g. `examples/ts-dev-starter-CartoonPieChart`)
  * Install dependencies: `npm install`
  * Build once: `npm run build` (invokes `mods-sdk build`)
  * Build in dev/watch mode: `npm run build:dev` (invokes `mods-sdk build --watch --debug`)
  * Start dev server: `npm run server` (invokes `mods-dev-server`)
* Dev server CLI:

  * `mods-dev-server <source_folder>`
  * Common options: `--port`, `--open`, `--path`, `--allow-project-root`
* SDK CLI:

  * `npx @spotfire/mods-sdk --help`
  * Commands include `new`, `build`, `add-script`
* Tests:

  * Tool tests live under `tools/*/tests` and are executed via `npm test` in the tool directory.

---

## Node / environment

* SDK and dev-server tools expect **Node.js >= 22**.
* Individual examples may work with different versions; always follow the `engines` and dependencies defined in the example’s `package.json`.

---

## Project-specific conventions & patterns (MANDATORY)

* Every visualization mod follows the Spotfire MOD lifecycle:

  * `Spotfire.initialize((mod) => { ... })`
* Use `mod.createReader(...).subscribe(...)` to react to:

  * data changes
  * size changes
  * style/theme changes
* Call `renderContext.signalRenderComplete()` when rendering finishes.
* Use built-in controls where appropriate:

  * `mod.controls.errorOverlay`
  * `mod.controls.tooltip`
* Type definitions:

  * Examples include `env.d.ts` referencing `@spotfire/mods-api/visualization-mods/api.d.ts`.
* Manifest:

  * `mod-manifest.json` is the single source of truth for mod configuration and packaging.
  * Treat it as authoritative.
* Templates:

  * Starter templates live under `tools/mods-sdk/templates/`.
  * Do not modify templates unless explicitly instructed.

---

## Bundling and build system

* Examples use either **esbuild** or **webpack**.
* Always inspect the example’s build setup first:

  * `esbuild.config.js` → esbuild
  * `webpack.config.js` → webpack
* **Do NOT introduce a new bundler.**
* If an example uses esbuild:

  * Keep esbuild
  * Do NOT add webpack configuration
* Build tooling is typically invoked via `mods-sdk build`.

---

## External visualization libraries (e.g., Apache ECharts)

* External libraries must be **bundled locally via npm**.
* Do **NOT** load libraries from CDNs.
* Add dependencies only to the example’s `package.json`.
* Ensure compatibility with the existing build system (`mods-sdk build` + bundler in use).
* Follow Spotfire MOD lifecycle rules:

  * Initialize rendering resources once
  * Update rendering on data or property changes
  * Handle resize events correctly
  * Dispose resources if the lifecycle provides a teardown hook
* Avoid recreating rendering instances on every render cycle.

---

## Data, properties, and interaction patterns

* Use Spotfire axes and DataView patterns:

  * categorical axes
  * numerical/value axes
* Handle:

  * empty data
  * missing axes
  * invalid values
* Use Spotfire marking APIs for interaction where applicable.
* Aggregate data appropriately when the visualization requires it (e.g., pie charts).

---

## Debugging tips

* Run `npm run build:dev` and `npm run server` in separate terminals for fast iteration.
* Use `mods-dev-server --allow-project-root` when debugging action mods.
* Check browser dev tools for runtime errors in the mod iframe.
* Use overlays or clear messaging instead of failing silently.

---

## Definition of Done (Visualization Mods)

A task is complete when:

* `npm install` and `npm run build` succeed
* The MOD loads without errors in Spotfire (dev server or deployed)
* The visualization renders correctly
* The visualization updates when data changes
* The visualization resizes correctly
* Clear instructions or error messages appear when required data or axes are missing

---

## Where to look for examples and reference code

* Visualization examples:

  * `examples/ts-dev-starter/*`
  * `examples/ts-dev-starter-CartoonPieChart/src/*`
  * `examples/ts-react/*`
* SDK and dev-server internals:

  * `tools/mods-sdk/src`
  * `tools/mods-dev-server/`
* Templates:

  * `tools/mods-sdk/templates/visualizations/`

---

If anything is unclear or additional constraints are required (build, lifecycle, data binding, or a specific example), ask before implementing changes.

---

If you want, next I can:

* Produce a **Codex-only ultra-strict version** (shorter, more imperative)
* Or help you craft the **exact first task prompt** to maximize a successful first attempt
