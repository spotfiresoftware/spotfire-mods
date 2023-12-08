import { existsSync } from "fs";
import { mkdir, readFile, stat, writeFile } from "fs/promises";
import path from "path";
import {
    Manifest,
    formatIfPossible,
    toAlphaNumWithSeparators,
    toTypeName,
} from "./utils";

interface AddScriptOptions {
    manifestPath: string;
    scripts: string;
}

export async function addScript(
    name: string,
    { manifestPath: _manifestPath, scripts: _scripts }: AddScriptOptions
) {
    const manifestPath = path.resolve(_manifestPath);
    const scriptsFolder = path.resolve(_scripts);

    if (!existsSync(manifestPath)) {
        throw new Error(`Cannot find ${manifestPath}.`);
    }

    if (!existsSync(scriptsFolder)) {
        await mkdir(scriptsFolder);
    } else {
        const scriptsStat = await stat(scriptsFolder);
        if (!scriptsStat.isDirectory()) {
            throw new Error(`${scriptsFolder} is not a directory.`);
        }
    }

    const manifestJson = await readFile(manifestPath, { encoding: "utf8" });
    let manifest: Manifest = JSON.parse(manifestJson);

    const file = path.basename(name);
    const entryPoint = toAlphaNumWithSeparators(file);

    if (
        (manifest.scripts ?? []).some((s) => s.file === file || s.name === name)
    ) {
        throw new Error(
            `There is already a script with the name '${name}' in the manifest.`
        );
    }

    manifest.scripts = [
        ...(manifest.scripts ?? []),
        {
            name: name,
            entryPoint: entryPoint,
            file: `build/${file}.js`,
        },
    ];

    const jsonOutput = await formatIfPossible(
        manifestPath,
        JSON.stringify(manifest),
        false
    );
    await writeFile(manifestPath, jsonOutput, {
        encoding: "utf-8",
    });

    const params = toTypeName(file) + "Parameters";
    const scriptSrc = `
export function ${entryPoint}({ document, application }: ${params}) {
    // Start writing here!
}

RegisterEntryPoint("${entryPoint}", ${entryPoint});
`;

    const filePath = path.join(scriptsFolder, `${file}.ts`);
    await writeFile(filePath, scriptSrc.trimStart(), { encoding: "utf8" });
    console.log(`A script file has been created at: ${filePath}`);
}
