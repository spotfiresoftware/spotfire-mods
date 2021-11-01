const chokidar = require("chokidar");
const connect = require("connect");
const compression = require("compression");

const WebSocketServer = require("websocket").server;
const serveStatic = require("serve-static");
const open = require("open");
const colors = require("colors/safe");

const http = require("http");
const fs = require("fs");
const path = require("path");

const _ = require("lodash");

let injectHtml = fs.readFileSync(path.join(__dirname, "websocket.html"), { encoding: "utf8" });

let declaredExternalResourcesInManifest = [];
const allowedOrigins = new Set();

const defaultSettings = {
    port: 8090,
    open: true,
    root: ".",
    path: "mod-manifest.json"
};

module.exports.start = start;

function start(settings = {}) {
    settings = Object.assign({}, defaultSettings, settings);

    let webSocketConnections = [];
    const reloadInstances = _.debounce(() => {
        webSocketConnections.forEach((connection) => {
            connection.sendUTF("reload");
        });
    }, 500);

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
        let serverUrl = "http://" + "127.0.0.1" + ":" + address.port;
        console.log(colors.green('Serving "%s" at %s'), settings.root, serverUrl);

        // Launch the default browser
        if (settings.open) {
            let { path: serverPath = "/" } = settings;
            serverPath = serverPath.startsWith("/") ? serverPath : "/" + serverPath;
            open(serverUrl + serverPath);
        }
    });

    wsServer = new WebSocketServer({
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
        console.log(req.url);
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
