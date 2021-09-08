import { overlap } from "../src/circle";

describe("Helper functions", () => {
    it("Check if two areas are overlap", () => {
        expect(overlap()).toBeTruthy();
    });
});
