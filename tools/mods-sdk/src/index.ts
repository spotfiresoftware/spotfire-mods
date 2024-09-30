#! /usr/bin/env node

import { Command } from "commander";
import { createTemplate, TemplateType } from "./new-template.js";
import { build } from "./build.js";
import { ModType, getVersion } from "./utils.js";
import { addScript } from "./add-script.js";
import { addParameter } from "./add-parameter.js";

declare module "commander" {
    interface Command {
        quiet(): Command;
    }
}
Command.prototype.quiet = function () {
    return this.option("--quiet", "less info in console output", false);
};

(async () => {
    const version = await getVersion();
    const program = new Command();
    program
        .name("mods-sdk")
        .description("CLI for building Mods")
        .version(version);

    program
        .command("new")
        .argument(
            "<mod-type>",
            "what you want to create: action, visualization, or gitignore",
            (arg) => assertTemplateType(arg)
        )
        .description("Create a new Mods project based on a template")
        .option(
            "-o --out-dir <path>",
            "the folder in which the project should be created",
            "."
        )
        .quiet()
        .action(exec(createTemplate));

    program
        .command("build")
        .description("Builds the Mod")
        .option(
            "--src <path>",
            "path to the folder containing the source files",
            "src"
        )
        .option(
            "--manifest-path <path>",
            "path to the mod-manifest.json file",
            "mod-manifest.json"
        )
        .option("--env-path <path>", "path to the environment file", "env.d.ts")
        .option("--outdir <path>", "path to the output folder", "build")
        .option("--watch", "start a file watcher", false)
        .option("--debug", "build artifacts unminifed with sourcemaps", false)
        .option(
            "--esbuild-config",
            "path to a file which default exports an esbuild config",
            "esbuild.config.js"
        )
        .quiet()
        .action(exec(build));

    program
        .command("add-script")
        .argument("<id>", "the id of the script")
        .description("add a script to the action mod")
        .option("--name <name>", "the name of the script")
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
        .quiet()
        .action(exec(addScript));

    program
        .command("add-parameter")
        .argument(
            "<script-id>",
            "the id of the script where the parameter should be added"
        )
        .argument("<name>", "the name of the parameter")
        .argument("<type>", "the type of the parameter")
        .option(
            "--manifest-path <path>",
            "path to the mod-manifest.json file",
            "mod-manifest.json"
        )
        .quiet()
        .action(exec(addParameter));

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

    function assertTemplateType(arg: TemplateType | string) {
        if (arg === "action") {
            return ModType.Action;
        } else if (arg === "visualization") {
            return ModType.Visualization;
        } else if (arg === "gitignore") {
            return "gitignore";
        } else {
            program.error(
                `Invalid template type '${arg}'. Possible values are: action, visualization, or gitignore.`
            );
        }
    }
})();
