// @ts-ignore
import * as d3 from "d3";
import { gaugeArc, GaugeMeasurements, grid, labelsFitSpace, scaleFitSpace } from "./layout";
import { rectangularSelection } from "./rectangularMarking";

export interface Settings {
    svg: d3.Selection<SVGSVGElement, any, HTMLElement, any>;
    clearMarking?(): void;
    mouseLeave?(): void;
    animationSpeed?: number;
    size?: { width: number; height: number };
    showMinMax?: boolean;
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
    const { animationSpeed = 0 } = settings;
    const { size = { width: 50, height: 50 } } = settings;

    let [rowCount, colCount] = grid(size.width, size.height, gauges.length);

    const horizontalPadding = 10; //size.width / 50;
    const verticalPadding = 10; //size.height / 50;

    let gaugeWidth = size.width / colCount;
    let gaugeHeight = size.height / rowCount;

    const heightWithPadding = gaugeHeight - horizontalPadding;
    const widthWithPadding = gaugeWidth - verticalPadding;

    let scaleLabelsFit = scaleFitSpace(widthWithPadding, heightWithPadding, settings.style.label.size);
    let labelsFit = labelsFitSpace(widthWithPadding, heightWithPadding, settings.style.label.size);
    let showMinMax = !!settings.showMinMax && scaleLabelsFit;

    const verticalSizeForLabels = showMinMax
        ? settings.style.label.size * 2.4 + 5
        : labelsFit
        ? settings.style.label.size * 1.4
        : 0;

    const heightAfterLabels = heightWithPadding - verticalSizeForLabels;
    let widthAfterLabels = widthWithPadding - (showMinMax ? 40 : 0);
    let arc = gaugeArc(widthAfterLabels, heightAfterLabels, settings.padAngle!, settings.arcWidth || 10);

    // These properties are set to enable fluid transitions.
    (gauges as internalGauge[]).forEach((g) => {
        g.innerRadius = arc.innerRadius;
        g.radius = arc.radius;
    });

    settings.svg.attr("width", size.width).attr("height", size.height);

    let gaugesPaths = settings.svg.selectAll<any, Gauge>("g.gauge").data(gauges, (d: Gauge) => d.key);

    let horizontalTranslate = (i: number) => Math.floor(i % colCount) * gaugeWidth + gaugeWidth / 2;

    /**
     * It is necessary to further translate the arc downwards.
     * The path arc is drawn in such a way that it would fit a full circle.
     * That means that it grows outside of the gauge rectangle when the radius is greater than half the height.
     */
    let topPadding = Math.max((gaugeHeight - gaugeWidth) / 2, 0);
    let verticalTranslate = (i: number) => arc.tickRadius + Math.floor(i / colCount) * gaugeHeight + topPadding;

    let newGauge = gaugesPaths
        .enter()
        .append("g")
        .attr("class", "gauge")
        .attr("transform", (d, i) => `translate(${horizontalTranslate(i)}, ${verticalTranslate(i)})`);

    createGaugeElems(newGauge);

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
        .attr("transform", (_, i) => `translate(${horizontalTranslate(i)}, ${verticalTranslate(i)})`);

    updateGauge(update, settings, {
        ...arc,
        width: widthWithPadding,
        showLabels: labelsFit,
        showMinMax: showMinMax
    });

    gaugesPaths
        .exit()
        .transition("add sectors")
        .duration(animationSpeed / 2)
        .style("opacity", 0)
        .remove();

    rectangularSelection(settings.svg as any, {
        centerMarking: true,
        classesToMark: "bg",
        ignoredClickClasses: ["gauge"],
        clearMarking: () => settings.clearMarking?.(),
        mark(data: Gauge) {
            data.mark();
        }
    });
}

function createGaugeElems(arcGroup: d3.Selection<SVGGElement, Gauge, SVGSVGElement, any>) {
    arcGroup.append("path").attr("class", "click-zone");
    arcGroup.append("path").attr("class", "bg");
    arcGroup.append("g").attr("class", "scale").style("cursor", "default").style("user-select", "none");
    arcGroup.append("path").attr("class", "value");
    arcGroup.append("text").attr("class", "label-value");
    arcGroup.append("text").attr("class", "label");
    arcGroup.append("text").attr("class", "min-label");
    arcGroup.append("text").attr("class", "max-label");
    arcGroup.append("path").attr("class", "highlight");
}

