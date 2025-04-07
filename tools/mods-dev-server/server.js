//@ts-check

const http = require("http");
const fs = require("fs");
const path = require("path");

/**
 * Chokidar is a library for watching file changes on disk.
 */
const chokidar = require("chokidar");

/**
 * Connect is a small library for adding "middleware" support to http servers.
 */
const connect = require("connect");

/**
 * Compression is a middleware to compress http responses.
 */
const compression = require("compression");

/**
 * serve-static is a middle ware for responding with static files with correct content types.
 */
const serveStatic = require("serve-static");

/**
 * Web socket server library. Used for setting up connections to each instance.
 */
const ws = require("ws");

/**
 * Open is a library for opening applications. Here it is used to open the browser.
 */
const open = require("open");

/**
 * Colors is a library to support colored console output.
 */
const colors = require("colors/safe");

/**
 * Lodash is a utility library.
 */
const _ = require("lodash");

const package = require("./package.json");

const applicationJson = "application/json; charset=utf-8";

const injectHtml = fs.readFileSync(path.join(__dirname, "websocket.html"), { encoding: "utf8" });

const manifestName = "mod-manifest.json";
/** @type {import("./server").ServerSettings} */
const defaultSettings = {
    port: 8090,
    open: true,
    root: ".",
    path: "/" + manifestName,
    allowProjectRoot: false
};

module.exports.start = start;
module.exports.settings = Object.freeze(defaultSettings);

/**
 * Start the development server.
 * @param {import("./server").ServerSettings} settings
 * @returns {import("http").Server} the http server instance.
 */
