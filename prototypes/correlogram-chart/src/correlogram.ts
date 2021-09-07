import * as d3 from "d3";
import { rectangularSelection } from "./rectangularMarking";

const padding = 4;

export interface PairPlotData {
    measures: string[];
    points: (number | null)[][];
    mark: (index: number) => void;
    colors: string[];
}

export function render(data: PairPlotData) {
    const plot = document.querySelector("#correlogram")!;
    var { clientWidth, clientHeight } = plot;
    var width = Math.floor(clientWidth / data.measures.length);
    var height = Math.floor(clientHeight / data.measures.length);
    plot.innerHTML = "";
    const svg = d3.select("#correlogram");

    let cells = data.measures.flatMap((_, row) =>
        data.measures
            .map((_, col) => ({
                row,
                col
            }))
            .filter((d) => d.col != d.row)
    );

    const scales = data.measures
        .map((_, i) => data.points.map((p) => p[i]).filter((v) => v != null))
        .map((values, index) => {
            const min = Math.min(...(values as number[]));
            const max = Math.max(...(values as number[]));
            return {
                xScale: d3
                    .scaleLinear()
                    .domain([min, max])
                    .rangeRound([padding, width - padding]),
                yScale: d3
                    .scaleLinear()
                    .domain([max, min])
                    .rangeRound([padding, width - padding])
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
        .attr("transform", (d) => `translate(${d.row * width} ${d.col * height}) `)
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
        .attr("transform", `translate(4 ${height - 20})`);
    diagonal
        .append("text")
        .attr("class", "yscale")
        .text((d, i) => "Y scale for " + data.measures[i])
        .attr("transform", `translate(${width - 20} 4) rotate(90)`);


    const d3Circles = scatterCell
        .selectAll("circle")
        .data((d) =>
            data.points
                .filter((_) => d.col != d.row)
                .map((p, index) => {
                    const x = p[d.col];
                    const y = p[d.row];
                    return x && y ? { x: scales[d.col].xScale(x), y: scales[d.row].yScale(y), index } : null;
                })
                .filter((p) => p != null)
        )
        .enter()
        .append("svg:circle")
        .attr("class", "circle")
        .attr("cx", (d) => d!.x!)
        .attr("cy", (d) => d!.y!)
        .attr("r", 2)
        .attr("fill", (d) => data.colors[d!.index])
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
