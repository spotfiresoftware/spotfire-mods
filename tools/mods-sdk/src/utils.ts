import { existsSync } from "fs";
import { readFile, writeFile } from "fs/promises";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

export enum ModType {
    Visualization = "Visualization",
    Action = "Action",
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
] as const;
export type ParameterType = (typeof parameterTypes)[number];

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

export interface Manifest {
    apiVersion?: string;
    version?: string;
    type?: string;
    name?: string;
    id?: string;
    scripts?: {
        id?: string;
        name?: string;
        file?: string;
        entryPoint?: string;
        parameters?: {
            name?: string;
            type?: ParameterType;
            description?: string;
        }[];
    }[];
    files?: string[];
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

export async function formatIfPossible(
    filePath: string,
    content: string,
    quiet: boolean
) {
    let formattedContent = content;
    try {
        const prettier = await import("prettier");
        const config = await prettier.default.resolveConfig(filePath, {
            editorconfig: true,
        });

        // In Prettier ^3.0.0 'format' returns a promise.
        formattedContent = await prettier.default.format(content, {
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
