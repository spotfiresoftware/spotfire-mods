/*
* Copyright © 2020. TIBCO Software Inc.
* This file is subject to the license terms contained
* in the license file that is distributed with this file.
*/

//@ts-check

/**
 * # Spotfire mods development server
 * The purpose of the development server is to simplify the development of mods. The development server mimics the way the Spotfire runtime works in regards to cross origin requests and content security policies.
 */

const liveServer = require("live-server");
const path = require("path");
const fs = require("fs");
const { promisify } = require("util");
const readFile = promisify(fs.readFile);
const readdir = promisify(fs.readdir);

const manifestName = "mod-manifest.json";
const rootDirectory = process.argv[2] || "./src/";

// The development server tries to mimic the CSP policy used by the Spotfire runtime.
const allowedExternalResources = new Set();
let declaredExternalResourcesInManifest = [];

main();

async function main() {
    await readExternalResourcesFromManifest();

    liveServer.start({
        port: 8090,
        noCssInject: true,
        cors: false,
        // @ts-ignore
        open: "/" + manifestName,
        root: rootDirectory,
        wait: 250, // Waits for all changes, before reloading. Defaults to 0 sec.
        middleware: [cacheRedirect]
    });
}

/**
 * Read external resources from the mod manifest placed in the root directory.
 */
async function readExternalResourcesFromManifest() {
    const rootDirectoryAbsolutePath = path.resolve(rootDirectory);
    const files = await readdir(rootDirectoryAbsolutePath);

    if (files.find((fileName) => fileName == manifestName)) {
        const manifestPath = path.join(rootDirectoryAbsolutePath, manifestName);

        await readExternalResources();
        fs.watch(manifestPath, {}, readExternalResources);

        async function readExternalResources() {
            let content = await readFile(manifestPath, { encoding: "utf-8" });

            try {
                let json = JSON.parse(content);
                declaredExternalResourcesInManifest = json.externalResources || [];
            } catch (err) {}
        }
    } else {
        console.warn("Could not find a mod-manifest.json in the root directory", rootDirectoryAbsolutePath);
    }
}

/**
 * Middleware to manage caching and CSP headers.
 * @param {any} req - request object
 * @param {any} res - response object
 * @param {any} next - next callback to invoke the next middleware
 */
function cacheRedirect(req, res, next) {
    const isCorsRequest = req.headers.origin != undefined;
    const requestFromOutsideSandbox = req.headers.origin != "null";

    // Prevent CORS requests from the sandboxed iframe. E.g module loading will not work in embedded mode.
    if (isCorsRequest && requestFromOutsideSandbox) {
        allowedExternalResources.add(req.headers.origin);

        res.setHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
        res.setHeader("Access-Control-Allow-Origin", "*");
    }

    // Turn off caching on everything to avoid stale CSP headers etc. in the browser.
    // This also ensures that live server can inject its websocket snippet in .html pages it serves to the mod iframe.
    res.setHeader("Cache-Control", "no-store");

    if (req.method !== "GET") {
        next();
        return;
    }

    // Set same security headers in the development server as in the Spotfire runtime.
    res.setHeader(
        "content-security-policy",
        `sandbox allow-scripts; default-src 'self' 'unsafe-eval' 'unsafe-hashes' 'unsafe-inline' blob: data: ${[
            ...allowedExternalResources.values()
        , ...declaredExternalResourcesInManifest].join(" ")}`
    );

    // CSP header used by older browsers where the CSP policy is not fully supported.
    res.setHeader("x-content-security-policy", "sandbox allow-scripts");

    next();
}
