//@ts-check

const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { PassThrough, Writable } = require("stream");
const test = require("supertest");

const origins = require("../origins");
const server = require("../server");

/**
 * A configuration file allowing nothing, so that the tests do not pick up the developer's own origins.
 * Kept out of the served test files, since a gate writes an empty configuration file where it finds none.
 */
const noConfigDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "mods-dev-server-no-config-"));
const noConfig = path.join(noConfigDirectory, "mods-dev-server.json");

after(function () {
    fs.rmSync(noConfigDirectory, { recursive: true, force: true });
});

/** Gates created by the tests, so that no watcher outlives the test that started it. @type {any[]} */
const gates = [];

/** Directories holding the configuration files written by the tests. @type {string[]} */
const temporaryDirectories = [];

afterEach(async function () {
    // Watchers go first, so that no directory is pulled out from under one.
    let gate;
    while ((gate = gates.pop()) != undefined) {
        await gate.close();
    }

    let directory;
    while ((directory = temporaryDirectories.pop()) != undefined) {
        fs.rmSync(directory, { recursive: true, force: true });
    }
});

/**
 * Create an origin gate that stops watching when the test ends.
 * @param {Parameters<typeof origins.createOriginGate>[0]} [options]
 */
function createGate(options) {
    const gate = origins.createOriginGate({ pollInterval, ...options });
    gates.push(gate);
    return gate;
}

function temporaryDirectory() {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "mods-dev-server-test-"));
    temporaryDirectories.push(directory);
    return directory;
}

function temporaryConfigPath() {
    return path.join(temporaryDirectory(), "mods-dev-server.json");
}

/** How often the gates under test look at their configuration file. Kept brief to keep the suite brisk. */
const pollInterval = 50;

/**
 * Change the configuration file and give the gate watching it time to notice.
 *
 * @param {string} configPath
 * @param {object} config
 */
async function writeAndSettle(configPath, config) {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 4) + "\n", { encoding: "utf-8" });
    await new Promise((resolve) => setTimeout(resolve, pollInterval * 6));
}

/**
 * Read back a local configuration file written by the tests.
 * @param {string} configPath
 */
function readConfig(configPath) {
    return JSON.parse(fs.readFileSync(configPath, { encoding: "utf-8" }));
}

/**
 * A local configuration file allowing the given origins.
 * @param {...string} allowedOrigins
 */
function configAllowing(...allowedOrigins) {
    const configPath = temporaryConfigPath();
    fs.writeFileSync(configPath, JSON.stringify({ allowedOrigins }));
    return configPath;
}

