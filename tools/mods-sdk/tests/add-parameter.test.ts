import { describe, expect, test } from "@jest/globals";
import path from "path";
import { ModType, readManifest } from "../src/utils";
import { addParameter } from "../src/add-parameter";
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
});
