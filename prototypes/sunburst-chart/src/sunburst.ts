import * as d3 from "d3";
import { DataViewRow } from "spotfire-api";
import { rectangularSelection } from "./rectangularMarking";

const animationSpeed = 250;

export interface SunBurstHierarchyNode {
    hasVirtualChildren?: boolean;
    mark: (operation?: any) => void;
    level: number;
    key: any;
    parent?: any;
    markedRowCount: () => number;
    formattedValue: () => string;
    formattedPath: () => string;
    leafCount: () => number;
    children?: SunBurstHierarchyNode[];
    rows: () => DataViewRow[];
    virtualLeaf?: boolean;
    actualValue?: number;
}

export interface SunBurstSettings {
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

export function render(hierarchy: d3.HierarchyNode<SunBurstHierarchyNode>, settings: SunBurstSettings) {
    const { size } = settings;

    const showOnlyRoot = hierarchy.height ? false : true;

    const radius = Math.min(size.width, size.height) / 2;

    const arc = d3
        .arc<{ x0: number; y0: number; x1: number; y1: number }>()
        .startAngle((d) => d.x0)
        .endAngle((d) => d.x1)
        .padAngle((d) => Math.min((d.x1 - d.x0) / 2, 0.01))
        .padRadius(radius / 2 * hierarchy.depth )
        .innerRadius((d) => (showOnlyRoot ? radius / 2 : d.y0))
        .outerRadius((d) => d.y1 - 1);

    const partition = d3.partition().size([Math.PI * 2, radius]);

    const partitionLayout = partition(hierarchy);

    const svg = d3
        .select(settings.containerSelector)
        .select("svg#svg")
        .attr("width", size.width)
        .attr("height", size.height);
    svg.select("g#container").attr("transform", "translate(" + size.width / 2 + "," + size.height / 2 + ")");

    const visibleSectors = partitionLayout
        .descendants()
        .filter((d) => (d.depth || showOnlyRoot) && settings.getFill(d.data) !== "transparent");

    const sectors = svg
        .select("g#sectors")
        .selectAll("path")
        .data(visibleSectors, (d: any) => {
            return settings.getId(d.data);
        });

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
            settings.mark(d.data);
            d3.event.stopPropagation();
        })
        .style("stroke-width", 1)
        .style("opacity", 0)
        .attr("fill", (d: any) => settings.getFill(d.data));

    sectors
        .merge(newSectors)
        .attr("class", (d: any) => (d.data && d.data.actualValue < 0 ? "negative sector" : "sector"))
        .transition("add sectors")
        .duration(animationSpeed)
        .attrTween("d", tweenArc)
        .style("opacity", 1)
        .attr("fill", (d: any) => settings.getFill(d.data))
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
        .selectAll("text")
        .data(visibleSectors, (d: any) => `label-${settings.getId(d.data)}`)
        .join(
            (enter) => {
                return enter
                    .append("text")
                    .style("opacity", 0)
                    .attr("dy", "0.35em")
                    .attr("font-size", settings.style.label.size)
                    .attr("font-style", settings.style.label.style)
                    .attr("font-weight", settings.style.label.weight)
                    .attr("fill", (d) => getTextColor(settings.getFill(d.data)))
                    .attr("font-family", settings.style.label.fontFamily)
                    .text((d) => settings.getLabel(d.data, d.y1 - d.y0))
                    .call((enter) =>
                        enter
                            .transition("add labels")
                            .duration(animationSpeed)
                            .style("opacity", (d) =>
                                d.y0 * (d.x1 - d.x0) < parseInt("" + settings.style.label.size) + 4 ? 0 : 1
                            )
                            .attrTween("transform", tweenTransform)
                    );
            },
            (update) =>
                update.call((update) =>
                    update
                        .transition("update labels")
                        .duration(animationSpeed)
                        .attr("fill", (d) => getTextColor(settings.getFill(d.data)))
                        .style("opacity", (d) =>
                            d.y0 * (d.x1 - d.x0) < parseInt("" + settings.style.label.size) + 4 ? 0 : 1
                        )
                        .text((d) => settings.getLabel(d.data, d.y1 - d.y0))
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

        var i = d3.interpolate(prevValue, newValue);

        return function (value: any) {
            return arc(i(value))!;
        };
    }

    function labelPosition(d: any) {
        const x = (((d.x0 + d.x1) / 2) * 180) / Math.PI;
        const y = (d.y0 + d.y1) / 2;
        return { x, y };
    }

    function tweenTransform(this: any, data: any) {
        let prevValue = this.__prev ? getTransformData(this.__prev) : {};
        let newValue = getTransformData(data);
        this.__prev = newValue;

        var i = d3.interpolate(prevValue, newValue);

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
