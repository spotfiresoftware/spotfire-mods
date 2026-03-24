import { describe, expect, test } from "@jest/globals";
import { build, generateEnvFile } from "../src/build";
import { addScript } from "../src/add-script";
import path from "path";
import { existsSync } from "fs";
import { ApiVersion, Manifest, ManifestParameter, ModType } from "../src/utils";
import { assertError, assertSuccess, setupProject } from "./test-utils";
import { addParameter } from "../src/add-parameter";
import { readFile } from "fs/promises";

describe("build.ts", () => {
    describe("actions", () => {
        const project = "tests/testprojects/starter-action-mod";
        const buildDir = path.join(project, "build");
        const srcDir = path.join(project, "src");
        const scriptsDir = path.join(srcDir, "scripts");
        const manifestPath = path.join(project, "mod-manifest.json");
        const envPath = path.join(project, "env.d.ts");
        const esbuildConfig = path.join(project, "esbuild.config.js");

        test("sourcemap exists", async () => {
            await setupProject(project, ModType.Action);

            await build({
                outdir: buildDir,
                src: srcDir,
                watch: false,
                debug: true,
                manifestPath: manifestPath,
                envPath,
                esbuildConfig,
                quiet: true,
            });

            const sourceMapPath = path.join(buildDir, "my-script.js.map");
            expect(existsSync(sourceMapPath)).toBeTruthy();
        });

        test("types get converted", async () => {
            await setupProject(project, ModType.Action);
            await addParameter("script-id", "dateParam", "Date", {
                manifestPath,
                quiet: true,
                optional: false,
            });
            await addParameter("script-id", "boolParam", "Boolean", {
                manifestPath,
                quiet: true,
                optional: false,
            });

            await build({
                outdir: buildDir,
                src: srcDir,
                watch: false,
                debug: true,
                manifestPath: manifestPath,
                envPath,
                esbuildConfig,
                quiet: true,
            });

            const envContent = await readFile(envPath, "utf-8");
            expect(envContent).toContain("dateParam: System.DateTime;");
            expect(envContent).toContain("boolParam: boolean;");
        });

        test("flattens entry points", async () => {
            await setupProject(project, ModType.Action);

            await build({
                outdir: buildDir,
                src: srcDir,
                watch: false,
                debug: true,
                manifestPath: manifestPath,
                envPath,
                esbuildConfig,
                quiet: true,
            });

            expect(
                existsSync(path.join(buildDir, "my-script.js"))
            ).toBeTruthy();

            await addScript("new-script", {
                manifestPath,
                scripts: scriptsDir,
                name: "New script",
                quiet: true,
            });

            await build({
                outdir: buildDir,
                src: srcDir,
                watch: false,
                debug: true,
                manifestPath: manifestPath,
                envPath,
                esbuildConfig,
                quiet: true,
            });

            expect(
                existsSync(path.join(buildDir, "new-script.js"))
            ).toBeTruthy();
        });
    });

    describe("visualizations", () => {
        const project = "tests/testprojects/starter-visualization-mod";
        const buildDir = path.join(project, "build");
        const srcDir = path.join(project, "src");
        const manifestPath = path.join(project, "mod-manifest.json");
        const envPath = path.join(project, "env.d.ts");
        const esbuildConfig = path.join(project, "esbuild.config.js");

        test("sourcemap exists", async () => {
            await setupProject(project, ModType.Visualization);

            await build({
                outdir: buildDir,
                src: srcDir,
                watch: false,
                debug: true,
                manifestPath: manifestPath,
                envPath,
                esbuildConfig,
                quiet: true,
            });

            const sourceMapPath = path.join(buildDir, "main.js.map");
            expect(existsSync(sourceMapPath)).toBeTruthy();
        });
    });

    describe("generateEnvFile", () => {
        test("adds files as resources", async () => {
            const manifest: Manifest = {
                apiVersion: "2.1",
                scripts: [
                    {
                        name: "My Script",
                        id: "my-script",
                        entryPoint: "myScript",
                    },
                ],
                files: ["static/file.txt", "static/data.sbdf"],
            };

            const envFile = await generateEnvFile({ manifest, quiet: true });
            assertSuccess(envFile);

            expect(envFile.result).toContain(
                `resources: Spotfire.Dxp.Application.Mods.ActionModResource<"static/file.txt" | "static/data.sbdf">`
            );
        });

        test("resources are not added if apiVersion is too low", async () => {
            const manifest: Manifest = {
                apiVersion: "2.0",
                scripts: [
                    {
                        name: "My Script",
                        id: "my-script",
                        entryPoint: "myScript",
                    },
                ],
                files: ["static/file.txt", "static/data.sbdf"],
            };

            const envFile = await generateEnvFile({ manifest, quiet: true });
            assertSuccess(envFile);

            expect(envFile.result).not.toContain("resources");
        });

        describe("input type", () => {
            const testCases: {
                testName: string;
                parameter: ManifestParameter;
                tsType: string;
                apiVersion: ApiVersion;
            }[] = [
                    {
                        testName: "data column",
                        parameter: {
                            name: "foobar",
                            type: "DataColumn",
                        },
                        tsType: "foobar: DataColumn",
                        apiVersion: new ApiVersion(2, 1),
                    },
                    {
                        testName: "optional",
                        parameter: {
                            name: "foobar",
                            type: "String",
                            optional: true,
                        },
                        tsType: "foobar?: string",
                        apiVersion: new ApiVersion(2, 1),
                    },
                    {
                        testName: "enums",
                        parameter: {
                            name: "foobar",
                            type: "String",
                            enum: ["foo", "bar"],
                        },
                        tsType: `foobar: "foo" | "bar"`,
                        apiVersion: new ApiVersion(2, 1),
                    },
                    {
                        testName: "data column array",
                        parameter: {
                            name: "foobar",
                            type: "DataColumn",
                            array: true,
                        },
                        tsType: "foobar: Iterable<DataColumn>",
                        apiVersion: new ApiVersion(2, 1),
                    },
                    {
                        testName: "data view definition",
                        parameter: {
                            name: "foobar",
                            type: "DataViewDefinition",
                        },
                        tsType: "foobar: ActionDataViewDefinition",
                        apiVersion: new ApiVersion(2, 1),
                    },
                    {
                        testName: "data view column",
                        parameter: {
                            name: "foobar",
                            type: "DataViewDefinition",
                            singleColumn: true,
                        },
                        tsType: "foobar: ActionDataViewDefinition",
                        apiVersion: new ApiVersion(2, 1),
                    },
                ];

            for (const testCase of testCases) {
                describe(testCase.testName, () => {
                    test("is typed correctly", async () => {
                        const manifest: Manifest = {
                            apiVersion: testCase.apiVersion.toManifest(),
                            scripts: [
                                {
                                    name: "My Script",
                                    id: "my-script",
                                    entryPoint: "myScript",
                                    parameters: [testCase.parameter],
                                },
                            ],
                        };

                        const envFile = await generateEnvFile({
                            manifest,
                            quiet: true,
                        });
                        assertSuccess(envFile);

                        expect(envFile.result).toContain(testCase.tsType);
                    });

                    test("cannot be added if apiVersion is too low", async () => {
                        const manifest: Manifest = {
                            apiVersion: testCase.apiVersion
                                .previous()
                                .toManifest(),
                            scripts: [
                                {
                                    name: "My Script",
                                    id: "my-script",
                                    entryPoint: "myScript",
                                    parameters: [testCase.parameter],
                                },
                            ],
                        };

                        const envFile = await generateEnvFile({
                            manifest,
                            quiet: true,
                        });
                        assertError(envFile);
                    });
                });
            }
        });

        describe("ActionModScriptDefinitions", () => {
            test("is generated for apiVersion 2.5", async () => {
                const manifest: Manifest = {
                    apiVersion: "2.5",
                    scripts: [
                        {
                            name: "My Script",
                            id: "my-script",
                            entryPoint: "myScript",
                            parameters: [
                                { name: "col", type: "DataColumn" },
                                { name: "str", type: "String" },
                            ],
                        },
                    ],
                };

                const envFile = await generateEnvFile({ manifest, quiet: true });
                assertSuccess(envFile);

                expect(envFile.result).toContain("interface ActionModScriptDefinitions");
                expect(envFile.result).toContain('"my-script"');
                expect(envFile.result).toContain("col: Spotfire.Dxp.Application.Mods.ActionModScriptArgumentNode<Spotfire.Dxp.Data.DataColumn>");
                expect(envFile.result).toContain("str: Spotfire.Dxp.Application.Mods.ActionModScriptArgumentExpression<Spotfire.Dxp.Data.DataTable> | Spotfire.Dxp.Application.Mods.ActionModScriptArgumentLiteral<string>");
                expect(envFile.result).toContain("utils: Spotfire.Dxp.Application.Mods.ActionModScriptUtils<ActionModScriptDefinitions>");
            });

            test("is not generated for apiVersion < 2.5", async () => {
                const manifest: Manifest = {
                    apiVersion: "2.4",
                    scripts: [
                        {
                            name: "My Script",
                            id: "my-script",
                            entryPoint: "myScript",
                            parameters: [
                                { name: "col", type: "DataColumn" },
                            ],
                        },
                    ],
                };

                const envFile = await generateEnvFile({ manifest, quiet: true });
                assertSuccess(envFile);

                expect(envFile.result).not.toContain("ActionModScriptDefinitions");
                expect(envFile.result).not.toContain("ActionModScriptUtils");
            });

            test("DataColumn with array maps to DataView", async () => {
                const manifest: Manifest = {
                    apiVersion: "2.5",
                    scripts: [
                        {
                            name: "My Script",
                            id: "my-script",
                            entryPoint: "myScript",
                            parameters: [
                                { name: "cols", type: "DataColumn", array: true },
                            ],
                        },
                    ],
                };

                const envFile = await generateEnvFile({ manifest, quiet: true });
                assertSuccess(envFile);

                expect(envFile.result).toContain("cols: Spotfire.Dxp.Application.Mods.ActionModScriptArgumentDataView<Spotfire.Dxp.Data.DataTable>");
            });

            test("Visualization maps to Node", async () => {
                const manifest: Manifest = {
                    apiVersion: "2.5",
                    scripts: [
                        {
                            name: "My Script",
                            id: "my-script",
                            entryPoint: "myScript",
                            parameters: [
                                { name: "viz", type: "Visualization" },
                            ],
                        },
                    ],
                };

                const envFile = await generateEnvFile({ manifest, quiet: true });
                assertSuccess(envFile);

                expect(envFile.result).toContain("viz: Spotfire.Dxp.Application.Mods.ActionModScriptArgumentNode<Spotfire.Dxp.Visuals.Visual>");
            });

            test("DataViewDefinition maps to DataView", async () => {
                const manifest: Manifest = {
                    apiVersion: "2.5",
                    scripts: [
                        {
                            name: "My Script",
                            id: "my-script",
                            entryPoint: "myScript",
                            parameters: [
                                { name: "view", type: "DataViewDefinition" },
                            ],
                        },
                    ],
                };

                const envFile = await generateEnvFile({ manifest, quiet: true });
                assertSuccess(envFile);

                expect(envFile.result).toContain("view: Spotfire.Dxp.Application.Mods.ActionModScriptArgumentDataView<Spotfire.Dxp.Data.DataTable>");
            });

            test("enum maps to Expression | Literal with enum union", async () => {
                const manifest: Manifest = {
                    apiVersion: "2.5",
                    scripts: [
                        {
                            name: "My Script",
                            id: "my-script",
                            entryPoint: "myScript",
                            parameters: [
                                { name: "choice", type: "String", enum: ["foo", "bar"] },
                            ],
                        },
                    ],
                };

                const envFile = await generateEnvFile({ manifest, quiet: true });
                assertSuccess(envFile);

                expect(envFile.result).toContain(
                    `choice: Spotfire.Dxp.Application.Mods.ActionModScriptArgumentExpression<Spotfire.Dxp.Data.DataTable> | Spotfire.Dxp.Application.Mods.ActionModScriptArgumentLiteral<"foo" | "bar">`
                );
            });

            test("MarkingContext is generated for marking agent", async () => {
                const manifest: Manifest = {
                    apiVersion: "2.5",
                    scripts: [
                        {
                            name: "My Script",
                            id: "my-script",
                            entryPoint: "myScript",
                            parameters: [
                                { name: "col", type: "DataColumn" },
                            ],
                        },
                    ],
                    agents: [
                        {
                            id: "my-agent",
                            name: "My Agent",
                            file: "build/my-agent.js",
                            entryPoint: "myAgent",
                            type: "marking",
                        },
                    ],
                };

                const envFile = await generateEnvFile({ manifest, quiet: true });
                assertSuccess(envFile);

                expect(envFile.result).toContain("interface MarkingContext");
                expect(envFile.result).toContain("context: Spotfire.Dxp.Application.Insights.MarkingInsightAgentContext");
                expect(envFile.result).toContain("utils: Spotfire.Dxp.Application.Mods.ActionModScriptUtils<ActionModScriptDefinitions>");
                expect(envFile.result).toContain("resources: Spotfire.Dxp.Application.Mods.ActionModResource");
            });

            test("VisualContext is generated for visual agent", async () => {
                const manifest: Manifest = {
                    apiVersion: "2.5",
                    scripts: [],
                    agents: [
                        {
                            id: "my-visual-agent",
                            name: "My Visual Agent",
                            file: "build/my-visual-agent.js",
                            entryPoint: "myVisualAgent",
                            type: "visual",
                        },
                    ],
                };

                const envFile = await generateEnvFile({ manifest, quiet: true });
                assertSuccess(envFile);

                expect(envFile.result).toContain("interface VisualContext");
                expect(envFile.result).toContain("context: Spotfire.Dxp.Application.Insights.VisualInsightAgentContext");
                expect(envFile.result).not.toContain("MarkingContext");
            });

            test("MarkingContext includes file resources", async () => {
                const manifest: Manifest = {
                    apiVersion: "2.5",
                    scripts: [],
                    agents: [
                        {
                            id: "my-agent",
                            name: "My Agent",
                            file: "build/my-agent.js",
                            entryPoint: "myAgent",
                            type: "marking",
                        },
                    ],
                    files: ["static/data.sbdf"],
                };

                const envFile = await generateEnvFile({ manifest, quiet: true });
                assertSuccess(envFile);

                expect(envFile.result).toContain(
                    `resources: Spotfire.Dxp.Application.Mods.ActionModResource<"static/data.sbdf">`
                );
            });

            test("MarkingContext is not generated for apiVersion < 2.5", async () => {
                const manifest: Manifest = {
                    apiVersion: "2.4",
                    scripts: [
                        {
                            name: "My Script",
                            id: "my-script",
                            entryPoint: "myScript",
                        },
                    ],
                    agents: [
                        {
                            id: "my-agent",
                            name: "My Agent",
                            file: "build/my-agent.js",
                            entryPoint: "myAgent",
                            type: "marking",
                        },
                    ],
                };

                const envFile = await generateEnvFile({ manifest, quiet: true });
                assertSuccess(envFile);

                expect(envFile.result).not.toContain("MarkingContext");
            });

            test("MarkingContext is not generated without marking agents", async () => {
                const manifest: Manifest = {
                    apiVersion: "2.5",
                    scripts: [
                        {
                            name: "My Script",
                            id: "my-script",
                            entryPoint: "myScript",
                            parameters: [
                                { name: "col", type: "DataColumn" },
                            ],
                        },
                    ],
                };

                const envFile = await generateEnvFile({ manifest, quiet: true });
                assertSuccess(envFile);

                expect(envFile.result).not.toContain("MarkingContext");
            });

            test("optional parameter uses an optional key; generic types also accept null", async () => {
                const manifest: Manifest = {
                    apiVersion: "2.5",
                    scripts: [
                        {
                            name: "My Script",
                            id: "my-script",
                            entryPoint: "myScript",
                            parameters: [
                                { name: "reqStr", type: "String" },
                                { name: "optStr", type: "String", optional: true },
                                { name: "optCol", type: "DataColumn", optional: true },
                                { name: "optView", type: "DataColumn", array: true, optional: true },
                            ],
                        },
                    ],
                };

                const envFile = await generateEnvFile({ manifest, quiet: true });
                assertSuccess(envFile);

                // Optional key (can be omitted). Generic argument types also accept a wrapped null
                // inside the generic (e.g. `new ActionModScriptArgumentLiteral(null)`), which keeps
                // the null assignable to an optional slot but not a required one.
                expect(envFile.result).toContain(
                    "optStr?: Spotfire.Dxp.Application.Mods.ActionModScriptArgumentExpression<Spotfire.Dxp.Data.DataTable | null> | Spotfire.Dxp.Application.Mods.ActionModScriptArgumentLiteral<string | null>"
                );
                expect(envFile.result).toContain(
                    "optCol?: Spotfire.Dxp.Application.Mods.ActionModScriptArgumentNode<Spotfire.Dxp.Data.DataColumn | null>"
                );
                // Non-generic argument type: optional key only (omittable); no null inside.
                expect(envFile.result).toContain(
                    "optView?: Spotfire.Dxp.Application.Mods.ActionModScriptArgumentDataView<Spotfire.Dxp.Data.DataTable | null>"
                );
                // Required: no optional key, no null in the argument type.
                expect(envFile.result).toContain(
                    "reqStr: Spotfire.Dxp.Application.Mods.ActionModScriptArgumentExpression<Spotfire.Dxp.Data.DataTable> | Spotfire.Dxp.Application.Mods.ActionModScriptArgumentLiteral<string>"
                );
                // The old, unsafe "null outside the generic" form must not appear.
                expect(envFile.result).not.toContain("| null;");
            });

            test("multiple scripts generate entries for each", async () => {
                const manifest: Manifest = {
                    apiVersion: "2.5",
                    scripts: [
                        {
                            name: "Script One",
                            id: "script-one",
                            entryPoint: "scriptOne",
                            parameters: [
                                { name: "param1", type: "Boolean" },
                            ],
                        },
                        {
                            name: "Script Two",
                            id: "script-two",
                            entryPoint: "scriptTwo",
                            parameters: [
                                { name: "param2", type: "Integer" },
                            ],
                        },
                    ],
                };

                const envFile = await generateEnvFile({ manifest, quiet: true });
                assertSuccess(envFile);

                expect(envFile.result).toContain('"script-one"');
                expect(envFile.result).toContain('"script-two"');
                expect(envFile.result).toContain(
                    "param1: Spotfire.Dxp.Application.Mods.ActionModScriptArgumentExpression<Spotfire.Dxp.Data.DataTable> | Spotfire.Dxp.Application.Mods.ActionModScriptArgumentLiteral<boolean>"
                );
                expect(envFile.result).toContain(
                    "param2: Spotfire.Dxp.Application.Mods.ActionModScriptArgumentExpression<Spotfire.Dxp.Data.DataTable> | Spotfire.Dxp.Application.Mods.ActionModScriptArgumentLiteral<number>"
                );
            });
        });
    });
});
