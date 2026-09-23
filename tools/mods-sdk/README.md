<p align="center">
Spotfire Mods SDK (@spotfire/mods-sdk)
<br>
<a href="https://spotfiresoftware.github.io/spotfire-mods/">Documentation</a> |
<a href="https://spotfiresoftware.github.io/spotfire-mods/docs/getting-started/">Getting started</a>
</p>

[![NPM version][npm-image]][npm-url]

The Spotfire Mods SDK is a CLI tool for creating, building, and developing Spotfire Mods.
To run the tool [Node.js](https://nodejs.org/) version 22 or greater is required.

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
npx @spotfire/mods-sdk new [action|agent|skill|visualization]
```

Creates a new mod of the specified type in the current folder using the starter template.
This command sets up the project in such a way that it can be built by the build command.

| Option                    | Description                                 |
| ------------------------- | ------------------------------------------- |
| --out-dir \<path\>        | Creates the mod in the specified directory. |
| --api-version \<version\> | The version of the mods API to use.         |

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

#### add-skill

```sh
npx @spotfire/mods-sdk add-skill <id>
```

Adds a skill to the current action mod project with the specified id. Only supported for action mods.

The command creates the skill folder `skills/<id>/` containing a `SKILL.md` file where the skill instructions should be written, along with empty `references/` and `assets/` folders for resources that are loaded on demand. `SKILL.md` is added to the manifest `files` list and the skill is registered in the manifest `skills` list. The skill uses the mod icon by default; add an optional `icon` field to the skill entry to override it.

| Option                        | Description                                                          | Default              |
| ----------------------------- | -------------------------------------------------------------------- | -------------------- |
| --name \<name\>               | The display name of the skill. Defaults to the id if not provided.   |                      |
| --description \<description\> | A description of what the skill does.                                |                      |
| --skills-dir \<path\>         | Path to the folder where skill assets are placed.                    | `skills`             |
| --manifest-path \<path\>      | Path to the mod-manifest.json file.                                  | `mod-manifest.json`  |

#### migrate

```sh
npx @spotfire/mods-sdk migrate <api-version>
```

Migrates the current mod project to the specified Mods API version.
The command updates the `apiVersion` in the manifest, sets `@spotfire/mods-api` to a matching range and bumps `@spotfire/mods-sdk` to the running version in package.json.
Breaking changes that can be applied automatically are applied; anything that needs manual attention is printed as a warning.

Migrating to 2.6 removes the `entryPoint` field from the scripts and agents in the manifest (entry points are registered by calling `RegisterEntryPoint` in the script instead) and renames the generated parameters interface in the script sources, since it is now derived from the script id.

Run `npm install` and `npm run build` after migrating.

| Option                    | Description                                                | Default             |
| ------------------------- | ---------------------------------------------------------- | ------------------- |
| --manifest-path \<path\>  | Path to the mod-manifest.json file.                        | `mod-manifest.json` |
| --package-path \<path\>   | Path to the package.json file.                             | `package.json`      |
| --scripts \<path\>        | Path to the folder containing all scripts.                 | `src/scripts`       |
| --esbuild-config \<path\> | Path to a file which default exports an esbuild config.    | `esbuild.config.js` |

[npm-url]: https://www.npmjs.com/package/@spotfire/mods-sdk
[npm-image]: https://img.shields.io/npm/v/gulp.svg?style=flat-square
