import d3 from "d3";
import { render } from "../src/render";

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

describe("Render", () => {
    it("Render a default size", () => {
        const svg = d3.select("body").append("svg").attr("xmlns", "http://www.w3.org/2000/svg");

        render([], {
            svg: svg,
            style: defaultStyling
        });

        expect(svg.attr("width")).toBe("50");

        render([], {
            svg: svg,
            style: defaultStyling,
            size: { width: 70, height: 40 }
        });

        expect(svg.attr("width")).toBe("70");
        expect(svg.attr("height")).toBe("40");
    });
});
