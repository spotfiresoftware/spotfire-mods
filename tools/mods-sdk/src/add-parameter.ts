import { existsSync } from "fs";
import path from "path";
import {
    deepCopy,
    Manifest,
    mkStdout,
    parameterTypes,
    parseSpotfireType,
    QuietOtions,
    readApiVersion,
    readManifest,
    writeManifest,
} from "./utils.js";

interface AddParameterOptions {
    manifestPath: string;
}

export function addParameterToManifest({
    manifest: _manifest,
    scriptId,
    name,
    type,
    ...quiet
}: {
    manifest: Manifest;
    scriptId: string;
    name: string;
    type: string;
} & QuietOtions) {
    const stdout = mkStdout(quiet);

    const manifest = deepCopy(_manifest);
    const spotfireType = parseSpotfireType(type);
    if (!spotfireType) {
        throw new Error(
            `Invalid type '${type}', available types are: ${parameterTypes.join(
                ", "
            )}`
        );
    }

    if (spotfireType === "DataColumn") {
        const apiVersion = readApiVersion(manifest);
        if (
            apiVersion.status === "success" &&
            !apiVersion.result.supportsFeature("DataColumnParameter")
        ) {
            throw new Error(
                `Parameter with type 'DataColumn' requires apiVerison above 2.1`
            );
        } else if (apiVersion.status === "error") {
            stdout(
                `Failed to read apiVerison, cannot verify if parameter type 'DataColumn' is allowed.`
            );
            stdout(`Error: ${apiVersion.error}`);
        }
    }

    const script = manifest.scripts?.find((s) => s.id === scriptId);
    if (!script) {
        const foundScripts = (manifest.scripts ?? [])
            .map((s) => s.id)
            .join(", ");
        throw new Error(
            `No script exists with id '${scriptId}', found: ${foundScripts}`
        );
    }

    if (!script.parameters) {
        script.parameters = [];
    }

    script.parameters.push({ name: name, type: spotfireType });

    return manifest;
}

export async function addParameter(
    scriptId: string,
    name: string,
    type: string,
    { manifestPath, ...quiet }: AddParameterOptions & QuietOtions
) {
    const absManifestPath = path.resolve(manifestPath);

    if (!existsSync(absManifestPath)) {
        throw new Error(`Cannot find ${absManifestPath}.`);
    }

    const manifest = await readManifest(absManifestPath);
    const manifestWithParameter = addParameterToManifest({
        manifest,
        scriptId,
        name,
        type,
        ...quiet,
    });

    await writeManifest(absManifestPath, manifestWithParameter, quiet.quiet);
}
