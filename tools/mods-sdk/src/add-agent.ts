import { existsSync } from "fs";
import { mkdir, stat, writeFile } from "fs/promises";
import path from "path";
import {
    AgentType,
    Manifest,
    QuietOtions,
    mkStdout,
    readManifest,
    toAlphaNumWithSeparators,
    writeManifest,
} from "./utils.js";

interface AddInsightOptions {
    manifestPath: string;
    scripts: string;
    name?: string;
    type: AgentType;
}

const agentContextType: Record<AgentType, string> = {
    marking: "MarkingContext",
    visual: "VisualContext",
};

export function createAgentSkeleton({
    entryPoint,
    type,
}: {
    entryPoint: string;
    type: AgentType;
}) {
    const contextType = agentContextType[type];

    return `
export function ${entryPoint}({ context, resources, utils }: ${contextType}) {
    // Start writing here!
}

RegisterEntryPoint(${entryPoint});
`;
}

export async function addAgent(
    id: string,
    {
        manifestPath: _manifestPath,
        scripts: _scripts,
        name,
        type,
        ...quiet
    }: AddInsightOptions & QuietOtions
) {
    const stdout = mkStdout(quiet);
    const manifestPath = path.resolve(_manifestPath);
    const scriptsFolder = path.resolve(_scripts);

    if (!existsSync(manifestPath)) {
        throw new Error(`Cannot find ${manifestPath}.`);
    }

    if (!id.match(/^[a-zA-Z0-9]+[a-zA-Z0-9-._]*(?<=[a-zA-Z0-9])$/g)) {
        throw new Error(`Invalid insight id '${id}'.`);
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
    const entryPoint = toAlphaNumWithSeparators(id);
    const filePath = path.join(scriptsFolder, `${id}.ts`);

    if (manifest.type !== "action") {
        throw new Error(
            `Mods of type ${manifest.type ?? "visualization"
            } do not support insights.`
        );
    }

    if (manifest.agents?.find((i) => i.id === id)) {
        throw new Error(
            `The mod already contains an insight with id '${id}'.`
        );
    }

    if (existsSync(filePath)) {
        throw new Error(
            `The mod already contains a script file at '${filePath}'.`
        );
    }

    manifest.agents = [
        ...(manifest.agents ?? []),
        {
            id: id,
            name: name ?? id,
            entryPoint: entryPoint,
            file: `build/${id}.js`,
            type: type,
        },
    ];

    await writeManifest(manifestPath, manifest, false);

    const insightSrc = createAgentSkeleton({ entryPoint, type });
    await writeFile(filePath, insightSrc.trimStart(), { encoding: "utf8" });
    stdout(`An agent file has been created at: ${filePath}`);
}
