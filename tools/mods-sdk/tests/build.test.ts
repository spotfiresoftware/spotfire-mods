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
    });
});
