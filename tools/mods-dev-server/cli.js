#!/usr/bin/env node

/*
 * Copyright © 2020. TIBCO Software Inc.
 * This file is subject to the license terms contained
 * in the license file that is distributed with this file.
 */

//@ts-check

/**
 * # Spotfire mods development server CLI
 * The purpose of the development server is to simplify the development of mods.
 * The development server mimics the way the Spotfire runtime works in regards to cross origin requests and content security policies.
 */

const devServer = require("./server");
// @ts-ignore
const packageJson = require("./package.json");

const colors = require("colors/safe");
const yargs = require("yargs/yargs");
const { hideBin } = require("yargs/helpers");

/** @type {Partial<import("./server").ServerSettings>} */
// @ts-ignore

module.exports.start = startServer;

// Run the server stand-alone as a node script
// @ts-ignore
if (require.main === module) {
    try {
        const defaultSettings = devServer.settings;

        // @ts-ignore
        const argv = yargs(hideBin(process.argv))
            .command(
                "$0",
                "mods-dev-server <root folder (defaults to '.')> [--options]",
                () => {},
                (argv) => {
                    startServer({
                        // @ts-ignore
                        port: argv.port,
                        // @ts-ignore
                        root: argv._[0] || defaultSettings.root,
                        // @ts-ignore
                        path: argv.path,
                        // @ts-ignore
                        open: argv.open
                    });
                }
            )
            .option("port", {
                alias: "p",
                describe: "The server port.",
                number: true,
                default: defaultSettings.port
            })
            .option("path", {
                describe: "The server url path.",
                string: true,
                default: defaultSettings.path
            })
            .option("open", {
                alias: "o",
                describe: "Whether or not to open a browser on launch.",
                boolean: true,
                default: defaultSettings.open
            })
            .boolean(["open"])
            .version(packageJson.version)
            .help().argv;
    } catch (err) {
        console.warn(colors.red(err));
        process.exit(1);
    }
}

/**
 * Start a server with CSP policies mimicking the Spotfire Mod environment.
 * @param {Partial<import("./server").ServerSettings>} partialConfig
 */
function startServer(partialConfig = {}) {
    return devServer.start(partialConfig);
}
