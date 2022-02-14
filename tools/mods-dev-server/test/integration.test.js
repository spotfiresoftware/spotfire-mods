//@ts-check

const fs = require("fs");
const puppeteer = require("puppeteer");
const assert = require("assert");

const { spawn } = require("child_process");

describe("CLI", function () {
    it("should warn when no manifest is present in the root folder", async () => {
        const server = cli(["cli.js", "test", "-p", "5556", "-o", "false"]);
        await server.match("Could not find a mod-manifest.json in the root directory");
    });
});

describe("Web socket connection", function () {
    it("should reload browser on file change", async function () {
        const server = cli(["cli.js", "test/test-files", "-p", "5555", "-o", "false"]);
        const browser = await puppeteer.launch();
        const page = await browser.newPage();

        await server.match('Serving "test/test-files" at http://127.0.0.1:5555');
        await page.goto("http://localhost:5555/");

        await assertContent(page, "My mod");
        await assertContent(page, "Live reload enabled.");

        // Modify the page in order to check that the page has reloaded later on.
        await page.evaluate(() => {
            document.body.innerText = "modified content";
        });

        // Validate that the content has changed.
        await assertContent(page, "modified content");

        // Trigger file change
        touchFile("/test-files/index.html");

        await server.match("Reloading 1 connected instance");
        await server.match("Mod manifest warning: 'does-not-exist.css' is not listed in the files list.");
        await Promise.all([server.match("GET /", true), page.waitForNavigation()]);
        await assertContent(page, "My mod");
    });

    it("should reload browser when file changes after server restart", async function () {
        let server = cli(["cli.js", "test/test-files", "-p", "5557", "-o", "false"]);
        const browser = await puppeteer.launch();
        const page = await browser.newPage();

        await server.match('Serving "test/test-files" at http://127.0.0.1:5557');
        await page.goto("http://localhost:5557/");

        await assertContent(page, "My mod");
        await assertContent(page, "Live reload enabled.");

        // Kill and restart the server without closing the current browser page.
        server.kill();
        server = cli(["cli.js", "test/test-files", "-p", "5557", "-o", "false"]);
        await server.match('Serving "test/test-files" at http://127.0.0.1:5557');

        // Wait a while for the browser to reconnect. There is a debounce of reload events set to 500ms.
        await new Promise((res) => setTimeout(res, 500));
        touchFile("/test-files/main.css");

        await server.match("Reloading 1 connected instance", false);
        await Promise.all([server.match("GET /", true), page.waitForNavigation()]);
        await assertContent(page, "My mod");
    }).timeout(5000);
});

/**
 * Assert that the current page contains the provided pattern.
 * @param {puppeteer.Page} page
 * @param {string} pattern
 */
async function assertContent(page, pattern) {
    let c = await page.content();
    assert.strictEqual(c.includes(pattern), true, `Pattern '${pattern}' not matching in, '${c}'`);
}

/**
 * Touch a file to trigger the file watcher.
 * @param {string} file
 */
function touchFile(file) {
    const filename = __dirname + file;
    const time = new Date();

    try {
        fs.utimesSync(filename, time, time);
    } catch (err) {
        fs.closeSync(fs.openSync(filename, "w"));
    }
}

/**
 * wrapper around a node.js process with the ability to match the output.
 *
 * @param {string[]} args
 */
function cli(args) {
    let output = "";
    /** @type {{ resolve: any; reject: any; promise: any; }} */
    let unwrappedPromise = null;
    /** @type {NodeJS.Timeout} */
    let timeout = null;
    /** @type {string | null}  */
    let pattern = null;

    let child = spawn("node", args, {
        cwd: process.cwd()
    });

    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
        output += chunk;

        if (pattern && chunk.includes(pattern)) {
            unwrappedPromise.resolve();
            clearTimeout(timeout);
        }
    });

    child.on("close", (code) => {
        unwrappedPromise?.reject("CLI closed " + code);
    });

    child.on("error", (code) => {
        unwrappedPromise?.reject("CLI error " + code);
    });

    return {
        /**
         * Wait for the provided pattern to appear.
         * @param {string} _pattern
         * @param {boolean} backwards Whether or not to look back in the the output.
         * @param {number} ms number of milliseconds to wait for the pattern to appear
         */
        match(_pattern, backwards = true, ms = 1000) {
            unwrappedPromise = createUnwrappedPromise();
            pattern = _pattern;

            if (backwards && output.includes(_pattern)) {
                unwrappedPromise.resolve();
            } else {
                timeout = setTimeout(() => {
                    let err = `'${_pattern}' did not appear in ${ms}ms. Current output is:  '${output}'.`;
                    unwrappedPromise.reject(err);
                }, ms);
            }

            return unwrappedPromise.promise;
        },
        kill() {
            child.kill("SIGINT");
        },
        output() {
            return output;
        }
    };
}

/** Helper to store the resolve and reject callbacks outside of the promise constructor. */
function createUnwrappedPromise() {
    let resolve;
    let reject;
    let promise = new Promise((res, rej) => {
        resolve = res;
        reject = rej;
    });

    return { promise, resolve, reject };
}
