import { describe, expect, test } from "@jest/globals";
import { readFile } from "fs/promises";
import path from "path";
import prettier from "prettier";
import { addAgent, createAgentSkeleton } from "../src/add-agent";
import { ModType } from "../src/utils";
import { setupProject } from "./test-utils";

describe("add-agent.test.ts", () => {
    const projectFolder = "tests/testprojects/add-agent";
    const scriptsFolder = path.join(projectFolder, "src", "scripts");
    const manifest = path.join(projectFolder, "mod-manifest.json");

    test("can specify a custom name", async () => {
        await setupProject(projectFolder, ModType.Action);

        const id = "new-agent";
        const name = "My New Agent";
        await addAgent(id, {
            manifestPath: manifest,
            scripts: scriptsFolder,
            name,
            type: "marking",
            quiet: true,
        });

        const json = JSON.parse(await readFile(manifest, "utf-8"));
        expect(json).toHaveProperty("agents");
        const agents = json["agents"];
        expect(agents).toHaveLength(1);
        const newAgent = agents[0];
        expect(newAgent["id"]).toEqual(id);
        expect(newAgent["name"]).toEqual(name);
        expect(newAgent["type"]).toEqual("marking");
    });

    test("adding an insight retains manifest formatting", async () => {
        await setupProject(projectFolder, ModType.Action);

        await addAgent("new-insight", {
            manifestPath: manifest,
            scripts: scriptsFolder,
            type: "marking",
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

    test("generated skeleton destructures MarkingContext", () => {
        const src = createAgentSkeleton({
            entryPoint: "myInsight",
            type: "marking",
        });
        expect(src).toContain(
            "{ context, resources, utils }: MarkingContext"
        );
    });

    test("generated skeleton destructures VisualContext", () => {
        const src = createAgentSkeleton({
            entryPoint: "myVisualInsight",
            type: "visual",
        });
        expect(src).toContain(
            "{ context, resources, utils }: VisualContext"
        );
    });

    test("generated skeleton registers entry point", () => {
        const src = createAgentSkeleton({
            entryPoint: "myInsight",
            type: "marking",
        });
        expect(src).toContain("RegisterEntryPoint(myInsight)");
    });

    test("throw for visualization mods", async () => {
        await setupProject(projectFolder, ModType.Visualization);
        expect(async () => {
            await addAgent("new-insight", {
                manifestPath: manifest,
                scripts: scriptsFolder,
                name: "My New Insight",
                type: "marking",
                quiet: true,
            });
        }).rejects.toMatchObject({
            message: "Mods of type visualization do not support insights.",
        });
    });
});
