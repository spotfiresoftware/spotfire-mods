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
     * Whether to ask, on the console, if an unknown origin should be allowed. Unknown origins are denied
     * when the server is not started from a terminal, since there is then nobody to answer. Defaults to true.
     */
    promptForNewOrigins?: boolean;

    /**
     * The local configuration file holding the origins allowed for all future sessions.
     * Defaults to `.spotfire/mods-dev-server.json` in the home directory.
     */
    originsConfigPath?: string;
}

export declare function start(settings: ServerSettings) : http.Server;
export const settings: ServerSettings;
