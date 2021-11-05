// @ts-ignore
import * as d3 from "d3";
import { grid } from "./layout";
import { rectangularSelection } from "./rectangularMarking";

export interface Settings {
    svg: d3.Selection<SVGSVGElement, any, HTMLElement, any>;
    clearMarking?(): void;
    mouseLeave?(): void;
    animationSpeed?: number;
    size?: { width: number; height: number };
    showMinMax?: boolean;
    showShake?: boolean;
    arcWidth?: number;
    padAngle?: number;
    style: {
        gauge: {
            backgroundOpacity: number;
            background: string;
        };
        ticks: {
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
    minLabel: string;
    maxLabel: string;
    formattedValue: string;
    color: string;
}

interface internalGauge extends Gauge {
    innerRadius: number;
    radius: number;
}

export async function render(gauges: Gauge[], settings: Settings) {
    const { size = { width: 50, height: 50 } } = settings;
    const { animationSpeed = 0 } = settings;
    const { arcWidth = 10 } = settings;

    let verticalPadding = size.width / 50;
    let horizontalPadding = settings.showMinMax
        ? Math.min(size.width / 5, settings.style.label.size * 0.7 * 8)
        : size.width / 50;

    const gaugeCount = gauges.length;
    let [rowCount, colCount] = grid(size.width - horizontalPadding, size.height - verticalPadding, gaugeCount);

    let gaugeWidth = size.width / colCount;
    let gaugeHeight = size.height / rowCount;

    let radius = Math.max(
        Math.min(
            size.width / colCount / 2 - horizontalPadding / 2,
            size.height / rowCount / 2 -
                (settings.showMinMax ? settings.style.label.size * 2.4 : settings.style.label.size * 1.4)
        ),
        5
    );

    const longTickRadius = radius;
    // Shrink radius to make room for ticks
    radius = radius - Math.min(radius / 10, 10);

    const innerRadius = radius - (radius * arcWidth) / 100;
    (gauges as internalGauge[]).forEach((g) => {
        g.innerRadius = innerRadius;
        g.radius = radius;
    });

    const valueFontSize = Math.min(settings.style.value.size, innerRadius / 1.4);
    const showLabels = valueFontSize == settings.style.value.size && settings.showMinMax;

    const paddingAngle = ((settings.padAngle ?? 40) * 2 * Math.PI) / 360;
    const shiftAngle = Math.PI - paddingAngle;
    const maxAngle = Math.PI - paddingAngle;
    let scale = d3.scaleLinear().range([-shiftAngle, maxAngle]).domain([0, 1]);

    const labelPadding = 10 * (1 - paddingAngle / (Math.PI / 2));

    const arc = d3
        .arc<internalGauge>()
        .startAngle((d) => scale(0)!)
        .endAngle((d) => Math.min(scale(Math.max(d.percent, 0)) || 0, maxAngle))
        .innerRadius((d) => d.innerRadius)
        .outerRadius((d) => d.radius);

    const tickWidth = (2 * Math.PI) / 360;
    const scaleArc = d3
        .arc<{ x0: number; height: number }>()
        .startAngle((d) => d.x0 - tickWidth / 2)
        .endAngle((d) => d.x0 + tickWidth / 2)
        .innerRadius((d) => innerRadius)
        .outerRadius((d) => (d.height ? longTickRadius : radius));

    settings.svg.attr("width", size.width).attr("height", size.height);

    let gaugesPaths = settings.svg.selectAll<any, Gauge>("g.gauge").data(gauges, (d: Gauge) => d.key);

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
    newGauge.append("g").attr("class", "scale").style("cursor", "default").style("user-select", "none");
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
        .duration(animationSpeed)
        .attr(
            "transform",
            (_, i) =>
                `translate(${Math.floor(i % colCount) * gaugeWidth + gaugeWidth / 2}, ${
                    Math.floor(i / colCount) * gaugeHeight + gaugeHeight / 2
                })`
        );

    let shake = (className: string) => (d: Gauge) =>
        className + " " + (settings.showShake && d.percent > 1 ? "shake" : "");

    update
        .select("path.bg")
        .attr("opacity", settings.style.gauge.backgroundOpacity / 100)
        .transition("add sectors")
        .duration(animationSpeed)
        .attr("class", shake("bg"))
        .attrTween("d", tweenArc({ percent: 1, radius, innerRadius }, 1))
        .attr("fill", (d) => settings.style.gauge.background);

    update
        .select("path.value")
        .transition("add sectors")
        .duration(animationSpeed)
        .attr("class", shake("value"))
        .attrTween("d", tweenArc({ percent: 0, radius, innerRadius }))
        .attr("stroke-width", 2)
        .attr("fill", (d) => d.color);

    update
        .select("circle.click-zone")
        .transition("add sectors")
        .duration(animationSpeed)
        .attr("r", radius)
        .attr("fill", "transparent");

    update
        .select("text.label-value")
        .attr("dy", "1em")
        .transition("add label value")
        .duration(animationSpeed)
        .attr("font-size", valueFontSize)
        .attr("font-style", settings.style.value.style)
        .attr("font-weight", settings.style.value.weight)
        .attr("fill", (d: any) => settings.style.value.color)
        .attr("font-family", settings.style.value.fontFamily)
        .attr("text-anchor", "middle")
        .attr("y", -Math.cos(Math.PI / 2) * innerRadius - valueFontSize * (Math.PI / 2 / maxAngle - 0.01))
        .attr("x", 0)
        .text(label("formattedValue", innerRadius * 2, valueFontSize));

    update
        .select("text.label")
        .attr("dy", "1em")
        .transition("add labels")
        .duration(animationSpeed)
        .attr("font-size", settings.style.label.size)
        .attr("font-style", settings.style.label.style)
        .attr("font-weight", settings.style.label.weight)
        .attr("fill", (d: any) => settings.style.label.color)
        .attr("font-family", settings.style.label.fontFamily)
        .attr("text-anchor", "middle")
        .attr("y", -Math.cos(maxAngle) * longTickRadius + (showLabels ? settings.style.label.size : 3))
        .attr("x", 0)
        .text(label("label", gaugeWidth, settings.style.label.size));

    update
        .select("text.max-label")
        .attr("dy", "1em")
        .transition("add labels")
        .duration(animationSpeed)
        .style("opacity", showLabels ? 1 : 0)
        .attr("font-size", settings.style.label.size)
        .attr("font-style", settings.style.label.style)
        .attr("font-weight", settings.style.label.weight)
        .attr("fill", (d: any) => settings.style.label.color)
        .attr("font-family", settings.style.label.fontFamily)
        .attr("text-anchor", "start")
        .attr("y", -Math.cos(maxAngle) * longTickRadius)
        .attr("x", Math.sin(maxAngle) * longTickRadius + labelPadding)
        .text(label("maxLabel", gaugeWidth / 2 - Math.sin(maxAngle) * longTickRadius, settings.style.label.size));

    update
        .select("text.min-label")
        .attr("dy", "1em")
        .transition("add labels")
        .duration(animationSpeed)
        .style("opacity", showLabels ? 1 : 0)
        .attr("font-size", settings.style.label.size)
        .attr("font-style", settings.style.label.style)
        .attr("font-weight", settings.style.label.weight)
        .attr("fill", (d: any) => settings.style.label.color)
        .attr("font-family", settings.style.label.fontFamily)
        .attr("text-anchor", "end")
        .attr("y", -Math.cos(maxAngle) * longTickRadius)
        .attr("x", -Math.sin(maxAngle) * longTickRadius - labelPadding)
        .text(label("minLabel", gaugeWidth / 2 - Math.sin(maxAngle) * longTickRadius, settings.style.label.size));

    let ticks = update
        .select<any>("g.scale")
        .selectAll<any, any>("path")
        .data(scale.ticks(20).map((a, i) => ({ x0: scale(a)!, height: (i + 1) % 2 })));

    let newTicks = ticks.enter().append("path").attr("class", "tick");

    ticks
        .merge(newTicks)
        .transition("ticks")
        .duration(animationSpeed)
        .attr("d", (d) => scaleArc(d))
        .style("opacity", settings.style.ticks.backgroundOpacity / 100)
        .attr("fill", function (d) {
            let g: Gauge = this.parentNode.parentNode.__data__;
            return scale(g.percent)! > d.x0 ? g.color : settings.style.ticks.background;
        });

    gaugesPaths
        .exit()
        .transition("add sectors")
        .duration(animationSpeed / 2)
        .style("opacity", 0)
        .remove();

    rectangularSelection(settings.svg as any, {
        classesToMark: "bg",
        ignoredClickClasses: ["gauge"],
        clearMarking: () => settings.clearMarking?.(),
        mark(data: Gauge) {
            data.mark();
        }
    });

    function label(p: keyof Gauge, width: number, size: number) {
        return function (d: Gauge) {
            const fontSize = size;
            const fontWidth = fontSize * 0.7;
            let label = ("" + d[p]) as string;
            if (label.length > width / fontWidth) {
                return label.slice(0, Math.max(1, width / fontWidth - 2)) + "…";
            }

            return d[p] as string;
        };
    }

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
