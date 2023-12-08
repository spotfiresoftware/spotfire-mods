import { describe, expect, test } from "@jest/globals";
import { debounce } from "../src/utils";

describe("debounce", () => {
    const debounceTimeMs = 25;

    test("only calls once", () => {
        let counter = 0;
        function increment() {
            counter++;
        }

        const debouncedIcrement = debounce(increment, debounceTimeMs);
        for (var i = 0; i < 10; i++) {
            debouncedIcrement();
        }

        return getCounter().then((c) => {
            expect(c).toEqual(1);
        });

        function getCounter(): Promise<number> {
            return new Promise((resolve) => {
                setTimeout(() => {
                    resolve(counter);
                }, debounceTimeMs * 2);
            });
        }
    });

    test("can be called with arguments", () => {
        let result = "";
        function setResult(res: string) {
            result = res;
        }
        const debouncedSetResult = debounce(setResult, 10);

        const arg = "Hello, world!";
        debouncedSetResult(arg);

        return getResult().then((res) => {
            expect(res).toEqual(arg);
        });

        function getResult(): Promise<string> {
            return new Promise((resolve) => {
                setTimeout(() => {
                    resolve(result);
                }, debounceTimeMs * 2);
            });
        }
    });

    test("can be called twice with less than debounce time", () => {
        let counter = 0;
        function increment() {
            counter++;
        }

        const debouncedIcrement = debounce(increment, debounceTimeMs);

        debouncedIcrement();
        setTimeout(debouncedIcrement, debounceTimeMs + 1);

        return getCounter().then((c) => {
            expect(c).toEqual(2);
        });

        function getCounter(): Promise<number> {
            return new Promise((resolve) => {
                setTimeout(() => {
                    resolve(counter);
                }, debounceTimeMs * 3);
            });
        }
    });
});
