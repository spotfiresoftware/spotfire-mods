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
 *
 * The configuration file is created empty when it is missing, and watched for changes, so that an
 * origin can be allowed, or taken away again, while the server is running.
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
    createConfigIfMissing,
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
        const isMissingFile =
            e instanceof Error &&
            "code" in e &&
            e.code === "ENOENT";

        if (!isMissingFile) {
            console.log(colors.yellow(`Could not read allowed origins from '${filePath}': ${e}`));
        }

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
 * The origins already in the file are brought to their canonical form as they are written back, so that
 * a hand written entry does not end up alongside the same origin in a different spelling. Entries that
 * are not origins at all are left untouched rather than silently thrown away.
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

    const existing = Array.isArray(config.allowedOrigins) ? config.allowedOrigins : [];

    /** @type {string[]} */
    const allowedOrigins = [];
    for (const entry of [...existing, origin]) {
        const canonical = typeof entry === "string" ? normalizeOrigin(entry) ?? entry : entry;
        if (!allowedOrigins.includes(canonical)) {
            allowedOrigins.push(canonical);
        }
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
 * Write an empty configuration file when there is none, so that a developer told to allow an origin
 * finds a file of the right shape to add it to instead of having to know the format. An existing file
 * is left alone.
 *
 * @param {string} [filePath] Defaults to the local configuration file.
 * @returns {boolean} Whether a file was written.
 */
function createConfigIfMissing(filePath = configFilePath) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });

    try {
        // Exclusive, so that a file written in the meantime is not overwritten.
        fs.writeFileSync(filePath, JSON.stringify({ allowedOrigins: [] }, null, 4) + "\n", {
            encoding: "utf-8",
            flag: "wx"
        });

        return true;
    } catch (e) {
        if (e instanceof Error && "code" in e && e.code === "EEXIST") {
            return false;
        }

        throw e;
    }
}

/**
 * Quote origins for a console message, as `'a'`, or `'a', 'b'` when there are several.
 * @param {string[]} origins
 */
function quoteAll(origins) {
    return origins.map((origin) => `'${origin}'`).join(", ");
}

/**
 * Create the gate deciding whether an origin may read from the development server.
 *
 * @param {object} options
 * @param {string} [options.configPath] The local configuration file to read from and write to.
 * @param {((origin: string) => Promise<"session" | "always" | "deny">) | undefined} [options.prompt]
 *  Asks the developer what to do with an unknown origin. Unknown origins are denied when omitted.
 * @param {number} [options.pollInterval] How often, in milliseconds, the configuration file is looked
 *  at for changes.
 */
