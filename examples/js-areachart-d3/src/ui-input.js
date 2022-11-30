/*
 * Copyright © 2023. Cloud Software Group, Inc.
 * This file is subject to the license terms contained
 * in the license file that is distributed with this file.
 */

const selectionDiv = document.createElement("div");
selectionDiv.className = "selection";

const selectionBgDiv = document.createElement("div");
selectionBgDiv.className = "selection-bg";

document.querySelector("body").appendChild(selectionBgDiv);
document.querySelector("body").appendChild(selectionDiv);

const clamp = (value, min, max) => Math.min(Math.max(min, value), max);

let selectionPoint = { x: 0, y: 0 };
let meta = { ctrlKey: false, altKey: false };
export const addHandlersSelection = (callback) => {
    document.onmousedown = (e) => {
        callback({ dragSelectActive: true });
        const { x, y, ctrlKey, altKey } = e;
        selectionPoint = { x, y };
        meta = { ctrlKey, altKey };
        selectionDiv.style.left = x + "px";
        selectionDiv.style.top = y + "px";
        selectionDiv.style.width = "0px";
        selectionDiv.style.height = "0px";

        document.addEventListener("mousemove", mousemove);
        document.addEventListener("mouseup", mouseup);
    };

    const mousemove = (e) => {
        const x = clamp(e.x, 0, window.innerWidth - 2);
        const y = clamp(e.y, 0, window.innerHeight - 2);
        const width = Math.abs(selectionPoint.x - x);
        const height = Math.abs(selectionPoint.y - y);
        selectionDiv.style.width = width + "px";
        selectionDiv.style.height = height + "px";
        selectionDiv.style.visibility = "visible";
        selectionBgDiv.style.visibility = "visible";

        x < selectionPoint.x && (selectionDiv.style.left = x + "px");
        y < selectionPoint.y && (selectionDiv.style.top = y + "px");
    };

    const mouseup = (e) => {
        const { x, y } = e;
        const width = Math.abs(selectionPoint.x - x);
        const height = Math.abs(selectionPoint.y - y);
        selectionDiv.style.visibility = "hidden";
        selectionBgDiv.style.visibility = "hidden";

        const minSelectionSize = 2;
        if (width > minSelectionSize && height > minSelectionSize) {
            callback({
                x: x < selectionPoint.x ? x : selectionPoint.x,
                y: y < selectionPoint.y ? y : selectionPoint.y,
                width,
                height,
                ...meta
            });
        } else {
            callback({ dragSelectActive: false });
        }

        document.removeEventListener("mousemove", mousemove);
        document.removeEventListener("mouseup", mouseup);
    };
};
