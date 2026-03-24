# My Agent Mod

This is an action mod that contains an *agent*. Here you should add some information about the agent and scripts which this mod contains.

Agent|Purpose
---|---
marking-agent|Runs when data is marked, uses an LLM to figure out insights about the marked data, and reports them back to the user.

Script|Purpose
---|---
marking-insight|Acts on an insight produced by `marking-agent`. This is the script the user runs when they choose to apply an insight.

## How agents work

An agent is different from a regular action mod script in a few important ways:

- **It runs on a background thread.** The agent is started in the background so that Spotfire stays responsive while it does its work (for example gathering context and waiting for responses from an LLM). Report progress to the user with `context.UserInteraction.ReportProgress(...)` so they know something is happening.
- **It receives a special `context` parameter instead of `document`/`application`.** The entry point is called with a generated context type (`MarkingContext` for a marking agent), which destructures into `{ context, resources, utils }`. The `context` is a `MarkingInsightAgentContext` and is your entry point into the document: it exposes the analyzed marking (`context.AnalyzedColumn`), the originating visualization (`context.Visual`), the AI service (`context.AiService`), user interaction (`context.UserInteraction`), and the snapshot document (`context.Document`).
- **It cannot make changes to the document.** The `context` is created inside a read-only snapshot of the document, so every document node it gives you is a snapshot node that can be read directly but not modified. To change the document, an agent instead *reports insights*. Each insight (`ActionModInsight`) bundles a description together with an invocation of one of this mod's action mod scripts (created with `utils.CreateScriptInvocation(...)`). When the user chooses to apply an insight, Spotfire runs that script on the main thread with full read/write access to the document.

So the typical flow is: `marking-agent` analyzes the marked data and produces one or more insights → the user picks an insight → `marking-insight` runs and actually changes the document.

### Agent types

There are two types of agents, set by the `type` field of an agent in the manifest:

Type|Triggered when|Context type
---|---|---
marking|The user marks data. The context exposes the analyzed marking column (`context.AnalyzedColumn`).|`MarkingContext` (`MarkingInsightAgentContext`)
visual|The user requests insights about a visualization.|`VisualContext` (`VisualInsightAgentContext`)

This template ships a `marking` agent. To add a `visual` agent (or another `marking` one), see below.

### Adding more agents

You can scaffold a new agent with the `add-agent` command. It adds an entry to the `agents` array in the manifest and creates a matching entry point file in `src/scripts/`:

```sh
npx mods-sdk add-agent my-visual-agent --type visual --name "My visual agent"
```

The `--type` option accepts `marking` (the default) or `visual`. Run `npx mods-sdk add-agent --help` to see all options. After adding an agent, run `npm run build` to regenerate the manifest types so the new context type is available.

## Getting started

To develop you need to have [Node.js](https://nodejs.org/en) installed.
The recommended IDE for developing Spotfire mods is [Visual Studio Code](https://code.visualstudio.com/).

Before you can start developing run the following commands in this folder:

```sh
npm install # Install dependencies.
npm run build # Builds the mod and generates types from the manifest.
```

Open this folder in Visual Studio Code and run the default build task, either by pressing "Ctrl + Shift + B" or by running the "Start watchers" task.
This will launch three watchers:
- the [TypeScript](https://www.typescriptlang.org/) typechecker, which makes sure you are using the API in a type-safe manner.
- a build watcher, which automatically transforms the TypeScript files found in the `src/scripts` folder into JavaScript files which are output in the `build` folder.
- the mods development server, which serves the mod files and mod manifest to Spotfire during development.
Your mod will be rebuilt when any TypeScript file is changed or when the mod manifest changes.

To build outside of Visual Studio Code run:

```sh
npm run build # Builds a minimized version of the mod.
npm run build:dev # Starts a file watcher and builds an unminimized version of the mod, including source maps.
```

In this template you will find the following files and directories:

File/Directory Name | Explanation
---|---
src/|Contains all source files for your agent and scripts.
src/scripts/|Contains the entry points for each of the agents and scripts defined in your manifest. Each entry point should be self contained and not import any other entry point in this folder. To share code between them define a function in src/utils/ and import it.
src/scripts/marking-agent.ts|The agent entry point. Runs on a background thread when data is marked, inspects the marked data through the read-only `context`, and reports insights.
src/scripts/marking-insight.ts|The action mod script invoked when the user applies an insight produced by the agent. This runs on the main thread and can modify the document.
src/utils/|Contains source code which can be shared across entry points.
src/utils/schema.ts|Defines the [zod](https://zod.dev/) schema for the structured response requested from the LLM, shared between the agent and the insight script.
build/|Contains a bundled result (and possibly source maps) for each entry point found in src/scripts/. This is the code which is actually run when your agent or script gets executed.
.vscode/|Contains files which make the development experience in Visual Studio Code seamless. This includes development tasks, debugging configuration, and IntelliSense support for the mods JSON schema.
mod-manifest.json|Declares the mod's `agents` and `scripts`. For more information on the manifest file see the documentation website.
package.json|Defines the npm dependencies of your project as well as a set of scripts used during development.
tsconfig.json|Contains the TypeScript configuration for this project.
