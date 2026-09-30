/*
 * Copyright © 2026. Cloud Software Group, Inc.
 * This file is subject to the license terms contained
 * in the license file that is distributed with this file.
 */

//@ts-check

/**
 * # Origin allow list
 *
 * The development server only shares its content with origins it trusts. Spotfire Analyst serves the
 * mod development dialog from a loopback address, so loopback origins are trusted out of the box. When a
 * mod is developed in the Spotfire web client the origin cannot be known in advance, so unknown origins
 * are instead brought to the developer in an interactive prompt. Accepted origins are either remembered
 * for the running session or persisted in a local configuration file for all future sessions.
 */

const fs = require("fs");
const os = require("os");
const path = require("path");
const readline = require("readline/promises");

const colors = require("colors/safe");

/** Local configuration file holding the origins the developer has accepted for all future sessions. */
const configFilePath = path.join(os.homedir(), ".spotfire", "mods-dev-server.json");

module.exports = {
    configFilePath,
    normalizeOrigin,
    isLoopbackOrigin,
    readAllowedOriginsFromConfig,
    addAllowedOriginToConfig,
    createConsolePrompt,
    createOriginGate
};

/**
 * Bring an origin header value to a canonical form so that it can be compared with configured origins.
 * Returns undefined for values that are not usable as an origin, e.g. the opaque "null" origin of the
 * sandboxed mod iframe.
 *
 * @param {string | undefined} origin
 * @returns {string | undefined}
 */
function normalizeOrigin(origin) {
    if (!origin || origin === "null") {
        return undefined;
    }

    let url;
    try {
        url = new URL(origin.trim());
    } catch (e) {
        return undefined;
    }

    // An origin is scheme, host and port only. Anything else is a sign of a malformed header.
    if (url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
        return undefined;
    }

    return url.origin.toLowerCase();
}

/**
 * Whether the origin points at this machine. Spotfire Analyst hosts the mod development dialog on
 * localhost:8001, but picks a higher port number when several windows are opened, so any port is allowed.
 *
 * @param {string} normalizedOrigin An origin as returned by {@link normalizeOrigin}.
 */
function isLoopbackOrigin(normalizedOrigin) {
    let url;
    try {
        url = new URL(normalizedOrigin);
    } catch (e) {
        return false;
    }

    if (url.protocol !== "http:" && url.protocol !== "https:") {
        return false;
    }

    // URL keeps IPv6 hosts in brackets.
    const hostname = url.hostname.replace(/^\[|\]$/g, "");

    if (hostname === "localhost" || hostname.endsWith(".localhost")) {
        return true;
    }

    // The whole 127.0.0.0/8 range is loopback.
    if (/^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) {
        return true;
    }

    return hostname === "::1" || hostname === "0:0:0:0:0:0:0:1";
}

/**
 * Read the origins the developer has accepted for all future sessions.
 *
 * @param {string} [filePath] Defaults to the local configuration file.
 * @returns {string[]}
 */
function readAllowedOriginsFromConfig(filePath = configFilePath) {
    let content;
    try {
        content = fs.readFileSync(filePath, { encoding: "utf-8" });
    } catch (e) {
        // A missing configuration file simply means that no origins have been accepted yet.
        return [];
    }

    try {
        const config = JSON.parse(content);
        if (!Array.isArray(config.allowedOrigins)) {
            return [];
        }

        return config.allowedOrigins
            .map((/** @type {unknown} */ origin) => (typeof origin === "string" ? normalizeOrigin(origin) : undefined))
            .filter((/** @type {string | undefined} */ origin) => origin != undefined);
    } catch (e) {
        console.log(colors.yellow(`Could not read allowed origins from '${filePath}': ${e}`));
        return [];
    }
}

/**
 * Add an origin to the local configuration file, keeping any other settings in it intact.
 *
 * @param {string} origin An origin as returned by {@link normalizeOrigin}.
 * @param {string} [filePath] Defaults to the local configuration file.
 */
function addAllowedOriginToConfig(origin, filePath = configFilePath) {
    /** @type {{ allowedOrigins?: string[] }} */
    let config = {};

    try {
        const parsed = JSON.parse(fs.readFileSync(filePath, { encoding: "utf-8" }));
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
            config = parsed;
        }
    } catch (e) {
        // Start from an empty configuration if the file is missing or broken.
    }

    const allowedOrigins = Array.isArray(config.allowedOrigins) ? config.allowedOrigins : [];
    if (!allowedOrigins.includes(origin)) {
        allowedOrigins.push(origin);
    }

    config.allowedOrigins = allowedOrigins;

    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(config, null, 4) + "\n", { encoding: "utf-8" });
}

/**
 * Create a prompt asking the developer what to do with an unknown origin on the console.
 *
 * @param {NodeJS.ReadableStream} [input]
 * @param {NodeJS.WritableStream} [output]
 * @returns {(origin: string) => Promise<"session" | "always" | "deny">}
 */
function createConsolePrompt(input = process.stdin, output = process.stdout) {
    return async function promptForOrigin(origin) {
        const rl = readline.createInterface({ input, output });

        // readline takes over Ctrl+C while a question is pending.
        rl.once("SIGINT", () => {
            rl.close();
            process.exit(130);
        });

        // A pending question is never answered once the console is gone, so give up on it instead.
        const abort = new AbortController();
        rl.once("close", () => abort.abort(new Error("The console was closed before the question was answered")));

        try {
            output.write(colors.yellow(`\nA mod is requested from an unknown origin: ${origin}\n`));
            output.write("Only accept origins you recognize, such as the Spotfire web client you are developing in.\n");

            while (true) {
                const answer = (
                    await rl.question("Allow this origin? [s]ession, [a]lways, [d]eny (default): ", {
                        signal: abort.signal
                    })
                )
                    .trim()
                    .toLowerCase();

                if (answer === "s" || answer === "session") {
                    return "session";
                }

                if (answer === "a" || answer === "always") {
                    return "always";
                }

                if (answer === "" || answer === "d" || answer === "deny") {
                    return "deny";
                }
            }
        } finally {
            rl.close();
        }
    };
}

