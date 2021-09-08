import * as d3 from "d3";
import { rectangularSelection } from "./rectangularMarking";

const avaiableSize = 0.9;

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
        .attr("transform", (d) => `translate(${d.x * width} ${d.y * height}) `)
        .attr("width", width)
        .attr("height", height);
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

    var axes = scales.map((a, i) => ({
        xAxis: (i == 0 ? d3.axisTop(a.xScale) : d3.axisBottom(a.xScale)).ticks(Math.min(5, width / 100)),
        yAxis: (i == 0 ? d3.axisLeft(a.yScale) : d3.axisRight(a.yScale)).ticks(Math.min(5, height / 100)
    }));

    scales.forEach((_, i) => {
        svg.append("svg:g")
            .attr("class", "xAxis")
            .attr("transform", () => `translate(${i * width} ${Math.max(i, 1) * height}) `)
            .call(axes[i].xAxis as any);
        svg.append("svg:g")
            .attr("class", "yAxis")
            .attr("transform", () => `translate(${Math.max(i, 1) * width} ${i * height}) `)
            .call(axes[i].yAxis as any);
    });

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
