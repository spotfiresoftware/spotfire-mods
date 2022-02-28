import * as d3 from "d3";
import { rectangularSelection } from "./rectangularMarking";

const sectorPadding = 5;

export interface RoseChartSettings {
    style: {
        label: { size: number; weight: string; style: string; color: string; fontFamily: string };
        marking: { color: string };
        background: { color: string };
        circles: { color: string };
    };
    containerSelector: string;
    size: { width: number; height: number };
    onMouseover(sector: RoseChartSector | RoseChartSlice): void;
    onMouseLeave(): void;
    clearMarking(): void;
    animationSpeed: number;
}

export interface RoseChartSlice {
    id: string;
    x0: number;
    x1: number;
    label: string;
    mark(): void;
    sectors: RoseChartSector[];
}

export interface RoseChartSector {
    value: number;
    isNegative: boolean;
    label: string;
    y0: number;
    y1: number;
    color: string;
    id: string;
    mark(): void;
}

export function render(slices: RoseChartSlice[], settings: RoseChartSettings) {
    const { size } = settings;

    const radius = Math.min(size.width, size.height) / 2 - parseInt("" + settings.style.label.size) * 2 - 8;

    const arc = d3
        .arc<{ x0: number; y0: number; x1: number; y1: number }>()
        .startAngle((d) => d.x0)
        .endAngle((d) => d.x1)
        .innerRadius((d) => d.y0 * radius)
        .outerRadius((d) => d.y1 * radius);

    const svg = d3
        .select(settings.containerSelector)
        .select("svg#svg")
        .attr("width", size.width)
        .attr("height", size.height);
    svg.select("g#container").attr("transform", "translate(" + size.width / 2 + "," + size.height / 2 + ")");

    let circles = svg
        .select("g#circles")
        .selectAll(".grid-circle")
        .data(d3.range(1, 10).reverse(), (d: any) => d);

    let newCircles = circles
        .enter()
        .append("circle")
        .attr("class", "grid-circle")
        .style("fill-opacity", 0)
        .style("opacity", "0")
        .style("stroke", "transparent");

    circles
        .merge(newCircles as any)
        .transition("circles")
        .duration(settings.animationSpeed)
        .attr("r", function (d: number, i: number) {
            return ((radius + sectorPadding) / 9) * d;
        })
        .style("stroke", settings.style.circles.color)
        .style("opacity", "0.7");

    circles.exit().remove();

    const sectors = svg
        .select("g#sectors")
        .selectAll("path")
        .data(
            slices.flatMap((s) => s.sectors.map((sector) => ({ ...s, ...sector }))),
            (d: any) => d.id
        );

    var newSectors = sectors
        .enter()
        .append("svg:path")
        .attr("class", "sector")
        .on("click", (d) => {
            d.mark();
            d3.event.stopPropagation();
        })
        .style("stroke-width", 1)
        .style("opacity", 0)
        .attr("fill", (d: any) => d.color);

    sectors
        .merge(newSectors)
        .attr("class", (d: any) => (d.data && d.data.actualValue < 0 ? "negative sector" : "sector"))
        .attr("stroke", (d) => (d.isNegative ? "red" : "transparent"))
        .transition("add sectors")
        .attr(
            "transform",
            (d) =>
                `translate(${Math.cos((d.x0 + d.x1) / 2 - Math.PI / 2) * sectorPadding}, ${
                    Math.sin((d.x0 + d.x1) / 2 - Math.PI / 2) * sectorPadding
                })`
        )
        .duration(settings.animationSpeed)
        .attrTween("d", tweenArc)
        .style("opacity", 1)
        .attr("fill", (d: any) => d.color)
        .end()
        .then(
            () => {},
            () => {
                // This happens when a new dataView is rendered while the transition is in progress.
            }
        )
        .finally(() => {
            newSectors.on("mouseover.hover", onMouseover);
            d3.select("#container").on("mouseleave", onMouseleave);
        });

    sectors.exit().transition("remove sectors").duration(settings.animationSpeed).attr("fill", "transparent").remove();

    function createArcArgument(d: RoseChartSlice) {
        let lastSector = d.sectors[d.sectors.length - 1];
        return {
            x0: d.x0,
            x1: d.x1,
            r: !lastSector ? 0 : lastSector.y1 * radius + (parseInt("" + settings.style.label.size) + 4)
        };
    }

    svg.select("g#labelPaths")
        .attr("pointer-events", "none")
        .selectAll<any, RoseChartSlice>("path")
        .data(slices, (d: RoseChartSlice) => `path-${d.id}`)
        .join(
            (enter) => {
                return enter
                    .append("path")
                    .attr("fill", "none")
                    .call((enter) =>
                        enter
                            .transition("create paths")
                            .duration(settings.animationSpeed)
                            .attrTween("d", tweenArcForLabelPath)
                    )
                    .attr("id", (d) => "label-" + hash(d.id));
            },
            (update) =>
                update
                    .call((update) =>
                        update
                            .transition("update paths")
                            .duration(settings.animationSpeed)
                            .attrTween("d", tweenArcForLabelPath)
                    )
                    .select("textPath"),
            (exit) => exit.transition("remove labels").duration(settings.animationSpeed).style("opacity", 0).remove()
        );
    svg.select("g#labels")
        .attr("text-anchor", "middle")
        .selectAll<any, RoseChartSlice>("text")
        .data(slices, (d: RoseChartSlice) => `label-${d.id}`)
        .join(
            (enter) => {
                return enter
                    .append("text")
                    .on("click", (d) => d.mark())
                    .on("mouseover.hover", (d) => settings.onMouseover(d))
                    .attr("class", "label")
                    .style("opacity", 0)
                    .attr("dy", "0.35em")
                    .attr("font-size", settings.style.label.size)
                    .attr("font-style", settings.style.label.style)
                    .attr("font-weight", settings.style.label.weight)
                    .attr("fill", settings.style.label.color)
                    .attr("font-family", settings.style.label.fontFamily)
                    .call((enter) =>
                        enter.transition("add labels").duration(settings.animationSpeed).style("opacity", 1)
                    )
                    .append("textPath")
                    .attr("href", (d) => "#label-" + hash(d.id))
                    .attr("startOffset", "50%")
                    .attr("class", "label-path")
                    .style("text-anchor", "center")
                    .text(label);
            },
            (update) =>
                update
                    .on("click", (d) => d.mark())
                    .select("textPath")
                    .call((update) =>
                        update
                            .transition("update labels")
                            .duration(settings.animationSpeed)
                            .style("opacity", (d) => 1)
                            .text(label)
                    ),
            (exit) => exit.transition("remove labels").duration(settings.animationSpeed).style("opacity", 0).remove()
        );

    function label(d: RoseChartSlice) {
        let arc = createArcArgument(d);
        let availableRadians = arc.x1 - arc.x0;

        let availablePixels = arc.r * availableRadians;

        const fontSize = settings.style.label.size;
        const fontWidth = fontSize * 0.7;

        let label = d.label;
        if (label.length > availablePixels / fontWidth) {
            return label.slice(0, Math.max(1, availablePixels / fontWidth - 2)) + "…";
        }

        return label;
    }

    rectangularSelection(svg, {
        clearMarking: settings.clearMarking,
        mark: (d: RoseChartSector) => d.mark(),
        getCenter(d: any) {
            let c = arc.centroid(d);
            return { x: c[0] + size.width / 2, y: c[1] + size.height / 2 };
        },
        ignoredClickClasses: ["sector", "label", "label-path"],
        markingSelector: ".sector",
        centerMarking: true
    });

    function tweenArc(this: any, data: any) {
        let prevValue = this.__prev || {};
        let newValue = data;
        this.__prev = newValue;

        var i = d3.interpolate(prevValue, newValue);

        return function (value: any) {
            return arc(i(value))!;
        };
    }

    function tweenArcForLabelPath(this: any, data: any) {
        let prevValue = this.__prev ? this.__prev : {};
        let newValue = createArcArgument(data);
        this.__prev = newValue;

        var i = d3.interpolate(prevValue, newValue);

        return function (value: any) {
            return labelArc(i(value))!;
        };
    }

    function onMouseleave() {
        d3.select("#explanation").style("visibility", "hidden");
        d3.selectAll(".sector").style("stroke", null);
        settings.onMouseLeave?.();
    }

    function onMouseover(this: any, d: any) {
        settings.onMouseover?.(d);
        d3.selectAll(".sector").style("stroke", null);
        d3.select(this).style("stroke", settings.style.marking.color);
    }
}

function polarToCartesian(centerX: number, centerY: number, radius: number, angleInRadians: number) {
    return {
        x: centerX + radius * Math.cos(angleInRadians - Math.PI / 2),
        y: centerY + radius * Math.sin(angleInRadians - Math.PI / 2)
    };
}

function labelArc(d: { r: number; x0: number; x1: number }) {
    let midX = (d.x1 + d.x0) / 2;
    let start = polarToCartesian(0, 0, d.r, d.x0);
    let end = polarToCartesian(0, 0, d.r, d.x1);

    let flipText = midX > Math.PI / 2 && midX < (3 * Math.PI) / 2;
    if (flipText) {
        [start, end] = [end, start];
    }

    return ["M", start.x, start.y, "A", d.r, d.r, 0, 0, flipText ? 0 : 1, end.x, end.y].join(" ");
}

function hash(s: string = "") {
    return s.split("").reduce(function (a, b) {
        a = (a << 5) - a + b.charCodeAt(0);
        return a & a;
    }, 0);
}
