<p align="center">
Spotfire Mods API (@spotfire/mods-api)
<br>
<a href="https://spotfiresoftware.github.io/spotfire-mods/">Documentation</a> |
<a href="https://spotfiresoftware.github.io/spotfire-mods/docs/getting-started/">Getting started</a> |
<a href="https://www.npmjs.com/package/@spotfire/mods-sdk">@spotfire/mods-sdk</a>
</p>

[![NPM version][npm-image]][npm-url]

The Spotfire Mods API contains the JSON schema for the mod manifest and the TypeScript typings for the Spotfire API.
Each mod type has its own schema and typings, available at `<type>-mods/schema.json` and `<type>-mods/api.d.ts`.
The schema and typings are automtically setup and configured if you create your mod using the [@spotfire/mods-sdk][sdk-url] tool.

This package is versioned in sync with the mods version.
So if your mod manifest declares version 2.0 then you should depend on `@spotfire/mods-api@~2.0.0`.
If you change the version in your manifest, for instance to version 1.3 to support older versions of Spotfire, then you should update the package version accordingly. 

To add typings manually:
1. Add this package as dependency, e.g. `npm add --save-dev @spotfire/mods-api`.
2. Create an `env.d.ts` file and reference the relevant API:
    ```ts
    // env.d.ts
    /// <reference types="@spotfire/mods-api/visualization-mods/api.d.ts" />
    ```
3. For visualization mods you also have to set `allowUmdGlobalAccess` to `true` in your tsconfig.json.

To add schema manually follow the instructions given by your editor of choice, for instance if you're using Visual Studio Code see: https://code.visualstudio.com/docs/languages/json#_json-schemas-and-settings

[npm-url]: https://www.npmjs.com/package/@spotfire/mods-api
[sdk-url]: https://www.npmjs.com/package/@spotfire/mods-sdk
[npm-image]: https://img.shields.io/npm/v/gulp.svg?style=flat-square
