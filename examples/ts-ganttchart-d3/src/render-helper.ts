import { StylingInfo } from "spotfire/spotfire-api-1-2";
import { D3_SELECTION } from "./custom-types";

export function renderText(
    parent: D3_SELECTION,
    x: number,
    y: number,
    text: string | number,
    styling: StylingInfo,
    anchor = "start",
    isScaleText = false,
    dominantBaseline = "central"
) {
    const font = isScaleText ? styling.scales.font : styling.general.font;

    return parent
        .append("text")
        .attr("x", x)
        .attr("y", y)
        .text(text)
        .style("text-anchor", anchor)
        .style("dominant-baseline", dominantBaseline)
        .style("font-size", font.fontSize + "px")
        .style("font-family", font.fontFamily)
        .style("font-weight", font.fontWeight)
        .style("font-stlye", font.fontStyle)
        .style("fill", font.color);
}