describe("Origin allow list", function () {
    describe("normalizeOrigin", function () {
        it("should bring origins to a canonical form", function () {
            assert.strictEqual(origins.normalizeOrigin("HTTP://LocalHost:8001"), "http://localhost:8001");
            assert.strictEqual(
                origins.normalizeOrigin("  https://spotfire.example.com/  "),
                "https://spotfire.example.com"
            );
        });

        it("should reject values that are not plain origins", function () {
            assert.strictEqual(origins.normalizeOrigin(undefined), undefined);
            assert.strictEqual(origins.normalizeOrigin(""), undefined);

            // The sandboxed mod iframe has the opaque "null" origin.
            assert.strictEqual(origins.normalizeOrigin("null"), undefined);

            assert.strictEqual(origins.normalizeOrigin("not an origin"), undefined);
            assert.strictEqual(origins.normalizeOrigin("https://example.com/path"), undefined);
            assert.strictEqual(origins.normalizeOrigin("https://user:pw@example.com"), undefined);
        });
    });

    describe("isLoopbackOrigin", function () {
        it("should allow localhost on any port", function () {
            // Spotfire Analyst uses 8001, but picks higher ports when several windows are opened.
            assert.strictEqual(origins.isLoopbackOrigin("http://localhost:8001"), true);
            assert.strictEqual(origins.isLoopbackOrigin("http://localhost:49152"), true);
            assert.strictEqual(origins.isLoopbackOrigin("http://localhost"), true);
            assert.strictEqual(origins.isLoopbackOrigin("https://localhost:8001"), true);
            assert.strictEqual(origins.isLoopbackOrigin("http://mod.localhost:8001"), true);
            assert.strictEqual(origins.isLoopbackOrigin("http://127.0.0.1:8001"), true);
            assert.strictEqual(origins.isLoopbackOrigin("http://127.1.2.3:8001"), true);
            assert.strictEqual(origins.isLoopbackOrigin("http://[::1]:8001"), true);
        });

        it("should not allow anything else", function () {
            assert.strictEqual(origins.isLoopbackOrigin("https://spotfire.example.com"), false);
            assert.strictEqual(origins.isLoopbackOrigin("http://localhost.example.com"), false);
            assert.strictEqual(origins.isLoopbackOrigin("http://192.168.0.1:8001"), false);
            assert.strictEqual(origins.isLoopbackOrigin("file://localhost"), false);
        });
    });

    describe("createOriginGate", function () {
        it("should allow loopback and configured origins, and deny the rest without a prompt", async function () {
            // Configured with odd casing, which the gate is expected to see past.
            const gate = createGate({ configPath: configAllowing("HTTPS://Spotfire.Example.com") });

            assert.strictEqual(await gate.isAllowed("http://localhost:8001"), true);
            assert.strictEqual(await gate.isAllowed("https://spotfire.example.com"), true);
            assert.strictEqual(await gate.isAllowed("https://evil.example.com"), false);
            assert.strictEqual(await gate.isAllowed("null"), false);
            assert.strictEqual(await gate.isAllowed(undefined), false);
        });

        it("should read origins allowed for all future sessions from the configuration file", async function () {
            const gate = createGate({ configPath: configAllowing("https://spotfire.example.com") });

            assert.strictEqual(await gate.isAllowed("https://spotfire.example.com"), true);
        });

        it("should ask about an unknown origin and remember the answer for the session", async function () {
            /** @type {string[]} */
            const asked = [];
            const gate = createGate({
                configPath: noConfig,
                prompt: async (origin) => {
                    asked.push(origin);
                    return "session";
                }
            });

            assert.strictEqual(await gate.isAllowed("https://spotfire.example.com"), true);
            assert.strictEqual(await gate.isAllowed("https://spotfire.example.com"), true);
            assert.deepStrictEqual(asked, ["https://spotfire.example.com"], "should only ask once");
        });

        it("should only ask once for concurrent requests from the same origin", async function () {
            let asked = 0;
            /** @type {(answer: "session" | "always" | "deny") => void} */
            let answer;
            const gate = createGate({
                configPath: noConfig,
                prompt: () => {
                    asked++;
                    return new Promise((resolve) => (answer = resolve));
                }
            });

            const requests = Promise.all([
                gate.isAllowed("https://spotfire.example.com"),
                gate.isAllowed("https://spotfire.example.com")
            ]);

            // Give both requests a chance to reach the gate before the question is answered.
            await new Promise((resolve) => setImmediate(resolve));
            answer("session");

            assert.deepStrictEqual(await requests, [true, true]);
            assert.strictEqual(asked, 1);
        });

        it("should not ask again about a denied origin", async function () {
            let asked = 0;
            const gate = createGate({
                configPath: noConfig,
                prompt: async () => {
                    asked++;
                    return "deny";
                }
            });

            assert.strictEqual(await gate.isAllowed("https://evil.example.com"), false);
            assert.strictEqual(await gate.isAllowed("https://evil.example.com"), false);
            assert.strictEqual(asked, 1);
        });

        it("should persist an origin allowed for all future sessions", async function () {
            const configPath = temporaryConfigPath();
            fs.writeFileSync(configPath, JSON.stringify({ someOtherSetting: true }));

            const gate = createGate({ configPath, prompt: async () => "always" });
            assert.strictEqual(await gate.isAllowed("https://spotfire.example.com"), true);

            const config = JSON.parse(fs.readFileSync(configPath, { encoding: "utf-8" }));
            assert.deepStrictEqual(config.allowedOrigins, ["https://spotfire.example.com"]);
            assert.strictEqual(config.someOtherSetting, true, "should keep other settings intact");

            // A new session picks the origin up without asking again.
            const nextSession = createGate({ configPath });
            assert.strictEqual(await nextSession.isAllowed("https://spotfire.example.com"), true);
        });

        describe("picking up changes to the configuration file", function () {
            // Spotfire tells the user to add their address to the allowed origins of the development
            // server, so an edit made while it runs has to count without it being restarted.

            it("should allow an origin added to the file while running", async function () {
                const configPath = configAllowing();
                const gate = createGate({ configPath });
                assert.strictEqual(await gate.isAllowed("https://spotfire.example.com"), false);

                await writeAndSettle(configPath, { allowedOrigins: ["https://spotfire.example.com"] });

                assert.strictEqual(await gate.isAllowed("https://spotfire.example.com"), true);
            });

            it("should stop allowing an origin taken out of the file while running", async function () {
                const configPath = configAllowing("https://spotfire.example.com");
                const gate = createGate({ configPath });
                assert.strictEqual(await gate.isAllowed("https://spotfire.example.com"), true);

                await writeAndSettle(configPath, { allowedOrigins: [] });

                assert.strictEqual(await gate.isAllowed("https://spotfire.example.com"), false);
            });

            it("should allow an origin the developer turned down earlier once the file allows it", async function () {
                const configPath = configAllowing();
                const gate = createGate({ configPath, prompt: async () => "deny" });

                assert.strictEqual(await gate.isAllowed("https://spotfire.example.com"), false);
                assert.strictEqual(gate.status("https://spotfire.example.com"), "rejected");

                // The other half of the advice Spotfire gives, which is to restart the server to be
                // asked again. Editing the file has to work just as well.
                await writeAndSettle(configPath, { allowedOrigins: ["https://spotfire.example.com"] });

                assert.strictEqual(gate.status("https://spotfire.example.com"), "allowed");
                assert.strictEqual(await gate.isAllowed("https://spotfire.example.com"), true);
            });

            it("should keep an origin allowed for the session when the file changes", async function () {
                const configPath = configAllowing();
                const gate = createGate({ configPath, prompt: async () => "session" });
                assert.strictEqual(await gate.isAllowed("https://session.example.com"), true);

                await writeAndSettle(configPath, { allowedOrigins: ["https://other.example.com"] });

                // Asked for rather than tried, since the prompt would allow it all over again and say
                // nothing about whether rereading the file took the session grant away.
                assert.strictEqual(gate.status("https://session.example.com"), "allowed");
            });

            it("should stop watching once closed", async function () {
                const configPath = configAllowing();
                const gate = createGate({ configPath });

                await gate.close();
                await writeAndSettle(configPath, { allowedOrigins: ["https://spotfire.example.com"] });

                assert.strictEqual(await gate.isAllowed("https://spotfire.example.com"), false);
            });
        });

        describe("createConfigIfMissing", function () {
            it("should write a file ready for the developer to add an origin to", function () {
                const configPath = temporaryConfigPath();

                assert.strictEqual(origins.createConfigIfMissing(configPath), true);

                assert.deepStrictEqual(readConfig(configPath), { allowedOrigins: [] });
            });

            it("should leave an existing file alone", function () {
                const configPath = configAllowing("https://spotfire.example.com");

                assert.strictEqual(origins.createConfigIfMissing(configPath), false);

                assert.deepStrictEqual(readConfig(configPath).allowedOrigins, ["https://spotfire.example.com"]);
            });

            it("should be done for the developer when the gate starts", function () {
                const configPath = path.join(temporaryDirectory(), ".spotfire", "mods-dev-server.json");

                createGate({ configPath });

                // Including the directory, which is not there either the first time around.
                assert.deepStrictEqual(readConfig(configPath), { allowedOrigins: [] });
            });
        });

        describe("addAllowedOriginToConfig", function () {
            it("should bring a hand written origin to its canonical form rather than add it twice", function () {
                const configPath = temporaryConfigPath();
                fs.writeFileSync(configPath, JSON.stringify({ allowedOrigins: ["HTTPS://Spotfire.Example.com/"] }));

                origins.addAllowedOriginToConfig("https://spotfire.example.com", configPath);

                assert.deepStrictEqual(readConfig(configPath).allowedOrigins, ["https://spotfire.example.com"]);
            });

            it("should keep the origins already in the file, in canonical form", function () {
                const configPath = temporaryConfigPath();
                fs.writeFileSync(
                    configPath,
                    JSON.stringify({ allowedOrigins: ["HTTP://Other.Example.com:8080", "https://kept.example.com"] })
                );

                origins.addAllowedOriginToConfig("https://spotfire.example.com", configPath);

                assert.deepStrictEqual(readConfig(configPath).allowedOrigins, [
                    "http://other.example.com:8080",
                    "https://kept.example.com",
                    "https://spotfire.example.com"
                ]);
            });

            it("should collapse duplicate spellings already in the file", function () {
                const configPath = temporaryConfigPath();
                fs.writeFileSync(
                    configPath,
                    JSON.stringify({
                        allowedOrigins: ["https://spotfire.example.com", "HTTPS://Spotfire.Example.com/"]
                    })
                );

                origins.addAllowedOriginToConfig("https://other.example.com", configPath);

                assert.deepStrictEqual(readConfig(configPath).allowedOrigins, [
                    "https://spotfire.example.com",
                    "https://other.example.com"
                ]);
            });

            it("should leave entries that are not origins alone", function () {
                const configPath = temporaryConfigPath();
                fs.writeFileSync(configPath, JSON.stringify({ allowedOrigins: ["not an origin"] }));

                origins.addAllowedOriginToConfig("https://spotfire.example.com", configPath);

                // Throwing it away would quietly edit something the developer wrote by hand.
                assert.deepStrictEqual(readConfig(configPath).allowedOrigins, [
                    "not an origin",
                    "https://spotfire.example.com"
                ]);
            });

            it("should not add an origin that is already there", function () {
                const configPath = temporaryConfigPath();
                fs.writeFileSync(configPath, JSON.stringify({ allowedOrigins: ["https://spotfire.example.com"] }));

                origins.addAllowedOriginToConfig("https://spotfire.example.com", configPath);

                assert.deepStrictEqual(readConfig(configPath).allowedOrigins, ["https://spotfire.example.com"]);
            });
        });

        it("should report where an origin stands without asking about it", async function () {
            let asked = 0;
            const gate = createGate({
                configPath: configAllowing("https://spotfire.example.com"),
                prompt: async () => {
                    asked++;
                    return "deny";
                }
            });

            assert.strictEqual(gate.status("http://localhost:8001"), "allowed");
            assert.strictEqual(gate.status("https://spotfire.example.com"), "allowed");
            assert.strictEqual(gate.status("https://unknown.example.com"), "willPrompt");
            assert.strictEqual(gate.status("null"), "rejected");
            assert.strictEqual(gate.status(undefined), "rejected");
            assert.strictEqual(asked, 0, "asking where an origin stands should not raise the prompt");

            // Once the developer has turned the origin down, it is reported as rejected rather than
            // as a question still waiting to be asked.
            await gate.isAllowed("https://unknown.example.com");
            assert.strictEqual(gate.status("https://unknown.example.com"), "rejected");
            assert.strictEqual(asked, 1);
        });

        it("should not report an origin as rejected when there was nobody to ask", async function () {
            const gate = createGate({ configPath: noConfig });

            assert.strictEqual(gate.status("https://unknown.example.com"), "cannotPrompt");

            // Turning the origin away must not be mistaken for the developer having said no.
            assert.strictEqual(await gate.isAllowed("https://unknown.example.com"), false);
            assert.strictEqual(gate.status("https://unknown.example.com"), "cannotPrompt");
        });

        it("should not report an origin as rejected when the prompt could not be put", async function () {
            const gate = createGate({
                configPath: noConfig,
                prompt: async () => {
                    throw new Error("No console to ask on");
                }
            });

            assert.strictEqual(await gate.isAllowed("https://spotfire.example.com"), false);
            assert.strictEqual(gate.status("https://spotfire.example.com"), "cannotPrompt");
        });

        it("should deny an origin when the prompt fails", async function () {
            const gate = createGate({
                configPath: noConfig,
                prompt: async () => {
                    throw new Error("No console to ask on");
                }
            });

            assert.strictEqual(await gate.isAllowed("https://spotfire.example.com"), false);
        });
    });
});

