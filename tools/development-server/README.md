# Spotfire Mods development server

This package is a simple web server with the aim to speed up mod development. It mimics the behavior of the Spotfire Mods sandbox.

The development server is based on the [live-server](https://www.npmjs.com/package/live-server) package with an additional middleware for caching and CSP headers.

To start the server invoke the following command:

```bash
mods-server src
```
