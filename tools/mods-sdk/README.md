<p align="center">
Spotfire Mods SDK (@spotfire/mods-sdk)
<br>
<a href="https://spotfiresoftware.github.io/spotfire-mods/">Documentation</a> |
<a href="https://spotfiresoftware.github.io/spotfire-mods/docs/getting-started/">Getting started</a>
</p>

[![NPM version][npm-image]][npm-url]

The Spotfire Mods SDK is a CLI tool for creating, building, and developing Spotfire Mods.
To run the tool [Node.js](https://nodejs.org/) version 20 or greater is required.

### Commands

Below is a partial list of the available commands and some of their options.
For a complete list of commands run:

```sh
npx @spotfire/mods-sdk --help
```

For up-to-date information and help regarding a specific command run:

```sh
npx @spotfire/mods-sdk <command> --help
```

#### new

```sh
npx @spotfire/mods-sdk new [action|visualization]
```

Creates a new mod of the specified type in the current folder using the starter template.
This command sets up the project in such a way that it can be built by the build command.

| Option             | Description                                 |
| ------------------ | ------------------------------------------- |
| --out-dir \<path\> | Creates the mod in the specified directory. |

#### build

```sh
npx @spotfire/mods-sdk build
```

Builds the current mod by generating the relevant TypeScript typings and by bundling the source files.
The default values for the option are set up to match the structure produced by the new command.

This command is run as part of the default Visual Studio Code build target and is made available in the default package.json file as the `build` and `build:dev` scripts.

| Option  | Description                                                                             |
| ------- | --------------------------------------------------------------------------------------- |
| --watch | Starts a file watcher which rebuilds the mod when its source files change.              |
| --debug | Produces artifacts unminifed with source maps (unless overridden by esbuild.config.js). |

#### add-script

```sh
npx @spotfire/mods-sdk add-script <script-id> --name "Name of the script"
```

Adds a script to the current action mod project with the specified id and name (if provided).
The script will be added to the manifest.json and a source file will be created.

| Option | Description             |
| ------ | ----------------------- |
| --name | The name of the script. |

[npm-url]: https://www.npmjs.com/package/@spotfire/mods-sdk
[npm-image]: https://img.shields.io/npm/v/gulp.svg?style=flat-square
