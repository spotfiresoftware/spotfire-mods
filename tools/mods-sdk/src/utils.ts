import { existsSync } from "fs";
import { readFile, writeFile } from "fs/promises";
import { createRequire } from "module";
import { fileURLToPath, pathToFileURL } from "url";
import { dirname, join } from "path";

export type Success<TSuccess> = { status: "success"; result: TSuccess };
export type Error<TErr> = { status: "error"; error: TErr };
export type Result<TSuccess, TErr> = Success<TSuccess> | Error<TErr>;

export function isSuccess<TSuccess, TErr>(
    result: Result<TSuccess, TErr>
): result is Success<TSuccess> {
    return result.status === "success";
}

export function isError<TSuccess, TErr>(
    result: Result<TSuccess, TErr>
): result is Error<TErr> {
    return result.status === "error";
}

export enum ModType {
    Visualization = "Visualization",
    Action = "Action",
    Agent = "Agent",
    Skill = "Skill",
}

export function isModType(str: string): str is ModType {
    if (str === ModType.Action) {
        return true;
    } else if (str === ModType.Visualization) {
        return true;
    } else if (str === ModType.Agent) {
        return true;
    } else if (str === ModType.Skill) {
        return true;
    }

    return false;
}

export const parameterTypes = [
    "Boolean",
    "Currency",
    "DataTable",
    "DataColumn",
    "Date",
    "DateTime",
    "Integer",
    "LongInteger",
    "Real",
    "SingleReal",
    "String",
    "Time",
    "TimeSpan",
    "Page",
    "Visualization",
    "DataViewDefinition",
] as const;
export type ParameterType = (typeof parameterTypes)[number];

export function typeFeature(parameterType: ParameterType): Feature | null {
    switch (parameterType) {
        case "DataColumn":
            return "DataColumnParameter";
        case "DataViewDefinition":
            return "DataViews";
        default:
            return null;
    }
}

export function isParameterType(str: string): str is ParameterType {
    if (!str) {
        return false;
    }

    return parameterTypes.includes(str as ParameterType);
}

export function parseSpotfireType(str: string) {
    const _str = str.toLowerCase();
    for (const paramType of parameterTypes) {
        if (paramType.toLowerCase() === _str) {
            return paramType;
        }
    }

    return null;
}

export interface ManifestParameter {
    name?: string;
    type?: ParameterType;
    description?: string;
    optional?: boolean;
    enum?: string[];
    array?: boolean;
    singleColumn?: boolean;
}

export interface ScriptBase {
    id?: string;
    name?: string;
    file?: string;
    entryPoint?: string;
}

export interface ManifestScript extends ScriptBase {
    parameters?: ManifestParameter[];
}

export type AgentType = "marking" | "visual";

export interface ManifestAgent extends ScriptBase {
    type?: AgentType;
}

export interface ManifestSkill {
    id?: string;
    name?: string;
    description?: string;
    icon?: string;
}

export interface Manifest {
    apiVersion?: string;
    version?: string;
    type?: string;
    name?: string;
    id?: string;
    scripts?: ManifestScript[];
    agents?: ManifestAgent[];
    skills?: ManifestSkill[];
    files?: string[];
}

export function deepCopy<T>(t: T) {
    return JSON.parse(JSON.stringify(t)) as T;
}

export class ApiVersion {
    constructor(private major: number, private minor: number) { }

    previous() {
        if (this.minor === 0) {
            return new ApiVersion(this.major - 1, 0);
        } else {
            return new ApiVersion(this.major, this.minor - 1);
        }
    }

    isNewerThan(other: ApiVersion) {
        if (this.major !== other.major) {
            return this.major > other.major;
        }

        return this.minor > other.minor;
    }

    supportsFeature(feature: Feature) {
        const required = features[feature];

        if (this.major === required.major) {
            return this.minor >= required.minor;
        }

        return this.major > required.major;
    }

    toManifest() {
        return `${this.major}.${this.minor}`;
    }

    toPackage() {
        if (this.major === 2 && this.minor === 6) {
            return "2.6.0-preview.0";
        }

        return `${this.major}.${this.minor}.0`;
    }
}

export const features = {
    ModType: { major: 2, minor: 0 },
    DataColumnParameter: { major: 2, minor: 1 },
    Resources: { major: 2, minor: 1 },
    OptionalParameter: { major: 2, minor: 1 },
    EnumParameter: { major: 2, minor: 1 },
    DataViews: { major: 2, minor: 1 },
    ScriptInvocations: { major: 2, minor: 5 },
    Agents: { major: 2, minor: 5 },
    Esm: { major: 2, minor: 6 },
    Skills: { major: 2, minor: 6 },
};
type Feature = keyof typeof features;

/**
 * The latest apiVersion this SDK has knowledge of, derived from the highest
 * version among the known features.
 */
export function maxKnownApiVersion(): ApiVersion {
    let major = 0;
    let minor = 0;
    for (const version of Object.values(features)) {
        if (
            version.major > major ||
            (version.major === major && version.minor > minor)
        ) {
            major = version.major;
            minor = version.minor;
        }
    }

    return new ApiVersion(major, minor);
}

