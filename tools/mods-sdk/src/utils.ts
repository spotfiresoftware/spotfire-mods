import { readFile } from "fs/promises";
import path from "path";

export enum ModType {
    Visualization,
    Action,
}

export type ParameterType =
    | "Boolean"
    | "Currency"
    | "DataTable"
    | "Date"
    | "DateTime"
    | "Integer"
    | "LongInteger"
    | "Real"
    | "SingleReal"
    | "String"
    | "Time"
    | "TimeSpan"
    | "Page"
    | "Visualization";

export function isParameterType(str: string): str is ParameterType {
    if (!str) {
        return false;
    }

    switch (str) {
        case "Boolean":
        case "Currency":
        case "DataTable":
        case "Date":
        case "DateTime":
        case "Integer":
        case "LongInteger":
        case "Real":
        case "SingleReal":
        case "String":
        case "Time":
        case "TimeSpan":
        case "Page":
        case "Visualization":
            return true;
        default:
            return false;
    }
}

export interface Manifest {
    apiVersion?: string;
    version?: string;
    type?: string;
    name?: string;
    id?: string;
    scripts?: {
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
    let formattedContent: string;
    try {
        const prettier = await import("prettier");
        const config = await prettier.resolveConfig(filePath, {
            editorconfig: true,
        });

        // In Prettier ^3.0.0 'format' returns a promise.
        formattedContent = await prettier.format(content, {
            filepath: filePath,
            ...config,
        });
    } catch {
        if (!quiet) {
            console.log(
                `Cannot find NPM package 'prettier'. '${filePath}' file will be output without formatting.`
            );
        }

        formattedContent = JSON.stringify(content);
    }

    return formattedContent;
}
