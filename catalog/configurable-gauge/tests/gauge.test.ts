import * as d3 from "d3";
import { Gauge, render } from "../src/gauge";

const defaultStyling = {
    gauge: {
        backgroundOpacity: 1,
        background: "#ddd"
    },
    ticks: {
        backgroundOpacity: 1,
        background: "#ddd"
    },
    label: { size: 12, weight: "normal", style: "", color: "#ddd", fontFamily: "Arial" },
    value: { size: 12, weight: "normal", style: "", color: "#ddd", fontFamily: "Arial" },
    marking: { color: "red" },
    background: { color: "#fff" }
};

const defaultGauge: Gauge = {
    color: "red",
    formattedValue: "10 000",
    key: "first",
    label: "First",
    mark() {},
    maxLabel: "20 000",
    minLabel: "0",
    percent: 0.5
};

const emptyGauge: Gauge = {
    color: "green",
    formattedValue: "0",
    key: "second",
    label: "Second",
    mark() {},
    maxLabel: "20 000",
    minLabel: "0",
    percent: 0
};

const fullGauge: Gauge = {
    color: "rgb(255, 100, 125)",
    formattedValue: "20 000",
    key: "third",
    label: "Full",
    mark() {},
    maxLabel: "20 000",
    minLabel: "0",
    percent: 1
};

let padAngles = [0, 5, 10, 15, 20, 30, 35, 40, 45, 50, 60, 70, 80, 90];
let arcWidths = [2, 5, 9, 10, 20, 30, 40, 60, 80, 100];
let sizes = [
    { width: 230, height: 118 },
    { width: 300, height: 200 },
    { width: 200, height: 300 },
    { width: 100, height: 100 },
    { width: 800, height: 650 }
];

describe("Gauge", () => {
    let svg: d3.Selection<SVGSVGElement, unknown, HTMLElement, any>;
    beforeEach(() => {
        svg = appendSvg();
    });

    afterEach(() => {
        d3.selectAll("svg").remove();
    });

    it("should render a group per gauge", async () => {
        render([defaultGauge], {
            svg: svg,
            style: defaultStyling,
            size: { width: 70, height: 40 }
        });

        expect(svg.selectAll("g.gauge").size()).toBe(1);

        render([defaultGauge, emptyGauge], {
            svg: svg,
            style: defaultStyling,
            size: { width: 300, height: 400 },
            animationSpeed: 0
        });

        expect(svg.selectAll("g.gauge").size()).toBe(2);

        await awaitTransitions();

        expect(svg.selectAll(".label-value").text()).toBe("10 000");
    });

    it("should render vertically centered a group per gauge", async () => {
        render([defaultGauge, emptyGauge, { ...emptyGauge, key: "sads" }], {
            svg: svg,
            style: defaultStyling,
            size: { width: 600, height: 400 }
        });

        await awaitTransitions();

        let firstGauge = svg.select(".gauge").node() as HTMLElement;
        let svgPos = svg.node()!.getBoundingClientRect();

        let gauge = firstGauge.getBoundingClientRect();

        expect(gauge.height).toBeLessThan(200);

        expect(gauge.y).toBeGreaterThan(svgPos.y + 50);
    });

    describe("Arc", () => {
        for (const size of sizes) {
            for (const padAngle of padAngles) {
                it(`should render the arc within the gauge group with pad angle of ${padAngle}° and size of ${
                    size.width + ":" + size.height
                }`, async () => {
                    render([defaultGauge], {
                        svg: svg,
                        style: defaultStyling,
                        size,
                        padAngle
                    });

                    await awaitTransitions();

                    expectArcToBeWithinGaugeGroup(svg);
                });
            }
        }
    });

    describe("Labels", () => {
        it("should be hidden by default", async () => {
            render([defaultGauge], {
                svg: svg,
                style: defaultStyling,
                size: { width: 300, height: 400 },
                showMinMax: false
            });

            await awaitTransitions();

            expect(svg.selectAll(".min-label").style("opacity")).toBe("0");
            expect(svg.selectAll(".max-label").style("opacity")).toBe("0");
        });

        it("should be visible when enabled and there is enough space", async () => {
            render([defaultGauge], {
                svg: svg,
                style: defaultStyling,
                size: { width: 300, height: 400 },
                showMinMax: true
            });

            await awaitTransitions();

            expect(svg.selectAll(".min-label").style("opacity")).toBe("1");
            expect(svg.selectAll(".max-label").style("opacity")).toBe("1");
        });

        it("should not renders min max labels when size is available", async () => {
            render([defaultGauge], {
                svg: svg,
                style: defaultStyling,
                size: { width: 40, height: 40 },
                showMinMax: true
            });

            await awaitTransitions();

            expect(svg.selectAll(".min-label").style("opacity")).toBe("0");
            expect(svg.selectAll(".max-label").style("opacity")).toBe("0");
        });

        for (const padAngle of padAngles) {
            for (const arcWidth of arcWidths) {
                it(`should be separated with of pad angle of ${padAngle}° and arc width of ${arcWidth} percent`, async () => {
                    render([defaultGauge], {
                        svg: svg,
                        style: defaultStyling,
                        size: { width: 100, height: 100 },
                        showMinMax: true,
                        padAngle,
                        arcWidth
                    });

                    await awaitTransitions();

                    expectMinMaxLabelsToBeSeparate(svg);
                    expectLabelsToBeWithinGaugeGroup(svg);
                });

                it(`should render labels between minmax and gauge bottom with pad angle of ${padAngle}° and arc width of ${arcWidth} percent`, async () => {
                    render([defaultGauge], {
                        svg: svg,
                        style: defaultStyling,
                        size: { width: 100, height: 100 },
                        showMinMax: true,
                        padAngle,
                        arcWidth
                    });

                    await awaitTransitions();

                    expectLabelsToBeBelowMinMaxAndInsideGauge(svg);
                });
            }
        }
    });

    describe("Tick marks", () => {
        it("should be gray when empty", async () => {
            render([emptyGauge], {
                svg: svg,
                style: defaultStyling,
                size: { width: 300, height: 400 },
                showMinMax: false
            });

            await awaitTransitions();

            svg.selectAll(".tick").each(function (d) {
                expect(d3.select(this).attr("fill")).toBe("rgb(221, 221, 221)");
            });
        });
        
        it("should be color of gauge when full", async () => {
            render([fullGauge], {
                svg: svg,
                style: defaultStyling,
                size: { width: 300, height: 400 },
                showMinMax: false
            });

            await awaitTransitions();

            svg.selectAll(".tick").each(function (d) {
                expect(d3.select(this).attr("fill")).toBe(fullGauge.color);
            });
        });
    });
});

