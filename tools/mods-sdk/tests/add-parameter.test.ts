import { describe, expect, test } from "@jest/globals";
import path from "path";
import { ModType, readManifest } from "../src/utils";
import { addParameter, addParameterToManifest } from "../src/add-parameter";
import { setupProject } from "./test-utils";

describe("add-parameter.test.ts", () => {
    const projectFolder = "tests/testprojects/add-parameter";
    const manifestPath = path.join(projectFolder, "mod-manifest.json");

    test("can add parameter", async () => {
        const scriptId = "script-id";
        await setupProject(projectFolder, ModType.Action);
        await addParameter(scriptId, "param1", "DateTime", {
            manifestPath,
            quiet: true,
            optional: false,
        });

        const manifest = await readManifest(manifestPath);
        const scripts = manifest.scripts ?? [];
        const script = scripts.find((s) => s.id === scriptId);
        expect(script).toBeDefined();
        const parameters = script?.parameters ?? [];
        const param1 = parameters.find((p) => p.name === "param1");
        expect(param1).toBeDefined();
        expect(param1?.type).toEqual("DateTime");
    });

    test("can add data column parameter if apiVersion is 2.1 or above", () => {
        const manifest = addParameterToManifest({
            manifest: {
                apiVersion: "2.1",
                scripts: [
                    {
                        name: "My Script",
                        id: "my-script",
                        entryPoint: "myScript",
                    },
                ],
            },
            scriptId: "my-script",
            name: "column",
            type: "DataColumn",
            quiet: true,
            optional: false,
        });

        const scripts = manifest.scripts!;
        const parameters = scripts[0].parameters!;
        expect(parameters[0].name).toEqual("column");
        expect(parameters[0].type).toEqual("DataColumn");
    });

    test("cannot add data column parameter if apiVersion is below 2.1", () => {
        expect(() =>
            addParameterToManifest({
                manifest: {
                    apiVersion: "2.0",
                    scripts: [
                        {
                            name: "My Script",
                            id: "my-script",
                            entryPoint: "myScript",
                        },
                    ],
                },
                scriptId: "my-script",
                name: "column",
                type: "DataColumn",
                quiet: true,
                optional: false,
            })
        ).toThrow();
    });

    test("can add optional parameter", () => {
        const manifest = addParameterToManifest({
            manifest: {
                apiVersion: "2.1",
                scripts: [
                    {
                        name: "My Script",
                        id: "my-script",
                        entryPoint: "myScript",
                    },
                ],
            },
            scriptId: "my-script",
            name: "foobar",
            type: "String",
            quiet: true,
            optional: true,
        });

        const scripts = manifest.scripts!;
        const parameters = scripts[0].parameters!;
        expect(parameters[0].name).toEqual("foobar");
        expect(parameters[0].optional).toBeTruthy();
    });

    test("cannot add optional parameter if apiVersion is below 2.1", () => {
        expect(() =>
            addParameterToManifest({
                manifest: {
                    apiVersion: "2.0",
                    scripts: [
                        {
                            name: "My Script",
                            id: "my-script",
                            entryPoint: "myScript",
                        },
                    ],
                },
                scriptId: "my-script",
                name: "column",
                type: "String",
                quiet: true,
                optional: true,
            })
        ).toThrow();
    });

    test("throw for visualization mods", async () => {
        await setupProject(projectFolder, ModType.Visualization);
        expect(async () => {
            await addParameter("my-script", "param1", "DateTime", {
                manifestPath,
                quiet: true,
                optional: false,
            });
        }).rejects.toMatchObject({
            message:
                "Mods of type visualization do not support script parameters.",
        });
    });
});
