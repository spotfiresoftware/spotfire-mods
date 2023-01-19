import * as d3 from "d3";
import { BaseType } from "d3";
import { Size } from "spotfire-api";
import { rectangularSelection } from "./rectangularMarking";
import { CellContent } from "./resources";
import { asyncForeach } from "./util";

const padding = 0.1;
export interface SplomDataset {
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
    data: SplomDataset,
    diagonal: CellContent | null,
    upper: CellContent | null,
    lower: CellContent | null,
    size: Size,
    hasExpired: () => Promise<boolean>
) {
    //console.log(data);
    const measureCount = data.measures.length;
    const { clientWidth, clientHeight } = document.querySelector("#canvas-content")!;
    const width = clientWidth / measureCount;
    const height = clientHeight / measureCount;

    let cells = data.measures.flatMap((_, x) =>
        data.measures.map((_, y) => ({
            x,
            y
        }))
    );

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
        xAxis: d3.axisBottom(a.xScale).ticks(Math.max(2, Math.min(5, width / 100))),
        yAxis: d3.axisLeft(a.yScale).ticks(Math.max(2, Math.min(5, height / 100)))
    }));

    // Create the html cells and the border
    const htmlCells = data.measures
        .map((_, row) =>
            data.measures.map((_, col) => {
                const cell = document.createElement("div");
                cell.style.gridRow = `${row + 1}`;
                cell.style.gridColumn = `${col + 1}`;
                cell.id = `html-cell-${row}-${col}`;
                return cell;
            })
        )
        .flat();

    document.querySelector("#html-content")?.replaceChildren(...htmlCells);

    // TODO drawCell uses context :(
    let { canvas, context } = createCanvas();
    try {
        await asyncForeach(cells, drawCell);
    } catch {
        // Wait for next render loop when data expires
        //return;
    }

    document.querySelector("#canvas-content")!.replaceChildren(canvas);
    document.querySelector("#y-axes")!.textContent = "";
    document.querySelector("#x-axes")!.textContent = "";

    const d3_y_axes = d3.select("#y-axes");
    const d3_x_axes = d3.select("#x-axes");
    const top_measures = document.querySelector("#top-grid");
    const right_measures = document.querySelector("#right-grid");

    function createMeasureName(name: string) {
        const div = document.createElement("div");
        div.textContent = name;
        div.title = name;
        return div;
    }

    // Create all scales
    scales.forEach((_, i) => {
        d3_x_axes
            .append("svg:g")
            .attr("class", "xAxis")
            .attr("transform", () => `translate(${(i + padding) * width} 0) `)
            .call(axes[i].xAxis as any);
        d3_y_axes
            .append("svg:g")
            .attr("class", "yAxis")
            .attr("transform", () => `translate(49 ${i * height + padding * height}) `)
            .call(axes[i].yAxis as any);
    });

    top_measures?.replaceChildren(...data.measures.map(createMeasureName));
    right_measures?.replaceChildren(...data.measures.map(createMeasureName));

    async function drawCell(cell: { x: number; y: number }) {
        if (await hasExpired()) {
            throw "Dataview expired";
        }

        const col = cell.x;
        const row = cell.y;

        let content = row == col ? diagonal : row > col ? lower : upper;
        let htmlCell = document.querySelector(`#html-cell-${row}-${col}`)!;
        switch (content) {
            case CellContent.ScatterPlot:
                drawScatterCell(row, col, htmlCell);
                break;
            case CellContent.Stats:
                htmlCell.textContent = `TODO - Calculate stats (min, max, mean, quartiles etc for ${data.measures[row]}.`;
                break;
            case CellContent.BoxPlot:
                htmlCell.textContent = `TODO - Box plot for ${data.measures[row]}.`;
                break;
            case CellContent.CorrelationColor:
                htmlCell.textContent = `TODO - Calculate correltation between ${data.measures[row]} and ${data.measures[col]} and show as color.`;
                break;
            case CellContent.CorrelationStat:
                htmlCell.textContent = `TODO - Calculate correltation between ${data.measures[row]} and ${data.measures[col]} and show the numbers.`;
                break;
            case CellContent.Density:
                htmlCell.textContent = `TODO - Show a density plot for ${data.measures[row]} using a kernel density estimation.`;
                break;
            case CellContent.Histogram:
                htmlCell.textContent = `TODO - Show a histogram for ${data.measures[row]}. Determine bins from available size.`;
                break;
            case CellContent.HeatMap:
                htmlCell.textContent = `TODO - Show a heatmap for ${data.measures[row]} vs ${data.measures[col]}. Determine bins from available size.`;
                break;
            case CellContent.ContourPlot:
                htmlCell.textContent = `TODO - Show a contour plot for ${data.measures[row]} vs ${data.measures[col]}.`;
                break;
            case CellContent.Blank:
                // Content is blank by default
                break;
        }
    }

    function drawScatterCell(row: number, col: number, element: Element) {
        const lineWidth = Math.max(0.2, Math.min(width, height) / 4000);

        data.points.forEach(getRenderer(false));
        data.points.forEach(getRenderer(true));
        var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("style", `position:absolute;width:${Math.floor(clientWidth / measureCount) - padding * measureCount}px;height:${Math.floor(clientHeight / measureCount) - padding * measureCount}px`);
        svg.setAttribute("viewBox", `0 0 ${Math.floor(clientWidth / measureCount) - padding * measureCount} ${Math.floor(clientHeight / measureCount) - padding * measureCount}`);
        element.appendChild(svg);
        rectangularSelection(d3.select<BaseType, any>(svg), {
            clearMarking: () => console.log("Clear marking"),
            mark: (data: unknown) => console.log("Mark", data),
            ignoredClickClasses: [],
            classesToMark: ""
        });

        function getRenderer(renderMarkedRows: boolean) {
            return (point: (number | null)[], index: number) => {
                if (typeof point[col] == "number" && typeof point[row] == "number" && data.marked[index] == renderMarkedRows) {
                    const left = scales[col].xScale(point[col]!)! + (padding + col) * (clientWidth / measureCount);
                    const top = scales[row].yScale(point[row]!)! + (padding + row) * (clientHeight / measureCount);
                    const r = Math.min(clientHeight, clientWidth) / 50 / measureCount;
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

    function createCanvas() {
        let canvas = document.createElement("canvas");
        canvas.setAttribute("width", `${clientWidth}px`);
        canvas.setAttribute("height", `${clientHeight}px`);
        canvas.style.left = "0";
        canvas.style.top = "0";
        canvas.style.position = "absolute";
        return { canvas, context: canvas.getContext("2d") };
    }
}
