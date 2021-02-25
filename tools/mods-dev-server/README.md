# mods-dev-server

This package is a simple web server with the aim to speed up mod development. It mimics the behavior of the Spotfire Mods sandbox.

The development server is based on the [live-server](https://www.npmjs.com/package/live-server) package with an additional middleware for caching and CSP headers.

Invoke the following command from a package.json script to start the server:

```bash
mods-dev-server src
```

How to use from node:

```javascript
const modsDevServer = require("@tibcosoftware/mods-dev-server");
modsDevServer.start({root: "./dist"});
```
