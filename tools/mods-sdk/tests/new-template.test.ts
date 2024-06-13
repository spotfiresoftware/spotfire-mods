import { describe, expect, test } from "@jest/globals";
import { readFileSync } from "fs";
import path from "path";
import { modIdToName, toModId } from "../src/new-template";
import { ModType } from "../src/utils";
import { setupProject } from "./test-utils";

describe("new-template", () => {
    test("action mod starter can be created", async () => {
        const projectFolder = "tests/testprojects/new-action-mod";
        await setupProject(projectFolder, ModType.Action);

        const manifest = path.join(projectFolder, "mod-manifest.json");
        const manifestJson = JSON.parse(readFileSync(manifest, "utf-8"));
        expect(manifestJson["type"]).toEqual("action");
        expect(manifestJson["name"]).toEqual("New Action Mod");
        expect(manifestJson["id"]).toEqual("new-action-mod");
    });

    test("visualization mod starter can be created", async () => {
        const projectFolder = "tests/testprojects/new-visualization-mod";
        await setupProject(projectFolder, ModType.Visualization);

        const manifest = path.join(projectFolder, "mod-manifest.json");
        const manifestJson = JSON.parse(readFileSync(manifest, "utf-8"));
        expect(manifestJson["apiVersion"]).toEqual("1.3");
        expect(manifestJson["type"]).toBeUndefined();
        expect(manifestJson["name"]).toEqual("New Visualization Mod");
        expect(manifestJson["id"]).toEqual("new-visualization-mod");
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
