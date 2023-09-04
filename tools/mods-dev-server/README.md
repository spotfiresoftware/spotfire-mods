# Mods development server by Spotfire®

With [Spotfire Mods](https://spotfiresoftware.github.io/spotfire-mods/), you can include custom visualizations in your Spotfire® applications much faster by integrating JavaScript visualizations. Create your own visualizations that look and feel like the native Spotfire visualizations, and that leverage the built-in capabilities of Spotfire.

This package is a simple web server with the aim to speed up mod development. It mimics the behavior of the Spotfire Mods sandbox. It is the default server used by the developer examples in the [Spotfire Mods GitHub repository](https://github.com/spotfiresoftware/spotfire-mods).

Invoke the following command from a `package.json` script to start the server:

```bash
mods-dev-server <source folder name>
```

## Configuration

- `--port 8091` sets the server port. Defaults to `8090`.
- `--open false` sets wether or not to open a web page on server startup. Defaults to `true`.
- `--path /sub-folder/mod-manifest.json` sets the path to open. Defaults to `/mod-manifest.json`.
- `--help` lists all available options.
- `--version` lists the current package version.

## Node.js API

Here is an example of how to use the package from Node.js:

```javascript
const modsDevServer = require("@spotfire/mods-dev-server");
modsDevServer.start({root: "./dist"});
```
