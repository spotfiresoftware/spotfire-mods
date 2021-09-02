import * as d3 from "d3";
import { DataViewRow } from "spotfire-api";
import { rectangularSelection } from "./rectangularMarking";

const animationSpeed = 250;

export interface RoseChartHierarchyNode {
    hasVirtualChildren?: boolean;
    mark: (operation?: any) => void;
    level: number;
    key: any;
    parent?: any;
    markedRowCount: () => number;
    formattedValue: () => string;
    formattedPath: () => string;
    leafCount: () => number;
    children?: RoseChartHierarchyNode[];
    rows: () => DataViewRow[];
    virtualLeaf?: boolean;
    actualValue?: number;
}

export interface RoseChartSettings {
    style: {
        label: { size: number; weight: string; style: string; color: string; fontFamily: string };
        marking: { color: string };
        background: { color: string };
    };
    onMouseover?(data: unknown): void;
    onMouseLeave?(): void;
    containerSelector: string;
    size: { width: number; height: number };
    getFill(data: unknown): string;
    getId(data: unknown): string;
    getLabel(data: unknown, availablePixels: number): string;
    /** Text to place in the center while hovering sectors. */
    getCenterText(data: unknown): { value: string; text: string };
    mark(data: unknown): void;
    clearMarking(): void;
}

export interface RoseChartSector {
    x0: number;
    x1: number;
    label :string;
    value: number;
    y0: number;
    y1: number;
    color: string;
    id: string;
    mark(): void;
}

