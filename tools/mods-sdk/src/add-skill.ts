import { existsSync } from "fs";
import { mkdir, stat, writeFile } from "fs/promises";
import path from "path";
import {
    QuietOtions,
    features,
    formatVersion,
    mkStdout,
    readApiVersion,
    readManifest,
    writeManifest,
} from "./utils.js";

interface AddSkillOptions {
    manifestPath: string;
    skillsDir: string;
    name?: string;
    description?: string;
}

/**
 * Used when no description is given. The description is required by the manifest schema and is what
 * the AI reads when it decides whether the skill applies, so it is left as an obvious placeholder
 * rather than derived from the id.
 */
export const defaultSkillDescription =
    "Describes what the skill does so the AI knows when to use it.";

/**
 * The instructions of a skill. Unlike a script or an agent a skill contains no code, so what is
 * scaffolded is a Markdown file describing what the AI should do when the skill is used.
 */
export function createSkillSkeleton({
    skillId,
    skillName,
}: {
    skillId: string;
    skillName: string;
}) {
    return `# ${skillName}

Replace this file with the instructions the AI should follow when it uses this skill.
The file is plain Markdown and is read in full whenever the skill is triggered, so keep it
focused: describe the task, the steps to take, and anything the AI needs to be careful about.

## When to use this skill

Describe the situations this skill applies to. The \`description\` field of the skill in
\`mod-manifest.json\` is what the AI sees when it decides whether to use the skill at all, so keep
that field accurate and let this section explain the details.

## Instructions

1. Explain the first step here.
2. ...and the next one.

## Resources

Larger material that does not need to be read every time belongs next to this file and is loaded
on demand:

- \`references/\` — reference documents, for example a data dictionary or a style guide.
- \`assets/\` — files used by the skill, for example templates or images.

Add any file you place in these folders to the \`files\` list in \`mod-manifest.json\` so that it is
saved with the mod, and refer to it from this file by its path relative to the mod manifest, for
example \`skills/${skillId}/references/data-dictionary.md\`.
`;
}

/**
 * Creates the folder structure of a skill: a 'SKILL.md' holding the instructions plus the
 * 'references' and 'assets' folders for resources which are loaded on demand. The folders start out
 * empty. Returns the path of the created 'SKILL.md'.
 */
export async function createSkillFolder({
    skillFolder,
    skillId,
    skillName,
}: {
    skillFolder: string;
    skillId: string;
    skillName: string;
}) {
    await mkdir(path.join(skillFolder, "references"), { recursive: true });
    await mkdir(path.join(skillFolder, "assets"), { recursive: true });

    const instructionsPath = path.join(skillFolder, "SKILL.md");
    await writeFile(
        instructionsPath,
        createSkillSkeleton({ skillId, skillName }),
        { encoding: "utf8" }
    );

    return instructionsPath;
}

export async function addSkill(
    id: string,
    {
        manifestPath: _manifestPath,
        skillsDir: _skillsDir,
        name,
        description,
        ...quiet
    }: AddSkillOptions & QuietOtions
) {
    const stdout = mkStdout(quiet);
    const manifestPath = path.resolve(_manifestPath);
    const skillsFolder = path.resolve(_skillsDir);

    if (!existsSync(manifestPath)) {
        throw new Error(`Cannot find ${manifestPath}.`);
    }

    if (!id.match(/^[a-zA-Z0-9]+[a-zA-Z0-9-._]*(?<=[a-zA-Z0-9])$/g)) {
        throw new Error(`Invalid skill id '${id}'.`);
    }

    if (existsSync(skillsFolder)) {
        const skillsStat = await stat(skillsFolder);
        if (!skillsStat.isDirectory()) {
            throw new Error(`${skillsFolder} is not a directory.`);
        }
    }

    const manifest = await readManifest(manifestPath);

    if (manifest.type !== "action") {
        throw new Error(
            `Mods of type ${
                manifest.type ?? "visualization"
            } do not support skills.`
        );
    }

    const apiVersion = readApiVersion(manifest);
    if (
        apiVersion.status === "success" &&
        !apiVersion.result.supportsFeature("Skills")
    ) {
        throw new Error(
            `Skills require apiVersion ${formatVersion(
                features.Skills
            )} or later, the mod targets '${apiVersion.result.toManifest()}'.`
        );
    }

    if (manifest.skills?.find((s) => s.id === id)) {
        throw new Error(`The mod already contains a skill with id '${id}'.`);
    }

    // The folder name is what ties the instructions to the skill, so it has to be named after the
    // id and cannot be shared with an existing skill.
    const skillFolder = path.join(skillsFolder, id);
    const instructionsPath = path.join(skillFolder, "SKILL.md");
    if (existsSync(instructionsPath)) {
        throw new Error(
            `The mod already contains a skill file at '${instructionsPath}'.`
        );
    }

    manifest.skills = [
        ...(manifest.skills ?? []),
        {
            id: id,
            name: name ?? id,
            description: description ?? defaultSkillDescription,
        },
    ];

    // Every file of a skill has to be listed in 'files' to be saved with the mod. The path is
    // relative to the manifest, as are all other paths in it.
    const instructionsFile = path
        .relative(path.dirname(manifestPath), instructionsPath)
        .replace(/\\/g, "/");
    const files = manifest.files ?? [];
    manifest.files = files.includes(instructionsFile)
        ? files
        : [...files, instructionsFile];

    await createSkillFolder({ skillFolder, skillId: id, skillName: name ?? id });
    await writeManifest(manifestPath, manifest, false);

    stdout(`A skill file has been created at: ${instructionsPath}`);
}
