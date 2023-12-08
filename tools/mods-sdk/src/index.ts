#! /usr/bin/env node

import { Command } from "commander";
import { createTemplate } from "./new-template";
import { build } from "./build";
import { ModType } from "./utils";
import { addScript } from "./add-script";

const { version } = require("../package.json");

(async () => {
    const program = new Command();
    program
        .name("mods-sdk")
        .description("CLI for building Mods")
        .version(version);

    program
        .command("new")
        .argument(
            "<mod-type>",
            "the type of Mod you want to create, action or visualization",
            (arg) => assertModType(arg)
        )
        .description("Create a new Mods project based on a template")
        .option(
            "-o --out-dir <path>",
            "the folder in which the project should be created",
            "."
        )
        .option("--quiet", "no stdout output", false)
        .action(exec(createTemplate));

    program
        .command("build")
        .description("Builds the Script Mod")
        .option(
            "--scripts <path>",
            "path to the folder containing all scripts",
            "src/scripts"
        )
        .option(
            "--manifest-path <path>",
            "path to the mod-manifest.json file",
            "mod-manifest.json"
        )
        .option(
            "--env-path <path>",
            "path to the environment file",
            "action-mods-env.d.ts"
        )
        .option("--outdir <path>", "path to the output folder", "build")
        .option("--watch", "start a file watcher", false)
        .option("--debug", "build artifacts unminifed with sourcemaps", false)
        .action(exec(build));

    program
        .command("add-script")
        .argument("<name>", "the name of the script")
        .description("add a script to the action mod")
        .option(
            "--scripts <path>",
            "path to the folder containing all scripts",
            "src/scripts"
        )
        .option(
            "--manifest-path <path>",
            "path to the mod-manifest.json file",
            "mod-manifest.json"
        )
        .action(exec(addScript));

    await program.parseAsync();

    function exec(f: (...args: any[]) => Promise<any>) {
        return async function () {
            try {
                await f(...arguments);
            } catch (e) {
                program.error(e as any);
            }
        };
    }

    function assertModType(arg: string) {
        if (arg === "action") {
            return ModType.Action;
        } else if (arg === "visualization") {
            return ModType.Visualization;
        } else {
            program.error(
                `Invalid mod type '${arg}'. Possible values are: action or visualization.`
            );
        }
    }
})();
