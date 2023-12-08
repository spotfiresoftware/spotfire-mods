# My Visualization Mod

Here you should add some information about the visualization mod.

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
- a build watcher, which automatically bundles the TypeScript file found in the `src/main.ts` folder into a JavaScript file which is put in the `build` folder.
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
index.html|The main entry point of the mod. Contains a static script to load the API. The HEAD tag should contain the required `script` and `style` elements.
main.css|Optional static styles.
src/|Contains all TypeScript source files.
build/|Contains the bundled result (and possibly source maps) for the TypeScript code. This is the file that should be refered to from the mod manifest file and index.html.
.vscode/|Contains files which make the development experience in Visual Studio Code seamless. This includes development tasks, debugging configuration, and IntelliSense support for the mods JSON schema.
mod-manifest.json|For more information on the manifest file see the documentation website.
package.json|Defines the npm dependencies of your project as well as a set of scripts used during development.
tsconfig.json|Contains the TypeScript configuration for this project.
