import { maxInList } from "../src/visualization";

it("Returns 0 when list is empty", () => {
    expect(maxInList([])).toBe(0);
});

it("Does not crash when values are undefined", () => {
    expect(
        maxInList([
            ["foo", 0],
            ["bar", undefined as any],
            ["zoo", 10]
        ])
    ).toBe(10);
});

it("Does not crash when values are null", () => {
    expect(
        maxInList([
            ["foo", 0],
            ["bar", null as any],
            ["zoo", 10]
        ])
    ).toBe(10);
});
