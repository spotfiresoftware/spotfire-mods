#!/usr/bin/env node

/*
 * Copyright © 2020. TIBCO Software Inc.
 * This file is subject to the license terms contained
 * in the license file that is distributed with this file.
 */

//@ts-check

/**
 * # Spotfire mods development server
 * The purpose of the development server is to simplify the development of mods.
 * The development server mimics the way the Spotfire runtime works in regards to cross origin requests and content security policies.
 */

const devServer = require("./server");

module.exports.start = startServer;

// Run the server stand-alone as a node script
// @ts-ignore
if (require.main === module) {
    try {
        startServer({
            // root: process.argv[2] || "./src/"
        });
    } catch (err) {
        console.warn(err);
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
