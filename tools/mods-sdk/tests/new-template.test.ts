import { describe, expect, test } from "@jest/globals";
import { existsSync, readFileSync } from "fs";
import path from "path";
import {
    createGitIgnore,
    createTemplate,
    modIdToName,
    toModId,
} from "../src/new-template";
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

        await createGitIgnore({
            targetFolder: path.resolve(projectFolder),
            quiet: true,
        });
        expect(existsSync(path.join(projectFolder, ".gitignore"))).toBeTruthy();
    });

    test("agent mod starter can be created", async () => {
        const projectFolder = "tests/testprojects/new-agent-mod";
        await setupProject(projectFolder, ModType.Agent);

        const manifest = path.join(projectFolder, "mod-manifest.json");
        const manifestJson = JSON.parse(readFileSync(manifest, "utf-8"));
        expect(manifestJson["apiVersion"]).toEqual("2.5");
        expect(manifestJson["type"]).toEqual("action");
        expect(manifestJson["name"]).toEqual("New Agent Mod");
        expect(manifestJson["id"]).toEqual("new-agent-mod");
        expect(manifestJson["agents"]).toBeDefined();
        expect(manifestJson["agents"].length).toBeGreaterThan(0);

        const packageJsonPath = path.join(projectFolder, "package.json");
        const packageJson = JSON.parse(
            readFileSync(packageJsonPath, "utf-8")
        );
        expect(
            packageJson["devDependencies"]["@spotfire/mods-api"]
        ).toEqual("~2.5.0");
    });

    test("skill mod starter can be created", async () => {
        const projectFolder = "tests/testprojects/new-skill-mod";
        await setupProject(projectFolder, ModType.Skill);

        const manifest = path.join(projectFolder, "mod-manifest.json");
        const manifestJson = JSON.parse(readFileSync(manifest, "utf-8"));
        expect(manifestJson["apiVersion"]).toEqual("2.6");
        expect(manifestJson["type"]).toEqual("action");
        expect(manifestJson["name"]).toEqual("New Skill Mod");
        expect(manifestJson["id"]).toEqual("new-skill-mod");
        expect(manifestJson["scripts"]).toBeUndefined();
        expect(manifestJson["skills"]).toEqual([
            {
                id: "new-skill-mod",
                name: "New Skill Mod",
                description: expect.any(String),
            },
        ]);
        expect(manifestJson["files"]).toEqual([
            "skills/new-skill-mod/SKILL.md",
        ]);

        // The skill folder is named after the skill id and the folders for on demand resources are
        // created even though they are empty.
        const skillFolder = path.join(projectFolder, "skills", "new-skill-mod");
        expect(existsSync(path.join(skillFolder, "SKILL.md"))).toBeTruthy();
        expect(existsSync(path.join(skillFolder, "references"))).toBeTruthy();
        expect(existsSync(path.join(skillFolder, "assets"))).toBeTruthy();
        expect(
            existsSync(path.join(projectFolder, "skills", "my-skill"))
        ).toBeFalsy();

        // There is nothing to build in a mod which only contains a skill, but scripts and agents
        // can be added later so the folder the build looks in has to exist.
        expect(
            existsSync(path.join(projectFolder, "src", "scripts"))
        ).toBeTruthy();

        const skillMd = readFileSync(
            path.join(skillFolder, "SKILL.md"),
            "utf-8"
        );
        expect(skillMd).not.toContain("$SKILL-");
        const readme = readFileSync(
            path.join(projectFolder, "README.md"),
            "utf-8"
        );
        expect(readme).not.toContain("$SKILL-");
    });

    test("skill mod cannot target an api version without skill support", async () => {
        await expect(
            createTemplate(ModType.Skill, {
                outDir: "tests/testprojects/skill-mod-2.5",
                apiVersion: "2.5",
                quiet: true,
            })
        ).rejects.toThrow(/2\.6/);
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
        expect(manifestJson["type"]).toBeUndefined();

        await createGitIgnore({
            targetFolder: path.resolve(projectFolder),
            quiet: true,
        });
        expect(existsSync(path.join(projectFolder, ".gitignore"))).toBeTruthy();
    });

    test("action mod 2.0 keeps the entryPoint in the manifest", async () => {
        const projectFolder = "tests/testprojects/action-mod-2.0";
        await setupProject(projectFolder, ModType.Action, "2.0");

        const manifest = path.join(projectFolder, "mod-manifest.json");
        const manifestJson = JSON.parse(readFileSync(manifest, "utf-8"));
        expect(manifestJson["scripts"][0]["entryPoint"]).toEqual("myScript");
    });

    test("action mod >= 2.6 has no entryPoint in the manifest", async () => {
        const projectFolder = "tests/testprojects/action-mod-2.6";
        await setupProject(projectFolder, ModType.Action, "2.6");

        const manifest = path.join(projectFolder, "mod-manifest.json");
        const manifestJson = JSON.parse(readFileSync(manifest, "utf-8"));
        expect(manifestJson["apiVersion"]).toEqual("2.6");
        for (const script of manifestJson["scripts"] ?? []) {
            expect(script["entryPoint"]).toBeUndefined();
        }
    });

    test("agent mod >= 2.6 has no entryPoint in the manifest", async () => {
        const projectFolder = "tests/testprojects/agent-mod-2.6";
        await setupProject(projectFolder, ModType.Agent, "2.6");

        const manifest = path.join(projectFolder, "mod-manifest.json");
        const manifestJson = JSON.parse(readFileSync(manifest, "utf-8"));
        for (const entry of [
            ...manifestJson["scripts"],
            ...manifestJson["agents"],
        ]) {
            expect(entry["entryPoint"]).toBeUndefined();
        }
    });

    describe("can create project with different api version", () => {
        test("action mod", async () => {
            const projectFolder = "tests/testprojects/action-mod-2.1";
            await setupProject(projectFolder, ModType.Action, "2.1");

            const manifest = path.join(projectFolder, "mod-manifest.json");
            const manifestJson = JSON.parse(readFileSync(manifest, "utf-8"));
            expect(manifestJson["apiVersion"]).toEqual("2.1");
            expect(manifestJson["type"]).toEqual("action");

            const packageJsonPath = path.join(projectFolder, "package.json");
            const packageJson = JSON.parse(
                readFileSync(packageJsonPath, "utf-8")
            );
            expect(
                packageJson["devDependencies"]["@spotfire/mods-api"]
            ).toEqual("~2.1.0");
        });

        test("visualization mod", async () => {
            const projectFolder = "tests/testprojects/visualization-mod-2.1";
            await setupProject(projectFolder, ModType.Visualization, "2.1");

            const manifest = path.join(projectFolder, "mod-manifest.json");
            const manifestJson = JSON.parse(readFileSync(manifest, "utf-8"));
            expect(manifestJson["apiVersion"]).toEqual("2.1");
            expect(manifestJson["type"]).toEqual("visualization");

            const packageJsonPath = path.join(projectFolder, "package.json");
            const packageJson = JSON.parse(
                readFileSync(packageJsonPath, "utf-8")
            );
            expect(
                packageJson["devDependencies"]["@spotfire/mods-api"]
            ).toEqual("~2.1.0");
        });

        test("api version 2.5 uses preview semver", async () => {
            const projectFolder = "tests/testprojects/action-mod-2.5";
            await setupProject(projectFolder, ModType.Action, "2.5");

            const manifest = path.join(projectFolder, "mod-manifest.json");
            const manifestJson = JSON.parse(readFileSync(manifest, "utf-8"));
            expect(manifestJson["apiVersion"]).toEqual("2.5");

            const packageJsonPath = path.join(projectFolder, "package.json");
            const packageJson = JSON.parse(
                readFileSync(packageJsonPath, "utf-8")
            );
            expect(
                packageJson["devDependencies"]["@spotfire/mods-api"]
            ).toEqual("~2.5.0");
        });
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
