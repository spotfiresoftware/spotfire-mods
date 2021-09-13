import { createPairs } from "../src/pairs";

describe("Helper functions", () => {
    it("Creates a single pair", () => {
        expect(createPairs([0, 1])).toEqual([[0, 1]]);
    });

    it("Creates three pairs", () => {
        expect(createPairs([0, 1, 2])).toEqual([
            [0, 1],
            [0, 2],
            [1, 2]
        ]);
    });

    it("Creates all pairs", () => {
        expect(createPairs([0, 1, 2, 4])).toEqual([
            [0, 1],
            [0, 2],
            [0, 4],
            [1, 2],
            [1, 4],
            [2, 4]
        ]);
    });
});
