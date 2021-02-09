/*
 * Copyright © 2020. TIBCO Software Inc.
 * This file is subject to the license terms contained
 * in the license file that is distributed with this file.
 */

//@ts-check

const { src, dest, task, parallel, series, watch } = require("gulp");

// Terser is a compressor similar to uglify-js
const terser = require("gulp-terser");
const cleanCSS = require("gulp-clean-css");

const rimraf = require("rimraf");
const fs = require("fs");
const path = require("path");
const { promisify } = require("util");

const readDir = promisify(fs.readdir);
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const stat = promisify(fs.stat);

const rollup = require("rollup");
const typescriptPlugin = require("rollup-plugin-typescript2");
const typescript = require("typescript");

const liveServer = require("live-server");

const manifestName = "mod-manifest.json";
const manifestPath = "./static/" + manifestName;
const buildPath = "./dist/";
const staticFiles = "./static/**/*";

// Rollup fails to parse the source under certain circumstances.
if (path.resolve(".").indexOf("(") >= 0) {
    console.error("The working directory contains invalid character '('");
    process.exit(1);
  }
  
// The development server tries to mimic the CSP policy used by the Spotfire runtime.
const allowedExternalResources = new Set();
let declaredExternalResourcesInManifest = [];

const apiOptions = {
    input: "./src/main.ts",
    plugins: [
        // @ts-ignore
        typescriptPlugin({
            cacheRoot: "build-temp/ts-cache",
            tsconfig: "./tsconfig.json",
            inlineSourceMap: true,
            typescript: typescript
        })
    ],
    output: {
        file: buildPath + "main.js",
        format: "iife",
        name: "Mod",
        sourcemap: "inline",
        sourcemapExcludeSources: false
    }
};

const updateManifest = series(moveManifest, updateManifestFiles);

const build = series(
    clean,
    parallel(rollupBundle(apiOptions), moveStaticFiles),
    parallel(compressCss, compressJavaScript),
    updateManifest
);

const dev = series(build, function startWatchers(cb) {
    rollupWatch("Mod", apiOptions);
    watch(staticFiles, series(moveStaticFiles, updateManifest));
    watch(manifestPath, updateManifest);
    readExternalResourcesFromManifest();

    const params = {
        port: 8090,
        noCssInject: true,
        cors: false,
        open: "/mod-manifest.json",
        root: "./dist/", // Set root directory that's being served. Defaults to cwd.
        wait: 250, // Waits for all changes, before reloading. Defaults to 0 sec.
        middleware: [cacheRedirect]
    };

    // Add compatibility with self signed certificate if it exists in the folder.
    const certificatePath = __dirname + "/localhost.crt";
    const keyPath = __dirname + "/localhost.key";
    if (fs.existsSync(certificatePath) && fs.existsSync(keyPath)) {
        params.https = {
            cert: fs.readFileSync(certificatePath),
            key: fs.readFileSync(keyPath),
            passphrase: ""
        };
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
                ...allowedExternalResources.values(),
                ...declaredExternalResourcesInManifest,
            ].join(" ")}`
        );

        // CSP header used by older browsers where the CSP policy is not fully supported.
        res.setHeader("x-content-security-policy", "sandbox allow-scripts");

        next();
    }

    liveServer.start(params);

    cb();
});


/**
 * Read external resources from the mod manifest placed in the root directory.
 */
async function readExternalResourcesFromManifest() {
    const rootDirectoryAbsolutePath = path.resolve(buildPath);
    const files = await readDir(rootDirectoryAbsolutePath);

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


/** https://rollupjs.org/guide/en#rollup-rollup */
function rollupBundle(inputOptions) {
    return async function rollupBundle() {
        const bundle = await rollup.rollup(inputOptions);
        return bundle.write(inputOptions.output);
    };
}

/** https://rollupjs.org/guide/en#rollup-watch */
function rollupWatch(name, inputOptions) {
    const watcher = rollup.watch(inputOptions);

    watcher.on("event", async (event) => {
        switch (event.code) {
            case "START":
                console.log(name, "Started watcher");
                break;
            case "BUNDLE_END":
                console.log(name, "Finished bundling " + event.input);
                break;
            case "BUNDLE_START":
                console.log(name, "Start bundling" + event.input);
                break;
            case "ERROR":
                console.warn(name, event.error);
                break;
            default:
                break;
        }
    });
}

function clean() {
    return promisify(rimraf)(buildPath);
}

function compressJavaScript() {
    return src(buildPath + "**/*.js")
        .pipe(terser())
        .pipe(dest(buildPath));
}

function compressCss() {
    return src(buildPath + "**/*.css")
        .pipe(cleanCSS({ compatibility: "ie11" }))
        .pipe(dest(buildPath));
}

function moveStaticFiles() {
    return src("./static/**/*").pipe(dest(buildPath));
}

function moveManifest() {
    return src(manifestPath).pipe(dest(buildPath));
}

async function updateManifestFiles() {
    const dir = path.join(process.cwd(), "dist");
    const manifestName = "mod-manifest.json";

    let results = await filewalker(dir);
    results = results.map(p => path.relative(dir, p)).map(p => p.replace(/\\/g, "/"));

    try {
        var manifestFile = await readFile(path.join(dir, manifestName), { encoding: "utf8" });
        var manifest = JSON.parse(manifestFile);
        manifest.files = results.filter(r => r != manifestName);
        await writeFile(path.join(dir, manifestName), JSON.stringify(manifest, null, 4), { encoding: "utf8" });
    } catch (err) {
        console.error(err);
    }

    async function filewalker(dir) {
        let results = [];

        var list = await readDir(dir);

        for (let file of list) {
            file = path.resolve(dir, file);
            var s = await stat(file);
            if (s && s.isDirectory()) {
                results = results.concat(await filewalker(file));
            } else {
                results.push(file);
            }
        }

        return results;
    }
}

task("build", build);
task("dev", dev);
task("clean", clean);
