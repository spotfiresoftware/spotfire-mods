// @ts-ignore
import * as d3 from "d3";

/**
 * Main svg container
 */
const svg = d3.select("#mod-container").append("svg").attr("xmlns", "http://www.w3.org/2000/svg");

export interface Settings {
    animationSpeed: number;
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
    percent: number;
    value: number;
    formattedValue: string;
    color: string;
}

export async function render(gauges: Gauge[], settings: Settings) {
    let gaugeWidth = settings.size.width / gauges.length;
    let padding = settings.size.width / 50;

    let radius = settings.size.width / gauges.length / 2 - padding / 2;

    const shiftAngle = Math.PI - 5 / 8;
    let scale = d3
        .scaleLinear()
        .range([-shiftAngle, Math.PI - 5 / 8])
        .domain([0, 1]);

    const arc = d3
        .arc<{ percent: number }>()
        .startAngle((d) => 0 - shiftAngle)
        .endAngle((d) => scale(d.percent) || 0)
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
        .attr("d", (d) => arc({ percent: 1 }))
        .attr("fill", (d) => d.color);

    newGauge
        .append("path")
        .attr("class", "value")
        .transition("add sectors")
        .duration(settings.animationSpeed)
        .attrTween("d", tweenArc)
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
        .attr("x", 0)
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
        .attr("x", 0)
        .text((d) => d.label);

    let update = gaugesPaths
        .merge(newGauge)
        .attr("transform", (d, i) => `translate(${i * gaugeWidth + gaugeWidth / 2}, 200)`);

    update
        .select("path.bg")
        .transition("add sectors")
        .duration(settings.animationSpeed)
        .attrTween("d", tweenArc.bind({}, { percent: 1 }))
        .attr("fill", (d) => d.color);

    update
        .select("path.value")
        .transition("add sectors")
        .duration(settings.animationSpeed)
        .attrTween("d", tweenArc)
        .attr("fill", (d) => d.color);

    gaugesPaths.exit().remove();

    function tweenArc(this: any, data: any) {
        let prevValue = this.__prev ? this.__prev : { percent: 1 };

        this.__prev = data;

        var i = d3.interpolate(prevValue, data);

        return function (value: any) {
            return arc(i(value))!;
        };
    }
}

function getTransformData(data: any) {
    // d3.interpolate should not try to interpolate other properties
    return (({ value, percent }) => ({ value, percent }))(data);
}
