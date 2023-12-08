import { existsSync } from "fs";
import { remove } from "fs-extra";
import { ModType } from "../src/utils";
import { expect } from "@jest/globals";
import { createTemplate } from "../src/new-template";
import path from "path";

export async function setupProject(projectFolder: string, type: ModType) {
    if (existsSync(projectFolder)) {
        await remove(projectFolder);
    }

    const manifest = path.join(projectFolder, "mod-manifest.json");
    expect(existsSync(manifest)).toBeFalsy();

    await createTemplate(type, {
        outDir: projectFolder,
        quiet: true,
    });

    expect(existsSync(manifest)).toBeTruthy();
}
