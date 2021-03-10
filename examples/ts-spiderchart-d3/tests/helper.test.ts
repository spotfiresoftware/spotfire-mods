import { overlap } from "../src/helper";

describe("Helper functions", () => {
    it("Check if two areas are overlap", () => {
        const firstArea = document.createElement("div");
        const secondArea = document.createElement("div");
        const thirdArea = document.createElement("div");

        firstArea.getBoundingClientRect = jest.fn(() => ({
            left: 20,
            right: 60,
            top: 20,
            bottom: 90,
            height: 0,
            width: 0,
            x: 0,
            y: 0,
            toJSON: () => ""
        }));

        secondArea.getBoundingClientRect = jest.fn(() => ({
            left: 40,
            right: 80,
            top: 40,
            bottom: 50,
            height: 0,
            width: 0,
            x: 0,
            y: 0,
            toJSON: () => ""
        }));

        thirdArea.getBoundingClientRect = jest.fn(() => ({
            left: 80,
            right: 90,
            top: 100,
            bottom: 120,
            height: 0,
            width: 0,
            x: 0,
            y: 0,
            toJSON: () => ""
        }));

        expect(overlap(firstArea.getBoundingClientRect(), secondArea.getBoundingClientRect())).toBeTruthy();
        expect(overlap(firstArea.getBoundingClientRect(), thirdArea.getBoundingClientRect())).toBeFalsy();
    });
});
