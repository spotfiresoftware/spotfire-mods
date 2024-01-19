import colors from "colors/safe";
import fse from "fs-extra";
import { mkdir } from "fs/promises";
import path from "path";
import readline from "readline/promises";
import { ModType, capitalize, capitalizeBeforeSeparators } from "./utils";

const { version } = require("../package.json");

interface CreateTemplateOptions {
    outDir: string;
    quiet: boolean;
}

export async function createTemplate(
    modType: ModType,
    { outDir, quiet }: CreateTemplateOptions
) {
    if (modType === ModType.Visualization) {
        throw new Error("No templates exists for visualization mods.");
    }

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    try {
        const targetFolder = path.resolve(outDir);
        const templatesFolder = path.resolve(__dirname, "..", "templates");
        const simpleTemplate = path.resolve(templatesFolder, "simple");
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

        stdout(`🚧 Creating Action Mods project in ${targetFolder}...`);

        try {
            await fse.copy(simpleTemplate, targetFolder);
        } catch (e) {
            throw new Error(
                `Could not copy templates folder to '${targetFolder}'.\nError: ${JSON.stringify(
                    e
                )}`
            );
        }

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
                .replace("$ACTION-MOD-NAME", modName)
                .replace("$ACTION-MOD-ID", modId);
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

    function stdout(str: string) {
        if (!quiet) {
            console.log(str);
        }
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
