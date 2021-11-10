const { src, dest, watch } = require("gulp");
const esBuild = require("esbuild");

exports.copy = copy;
exports.buildBundle = buildBundle;
exports.build = fullBuild;
exports.watch = watchTask;

function buildBundle() {
    return esBuild.build({
        entryPoints: ["src/index.ts"],
        bundle: true,
        sourcemap: true,
        minify: process.argv.includes("--compress"),
        outfile: "dist/bundle.js"
    });
}

function copy() {
    return src("static/**/*").pipe(dest("dist/"));
}

async function fullBuild() {
    await copy();
    await buildBundle();
}

async function watchTask() {
    await copy();
    await buildBundle();

    watch(["static/**/*"], copy);
    watch(["src/**/*"], buildBundle);
}
