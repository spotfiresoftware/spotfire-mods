const test = require("supertest");

const path = require("path");
const fs = require("fs");
const net = require("net");

const mainCss = fs.readFileSync(path.join(__dirname, "test-files", "main.css"), { encoding: "utf8" });
const indexHtml = fs.readFileSync(path.join(__dirname, "test-files", "index.html"), { encoding: "utf8" });

const devServer = require("../server").start({
    root: path.join(__dirname, "test-files"),
    open: false
});

describe("basic get requests", function () {
    it("should respond with index.html and html content type", function (done) {
        test(devServer)
            .get("/")
            .expect("Content-Type", "text/html; charset=UTF-8")
            .expect(/My mod/i)
            .expect(200, done);
    });

    it("should respond with index.html and html content type", function (done) {
        test(devServer)
            .get("/index.html")
            .expect("Content-Type", "text/html; charset=UTF-8")
            .expect(/My mod/i)
            .expect(200, done);
    });

    it("should respond with index.html and html content type", function (done) {
        test(devServer)
            .get("/index.html?apa=bepa")
            .expect("Content-Type", "text/html; charset=UTF-8")
            .expect(/My mod/i)
            .expect(200, done);
    });
    
    it("should respond with index.html and html content type", function (done) {
        test(devServer)
            .get("/index.html#apa=bepa")
            .expect("Content-Type", "text/html; charset=UTF-8")
            .expect(/My mod/i)
            .expect(200, done);
    });

    it("should respond with 404", function (done) {
        test(devServer).get("/../../../index.html?apa=bepa").expect(404, done);
    });

    it("should respond with 404", function (done) {
        test(devServer).get("/../http-behavior.js").expect(404, done);
    });

    it("should respond with manifest with json type", function (done) {
        test(devServer)
            .get("/mod-manifest.json")
            .expect("Content-Type", "application/json; charset=utf-8")
            .expect(/1.0/i)
            .expect(200, done);
    });

    it("should respond with css with CSS type", function (done) {
        test(devServer)
            .get("/main.css")
            .expect("Content-Type", "text/css; charset=utf-8")
            .expect(/margin: 0/i)
            .expect(200, done);
    });

    it("should respond with icon and xml type", function (done) {
        test(devServer).get("/icon.svg").expect("Content-Type", "image/svg+xml").expect(200, done);
    });
});

describe("Code injection", function () {
    it("should have injected script", function (done) {
        test(devServer)
            .get("/")
            .expect(/My mod/i)
            .expect(/live reload enabled/i)
            .expect(200, done);
    });
    
    it("should have injected script", function (done) {
        test(devServer)
            .get("/index.html?apa=bepa")
            .expect(/My mod/i)
            .expect(/live reload enabled/i)
            .expect(200, done);
    });

    it("should not inject script in css file", function (done) {
        test(devServer).get("/main.css").expect(mainCss).expect(200, done);
    });

    it("should not inject script when origin is set", function (done) {
        test(devServer).get("/index.html").set("origin", "http://localhost:8080").expect(indexHtml).expect(200, done);
    });
});

describe("CORS handling", function () {
    it("Should allow * CORS request when origin is set", function (done) {
        test(devServer)
            .get("/index.html")
            .set("Origin", "http://localhost:8080")
            .expect(function (res) {
                if (res.headers["access-control-allow-origin"] != "*") {
                    throw new Error("CORS header should be *, but was: " + res.headers["access-control-allow-origin"]);
                }
            })
            .expect(200, done);
    });

    it("Should not allow CORS request when origin is null", function (done) {
        test(devServer)
            .get("/index.html")
            .set("Origin", "null")
            .expect(function (res) {
                if (res.headers["access-control-allow-origin"]) {
                    throw new Error("CORS header should not exist");
                }
            })
            .expect(200, done);
    });
});

describe("Cache handling", function () {
    it("should disable caching", function (done) {
        test(devServer)
            .get("/index.html")
            .set("Origin", "http://localhost:8080")
            .expect("cache-control", "no-store")
            .expect(200, done);
    });
});

