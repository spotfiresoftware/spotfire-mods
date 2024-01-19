import { describe, expect, test } from "@jest/globals";
import { ModType } from "../src/utils";
import { existsSync } from "fs";
import { readFile, rm } from "fs/promises";
import path from "path";
import { createTemplate } from "../src/new-template";
import { addScript } from "../src/add-script";
import { check, resolveConfig } from "prettier";

describe("add-script.test.ts", () => {
    const projectFolder = "tests/testprojects/add-script";
    const scriptsFolder = path.join(projectFolder, "src", "scripts");
    const manifest = path.join(projectFolder, "mod-manifest.json");

    test("adding a script retains manifest formatting", async () => {
        await setup();

        await addScript("new-script", {
            manifestPath: manifest,
            scripts: scriptsFolder,
        });

        const config = await resolveConfig(manifest, { editorconfig: true });
        const json = await readFile(manifest, "utf-8");
        expect(check(json, { filepath: manifest, ...config })).toBeTruthy();
    });

    async function setup() {
        if (existsSync(projectFolder)) {
            await rm(projectFolder, { recursive: true, force: true });
        }

        expect(existsSync(manifest)).toBeFalsy();

        await createTemplate(ModType.Action, {
            outDir: projectFolder,
            quiet: true,
        });
    }
});
