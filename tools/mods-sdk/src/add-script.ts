import { existsSync } from "fs";
import fse from "fs-extra";
import { mkdir, stat, writeFile } from "fs/promises";
import path from "path";
import readline from "readline/promises";
import {
    QuietOtions,
    mkStdout,
    readManifest,
    toAlphaNumWithSeparators,
    toTypeName,
    writeManifest,
} from "./utils.js";

interface AddScriptOptions {
    manifestPath: string;
    scripts: string;
    name?: string;
}

export async function addScript(
    id: string,
    {
        manifestPath: _manifestPath,
        scripts: _scripts,
        name,
        ...quiet
    }: AddScriptOptions & QuietOtions
) {
    const stdout = mkStdout(quiet);
    const manifestPath = path.resolve(_manifestPath);
    const scriptsFolder = path.resolve(_scripts);

    if (!existsSync(manifestPath)) {
        throw new Error(`Cannot find ${manifestPath}.`);
    }

    if (!id.match(/^[a-zA-Z0-9]+[a-zA-Z0-9-._]*(?<=[a-zA-Z0-9])$/g)) {
        throw new Error(`Invalid script id '${id}'.`);
    }

    if (!existsSync(scriptsFolder)) {
        await mkdir(scriptsFolder);
    } else {
        const scriptsStat = await stat(scriptsFolder);
        if (!scriptsStat.isDirectory()) {
            throw new Error(`${scriptsFolder} is not a directory.`);
        }
    }

    const manifest = await readManifest(manifestPath);
    const file = path.basename(id);
    const entryPoint = toAlphaNumWithSeparators(file);

    if (manifest.scripts?.find((s) => s.id === id)) {
        throw new Error(`The mod already contains a script with id '${id}'.`);
    }

    const filePath = path.join(scriptsFolder, `${file}.ts`);

    if (fse.existsSync(filePath)) {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
        });
        let answer = "";

        while (answer !== "yes" && answer !== "no") {
            answer = await rl.question(
                `The mod already contains a script file at '${filePath}'.\nDo you want to keep this file? [yes/no]\n`
            );
        }

        if (answer === "yes") {
            let i = 2;
            let newName: string | undefined;
            while (!newName || fse.existsSync(newName)) {
                newName = `${filePath.substring(
                    0,
                    filePath.length - 3
                )}(${i++}).ts`;
            }

            fse.renameSync(filePath, newName);
        }

        rl.close();
    }

    manifest.scripts = [
        ...(manifest.scripts ?? []),
        {
            id: id,
            name: name ?? id,
            entryPoint: entryPoint,
            file: `build/${file}.js`,
        },
    ];

    await writeManifest(manifestPath, manifest, false);

    const params = toTypeName(file) + "Parameters";
    const scriptSrc = `
export function ${entryPoint}({ document, application }: ${params}) {
    // Start writing here!
}

RegisterEntryPoint(${entryPoint});
`;

    await writeFile(filePath, scriptSrc.trimStart(), { encoding: "utf8" });
    stdout(`A script file has been created at: ${filePath}`);
}
