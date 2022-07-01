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

require("yargs")
    .scriptName("mods-updater")
    .usage("$0 <cmd> [args]")
    .command(
        "test <mods folder>",
        "Test to install and build all examples",
        (yargs: any) => {
            yargs.positional("mods folder", {
                describe: "Root folder of the spotfire mods GitHub repo.",
                type: "string"
            });
        },
        function (argv: { [key: string]: any }) {
            test(argv.modsfolder);
        }
    )
    .command(
        "update <mods folder> [major]",
        "Update all mod examples to their latest version",
        (yargs: any) => {
            yargs.positional("mods folder", {
                describe: "Root folder of the spotfire mods GitHub repo.",
                type: "string"
            });

            yargs.positional("major", {
                type: "boolean",
                default: false,
                describe: "Update to latest major version"
            });
        },
        function (argv: { [key: string]: any }) {
            updater(argv.modsfolder, argv.major);
        }
    )
    .help().argv;

async function test(rootFolder: string) {
    let projects = await findModsProjects(rootFolder);
    console.log(`Found ${projects.length} projects.`);
    await installAndBuildProjects(projects);
}

async function updater(rootFolder: string, major: boolean) {
    let projects = await findModsProjects(rootFolder);
    console.log(`Found ${projects.length} projects to test.`);
    await updateProjects(projects, major);
}

/**
 * Find all mod projects in the repository.
 * @returns A list of matching Mod projects.
 */
async function findModsProjects(rootFolder: string): Promise<ModProject[]> {
    /** @type string[] */
    let matches = await glob(
        path.resolve(rootFolder) +
            `/!(${ignoredFolders.join("|")})/*/package.json`,
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
 * Get the latest stable minor version of an npm package.
 * @param npmPackage Name of npm package
 * @param currentMajorVersion The current major version
 * @returns The latest minor version
 */
async function latestMinorVersion(
    npmPackage: string,
    currentMajorVersion: string
) {
    if (versionCache[npmPackage + currentMajorVersion]) {
        return versionCache[npmPackage + currentMajorVersion];
    }

    let versions = await getResults(
        `npm show ${npmPackage}@${currentMajorVersion} version --json`
    );
    let latest = versions[versions.length - 1];
    versionCache[npmPackage + currentMajorVersion] = latest;
    return latest;
}

/**
 * Update all dependencies in package.json for all provided projects,
 * @param projects The projects to update
 */
async function updateProjects(projects: ModProject[], major: boolean) {
    for (const project of projects) {
        console.log("*********************************");
        console.log(project.name);
        await updateDependencies(project, major, false);
        console.log("**");
        await updateDependencies(project, major, true);
    }
}

/**
 *
 * @param project The mod project to update
 * @param major Whether or not to update major versions.
 * @param updateDevDependencies Whether or not to update dependencies or dev dependencies.
 */
async function updateDependencies(
    project: ModProject,
    major: boolean,
    updateDevDependencies: boolean
) {
    const dependencies: { [dependency: string]: string } =
        (updateDevDependencies
            ? project.package.devDependencies
            : project.package.dependences) || {};

    for (const packageName of Object.keys(dependencies)) {
        const current = dependencies[packageName];

        let latest: string;
        if (major) {
            latest = await latestVersion(packageName);
        } else {
            latest = await latestMinorVersion(
                packageName,
                current.slice(0, current.indexOf("."))
            );
        }

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
