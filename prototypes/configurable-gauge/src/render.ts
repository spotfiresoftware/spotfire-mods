// @ts-ignore
import * as d3 from "d3";
import { grid } from "./layout";

/**
 * Main svg container
 */
const svg = d3.select("#mod-container").append("svg").attr("xmlns", "http://www.w3.org/2000/svg");

export interface Settings {
    click(d: Gauge | null): void;
    mouseLeave?(): void;
    animationSpeed: number;
    size: { width: number; height: number };
    minValue: number;
    maxValue: number;
    showMinMax: boolean;
    gaugeWidth: number;
    style: {
        gauge: {
            backgroundOpacity: number;
            background: string;
        };
        label: { size: number; weight: string; style: string; color: string; fontFamily: string };
        value: { size: number; weight: string; style: string; color: string; fontFamily: string };
        marking: { color: string };
        background: { color: string };
    };
}

export interface Gauge {
    mark(): void;
    mouseOver?(): void;
    label: string;
    key: string;
    percent: number;
    formattedValue: string;
    color: string;
}

interface internalGauge extends Gauge {
    innerRadius: number;
    radius: number;
}

export async function render(gauges: Gauge[], settings: Settings) {
    let padding = settings.size.width / 50;

    const gaugeCount = gauges.length;
    let [rowCount, colCount] = grid(settings.size.width - padding, settings.size.height - padding, gaugeCount);

    let gaugeWidth = settings.size.width / colCount;
    let gaugeHeight = settings.size.height / rowCount;

    let radius = Math.min(
        settings.size.width / colCount / 2 - padding / 2,
        settings.size.height / rowCount / 2 - settings.style.label.size
    );

    const innerRadius = radius - (radius * settings.gaugeWidth) / 100;
    (gauges as internalGauge[]).forEach((g) => {
        g.innerRadius = innerRadius;
        g.radius = radius;
    });

    const shiftAngle = Math.PI - 5 / 8;
    const maxAngle = Math.PI - 5 / 8;
    let scale = d3.scaleLinear().range([-shiftAngle, maxAngle]).domain([0, 1]);
    let negScale = d3.scaleLinear().range([maxAngle, -shiftAngle]).domain([0, 1]);

    const arc = d3
        .arc<internalGauge>()
        .startAngle((d) => (d.percent < 0 ? negScale(0) || 0 : scale(0) || 0))
        .endAngle((d) =>
            d.percent < 0
                ? Math.max(negScale(Math.abs(d.percent)) || 0, -shiftAngle)
                : Math.min(scale(d.percent) || 0, maxAngle)
        )
        .innerRadius((d) => d.innerRadius)
        .outerRadius((d) => d.radius);

    svg.attr("width", settings.size.width)
        .attr("height", settings.size.height)
        .on("click", () => settings.click(null));

    let gaugesPaths = svg.selectAll<any, Gauge>("g.gauge").data(gauges, (d: Gauge) => d.key);

    let newGauge = gaugesPaths
        .enter()
        .append("g")
        .attr("class", "gauge")
        .attr(
            "transform",
            (d, i) =>
                `translate(${Math.floor(i % colCount) * gaugeWidth + gaugeWidth / 2}, ${
                    Math.floor(i / colCount) * gaugeHeight + gaugeHeight / 2
                })`
        );

    newGauge.append("circle").attr("class", "click-zone");
    newGauge.append("path").attr("class", "bg");
    newGauge.append("path").attr("class", "value");
    newGauge.append("text").attr("class", "label-value");
    newGauge.append("text").attr("class", "label");
    newGauge.append("text").attr("class", "min-label");
    newGauge.append("text").attr("class", "max-label");

    let update = gaugesPaths
        .merge(newGauge)
        .on("click", function (d) {
            d3.event.stopPropagation();
            d.mark();
        })
        .on("mouseleave", (d) => {
            settings.mouseLeave?.();
        })
        .on("mouseenter", (d) => {
            d.mouseOver?.();
        });

    update
        .transition("Position gauges")
        .duration(settings.animationSpeed)
        .attr(
            "transform",
            (_, i) =>
                `translate(${Math.floor(i % colCount) * gaugeWidth + gaugeWidth / 2}, ${
                    Math.floor(i / colCount) * gaugeHeight + gaugeHeight / 2
                })`
        );

    update
        .select("path.bg")
        .attr("opacity", settings.style.gauge.backgroundOpacity / 100)
        .transition("add sectors")
        .duration(settings.animationSpeed)
        .attrTween("d", tweenArc({ percent: 1, radius, innerRadius }, 1))
        .attr("fill", (d) => settings.style.gauge.background);

    update
        .select("path.value")
        .transition("add sectors")
        .duration(settings.animationSpeed)
        .attrTween("d", tweenArc({ percent: 0, radius, innerRadius }))
        .attr("stroke", (d) => ((scale(Math.abs(d.percent)) || 0) > maxAngle ? "red" : "transparent"))
        .attr("stroke-width", 2)
        .attr("fill", (d) => d.color);

    update
        .select("circle.click-zone")
        .transition("add sectors")
        .duration(settings.animationSpeed)
        .attr("r", radius)
        .attr("fill", "transparent");

    update
        .select("text.label-value")
        .attr("dy", "0.35em")
        .transition("add label value")
        .duration(settings.animationSpeed)
        .attr("font-size", settings.style.value.size)
        .attr("font-style", settings.style.value.style)
        .attr("font-weight", settings.style.value.weight)
        .attr("fill", (d: any) => settings.style.value.color)
        .attr("font-family", settings.style.value.fontFamily)
        .attr("text-anchor", "middle")
        .attr("y", 0)
        .attr("x", 0)
        .text((d) => d.formattedValue);

    update
        .select("text.label")
        .attr("dy", "1em")
        .transition("add labels")
        .duration(settings.animationSpeed)
        .attr("font-size", settings.style.label.size)
        .attr("font-style", settings.style.label.style)
        .attr("font-weight", settings.style.label.weight)
        .attr("fill", (d: any) => settings.style.label.color)
        .attr("font-family", settings.style.label.fontFamily)
        .attr("text-anchor", "middle")
        .attr("y", -Math.cos(maxAngle) * radius + (settings.showMinMax ? settings.style.label.size : 3))
        .attr("x", 0)
        .text((d) => d.label);

    update
        .select("text.max-label")
        .attr("dy", "1em")
        .transition("add labels")
        .duration(settings.animationSpeed)
        .style("opacity", settings.showMinMax ? 1 : 0)
        .attr("font-size", settings.style.label.size)
        .attr("font-style", settings.style.label.style)
        .attr("font-weight", settings.style.label.weight)
        .attr("fill", (d: any) => settings.style.label.color)
        .attr("font-family", settings.style.label.fontFamily)
        .attr("text-anchor", "start")
        .attr("y", -Math.cos(maxAngle) * radius)
        .attr("x", Math.sin(maxAngle) * radius)
        .text((d) => settings.maxValue);

    update
        .select("text.min-label")
        .attr("dy", "1em")
        .transition("add labels")
        .duration(settings.animationSpeed)
        .style("opacity", settings.showMinMax ? 1 : 0)
        .attr("font-size", settings.style.label.size)
        .attr("font-style", settings.style.label.style)
        .attr("font-weight", settings.style.label.weight)
        .attr("fill", (d: any) => settings.style.label.color)
        .attr("font-family", settings.style.label.fontFamily)
        .attr("text-anchor", "end")
        .attr("y", -Math.cos(maxAngle) * radius)
        .attr("x", -Math.sin(maxAngle) * radius)
        .text((d) => settings.minValue);

    gaugesPaths
        .exit()
        .transition("add sectors")
        .duration(settings.animationSpeed / 2)
        .style("opacity", 0)
        .remove();

    function tweenArc(defaultPrevValue: Partial<internalGauge>, overridePercent?: number) {
        return function tweenArc(this: any, data: any) {
            let prevValue = this.__prev ? this.__prev : defaultPrevValue;

            if (overridePercent != undefined) {
                data = { ...data, percent: overridePercent };
            }

            this.__prev = data;

            var i = d3.interpolate(prevValue, data);

            return function (value: any) {
                return arc(i(value))!;
            };
        };
    }
}
