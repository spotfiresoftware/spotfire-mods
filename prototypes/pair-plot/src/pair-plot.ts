import * as d3 from "d3";
import { Size } from "spotfire-api";
import { rectangularSelection } from "./rectangularMarking";
import { DiagonalContent, TriangleContent } from "./resources";
import { asyncForeach } from "./util";

const padding = 0.1;
export interface PairPlotData {
    measures: string[];
    points: (number | null)[][];
    mark: (index: number) => void;
    marked: boolean[];
    count: number[] | null;
    colors: string[];
    tooltips: (() => void)[];
    hideTooltips: () => void;
}

export async function render(
    data: PairPlotData,
    diagonal: DiagonalContent | null,
    upper: TriangleContent | null,
    lower: TriangleContent | null,
    size: Size,
    hasExpired: () => Promise<boolean>
) {
    const measureCount = data.measures.length;

    const d3Content = document.querySelector("#plot-content")!;
    var { clientWidth, clientHeight } = d3Content;

    let cells = data.measures.flatMap((_, x) =>
        data.measures.map((_, y) => ({
            x,
            y
        }))
    );

    let nonDiagonalCells = cells.filter((d) => d.x != d.y);

    const width = clientWidth / measureCount;
    const height = clientHeight / measureCount;

    d3Content.innerHTML = "";
    const svg = d3.select("#plot-content");

    const scales = data.measures
        .map((_, i) => data.points.map((p) => p[i]).filter((v) => v != null))
        .map((values) => {
            const min = Math.min(...(values as number[]));
            const max = Math.max(...(values as number[]));
            return {
                xScale: d3
                    .scaleLinear()
                    .domain([min, max])
                    .range([0, width * (1 - 2 * padding)]),
                yScale: d3
                    .scaleLinear()
                    .domain([max, min])
                    .range([0, height * (1 - 2 * padding)])
            };
        });

    const axes = scales.map((a) => ({
        xAxis: d3.axisTop(a.xScale).ticks(Math.max(2, Math.min(5, width / 100))),
        yAxis: d3.axisRight(a.yScale).ticks(Math.max(2, Math.min(5, height / 100)))
    }));

    svg.selectAll(".outline")
        .data(cells)
        .enter()
        .append("svg:rect")
        .attr("class", "outline")
        .attr("width", width)
        .attr("height", height)
        .attr("x", (d) => d.x * width)
        .attr("y", (d) => d.y * height)
        .style("stroke", "#bbb")
        .style("stroke-width", 1)
        .style("fill", "transparent");

    scales.forEach((_, i) => {
        svg.append("svg:g")
            .attr("class", "xAxis")
            .attr("transform", () => `translate(${i * width + padding * width} ${measureCount * height - 1}) `)
            .call(axes[i].xAxis as any);
        svg.append("svg:g")
            .attr("class", "yAxis")
            .attr("transform", () => `translate(0 ${i * height + padding * height}) `)
            .call(axes[i].yAxis as any);
        svg.append("svg:g")
            .attr("class", "measureName")
            .append("svg:text")
            .attr("x", () => `${Math.round(((2 * i + 1) / (2 * measureCount)) * 100)}%`)
            .attr("y", () => `${Math.round(((2 * i + 1) / (2 * measureCount)) * 100)}%`)
            .attr("dominant-baseline", "bottom")
            .attr("text-anchor", "middle")
            .text((_) => `TODO - Show ${diagonal} for ${data.measures[i]}`);
    });

    let { cell, context } = createCanvasContext();
    try {
        await asyncForeach(nonDiagonalCells, drawCell);
    } catch {
        // Wait for next render loop
    }

    document.querySelector("#canvas-content")!.replaceChildren(cell);

    async function drawCell(cell: { x: number; y: number }) {
        if (await hasExpired()) {
            throw "Dataview expired";
        }

        const row = cell.x;
        const col = cell.y;

        let content = row > col ? upper : lower;
        switch (content) {
            case TriangleContent.ScatterPlot:
                drawScatterCell(row, col);
        }
    }

    function drawScatterCell(row: number, col: number) {
        const lineWidth = Math.max(0.2, Math.min(width, height) / 4000);

        data.points.forEach(getRenderer(false));
        data.points.forEach(getRenderer(true));

        function getRenderer(renderMarkedRows: boolean) {
            return (point: (number | null)[], index: number) => {
                if (point[col] && point[row] && data.marked[index] == renderMarkedRows) {
                    const left = scales[row].xScale(point[row]!)! + (padding + row) * (size.width / measureCount);
                    const top = scales[col].yScale(point[col]!)! + (padding + col) * (size.height / measureCount);
                    const r = Math.min(size.height, size.width) / 50 / measureCount;
                    const color = data.colors[index];
                    if (context) {
                        context.beginPath();
                        context.arc(left, top, r, 0, 2 * Math.PI);
                        context.fillStyle = color;
                        context.fill();
                        context.lineWidth = lineWidth;
                        context.strokeStyle = "black";
                        context.stroke();
                    }
                }
            };
        }
    }

    function createCanvasContext() {
        let cell = document.createElement("canvas");
        cell.setAttribute("width", `${size.width}px`);
        cell.setAttribute("height", `${size.height}px`);
        cell.style.left = "0";
        cell.style.top = "0";
        cell.style.position = "absolute";
        return { cell, context: cell.getContext("2d") };
    }
}