describe("Static file handling", function () {
    /** @type {(() => void)[]} */
    let cleanups = [];

    afterEach(function () {
        cleanups.forEach((cleanup) => cleanup());
        cleanups = [];
    });

    /**
     * Create a symlink inside the project root to a temporary index.html, or its directory, outside the root.
     * Skips the test when the platform does not allow creating the symlink.
     * @param {Mocha.Context} context
     * @param {string} linkPath
     * @param {"dir" | "file"} type
     */
    function linkOutsideRoot(context, linkPath, type = "dir") {
        const targetDirectory = fs.mkdtempSync(path.join(__dirname, "outside-root-"));
        const targetFile = path.join(targetDirectory, "index.html");
        fs.writeFileSync(targetFile, "outside project root");
        cleanups.push(() => fs.rmSync(targetDirectory, { recursive: true, force: true }));

        try {
            if (type === "file") {
                fs.symlinkSync(targetFile, linkPath, "file");
            } else {
                fs.symlinkSync(targetDirectory, linkPath, process.platform === "win32" ? "junction" : "dir");
            }
        } catch (error) {
            if (error.code === "EPERM" || error.code === "EACCES") {
                context.skip();
            }
            throw error;
        }

        // Remove the link before its target.
        cleanups.unshift(() => fs.unlinkSync(linkPath));
    }

    /**
     * @param {test.Response} res
     */
    function expectNotOutsideContent(res) {
        if (res.text && res.text.includes("outside project root")) {
            throw new Error("Served a file outside the project root.");
        }
    }

    it("should not serve index files through symlinks outside the project root", async function () {
        linkOutsideRoot(this, path.join(__dirname, "test-files", "outside-root"));
        await test(devServer).get("/outside-root/").expect(404).expect(expectNotOutsideContent);
    });

    it("should not inject into index files through symlinks outside the project root for other methods", async function () {
        linkOutsideRoot(this, path.join(__dirname, "test-files", "outside-root"));
        await test(devServer).post("/outside-root/index.html").expect(404).expect(expectNotOutsideContent);
    });

    it("should not inject into index files through symlinks with encoded names", async function () {
        linkOutsideRoot(this, path.join(__dirname, "test-files", "%61lias"));
        await test(devServer).get("/%61lias/index.html").expect(404).expect(expectNotOutsideContent);
    });

    it("should not inject into index files through symlinks with malformed encoded names", async function () {
        linkOutsideRoot(this, path.join(__dirname, "test-files", "%ZZ"));
        await test(devServer).get("/%ZZ/index.html").expect(404).expect(expectNotOutsideContent);
    });

    /**
     * Send a GET request with a raw request target, which supertest would otherwise normalize.
     * @param {string} target
     * @returns {Promise<string>} the raw response.
     */
    async function rawGet(target) {
        // The server may still be picking another port if the default port is in use.
        if (!devServer.listening) {
            await new Promise((resolve) => devServer.once("listening", resolve));
        }

        return new Promise((resolve, reject) => {
            const socket = net.connect(devServer.address().port, "127.0.0.1", () => {
                socket.write(`GET ${target} HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\n\r\n`);
            });
            let response = "";
            socket.on("data", (chunk) => (response += chunk));
            socket.on("end", () => resolve(response));
            socket.on("error", reject);
        });
    }

    for (const target of ["/outside-root/index.html#ignored", "http://localhost/outside-root/index.html"]) {
        it(`should not serve files through symlinks outside the project root for request target '${target}'`, async function () {
            linkOutsideRoot(this, path.join(__dirname, "test-files", "outside-root"));
            const response = await rawGet(target);
            if (!response.startsWith("HTTP/1.1 404") || response.includes("outside project root")) {
                throw new Error("Served a file outside the project root: " + response.split("\r\n")[0]);
            }
        });
    }

    it("should not serve a later index file through a symlink when an earlier one is a directory", async function () {
        const directory = path.join(__dirname, "test-files", "index-fallback");
        fs.mkdirSync(path.join(directory, "index.html"), { recursive: true });
        cleanups.push(() => fs.rmSync(directory, { recursive: true, force: true }));
        linkOutsideRoot(this, path.join(directory, "index.htm"), "file");

        await test(devServer)
            .get("/index-fallback/")
            .set("Origin", "http://localhost:8080")
            .expect(404)
            .expect(expectNotOutsideContent);
    });

    it("should inject the live reload snippet into index files in directories with encoded names", async function () {
        const directory = path.join(__dirname, "test-files", "my mod");
        fs.mkdirSync(directory);
        cleanups.push(() => fs.rmSync(directory, { recursive: true, force: true }));
        fs.writeFileSync(path.join(directory, "index.html"), "<html><body>My mod</body></html>");

        await test(devServer)
            .get("/my%20mod/index.html")
            .expect(200)
            .expect((res) => {
                if (res.text === "<html><body>My mod</body></html>") {
                    throw new Error("Expected the live reload snippet to be injected.");
                }
            });
    });
});