describe("Origin allow list in the server", function () {
    /** @type {import("http").Server} */
    let devServer;

    before(function () {
        devServer = startServer(
            { originsConfigPath: configAllowing("https://spotfire.example.com") },
            { fromTerminal: false }
        );
    });

    after(function () {
        devServer.close();
    });

    it("should allow a localhost origin on a high port", function (done) {
        test(devServer)
            .get("/mod-manifest.json")
            .set("Origin", "http://localhost:49152")
            .expect("Access-Control-Allow-Origin", "http://localhost:49152")
            .expect(200, done);
    });

    it("should allow a configured origin", function (done) {
        test(devServer)
            .get("/mod-manifest.json")
            .set("Origin", "https://spotfire.example.com")
            .expect("Access-Control-Allow-Origin", "https://spotfire.example.com")
            .expect(200, done);
    });

    it("should not allow an unknown origin", function (done) {
        test(devServer)
            .get("/mod-manifest.json")
            .set("Origin", "https://evil.example.com")
            .expect(function (res) {
                if (res.headers["access-control-allow-origin"]) {
                    throw new Error(
                        "An unknown origin should not get a CORS header, but got: " +
                            res.headers["access-control-allow-origin"]
                    );
                }

                if (res.headers["access-control-allow-private-network"]) {
                    throw new Error("An unknown origin should not be allowed to reach the private network.");
                }
            })
            .expect(200, done);
    });

    it("should report an allowed origin as allowed", function (done) {
        test(devServer)
            .get("/@spotfire/api/origin")
            .set("Origin", "https://spotfire.example.com")
            .expect("Access-Control-Allow-Origin", "https://spotfire.example.com")
            .expect(200, { origin: "https://spotfire.example.com", status: "allowed" })
            .end(done);
    });

    it("should answer an origin that is not allowed, so that it can tell the user what to do", function (done) {
        test(devServer)
            .get("/@spotfire/api/origin")
            .set("Origin", "https://unknown.example.com")
            // The answer has to be readable by the origin it is about, or it is of no use.
            .expect("Access-Control-Allow-Origin", "https://unknown.example.com")
            // This server was not started from a terminal, so nobody can be asked.
            .expect(200, { origin: "https://unknown.example.com", status: "cannotPrompt" })
            .end(done);
    });

    it("should not let the query itself allow the origin", function (done) {
        test(devServer)
            .get("/mod-manifest.json")
            .set("Origin", "https://unknown.example.com")
            .expect(function (res) {
                if (res.headers["access-control-allow-origin"]) {
                    throw new Error("Asking about an origin should not allow it.");
                }
            })
            .expect(200, done);
    });

    it("should let an origin preflight the query", function (done) {
        test(devServer)
            .options("/@spotfire/api/origin")
            .set("Origin", "https://unknown.example.com")
            .expect("Access-Control-Allow-Origin", "https://unknown.example.com")
            .expect(204, done);
    });

    it("should not let the query be used for anything but reading", function (done) {
        test(devServer)
            .post("/@spotfire/api/origin")
            .set("Origin", "https://spotfire.example.com")
            .expect("Allow", "GET, OPTIONS")
            .expect(405, done);
    });

    it("should not allow an unknown origin to preflight", function (done) {
        test(devServer)
            .options("/@spotfire/api/snapshot")
            .set("Origin", "https://evil.example.com")
            .expect(function (res) {
                if (res.headers["access-control-allow-origin"]) {
                    throw new Error("An unknown origin should not pass the preflight.");
                }
            })
            .expect(204, done);
    });
});

