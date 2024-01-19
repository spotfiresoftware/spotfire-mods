import { describe, expect, test } from "@jest/globals";
import { build } from "../src/build";
import path from "path";
import { existsSync } from "fs";

describe("build.ts", () => {
    const project = "tests/testprojects/simple-mod";
    const buildDir = path.join(project, "build");
    const scriptsDir = path.join(project, "src", "scripts");
    const manifestPath = path.join(project, "mod-manifest.json");
    const envPath = path.join(project, "action-mods-env.d.ts");

    test("sourcemap exists", async () => {
        await build({
            outdir: buildDir,
            scripts: scriptsDir,
            watch: false,
            debug: true,
            manifestPath: manifestPath,
            envPath,
        });

        const sourceMapPath = path.join(buildDir, "my-script.js.map");
        expect(existsSync(sourceMapPath)).toBeTruthy();
    });
});
