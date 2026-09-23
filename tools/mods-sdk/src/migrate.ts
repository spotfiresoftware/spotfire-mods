import colors from "colors/safe.js";
import { existsSync } from "fs";
import { readdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { loadUserEsbuildConfig, RUNTIME_EXTERNALS } from "./build.js";
import {
    ApiVersion,
    QuietOtions,
    formatIfPossible,
    getVersion,
    maxKnownApiVersion,
    mkStdout,
    parseApiVersion,
    readManifest,
    toTypeName,
    writeManifest,
} from "./utils.js";

interface MigrateOptions {
    manifestPath: string;
    packagePath: string;
    scripts: string;
    esbuildConfig: string;
}

const scriptFileExtensions = ["ts", "tsx", "js", "jsx"];
const scriptFileRegex = new RegExp(`\\.(${scriptFileExtensions.join("|")})$`);

/**
 * Migrates a mod project to a new Mods API version. This updates the manifest
 * and package.json and applies easy-to-fix breaking changes introduced by the
 * target version, warning about anything that needs manual attention.
 */
export async function migrate(
    apiVersionArg: string,
    {
        manifestPath: _manifestPath,
        packagePath: _packagePath,
        scripts: _scripts,
        esbuildConfig: _esbuildConfig,
        ...quiet
    }: MigrateOptions & QuietOtions
) {
    const stdout = mkStdout(quiet);

    const apiVersionResult = parseApiVersion(apiVersionArg);
    if (apiVersionResult.status === "error") {
        throw new Error(
            `Invalid api version '${apiVersionArg}': ${apiVersionResult.error}`
        );
    }
    const apiVersion = apiVersionResult.result;

    const maxKnown = maxKnownApiVersion();
    if (apiVersion.isNewerThan(maxKnown)) {
        stdout(
            `Warning: apiVersion '${apiVersion.toManifest()}' is newer than the latest version known to this @spotfire/mods-sdk (${maxKnown.toManifest()}). Check if a newer version of @spotfire/mods-sdk has been published.`
        );
    }

    const manifestPath = path.resolve(_manifestPath);
    if (!existsSync(manifestPath)) {
        throw new Error(`Cannot find manifest at '${manifestPath}'.`);
    }

    const renames = await migrateManifest(manifestPath, apiVersion, quiet);

    const packagePath = path.resolve(_packagePath);
    if (!existsSync(packagePath)) {
        stdout(
            `Warning: Could not find package.json at '${packagePath}', skipping dependency update.`
        );
    } else {
        await migratePackageJson(packagePath, apiVersion, quiet);
    }

    await validateEsbuildConfig(
        path.resolve(_esbuildConfig),
        apiVersion,
        quiet
    );

    const scriptsDir = path.resolve(_scripts);
    await applyInterfaceRenames(scriptsDir, renames, quiet);
    if (!existsSync(scriptsDir)) {
        stdout(
            `Warning: Could not find scripts folder at '${scriptsDir}', skipping RegisterEntryPoint check.`
        );
    } else {
        await warnMissingRegisterEntryPoint(scriptsDir, quiet);
    }

    stdout(`Migration to apiVersion ${apiVersion.toManifest()} finished.`);
    stdout(
        colors.bold(
            "\n⚠️ Please run the following commands to update your dependencies and rebuild:"
        )
    );
    stdout(colors.bold(colors.yellow("  npm install")));
    stdout(colors.bold(colors.yellow("  npm run build")));
}

/**
 * A parameters interface whose generated name changes as a result of the
 * migration (from the entry-point-based name to the script-id-based name).
 */
interface InterfaceRename {
    scriptId: string;
    oldName: string;
    newName: string;
    /** Candidate source file basenames, most likely first. */
    sourceBaseNames: string[];
}

/**
 * The candidate source file basenames for a script, most likely first. The
 * build output ('file', e.g. 'build/my-script.js') is authoritative since
 * esbuild maps 'src/scripts/<name>.ts' to 'build/<name>.js'; the id is a
 * fallback (it matches for scripts created via add-script).
 */
function sourceBaseNamesFor(script: { id?: string; file?: string }) {
    const baseNames: string[] = [];
    if (script.file) {
        baseNames.push(path.basename(script.file, path.extname(script.file)));
    }
    if (script.id) {
        baseNames.push(script.id);
    }

    return [...new Set(baseNames)];
}

/**
 * Updates the manifest apiVersion and applies breaking changes for the target
 * version. From apiVersion 2.6 the 'entryPoint' field is removed from scripts
 * and agents (entry points are registered via RegisterEntryPoint instead).
 * Returns the set of parameters interfaces whose generated name changed as a
 * result.
 */
async function migrateManifest(
    manifestPath: string,
    apiVersion: ApiVersion,
    quiet: QuietOtions
): Promise<InterfaceRename[]> {
    const stdout = mkStdout(quiet);
    const manifest = await readManifest(manifestPath);
    const previousVersion = manifest.apiVersion;
    manifest.apiVersion = apiVersion.toManifest();

    const renames: InterfaceRename[] = [];
    let removedEntryPoints = 0;
    if (apiVersion.supportsFeature("Esm")) {
        for (const script of manifest.scripts ?? []) {
            if (script.entryPoint == null) {
                continue;
            }

            // From apiVersion 2.6 the generated parameters interface is derived
            // from the script id instead of the entry point. Record when that
            // changes the generated name so the source can be updated.
            if (script.id) {
                const oldName = toTypeName(script.entryPoint) + "Parameters";
                const newName = toTypeName(script.id) + "Parameters";
                if (oldName !== newName) {
                    renames.push({
                        scriptId: script.id,
                        oldName,
                        newName,
                        sourceBaseNames: sourceBaseNamesFor(script),
                    });
                }
            }

            delete script.entryPoint;
            removedEntryPoints++;
        }

        // Agents use the same manifest schema as scripts, so 'entryPoint' has
        // to go from them too. Agents have no generated parameters interface.
        for (const agent of manifest.agents ?? []) {
            if (agent.entryPoint == null) {
                continue;
            }

            delete agent.entryPoint;
            removedEntryPoints++;
        }
    }

    await writeManifest(manifestPath, manifest, quiet.quiet);
    stdout(
        `Updated apiVersion in '${manifestPath}' from '${
            previousVersion ?? "unspecified"
        }' to '${manifest.apiVersion}'.`
    );
    if (removedEntryPoints > 0) {
        stdout(
            `Removed the 'entryPoint' field from ${removedEntryPoints} script(s)/agent(s); entry points are now registered solely via RegisterEntryPoint.`
        );
    }

    return renames;
}

/**
 * Applies the parameters interface renames to the conventional script source
 * files ('<scriptsDir>/<basename>.{ts,tsx,js,jsx}'). When the old interface
 * name is found in the file it is replaced in place (the happy path); otherwise
 * a warning asks the developer to update the reference manually.
 */
async function applyInterfaceRenames(
    scriptsDir: string,
    renames: InterfaceRename[],
    quiet: QuietOtions
) {
    const stdout = mkStdout(quiet);

    const warnManual = (rename: InterfaceRename, reason?: string) => {
        const suffix = reason ? ` (${reason})` : "";
        stdout(
            `Warning: The generated parameters interface for script '${rename.scriptId}' changes from '${rename.oldName}' to '${rename.newName}' (it is now derived from the script id). Update the type annotation in the script source accordingly${suffix}.`
        );
    };

    for (const rename of renames) {
        const sourceFile = findScriptSource(scriptsDir, rename.sourceBaseNames);
        if (!sourceFile) {
            warnManual(rename);
            continue;
        }

        let content: string;
        try {
            content = await readFile(sourceFile, "utf-8");
        } catch (e) {
            warnManual(rename, `could not read '${sourceFile}': ${e}`);
            continue;
        }

        // toTypeName yields an alphanumeric identifier, so a word-boundary match
        // is safe and only replaces whole-identifier occurrences.
        const pattern = new RegExp(`\\b${rename.oldName}\\b`, "g");
        if (!pattern.test(content)) {
            warnManual(rename);
            continue;
        }

        try {
            await writeFile(
                sourceFile,
                content.replace(pattern, rename.newName),
                "utf-8"
            );
            stdout(
                `Renamed the parameters interface reference '${rename.oldName}' to '${rename.newName}' in '${sourceFile}'.`
            );
        } catch (e) {
            warnManual(rename, `could not write '${sourceFile}': ${e}`);
        }
    }
}

/**
 * Finds the conventional source file for a script, trying each candidate
 * basename ('<scriptsDir>/<basename>.{ts,tsx,js,jsx}'). Returns null if none
 * exists.
 */
function findScriptSource(scriptsDir: string, baseNames: string[]) {
    for (const baseName of baseNames) {
        for (const extension of scriptFileExtensions) {
            const candidate = path.join(scriptsDir, `${baseName}.${extension}`);
            if (existsSync(candidate)) {
                return candidate;
            }
        }
    }

    return null;
}

/**
 * Ensures package.json references a compatible @spotfire/mods-api for the target
 * version, and bumps @spotfire/mods-sdk to the running version so that the build
 * tooling matches the API (required from apiVersion 2.6).
 */
async function migratePackageJson(
    packagePath: string,
    apiVersion: ApiVersion,
    quiet: QuietOtions
) {
    const stdout = mkStdout(quiet);
    const raw = await readFile(packagePath, "utf-8");
    let pkg: Record<string, any>;
    try {
        pkg = JSON.parse(raw);
    } catch (e) {
        stdout(
            `Warning: Could not parse '${packagePath}' as JSON, skipping dependency update. ${e}`
        );
        return;
    }

    const apiRange = `~${apiVersion.toPackage()}`;
    setDependency(pkg, "@spotfire/mods-api", apiRange, true);
    stdout(`Set '@spotfire/mods-api' to '${apiRange}' in '${packagePath}'.`);

    const sdkRange = `^${await getVersion()}`;
    if (setDependency(pkg, "@spotfire/mods-sdk", sdkRange, false)) {
        stdout(
            `Set '@spotfire/mods-sdk' to '${sdkRange}' in '${packagePath}'.`
        );
    }

    // Indent the fallback so package.json stays readable when prettier is not
    // installed (formatIfPossible re-formats it when prettier is available).
    const output = await formatIfPossible(
        packagePath,
        JSON.stringify(pkg, null, 4),
        quiet.quiet
    );
    await writeFile(packagePath, output, "utf-8");
}

/**
 * Sets a dependency range wherever it already appears in the package.json. When
 * the dependency is missing and addIfMissing is true it is added to
 * devDependencies. Returns whether the dependency is now present.
 */
function setDependency(
    pkg: Record<string, any>,
    name: string,
    range: string,
    addIfMissing: boolean
) {
    const sections = ["dependencies", "devDependencies", "peerDependencies"];
    let found = false;
    for (const section of sections) {
        if (pkg[section] && name in pkg[section]) {
            pkg[section][name] = range;
            found = true;
        }
    }

    if (!found && addIfMissing) {
        pkg.devDependencies = pkg.devDependencies ?? {};
        pkg.devDependencies[name] = range;
        found = true;
    }

    return found;
}

/**
 * For ESM targets (apiVersion >= 2.6), warns when the user's esbuild config
 * would conflict with the ESM build requirements. The SDK enforces these
 * settings regardless, but a conflicting config is confusing.
 */
async function validateEsbuildConfig(
    esbuildConfigPath: string,
    apiVersion: ApiVersion,
    quiet: QuietOtions
) {
    if (!apiVersion.supportsFeature("Esm") || !existsSync(esbuildConfigPath)) {
        return;
    }

    const config = await loadUserEsbuildConfig(esbuildConfigPath);
    if (!config) {
        return;
    }

    const stdout = mkStdout(quiet);

    if (config.format != null && config.format !== "esm") {
        stdout(
            `Warning: '${esbuildConfigPath}' sets format '${config.format}', but action mods with apiVersion >= 2.6 are built as ES modules. The SDK enforces format 'esm'; remove the 'format' override from your esbuild config to avoid confusion.`
        );
    }

    const external = config.external;
    if (
        Array.isArray(external) &&
        !RUNTIME_EXTERNALS.some((e) => external.includes(e))
    ) {
        stdout(
            `Warning: '${esbuildConfigPath}' sets 'external' without ${RUNTIME_EXTERNALS.map((e) => `"${e}"`).join("/")}. The Spotfire API must stay external for ESM action mods; the SDK re-adds it automatically, but consider adding it to your esbuild config.`
        );
    }
}

/**
 * Warns about every script source file which does not call RegisterEntryPoint,
 * as such files have no entry point Spotfire can invoke. Unreadable files are
 * reported as warnings rather than aborting the (already applied) migration.
 */
async function warnMissingRegisterEntryPoint(
    scriptsDir: string,
    quiet: QuietOtions
) {
    const stdout = mkStdout(quiet);
    const entries = await readdir(scriptsDir, { withFileTypes: true });
    for (const entry of entries) {
        if (!entry.isFile() || !scriptFileRegex.test(entry.name)) {
            continue;
        }

        const filePath = path.join(scriptsDir, entry.name);
        let content: string;
        try {
            content = await readFile(filePath, "utf-8");
        } catch (e) {
            stdout(
                `Warning: Could not read script file '${filePath}' to check for RegisterEntryPoint. ${e}`
            );
            continue;
        }

        if (!content.includes("RegisterEntryPoint")) {
            stdout(
                `Warning: Script file '${filePath}' does not call 'RegisterEntryPoint'. Each script must register its entry point so that Spotfire can invoke it.`
            );
        }
    }
}