function start(settings = {}) {
    /** @type {string[]} */
    let declaredExternalResourcesInManifest = [];
    const allowedOrigins = new Set();
    /** @type {string[]} */
    let manifestFiles = [];

    let serverUrl = "";
    let wsServerUrl = "";

    settings = Object.assign({}, defaultSettings, settings);

    const rootDirectoryAbsolutePath = path.resolve(settings.root);
    const manifestPath = path.join(rootDirectoryAbsolutePath, manifestName);

    if (!fs.existsSync(rootDirectoryAbsolutePath)) {
        throw `The path '${rootDirectoryAbsolutePath}' does not exist.`;
    }

    setupManifestListener();

    const app = connect();
    const serveStaticFiles = serveStatic(settings.root, { index: ["index.html", "index.htm"] });

    app.use(compression());
    app.use(cacheHeaders);
    app.use(cspHeaders);
    app.use(corsHeaders);
    app.use(preflight);

    if (settings.allowProjectRoot) {
        // We need to be able to retrieve the absolute path to the project root to
        // enable source maps when debugging scripts in action mods.
        app.use("/modProjectRoot", (req, res, next) => {
            res.setHeader("Content-Type", "text/plain; charset=UTF-8");
            res.write(rootDirectoryAbsolutePath);
            res.end();
        });
    }

    // API endpoints for Spotfire
    app.use("/@spotfire/api/snapshot", snapshot);
    app.use("/@spotfire/api/info", info);

    app.use(checkIfPartOfManifest);
    app.use(onlyWhenOriginIsSet(injectWebSocketSnippet(settings)));
    app.use(serveStaticFiles);

    const server = http.createServer(app);
    const wss = new ws.WebSocketServer({ noServer: true });

    // Handle server startup errors
    server.on("error", (e) => {
        // @ts-ignore
        if (e.code === "EADDRINUSE") {
            let serverUrl = "http://" + "127.0.0.1" + ":" + settings.port;
            console.log(colors.yellow("%s is already in use. Trying another port."), serverUrl);
            setTimeout(function pickNewPort() {
                server.close();
                server.listen(0, "127.0.0.1");
            }, 500);
        } else {
            console.error(colors.red(e.toString()));
            server.close();
        }
    });

    // Handle successful server
    server.on("listening", function () {
        let address = server.address();
        // @ts-ignore
        serverUrl = "http://" + address.address + ":" + address.port;
        // @ts-ignore
        wsServerUrl = "ws://" + address.address + ":" + address.port;
        console.log(colors.green('Serving "%s" at %s'), settings.root, serverUrl);

        // Launch the default browser
        if (settings.open) {
            let { path: serverPath = "/" } = settings;
            serverPath = serverPath.startsWith("/") ? serverPath : "/" + serverPath;
            open.openApp(serverUrl + serverPath);
        }
    });

    // Upgrade event is used for setting up the web socket connection.
    server.on("upgrade", (request, socket, head) => {
        if (request.url != "/live-reload") {
            return;
        }

        wss.handleUpgrade(request, socket, head, (socket) => {
            wss.emit("connection", socket, request);
        });
    });

    server.listen(settings.port, "127.0.0.1");

    const reloadInstances = _.debounce(() => {
        let openConnections = [...wss.clients].filter((client) => client.readyState == ws.OPEN);

        if (!openConnections.length) {
            console.log(colors.yellow("File change detected but no connected instances"));
            return;
        }

        readExternalResources();
        console.log(`Reloading ${openConnections.length} connected instance${openConnections.length > 1 ? "s" : ""}.`);
        for (const client of openConnections) {
            client.send("reload");
        }
    }, 500);

    chokidar
        .watch(settings.root, { ignored: /node_modules.*\.d\.ts/, persistent: true })
        .on("add", reloadInstances)
        .on("change", reloadInstances)
        .on("unlink", reloadInstances)
        .on("addDir", reloadInstances)
        .on("addDir", reloadInstances)
        .on("unlinkDir", reloadInstances)
        .on("error", (error) => console.log(colors.red(`File watcher error: ${error}`)))
        .on("ready", () => {
            return console.log("Initial file scan is complete. Ready for changes");
        });

    return server;

    /**
     * Middleware to manage CSP headers.
     *
     * @param {connect.IncomingMessage} req
     * @param {http.ServerResponse} res
     * @param {connect.NextFunction} next
     */
    function cspHeaders(req, res, next) {
        if (req.method !== "GET") {
            next();
            return;
        }

        // Set same security headers in the development server as in the Spotfire runtime.
        res.setHeader(
            "content-security-policy",
            `sandbox allow-scripts; default-src 'self' 'unsafe-eval' 'unsafe-inline' blob: data: ${[
                ...allowedOrigins.values(),
                ...declaredExternalResourcesInManifest
            ].join(" ")} ${wsServerUrl}`
        );

        // CSP header used by older browsers where the CSP policy is not fully supported.
        res.setHeader("x-content-security-policy", "sandbox allow-scripts");

        next();
    }

    /**
     * Middleware to warn for files missing from manifest.
     *
     * @param {connect.IncomingMessage} req
     * @param {http.ServerResponse} res
     * @param {connect.NextFunction} next
     */
    function checkIfPartOfManifest(req, res, next) {
        let url = cleanUrl(req.url).slice(1);

        // Do not report ugly error.
        if (!settings.allowProjectRoot && url === "modProjectRoot") {
            next();
        }

        if (manifestFiles.length && url != manifestName && !manifestFiles.includes(url)) {
            console.log(colors.yellow(`Mod manifest warning: '${url}' is not listed in the files list.`));
        }

        next();
    }

    /**
     * Read external resources from the mod manifest placed in the root directory.
     */
    function setupManifestListener() {
        if (!fs.existsSync(manifestPath)) {
            console.log(
                colors.yellow("Could not find a mod-manifest.json in the root directory"),
                colors.yellow(rootDirectoryAbsolutePath)
            );

            return;
        }

        readExternalResources();
        fs.watch(manifestPath, {}, readExternalResources);
    }

    function readExternalResources() {
        if (!fs.existsSync(manifestPath)) {
            return;
        }

        let content = fs.readFileSync(manifestPath, { encoding: "utf-8" });

        try {
            let json = JSON.parse(content);
            declaredExternalResourcesInManifest = json.externalResources || [];
            manifestFiles = [...(json.files || []), json.icon];

            if (json.scripts) {
                for (const script of json.scripts) {
                    if (script.file) {
                        manifestFiles.push(script.file);
                    }

                    if (script.icon) {
                        manifestFiles.push(script.icon);
                    }
                }
            }
        } catch (err) { }
    }

    /**
     * Middleware to manage CORS headers.
     *
     * @param {connect.IncomingMessage} req
     * @param {http.ServerResponse} res
     * @param {connect.NextFunction} next
     */
    function corsHeaders(req, res, next) {
        const isCorsRequest = req.headers.origin != undefined;
        const requestFromOutsideSandbox = req.headers.origin != "null";

        // Prevent CORS requests from the sandboxed iframe. E.g module loading will not work in embedded mode.
        if (isCorsRequest && requestFromOutsideSandbox) {
            allowedOrigins.add(req.headers.origin);

            res.setHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
            res.setHeader("Access-Control-Allow-Origin", "*");
            res.setHeader("Access-Control-Allow-Private-Network", "true");
        }

        next();
    }

    /**
     * Middleware for handling preflight requests.
     *
     * @param {connect.IncomingMessage} req
     * @param {http.ServerResponse} res
     * @param {connect.NextFunction} next
     */
    function preflight(req, res, next) {
        if (req.method === "OPTIONS") {
            res.statusCode = 204;
            res.end();
        } else {
            next();
        }
    }

    /**
     * Middleware for taking a snapshot of the mod files.
     *
     * @param {connect.IncomingMessage} req
     * @param {http.ServerResponse} res
     * @param {connect.NextFunction} next
     */
    function snapshot(req, res, next) {
        if (
            !req.method ||
            req.method !== "POST" ||
            (req.headers["content-type"] ?? "").toLowerCase() !== applicationJson
        ) {
            res.statusCode = 400;
            res.setHeader("Content-Type", applicationJson);
            res.write(
                JSON.stringify({
                    title: "Invalid request",
                    message: "Expected request with method 'POST' and Content-Type 'application/json; charset=UTF-8'."
                })
            );
            res.end();
            return;
        }

        let body = "";
        req.setEncoding("utf-8");
        req.on("data", (chunk) => {
            if (typeof chunk === "string") {
                body += chunk;
            }
        });
        req.on("end", () => {
            res.setHeader("Content-Type", applicationJson);

            try {
                /**
                 * @type {{filePaths?: string[]}}
                 */
                const manifestFiles = JSON.parse(body);
                if (!manifestFiles.filePaths) {
                    throw new Error("Missing property 'filePaths'");
                }

                res.write(JSON.stringify(takeSnapshot(manifestFiles.filePaths)));
            } catch (e) {
                res.statusCode = 400;
                res.write(
                    JSON.stringify({
                        title: "Invalid JSON payload",
                        message: "The JSON payload does not follow expected schema '{ filePaths: string[] }'.",
                        error: `${e}`
                    })
                );
            } finally {
                res.end();
            }
        });
    }
    /**
     * Middleware for querying info about the dev server.
     *
     * @param {connect.IncomingMessage} req
     * @param {http.ServerResponse} res
     * @param {connect.NextFunction} next
     */
    function info(req, res, next) {
        res.setHeader("Content-Type", applicationJson);
        res.write(
            JSON.stringify({
                version: package.version,
                allowProjectRoot: settings.allowProjectRoot
            })
        );
        res.end();
    }
}