describe("The project root of a server that exposes it", function () {
    // The path is one on the developer's own disk, so it is withheld from an origin off the allow list
    // rather than served in the hope that the browser keeps it from being read.

    /** @type {import("http").Server} */
    let devServer;

    before(function () {
        devServer = startServer(
            { originsConfigPath: configAllowing("https://spotfire.example.com"), allowProjectRoot: true },
            { fromTerminal: false }
        );
    });

    after(function () {
        devServer.close();
    });

    it("should give the project root to an allowed origin", function (done) {
        test(devServer)
            .get("/modProjectRoot")
            .set("Origin", "https://spotfire.example.com")
            .expect("Access-Control-Allow-Origin", "https://spotfire.example.com")
            .expect(200, path.join(__dirname, "test-files"), done);
    });

    it("should not give the project root to an unknown origin", function (done) {
        test(devServer)
            .get("/modProjectRoot")
            .set("Origin", "https://evil.example.com")
            .expect(withoutTheProjectRoot)
            .expect(403, done);
    });

    it("should not give the project root to a caller that names no origin", function (done) {
        // Spotfire always names an origin, so anything that does not is something else entirely, and
        // the allow list is of no use in judging it.
        test(devServer).get("/modProjectRoot").expect(withoutTheProjectRoot).expect(403, done);
    });

    /** @param {import("supertest").Response} res */
    function withoutTheProjectRoot(res) {
        if (res.text) {
            throw new Error("The project root should have been withheld, but got: " + res.text);
        }
    }
});