export function render(sectors2: RoseChartSector[], settings: RoseChartSettings) {
    const { size } = settings;

    const radius = Math.min(size.width, size.height) / 2;

    const arc = d3
        .arc<{ x0: number; y0: number; x1: number; y1: number; value: number }>()
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

    const sectors = svg.select("g#sectors").selectAll("path").data(sectors2);

    const labelColorLuminance = luminance(
        parseInt(settings.style.label.color.substr(1, 2), 16),
        parseInt(settings.style.label.color.substr(3, 2), 16),
        parseInt(settings.style.label.color.substr(5, 2), 16)
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

    const padding = 5;
    sectors
        .merge(newSectors)
        .attr("class", (d: any) => (d.data && d.data.actualValue < 0 ? "negative sector" : "sector"))
        .transition("add sectors")
        .attr(
            "transform",
            (d) =>
                `translate(${Math.cos((d.x0 + d.x1) / 2 - Math.PI / 2) * padding}, ${
                    Math.sin((d.x0 + d.x1) / 2 - Math.PI / 2) * padding
                })`
        )
        .duration(animationSpeed)
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

    sectors.exit().transition("remove sectors").duration(animationSpeed).attr("fill", "transparent").remove();

    svg.select("g#labels")
        .attr("pointer-events", "none")
        .attr("text-anchor", "middle")
        .selectAll<any, RoseChartSector>("text")
        .data(sectors2, (d: RoseChartSector) => `label-${d.id}`)
        .join(
            (enter) => {
                return enter
                    .append("text")
                    .style("opacity", 0)
                    .attr("dy", "0.35em")
                    .attr("font-size", settings.style.label.size)
                    .attr("font-style", settings.style.label.style)
                    .attr("font-weight", settings.style.label.weight)
                    .attr("fill", (d) => getTextColor(d.color))
                    .attr("font-family", settings.style.label.fontFamily)
                    .text((d) => settings.getLabel(d, d.y1 - d.y0))
                    .call((enter) =>
                        enter
                            .transition("add labels")
                            .duration(animationSpeed)
                            .style("opacity", (d) =>
                            (d.y0 + d.y1) / 2 * radius * (d.x1 - d.x0) < parseInt("" + settings.style.label.size) + 4 ? 0 : 1
                            )
                            .attrTween("transform", tweenTransform)
                    );
            },
            (update) =>
                update.call((update) =>
                    update
                        .transition("update labels")
                        .duration(animationSpeed)
                        .attr("fill", (d) => getTextColor(d.color))
                        .style("opacity", (d) =>
                            (d.y0 + d.y1) / 2 * radius * (d.x1 - d.x0) < parseInt("" + settings.style.label.size) + 4 ? 0 : 1
                        )
                        .text((d) => settings.getLabel(d, d.y1 - d.y0))
                        .attrTween("transform", tweenTransform)
                ),
            (exit) => exit.transition("remove labels").duration(animationSpeed).style("opacity", 0).remove()
        );

    rectangularSelection(svg, {
        clearMarking: settings.clearMarking,
        mark: settings.mark,
        ignoredClickClasses: "sector",
        classesToMark: "sector"
    });

    function getTransformData(data: any) {
        // d3.interpolate should not try to interpolate other properties
        return (({ value, x0, x1, y0, y1 }) => ({ value, x0, x1, y0, y1 }))(data);
    }

    function tweenArc(this: any, data: any) {
        let prevValue = this.__prev ? getTransformData(this.__prev) : {};
        let newValue = getTransformData(data);
        this.__prev = newValue;

        var i = interpolate(prevValue, newValue);

        return function (value: any) {
            return arc(i(value))!;
        };
    }

    function interpolate(start: any, end: any) {
        let nearestEnd = { ...end };
        if (start && end) {
            const midStartX = (start.x0 + start.x1) / 2;
            const midEndX = (end.x0 + end.x1) / 2;
            if (Math.abs(midEndX - midStartX) > Math.PI) {
                nearestEnd.x0 += 2 * Math.PI * Math.sign(midStartX - midEndX);
                nearestEnd.x1 += 2 * Math.PI * Math.sign(midStartX - midEndX);
            }
        }

        return d3.interpolate(start, nearestEnd);
    }

    function labelPosition(d: any) {
        const x = (((d.x0 + d.x1) / 2) * 180) / Math.PI;
        const y = ((d.y0 + d.y1) / 2) * radius;
        return { x, y };
    }

    function tweenTransform(this: any, data: any) {
        let prevValue = this.__prev ? getTransformData(this.__prev) : {};
        let newValue = getTransformData(data);
        this.__prev = newValue;

        var i = interpolate(prevValue, newValue);

        return function (value: any) {
            var { x, y } = labelPosition(i(value));
            return `rotate(${x - 90}) translate(${y},0) rotate(${Math.sin((Math.PI * x) / 180) >= 0 ? 0 : 180})`;
        };
    }

    function getTextColor(fillColor: string) {
        if (settings.style.background.color == "transparent") {
            return settings.style.label.color;
        }
        return contrastToLabelColor(fillColor) > 1.7 ? settings.style.label.color : settings.style.background.color;
    }

    function luminance(r: number, g: number, b: number) {
        var a = [r, g, b].map(function (v) {
            v /= 255;
            return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
        });
        return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
    }

    function contrastToLabelColor(fillColor: string) {
        var fillLuminance = luminance(
            parseInt(fillColor.substr(1, 2), 16),
            parseInt(fillColor.substr(3, 2), 16),
            parseInt(fillColor.substr(5, 2), 16)
        );
        var brightest = Math.max(fillLuminance, labelColorLuminance);
        var darkest = Math.min(fillLuminance, labelColorLuminance);
        return (brightest + 0.05) / (darkest + 0.05);
    }

    function onMouseleave(d: any) {
        d3.select("#explanation").style("visibility", "hidden");
        d3.selectAll("path").transition("mouse leave").duration(200).style("stroke", null);
        settings.onMouseLeave?.();
    }

    function onMouseover(d: any) {
        let texts = settings.getCenterText(d.data);
        settings.onMouseover?.(d.data);

        d3.select("#explanation").style("visibility", "visible");
        d3.select("#percentage").text(texts.value);
        d3.select("#value").text(texts.text);

        let ancestors = getAncestors(d);

        d3.selectAll("path").style("stroke", (d: any) =>
            ancestors.indexOf(d) >= 0 ? settings.style.marking.color : null
        );
    }
}

function getAncestors(node: d3.HierarchyNode<unknown>) {
    let path = [];
    let current = node;
    while (current.parent) {
        path.unshift(current);
        current = current.parent;
    }
    return path;
}
