const test = require("supertest");

const path = require("path");
const fs = require("fs");

const mainCss = fs.readFileSync(path.join(__dirname, "test-files", "main.css"), { encoding: "utf8" });
const indexHtml = fs.readFileSync(path.join(__dirname, "test-files", "index.html"), { encoding: "utf8" });

const devServer = require("..").start({
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
        const devServer2 = require("..").start({
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
