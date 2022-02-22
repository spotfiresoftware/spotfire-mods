# Mods development server by TIBCO Spotfire®

With [Spotfire Mods](https://tibcosoftware.github.io/spotfire-mods/), you can include custom visualizations in your Spotfire® applications much faster by integrating JavaScript visualizations. Create your own visualizations that look and feel like the native Spotfire visualizations, and that leverage the built-in capabilities of Spotfire.

This package is a simple web server with the aim to speed up mod development. It mimics the behavior of the Spotfire Mods sandbox. It is the default server used by the developer examples in the [Spotfire Mods GitHub repository](https://github.com/TIBCOSoftware/spotfire-mods).

Invoke the following command from a `package.json` script to start the server:

```bash
mods-dev-server <source folder name>
```

How to use from node:

```javascript
const modsDevServer = require("@tibco/spotfire-mods-dev-server");
modsDevServer.start({root: "./dist"});
```
