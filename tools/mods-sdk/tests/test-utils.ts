import { existsSync } from "fs";
import { rm } from "fs/promises";
import {
    Error,
    isError,
    isSuccess,
    ModType,
    Result,
    Success,
} from "../src/utils";
import { expect } from "@jest/globals";
import { createTemplate } from "../src/new-template";
import path from "path";

export function assertSuccess<TSuccess, TErr>(
    result: Result<TSuccess, TErr>
): asserts result is Success<TSuccess> {
    expect(isSuccess(result)).toBeTruthy();
}

export function assertError<TSuccess, TErr>(
    result: Result<TSuccess, TErr>
): asserts result is Error<TErr> {
    expect(isError(result)).toBeTruthy();
}

export async function setupProject(
    projectFolder: string,
    type: ModType,
    apiVersion?: string
) {
    if (existsSync(projectFolder)) {
        await rm(projectFolder, { force: true, recursive: true });
    }

    const manifest = path.join(projectFolder, "mod-manifest.json");
    expect(existsSync(manifest)).toBeFalsy();

    await createTemplate(type, {
        outDir: projectFolder,
        apiVersion,
        quiet: true,
    });

    expect(existsSync(manifest)).toBeTruthy();
}
