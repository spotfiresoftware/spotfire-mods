// @ts-ignore
import * as d3 from "d3";

/**
 * Main svg container
 */
const svg = d3.select("#mod-container").append("svg").attr("xmlns", "http://www.w3.org/2000/svg");

export interface Settings {
    size: { width: number; height: number };
    maxValue: number;
    style: {
        label: { size: number; weight: string; style: string; color: string; fontFamily: string };
        value: { size: number; weight: string; style: string; color: string; fontFamily: string };
        marking: { color: string };
        background: { color: string };
    };
}

export interface Gauge {
    label: string;
    value: number;
    formattedValue: string;
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
        .innerRadius((d) => radius - radius * 0.2)
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
        .attr("opacity", 0.1)
        .attr("d", (d) => arc({ value: settings.maxValue }))
        .attr("fill", (d) => d.color);

    newGauge
        .append("path")
        .attr("class", "value")
        .attr("d", arc)
        .attr("fill", (d) => d.color);

    newGauge
        .append("text")
        .attr("class", "label-value")
        .attr("dy", "0.35em")
        .attr("font-size", settings.style.value.size)
        .attr("font-style", settings.style.value.style)
        .attr("font-weight", settings.style.value.weight)
        .attr("fill", (d: any) => settings.style.value.color)
        .attr("font-family", settings.style.value.fontFamily)
        .attr("text-anchor", "middle")
        .attr("y", 0)
        .attr("x", 0 )
        .text((d) => d.formattedValue);


        newGauge
        .append("text")
        .attr("class", "label")
        .attr("dy", "0.35em")
        .attr("font-size", settings.style.label.size)
        .attr("font-style", settings.style.label.style)
        .attr("font-weight", settings.style.label.weight)
        .attr("fill", (d: any) => settings.style.label.color)
        .attr("font-family", settings.style.label.fontFamily)
        .attr("text-anchor", "middle")
        .attr("y", radius)
        .attr("x", 0 )
        .text((d) => d.label);

    let update = gaugesPaths
        .merge(newGauge)
        .attr("transform", (d, i) => `translate(${i * gaugeWidth + gaugeWidth / 2}, 200)`);

    update
        .select("path.bg")
        .attr("d", (d) => arc({ value: settings.maxValue }))
        .attr("fill", (d) => d.color);

    update
        .select("path.value")
        .attr("d", arc)
        .attr("fill", (d) => d.color);

    gaugesPaths.exit().remove();
}

function getTransformData(data: any) {
    // d3.interpolate should not try to interpolate other properties
    return (({ value, x0, x1, y0, y1 }) => ({ value, x0, x1, y0, y1 }))(data);
}

function labelPosition(d: any) {
    const x = (((d.x0 + d.x1) / 2) * 180) / Math.PI;
    const y = (d.y0 + d.y1) / 2;
    return { x, y };
}

function tweenTransform(this: any, data: any) {
    let prevValue = this.__prev ? getTransformData(this.__prev) : {};
    let newValue = getTransformData(data);
    this.__prev = newValue;

    var i = d3.interpolate(prevValue, newValue);

    return function (value: any) {
        var { x, y } = labelPosition(i(value));
        return `rotate(${x - 90}) translate(${y},0) rotate(${Math.sin((Math.PI * x) / 180) >= 0 ? 0 : 180})`;
    };
}
