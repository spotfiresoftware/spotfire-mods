//@ts-check

const EMPTY = "(Empty)"
export const is = (property) => (value) => property.value == value;
export const X = (row) => row.categorical("X").getValue();
export const Y = (row) => row.continuous("Y").getValue();
export const Color = (row) => {
    try {
        return row.categorical("Color").getValue();
    } catch (e) {
        return EMPTY;
    }
};
export const marked = (row) => row.isMarked();
export const hexCode = (row) => row.getColor().hexCode;
export const mark = (row) => row.mark;
export const getName = (node) => node.name;
export const getKey = (node) => node.key;
export const markGroup = (group) => (key) => group.select(key).__node.mark();
export const Path = (row) =>
    row
        .categorical("X")
        .path.map(({ key }) => String(key))
        .join(":");

/**
 *
 * @param {Spotfire.DataViewRow} row
 */
export const createRowId = (row) => Path(row) + ":" + Color(row);

/**
 *
 * @param {Spotfire.DataViewHierarchyNode} node
 */
export const createHierarchyId = (node) => {
    if (node.leafIndex != undefined && node.parent != undefined) {
        const parentId = createHierarchyId(node.parent);
        return parentId.length ? parentId + ":" + node.key : node.key;
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
    const name = node.fullName(":");
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
