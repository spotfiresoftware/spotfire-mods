// @ts-ignore
import * as d3 from "d3";

/**
 * Main svg container
 */
const svg = d3.select("#mod-container").append("svg").attr("xmlns", "http://www.w3.org/2000/svg");

export interface Settings {
    size: { width: number; height: number };
    maxValue: number;
}

export interface Gauge {
    label: string;
    value: number;
    color: string;
}

export async function render(gauges: Gauge[], settings: Settings) {
    let gaugeWidth = settings.size.width / gauges.length;
    let padding = settings.size.width / 50;

    let radius = settings.size.width / gauges.length / 2 - padding / 2;

    console.log(gauges);

    // settings.maxValue = 100;

    // gauges[0].value = 25;
    // gauges[1].value = 50;
    // gauges[2].value = 75;
    // gauges[3].value = 100;

    const shiftAngle = Math.PI - 5 / 8;
    let scale = d3
        .scaleLinear()
        .range([-shiftAngle, Math.PI - 5 / 8])
        .domain([0, settings.maxValue]);

    const arc = d3
        .arc<{ value: number }>()
        .startAngle((d) => 0 - shiftAngle)
        .endAngle((d) => scale(d.value) || 0)
        .innerRadius((d) => radius - 20)
        .outerRadius((d) => radius);

    svg.attr("width", settings.size.width).attr("height", settings.size.height);

    let gaugesPaths = svg.selectAll<any, Gauge>("g.gauge").data(gauges, (d: Gauge) => d.label);

    let newGauge = gaugesPaths
        .enter()
        .append("g")
        .attr("class", "gauge")
        .attr("transform", (d, i) => `translate(${i * gaugeWidth + gaugeWidth / 2}, 200)`);

    newGauge
        .append("path")
        .attr("class", "bg")
        .attr("d", (d) => arc({ value: settings.maxValue }))
        .attr("fill", (d) => "#ddd");

    newGauge
        .append("path")
        .attr("class", "value")
        .attr("d", arc)
        .attr("fill", (d) => d.color);

    let update = gaugesPaths
        .merge(newGauge)
        .attr("transform", (d, i) => `translate(${i * gaugeWidth + gaugeWidth / 2}, 200)`);
        
        update
        .select("path.bg")
        .attr("d", (d) => arc({ value: settings.maxValue }))
        .attr("fill", (d) => "#ddd");

        update
        .select("path.value")
        .attr("d", arc)
        .attr("fill", (d) => d.color);

    gaugesPaths.exit().remove();
}
