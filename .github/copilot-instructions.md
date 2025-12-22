# GitHub Copilot instructions for Spotfire Mods

These concise instructions help AI coding agents be productive in this repository. Focus on discoverable patterns, concrete commands, and file locations that explain how the project is structured and how developers typically build and debug mods.

1. Big picture (what this repo is and where to look) 🔧
   - This repo contains the Spotfire Mods framework and many example and catalog mods: top-level folders of interest are `tools/` (SDK, API, dev server), `catalog/` (official visualizations), `examples/` (small projects that demonstrate real usage), and `prototypes/`.
   - The authoritative spec for mod manifests and runtime typings lives in `tools/mods-api/` (`schema.json`, `api.d.ts`). Use these for type/schema questions.

2. Typical developer workflows (explicit commands & examples) ▶️
   - Create a new mod: `npx @spotfire/mods-sdk new visualization` or `npx @spotfire/mods-sdk new action` (see `tools/mods-sdk/README.md`).
   - Build a mod: `npx @spotfire/mods-sdk build` (often exposed as `npm run build` in example projects, e.g. `examples/ts-dev-starter`).
     - Development watch build: `npx @spotfire/mods-sdk build --watch --debug` (or `npm run build:dev`).
   - Run the dev server: `mods-dev-server <source-folder>` or `npm run server` in examples that use it (e.g., `examples/js-dev-circular-treemap-zoom` uses `mods-dev-server src`).
   - Test tools packages: `npm test` inside `tools/mods-sdk` (uses Jest) or other package-specific test scripts.
   - Debugging action mods: run `mods-dev-server` with `--allow-project-root` to expose `/spotfire/modProjectRoot` endpoint required for action mod debugging (see `tools/mods-dev-server/README.md`).

3. Project-specific patterns and conventions 🧭
   - mod-manifest.json is central: every mod has `mod-manifest.json` at root. It declares API version, axes, files/resources and `dataViewDefinition`. Many `.vscode/settings.json` files map `/mod-manifest.json` to relevant JSON schemas.
   - Build outputs vary by template: `build/` or `dist/` (e.g., `tools/mods-sdk/templates/*` and many catalog examples use `dist/bundle.js` or `build/bundle.js`). The manifest should reference the bundle path.
   - Bundlers and tools: templates use `esbuild`, `webpack`, or simple `static/` assets. Look for `gulpfile.js`, `webpack.config.js`, or `esbuild` invocations to see the chosen flow in each package (example: `catalog/configurable-gauge/gulpfile.js`).
   - TypeScript typings: the runtime API surface is defined in `tools/mods-api/*/*.d.ts`. When changing behavior, update typings and relevant tests.

4. Integration & external dependencies 🔗
   - The runtime depends on the declared `apiVersion` in the manifest. When changing the API version, update `mod-manifest.json` and, for accurate type checking, the `@spotfire/mods-api` devDependency (`npm add --save-dev @spotfire/mods-api@<version>`).
   - `@spotfire/mods-dev-server` simulates the Spotfire sandbox during development. Use it to serve `mod-manifest.json` and static resources.

5. Common troubleshooting insights ⚠️
   - Missing resources warnings: the dev server warns if resources listed in `mod-manifest.json` are missing or not listed under `files`.
   - API compatibility: mods with unsupported API features fail at runtime in older Spotfire versions — check `tools/mods-api/` schema and API mapping in `README.md`.
   - Node requirement: many packages require Node >= 22 (see `tools/mods-sdk/package.json` `engines`).

6. Repo editing/style matters ✨
   - Keep examples consistent with their template: update both `mod-manifest.json` and build scripts when changing outputs.
   - Tests for dev tools live in `tools/*/tests` and use Jest/Jest-TS; run them when changing tools code.
   - Use Prettier where present (`prettier.config.js` in multiple packages) to format changes.

7. Files to inspect for context (quick reference) 📌
   - `tools/mods-sdk/README.md` – SDK usage and commands
   - `tools/mods-dev-server/README.md` – dev server flags and behavior (e.g. `--allow-project-root`)
   - `tools/mods-api/*` – mod schema (`mod-schema.json`/`schema.json`) and typings (`api.d.ts`)
   - `tools/mods-sdk/templates/*` – project templates showing canonical layout
   - `examples/*` and `catalog/*` – real-world examples (look for `package.json`, `mod-manifest.json`, `src/`, `spotfire/`)

— If anything here is unclear or you'd like more detail in a specific area (e.g., release steps, how Spotfire loads manifests, or a walkthrough of a particular example), tell me which area and I'll expand this file. 
