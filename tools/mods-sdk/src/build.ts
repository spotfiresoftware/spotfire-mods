import { readFile, writeFile } from "fs/promises";
import { existsSync } from "fs";
import * as chokidar from "chokidar";
import esbuild from "esbuild";
import fse from "fs-extra";
import path from "path";
import {
    toTypeName,
    debounce,
    Manifest,
    isParameterType,
    formatIfPossible,
} from "./utils";

function isValidEntryPoint(entryPoint: string) {
    const entryPointRegex = /^[$A-Z_][0-9A-Z_$]*$/i;
    return entryPointRegex.test(entryPoint);
}

/**
 * Options used when generating the environment file.
 */
interface CreateEnvOptions {
    /**
     * The path to the mod manifest.
     */
    manifestPath: string;

    /**
     * The output path where the environment file should be written.
     */
    envPath: string;
}

/**
 * Generates an environment file from the specified action mods manifest at the specified location.
 * The environment file references the action mods API and makes these types available globally.
 * The file also contains the input parameters for each script as defined in the manifest.
 */
async function createEnvFile({ manifestPath, envPath }: CreateEnvOptions) {
    let hasFailed = false;
    const errors: string[] = [];

    if (!existsSync(manifestPath)) {
        throw `Cannot find ${manifestPath}`;
    }

    const manifestJson = await readFile(manifestPath, { encoding: "utf8" });
    const manifest: Manifest = JSON.parse(manifestJson);

    if (!manifest.scripts) {
        throw "No scripts defined in manifest file.";
    }

    let envFileContent = "";

    envFileContent +=
        "// This file is auto-generated and will be overwritten on build.\n";
    envFileContent +=
        '/// <reference types="@spotfire/mods-api/action-mods/api.d.ts" />\n';

    for (const script of manifest.scripts!) {
        if (!script.name) {
            error("Script has no name.");
        }

        if (!script.entryPoint) {
            error(`Missing entry point for script '${script.name}'`);
        } else if (!isValidEntryPoint(script.entryPoint)) {
            error(`Invalid entry point name: '${script.entryPoint}'.`);
        }

        let tsType = "";

        if (script.entryPoint) {
            const interfaceName = toTypeName(script.entryPoint) + "Parameters";
            tsType += `\ninterface ${interfaceName} {`;
        }

        tsType += `
    /** The loaded {@link Spotfire.Dxp.Application.Document}. */
    document: Spotfire.Dxp.Application.Document;

    /** The current {@link Spotfire.Dxp.Application.AnalysisApplication}. */
    application: Spotfire.Dxp.Application.AnalysisApplication;

`;

        for (const param of script.parameters ?? []) {
            if (!param.name) {
                error("Parameter has no name.");
            }
            if (!param.type) {
                error(`Parameter '${param.name}' has no type`);
            } else if (isParameterType(param.type)) {
                const type =
                    param.type === "Boolean" || param.type === "String"
                        ? param.type.toLowerCase()
                        : param.type;

                if (param.description) {
                    tsType += `\n    /** ${param.description} */\n`;
                }

                tsType += `    ${param.name}: ${type};\n`;
            } else {
                error(
                    `Parameter '${param.name}' has an invalid type: '${param.type}'`
                );
            }
        }

        tsType = tsType.trimEnd();
        tsType += "\n}\n";
        envFileContent += tsType;
    }

    // Overloading RegisteredEntryPoints to make it type safe.
    envFileContent += `
type RegisteredEntryPoints = ${manifest.scripts
        .map((s) => `"${s.entryPoint}"`)
        .join(" | ")};

/**
 * Registers the entry point in the global scope so it can be reached by Spotfire
 * in cases where the script file is bundled or minified.
 * @param name The name of the entry point, needs to match the name specified in the manifest.
 * @param f The entry point function.
**/
declare function RegisterEntryPoint(name: RegisteredEntryPoints, f: Function): void;
   
/**
 * Registers the entry point in the global scope so it can be reached by Spotfire
 * in cases where the script file is bundled or minified.
 * @param name The name of the entry point, needs to match the name specified in the manifest.
 * @param f The entry point function.
 * @deprecated The specified entry point is not registered.
 */
declare function RegisterEntryPoint(name: string, f: Function): void;
`;

    if (!hasFailed) {
        const formattedEnvFileContent = await formatIfPossible(
            envPath,
            envFileContent,
            true
        );
        await writeFile(envPath, formattedEnvFileContent, "utf-8");
        console.info(`Environment file finished writing to '${envPath}'`);
    } else {
        throw errors.join("\n");
    }

    /**
     * Reports an error without exiting the function.
     */
    function error(msg: string) {
        errors.push(msg);
        hasFailed = true;
    }
}

