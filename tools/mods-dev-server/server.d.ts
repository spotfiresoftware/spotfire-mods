import http = require('http');

export interface ServerSettings {
    /** Server root folder. Defaults to the current working directory. */
    root?: string;

    /** Url path to open up. Defaults to /mod-manifest.json */
    path?: string;

    /** Server port. */
    port?: number;

    /** Host/interface to bind to. Defaults to 127.0.0.1. */
    host?: string;

    /** Whether or not to open a browser. Defaults to true. */
    open?: boolean;

    /** If the server should expose the spotfire/modProjectRoot endpoint. */
    allowProjectRoot?: boolean;

    /**
     * Protocol and hostname of the origins allowed to make CORS requests, any port is allowed.
     * Defaults to the "allowedOrigins" list in mods-dev-server.json, or ["http://localhost"] if not set. The file is in
     * %LOCALAPPDATA%\Spotfire on Windows and in $XDG_CONFIG_HOME/spotfire (default ~/.config/spotfire) on other platforms.
     * It is created on first start and only read when the server starts.
     */
    allowedOrigins?: string[];
}

export declare function start(settings: ServerSettings) : http.Server;
export const settings: ServerSettings;
