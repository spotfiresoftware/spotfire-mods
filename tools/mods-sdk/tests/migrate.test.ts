import { afterEach, describe, expect, jest, test } from "@jest/globals";
import { readFile, writeFile } from "fs/promises";
import path from "path";
import { migrate } from "../src/migrate";
import { getVersion, ModType, readManifest } from "../src/utils";
import { setupProject } from "./test-utils";

describe("migrate.test.ts", () => {
    const project = "tests/testprojects/migrate";
    const manifestPath = path.join(project, "mod-manifest.json");
    const packagePath = path.join(project, "package.json");
    const scriptsDir = path.join(project, "src", "scripts");
    const esbuildConfig = path.join(project, "esbuild.config.js");

    function runMigrate(apiVersion: string, quiet = true) {
        return migrate(apiVersion, {
            manifestPath,
            packagePath,
            scripts: scriptsDir,
            esbuildConfig,
            quiet,
        });
    }

    afterEach(() => {
        jest.restoreAllMocks();
    });

    test("updates the apiVersion in the manifest", async () => {
        await setupProject(project, ModType.Action);
        await runMigrate("2.6");

        const manifest = await readManifest(manifestPath);
        expect(manifest.apiVersion).toEqual("2.6");
    });

    test("prints the install and build commands when finished", async () => {
        await setupProject(project, ModType.Action);

        const infoSpy = jest.spyOn(console, "info").mockImplementation(() => {});
        await runMigrate("2.6", false);

        const messages = infoSpy.mock.calls.map((call) => String(call[0]));
        expect(messages.some((m) => m.includes("npm install"))).toBe(true);
        expect(messages.some((m) => m.includes("npm run build"))).toBe(true);
    });

    test("removes entryPoint from scripts when migrating to 2.6", async () => {
        await setupProject(project, ModType.Action);

        const before = await readManifest(manifestPath);
        expect(before.scripts?.[0].entryPoint).toBeDefined();

        await runMigrate("2.6");

        const after = await readManifest(manifestPath);
        for (const script of after.scripts ?? []) {
            expect(script.entryPoint).toBeUndefined();
        }
    });

    test("removes entryPoint from agents when migrating to 2.6", async () => {
        await setupProject(project, ModType.Agent, "2.5");

        const before = await readManifest(manifestPath);
        expect(before.agents?.[0].entryPoint).toBeDefined();

        await runMigrate("2.6");

        const after = await readManifest(manifestPath);
        for (const agent of after.agents ?? []) {
            expect(agent.entryPoint).toBeUndefined();
        }
    });

    test("keeps entryPoint when migrating below 2.6", async () => {
        await setupProject(project, ModType.Action);
        await runMigrate("2.4");

        const manifest = await readManifest(manifestPath);
        expect(manifest.apiVersion).toEqual("2.4");
        expect(manifest.scripts?.[0].entryPoint).toEqual("myScript");
    });

    test("updates @spotfire/mods-api in package.json", async () => {
        await setupProject(project, ModType.Action);
        await runMigrate("2.6");

        const pkg = JSON.parse(await readFile(packagePath, "utf-8"));
        expect(pkg.devDependencies["@spotfire/mods-api"]).toEqual("~2.6.0-preview.0");
    });

    test("warns when migrating to a version newer than the SDK knows about", async () => {
        await setupProject(project, ModType.Action);

        const infoSpy = jest.spyOn(console, "info").mockImplementation(() => {});
        await runMigrate("2.7", false);

        const warning = infoSpy.mock.calls
            .map((call) => String(call[0]))
            .find(
                (msg) =>
                    msg.includes("newer than") &&
                    msg.includes("@spotfire/mods-sdk")
            );
        expect(warning).toBeDefined();
    });

    test("bumps @spotfire/mods-sdk to the running version", async () => {
        await setupProject(project, ModType.Action);

        // Pretend the project was created with an old SDK.
        const pkg = JSON.parse(await readFile(packagePath, "utf-8"));
        pkg.devDependencies["@spotfire/mods-sdk"] = "^1.0.0";
        await writeFile(packagePath, JSON.stringify(pkg), "utf-8");

        await runMigrate("2.6");

        const updated = JSON.parse(await readFile(packagePath, "utf-8"));
        expect(updated.devDependencies["@spotfire/mods-sdk"]).toEqual(
            `^${await getVersion()}`
        );
    });

    test("warns about scripts missing RegisterEntryPoint", async () => {
        await setupProject(project, ModType.Action);
        await writeFile(
            path.join(scriptsDir, "no-entry.ts"),
            "export function noEntry() {}\n",
            "utf-8"
        );

        const infoSpy = jest.spyOn(console, "info").mockImplementation(() => {});
        await runMigrate("2.6", false);

        const messages = infoSpy.mock.calls.map((call) => String(call[0]));
        const warning = messages.find(
            (msg) =>
                msg.includes("no-entry.ts") &&
                msg.includes("RegisterEntryPoint")
        );
        expect(warning).toBeDefined();
    });

    test("does not warn when every script registers an entry point", async () => {
        await setupProject(project, ModType.Action);

        const infoSpy = jest.spyOn(console, "info").mockImplementation(() => {});
        await runMigrate("2.6", false);

        const registerWarnings = infoSpy.mock.calls
            .map((call) => String(call[0]))
            .filter(
                (msg) =>
                    msg.includes("does not call") &&
                    msg.includes("RegisterEntryPoint")
            );
        expect(registerWarnings).toHaveLength(0);
    });

    test("rewrites the params interface reference in the source by build-file basename", async () => {
        await setupProject(project, ModType.Action);

        // Reproduce the legacy starter layout where the script id differs from
        // the source/build-file basename: id 'script-id' but file
        // 'build/my-script.js' with source 'my-script.ts'.
        const manifest = await readManifest(manifestPath);
        manifest.scripts![0].id = "script-id";
        manifest.scripts![0].entryPoint = "myScript";
        manifest.scripts![0].file = "build/my-script.js";
        await writeFile(manifestPath, JSON.stringify(manifest), "utf-8");

        const sourceFile = path.join(scriptsDir, "my-script.ts");
        await writeFile(
            sourceFile,
            "export function myScript({ document }: MyScriptParameters) {}\nRegisterEntryPoint(myScript);\n",
            "utf-8"
        );

        await runMigrate("2.6");

        const updated = await readFile(sourceFile, "utf-8");
        expect(updated).toContain("ScriptIdParameters");
        expect(updated).not.toContain("MyScriptParameters");
    });

    test("warns when the interface name changes but no source file can be found", async () => {
        await setupProject(project, ModType.Action);

        // id/entry point normalize to different names and neither the build-file
        // basename nor the id resolve to a source file, so it cannot be fixed.
        const manifest = await readManifest(manifestPath);
        manifest.scripts![0].id = "weird-name";
        manifest.scripts![0].entryPoint = "differentThing";
        manifest.scripts![0].file = "build/no-such-source.js";
        await writeFile(manifestPath, JSON.stringify(manifest), "utf-8");

        const infoSpy = jest.spyOn(console, "info").mockImplementation(() => {});
        await runMigrate("2.6", false);

        const warning = infoSpy.mock.calls
            .map((call) => String(call[0]))
            .find(
                (msg) =>
                    msg.includes("weird-name") && msg.includes("changes from")
            );
        expect(warning).toBeDefined();
    });

    test("warns when the esbuild config overrides format for >=2.6", async () => {
        // Dedicated path so the user esbuild config is loaded fresh (not from
        // another test's ESM import cache).
        const cfgProject = "tests/testprojects/migrate-esbuild";
        const cfgManifest = path.join(cfgProject, "mod-manifest.json");
        const cfgPackage = path.join(cfgProject, "package.json");
        const cfgScripts = path.join(cfgProject, "src", "scripts");
        const cfgEsbuild = path.join(cfgProject, "esbuild.config.js");

        await setupProject(cfgProject, ModType.Action);
        await writeFile(
            cfgEsbuild,
            `export default { target: "es2022", format: "iife" };\n`,
            "utf-8"
        );

        const infoSpy = jest.spyOn(console, "info").mockImplementation(() => {});
        await migrate("2.6", {
            manifestPath: cfgManifest,
            packagePath: cfgPackage,
            scripts: cfgScripts,
            esbuildConfig: cfgEsbuild,
            quiet: false,
        });

        const warning = infoSpy.mock.calls
            .map((call) => String(call[0]))
            .find(
                (msg) =>
                    msg.includes("esbuild.config.js") && msg.includes("format")
            );
        expect(warning).toBeDefined();
    });
});