function createOriginGate({ configPath = configFilePath, prompt, pollInterval = 1000 } = {}) {
    // Change this to false to remove automatic trust for loopback origins, making localhost need consent as well. Lets the
    // consent flow be tried out from Spotfire Analyst, which is always served from a loopback address.
    const trustLoopback = true;

    try {
        if (createConfigIfMissing(configPath)) {
            console.log(`Created '${configPath}' to list the origins you want allowed up front.`);
        }
    } catch (e) {
        // Serving without the file beats refusing to start over a home directory that cannot be written.
        console.log(colors.yellow(`Could not create '${configPath}': ${e}`));
    }

    /** Origins allowed by the configuration file. Replaced whenever the file changes on disk. */
    let configured = new Set(readAllowedOriginsFromConfig(configPath));

    /** Origins allowed for the running session only, never written to the configuration file. */
    const sessionAllowed = new Set();

    /** Origins the developer has turned down. Cleared when the server is restarted. */
    const rejected = new Set();

    /**
     * Origins already turned away because there was nobody to ask. Kept apart from the rejected ones so
     * that a developer who never saw the question is not reported as having said no, and only used to
     * keep the same origin from logging on every request.
     */
    const unanswerable = new Set();

    /**
     * Pending questions, keyed by origin, so that concurrent requests from the same origin are only
     * asked about once. Questions are asked one at a time to keep the console readable.
     * @type {Map<string, Promise<boolean>>}
     */
    const pending = new Map();

    /** @type {Promise<unknown>} */
    let promptQueue = Promise.resolve();

    // Edits to the configuration file take effect while the server is running, so that the developer can
    // allow an origin, or take one away again, without restarting.
    //
    // Watched by polling its status rather than by hooking into the file system, which is what makes
    // this hold up in the cases that matter: the file is noticed whether it is written in place,
    // replaced wholesale the way an editor saves it, deleted, or created only later on. An operating
    // system level watch instead faults with EPERM when the directory holding the file is removed, and
    // takes the server down with it. Left unpersistent so that watching never keeps the process alive.
    fs.watchFile(configPath, { interval: pollInterval, persistent: false }, reloadConfig);

    return {
        /** The origins currently allowed to read from the development server. */
        get allowed() {
            return new Set([...configured, ...sessionAllowed]);
        },

        /** Whether loopback origins are allowed without asking. */
        trustLoopback,

        /** Stop watching the configuration file for changes. */
        close() {
            fs.unwatchFile(configPath, reloadConfig);
        },

        /**
         * Where the origin currently stands with the development server. Never asks the developer, so an
         * origin that has not been seen yet is reported as the question it would raise rather than
         * raising it.
         *
         * - `allowed` the origin may read from the server.
         * - `rejected` the developer has turned the origin down.
         * - `willPrompt` the origin is unknown, and the developer will be asked about it.
         * - `cannotPrompt` the origin is unknown, but there is no console to ask the developer on.
         *
         * @param {string | undefined} origin The raw origin header value.
         * @returns {"allowed" | "rejected" | "willPrompt" | "cannotPrompt"}
         */
        status(origin) {
            const normalizedOrigin = normalizeOrigin(origin);

            // The opaque "null" origin of the sandboxed mod iframe is never given access.
            if (normalizedOrigin == undefined) {
                return "rejected";
            }

            if (isAllowedNow(normalizedOrigin)) {
                return "allowed";
            }

            if (rejected.has(normalizedOrigin)) {
                return "rejected";
            }

            // An origin that could not be asked about is not asked about again.
            return prompt && !unanswerable.has(normalizedOrigin) ? "willPrompt" : "cannotPrompt";
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

            if (isAllowedNow(normalizedOrigin)) {
                return true;
            }

            if (rejected.has(normalizedOrigin) || unanswerable.has(normalizedOrigin)) {
                return false;
            }

            if (!prompt) {
                // Turned away, but not rejected by the developer, who never got to see the question.
                unanswerable.add(normalizedOrigin);
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
     * Whether the origin may read right now, be it by the configuration file or for this session only.
     * @param {string} normalizedOrigin An origin as returned by {@link normalizeOrigin}.
     */
    function isAllowedNow(normalizedOrigin) {
        if (trustLoopback && isLoopbackOrigin(normalizedOrigin)) {
            return true;
        }

        return configured.has(normalizedOrigin) || sessionAllowed.has(normalizedOrigin);
    }

    /**
     * Read the configuration file again after it has changed on disk. Origins the gate itself has just
     * written are already accounted for, so only what the developer did is reported.
     */
    function reloadConfig() {
        const previous = configured;
        configured = new Set(readAllowedOriginsFromConfig(configPath));

        const added = [...configured].filter((origin) => !previous.has(origin));
        const removed = [...previous].filter((origin) => !configured.has(origin));

        // An origin the file now allows starts afresh, so that taking it away again raises the question
        // anew rather than reusing an answer given before the edit.
        for (const origin of added) {
            rejected.delete(origin);
            unanswerable.delete(origin);
        }

        if (added.length > 0) {
            console.log(colors.green(`Now allowing ${quoteAll(added)}, added to '${configPath}'.`));
        }

        if (removed.length > 0) {
            console.log(colors.yellow(`No longer allowing ${quoteAll(removed)}, removed from '${configPath}'.`));
        }
    }

    /**
     * Ask the developer about an origin and remember the answer.
     * @param {string} normalizedOrigin
     */
    async function ask(normalizedOrigin) {
        const question = promptQueue.then(() => prompt(normalizedOrigin));

        // Keep the queue going even if a question fails, e.g. because the console was closed.
        promptQueue = question.catch(() => {});

        /** @type {"session" | "always" | "deny" | undefined} */
        let answer;
        try {
            answer = await question;
        } catch (e) {
            console.log(colors.red(`Could not ask about the origin '${normalizedOrigin}': ${e}`));
        } finally {
            pending.delete(normalizedOrigin);
        }

        if (answer == undefined) {
            // The question never reached the developer, so the origin has not been turned down by them.
            unanswerable.add(normalizedOrigin);
            return false;
        }

        if (answer === "deny") {
            rejected.add(normalizedOrigin);
            console.log(colors.red(`Denied requests from '${normalizedOrigin}'.`));
            return false;
        }

        if (answer === "always") {
            try {
                addAllowedOriginToConfig(normalizedOrigin, configPath);

                // Taken on board before the watcher reports the write back, so that the gate's own
                // change is not announced a second time as if the developer had made it.
                configured.add(normalizedOrigin);
                console.log(colors.green(`Allowed '${normalizedOrigin}' and added it to '${configPath}'.`));
            } catch (e) {
                sessionAllowed.add(normalizedOrigin);
                console.log(
                    colors.yellow(
                        `Allowed '${normalizedOrigin}' for this session only. Could not write '${configPath}': ${e}`
                    )
                );
            }
        } else {
            sessionAllowed.add(normalizedOrigin);
            console.log(colors.green(`Allowed '${normalizedOrigin}' for this session.`));
        }

        return true;
    }
}
