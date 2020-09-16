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

const manifestPath = "./static/mod-manifest.json";
const buildPath = "./dist/";
const staticFiles = "./static/**/*";

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
    watch(staticFiles, moveStaticFiles);
    watch(manifestPath, updateManifest);

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

    cb();
});

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

    watcher.on("event", async event => {
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
