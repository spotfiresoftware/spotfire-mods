import { DataViewHierarchyNode, DataViewRow, MarkingOperation } from "spotfire-api";

export interface Serie {
    index: number;
    sum: number;
    mark(mode?: MarkingOperation): void;
    points: Point[];
}

export interface Point {
    tooltip(): string;
    mark(mode?: MarkingOperation): void;
    xIndex: number;
    index: number;
    color: string;
    Y: number;
    Y_Formatted: string;
    marked: boolean;
    virtual: boolean;
}