import { grid, gaugeRadius, labelsFitSpace, scaleFitSpace } from "../src/layout";

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

describe("Gauge", () => {
    describe("Radius", () => {
        it("throws when the pad angle is too small or great", () => {
            expect(() => gaugeRadius(50, 50, -0.1)).toThrow();
            expect(() => gaugeRadius(50, 50, Math.PI)).toThrow();
        });

        it("Returns a radius that is half the height", () => {
            expect(gaugeRadius(50, 50, 0)).toBe(25);
            expect(gaugeRadius(70, 50, 0)).toBe(25);
        });

        it("Returns a inner radius that is based on the arc width", () => {
            expect(gaugeRadius(50, 50, 0)).toBe(25);
            expect(gaugeRadius(70, 50, 0)).toBe(25);
        });

        it("Returns the greatest possible radius based on given space", () => {
            expect(gaugeRadius(100, 50, Math.PI / 2)).toBe(50);
        });

        it("Returns the greatest possible radius based on given space", () => {
            expect(gaugeRadius(100, 50, Math.PI / 4)).toBeLessThan(50);
            expect(gaugeRadius(100, 50, Math.PI / 4)).toBeGreaterThan(25);
        });
    });

    describe("Labels", () => {
        it("should fit when space is available", () => {
            expect(labelsFitSpace(50, 50, 10)).toBe(true);
        });
        it("should not fit when vertical space is limited ", () => {
            expect(labelsFitSpace(50, 20, 10)).toBe(false);
        });
        it("should fit when vertical space is  but labels are small ", () => {
            expect(labelsFitSpace(50, 20, 8)).toBe(true);
        });

        it("should not fit when horizontal space is too narrow ", () => {
            expect(labelsFitSpace(20, 20, 8)).toBe(false);
        });
    });

    describe("Scales", () => {
        it("should fit when space is available", () => {
            expect(scaleFitSpace(70, 50, 10)).toBe(true);
        });
        it("should not fit when vertical space is limited ", () => {
            expect(scaleFitSpace(50, 20, 10)).toBe(false);
        });
        it("should fit when vertical space is  but labels are small ", () => {
            expect(scaleFitSpace(50, 40, 8)).toBe(true);
        });

        it("should not fit when horizontal space is too narrow ", () => {
            expect(scaleFitSpace(20, 20, 8)).toBe(false);
        });
    });
});
