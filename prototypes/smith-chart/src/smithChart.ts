// @ts-ignore
import * as d3 from "d3";
import { rectangularSelection } from "./rectangularMarking";

export type ComplexNumber = [real: number, imaginary: number];

export interface SmithSettings {
    svg: d3.Selection<SVGSVGElement, any, any, any>;
    size: { width: number; height: number };
    gridDensity?: number;
    clearMarking?(): void;
    mouseLeave?(): void;
}

export interface Point {
    r: ComplexNumber;
    color: string;
    mark(): void;
    mouseOver(): void;
}

/**
 * Add the necessary groups to the SVG for layering to work.
 * @param svg Visualization element
 */
export function setup(svg: d3.Selection<SVGSVGElement, any, any, any>) {
    svg.append("g").attr("id", "bg");
    svg.append("g").attr("id", "circles");
    svg.append("g").attr("id", "points");
}

/**
 * Render the Smith chart into the provided SVG.
 * @param settings Visualization settings
 * @param points Points to visualize
 */
export function render(settings: SmithSettings, points: Point[]) {
    const { svg } = settings;

    let radius = Math.min(settings.size.width, settings.size.height) / 2;

    svg.attr("viewBox", `-${radius}, -${radius}, ${radius * 2}, ${radius * 2}`)
        .attr("width", settings.size.width)
        .attr("height", settings.size.height);

    svg.call(bg);

    svg.selectAll(".rc")
        .data(points)
        .join(
            (enter) => enter.append("circle").call(realCircle),
            (update) => update.call(realCircle),
            (exit) => exit.remove()
        );

    svg.selectAll(".ri-circle")
        .data(points.filter((d) => rToz(d.r)[1] !== 0))
        .join(
            (enter) => enter.append("circle").call(imaginaryCircle),
            (update) => update.call(imaginaryCircle),
            (exit) => exit.remove()
        );

    svg.selectAll(".ri-line")
        .data(points.filter((d) => rToz(d.r)[1] == 0))
        .join(
            (enter) => enter.append("path").call(imaginaryLine),
            (update) => update.call(imaginaryLine),
            (exit) => exit.remove()
        );

    svg.selectAll(".point")
        .data(points)
        .join(
            (enter) => enter.append("circle").call(point),
            (update) => update.call(point),
            (exit) => exit.remove()
        );

    rectangularSelection(svg as any, {
        classesToMark: "point",
        mark(d: Point) {
            d.mark();
        },
        clearMarking: () => settings.clearMarking?.(),
        centerMarking: true,
        ignoredClickClasses: []
    });

    function circleStyling(selection: d3.Selection<any, Point, SVGSVGElement, any>) {
        return selection
            .attr("stroke", (d) => d.color)
            .attr("fill", "none")
            .attr("stroke-width", 2)
            .attr("stroke-opacity", "0.6")
            .attr("clip-path", "url(#unit-circle)");
    }

    function realCircle(selection: d3.Selection<any, Point, SVGSVGElement, any>) {
        return selection
            .attr("class", "rc")
            .attr("cx", (d) => rCircle(rToz(d.r)[0]).cx * radius)
            .attr("cy", (d) => rCircle(rToz(d.r)[0]).cy * radius * -1)
            .attr("r", (d) => rCircle(rToz(d.r)[0]).r * radius)
            .call(circleStyling);
    }

    function imaginaryCircle(selection: d3.Selection<any, Point, SVGSVGElement, any>) {
        return selection
            .attr("class", "ri-circle")
            .attr("cx", (d) => iCircle(rToz(d.r)[1]).cx * radius)
            .attr("cy", (d) => iCircle(rToz(d.r)[1]).cy * radius * -1)
            .attr("r", (d) => iCircle(rToz(d.r)[1]).r * radius)
            .call(circleStyling);
    }

    function imaginaryLine(selection: d3.Selection<any, Point, SVGSVGElement, any>) {
        return selection.attr("class", "ri-line").attr("d", `M -${radius} 0 L ${radius} 0`).call(circleStyling);
    }

    function point(selection: d3.Selection<any, Point, SVGSVGElement, any>) {
        return selection
            .attr("class", "point")
            .attr("cx", (d) => d.r[0] * radius)
            .attr("cy", (d) => d.r[1] * radius * -1)
            .attr("r", 3)
            .attr("stroke", (d) => d.color)
            .attr("fill", (d) => d.color)
            .on("click", (d) => d.mark())
            .attr("stroke-width", 1)
            .attr("clip-path", "url(#unit-circle)");
    }

    /**
     * Render the background grid.
     * @param svg Visualization svg
     */
    function bg(svg: d3.Selection<any, Point, SVGSVGElement, any>) {
        let g = svg.select("#bg");

        const realCircles = Array.from(range(0, settings.gridDensity ?? 10.1, 0.2)).map(rCircle);
        const imaginaryCircles = Array.from(range(settings.gridDensity ? settings.gridDensity * -0.5 : -5, settings.gridDensity ? settings.gridDensity * 0.5 : 5.1, 0.2)).map(iCircle);

        g.selectAll(".setup")
            .data([radius])
            .join(
                (enter) => {
                    let g = enter.append("g").attr("class", "setup");
                    g.append("defs")
                        .append("clipPath")
                        .attr("id", "unit-circle")
                        .append("circle")
                        .attr("cx", 0)
                        .attr("cy", 0)
                        .attr("r", (d) => d);

                    g.append("path")
                        .attr("id", "horizontal-line")
                        .attr("d", (d) => `M -${d} 0 L ${d} 0`)
                        .attr("stroke", "black")
                        .attr("stroke-width", "1")
                        .attr("stroke-opacity", "0.5");

                    g.append("path")
                        .attr("id", "vertical-line")
                        .attr("d", (d) => `M 0 -${d} L 0 ${d}`)
                        .attr("stroke", "black")
                        .attr("stroke-width", "1")
                        .attr("stroke-opacity", "0.5");

                    return g;
                },
                (update) => {
                    update.select("#unit-circle circle").attr("r", (d) => d);
                    update.select("#horizontal-line").attr("d", (d) => `M -${d} 0 L ${d} 0`);
                    update.select("#vertical-line").attr("d", (d) => `M 0 -${d} L 0 ${d}`);

                    return update;
                },
                (exit) => exit.remove()
            );

        g.selectAll(".bg-circle")
            .data(realCircles)
            .join(
                (enter) => enter.append("circle").call(bgCircleStyling),
                (update) => update.call(bgCircleStyling),
                (exit) => exit.remove()
            );

        g.selectAll(".bg-circle2")
            .data(imaginaryCircles)
            .join(
                (enter) => enter.append("circle").call(bgCircleStyling2),
                (update) => update.call(bgCircleStyling2),
                (exit) => exit.remove()
            );

        function bgCircleStyling(s: d3.Selection<any, Circle, any, any>) {
            return s

                .attr("class", "bg-circle")
                .attr("cx", (d) => d.cx * radius)
                .attr("cy", (d) => d.cy * radius)
                .attr("r", (d) => d.r * radius)
                .attr("stroke", "black")
                .attr("fill", "none")
                .attr("stroke-width", 1)
                .attr("stroke-opacity", (d, i) => (i % 5 == 0 ? "0.6" : "0.3"));
        }

        function bgCircleStyling2(s: d3.Selection<any, Circle, any, any>) {
            return s
                .attr("class", "bg-circle2")
                .attr("cx", (d) => d.cx * radius)
                .attr("cy", (d) => d.cy * radius * -1)
                .attr("r", (d) => d.r * radius)
                .attr("stroke", "black")
                .attr("fill", "none")
                .attr("stroke-width", 1)
                .attr("stroke-opacity", (d, i) => (i % 5 == 0 ? "0.6" : "0.3"))
                .attr("clip-path", "url(#unit-circle)");
        }
    }
}

interface Circle {
    cx: number;
    cy: number;
    r: number;
}

// r = reflection coefficient
// z = normalized load impedance
// z = (1 + r) / (1 - r)

/**
 * Calculates the circle on the r-plane where Re(z) = k
 * @param step
 * @returns
 */
function rCircle(step: number): Circle {
    return {
        cx: step / (step + 1),
        cy: 0,
        r: 1 / (step + 1)
    };
}

/**
 * Calculates the circle on the r-plane where Im(z) = k
 * @param step
 * @returns
 */
function iCircle(step: number) {
    return {
        cx: 1,
        cy: 1 / step,
        r: Math.abs(1 / step)
    };
}

/**
 * Calculate z from r
 * @returns
 */
function rToz([rx, ry]: ComplexNumber) {
    const denominator = rx ** 2 - 2 * rx + 1 + ry ** 2;
    return [(1 - rx ** 2 - ry ** 2) / denominator, (2 * ry) / denominator];
}

function* range(start: number, end: number, step: number) {
    for (let i = start; i < end; i += step) {
        yield i;
    }
}
