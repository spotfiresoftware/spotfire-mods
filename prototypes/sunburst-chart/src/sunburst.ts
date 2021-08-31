import * as d3 from "d3";
import { rectangularSelection } from "./rectangularMarking";

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
    totalSize: number;
    getFill(data: unknown): string;
    getId(data: unknown): string;
    getLabel(data: unknown, availablePixels: number): string;
    /** Text to place in the center while hovering sectors. */
    getCenterText(data: unknown): { value: string; text: string };
    mark(data: unknown): void;
    clearMarking(): void;
}

export function render(hierarchy: d3.HierarchyNode<unknown>, settings: SunBurstSettings) {
    const animationSpeed = 250;
    const { size } = settings;

    const radius = Math.min(size.width, size.height) / 2;

    const arc = d3
        .arc<{ x0: number; y0: number; x1: number; y1: number }>()
        .startAngle((d) => d.x0)
        .endAngle((d) => d.x1)
        .padAngle((d) => Math.min((d.x1 - d.x0) / 2, 0.01))
        .padRadius(radius / 2)
        .innerRadius((d) => d.y0)
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
        .filter((d) => d.depth && settings.getFill(d.data) !== "transparent");

    const sectors = svg
        .select("g#sectors")
        .selectAll("path")
        .data(visibleSectors, (d: any) => {
            return settings.getId(d.data);
        });

    const labelColorLumincance = luminance(
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
        .style("stroke-width", 2)
        .style("opacity", 0)
        .attr("fill", (d: any) => settings.getFill(d.data))
        .on("mouseover", onMouseover);

    sectors
        .merge(newSectors)
        .transition()
        .duration(animationSpeed)
        .attrTween("d", tweenArc)
        .style("opacity", 1)
        .attr("fill", (d: any) => settings.getFill(d.data));

    sectors.exit().transition().duration(animationSpeed).attr("fill", "transparent").remove();

    svg.select("g#labels")
        .attr("pointer-events", "none")
        .attr("text-anchor", "middle")
        .selectAll("text")
        .data(
            visibleSectors.filter((d) => ((d.y0 + d.y1) / 2) * (d.x1 - d.x0) > settings.style.label.size),
            (d: any) => `label-${settings.getId(d.data)}`
        )
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
                            .transition()
                            .duration(animationSpeed)
                            .style("opacity", 1)
                            .attrTween("transform", tweenTransform)
                    );
            },
            (update) =>
                update.call((update) =>
                    update
                        .transition()
                        .duration(animationSpeed)
                        .attr("fill", (d) => getTextColor(settings.getFill(d.data)))
                        .style("opacity", 1)
                        .text((d) => settings.getLabel(d.data, d.y1 - d.y0))
                        .attrTween("transform", tweenTransform)
                ),
            (exit) => exit.transition().duration(animationSpeed).style("opacity", 0).remove()
        );

    d3.select("#container").on("mouseleave", onMouseleave);

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
        const y = (d.y0 + d.y1) / 2;
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
        var brightest = Math.max(fillLuminance, labelColorLumincance);
        var darkest = Math.min(fillLuminance, labelColorLumincance);
        return (brightest + 0.05) / (darkest + 0.05);
    }

    function onMouseleave(d: any) {
        d3.select("#explanation").style("visibility", "hidden");
        d3.selectAll("path").transition().duration(200).style("stroke", "transparent");
        settings.onMouseLeave?.();
    }

    function onMouseover(d: any) {
        let texts = settings.getCenterText(d.data);
        settings.onMouseover?.(d.data);

        d3.select("#explanation").style("visibility", "visible");
        d3.select("#percentage").text(texts.value);
        d3.select("#value").text(texts.text);

        let ancestors = getAncestors(d);

        d3.selectAll("path").style("stroke", "transparent");

        sectors
            .selectAll("path")
            .filter((node: any) => ancestors.indexOf(node) >= 0)
            .style("stroke", settings.style.marking.color);
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
