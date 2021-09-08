import * as d3 from "d3";
import { rectangularSelection } from "./rectangularMarking";

const avaiableSize = 0.96;

export interface PairPlotData {
    measures: string[];
    points: (number | null)[][];
    mark: (index: number) => void;
    colors: string[];
}

export function render(data: PairPlotData) {
    const plot = document.querySelector("#correlogram")!;
    var { clientWidth, clientHeight } = plot;

    var width = Math.floor(clientWidth / data.measures.length) * avaiableSize;
    var height = Math.floor(clientHeight / data.measures.length) * avaiableSize;
    plot.innerHTML = "";
    const svg = d3.select("#correlogram");

    let cells = data.measures.flatMap((_, x) =>
        data.measures
            .map((_, y) => ({
                x,
                y
            }))
            .filter((d) => d.x != d.y)
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
                    .range([width - width * avaiableSize, width * avaiableSize]),
                yScale: d3
                    .scaleLinear()
                    .domain([max, min])
                    .range([height - height * avaiableSize, height * avaiableSize])
            };
        });

    let scatterCell = svg
        .attr("viewBox", `0 0 ${clientWidth} ${clientHeight}`)
        .selectAll(".scatterCell")
        .data(cells)
        .enter()
        .append("svg:g")
        .attr("class", "scatterCell")
        .style("outline", "1px solid #bbb")
        .attr("transform", (d) => `translate(${d.x * width} ${d.y * height}) `)
        .attr("width", width)
        .attr("height", height);

    let diagonal = svg
        .selectAll(".diagonal")
        .data(scales)
        .enter()
        .append("svg:g")
        .attr("class", "diagonal")
        .style("outline", "1px solid #bbb")
        .attr("transform", (d, i) => `translate(${i * width} ${i * height}) `)
        .attr("width", width)
        .attr("height", height);
    diagonal
        .append("text")
        .attr("class", "xscale")
        .text((d, i) => "X scale for " + data.measures[i])
        .attr("transform", `translate(${height * (1 - avaiableSize)} ${avaiableSize * height })`);
    diagonal
        .append("text")
        .attr("class", "yscale")
        .text((d, i) => "Y scale for " + data.measures[i])
        .attr("transform", `translate(${avaiableSize * width} ${width * (1 - avaiableSize)}) rotate(90)`);

    const d3Circles = scatterCell
        .selectAll("circle")
        .data((d) =>
            data.points
                .map((p, index) => {
                    const x = p[d.x];
                    const y = p[d.y];
                    const rangeY = Math.abs(scales[d.y].yScale.domain()[1] - scales[d.y].yScale.domain()[0]);
                    const rangeX = Math.abs(scales[d.x].xScale.domain()[1] - scales[d.x].xScale.domain()[0]);
                    return x && y ? { x: scales[d.x].xScale(x), y: scales[d.y].yScale(y), index } : null;
                })
                .filter((p) => p != null)
        )
        .enter()
        .append("svg:circle")
        .attr("class", "circle")
        .attr("cx", (d) => d!.x!)
        .attr("cy", (d) => d!.y!)
        .attr("r", Math.min(width, height) / 50)
        .attr("fill", (d) => data.colors[d!.index])
        .attr("stroke", "black")
        .attr("stroke-width", Math.min(2, Math.min(width, height) / 500))
        .on("click", (d) => data.mark(d!.index));

    scatterCell.exit().remove();
    d3Circles.exit().remove();

    rectangularSelection(svg, {
        clearMarking: () => {},
        mark: (d: any) => data.mark(d.index),
        ignoredClickClasses: ["circle"],
        classesToMark: "circle"
    });
}