function appendSvg() {
    return d3.select("body").append("svg").attr("xmlns", "http://www.w3.org/2000/svg");
}

function ceil(n: number) {
    return Math.ceil(n * 100);
}

function floor(n: number) {
    return Math.floor(n * 100);
}

function expectArcToBeWithinGaugeGroup(svg: d3.Selection<SVGSVGElement, unknown, HTMLElement, any>) {
    let bgBox = (svg.select(".scale").node() as HTMLElement).getBoundingClientRect();
    let gaugeBox = (svg.select(".gauge").node() as HTMLElement).getBoundingClientRect();
    underAndWithinSides(bgBox, gaugeBox);
}

function underAndWithinSides(inner: DOMRect, outer: DOMRect) {
    expect(ceil(inner.y)).toBeGreaterThanOrEqual(ceil(outer.y));
    expect(ceil(inner.x)).toBeGreaterThanOrEqual(ceil(outer.x));
    expect(ceil(inner.x + inner.width)).toBeLessThanOrEqual(ceil(outer.x + outer.width));
}

function expectMinMaxLabelsToBeSeparate(svg: d3.Selection<SVGSVGElement, unknown, HTMLElement, any>) {
    let minBox = (svg.select(".min-label").node() as HTMLElement).getBoundingClientRect();
    let maxBox = (svg.select(".max-label").node() as HTMLElement).getBoundingClientRect();
    expect(ceil(minBox.x + minBox.width)).toBeLessThan(ceil(maxBox.x));
}

function expectLabelsToBeBelowMinMaxAndInsideGauge(svg: d3.Selection<SVGSVGElement, unknown, HTMLElement, any>) {
    let gaugeBox = (svg.select(".gauge").node() as HTMLElement).getBoundingClientRect();
    let minBox = (svg.select(".min-label").node() as HTMLElement).getBoundingClientRect();
    let labelBox = (svg.select(".label").node() as HTMLElement).getBoundingClientRect();
    expect(ceil(labelBox.y)).toBeGreaterThanOrEqual(floor(minBox.y + minBox.height));
    expect(floor(labelBox.y + labelBox.height)).toBeLessThanOrEqual(ceil(gaugeBox.y + gaugeBox.height));
}

function expectLabelsToBeWithinGaugeGroup(svg: d3.Selection<SVGSVGElement, unknown, HTMLElement, any>) {
    let gaugeBox = (svg.select(".gauge").node() as HTMLElement).getBoundingClientRect();
    let minBox = (svg.select(".min-label").node() as HTMLElement).getBoundingClientRect();
    let maxBox = (svg.select(".max-label").node() as HTMLElement).getBoundingClientRect();
    expect(ceil(minBox.x)).toBeGreaterThanOrEqual(ceil(gaugeBox.x));
    expect(ceil(maxBox.x + maxBox.width)).toBeLessThanOrEqual(ceil(gaugeBox.x + gaugeBox.width));
}

async function awaitTransitions() {
    await new Promise<void>((res) => {
        requestAnimationFrame(() => {
            res();
        });
    });
}