/**
 * Only use the middleware if no origin is set to prevent the middleware to be invoked in an ajax call.
 * @param {any} middleware
 */
function onlyWhenOriginIsSet(middleware) {
    /**
     * @param {connect.IncomingMessage} req
     * @param {http.ServerResponse} res
     * @param {connect.NextFunction} next
     */
    return function (req, res, next) {
        if (req.method == "GET") {
            console.log("GET", req.url);
        }

        if (req.headers.origin) {
            next();
        } else {
            middleware(req, res, next);
        }
    };
}

/**
 * Inject the web socket snippet in html pages.
 * @param {any} settings
 *
 */
function injectWebSocketSnippet(settings) {
    /**
     * @param {connect.IncomingMessage} req
     * @param {http.ServerResponse} res
     * @param {connect.NextFunction} next
     */
    return function (req, res, next) {
        let url = cleanUrl(req.url);

        // Ignore files other than index.html and folder traversals.
        if (!url.endsWith("/index.html") || url.includes("..")) {
            next();
            return;
        }

        let filePath = path.join(settings.root, url);

        if (!fs.existsSync(filePath)) {
            next();
            return;
        }

        let file = fs.readFileSync(filePath, { encoding: "utf8" });

        file = file.replace("</body>", injectHtml + "</body>");
        res.setHeader("Content-Type", "text/html; charset=UTF-8");
        res.write(file);
        res.end();
    };
}

function cleanUrl(url = "") {
    // Remove any query params.
    url = url.split("?")[0];

    if (url.endsWith("/")) {
        url += "index.html";
    }

    return url;
}

/**
 * Middleware to manage caching.
 * Turn off caching on everything to avoid stale CSP headers etc. in the browser.
 * This also ensures that the dev server can inject its websocket snippet in .html pages it serves to the mod iframe.
 *
 * @param {connect.IncomingMessage} req
 * @param {http.ServerResponse} res
 * @param {connect.NextFunction} next
 */
function cacheHeaders(req, res, next) {
    res.setHeader("Cache-Control", "no-store");
    next();
}

/**
 * Records the modified time (ms since UNIX epoch) of the requested files.
 * @param {string[]} filePaths
 */
function takeSnapshot(filePaths) {
    /**
     * @type {[string, number][]}
     */
    const snapshot = [];
    for (const filePath of filePaths) {
        try {
            const stats = fs.statSync(filePath);
            snapshot.push([filePath, stats.mtimeMs]);
        } catch (e) {
            snapshot.push([filePath, 0]);
        }
    }
    return { snapshot: snapshot };
}
