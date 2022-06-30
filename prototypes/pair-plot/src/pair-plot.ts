import * as d3 from "d3";
import { Size } from "spotfire-api";
import { Diagonal } from "./index";
import { rectangularSelection } from "./rectangularMarking";
import { nonBlockingForEach } from "./util";

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

export async function render(data: PairPlotData, diagonal: Diagonal, size: Size, dataView: Spotfire.DataView) {
    console.log(data);
    const useCanvas = data.points.length * data.measures.length > 10000;
    const measureCount = data.measures.length;

    document.querySelector("#canvas-content")!.textContent = "";

    const d3Content = document.querySelector("#plot-content")!;
    var { clientWidth, clientHeight } = d3Content;

    const width = clientWidth / measureCount;
    const height = clientHeight / measureCount;

    d3Content.innerHTML = "";
    const svg = d3.select("#plot-content");

    let cells = data.measures.flatMap((_, x) =>
        data.measures.map((_, y) => ({
            x,
            y
        }))
    );

    let scatterCells = cells.filter((d) => d.x != d.y);

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
            .text((_) =>
                diagonal == "measure-names" ? data.measures[i] : `TODO - Show ${diagonal} for ${data.measures[i]}`
            );
    });

    if (useCanvas) {
        await nonBlockingForEach(scatterCells, drawScatterCell);
    } else {
        let scatterCell = svg
            .attr("viewBox", `0 0 ${clientWidth} ${clientHeight}`)
            .selectAll(".scatterCell")
            .data(scatterCells)
            .enter()
            .append("svg:g")
            .attr("class", "scatterCell")
            .attr("transform", (d) => `translate(${d.x * width + padding * width} ${d.y * height + padding * height}) `)
            .attr("width", width * (1 - 2 * padding))
            .attr("height", height * (1 - 2 * padding));

        const d3Circles = scatterCell
            .selectAll("circle")
            .data(
                (d) =>
                    data.points
                        .map((p, index) => {
                            const x = p[d.x];
                            const y = p[d.y];
                            return x && y ? { x: scales[d.x].xScale(x), y: scales[d.y].yScale(y), index } : null;
                        })
                        .filter((p) => p != null),
                (d) => ""
            )
            .enter()
            .append("circle")
            .attr("class", "circle")
            .attr("cx", (d) => d!.x!)
            .attr("cy", (d) => d!.y!)
            .attr("r", Math.min(width, height) / 50)
            .attr("fill", (d) => data.colors[d!.index])
            .attr("stroke", "black")
            .attr("stroke-width", Math.min(2, Math.min(width, height) / 500))
            .on("click", (d) => data.mark(d!.index))
            .on("mouseover", (d) => {
                data.tooltips[d!.index]();
            })
            .on("mouseleave", (_) => {
                data.hideTooltips();
            });

        scatterCell.exit().remove();
        d3Circles.exit().remove();

        rectangularSelection(svg, {
            clearMarking: () => {},
            mark: (d: any) => data.mark(d.index),
            ignoredClickClasses: ["circle"],
            classesToMark: "circle"
        });
    }

    async function drawScatterCell(cell: { x: number; y: number }) {
        if (await dataView.hasExpired()) {
            document.querySelector("#canvas-content")!.textContent = "";
            return;
        }

        const row = cell.x;
        const col = cell.y;
        let cc = createCanvasContext(row, col);
        const lineWidth = Math.max(0.2, Math.min(width, height) / 4000);

        data.points.forEach(getRenderer(false));
        data.points.forEach(getRenderer(true));

        function getRenderer(renderMarkedRows: boolean) {
            return (point: (number | null)[], index: number) => {
                if (point[col] && point[row] && data.marked[index] == renderMarkedRows) {
                    let left = scales[row].xScale(point[row]!)! + padding * (size.width / measureCount);
                    let top = scales[col].yScale(point[col]!)! + padding * (size.height / measureCount);
                    if (cc) {
                        cc.beginPath();
                        cc.arc(left, top, Math.min(size.height, size.width) / 50 / measureCount, 0, 2 * Math.PI);
                        cc.fillStyle = data.colors[index];
                        cc.fill();
                        cc.lineWidth = lineWidth;
                        cc.strokeStyle = "black";
                        cc.stroke();
                    }
                }
            };
        }
    }

    function createCanvasContext(row: number, col: number) {
        let cell = document.createElement("canvas");
        cell.setAttribute("width", `${size.width / measureCount}px`);
        cell.setAttribute("height", `${size.height / measureCount}px`);
        cell.style.left = `${(row * size.width) / measureCount}px`;
        cell.style.top = `${(col * size.height) / measureCount}px`;
        cell.style.position = "absolute";
        cell.setAttribute("id", `canvas-cell-${row}-${col}`);
        document.querySelector("#canvas-content")?.appendChild(cell);
        return cell.getContext("2d");
    }
}
