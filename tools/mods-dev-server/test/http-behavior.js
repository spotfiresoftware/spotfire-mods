const test = require("supertest");

const path = require("path");
const fs = require("fs");

const mainCss = fs.readFileSync(path.join(__dirname, "test-files", "main.css"), { encoding: "utf8" });
const indexHtml = fs.readFileSync(path.join(__dirname, "test-files", "index.html"), { encoding: "utf8" });

const devServer = require("../server").start({
    root: path.join(__dirname, "test-files"),
    open: false,
    allowedOrigins: ["http://localhost", "https://spotfire.example.com"]
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
    it("Should allow CORS request from an allowed origin on any port", function (done) {
        test(devServer)
            .get("/index.html")
            .set("Origin", "http://localhost:51234")
            .expect("Access-Control-Allow-Origin", "http://localhost:51234")
            .expect(200, done);
    });

    it("Should allow CORS request from a configured web client origin", function (done) {
        test(devServer)
            .get("/index.html")
            .set("Origin", "https://spotfire.example.com")
            .expect("Access-Control-Allow-Origin", "https://spotfire.example.com")
            .expect(200, done);
    });

    it("Should not allow CORS request from an origin that is not allowed", function (done) {
        test(devServer)
            .get("/index.html")
            .set("Origin", "https://evil.example.com")
            .expect(function (res) {
                if (res.headers["access-control-allow-origin"]) {
                    throw new Error("CORS header should not exist");
                }
            })
            .expect(200, done);
    });

    it("Should not allow CORS request when only the hostname matches", function (done) {
        test(devServer)
            .get("/index.html")
            .set("Origin", "http://spotfire.example.com")
            .expect(function (res) {
                if (res.headers["access-control-allow-origin"]) {
                    throw new Error("CORS header should not exist");
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

describe("Host handling", function () {
    for (const host of ["localhost:8090", "127.0.0.1:8090", "[::1]:8090", "192.168.1.10:8090", "mod.localhost:8090"]) {
        it(`should allow requests with Host '${host}'`, function (done) {
            test(devServer).get("/index.html").set("Host", host).expect(200, done);
        });
    }

    it("should reject requests with a domain name Host to prevent DNS rebinding", function (done) {
        test(devServer).get("/index.html").set("Host", "evil.example.com:8090").expect(403, done);
    });

    it("should reject requests with a domain name Host that starts with localhost", function (done) {
        test(devServer).get("/index.html").set("Host", "localhost.evil.example.com").expect(403, done);
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
    it("should not serve index files through symlinks outside the project root", function (done) {
        const targetDirectory = fs.mkdtempSync(path.join(__dirname, "outside-root-"));
        const symlinkPath = path.join(__dirname, "test-files", "outside-root");
        fs.writeFileSync(path.join(targetDirectory, "index.html"), "outside project root");

        try {
            fs.symlinkSync(targetDirectory, symlinkPath, process.platform === "win32" ? "junction" : "dir");
        } catch (error) {
            fs.rmSync(targetDirectory, { recursive: true, force: true });
            if (error.code === "EPERM" || error.code === "EACCES") {
                this.skip();
                return;
            }
            throw error;
        }

        test(devServer)
            .get("/outside-root/")
            .expect(404)
            .end((error) => {
                fs.unlinkSync(symlinkPath);
                fs.rmSync(targetDirectory, { recursive: true, force: true });
                done(error);
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
            open: false,
            allowedOrigins: ["http://localhost"]
        });

        test(devServer2)
            .get("/index.html")
            .expect("Content-Type", "text/html; charset=UTF-8")
            .expect(/My mod/i)
            .expect(200, done);
    });
});
