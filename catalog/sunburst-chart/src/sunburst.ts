import * as d3 from "d3";
import { DataViewRow } from "spotfire-api";
import { rectangularSelection } from "./rectangularMarking";

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
    fill?: string;
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
    getId(data: unknown): string;
    getLabel(data: unknown, availablePixels: number): string;
    /** Text to place in the center while hovering sectors. */
    getCenterText(data: unknown): { value: string; text: string };
    mark(data: unknown): void;
    click(data: unknown): void;
    clearMarking(): void;
    breadcrumbs: (string | null)[];
    breadCrumbClick(index: number): void;
    animationSpeed: number;
}

export function render(hierarchy: d3.HierarchyNode<SunBurstHierarchyNode>, settings: SunBurstSettings) {
    const { size } = settings;

    const showOnlyRoot = hierarchy.height ? false : true;

    const breadcrumbsHeight = settings.breadcrumbs.length ? settings.style.label.size + 14 : 0;
    const availableHeight = size.height - breadcrumbsHeight;

    const radius = Math.min(size.width, availableHeight) / 2;

    const arc = d3
        .arc<{ x0: number; y0: number; x1: number; y1: number }>()
        .startAngle((d) => d.x0)
        .endAngle((d) => d.x1)
        .innerRadius((d) => (showOnlyRoot ? radius / 2 : d.y0))
        .outerRadius((d) => d.y1 - 1);

    const partition = d3
        .partition()
        .size([Math.PI * 2, radius])
        .padding(0.002);

    const partitionLayout = partition(hierarchy);

    const svg = d3.select(settings.containerSelector).select("svg#svg");

    let hasPreviousTransform = !!svg.select("g#container").attr("transform");

    svg.transition("resize")
        .duration(hasPreviousTransform ? settings.animationSpeed : 0)
        .attr("width", size.width)
        .attr("height", size.height);

    svg.select("g#container")
        .on("mouseleave", onMouseleave)
        .transition("move")
        .duration(hasPreviousTransform ? settings.animationSpeed : 0)
        .attr("transform", "translate(" + size.width / 2 + "," + (availableHeight / 2 + breadcrumbsHeight) + ")");

    const visibleSectors = partitionLayout
        .descendants()
        .filter((d: any) => (d.depth || showOnlyRoot) && d.data.fill !== "transparent");

    const innerRadius = visibleSectors.reduce((p, c) => (c.y0 < p ? c.y0 : p), radius);

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
        .style("stroke-width", 1)
        .style("opacity", 0)
        .attr("fill", (d: any) => d.data.fill);

    sectors
        .merge(newSectors)
        .attr("class", "sector")
        .on("click", (d) => {
            settings.click(d.data);
            d3.event.stopPropagation();
        })
        .on("mouseover.hover", onMouseover)
        .transition("add sectors")
        .duration(settings.animationSpeed)
        .attrTween("d", tweenArc)
        .style("opacity", 1)
        .style("stroke", stroke)
        .attr("fill", (d: any) => d.data.fill);

    sectors
        .exit()
        .style("stroke", "transparent")
        .transition("remove sectors")
        .duration(settings.animationSpeed)
        .attr("fill", "transparent")
        .end()
        .then(
            () => sectors.exit().remove(),
            () => sectors.exit().remove()
        );

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
                    .attr("fill", (d: any) => getTextColor(d.data.fill))
                    .attr("font-family", settings.style.label.fontFamily)
                    .text((d) => settings.getLabel(d.data, d.y1 - d.y0))
                    .call((enter) =>
                        enter
                            .transition("add labels")
                            .duration(settings.animationSpeed)
                            .style("opacity", (d) => (d.y0 * (d.x1 - d.x0) < settings.style.label.size + 4 ? 0 : 1))
                            .attrTween("transform", tweenTransform)
                    );
            },
            (update) =>
                update.call((update) =>
                    update
                        .transition("update labels")
                        .duration(settings.animationSpeed)
                        .attr("fill", (d: any) => getTextColor(d.data.fill))
                        .style("opacity", (d) =>
                            d.y0 * (d.x1 - d.x0) < parseInt("" + settings.style.label.size) + 4 ? 0 : 1
                        )
                        .text((d) => settings.getLabel(d.data, d.y1 - d.y0))
                        .attrTween("transform", tweenTransform)
                ),
            (exit) => exit.transition("remove labels").duration(settings.animationSpeed).style("opacity", 0).remove()
        );

    d3.select("#breadcrumbs")
        .selectAll("div.breadcrumb")
        .data(settings.breadcrumbs)
        .join(
            (enter) => {
                return enter
                    .append("div")
                    .attr("class", "breadcrumb")
                    .attr("title", (d) => d)
                    .style("font-size", settings.style.label.size)
                    .style("font-style", settings.style.label.style)
                    .style("font-weight", settings.style.label.weight)
                    .style("font-family", settings.style.label.fontFamily)
                    .on("click", (d, i) => settings.breadCrumbClick(i))
                    .text((d) => d);
            },
            (update) =>
                update.call((update) =>
                    update
                        .on("click", (_, i) => settings.breadCrumbClick(i))
                        .attr("title", (d) => d)
                        .text((d) => d)
                ),
            (exit) => exit.remove()
        );

    rectangularSelection(svg, {
        clearMarking: settings.clearMarking,
        mark: (d: any) => settings.mark(d.data),
        getCenter(d: any) {
            let c = arc.centroid(d);
            return { x: c[0] + size.width / 2, y: c[1] + size.height / 2 };
        },
        ignoredClickClasses: ["sector"],
        markingSelector: ".sector",
        centerMarking: true
    });

    d3.select("#explanation")
        .style("--size", innerRadius * 2 + "px")
        .style("--padding", 5 + "px")
        .style("--padding-top", innerRadius / 3 + "px")
        .style("--top", size.height / 2 + breadcrumbsHeight / 2 + "px");

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
        d3.selectAll("path").transition("sector hover").duration(settings.animationSpeed).style("stroke", stroke);
        settings.onMouseLeave?.();
    }

    function onMouseover(d: any) {
        let texts = settings.getCenterText(d.data);
        settings.onMouseover?.(d.data);

        let explanationElem = document.querySelector("#explanation") as HTMLDivElement;
        let paddingWrapper = document.querySelector("#padding-wrapper") as HTMLDivElement;
        paddingWrapper.style.paddingTop = "0px";

        d3.select("#explanation").style("visibility", "visible");
        d3.select("#percentage")
            .text(texts.value)
            .style("--percentage-size", Math.max(innerRadius / 5, 10) + "px");
        d3.select("#value")
            .text(texts.text)
            .style("--value-size", Math.max(innerRadius / 7, 8) + "px");

        let showEllipsis = explanationElem.offsetHeight < explanationElem.scrollHeight;

        paddingWrapper.style.paddingTop = Math.max(5, (innerRadius * 2 - paddingWrapper.offsetHeight) / 2.5) + "px";

        // Display ellipsis character at the end if the circle overflows.
        (document.querySelector("#value-ellipsis") as HTMLDivElement)!.style.display = showEllipsis ? "block" : "none";

        let ancestors = getAncestors(d);

        d3.selectAll("path")
            .transition("sector hover")
            .duration(100)
            .style("stroke", (d: any) => (ancestors.indexOf(d) >= 0 ? settings.style.marking.color : stroke(d)));
    }
}

function stroke(d: any = {}) {
    return d.data && d.data.actualValue < 0 ? "red" : "transparent";
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
