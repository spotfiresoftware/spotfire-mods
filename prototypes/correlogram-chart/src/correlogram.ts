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
    const plot = document.querySelector("#pairplot")!;
    var {clientWidth, clientHeight} = plot;
    var width = Math.floor(clientWidth / data.measures.length);
    var height = Math.floor(clientHeight / data.measures.length);
    plot!.textContent = "";
    const svg = d3.select("#pairplot");
    let cells = data.measures.map((name, yIndex) => ({
        row: yIndex,
        cols: data.measures.map((name, xIndex) => xIndex)
    }));
    let d3Row = svg
        .attr("viewBox", `0 0 ${clientWidth} ${clientHeight}`)
        .selectAll(".row")
        .data(cells, (d: any) => d.row);

    let d3Cell = d3Row
        .enter()
        .append("svg:g")
        .attr("class", "row")
        .selectAll(".cell")
        .data((row) =>
            row.cols.map((col) => ({
                row: row.row,
                col,
                yScale: d3
                    .scaleLinear()
                    .domain([get(Math.min, row.row), get(Math.max, row.row)])
                    .rangeRound([padding, height-padding]),
                xScale: d3
                    .scaleLinear()
                    .domain([get(Math.min, col), get(Math.max, col)])
                    .rangeRound([padding, width-padding])
            }))
        );

    function get(method: (...p: number[]) => number, index: number) {
        return Math.round(method(...data.points.filter((p) => p).map((p) => p[index]!)));
    }

    d3Cell
        .enter()
        .append("svg:g")
        .attr("class", "cell")
        .style("outline", "1px solid #bbb")
        .attr("transform", (d) => `translate(${d.row * width} ${d.col * height}) `)
        .attr("width",  width)
        .attr("height", height)
        .selectAll("circle")
        .data((d) =>
            data.points.filter(p => d.col != d.row || true).map((p, index) => ({ x: p[d.col], y: p[d.row], index, xScale: d.xScale, yScale: d.yScale }))
        )
        .enter()
        .append("svg:circle")
        .attr("class", "circle")
        .attr("cx", (d: any) => {
            return d.xScale(d.x!);
        })
        .attr("cy", (d: any) => {
            return d.yScale(d.y!);
        })
        .attr("r", (d) => 3)
        .attr("fill", (d) => data.colors[d.index])
        .on("click", (d) => data.mark(d.index));

    d3Cell.exit().remove();
    d3Row.exit().remove();

    rectangularSelection(svg, {
        clearMarking: () => {},
        mark: (d: any) => data.mark(d.index),
        ignoredClickClasses: ["circle"],
        classesToMark: "circle"
    });
}
