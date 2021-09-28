import * as d3 from "d3";
import { createTimerLog, Diagonal } from "./index";
import { rectangularSelection } from "./rectangularMarking";

const padding = 0.1;

export interface PairPlotData {
    measures: string[];
    points: (number | null)[][];
    mark: (index: number) => void;
    count: number[] | null;
    colors: string[];
}

export function render(data: PairPlotData, diagonal: Diagonal) {
    const plot = document.querySelector("#correlogram")!;
    var { clientWidth, clientHeight } = plot;

    const width = Math.floor(clientWidth / data.measures.length);
    const height = Math.floor(clientHeight / data.measures.length);

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
                    .range([0, width * (1 - 2 * padding)]),
                yScale: d3
                    .scaleLinear()
                    .domain([max, min])
                    .range([0, height * (1 - 2 * padding)])
            };
        });

    const axes = scales.map((a, i) => ({
        xAxis: (i == 0 ? d3.axisTop(a.xScale) : d3.axisBottom(a.xScale)).ticks(Math.max(2, Math.min(5, width / 100))),
        yAxis: (i == 0 ? d3.axisLeft(a.yScale) : d3.axisRight(a.yScale)).ticks(Math.max(2, Math.min(5, height / 100)))
    }));

    scales.forEach((_, i) => {
        svg.append("svg:g")
            .attr("class", "xAxis")
            .attr("transform", () => `translate(${i * width + padding * width} ${Math.max(i, 1) * height}) `)
            .call(axes[i].xAxis as any);
        svg.append("svg:g")
            .attr("class", "yAxis")
            .attr("transform", () => `translate(${Math.max(i, 1) * width} ${i * height + padding * height}) `)
            .call(axes[i].yAxis as any);
        svg.append("svg:g")
            .attr("class", "measureName")
            .append("svg:text")
            .attr("x", () => `${Math.round(((2 * i + 1) / (2 * data.measures.length)) * 100)}%`)
            .attr("y", () => `${Math.round(((2 * i + 1) / (2 * data.measures.length)) * 100)}%`)
            .attr("dominant-baseline", "bottom")
            .attr("text-anchor", "middle")
            .text((_) =>
                diagonal == "measure-names" ? data.measures[i] : `TODO - Show ${diagonal} for ${data.measures[i]}`
            );
    });

    let scatterCell = svg
        .attr("viewBox", `0 0 ${clientWidth} ${clientHeight}`)
        .selectAll(".scatterCell")
        .data(cells)
        .enter()
        .append("svg:g")
        .attr("class", "scatterCell")
        .attr("transform", (d) => `translate(${d.x * width + padding * width} ${d.y * height + padding * height}) `)
        .attr("width", width * (1 - 2 * padding))
        .attr("height", height * (1 - 2 * padding));
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
