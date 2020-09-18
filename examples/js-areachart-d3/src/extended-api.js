/*
 * Copyright © 2020. TIBCO Software Inc.
 * This file is subject to the license terms contained
 * in the license file that is distributed with this file.
 */

//@ts-check

const EMPTY = "(Empty)";
const SEPARATOR = ":";
export const is = (property) => (value) => property.value() == value;

/** @param {Spotfire.DataViewRow} row */
export const X = (row) => row.categorical("X").formattedValue();

/** 
 * @param {Spotfire.DataViewRow} row 
 * @returns {Number}
*/
export const Y = (row) => row.continuous("Y").value();

/** @param {Spotfire.DataViewRow} row */
export const Y_FORMATTED = (row) => row.continuous("Y").formattedValue();

/** @param {Spotfire.DataViewRow} row */
export const Color = (row) => {
    try {
        return row.categorical("Color").formattedValue();
    } catch (e) {
        return EMPTY;
    }
};

/** @param {Spotfire.DataViewRow} row */
export const marked = (row) => row.isMarked();

/** @param {Spotfire.DataViewRow} row */
export const hexCode = (row) => row.color().hexCode;

/** @param {Spotfire.DataViewRow} row */
export const mark = (row) => row.mark;

/** @param {Spotfire.DataViewHierarchyNode} node */
export const getName = (node) => node.formattedValue();

/** @param {Spotfire.DataViewHierarchyNode} node */
export const getKey = (node) => node.key;

export const markGroup = (group) => (key) => ({ ctrlKey }) =>
    ctrlKey ? group.select(key).__node.mark("ToggleOrAdd") : group.select(key).__node.mark();

/** @param {Spotfire.DataViewRow} row */
export const Path = (row) =>
    row
        .categorical("X")
        .value().map(({ key }) => (key == null ? EMPTY : String(key)))
        .join(SEPARATOR);

/**
 *
 * @param {Spotfire.DataViewRow} row
 */
export const createRowId = (row) => Path(row) + SEPARATOR + Color(row);

/**
 *
 * @param {Spotfire.DataViewHierarchyNode} node
 */
export const createHierarchyId = (node) => {
    if (node.parent != undefined && node.level >= 0) {
        const parentId = createHierarchyId(node.parent);
        return parentId.length ? parentId + SEPARATOR + node.key : node.key;
    } else return node.key;
};

/**
 * Creates a new object that contains resolved values but also y0 and y1 fields
 * necessary for drawing an area.
 *
 * @param {Spotfire.DataViewRow} row
 */
export const createPoint = (row) => {
    return {
        __row: row,
        id: createRowId(row),
        X_ID: Path(row),
        X: X(row),
        Color: Color(row),
        Y: Y(row),
        Y_FORMATTED: Y_FORMATTED(row),
        marked: marked(row),
        hexCode: hexCode(row),
        mark: mark(row),
        y0: 0,
        y1: Y(row)
    };
};

/**
 * Creates a 'group' object that contains all 'points' (id references) in a hierarchy,
 * a function to mark the whole hierarchy and sum of all Y values (used to draw areas on top
 * of each other in the correct order - smallest on top of largest)
 *
 * @param {Spotfire.DataViewHierarchyNode} node
 */
export const createGroup = (node) => {
    const points = node.rows().map(createRowId);
    const sum = node.rows().reduce((acc, row) => acc + Y(row), 0);
    const name = node.formattedPath(SEPARATOR);
    const id = createHierarchyId(node);

    return {
        __node: node,
        id,
        name,
        key: node.key,
        // mark: node.mark,
        points,
        sum
    };
};

/**
 * Computes and updates y0 and y1 values for a given set of points (pointsTable) arranged in a
 * matrix (xTable), taking into account chart type (normalize to [0-1] for '100% stacked' chart type).
 */
export const stack = (pointsTable) => (xTable) => (normalize = false) => {
    xTable.values.forEach((value) => {
        let i, key, point, y0, y1;
        let sumSoFar = 0;
        let sum = Math.abs(value.sum);
        for (i = value.points.length - 1; i >= 0; i--) {
            key = value.points[i];
            point = pointsTable.select(key);
            y0 = sumSoFar;
            y1 = sumSoFar + point.Y;
            sumSoFar = y1;

            point.y0 = normalize ? y0 / sum : y0;
            point.y1 = normalize ? y1 / sum : y1;
        }
    });
};

/**
 * Creates a hash table from hierarchy nodes.
 * Requires an ID function (idFn) - creates 'node' id; and a create function (createFn) - creates a new object from 'node'
 */
export const createTable = (idFn, createFn) => (nodes) => {
    const byKey = {};
    nodes.forEach((node) => {
        const id = idFn(node);
        byKey[id] = createFn(node);
    });

    const select = (key) => byKey[key];
    const keys = Object.keys(byKey);
    const values = Object.values(byKey);

    return {
        byKey,
        keys,
        values,
        select
    };
};

/**
 * A helper function that returns displayName of axis parts
 * @param {Spotfire.AxisValues} axis
 */
export const axisDisplayName = (axis) => {
    return axis.parts.map((node) => node.displayName);
};

/**
 * Merges (by index) values of 2 arrays into one line of formatted text
 */
export const createTextLine = (arr1) => (arr2) => arr1.map((value, index) => value + ": " + arr2[index]);

/**
 * Allows consistent tooltip behavior in a streaming scenario.
 * Checks for :hover pseudo element and extracts tooltip value saved in an attribute.
 * Hides tooltip if empty.
 * @param {Spotfire.Tooltip} tooltip 
 */
export const invalidateTooltip = (tooltip) => {
    const nodeList = document.querySelectorAll(":hover");
    if (nodeList.length > 0) {
        const lastNode = nodeList[nodeList.length - 1];
        const tooltipValue = lastNode.getAttribute("tooltip");
        if (tooltipValue) {
            tooltip.show(tooltipValue);
        } else {
            tooltip.hide();
        }
    }
};