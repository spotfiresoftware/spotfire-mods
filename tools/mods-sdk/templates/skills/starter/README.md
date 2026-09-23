# My Skill Mod

This is an action mod that contains a *skill*. Here you should add some information about the skill which this mod contains.

Skill|Purpose
---|---
$SKILL-ID|Describe what the skill instructs the AI to do.

## How skills work

A skill is declarative: it contains no code. It is a folder with a `SKILL.md` file holding the instructions the AI should follow, plus any resources those instructions refer to.

- **The skill is declared in the manifest.** Each entry in the `skills` array of `mod-manifest.json` has an `id`, a display `name`, and a `description`. The `description` is what the AI sees when it decides whether the skill applies, so make it say what the skill does and when to use it.
- **The instructions live in `skills/<id>/SKILL.md`.** The folder name must match the skill `id`. The file is read in full when the skill is used.
- **Resources are loaded on demand.** Put reference documents in `skills/<id>/references/` and files used by the skill in `skills/<id>/assets/`, then refer to them from `SKILL.md`.
- **Every file must be listed in the manifest.** Add each file under `skills/<id>/` to the `files` array in `mod-manifest.json` so that it is saved with the mod.

By default the skill uses the mod icon. To give it its own icon, add an `icon` field to the skill entry in the manifest pointing at an SVG file, for example `skills/$SKILL-ID/icon.svg`.

## Adding scripts and agents

A skill-only mod has nothing to compile, but it is still a regular action mod project: you can add
action mod scripts and agents to it at any time and the build will pick them up.

```sh
npx mods-sdk add-script my-script --name "My script" # Adds a script.
npx mods-sdk add-agent my-agent --type marking       # Adds an agent.
```

Both commands add an entry to the manifest and create a matching entry point file in `src/scripts/`.
Run `npm run build` afterwards to bundle the new entry point and regenerate the manifest types.

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
skills/|Contains one folder per skill declared in your manifest, named after the skill id.
skills/$SKILL-ID/SKILL.md|The instructions the AI follows when it uses this skill.
skills/$SKILL-ID/references/|Reference documents for this skill, loaded on demand. Empty to begin with.
skills/$SKILL-ID/assets/|Files used by this skill, loaded on demand. Empty to begin with.
src/|Contains all source files for your scripts and agents.
src/scripts/|Contains the entry points for each of the scripts and agents defined in your manifest. Empty to begin with, since a skill needs no code.
build/|Contains a bundled result (and possibly source maps) for each entry point found in src/scripts/.
.vscode/|Contains files which make the development experience in Visual Studio Code seamless. This includes development tasks, debugging configuration, and IntelliSense support for the mods JSON schema.
mod-manifest.json|Declares the mod's `skills` and the `files` they consist of. For more information on the manifest file see the documentation website.
package.json|Defines the npm dependencies of your project as well as a set of scripts used during development.
tsconfig.json|Contains the TypeScript configuration for this project.
