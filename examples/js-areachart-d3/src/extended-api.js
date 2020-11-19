/*
 * Copyright © 2020. TIBCO Software Inc.
 * This file is subject to the license terms contained
 * in the license file that is distributed with this file.
 */

//@ts-check

const EMPTY = "(Empty)";
const SEPARATOR = String.fromCharCode(32, 187, 32);
const NULL_REPLACEMENT = "null";
const NOT_NULL_PREFIX = "key:";

export const is = (property) => (value) => property.value() == value;

/** @param {Spotfire.DataViewRow} row */
export const X = (row) => row.categorical("X").formattedValue(SEPARATOR);

/**
 * @param {Spotfire.DataViewRow} row
 * @returns {Number}
 */
const Y = (row) => row.continuous("Y").value();

/** @param {Spotfire.DataViewRow} row */
const Y_FORMATTED = (row) => row.continuous("Y").formattedValue();

/** @param {Spotfire.DataViewRow} row */
const Color = (row) => {
        return row.categorical("Color").formattedValue(SEPARATOR);
};

/** @param {Spotfire.DataViewRow} row */
const marked = (row) => row.isMarked();

/** @param {Spotfire.DataViewRow} row */
const hexCode = (row) => row.color().hexCode;

/** @param {Spotfire.DataViewRow} row */
const mark = (row) => row.mark;

const buildKey = (key) => key == null ? NULL_REPLACEMENT : NOT_NULL_PREFIX + key;

export const markGroup = (group) => (key) => ({ ctrlKey }) =>
    ctrlKey ? group.select(key).__node.mark("ToggleOrAdd") : group.select(key).__node.mark();

    
/** @param {Spotfire.DataViewHierarchyNode} node */
const Formatted_Values = (node) => {

    if(!node || node.level < 0){
        return []
    }

    return Formatted_Values(node.parent).concat([node.formattedValue()])
};

/**
 * Create the id of the hierarchy node.
 * Using node.leafIndex is not stable on updates, meaning it is not possible to use if adding transitions.
 * The id must be in sync with the X_ID implementation.
 *  @param {Spotfire.DataViewHierarchyNode} node
 */
const Leaf_ID = (node) => {
    const nodeId = buildKey(node.key);
    return node.level > 0 ? Leaf_ID(node.parent) + SEPARATOR + nodeId : nodeId;
};

/**
 *  @param {Spotfire.DataViewRow} row
 */
const X_ID = (row) => {
    return row
        .categorical("X")
        .value()
        .map((v) => buildKey(v.key))
        .join(SEPARATOR);
};

/**
 *  @param {Spotfire.DataViewRow} row
 */
const Color_ID = (row) => {
    try {
        return row
        .categorical("Color")
        .value()
        .map((v) => buildKey(v.key))
        .join(SEPARATOR);
    } catch {
        // The color axis has an empty expression
        return "";
    }
};
/**
 *
 * @param {Spotfire.DataViewRow} row
 */
const createRowId = (row) => {
    return X_ID(row) + SEPARATOR + Color_ID(row);
};

/**
 * Creates a new object that contains resolved values but also y0 and y1 fields
 * necessary for drawing an area.
 *
 * @param {Spotfire.DataViewRow} row
 */
export const createPoint = (row, hasX, hasColor) => {
    return {
        __row: row,
        id: createRowId(row),
        X_ID: hasX ? X_ID(row) : EMPTY,
        X: hasX ? X(row) : EMPTY,
        X_PATH: hasX ? row.categorical("X").value().map(v => v.key): [],
        Color: hasColor ? Color(row) : EMPTY,
        COLOR_PATH: hasColor ? row.categorical("Color").value().map(v => v.key): [],
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
    const formattedValues  = Formatted_Values(node);
    const id = Leaf_ID(node);

    return {
        __node: node,
        id,
        name: name,
        formattedValues: formattedValues,
        key: node.key,
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
 * Requires a create function (createFn) - creates a new object from 'node'. This object should have a unique id property.
 */
export const createTable = (createFn) => (nodesOrRows,hasX, hasColor) => {
    const byKey = {};
    nodesOrRows.forEach((nodeOrRow) => {
        const entity = createFn(nodeOrRow, hasX, hasColor);
        byKey[entity.id] = entity;
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