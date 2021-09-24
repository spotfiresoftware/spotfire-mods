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

const modsDevServer = require("@tibco/spotfire-mods-dev-server");
const { nodeResolve }= require('@rollup/plugin-node-resolve');
const commonjs = require('@rollup/plugin-commonjs') ;
const  replace  = require("@rollup/plugin-replace");

const manifestName = "mod-manifest.json";
const manifestPath = "./static/" + manifestName;
const buildPath = "./dist/";
const staticFiles = "./static/**/*";

// Rollup fails to parse the source under certain circumstances.
if (path.resolve(".").indexOf("(") >= 0) {
    console.error("The working directory contains invalid character '('");
    process.exit(1);
}

const apiOptions = {
    input: "./src/main.tsx",
    plugins: [
        // @ts-ignore
        typescriptPlugin({
            cacheRoot: "build-temp/ts-cache",
            tsconfig: "./tsconfig.json",
            inlineSourceMap: true,
            typescript: typescript
        }),
        nodeResolve({
            extensions: ['.js', '.jsx']
         }),
        commonjs({
            include: ['node_modules/**']
        }),
        replace({
            'process.env.NODE_ENV': JSON.stringify('development')
          }),
    ],
    output: {
        file: buildPath + "bundle.js",
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

    modsDevServer.start({ root: "./dist" });

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
    // @ts-ignore
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
    results = results.map((p) => path.relative(dir, p)).map((p) => p.replace(/\\/g, "/"));

    try {
        var manifestFile = await readFile(path.join(dir, manifestName), { encoding: "utf8" });
        var manifest = JSON.parse(manifestFile);
        manifest.files = results.filter((r) => r != manifestName);
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
