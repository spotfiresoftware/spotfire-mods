import * as d3 from "d3";
import { messages } from "./custom-messages";

export const _MS_PER_DAY = 24 * 3600 * 1000;

export function getMinDate(a, b) {
    if (a && b) {
        return a > b ? b : a;
    }
    return a || b;
}

export function getMaxDate(a, b) {
    if (a && b) {
        return a < b ? b : a;
    }
    return a || b;
}

export function dateDiffInDays(a, b, includeLastDay = false) {
    const utc1 = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
    const utc2 = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());

    if (includeLastDay) {
        return Math.floor((utc2 - utc1) / _MS_PER_DAY) + 1;
    }
    return Math.floor((utc2 - utc1) / _MS_PER_DAY);
}

export function addDays(date, days) {
    const d = new Date(date.valueOf());
    d.setDate(d.getDate() + days);
    return d;
}

export function getTranslation(transform) {
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.setAttributeNS(null, "transform", transform);
    const { matrix } = g.transform.baseVal.consolidate();
    return [matrix.e, matrix.f];
}

export function getDates(begin, end) {
    const dates = [];
    let s = new Date(begin);
    s.setHours(0, 0, 0, 0);
    const e = new Date(end);
    e.setHours(0, 0, 0, 0);

    while (s.getTime() <= e.getTime()) {
        dates.push(s.getTime());
        s = addDays(s, 1);
    }
    return dates;
}

export function formatDay(date) {
    const m = date.getMonth() + 1;
    const d = date.getDate();
    return `${m}/${d}`;
}

export function p2s(arr) {
    return arr.map((p) => `${p[0]},${p[1]}`).join(" ");
}

export function time2Pixel(startDate, endDate, unitWidth) {
    return ((endDate - startDate) * unitWidth) / _MS_PER_DAY;
}

export function textWidth(text, fontSize, fontFace, pad) {
    const ctx = document.createElement("canvas").getContext("2d");
    ctx.font = fontSize + "px " + fontFace;
    const metrics = ctx.measureText(text);
    const textMeasures = {
        widht: metrics.width + pad,
        height: Math.abs(metrics.actualBoundingBoxAscent) + Math.abs(metrics.actualBoundingBoxDescent) + pad
    };
    return textMeasures;
}

export function overlap(firstArea: DOMRect, secondArea: DOMRect): boolean {
    return !(
        firstArea.right < secondArea.left ||
        firstArea.left > secondArea.right ||
        firstArea.bottom < secondArea.top ||
        firstArea.top > secondArea.bottom
    );
}

export function insideBoundingBox(smallBox: DOMRect, bigBox: DOMRect): boolean {
    return smallBox.x > bigBox.x && (smallBox.x + smallBox.width) < (bigBox.x + bigBox.width);
}

export function leftSideOverflow(smallBox: DOMRect, bigBox: DOMRect): boolean {
    return smallBox.left < bigBox.left && smallBox.right < bigBox.right;
}

export function rigthSideOverflow(smallBox: DOMRect, bigBox: DOMRect): boolean {
    return smallBox.left > bigBox.left && smallBox.right > bigBox.right;
}

export function adjustText(type, tooltip) {
    const unitTexts = d3.selectAll("#" + type + " text");

    unitTexts.each(function (_, i) {
        let textElement = d3.select(this as SVGPathElement);
        const initialText = textElement.text();
        let textPath = d3.select((this as SVGPathElement).previousSibling as SVGPathElement);
        let textBoundingBox = textElement.node().getBBox();
        const pathBoundingBox = textPath.node().getBBox();
        while (!insideBoundingBox(textBoundingBox, pathBoundingBox) && textElement.text() !== "") {
            const text = textElement.text();

            if (text.length > 4) {
                textElement.text(text.slice(0, -4) + "...");
            } else if (!text.includes("...")) {
                textElement.text(text.slice(0, -1));
            } else {
                textElement.text(text.slice(0, -3));
            }
            textBoundingBox = textElement.node().getBBox();
        }
        if (textElement.text() !== initialText) {
          textElement
              .on("mouseover", () => {
                  tooltip.show(initialText);
              })
              .on("mouseout", () => {
                  tooltip.hide();
              });
      }
    });
}

export function increaseBrightness(hex, percent){
    hex = hex.replace(/^\s*#|\s*$/g, '');

    if(hex.length == 3){
        hex = hex.replace(/(.)/g, '$1$1');
    }

    var r = parseInt(hex.substr(0, 2), 16),
        g = parseInt(hex.substr(2, 2), 16),
        b = parseInt(hex.substr(4, 2), 16);

    return '#' +
       ((0|(1<<8) + r + (256 - r) * percent / 100).toString(16)).substr(1) +
       ((0|(1<<8) + g + (256 - g) * percent / 100).toString(16)).substr(1) +
       ((0|(1<<8) + b + (256 - b) * percent / 100).toString(16)).substr(1);
}