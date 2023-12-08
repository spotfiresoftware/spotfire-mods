import { describe, expect, test } from "@jest/globals";
import { build, buildFlatEntryPointsMap } from "../src/build";
import path from "path";
import { existsSync } from "fs";
import { ModType } from "../src/utils";
import { setupProject } from "./test-utils";
import { addParameter } from "../src/add-parameter";
import { readFile } from "fs/promises";

describe("build.ts", () => {
    describe("actions", () => {
        const project = "tests/testprojects/starter-action-mod";
        const buildDir = path.join(project, "build");
        const scriptsDir = path.join(project, "src");
        const manifestPath = path.join(project, "mod-manifest.json");
        const envPath = path.join(project, "env.d.ts");
        const esbuildConfig = path.join(project, "esbuild.config.js");

        test("sourcemap exists", async () => {
            await setupProject(project, ModType.Action);

            await build({
                outdir: buildDir,
                src: scriptsDir,
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
            });
            await addParameter("script-id", "boolParam", "Boolean", {
                manifestPath,
                quiet: true,
            });

            await build({
                outdir: buildDir,
                src: scriptsDir,
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

    describe("buildFlatEntryPointsMap", () => {
        test("flattens entry points", () => {
            const result = buildFlatEntryPointsMap([
                "script/index.ts",
                "script/other.ts",
                "atRoot.ts",
                "script/deep/deep.ts",
            ]);
            expect(result).toEqual({
                index: "script/index.ts",
                other: "script/other.ts",
                atRoot: "atRoot.ts",
                deep: "script/deep/deep.ts",
            });
        });
    });
});