export function formatVersion({
    major,
    minor,
}: {
    major: number;
    minor: number;
}) {
    return `${major}.${minor}`;
}

function isNatural(str: string) {
    const n = Number.parseFloat(str);
    return Number.isInteger(n) && n >= 0;
}

export function parseApiVersion(str: string): Result<ApiVersion, string> {
    const apiVersionSplit = str.split(".");

    if (
        apiVersionSplit.length !== 2 ||
        !isNatural(apiVersionSplit[0]) ||
        !isNatural(apiVersionSplit[1])
    ) {
        return {
            status: "error",
            error: `Incorrectly formatted apiVersion, expected 'MAJOR.MINOR' format, was '${str}'`,
        };
    }

    return {
        status: "success",
        result: new ApiVersion(
            Number.parseInt(apiVersionSplit[0]),
            Number.parseInt(apiVersionSplit[1])
        ),
    };
}

export function readApiVersion(manifest: Manifest): Result<ApiVersion, string> {
    if (manifest.apiVersion == null) {
        return {
            status: "error",
            error: "No apiVersion specified in the manifest",
        };
    }

    if (typeof manifest.apiVersion !== "string") {
        return {
            status: "error",
            error: `Expected apiVersion to be of type string, was: ${typeof manifest.apiVersion}`,
        };
    }

    return parseApiVersion(manifest.apiVersion);
}

export function debounce<F extends Function>(f: F, waitMs: number): F {
    let timeout: NodeJS.Timeout | null = null;
    function debouncedF() {
        if (timeout) {
            clearTimeout(timeout);
        }

        timeout = setTimeout(() => {
            f(...arguments);
        }, waitMs);
    }

    return debouncedF as unknown as F;
}

export function capitalize(str: string) {
    if (str.length === 0) {
        return str;
    } else {
        return str[0].toUpperCase() + str.slice(1);
    }
}

export function capitalizeBeforeSeparators(str: string) {
    const sep = /([^A-z0-9])([a-z])/g;
    return str.replace(sep, (c) => c.toUpperCase());
}

export function toAlphaNum(str: string) {
    const notAlphaNum = /[^A-z0-9]/g;
    return str.replace(notAlphaNum, "");
}

export function toTypeName(str: string) {
    return capitalize(toAlphaNumWithSeparators(str));
}

export function toAlphaNumWithSeparators(str: string) {
    return toAlphaNum(capitalizeBeforeSeparators(str));
}

/**
 * Loads prettier from the project being operated on (the directory of
 * 'filePath') rather than from the SDK's own dependency tree. When the SDK runs
 * via 'npx' its devDependencies are not installed, and a bare 'import("prettier")'
 * would resolve relative to the SDK in the npx cache and fail. Resolving from the
 * project also means the user's installed prettier version (and any plugins) is
 * used. Falls back to a bare import so a prettier bundled with the SDK still works.
 */
async function loadPrettier(filePath: string) {
    try {
        const require = createRequire(pathToFileURL(join(dirname(filePath), "/")));
        const prettierPath = require.resolve("prettier");
        return (await import(pathToFileURL(prettierPath).href)).default;
    } catch {
        return (await import("prettier")).default;
    }
}

export async function formatIfPossible(
    filePath: string,
    content: string,
    quiet: boolean
) {
    let formattedContent = content;
    try {
        const prettier = await loadPrettier(filePath);
        const config = await prettier.resolveConfig(filePath, {
            editorconfig: true,
        });

        // In Prettier ^3.0.0 'format' returns a promise.
        formattedContent = await prettier.format(content, {
            filepath: filePath,
            ...config,
        });
    } catch (e) {
        if (!quiet) {
            console.log(
                `Cannot find NPM package 'prettier'. '${filePath}' file will be output without formatting. ${e}`
            );
        }
    }

    return formattedContent;
}

export async function readManifest(manifestPath: string) {
    const manifestJson = await readFile(manifestPath, { encoding: "utf8" });
    return JSON.parse(manifestJson) as Manifest;
}

export async function writeManifest(
    manifestPath: string,
    manifest: Manifest,
    quiet = false
) {
    const jsonOutput = await formatIfPossible(
        manifestPath,
        JSON.stringify(manifest),
        quiet
    );
    await writeFile(manifestPath, jsonOutput, {
        encoding: "utf-8",
    });
}

export interface QuietOtions {
    quiet: boolean;
}

export function mkStdout({ quiet }: QuietOtions) {
    return (msg: string) => {
        if (!quiet) {
            console.info(msg);
        }
    };
}

export async function getDirname() {
    return dirname(fileURLToPath(import.meta.url));
}

export async function getVersion() {
    const dirname = await getDirname();
    const packageJsonPath = join(dirname, "..", "package.json");
    if (!existsSync(packageJsonPath)) {
        console.error(`Could not find package.json at ${packageJsonPath}`);
        return "1.0.0";
    }

    const packageJson = await readFile(packageJsonPath, "utf-8");
    return JSON.parse(packageJson)["version"];
}