describe("Origin query on a server started from a terminal", function () {
    /** @type {import("http").Server} */
    let devServer;

    before(function () {
        // Only the query endpoint is used below, and it never raises the prompt.
        devServer = startServer({ originsConfigPath: noConfig }, { fromTerminal: true });
    });

    after(function () {
        devServer.close();
    });

    it("should tell an unknown origin that the developer is about to be asked", function (done) {
        test(devServer)
            .get("/@spotfire/api/origin")
            .set("Origin", "https://unknown.example.com")
            .expect("Access-Control-Allow-Origin", "https://unknown.example.com")
            .expect(200, { origin: "https://unknown.example.com", status: "willPrompt" })
            .end(done);
    });

    it("should not say that an allowed origin will be asked about", function (done) {
        test(devServer)
            .get("/@spotfire/api/origin")
            .set("Origin", "http://localhost:8001")
            .expect(200, { origin: "http://localhost:8001", status: "allowed" })
            .end(done);
    });

    it("should report an origin the developer has turned down as rejected", async function () {
        const rejected = "https://rejected.example.com";

        // Answering the question is what separates a rejection from a question not yet asked.
        await test(devServer).get("/@spotfire/api/origin").set("Origin", rejected).expect(200, {
            origin: rejected,
            status: "willPrompt"
        });

        answerPromptWith("d");
        await test(devServer).get("/mod-manifest.json").set("Origin", rejected);

        await test(devServer)
            .get("/@spotfire/api/origin")
            .set("Origin", rejected)
            .expect(200, { origin: rejected, status: "rejected" });
    });
});

