import * as chokidar from "chokidar";
import esbuild from "esbuild";
import { existsSync } from "fs";
import { readFile, writeFile } from "fs/promises";
import path from "path";
import {
    Manifest,
    ModType,
    ParameterType,
    QuietOtions,
    Result,
    debounce,
    features,
    formatIfPossible,
    formatVersion,
    getDirname,
    isParameterType,
    mkStdout,
    readApiVersion,
    toTypeName,
    typeFeature,
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
        case "DataViewDefinition":
            return "ActionDataViewDefinition";
        default:
            return type;
    }
}

export type GenerateEnvFileResult = Result<string, string[]>;

export async function generateEnvFile({
    manifest,
    envPath,
    ...quiet
}: {
    manifest: Manifest;
    envPath?: string;
} & QuietOtions): Promise<GenerateEnvFileResult> {
    const stdout = mkStdout(quiet);

    let envFileContent = "";
    envFileContent +=
        "// This file is auto-generated and will be overwritten on build.\n";
    envFileContent +=
        '/// <reference types="@spotfire/mods-api/action-mods/api.d.ts" />\n';

    if (!manifest.scripts) {
        return {
            status: "success",
            result: envFileContent,
        };
    }

    let hasFailed = false;
    const errors: string[] = [];

    const apiVersionResult = readApiVersion(manifest);
    if (apiVersionResult.status === "error") {
        error(
            `Failed to read apiVersion from manifest, ${envPath} could not be generated.`
        );
        error(apiVersionResult.error);
    }

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

        if (apiVersionResult.status === "success") {
            const apiVersion = apiVersionResult.result;
            if (apiVersion.supportsFeature("Resources")) {
                const resourcesType =
                    manifest.files != null
                        ? `<${manifest.files.map((f) => `"${f}"`).join(" | ")}>`
                        : "";
                tsType += `
    /** The resources (specified in the 'files' field in the mod manifest) available to this mod. */
    resources: Spotfire.Dxp.Application.Mods.ActionModResource${resourcesType};
`;
            } else if (manifest.files) {
                stdout(
                    `Warning: The mod manifest contains resource files (specified under 'files' in the manifest) but targets an apiVersion earlier than ${formatVersion(
                        features.Resources
                    )}. These files will not be reachable from within the scripts in this action mod unless you increase your apiVersion.`
                );
            }
        }

        for (const param of script.parameters ?? []) {
            if (!param.name) {
                error("Parameter has no name.");
            }

            if (param.description) {
                tsType += `\n    /** ${param.description} */\n`;
            }

            tsType += `    ${param.name}`;

            if (param.optional) {
                if (
                    apiVersionResult.status === "success" &&
                    !apiVersionResult.result.supportsFeature(
                        "OptionalParameter"
                    )
                ) {
                    error(
                        `Parameter '${
                            param.name
                        }' is declared optional but the mod targets an apiVersion earlier than ${formatVersion(
                            features.OptionalParameter
                        )}. Consider targeting a later version to enable this feature.`
                    );
                }

                tsType += `?`;
            }

            tsType += `: `;

            if (!param.type) {
                error(`Parameter '${param.name}' has no type`);
            } else if (isParameterType(param.type)) {
                const feature = typeFeature(param.type);
                if (
                    feature != null &&
                    apiVersionResult.status === "success" &&
                    !apiVersionResult.result.supportsFeature(feature)
                ) {
                    error(
                        `Parameter '${param.name}' is type '${
                            param.type
                        }' but the mod targets an apiVersion earlier than ${formatVersion(
                            features[feature]
                        )}. Consider targeting a later version to use this type.`
                    );
                }

                if (param.enum) {
                    if (
                        apiVersionResult.status === "success" &&
                        !apiVersionResult.result.supportsFeature(
                            "EnumParameter"
                        )
                    ) {
                        error(
                            `Parameter '${
                                param.name
                            }' declares an enum but the mod targets an apiVersion earlier than ${formatVersion(
                                features.EnumParameter
                            )}. Consider targeting a later version to enable this feature.`
                        );
                    }

                    tsType += param.enum.map((x) => `"${x}"`).join(" | ");
                } else if (param.array) {
                    if (
                        apiVersionResult.status === "success" &&
                        !apiVersionResult.result.supportsFeature("DataViews")
                    ) {
                        error(
                            `Parameter '${
                                param.name
                            }' declares array but the mod targets an apiVersion earlier than ${formatVersion(
                                features.DataViews
                            )}. Consider targeting a later version to enable this feature.`
                        );
                    }

                    tsType += `Iterable<${toCsType(param.type)}>`;
                } else {
                    tsType += toCsType(param.type);
                }
            } else {
                error(
                    `Parameter '${param.name}' has an invalid type: '${param.type}'`
                );
            }

            tsType += `;\n`;
        }

        tsType = tsType.trimEnd();
        tsType += "\n}\n";
        envFileContent += tsType;
    }

    if (!hasFailed) {
        if (envPath) {
            envFileContent = await formatIfPossible(
                envPath,
                envFileContent,
                true
            );
        }

        return {
            status: "success",
            result: envFileContent,
        };
    }

    return {
        status: "error",
        error: errors,
    };

    /**
     * Reports an error without exiting the function.
     */
    function error(msg: string) {
        errors.push(msg);
        hasFailed = true;
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

    if (!existsSync(manifestPath)) {
        throw `Cannot find ${manifestPath}`;
    }

    const manifestJson = await readFile(manifestPath, { encoding: "utf8" });
    const manifest: Manifest = JSON.parse(manifestJson);
    const envFileContent = await generateEnvFile({
        manifest,
        envPath,
        ...quiet,
    });

    if (envFileContent.status === "success") {
        await writeFile(envPath, envFileContent.result, "utf-8");
        stdout(`Environment file finished writing to '${envPath}'`);
    } else {
        throw new Error(envFileContent.error.join("\n"));
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

    if (!existsSync(absSrcDir)) {
        throw new Error(`Cannot find source folder: '${absSrcDir}'`);
    }

    const manifestExists = existsSync(manifestPath);

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
    const manifestJson = await readFile(manifestPath, "utf-8");
    try {
        const manifest = JSON.parse(manifestJson);
        const apiVersion = Number.parseFloat(manifest["apiVersion"]);

        if (!apiVersion) {
            console.error(`Invalid 'apiVersion' in mod manifest.`);
            return null;
        }

        if (apiVersion < 2) {
            console.info(
                `'apiVersion' is less than 2.0, assuming visualization mod.`
            );
            return ModType.Visualization;
        }

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
    if (!existsSync(scriptsDir)) {
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
        entryNames: "[name]",
        entryPoints: [".js", ".ts"].map((extension) =>
            path.join(scriptsDir, `*${extension}`)
        ),
        logOverride: { "empty-glob": "silent" },

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

        restartEsbuildImpl({
            defaultConfig,
            esbuildConfigPath,
            outdir: absOutDir,
            debug,
            ...quiet,
        });

        async function onChange() {
            console.clear();
            stdout("Manifest change detected, generating new env file.");
            try {
                await createEnvFile({ manifestPath, envPath, ...quiet });
            } catch (e) {
                console.error("Failed to create env file.");
                console.error(`Error: ${e}`);
            }
            stdout("Watching for file changes.");
        }
    } else {
        stdout(`Looking for script files in '${scriptsDir}'`);
        const esbuildOptions = await getEsbuildOptions({
            esbuildConfigPath,
            defaultConfig,
            outdir: absOutDir,
            debug,
            ...quiet,
        });
        const ctx = await esbuild.context({
            ...esbuildOptions,
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

    if (!existsSync(entryPoint)) {
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
