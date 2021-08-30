import * as d3 from "d3";
import { markingInProgress, rectangularSelection } from "./rectangularMarking";

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
    getLabel(data: unknown, availablePixels: number): string;
    /** Text to place in the center while hovering sectors. */
    getCenterText(data: unknown): { value: string; text: string };
    mark(data: unknown): void;
    clearMarking(): void;
}

export async function render(hierarchy: d3.HierarchyNode<unknown>, settings: SunBurstSettings) {
    await markingInProgress();

    const { size } = settings;
    const prevSvg = document.querySelector(settings.containerSelector + " svg");
    if (prevSvg) {
        document.querySelector(settings.containerSelector)!.removeChild(prevSvg);
    }

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
        .append("svg:svg")
        .attr("width", size.width)
        .attr("height", size.height);
    const container = svg
        .append("svg:g")
        .attr("transform", "translate(" + size.width / 2 + "," + size.height / 2 + ")");

    const visibleSectors = partitionLayout
        .descendants()
        .filter((d) => d.depth && settings.getFill(d.data) !== "transparent");

    const sectors = container.append("svg:g").attr("id", "container");

    const labelColorLumincance = luminance(
        parseInt(settings.style.label.color.substr(1, 2), 16),
        parseInt(settings.style.label.color.substr(3, 2), 16),
        parseInt(settings.style.label.color.substr(5, 2), 16)
    );

    sectors
        .data([hierarchy])
        .selectAll("path")
        .data(visibleSectors)
        .enter()
        .append("svg:path")
        .attr("d", arc)
        .attr("class", "sector")
        .on("click", (d) => {
            settings.mark(d.data);
            d3.event.stopPropagation();
        })
        .style("stroke-width", 2)
        .style("fill", (d) => settings.getFill(d.data))
        .on("mouseover", onMouseover);

    container
        .append("g")
        .attr("pointer-events", "none")
        .attr("text-anchor", "middle")
        .selectAll("text")
        .data(visibleSectors.filter((d) => ((d.y0 + d.y1) / 2) * (d.x1 - d.x0) > settings.style.label.size))
        .join("text")
        .attr("transform", function (d) {
            const x = (((d.x0 + d.x1) / 2) * 180) / Math.PI;
            const y = (d.y0 + d.y1) / 2;
            return `rotate(${x - 90}) translate(${y},0) rotate(${x < 180 ? 0 : 180})`;
        })
        .attr("dy", "0.35em")
        .attr("font-size", settings.style.label.size)
        .attr("font-style", settings.style.label.style)
        .attr("font-weight", settings.style.label.weight)
        .attr("fill", (d) => getTextColor(settings.getFill(d.data)))
        .attr("font-family", settings.style.label.fontFamily)
        .text((d) => settings.getLabel(d.data, d.y1 - d.y0));

    d3.select("#container").on("mouseleave", onMouseleave);

    rectangularSelection(svg, {
        clearMarking: settings.clearMarking,
        mark: settings.mark,
        ignoredClickClasses: "sector",
        classesToMark: "sector"
    });

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