function updateGauge(update: d3.Selection<any, Gauge, SVGSVGElement, any>, settings: Settings, m: GaugeMeasurements) {
    const { animationSpeed = 0 } = settings;

    let { radius, innerRadius, tickRadius: longTickRadius, width, maxAngle } = m;

    const valueFontSize = Math.min(settings.style.value.size, m.innerRadius / 1.4);

    const labelPadding = 10 * (1 - m.paddingRadians / (Math.PI / 2));

    const labelYPos = 5 + -Math.cos(maxAngle) * longTickRadius + (m.showMinMax ? settings.style.label.size * 1.2 : 3);

    const arcWidth = m.radius - m.innerRadius;

    let scale = d3.scaleLinear().range([-maxAngle, maxAngle]).domain([0, 1]);

    const arc = d3
        .arc<internalGauge>()
        .startAngle((d) => scale(0)!)
        .endAngle((d) => Math.min(scale(Math.max(d.percent, 0)) || 0, maxAngle))
        .innerRadius((d) => d.innerRadius)
        .outerRadius((d) => d.radius);

    const highlightPadding = 3;
    const padAngle = (d: { radius: number }) => 2 * Math.asin(highlightPadding / 2 / d.radius);

    const highlightArc = d3
        .arc<internalGauge>()
        .startAngle((d) => scale(0)! - padAngle(d))
        .endAngle((d) => Math.min((scale(d.percent) || 0), maxAngle) + padAngle(d))
        .innerRadius((d) => Math.max(d.innerRadius - highlightPadding, 0))
        .outerRadius((d) => d.radius + highlightPadding);

    const tickWidth = (2 * Math.PI) / 360;
    const scaleArc = d3
        .arc<{ x0: number; height: number }>()
        .startAngle((d) => d.x0 - tickWidth / 2)
        .endAngle((d) => d.x0 + tickWidth / 2)
        .innerRadius((d) => innerRadius)
        .outerRadius((d) => (d.height ? longTickRadius : radius));

    update
        .select("path.bg")
        .attr("opacity", settings.style.gauge.backgroundOpacity / 100)
        .transition("add sectors")
        .duration(animationSpeed)
        .attrTween("d", tweenArc({ percent: 1, radius, innerRadius }, arc, 1))
        .attr("fill", (d) => settings.style.gauge.background);

    update
        .select("path.value")
        .transition("add sectors")
        .duration(animationSpeed)
        .attrTween("d", tweenArc({ percent: 0, radius, innerRadius }, arc))
        .attr("fill", (d) => d.color);

    update
        .select("path.highlight")
        .transition("add highlight")
        .duration(animationSpeed)
        .attr("fill", "transparent")
        .attr("stroke-width", 1)
        .attrTween("d", tweenArc({ percent: 0, radius, innerRadius }, highlightArc))
        .attr("class", "highlight");

    const xArcStart = -radius;
    update
        .select("path.click-zone")
        .transition("add sectors")
        .duration(animationSpeed)
        .attr(
            "d",
            `
           M ${xArcStart} ${0}
           A ${m.radius} ${m.radius} 0 0 1 ${-xArcStart} ${0}
           A ${m.radius} ${m.radius} 0 0 1 ${radius / 2} ${Math.min(radius, labelYPos)}
           L ${radius / 2} ${labelYPos}
           L ${-radius / 2} ${labelYPos}
           L ${-radius / 2} ${Math.min(radius, labelYPos)}
           A ${m.radius} ${m.radius} 0 0 1 ${xArcStart} ${0}
           Z
        `
        )
        .attr("fill", "transparent")
        .style("opacity", "0.7");

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
        .style("display", m.showLabels ? "inherit" : "none")
        .attr("font-style", settings.style.label.style)
        .attr("font-weight", settings.style.label.weight)
        .attr("fill", (d: any) => settings.style.label.color)
        .attr("font-family", settings.style.label.fontFamily)
        .attr("text-anchor", "middle")
        .attr("y", labelYPos)
        .attr("x", 0)
        .text(label("label", width, settings.style.label.size));

    update
        .select("text.max-label")
        .attr("dy", "1em")
        .transition("add labels")
        .duration(animationSpeed)
        .style("opacity", m.showMinMax ? 1 : 0)
        .attr("font-size", settings.style.label.size)
        .attr("font-style", settings.style.label.style)
        .attr("font-weight", settings.style.label.weight)
        .attr("fill", (d: any) => settings.style.label.color)
        .attr("font-family", settings.style.label.fontFamily)
        .attr("text-anchor", "start")
        .attr("y", -Math.cos(maxAngle) * longTickRadius + 5)
        .attr("x", Math.sin(maxAngle) * (longTickRadius - arcWidth) + labelPadding)
        .text(label("maxLabel", width / 2 - Math.sin(maxAngle) * innerRadius, settings.style.label.size));

    update
        .select("text.min-label")
        .attr("dy", "1em")
        .transition("add labels")
        .duration(animationSpeed)
        .style("opacity", m.showMinMax ? 1 : 0)
        .attr("font-size", settings.style.label.size)
        .attr("font-style", settings.style.label.style)
        .attr("font-weight", settings.style.label.weight)
        .attr("fill", (d: any) => settings.style.label.color)
        .attr("font-family", settings.style.label.fontFamily)
        .attr("text-anchor", "end")
        .attr("y", -Math.cos(maxAngle) * longTickRadius + 5)
        .attr("x", -Math.sin(maxAngle) * (longTickRadius - arcWidth) - labelPadding)
        .text(label("minLabel", width / 2 - Math.sin(maxAngle) * innerRadius, settings.style.label.size));

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
            return scale(g.percent)! >= d.x0 && g.percent != 0 ? g.color : settings.style.ticks.background;
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

    function tweenArc(
        defaultPrevValue: Partial<internalGauge>,
        arcFunc: (d: internalGauge, ...args: any[]) => string | null,
        overridePercent?: number
    ) {
        return function tweenArc(this: any, data: any) {
            let prevValue = this.__prev ? this.__prev : defaultPrevValue;

            if (overridePercent != undefined) {
                data = { ...data, percent: overridePercent };
            }

            this.__prev = data;

            var i = d3.interpolate(prevValue, data);

            return function (value: any) {
                return arcFunc(i(value))!;
            };
        };
    }
}
