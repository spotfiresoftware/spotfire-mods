import colors from "colors/safe.js";
import { existsSync } from "fs";
import { mkdir, readdir, cp, readFile, writeFile } from "fs/promises";
import path from "path";
import readline from "readline/promises";
import { createSkillFolder } from "./add-skill.js";
import {
    ModType,
    QuietOtions,
    capitalize,
    capitalizeBeforeSeparators,
    features,
    formatVersion,
    getDirname,
    getVersion,
    isModType,
    mkStdout,
    parseApiVersion,
} from "./utils.js";

interface CreateTemplateOptions {
    outDir: string;
    apiVersion?: string;
    gitignore?: boolean;
}

export type TemplateType = ModType | "gitignore";
async function getTemplateFolder(type: TemplateType) {
    const dirname = await getDirname();
    let typeFolder;
    switch (type) {
        case ModType.Action:
            typeFolder = "actions";
            break;
        case ModType.Visualization:
            typeFolder = "visualizations";
            break;
        case ModType.Agent:
            typeFolder = "agents";
            break;
        case ModType.Skill:
            typeFolder = "skills";
            break;
        case "gitignore":
            typeFolder = "gitignore";
            break;
    }

    return path.resolve(dirname, "..", "templates", typeFolder);
}

export async function createTemplate(
    type: TemplateType,
    {
        outDir,
        apiVersion,
        gitignore,
        ...quiet
    }: CreateTemplateOptions & QuietOtions
) {
    const targetFolder = path.resolve(outDir);

    const targetFolderExists = existsSync(targetFolder);
    if (!targetFolderExists) {
        await mkdir(targetFolder);
    }

    if (isModType(type)) {
        const template = "starter";
        await createModTemplate({
            modType: type,
            template,
            targetFolder,
            apiVersion,
            gitignore,
            ...quiet,
        });
    } else {
        await createGitIgnore({ targetFolder, ...quiet });
    }
}

export async function createGitIgnore({
    targetFolder,
    ...quiet
}: {
    targetFolder: string;
} & QuietOtions) {
    const stdout = mkStdout(quiet);
    const templatesFolder = await getTemplateFolder("gitignore");
    const source = path.join(templatesFolder, "ignorefile");
    const destination = path.join(targetFolder, ".gitignore");
    await cp(source, destination);
    stdout(`🎉 .gitignore file created at ${destination}`);
}