/**
 * Build options for Action Mods.
 */
interface BuildOptions extends CreateEnvOptions {
    /**
     * Path to the directory containing the scripts.
     */
    scripts: string;

    /**
     * Path to the output directory where the bundled scripts should be located.
     */
    outdir: string;

    /**
     * If a watcher should be started which re-bundles and re-creates the environment file on file
     * changes.
     */
    watch: boolean;

    /**
     * If source maps should be generated and minification turned off.
     */
    debug: boolean;
}

function isAllowedEndpointPath(fileName: string) {
    const endpointSuffix = /\.(ts|js)x?$/;
    return endpointSuffix.test(fileName);
}

/**
 * Builds an action mods project by creating an environment file and bundling the script code using
 * esbuild.
 */
export async function build({
    outdir: outdir,
    scripts: srcdir,
    watch,
    debug,
    manifestPath,
    envPath,
}: BuildOptions) {
    /** Absolute path to directory containing the scripts to be bundled. */
    const absSrcdir = path.resolve(srcdir);

    /** Absolute path to the output directory. */
    const absOutdir = path.resolve(outdir);

    if (!fse.existsSync(absSrcdir)) {
        console.error(`Cannot find source folder: '${absSrcdir}'`);
        return;
    }

    const manifestExists = await fse.exists(manifestPath);

    if (!manifestExists) {
        console.error(`Cannot find manifest at: '${manifestPath}'`);
        return;
    }

    /**
     * The bundling options. Note that action mods has no access to browser or node APIs.
     */
    const esbuildOptions: esbuild.BuildOptions = {
        outdir: absOutdir,
        bundle: true,
        format: "iife",
        platform: "neutral",
        target: "es6",
        minify: !debug,
        sourcemap: debug,
    };

    if (watch) {
        console.info("Watching for file changes");

        const manifestWatcher = chokidar.watch(manifestPath, {
            persistent: true,
            awaitWriteFinish: true,
        });

        manifestWatcher.on("change", async (path) => onChange());
        manifestWatcher.on("ready", onChange);

        async function onChange() {
            console.clear();
            console.info("Manifest change detected, generating new env file.");
            try {
                await createEnvFile({ manifestPath, envPath });
            } catch (e) {
                console.error("Failed to create env file.");
                if (typeof e === "string") {
                    console.error(`Error: ${e}`);
                }
            }
            console.info("Watching for file changes.");
        }

        const scriptFiles: string[] = [];
        let ctx: esbuild.BuildContext | null;

        const scriptsWatcher = chokidar.watch(path.join(srcdir, "*.ts"), {
            persistent: true,
            awaitWriteFinish: true,
        });

        const restartEsbuild = debounce(_restartEsbuild, 500);
        scriptsWatcher.on("add", (fileName) => {
            scriptFiles.push(fileName);
            restartEsbuild();
        });
        scriptsWatcher.on("unlink", (fileName) => {
            const ix = scriptFiles.indexOf(fileName);
            if (ix >= 0) {
                scriptFiles.splice(ix, 1);
            }
        });

        async function _restartEsbuild() {
            try {
                if (ctx) {
                    await ctx.dispose();
                }
                ctx = await esbuild.context({
                    ...esbuildOptions,
                    entryPoints: scriptFiles,
                });
                await ctx.rebuild();
                await ctx.watch();
            } catch (e) {
                console.error("Failed to bundle script mod.");
            }
        }
    } else {
        console.log(`Looking for script files in '${absSrcdir}'`);

        const scripts = await fse.readdir(absSrcdir);
        const scriptEntryPoints = scripts
            .filter((fileName) => {
                if (isAllowedEndpointPath(fileName)) {
                    console.log(`  Found script: ${fileName}`);
                    return true;
                } else {
                    console.log(`  Ignoring non-script: ${fileName}`);
                    return false;
                }
            })
            .map((fileName) => {
                return path.resolve(absSrcdir, fileName);
            });

        const ctx = await esbuild.context({
            ...esbuildOptions,
            entryPoints: scriptEntryPoints,
        });
        console.info("Building Action Mod");
        await ctx.rebuild();
        try {
            await createEnvFile({ manifestPath, envPath });
            console.info("Build succeeded!");
        } catch (e) {
            console.error("Could not create env file.");
            console.error(`${e}`);
        }
        await ctx.dispose();
    }
}
