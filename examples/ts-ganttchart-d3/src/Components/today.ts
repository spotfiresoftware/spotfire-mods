import * as d3 from "d3";
import { RenderInfo } from "../interfaces";
import { D3_SELECTION, ViewMode } from "../custom-types";
import { config } from "../global-settings";
import { dateDiffInDays, time2Pixel } from "../utils";

export function renderTodayLine(parent: D3_SELECTION, renderInfo: RenderInfo) {
    const unitWidth = config.chartWidth / dateDiffInDays(renderInfo.state.startDate, renderInfo.state.endDate, true);

    const todayContainer = parent
        .append("g")
        .attr("id", "TodayLine")
        .attr("clip-path", "url(#TodayLineClip)")
        .on("mouseover", () => {
            todayContainer.select("line").style("stroke-width", "2px");
            renderInfo.tooltip.show(new Date().toString());
        })
        .on("mouseout", () => {
            todayContainer.select("line").style("stroke-width", "1px");
            renderInfo.tooltip.hide();
        })
        .style("cursor", "pointer");

    buildTodayLine(todayContainer, unitWidth, renderInfo);
}

export function updateTodayLine(renderInfo: RenderInfo) {
    const unitWidth = config.chartWidth / dateDiffInDays(renderInfo.state.startDate, renderInfo.state.endDate, true);
    const todayContainer = d3.select("#TodayLine");
    todayContainer.selectAll("*").remove();
    buildTodayLine(todayContainer, unitWidth, renderInfo);
}

function buildTodayLine(todayContainer, unitWidth, renderInfo: RenderInfo) {
    let y: number = config.viewModeSliderHeight + config.zoomSliderHeight + config.headerHeight;
    
    if (renderInfo.state.viewMode === ViewMode.Year) {
        y -= d3.select<SVGElement, unknown>("#Years").node().getBoundingClientRect().height;
    } else if (renderInfo.state.viewMode === ViewMode.Month) {
        y -= d3.select<SVGElement, unknown>("#Months").node().getBoundingClientRect().height;
    } else if (renderInfo.state.viewMode === ViewMode.Day) {
        y -= d3.select<SVGElement, unknown>("#Days").node().getBoundingClientRect().height;
    }

    const todayX = config.labelsWidth + time2Pixel(renderInfo.state.startDate, new Date(), unitWidth);

    todayContainer
        .append("rect")
        .attr("x", todayX - 5)
        .attr("y", y)
        .attr("width", 10)
        .attr("height", config.svgHeight - y)
        .style("fill", "transparent");

    todayContainer
        .append("line")
        .attr("x1", todayX)
        .attr("x2", todayX)
        .attr("y1", y)
        .attr("y2", config.svgHeight)
        .classed("current-day", true);
}
