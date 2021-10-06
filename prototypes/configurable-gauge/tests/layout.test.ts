import {  grid } from "../src/layout";


describe("Sizing", () => {
    it("Calculates the best grid size", () => {
        expect(grid(100, 50, 2)).toEqual([1, 2]);

        expect(grid(100, 100, 4)).toEqual([2, 2]);
        expect(grid(200, 100, 4)).toEqual([1, 4]);

        expect(grid(100, 400, 4)).toEqual([4, 1]);
        expect(grid(100, 400, 8)).toEqual([8, 1]);
        expect(grid(100, 400, 9)).toEqual([5, 2]);
    });
});
