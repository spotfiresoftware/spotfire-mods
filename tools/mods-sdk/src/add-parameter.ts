import { existsSync } from "fs";
import path from "path";
import {
    deepCopy,
    features,
    formatVersion,
    Manifest,
    ManifestParameter,
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
    optional: boolean;
}

export function addParameterToManifest({
    manifest: _manifest,
    scriptId,
    name,
    type,
    optional,
    ...quiet
}: {
    manifest: Manifest;
    scriptId: string;
    name: string;
    type: string;
    optional: boolean;
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

    if (spotfireType === "DataColumn" || optional) {
        const apiVersion = readApiVersion(manifest);
        if (apiVersion.status !== "success") {
            stdout(
                `Failed to read apiVersion, cannot verify if parameter type 'DataColumn' is allowed.`
            );
            stdout(`Error: ${apiVersion.error}`);
        } else {
            const errs: string[] = [];
            if (
                spotfireType === "DataColumn" &&
                !apiVersion.result.supportsFeature("DataColumnParameter")
            ) {
                errs.push(
                    `Parameter with type 'DataColumn' requires apiVersion at least ${formatVersion(
                        features.DataColumnParameter
                    )}.`
                );
            }

            if (
                optional &&
                !apiVersion.result.supportsFeature("OptionalParameter")
            ) {
                errs.push(
                    `Optional parameters require apiVersion at least ${formatVersion(
                        features.OptionalParameter
                    )}.`
                );
            }

            if (errs.length > 0) {
                throw new Error(errs.join("\n"));
            }
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

    const parameter: ManifestParameter = { name: name, type: spotfireType };
    if (optional) {
        parameter.optional = true;
    }

    script.parameters.push(parameter);

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
    if (manifest.type !== "action") {
        throw new Error(
            `Mods of type ${
                manifest.type ?? "visualization"
            } do not support script parameters.`
        );
    }

    const manifestWithParameter = addParameterToManifest({
        manifest,
        scriptId,
        name,
        type,
        ...quiet,
    });

    await writeManifest(absManifestPath, manifestWithParameter, quiet.quiet);
}