describe("Snapshot handling", function () {
    it("should snapshot files inside the project root", function (done) {
        const filePath = path.join(__dirname, "test-files", "main.css");
        test(devServer)
            .post("/@spotfire/api/snapshot")
            .set("Content-Type", "application/json; charset=utf-8")
            .send({ filePaths: [filePath] })
            .expect(200)
            .expect((res) => {
                if (res.body.snapshot[0][0] !== filePath || res.body.snapshot[0][1] <= 0) {
                    throw new Error("Expected a snapshot for the in-root file.");
                }
            })
            .end(done);
    });

    it("should reject parent-folder paths", function (done) {
        test(devServer)
            .post("/@spotfire/api/snapshot")
            .set("Content-Type", "application/json; charset=utf-8")
            .send({ filePaths: [path.join("..", "http-behavior.js")] })
            .expect(400)
            .expect((res) => {
                if (!res.body.error.includes("outside the project root")) {
                    throw new Error("Expected a parent-folder path to be rejected.");
                }
            })
            .end(done);
    });

    it("should reject absolute paths outside the project root", function (done) {
        const filePath = path.join(__dirname, "http-behavior.js");
        test(devServer)
            .post("/@spotfire/api/snapshot")
            .set("Content-Type", "application/json; charset=utf-8")
            .send({ filePaths: [filePath] })
            .expect(400)
            .expect((res) => {
                if (!res.body.error.includes("outside the project root")) {
                    throw new Error("Expected an outside-root path to be rejected.");
                }
            })
            .end(done);
    });
});

describe("CSP headers", function () {
    it("should add external resources to CSP header", function (done) {
        test(devServer)
            .get("/index.html")
            .expect((res) => {
                if (!res.headers["content-security-policy"].includes("http://example.com")) {
                    throw new Error("Missing allowed domain in CSP.");
                }
                
                if (!res.headers["content-security-policy"].includes("http://cdn.example.com")) {
                    throw new Error("Missing allowed domain in CSP.");
                }
            })
            .expect(200, done);
    });

    it("should add ajax origins to CSP header", function (done) {
        test(devServer)
            .get("/index.html")
            .set("Origin", "http://localhost:8090")
            .expect((res) => {
                if (res.headers["content-security-policy"].includes("http://localhost:8090")) {
                    throw new Error("Missing domain set via origin header in CSP.");
                }
            })
            .expect(200, done);
    });
});

describe("multiple instances", function () {
    it("should add external resources to CSP header", function (done) {
        const devServer2 = require("../server").start({
            root: path.join(__dirname, "test-files"),
            open: false
        });

        test(devServer2)
            .get("/index.html")
            .expect("Content-Type", "text/html; charset=UTF-8")
            .expect(/My mod/i)
            .expect(200, done);
    });
});
