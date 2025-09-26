import { describe, expect, test } from "@jest/globals";
import { readFile } from "fs/promises";
import path from "path";
import prettier from "prettier";
import { addScript, createScriptSkeleton } from "../src/add-script";
import { ModType } from "../src/utils";
import { setupProject } from "./test-utils";

describe("add-script.test.ts", () => {
    const projectFolder = "tests/testprojects/add-script";
    const scriptsFolder = path.join(projectFolder, "src", "scripts");
    const manifest = path.join(projectFolder, "mod-manifest.json");

    test("can specify a custom name", async () => {
        await setupProject(projectFolder, ModType.Action);

        const id = "new-script";
        const name = "My New Script";
        await addScript(id, {
            manifestPath: manifest,
            scripts: scriptsFolder,
            name,
            quiet: true,
        });

        const json = JSON.parse(await readFile(manifest, "utf-8"));
        expect(json).toHaveProperty("scripts");
        const scripts = json["scripts"];
        expect(scripts).toHaveLength(2);
        const newScript = scripts[1];
        expect(newScript["id"]).toEqual(id);
        expect(newScript["name"]).toEqual(name);
    });

    test("adding a script retains manifest formatting", async () => {
        await setupProject(projectFolder, ModType.Action);

        await addScript("new-script", {
            manifestPath: manifest,
            scripts: scriptsFolder,
            quiet: true,
        });

        const config = await prettier.resolveConfig(manifest, {
            editorconfig: true,
        });
        const json = await readFile(manifest, "utf-8");
        expect(
            prettier.check(json, { filepath: manifest, ...config })
        ).toBeTruthy();
    });

    test("has correct default parameters in verion 2.0", () => {
        const scriptSrc = createScriptSkeleton({
            manifest: {
                apiVersion: "2.0",
            },
            scriptId: "my-script",
            entryPoint: "myScript",
        });
        expect(scriptSrc).toContain("{ document, application }");
    });

    test("adds resources parameter if apiVersion is above 2.1", () => {
        const scriptSrc = createScriptSkeleton({
            manifest: {
                apiVersion: "2.1",
            },
            scriptId: "my-script",
            entryPoint: "myScript",
        });
        expect(scriptSrc).toContain("{ document, application, resources }");
    });

    test("throw for visualization mods", async () => {
        await setupProject(projectFolder, ModType.Visualization);
        expect(async () => {
            await addScript("new-script", {
                manifestPath: manifest,
                scripts: scriptsFolder,
                name: "My New Script",
                quiet: true,
            });
        }).rejects.toMatchObject({
            message: "Mods of type visualization do not support scripts.",
        });
    });
});
