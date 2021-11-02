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
const WebSocket = require("websocket");

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

const injectHtml = fs.readFileSync(path.join(__dirname, "websocket.html"), { encoding: "utf8" });

/** @type {string[]} */
let declaredExternalResourcesInManifest = [];
const allowedOrigins = new Set();

const manifestName = "mod-manifest.json";
/** @type {import("./server").ServerSettings} */
const defaultSettings = {
    port: 8090,
    open: true,
    root: ".",
    path: "/" + manifestName
};

module.exports.start = start;
module.exports.settings = Object.freeze(defaultSettings);

/**
 * Start the development server.
 * @param {import("./server").ServerSettings} settings
 * @returns {import("http").Server} the http server instance.
 */
function start(settings = {}) {
    settings = Object.assign({}, defaultSettings, settings);

    /** @type {WebSocket.connection[]} */
    let webSocketConnections = [];
    const reloadInstances = _.debounce(() => {
        if(webSocketConnections.length) {
            console.log("Reloading instances.");
        }

        webSocketConnections.forEach((connection) => {
            connection.sendUTF("reload");
        });
    }, 500);

    const rootDirectoryAbsolutePath = path.resolve(settings.root);

    if (!fs.existsSync(rootDirectoryAbsolutePath)) {
        throw `The path '${rootDirectoryAbsolutePath}' does not exist.`;
    }

    readExternalResourcesFromManifest(rootDirectoryAbsolutePath);

    chokidar.watch(settings.root, {}).on("all", reloadInstances);

    const app = connect();
    const serveStaticFiles = serveStatic(settings.root, { index: ["index.html", "index.htm"] });

    app.use(compression());
    app.use(cacheHeaders);
    app.use(cspHeaders);
    app.use(corsHeaders);
    app.use(onlyWhenOriginIsSet(injectWebSocketSnippet(settings)));
    app.use(serveStaticFiles);

    const server = http.createServer(app).listen(settings.port);

    // Handle server startup errors
    server.addListener("error", (e) => {
        // @ts-ignore
        if (e.code === "EADDRINUSE") {
            let serverUrl = "http://" + "127.0.0.1" + ":" + settings.port;
            console.log(colors.yellow("%s is already in use. Trying another port."), serverUrl);
            setTimeout(() => {
                server.listen(0);
            }, 500);
        } else {
            console.error(colors.red(e.toString()));
            server.close();
        }
    });

    // Handle successful server
    server.addListener("listening", function (/*e*/) {
        let address = server.address();
        // @ts-ignore
        let serverUrl = "http://" + "127.0.0.1" + ":" + address.port;
        console.log(colors.green('Serving "%s" at %s'), settings.root, serverUrl);

        // Launch the default browser
        if (settings.open) {
            let { path: serverPath = "/" } = settings;
            serverPath = serverPath.startsWith("/") ? serverPath : "/" + serverPath;
            open(serverUrl + serverPath);
        }
    });

    let wsServer = new WebSocket.server({
        httpServer: server,
        autoAcceptConnections: false
    });

    wsServer.on("request", function (request) {
        let connection = request.accept("dev-server", request.origin);
        webSocketConnections.push(connection);
        connection.on("close", () => {
            webSocketConnections = webSocketConnections.filter((c) => c != connection);
        });
    });

    return server;
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
        console.log(req.url);

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
        let url = req.url || "";

        // Remove any query params.
        url = url.split("?")[0];

        if (url.endsWith("/")) {
            url += "index.html";
        }

        // Ignore files other than index.html and folder traversals.
        if (!url.endsWith("/index.html") || url.includes("..")) {
            next();
            return;
        }

        let filePath = path.join(settings.root, url);

        let file = fs.readFileSync(filePath, { encoding: "utf8" });

        file = file.replace("</body>", injectHtml + "</body>");
        res.setHeader("Content-Type", "text/html; charset=UTF-8");
        res.write(file);
        res.end();
    };
}

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
        ].join(" ")}`
    );

    // CSP header used by older browsers where the CSP policy is not fully supported.
    res.setHeader("x-content-security-policy", "sandbox allow-scripts");

    next();
}

/**
 * Read external resources from the mod manifest placed in the root directory.
 * @param {string} rootDirectoryAbsolutePath
 */
function readExternalResourcesFromManifest(rootDirectoryAbsolutePath) {
    const files = fs.readdirSync(rootDirectoryAbsolutePath);

    if (files.find((fileName) => fileName == manifestName)) {
        const manifestPath = path.join(rootDirectoryAbsolutePath, manifestName);

        readExternalResources();
        fs.watch(manifestPath, {}, readExternalResources);

        async function readExternalResources() {
            let content = fs.readFileSync(manifestPath, { encoding: "utf-8" });

            try {
                let json = JSON.parse(content);
                declaredExternalResourcesInManifest = json.externalResources || [];
            } catch (err) {}
        }
    } else {
        console.warn(colors.yellow("Could not find a mod-manifest.json in the root directory"), colors.yellow(rootDirectoryAbsolutePath));
    }
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
    }

    next();
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
