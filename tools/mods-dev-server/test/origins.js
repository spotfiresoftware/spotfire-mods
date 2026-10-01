//@ts-check

const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { PassThrough, Writable } = require("stream");
const test = require("supertest");

const origins = require("../origins");
const server = require("../server");

/** A configuration file that does not exist, so that the tests do not pick up the developer's own origins. */
const noConfig = path.join(__dirname, "test-files", "no-such-origins-config.json");

/** Directories holding the configuration files written by the tests. @type {string[]} */
const temporaryDirectories = [];

afterEach(function () {
    let directory;
    while ((directory = temporaryDirectories.pop()) != undefined) {
        fs.rmSync(directory, { recursive: true, force: true });
    }
});

function temporaryConfigPath() {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "mods-dev-server-test-"));
    temporaryDirectories.push(directory);
    return path.join(directory, "mods-dev-server.json");
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
            const gate = origins.createOriginGate({ configPath: configAllowing("HTTPS://Spotfire.Example.com") });

            assert.strictEqual(await gate.isAllowed("http://localhost:8001"), true);
            assert.strictEqual(await gate.isAllowed("https://spotfire.example.com"), true);
            assert.strictEqual(await gate.isAllowed("https://evil.example.com"), false);
            assert.strictEqual(await gate.isAllowed("null"), false);
            assert.strictEqual(await gate.isAllowed(undefined), false);
        });

        it("should read origins allowed for all future sessions from the configuration file", async function () {
            const gate = origins.createOriginGate({ configPath: configAllowing("https://spotfire.example.com") });

            assert.strictEqual(await gate.isAllowed("https://spotfire.example.com"), true);
        });

        it("should ask about an unknown origin and remember the answer for the session", async function () {
            /** @type {string[]} */
            const asked = [];
            const gate = origins.createOriginGate({
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
            const gate = origins.createOriginGate({
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
            const gate = origins.createOriginGate({
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

            const gate = origins.createOriginGate({ configPath, prompt: async () => "always" });
            assert.strictEqual(await gate.isAllowed("https://spotfire.example.com"), true);

            const config = JSON.parse(fs.readFileSync(configPath, { encoding: "utf-8" }));
            assert.deepStrictEqual(config.allowedOrigins, ["https://spotfire.example.com"]);
            assert.strictEqual(config.someOtherSetting, true, "should keep other settings intact");

            // A new session picks the origin up without asking again.
            const nextSession = origins.createOriginGate({ configPath });
            assert.strictEqual(await nextSession.isAllowed("https://spotfire.example.com"), true);
        });

        it("should report where an origin stands without asking about it", async function () {
            let asked = 0;
            const gate = origins.createOriginGate({
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
            const gate = origins.createOriginGate({ configPath: noConfig });

            assert.strictEqual(gate.status("https://unknown.example.com"), "cannotPrompt");

            // Turning the origin away must not be mistaken for the developer having said no.
            assert.strictEqual(await gate.isAllowed("https://unknown.example.com"), false);
            assert.strictEqual(gate.status("https://unknown.example.com"), "cannotPrompt");
        });

        it("should not report an origin as rejected when the prompt could not be put", async function () {
            const gate = origins.createOriginGate({
                configPath: noConfig,
                prompt: async () => {
                    throw new Error("No console to ask on");
                }
            });

            assert.strictEqual(await gate.isAllowed("https://spotfire.example.com"), false);
            assert.strictEqual(gate.status("https://spotfire.example.com"), "cannotPrompt");
        });

        it("should deny an origin when the prompt fails", async function () {
            const gate = origins.createOriginGate({
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
