/*
* Copyright © 2020. TIBCO Software Inc.
* This file is subject to the license terms contained
* in the license file that is distributed with this file.
*/

import { maxInList } from "../src/util";

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
