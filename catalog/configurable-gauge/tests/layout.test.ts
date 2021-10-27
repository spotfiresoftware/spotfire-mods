import {  grid } from "../src/layout";


describe("Sizing", () => {
    it("Calculates the best grid size", () => {
        expect(grid(100, 50, 1)).toEqual([1, 1]);
        expect(grid(100, 50, 2)).toEqual([1, 2]);

        expect(grid(100, 100, 4)).toEqual([2, 2]);
        expect(grid(200, 100, 4)).toEqual([1, 4]);

        expect(grid(100, 400, 4)).toEqual([4, 1]);
        expect(grid(100, 400, 8)).toEqual([8, 1]);
        expect(grid(100, 400, 9)).toEqual([5, 2]);
        expect(grid(100, 400, 9)).toEqual([5, 2]);

        expect(grid(400, 150, 13)).toEqual([2, 7]);
    });
   
    it("Does not allow widows", () => {
        expect(grid(100, 100, 3)).toEqual([1, 3]);
        expect(grid(100, 100, 7)).toEqual([2, 4]);
    });
});
