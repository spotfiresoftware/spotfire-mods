import * as path from "path";
import * as fs from "fs";
import globPackage from "glob";
import { promisify } from "util";
import { run, getResults } from "./command-line-utils";

let glob = promisify(globPackage);

// Do not try to update packages including any of the following strings.
const ignoredPackages = ["d3", "@tibco"];

// Ignore projects in any of the following folders.
const ignoredFolders = ["tools", "prototypes", "catalog"];

const versionCache: { [packageName: string]: string } = {};

main();

async function main() {
    let projects = await findModsProjects();
    console.log(`Found ${projects.length} projects.`);
    await updateProjects(projects);
    await installAndBuildProjects(projects);
}

/**
 * Find all mod projects in the repository.
 * @returns A list of matching Mod projects.
 */
async function findModsProjects(): Promise<ModProject[]> {
    /** @type string[] */
    let matches = await glob(
        `./../../!(${ignoredFolders.join("|")})/*/package.json`,
        {
            ignore: "*node_modules*"
        }
    );

    matches = matches.filter(m => !m.includes("node_modules"));

    let projects = matches
        .map(m => {
            let jsonPackage: any = JSON.parse(
                fs.readFileSync(m, { encoding: "utf8" })
            );

            return {
                name: jsonPackage.name,
                package: jsonPackage,
                scripts: jsonPackage.scripts,
                isBuilt: jsonPackage.scripts && jsonPackage.scripts.build,
                dir: path.dirname(m)
            };
        })
        .filter(p => p.scripts);
    return projects;
}

/**
 * Get the latest stable version of an npm package.
 * @param npmPackage Name of npm package
 * @returns The latest stable version
 */
async function latestVersion(npmPackage: string) {
    if (versionCache[npmPackage]) {
        return versionCache[npmPackage];
    }

    let versions = await getResults(`npm show ${npmPackage}@* version --json`);
    let latest = versions[versions.length - 1];
    versionCache[npmPackage] = latest;
    return latest;
}

/**
 * Update all dependencies in package.json for all provided projects,
 * @param projects The projects to update
 */
async function updateProjects(projects: ModProject[]) {
    for (const project of projects) {
        console.log("*********************************");
        console.log(project.name);
        await updateDependencies(project, false);
        console.log("**");
        await updateDependencies(project, true);
    }
}

/**
 *
 * @param project The mod project to update
 * @param updateDevDependencies Whether or not to update dependencies or dev dependencies.
 */
async function updateDependencies(
    project: ModProject,
    updateDevDependencies: boolean
) {
    const dependencies: { [dependency: string]: string } =
        (updateDevDependencies
            ? project.package.devDependencies
            : project.package.dependences) || {};

    for (const packageName of Object.keys(dependencies)) {
        const latest = await latestVersion(packageName);
        const current = dependencies[packageName];

        if (
            latest != current &&
            !ignoredPackages.find(pattern => packageName.includes(pattern))
        ) {
            console.log(`Updating ${packageName} from ${current} to ${latest}`);
            await run(
                `npm install --save-exact --force ${
                    updateDevDependencies ? "--save-dev" : "--save"
                } ${packageName}@${latest}`,
                project.dir
            );
        }
    }
}

/**
 * Install and build all listed projects.
 * @param projects The list of mod projects
 */
async function installAndBuildProjects(projects: ModProject[]) {
    for (const project of projects) {
        console.log("installing", project.dir);

        // NPM CI will strictly install the package as its package-lock file states. Running npm install can affect the package-lock by updating packages with variable semver range.
        await run("npm ci", project.dir);
        // await run("npm install", project.dir);

        // await run("npm install @tibco/spotfire-mods-dev-server --save-dev");
        if (project.isBuilt) {
            await run("npm run build", project.dir);
        }
    }
}

interface ModProject {
    name: string;
    package: any;
    scripts?: string[];
    isBuilt: boolean;
    dir: string;
}