async function createModTemplate({
    apiVersion: _apiVersion,
    modType,
    template,
    targetFolder,
    gitignore,
    ...quiet
}: {
    apiVersion?: string;
    gitignore?: boolean;
    modType: ModType;
    template: string;
    targetFolder: string;
} & QuietOtions) {
    const stdout = mkStdout(quiet);
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    const templatesFolder = await getTemplateFolder(modType);

    try {
        const starterTemplate = path.resolve(templatesFolder, template);
        const cwd = path.resolve(".");

        const files = await readdir(targetFolder);
        if (files.length > 0 && !quiet.quiet) {
            const wantToContinue = await ask(
                rl,
                "❓ The target folder is not empty. Are you sure you want to continue?"
            );
            if (!wantToContinue) {
                return;
            }
        }

        stdout(`🚧 Creating ${modType} Mods project in ${targetFolder}...`);

        try {
            await cp(starterTemplate, targetFolder, { recursive: true });
        } catch (e) {
            throw new Error(
                `Could not copy templates folder to '${targetFolder}'.\nError: ${JSON.stringify(
                    e
                )}`
            );
        }

        const defaultApiVersion =
            modType === ModType.Skill
                ? "2.6"
                : modType === ModType.Agent
                    ? "2.5"
                    : modType === ModType.Action
                        ? "2.0"
                        : "1.3";
        const apiVersion = parseApiVersion(
            _apiVersion ?? defaultApiVersion
        );
        if (apiVersion.status === "error") {
            throw new Error(
                `Unregonized API version, error: ${apiVersion.error}`
            );
        }

        if (
            modType === ModType.Skill &&
            !apiVersion.result.supportsFeature("Skills")
        ) {
            throw new Error(
                `Skills require apiVersion ${formatVersion(
                    features.Skills
                )} or later, was '${apiVersion.result.toManifest()}'.`
            );
        }

        const version = await getVersion();
        const packageJsonpath = path.resolve(targetFolder, "package.json");
        const packageJson = await readFile(packageJsonpath, {
            encoding: "utf8",
        });
        await writeFile(
            packageJsonpath,
            packageJson
                .replace("MODS-SDK-VERSION", version)
                .replace("MODS-API-VERSION", apiVersion.result.toPackage()),
            { encoding: "utf-8" }
        );

        const modFolderName = path.basename(targetFolder);
        const modId = toModId(modFolderName);
        const modName = modIdToName(modId);
        const manifestPath = path.join(targetFolder, "mod-manifest.json");
        await replaceInFile(manifestPath, (manifestTemplate) => {
            let manifestJson = manifestTemplate;
            if (!apiVersion.result.supportsFeature("ModType")) {
                manifestJson = manifestJson.replace(
                    `"type": "visualization",`,
                    ""
                );
            }

            if (apiVersion.result.supportsFeature("Esm")) {
                // From apiVersion 2.6 entry points are registered via
                // RegisterEntryPoint, so the manifest no longer stores one.
                manifestJson = manifestJson.replace(
                    /\n[^\n]*"entryPoint":[^\n]*/g,
                    ""
                );
            }

            return manifestJson
                .replace("$MOD-NAME", modName)
                .replace("$MOD-ID", modId)
                .replace("$MOD-API-VERSION", apiVersion.result.toManifest())
                .replaceAll("$SKILL-ID", modId)
                .replaceAll("$SKILL-NAME", modName);
        });

        if (modType === ModType.Skill) {
            await setupSkill({ targetFolder, skillId: modId, skillName: modName });
        }

        if (gitignore) {
            await createGitIgnore({ targetFolder, ...quiet });
        }

        stdout("🎉 Template has been successfully created!");
        stdout(
            colors.bold(
                "\n⚠️ Please run the following commands to start developing:"
            )
        );
        if (cwd !== targetFolder) {
            const relativeTarget = path.relative(cwd, targetFolder);
            stdout(colors.bold(colors.yellow(`  cd ${relativeTarget}`)));
        }
        stdout(colors.bold(colors.yellow("  npm install")));
        stdout(colors.bold(colors.yellow("  npm run build")));
        stdout(colors.bold("\nFor more info please see the README.md file."));
    } finally {
        rl.close();
    }
}

async function replaceInFile(
    filePath: string,
    replaceFunction: (fileContents: string) => string
) {
    const fileContents = await readFile(filePath, "utf-8");
    await writeFile(filePath, replaceFunction(fileContents), "utf-8");
}

/**
 * Finishes the skill template by creating the skill the project is named after. The skill folder is
 * not part of the template since it is named after the skill id and since 'references' and 'assets'
 * start out empty, which a template cannot express.
 *
 * The skill is scaffolded with the same helper as the add-skill command so that the two produce
 * identical skills. The manifest is not written by add-skill though: the template ships it already
 * formatted, and rewriting it here would lose that formatting when prettier is unavailable (which
 * it is when the SDK runs through npx).
 */
async function setupSkill({
    targetFolder,
    skillId,
    skillName,
}: {
    targetFolder: string;
    skillId: string;
    skillName: string;
}) {
    await createSkillFolder({
        skillFolder: path.join(targetFolder, "skills", skillId),
        skillId,
        skillName,
    });

    // A skill contains no code, but the project is a regular action mod project to which scripts
    // and agents can be added later. The build looks for entry points in 'src/scripts', so the
    // folder has to exist for the build to succeed in a project which only contains a skill.
    await mkdir(path.join(targetFolder, "src", "scripts"), { recursive: true });

    await replaceInFile(path.join(targetFolder, "README.md"), (contents) =>
        contents
            .replaceAll("$SKILL-ID", skillId)
            .replaceAll("$SKILL-NAME", skillName)
    );
}

async function ask(rl: readline.Interface, question: string) {
    let answer = "";

    while (answer !== "yes" && answer !== "no") {
        answer = await rl.question(`${question} [yes/no]\n`);

        if (answer !== "yes" && answer !== "no") {
            console.error(
                `Invalid answer '${answer}', please answer 'yes' or 'no'.`
            );
        }
    }

    return answer === "yes";
}

export function toModId(str: string) {
    const space = /\s\s*/g;
    const notValid = /[^A-z0-9- ]/g;
    return str.trim().toLowerCase().replace(notValid, "").replace(space, "-");
}

export function modIdToName(str: string) {
    return capitalize(capitalizeBeforeSeparators(str)).replace(/-/g, " ");
}