/**
 * Create the gate deciding whether an origin may read from the development server.
 *
 * @param {object} options
 * @param {string} [options.configPath] The local configuration file to read from and write to.
 * @param {((origin: string) => Promise<"session" | "always" | "deny">) | undefined} [options.prompt]
 *  Asks the developer what to do with an unknown origin. Unknown origins are denied when omitted.
 */
function createOriginGate({ configPath = configFilePath, prompt } = {}) {
    // Change this to false to remove automatic trust for loopback origins, making localhost need consent as well. Lets the
    // consent flow be tried out from Spotfire Analyst, which is always served from a loopback address.
    const trustLoopback = false;

    /** Origins allowed for the running session, including the ones allowed for all future sessions. */
    const allowed = new Set(readAllowedOriginsFromConfig(configPath));

    /** Origins the developer has rejected, or that were rejected because there was nobody to ask. */
    const denied = new Set();

    /**
     * Pending questions, keyed by origin, so that concurrent requests from the same origin are only
     * asked about once. Questions are asked one at a time to keep the console readable.
     * @type {Map<string, Promise<boolean>>}
     */
    const pending = new Map();

    /** @type {Promise<unknown>} */
    let promptQueue = Promise.resolve();

    return {
        /** The origins currently allowed to read from the development server. */
        allowed,

        /** Whether the developer will be asked about an unknown origin. */
        interactive: Boolean(prompt),

        /** Whether loopback origins are allowed without asking. */
        trustLoopback,

        /**
         * Where the origin currently stands with the development server. Never asks the developer, so an
         * origin that has not been seen yet is reported as "unknown" rather than being brought up in a prompt.
         *
         * @param {string | undefined} origin The raw origin header value.
         * @returns {"allowed" | "denied" | "unknown"}
         */
        status(origin) {
            const normalizedOrigin = normalizeOrigin(origin);

            // The opaque "null" origin of the sandboxed mod iframe is never given access.
            if (normalizedOrigin == undefined) {
                return "denied";
            }

            if ((trustLoopback && isLoopbackOrigin(normalizedOrigin)) || allowed.has(normalizedOrigin)) {
                return "allowed";
            }

            return denied.has(normalizedOrigin) ? "denied" : "unknown";
        },

        /**
         * Whether the origin is already known to be allowed. Never asks the developer, and is therefore
         * suitable for requests that cannot be held while waiting for an answer.
         *
         * @param {string | undefined} origin The raw origin header value.
         */
        isKnownAllowed(origin) {
            return this.status(origin) === "allowed";
        },

        /**
         * Whether the origin may read from the development server. Unknown origins are brought to the
         * developer in a prompt, and the returned promise is not resolved until the question is answered.
         *
         * @param {string | undefined} origin The raw origin header value.
         * @returns {Promise<boolean>}
         */
        async isAllowed(origin) {
            const normalizedOrigin = normalizeOrigin(origin);

            if (normalizedOrigin == undefined) {
                return false;
            }

            if ((trustLoopback && isLoopbackOrigin(normalizedOrigin)) || allowed.has(normalizedOrigin)) {
                return true;
            }

            if (denied.has(normalizedOrigin)) {
                return false;
            }

            if (!prompt) {
                denied.add(normalizedOrigin);
                console.log(
                    colors.red(`Blocked a request from the unknown origin '${normalizedOrigin}'.`),
                    colors.yellow(
                        `Start the development server from a terminal to be asked about it, or add it to '${configPath}'.`
                    )
                );
                return false;
            }

            let answer = pending.get(normalizedOrigin);
            if (!answer) {
                answer = ask(normalizedOrigin);
                pending.set(normalizedOrigin, answer);
            }

            return answer;
        }
    };

    /**
     * Ask the developer about an origin and remember the answer.
     * @param {string} normalizedOrigin
     */
    async function ask(normalizedOrigin) {
        const question = promptQueue.then(() => prompt(normalizedOrigin));

        // Keep the queue going even if a question fails, e.g. because the console was closed.
        promptQueue = question.catch(() => {});

        /** @type {"session" | "always" | "deny"} */
        let answer;
        try {
            answer = await question;
        } catch (e) {
            console.log(colors.red(`Could not ask about the origin '${normalizedOrigin}': ${e}`));
            answer = "deny";
        } finally {
            pending.delete(normalizedOrigin);
        }

        if (answer === "deny") {
            denied.add(normalizedOrigin);
            console.log(colors.red(`Denied requests from '${normalizedOrigin}'.`));
            return false;
        }

        allowed.add(normalizedOrigin);

        if (answer === "always") {
            try {
                addAllowedOriginToConfig(normalizedOrigin, configPath);
                console.log(colors.green(`Allowed '${normalizedOrigin}' and added it to '${configPath}'.`));
            } catch (e) {
                console.log(
                    colors.yellow(
                        `Allowed '${normalizedOrigin}' for this session only. Could not write '${configPath}': ${e}`
                    )
                );
            }
        } else {
            console.log(colors.green(`Allowed '${normalizedOrigin}' for this session.`));
        }

        return true;
    }
}
