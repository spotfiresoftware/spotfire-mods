import { existsSync } from "fs";
import path from "path";
import {
    parameterTypes,
    parseSpotfireType,
    readManifest,
    writeManifest,
} from "./utils.js";

interface AddParameterOptions {
    manifestPath: string;
    quiet: boolean;
}

export async function addParameter(
    scriptId: string,
    name: string,
    type: string,
    { manifestPath, quiet }: AddParameterOptions
) {
    const absManifestPath = path.resolve(manifestPath);

    if (!existsSync(absManifestPath)) {
        throw new Error(`Cannot find ${absManifestPath}.`);
    }

    const spotfireType = parseSpotfireType(type);
    if (!spotfireType) {
        throw new Error(
            `Invalid type '${type}', available types are: ${parameterTypes.join(
                ", "
            )}`
        );
    }

    const manifest = await readManifest(absManifestPath);
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

    await writeManifest(absManifestPath, manifest, quiet);
}