/** Stands in for the console of the most recently started server. @type {Writable | undefined} */
let consoleInput;

/**
 * Type an answer to the question the development server is asking on its console.
 * @param {string} answer
 */
function answerPromptWith(answer) {
    consoleInput?.write(answer + "\n");
}

/**
 * Start a development server over the test files, pretending that it was or was not started from a
 * terminal. Whether there is a console to ask on is the only thing deciding if unknown origins are
 * brought up in a prompt, and the test run itself may or may not have one.
 *
 * The console is stood in for rather than borrowed, both so that the test run's own terminal is left
 * alone and so that answers can be typed with {@link answerPromptWith}.
 *
 * @param {import("../server").ServerSettings} settings
 * @param {{ fromTerminal: boolean }} options
 */
function startServer(settings, { fromTerminal }) {
    const input = new PassThrough();
    Object.defineProperty(input, "isTTY", { value: fromTerminal });

    const stdin = Object.getOwnPropertyDescriptor(process, "stdin");
    const stdout = Object.getOwnPropertyDescriptor(process.stdout, "isTTY");
    Object.defineProperty(process, "stdin", { value: input, configurable: true });
    Object.defineProperty(process.stdout, "isTTY", { value: fromTerminal, configurable: true });

    try {
        consoleInput = input;
        return server.start({ root: path.join(__dirname, "test-files"), open: false, ...settings });
    } finally {
        restore(process, "stdin", stdin);
        restore(process.stdout, "isTTY", stdout);
    }
}

/**
 * Put a property descriptor back the way it was, or remove the property if it had none.
 *
 * @param {Record<string, any>} target
 * @param {string} property
 * @param {PropertyDescriptor | undefined} descriptor
 */
function restore(target, property, descriptor) {
    if (descriptor) {
        Object.defineProperty(target, property, descriptor);
    } else {
        delete target[property];
    }
}
