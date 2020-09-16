/*
* Copyright © 2020. TIBCO Software Inc.
* This file is subject to the license terms contained
* in the license file that is distributed with this file.
*/

/**
 * Helper function to retrieve a DOM element if it exists.
 * @param selector  - A css selector string
 */
export function findElem(selector: string): HTMLElement {
    return document.querySelector(selector) as HTMLElement;
}

/**
 * Finds the max value in a data list 
 * @param data  - 
 */
export function maxInList(data: [string, number][]) {
    return data.reduce((p, c) => Math.max(c[1] ?? p, p), 0);
}
