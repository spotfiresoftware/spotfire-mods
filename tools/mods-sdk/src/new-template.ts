import colors from "colors/safe.js";
import fse from "fs-extra";
import { mkdir } from "fs/promises";
import path from "path";
import readline from "readline/promises";
import {
    ModType,
    QuietOtions,
    capitalize,
    capitalizeBeforeSeparators,
    getDirname,
    getVersion,
    mkStdout,
} from "./utils.js";

interface CreateTemplateOptions {
    outDir: string;
}

export async function createTemplate(
    modType: ModType,
    { outDir, ...quiet }: CreateTemplateOptions & QuietOtions
) {
    const stdout = mkStdout(quiet);
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    try {
        const dirname = await getDirname();
        const targetFolder = path.resolve(outDir);
        const templatesFolder = path.resolve(
            dirname,
            "..",
            "templates",
            modType === ModType.Action ? "actions" : "visualizations"
        );
        const starterTemplate = path.resolve(templatesFolder, "starter");
        const cwd = path.resolve(".");

        const targetFolderExists = await fse.exists(targetFolder);
        if (!targetFolderExists) {
            await mkdir(targetFolder);
        }

        const files = fse.readdirSync(targetFolder);
        if (files.length > 0) {
            let answer = "";

            while (answer !== "yes" && answer !== "no") {
                answer = await rl.question(
                    "The target folder is not empty. Are you sure you want to continue? [yes/no]\n"
                );
            }

            if (answer === "no") {
                return;
            }
        }

        stdout(`🚧 Creating ${modType} Mods project in ${targetFolder}...`);

        try {
            await fse.copy(starterTemplate, targetFolder);
        } catch (e) {
            throw new Error(
                `Could not copy templates folder to '${targetFolder}'.\nError: ${JSON.stringify(
                    e
                )}`
            );
        }

        const version = await getVersion();
        const packageJsonpath = path.resolve(targetFolder, "package.json");
        const packageJson = await fse.readFile(packageJsonpath, {
            encoding: "utf8",
        });
        fse.writeFile(
            packageJsonpath,
            packageJson.replace("MODS-SDK-VERSION", version),
            { encoding: "utf-8" }
        );

        const modFolderName = path.basename(targetFolder);
        const modId = toModId(modFolderName);
        const modName = modIdToName(modId);
        const manifestPath = path.join(targetFolder, "mod-manifest.json");
        await replaceInFile(manifestPath, (manifestJson) => {
            return manifestJson
                .replace("$MOD-NAME", modName)
                .replace("$MOD-ID", modId);
        });

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

    async function replaceInFile(
        filePath: string,
        replaceFunction: (fileContents: string) => string
    ) {
        const fileContents = await fse.readFile(filePath, "utf-8");
        await fse.writeFile(filePath, replaceFunction(fileContents), "utf-8");
    }
}

export function toModId(str: string) {
    const space = /\s\s*/g;
    const notValid = /[^A-z0-9- ]/g;
    return str.trim().toLowerCase().replace(notValid, "").replace(space, "-");
}

export function modIdToName(str: string) {
    return capitalize(capitalizeBeforeSeparators(str)).replace(/-/g, " ");
}
