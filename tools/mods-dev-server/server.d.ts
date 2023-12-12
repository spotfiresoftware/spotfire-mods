import http = require('http');

export interface ServerSettings {
    /** Server root folder. Defaults to the current working directory. */
    root?: string;

    /** Url path to open up. Defaults to /mod-manifest.json */
    path?: string;

    /** Server port. */
    port?: number;

    /** Whether or not to open a browser. Defaults to true. */
    open?: boolean;

    /** If the server should expose the spotfire/modProjectRoot endpoint. */
    allowProjectRoot?: boolean;
}

export declare function start(settings: ServerSettings) : http.Server;
export const settings: ServerSettings;
