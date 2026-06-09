import { describe, expect, test } from "@jest/globals";
import { existsSync } from "fs";
import { readFile } from "fs/promises";
import path from "path";
import prettier from "prettier";
import {
    addSkill,
    createSkillSkeleton,
    defaultSkillDescription,
} from "../src/add-skill";
import { ModType } from "../src/utils";
import { setupProject } from "./test-utils";

describe("add-skill.test.ts", () => {
    const projectFolder = "tests/testprojects/add-skill";
    const skillsFolder = path.join(projectFolder, "skills");
    const manifest = path.join(projectFolder, "mod-manifest.json");

    function add(id: string, options: Partial<Parameters<typeof addSkill>[1]> = {}) {
        return addSkill(id, {
            manifestPath: manifest,
            skillsDir: skillsFolder,
            quiet: true,
            ...options,
        });
    }

    test("can specify a custom name and description", async () => {
        await setupProject(projectFolder, ModType.Action, "2.6");

        const id = "sales-analyst";
        await add(id, {
            name: "Sales Analyst",
            description: "Answers questions about revenue trends.",
        });

        const json = JSON.parse(await readFile(manifest, "utf-8"));
        expect(json["skills"]).toEqual([
            {
                id,
                name: "Sales Analyst",
                description: "Answers questions about revenue trends.",
            },
        ]);
    });

    test("name defaults to the id and description to a placeholder", async () => {
        await setupProject(projectFolder, ModType.Action, "2.6");

        await add("sales-analyst");

        const json = JSON.parse(await readFile(manifest, "utf-8"));
        expect(json["skills"][0]["name"]).toEqual("sales-analyst");
        expect(json["skills"][0]["description"]).toEqual(
            defaultSkillDescription
        );
    });

    test("creates the skill folder with empty resource folders", async () => {
        await setupProject(projectFolder, ModType.Action, "2.6");

        await add("sales-analyst");

        const skillFolder = path.join(skillsFolder, "sales-analyst");
        expect(existsSync(path.join(skillFolder, "SKILL.md"))).toBeTruthy();
        expect(existsSync(path.join(skillFolder, "references"))).toBeTruthy();
        expect(existsSync(path.join(skillFolder, "assets"))).toBeTruthy();
    });

    test("adds the instructions to the manifest files list", async () => {
        await setupProject(projectFolder, ModType.Action, "2.6");

        await add("sales-analyst");
        await add("cost-analyst");

        const json = JSON.parse(await readFile(manifest, "utf-8"));
        expect(json["files"]).toEqual([
            "skills/sales-analyst/SKILL.md",
            "skills/cost-analyst/SKILL.md",
        ]);
        expect(json["skills"]).toHaveLength(2);
    });

    test("adding a skill retains manifest formatting", async () => {
        await setupProject(projectFolder, ModType.Action, "2.6");

        await add("sales-analyst");

        const config = await prettier.resolveConfig(manifest, {
            editorconfig: true,
        });
        const json = await readFile(manifest, "utf-8");
        expect(
            prettier.check(json, { filepath: manifest, ...config })
        ).toBeTruthy();
    });

    test("generated skeleton refers to the skill by name and id", () => {
        const src = createSkillSkeleton({
            skillId: "sales-analyst",
            skillName: "Sales Analyst",
        });
        expect(src).toContain("# Sales Analyst");
        expect(src).toContain("skills/sales-analyst/references/");
    });

    test("throws for a duplicate id", async () => {
        await setupProject(projectFolder, ModType.Action, "2.6");

        await add("sales-analyst");
        await expect(add("sales-analyst")).rejects.toMatchObject({
            message:
                "The mod already contains a skill with id 'sales-analyst'.",
        });
    });

    test("throws for an invalid id", async () => {
        await setupProject(projectFolder, ModType.Action, "2.6");

        await expect(add("-not valid-")).rejects.toMatchObject({
            message: "Invalid skill id '-not valid-'.",
        });
    });

    test("throws for api versions without skill support", async () => {
        await setupProject(projectFolder, ModType.Action, "2.5");

        await expect(add("sales-analyst")).rejects.toThrow(/2\.6/);
    });

    test("throws for visualization mods", async () => {
        await setupProject(projectFolder, ModType.Visualization);

        await expect(add("sales-analyst")).rejects.toMatchObject({
            message: "Mods of type visualization do not support skills.",
        });
    });
});
