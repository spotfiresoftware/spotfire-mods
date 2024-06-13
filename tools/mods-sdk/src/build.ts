import * as chokidar from "chokidar";
import esbuild from "esbuild";
import { existsSync } from "fs";
import fse from "fs-extra";
import { readFile, writeFile } from "fs/promises";
import path from "path";
import {
    Manifest,
    ModType,
    ParameterType,
    QuietOtions,
    debounce,
    formatIfPossible,
    getDirname,
    isParameterType,
    mkStdout,
    toTypeName,
} from "./utils.js";

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

function toCsType(type: ParameterType) {
    switch (type) {
        case "Boolean":
            return "boolean";
        case "String":
            return "string";
        case "Date":
            return "System.DateTime";
        default:
            return type;
    }
}

/**
 * Generates an environment file from the specified action mods manifest at the specified location.
 * The environment file references the action mods API and makes these types available globally.
 * The file also contains the input parameters for each script as defined in the manifest.
 */
async function createEnvFile({
    manifestPath,
    envPath,
    ...quiet
}: CreateEnvOptions & QuietOtions) {
    const stdout = mkStdout(quiet);
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
                const type = toCsType(param.type);
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

    if (!hasFailed) {
        const formattedEnvFileContent = await formatIfPossible(
            envPath,
            envFileContent,
            true
        );
        await writeFile(envPath, formattedEnvFileContent, "utf-8");
        stdout(`Environment file finished writing to '${envPath}'`);
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

let ctx: esbuild.BuildContext | null;
async function restartEsbuildImpl({
    defaultConfig,
    esbuildConfigPath,
    outdir,
    debug,
    quiet,
}: {
    defaultConfig: esbuild.BuildOptions;
    esbuildConfigPath: string;
    outdir: string;
    debug: boolean;
} & QuietOtions) {
    try {
        if (ctx) {
            await ctx.dispose();
        }

        const esbuildOptions = await getEsbuildOptions({
            esbuildConfigPath,
            defaultConfig,
            outdir,
            debug,
            quiet: ctx != null || quiet,
        });
        ctx = await esbuild.context(esbuildOptions);
        await ctx.rebuild();
        await ctx.watch();
    } catch (e) {
        console.error("Failed to bundle mod.");
    }
}

/**
 * Build options for Action Mods.
 */
interface BuildOptions extends CreateEnvOptions {
    /**
     * Path to the directory containing the source files.
     */
    src: string;

    /**
     * Path to the output directory where the bundled source files should be located.
     */
    outdir: string;

    /**
     * Path to a module which exports an esbuild config.
     */
    esbuildConfig: string;

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
    outdir: outDir,
    src: srcDir,
    watch,
    debug,
    manifestPath,
    envPath,
    esbuildConfig,
    ...quiet
}: BuildOptions & QuietOtions) {
    /** Absolute path to directory containing the src files to be bundled. */
    const absSrcDir = path.resolve(srcDir);

    /** Absolute path to the output directory. */
    const absOutDir = path.resolve(outDir);

    if (!fse.existsSync(absSrcDir)) {
        throw new Error(`Cannot find source folder: '${absSrcDir}'`);
    }

    const manifestExists = await fse.exists(manifestPath);

    if (!manifestExists) {
        throw new Error(`Cannot find manifest at: '${manifestPath}'`);
    }

    const modType = await getTypeFromManifest(manifestPath);
    if (!modType) {
        return;
    } else if (modType === ModType.Action) {
        await buildActionMod({
            absOutDir,
            srcDir,
            manifestPath,
            envPath,
            debug,
            watch,
            esbuildConfig,
            ...quiet,
        });
    } else if (modType === ModType.Visualization) {
        await buildVisualizationMod({
            absOutDir,
            srcDir,
            esbuildConfig,
            debug,
            watch,
            ...quiet,
        });
    }
}

async function getTypeFromManifest(manifestPath: string) {
    const manifestJson = await fse.readFile(manifestPath, "utf-8");
    try {
        const manifest = JSON.parse(manifestJson);
        const type = manifest["type"];
        if (type === "action") {
            return ModType.Action;
        } else if (type === "visualization") {
            return ModType.Visualization;
        } else {
            console.error(
                `Unknown mod type: ${type}. Valid types are: 'action' and 'visualization'.`
            );
        }
    } catch (e) {
        console.error(
            `Failed to parse '${manifestPath}' as JSON. Exception: ${e}`
        );
    }

    return null;
}

async function getEsbuildOptions({
    defaultConfig,
    esbuildConfigPath,
    outdir,
    debug,
    ...quiet
}: {
    defaultConfig: esbuild.BuildOptions;
    esbuildConfigPath: string;
    outdir: string;
    debug: boolean;
} & QuietOtions) {
    const stdout = mkStdout(quiet);

    if (existsSync(esbuildConfigPath)) {
        stdout(`Found esbuild config at '${esbuildConfigPath}'.`);
        try {
            const dirname = await getDirname();
            let importPath = path
                .relative(dirname, path.resolve(esbuildConfigPath))
                .replace(/\\/g, "/");
            if (!importPath.startsWith("..") && !importPath.startsWith(".")) {
                importPath = "./" + importPath;
            }

            const userConfig = (await import(importPath)).default;
            if (typeof userConfig === "object") {
                const overrides: {
                    [option: string]: { oldVal: unknown; newVal: unknown };
                } = {};
                for (const defaultConfigKey of Object.keys(defaultConfig)) {
                    if (!(defaultConfigKey in userConfig)) {
                        continue;
                    }

                    const oldVal =
                        defaultConfig[
                            defaultConfigKey as keyof typeof defaultConfig
                        ];
                    const newVal = userConfig[defaultConfigKey];
                    if (oldVal !== newVal) {
                        overrides[defaultConfigKey] = { oldVal, newVal };
                    }
                }

                if (Object.keys(overrides).length > 0) {
                    stdout("Overriding esbuild config with:");
                    for (const [key, { oldVal, newVal }] of Object.entries(
                        overrides
                    )) {
                        stdout(`  ${key}: ${oldVal} -> ${newVal}`);
                    }
                }

                return { ...defaultConfig, ...userConfig };
            }
        } catch (e) {
            stdout(`esbuild config is invalid, exception: ${e}`);
        }
    }

    return defaultConfig;
}

async function buildActionMod({
    absOutDir,
    srcDir,
    manifestPath,
    esbuildConfig: esbuildConfigPath,
    envPath,
    debug,
    watch,
    ...quiet
}: {
    absOutDir: string;
    srcDir: string;
    manifestPath: string;
    esbuildConfig: string;
    envPath: string;
    debug: boolean;
    watch: boolean;
} & QuietOtions) {
    const stdout = mkStdout(quiet);
    const scriptsDir = path.join(srcDir, "scripts");
    if (!fse.existsSync(scriptsDir)) {
        throw new Error(
            `Cannot find 'scripts' folder in source directory, looked at '${scriptsDir}'.`
        );
    }
    const defaultConfig: esbuild.BuildOptions = {
        outdir: absOutDir,
        bundle: true,
        format: "iife",
        minify: !debug,
        sourcemap: debug,

        /**
         * Action mods have no access to Web APIs.
         */
        platform: "neutral",
    };

    if (watch) {
        stdout("Watching for file changes");

        const manifestWatcher = chokidar.watch([manifestPath], {
            persistent: true,
            awaitWriteFinish: true,
        });

        manifestWatcher.on("change", async (path) => onChange());
        manifestWatcher.on("ready", onChange);

        async function onChange() {
            console.clear();
            stdout("Manifest change detected, generating new env file.");
            try {
                await createEnvFile({ manifestPath, envPath, ...quiet });
            } catch (e) {
                console.error("Failed to create env file.");
                if (typeof e === "string") {
                    console.error(`Error: ${e}`);
                }
            }
            stdout("Watching for file changes.");
        }

        const scriptFiles: string[] = [];
        const restartEsbuild = debounce(
            () =>
                restartEsbuildImpl({
                    defaultConfig: {
                        entryPoints: buildFlatEntryPointsMap(scriptFiles),
                        ...defaultConfig,
                    },
                    esbuildConfigPath,
                    outdir: absOutDir,
                    debug,
                    ...quiet,
                }),
            500
        );

        const chokidarPattern = path
            .join(scriptsDir, "*.ts")
            .replace(/\\/g, "/");
        const buildWatcher = chokidar.watch([chokidarPattern], {
            persistent: true,
            awaitWriteFinish: true,
        });
        buildWatcher.on("add", (fileName) => {
            scriptFiles.push(fileName);
            restartEsbuild();
        });
        buildWatcher.on("unlink", (fileName) => {
            const ix = scriptFiles.indexOf(fileName);
            if (ix >= 0) {
                scriptFiles.splice(ix, 1);
            }
        });
    } else {
        stdout(`Looking for script files in '${scriptsDir}'`);

        const scripts = await fse.readdir(scriptsDir);
        const scriptEntryPoints = scripts
            .filter((fileName) => {
                if (isAllowedEndpointPath(fileName)) {
                    stdout(`  Found script: ${fileName}`);
                    return true;
                } else {
                    stdout(`  Ignoring non-script: ${fileName}`);
                    return false;
                }
            })
            .map((fileName) => {
                return path.resolve(scriptsDir, fileName);
            });

        const esbuildOptions = await getEsbuildOptions({
            esbuildConfigPath,
            defaultConfig,
            outdir: absOutDir,
            debug,
            ...quiet,
        });
        const ctx = await esbuild.context({
            ...esbuildOptions,
            entryPoints: buildFlatEntryPointsMap(scriptEntryPoints),
        });
        stdout("Building Action Mod");
        await ctx.rebuild();
        try {
            await createEnvFile({ manifestPath, envPath, ...quiet });
            stdout("Build succeeded!");
        } catch (e) {
            console.error("Could not create env file.");
            console.error(`${e}`);
        }
        await ctx.dispose();
    }
}

/**
 * Flattens the entry points so that they lose their directory structure in the output folder.
 * @param entryPointPaths The paths to the entry point for each bundle.
 * @returns The map where the key is the file name and the value is the path to the entry point.
 */
export function buildFlatEntryPointsMap(entryPointPaths: string[]) {
    const flatEntryPoints: { [fileName: string]: string } = {};
    for (const filePath of entryPointPaths) {
        const fileName = path.parse(filePath).name;
        flatEntryPoints[fileName] = filePath;
    }
    return flatEntryPoints;
}

async function buildVisualizationMod({
    absOutDir,
    srcDir,
    esbuildConfig: esbuildConfigPath,
    debug,
    watch,
    ...quiet
}: {
    absOutDir: string;
    srcDir: string;
    esbuildConfig: string;
    debug: boolean;
    watch: boolean;
} & QuietOtions) {
    const stdout = mkStdout(quiet);
    const entryPoint = path.join(srcDir, "main.ts");

    if (!fse.existsSync(entryPoint)) {
        throw new Error(
            `Could not find entry point for visualization mod at '${entryPoint}'.`
        );
    }

    const defaultConfig: esbuild.BuildOptions = {
        outdir: absOutDir,
        bundle: true,
        format: "iife",
        platform: "browser",
        minify: !debug,
        sourcemap: debug,
        entryPoints: [entryPoint],
    };

    if (watch) {
        stdout("Watching for file changes");
        restartEsbuildImpl({
            defaultConfig,
            esbuildConfigPath,
            outdir: absOutDir,
            debug,
            ...quiet,
        });
    } else {
        const esbuildOptions = await getEsbuildOptions({
            esbuildConfigPath,
            defaultConfig,
            outdir: absOutDir,
            debug,
            ...quiet,
        });
        const ctx = await esbuild.context(esbuildOptions);
        stdout("Building Visualization Mod");
        await ctx.rebuild();
        await ctx.dispose();
    }
}
