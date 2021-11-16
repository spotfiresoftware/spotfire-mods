import * as d3 from "d3";
import { Gauge, render } from "../src/render";

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

const defaultGauge2: Gauge = {
    color: "green",
    formattedValue: "10 000",
    key: "second",
    label: "Second",
    mark() {},
    maxLabel: "20 000",
    minLabel: "0",
    percent: 0.5
};

describe("Render", () => {
    let svg: d3.Selection<SVGSVGElement, unknown, HTMLElement, any>;
    beforeEach(() => {
        svg = appendSvg()
    });
    
    afterEach(() => {
        d3.selectAll("svg").remove();
    })

    it("Renders a group per gauge", async () => {
        render([defaultGauge], {
            svg: svg,
            style: defaultStyling,
            size: { width: 70, height: 40 }
        });

        expect(svg.selectAll("g.gauge").size()).toBe(1);

        render([defaultGauge, defaultGauge2], {
            svg: svg,
            style: defaultStyling,
            size: { width: 300, height: 400 },
            animationSpeed: 0
        });

        expect(svg.selectAll("g.gauge").size()).toBe(2);

        await awaitTransitions();

        expect(svg.selectAll(".label-value").text()).toBe("10 000");
    });

    describe("Min max labels", () => {
        it("Renders min max labels when size is available", async () => {
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

        let angles = [0, 5, 10, 15, 20, 30, 35, 40, 45, 50, 60, 70, 80, 90];
        let arcWidths = [2, 5, 9, 10, 20, 30, 40, 60, 80, 100];
        for (const padAngle of angles) {
            for (const arcWidth of arcWidths) {
                it(`should always be separated with of pad angle of ${padAngle}° and arc width of ${arcWidth} percent`, async () => {
                    render([defaultGauge], {
                        svg: svg,
                        style: defaultStyling,
                        size: { width: 100, height: 100 },
                        showMinMax: true,
                        padAngle,
                        arcWidth
                    });

                    await awaitTransitions();

                    expectLabelsToBeSeparate(svg);
                    expectLabelsToBeWithinGaugeGroup(svg);
                });
            }
        }
    });
});

function appendSvg() {
    return d3.select("body").append("svg").attr("xmlns", "http://www.w3.org/2000/svg");
}

function round(n: number) {
    return Math.ceil(n * 100);
}

function expectLabelsToBeSeparate(svg: d3.Selection<SVGSVGElement, unknown, HTMLElement, any>) {
    let minBox = (svg.select(".min-label").node() as HTMLElement).getBoundingClientRect();
    let maxBox = (svg.select(".max-label").node() as HTMLElement).getBoundingClientRect();
    expect(round(minBox.x + minBox.width)).toBeLessThan(round(maxBox.x));
}

function expectLabelsToBeWithinGaugeGroup(svg: d3.Selection<SVGSVGElement, unknown, HTMLElement, any>) {
    let gaugeBox = (svg.select(".gauge").node() as HTMLElement).getBoundingClientRect();
    let minBox = (svg.select(".min-label").node() as HTMLElement).getBoundingClientRect();
    let maxBox = (svg.select(".max-label").node() as HTMLElement).getBoundingClientRect();
    expect(round(minBox.x)).toBeGreaterThanOrEqual(round(gaugeBox.x));
    expect(round(maxBox.x + maxBox.width)).toBeLessThanOrEqual(round(gaugeBox.x + gaugeBox.width));
}

async function awaitTransitions() {
    await new Promise<void>((res) => {
        requestAnimationFrame(() => {
            res();
        });
    });
}
