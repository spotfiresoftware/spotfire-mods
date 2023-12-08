import { describe, expect, test } from "@jest/globals";
import { existsSync, readFileSync } from "fs";
import { rm } from "fs/promises";
import path from "path";
import { createTemplate, modIdToName, toModId } from "../src/new-template";
import { ModType } from "../src/utils";

describe("new-template", () => {
    const projectFolder = "tests/testprojects/new-action-mod";

    test("project can be created", async () => {
        if (existsSync(projectFolder)) {
            await rm(projectFolder, { recursive: true, force: true });
        }

        const manifest = path.join(projectFolder, "mod-manifest.json");
        expect(existsSync(manifest)).toBeFalsy();

        await createTemplate(ModType.Action, {
            outDir: "tests/testprojects/new-action-mod",
            quiet: true,
        });

        expect(existsSync(manifest)).toBeTruthy();

        const manifestJson = JSON.parse(readFileSync(manifest, "utf-8"));
        expect(manifestJson["type"]).toEqual("action");
        expect(manifestJson["name"]).toEqual("New Action Mod");
        expect(manifestJson["id"]).toEqual("new-action-mod");
    });
});

describe("toModId", () => {
    const tests = [
        [
            "removes spaces",
            "My    mod   with many     spaces    ",
            "my-mod-with-many-spaces",
        ],
        ["removes invalid characters", "My mod @$! path", "my-mod-path"],
    ];

    for (const testCase of tests) {
        test(testCase[0], () => {
            const modId = toModId(testCase[1]);
            expect(modId).toEqual(testCase[2]);
        });
    }
});

describe("modIdToName", () => {
    const tests = [
        ["capitalizes before separators", "my-awesome-mod", "My Awesome Mod"],
    ];

    for (const testCase of tests) {
        test(testCase[0], () => {
            const modId = modIdToName(testCase[1]);
            expect(modId).toEqual(testCase[2]);
        });
    }
});
