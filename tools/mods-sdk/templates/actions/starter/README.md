# My Action Mod

Here you should add some information about the scripts which this mod contains.

Script|Purpose
---|---
my-script|Prints "Hello, world!" to the script output window.

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
src/|Contains all source files for your scripts.
src/scripts/|Contains the entry points for each of the scripts defined in your manifest. Each script should be self contained and not import any other scripts defined in this folder. To share code between scripts define a function in src/utils/ and import it.
src/utils/|Contains source code which can be shared across scripts.
build/|Contains a bundled result (and possibly source maps) for each of the scripts found in src/scripts/. This is the code which is actually run when your script gets executed.
.vscode/|Contains files which make the development experience in Visual Studio Code seamless. This includes development tasks, debugging configuration, and IntelliSense support for the mods JSON schema.
mod-manifest.json|For more information on the manifest file see the documentation website.
package.json|Defines the npm dependencies of your project as well as a set of scripts used during development.
tsconfig.json|Contains the TypeScript configuration for this project.
