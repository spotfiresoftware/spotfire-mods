/*
 * Copyright © 2023. Cloud Software Group, Inc.
 * This file is subject to the license terms contained
 * in the license file that is distributed with this file.
 */

//@ts-check

/**
 * @param {Spotfire.DataViewHierarchyNode} node
 * @returns {string[]}
 */
export const nodeFormattedPathAsArray = (node) => {
    if (!node || node.level < 0) {
        return [];
    }

    return nodeFormattedPathAsArray(node.parent).concat([node.formattedValue()]);
};

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
