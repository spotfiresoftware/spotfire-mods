import * as d3 from "d3";
import { Tooltip } from "spotfire-api";
import { rectangularSelection } from "./rectangularMarking";

export enum LabelFor {
    none = "off",
    marked = "marked",
    all = "all"
}

type HexColor = `#${string}`;

export interface LabelSettings {
    labelOutside: boolean;
    showName: boolean;
    showQuantity: boolean;
    showPercentage: boolean;
    multiLine: boolean;
    color: string;
    size: number;
    family: string;
    style: string;
}

export interface FunnelSettings {
    showOnlyMarked: boolean;
    labelsFor: string | null;
    tooltip: Tooltip;
    labelSettings: LabelSettings;
}

interface ColorSettings {
    backGround : HexColor | string;
    marking: string;
}

export interface FunnelData {
    colors: ColorSettings;
    value: number;
    label: string;
    isMarked: boolean;
    clearMarking(): void;
    mark(): void;
    displayValues: boolean;
    rectCoords?: RectCoords;
    percentage?: number;
    row: any;
}

interface RectCoords {
    x1: number;
    x2: number;
    y1: number;
    y2: number;
}

const START_Y = 80;
const FY = 800;
let FULL_WIDTH = 180;
let CENTER = 0;
let lineGenerator = d3.line();

/**
 * Render the visualization
 * @param {Spotfire.Size} size
 * @param {Object} data
 */
export async function funnel(size: Spotfire.Size, data: FunnelData[], settings: FunnelSettings) {
    let width = size.width;
    let height = size.height;
    FULL_WIDTH = Math.round(size.width / 6);
    CENTER = Math.round(size.width / 2);
    data = data.sort((a: FunnelData, b: FunnelData) => b.value! - a.value!);
    let original_data = data;
    if (settings.showOnlyMarked) {
        data = data.filter((d) => d.isMarked);
    }
    data = data.length == 0 ? original_data : data;
    d3.select("#svg").remove();

    const svg = d3
        .select("#mod-container")
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("id", "svg")
        .style("display", "block")
        .style("margin", "auto");

    renderProcesses(size, svg, data, settings);
}

function renderProcesses(size: Spotfire.Size, svg: any, processes: FunnelData[], settings: FunnelSettings) {
    let start_value = processes[0].value;

    if (start_value == null) {
        return;
    }

    let height_delta = Math.round(size.height / processes.length) - Math.round(size.height / (processes.length * 10));
    let width_percentage = 1.0;
    let rectCoords: RectCoords = { x1: 0, x2: 0, y1: 0, y2: 0 };
    let margin = Math.round(size.height/(processes.length * 10));
    for (let i = 0; i < processes.length; i++) {
        if (processes[i] == null || processes[i] == undefined) {
            break;
        }

        processes[i].percentage = processes[i].value! / start_value;

        rectCoords.y1 = START_Y + height_delta * i;
        rectCoords.y2 = rectCoords.y1 + height_delta - margin;
        rectCoords.x1 = Math.round(FULL_WIDTH * width_percentage);
        rectCoords.x2 = Math.round(FULL_WIDTH * (processes[i].value! / start_value));

        processes[i].rectCoords = rectCoords;

        let recPoints: [number, number][] = formatPoints(rectCoords);
        let pathData: string | null = lineGenerator(recPoints);

        if (pathData === null) {
            break;
        }

        svg.append("path")
            .attr("d", pathData)
            .attr("class", "sector")
            .attr("id", processes[i].label)
            .attr("fill", processes[i].colors.backGround)
            .attr("stroke", "none")
            //.attr("stroke", processes[i].color)
            .on("mouseover.hover", function(this : SVGPathElement) {
                let tooltipInfo = [
                    processes[i].label,
                    processes[i].value,
                    `${((processes[i].value! / start_value) * 100).toFixed(2)}%`
                ].join("\n");
                settings.tooltip.show(tooltipInfo);
                d3.select(this).attr("stroke", processes[i].colors.marking);
                d3.event.stopPropagation();
            })
            .on("mouseleave", function(this : SVGPathElement) {
                settings.tooltip.hide();
                d3.select(this).attr("stroke", "none");
                d3.event.stopPropagation();
            })
            .on("click", processes[i].mark);

        rectangularSelection(svg, {
            clearMarking: processes[i].clearMarking,
            mark: processes[i].mark,
            ignoredClickClasses: ["sector", "label", "label-path"],
            markingSelector: ".sector",
            centerMarking: true,
            processes: processes
        });
        if (settings.labelsFor == LabelFor.all || (settings.labelsFor == LabelFor.marked && processes[i].isMarked)) {
            renderProcessText(svg, rectCoords, processes[i], start_value, settings.labelSettings);
        }
        width_percentage = processes[i].value! / start_value;
    }
}

function formatPoints(rectCoords: RectCoords): [number, number][] {
    let { x1, x2, y1, y2 } = rectCoords;
    let dx1 = Math.round(x1 / 2);
    let dx2 = Math.round(x2 / 2);
    return [
        [CENTER - dx1, y1],
        [CENTER + dx1, y1],
        [CENTER + dx2, y2],
        [CENTER - dx2, y2],
        [CENTER - dx1, y1]
    ];
}

function renderProcessText(
    svg: any,
    coords: RectCoords,
    process: FunnelData,
    start_value: number,
    settings: LabelSettings
) {
    let { y1, y2 } = coords;
    let x = settings.labelOutside ? CENTER / 1.4 : CENTER;
    let anchor = settings.labelOutside ? "end" : "middle";
    if (settings.multiLine) {
        svg.append("text")
            .text(process.label)
            .attr("x", x)
            .attr("y", y1 + Math.round((y2 - y1) / 2))
            .attr("font-style", settings.style)
            .attr("text-color", settings.color)
            .attr("font-family", settings.family)
            .attr("font-size", `${settings.size}px`)
            .attr("text-anchor", anchor);
        svg.append("text")
            .attr("x", x)
            .attr("y", y1 + Math.round((y2 - y1) / 2) + 20)
            .attr("text-anchor", anchor)
            .attr("font-style", settings.style)
            .attr("text-color", settings.color)
            .attr("font-family", settings.family)
            .attr("font-size", `${settings.size}px`)
            .text(renderNumericalText(start_value, process, settings));
    } else {
        svg.append("text")
            .text(renderLabel(start_value, process, settings))
            .attr("x", x)
            .attr("y", y1 + Math.round((y2 - y1) / 2))
            .attr("text-anchor", anchor)
            .attr("font-style", settings.style)
            .attr("text-color", settings.color)
            .attr("font-family", settings.family)
            .attr("font-size", `${settings.size}px`);
    }
}

function renderLabel(start_value: number, process: FunnelData, settings: LabelSettings): string {
    if (!settings.showName) {
        return renderNumericalText(start_value, process, settings);
    } else if (settings.showPercentage || settings.showPercentage) {
        return `${renderNumericalText(start_value, process, settings)}`;
    } else {
        return process.label!;
    }
}

function renderNumericalText(start_value: number, process: FunnelData, settings: LabelSettings): string {
    if (settings.showPercentage && settings.showQuantity) {
        return `${process.value!.toLocaleString()} / ${((process.value! / start_value) * 100).toFixed(2)}%`;
    } else if (settings.showPercentage) {
        return `${((process.value! / start_value) * 100).toFixed(2)}%`;
    } else if (settings.showQuantity) {
        return `${process.value!.toLocaleString()}`;
    } else {
        return "";
    }
}
