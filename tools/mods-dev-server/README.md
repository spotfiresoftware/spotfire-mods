# Mods development server by Spotfire®

With [Spotfire Mods](https://spotfiresoftware.github.io/spotfire-mods/), you can include custom visualizations in your Spotfire® applications much faster by integrating JavaScript visualizations. Create your own visualizations that look and feel like the native Spotfire visualizations, and that leverage the built-in capabilities of Spotfire.

This package is a simple web server with the aim to speed up mod development. It mimics the behavior of the Spotfire Mods sandbox. It is the default server used by the developer examples in the [Spotfire Mods GitHub repository](https://github.com/spotfiresoftware/spotfire-mods).

Invoke the following command from a `package.json` script to start the server:

```bash
mods-dev-server <source folder name>
```

## Configuration

- `--port 8091` sets the server port. Defaults to `8090`.
- `--host 0.0.0.0` sets the host/interface to bind to. Defaults to `127.0.0.1`.
- `--open false` sets wether or not to open a web page on server startup. Defaults to `true`.
- `--path /sub-folder/mod-manifest.json` sets the path to open. Defaults to `/mod-manifest.json`.
- `--help` lists all available options.
- `--version` lists the current package version.
- `--allow-project-root` expose an endpoint at /spotfire/modProjectRoot for retrieving the path to the project root, necessary for debugging action mods.

## Allowed origins

The development server only shares its content with origins it trusts.

Localhost is trusted by default, on any port, since Spotfire Analyst serves the mod development dialog from
`localhost:8001` and picks a higher port number when several windows are opened.

When a mod is developed in the Spotfire web client the origin cannot be known in advance. The first request
from such an origin is held while the server asks about it on the console:

```text
A mod is requested from an unknown origin: https://spotfire.example.com
Only accept origins you recognize, such as the Spotfire web client you are developing in.
Allow this origin? [s]ession, [a]lways, [d]eny (default):
```

- `session` allows the origin until the server is stopped.
- `always` also adds the origin to the local configuration file, `.spotfire/mods-dev-server.json` in your
  home directory, so that it is allowed in all future sessions.
- `deny` blocks the origin, and it is not asked about again during the session.

The question is only asked when the server is started from a terminal. Unknown origins are denied right away
when there is nobody to answer, for example when the server is started from a build tool. Origins are then
allowed up front by listing them in the local configuration file:

```json
{
    "allowedOrigins": ["https://spotfire.example.com"]
}
```

### Asking where an origin stands

`GET /@spotfire/api/origin` reports where the calling origin stands. Spotfire uses it before connecting to a
mod under development, so that it can tell the user what is in the way instead of leaving them with a
connection that appears to be stuck.

```json
{
    "origin": "https://spotfire.example.com",
    "status": "willPrompt"
}
```

`status` is one of:

| Status         | Meaning                                                                      |
| -------------- | ---------------------------------------------------------------------------- |
| `allowed`      | The origin may read from the server.                                           |
| `rejected`     | The developer answered `deny`. Restart the server to be asked again.           |
| `willPrompt`   | The origin is unknown, and the developer is about to be asked about it.        |
| `cannotPrompt` | The origin is unknown, but there is no console to ask the developer on.        |

Unlike the other endpoints this one answers all origins, including the ones that are not allowed, since an
answer nobody can read is of no use. It only reveals where the calling origin itself stands, it never changes
the allow list, and it never raises the prompt.

## Node.js API

Here is an example of how to use the package from Node.js:

```javascript
const modsDevServer = require("@spotfire/mods-dev-server");
modsDevServer.start({root: "./dist"});
```
