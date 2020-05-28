//@ts-check
const path = require("path");
const liveServer = require("live-server");

const root = process.argv[process.argv.length - 1] || "./src/";

const params = {
    port: 8090,
    noCssInject: true,
    cors: false,
    open: "/mod-manifest.json",
    root: root, // Set root directory that's being served. Defaults to cwd.
    wait: 250, // Waits for all changes, before reloading. Defaults to 0 sec.
    middleware: [cacheRedirect]
};

function cacheRedirect(req, res, next) {
    const isCorsRequest = req.headers.origin != undefined;
    const requestFromOutsideSandbox = req.headers.origin != "null";

    // Prevent CORS requests from the sandboxed iframe. E.g module loading will not work in embedded mode.
    if (isCorsRequest && requestFromOutsideSandbox) {
        res.setHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
        res.setHeader("Access-Control-Allow-Origin", "*");
    }

    if (req.method !== "GET") {
        next();
        return;
    }

    // Redirect html pages to make sure they get a non cached result with a websocket snippet.
    if (!isCorsRequest && path.extname(req.url) === ".html") {
        res.statusCode = 302;
        // let url = req.url == "/" ? "/index.html" : req.url;
        res.setHeader("Location", req.url + "?cache=" + Math.floor(Math.random() * 10000));
        res.end();
        return;
    }

    // Set same security headers in the development server as in the Spotfire runtime.
    res.setHeader("Content-Security-Policy", "sandbox allow-scripts");
    res.setHeader("x-content-security-policy", "sandbox allow-scripts");

    next();
}

liveServer.start(params);
