import { promisify } from "util";
import * as child_process from "child_process";
const exec = promisify(child_process.exec);

export async function run(command: string, cwd: string) {
    let e = await exec(command, { cwd });
    console.log(e.stdout);
    console.error(e.stderr);
}

export async function getResults(command: string, cwd = process.cwd()) {
    let e = await exec(command, { cwd });
    try {
        return JSON.parse(e.stdout);
    } catch (e) {
        return e.stdout;
    }
}
