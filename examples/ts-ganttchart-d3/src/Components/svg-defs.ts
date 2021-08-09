import * as d3 from "d3";
import { RenderInfo } from "../interfaces";
import { D3_SELECTION, ViewMode } from "../custom-types";
import { config } from "../global-settings";

export function renderDefs(parent: D3_SELECTION, renderInfo: RenderInfo) {
    const defs = parent.append("defs").attr("id", "GanttDefinitions");
    buildDefs(defs, renderInfo);
}

export function updateDefs(renderInfo: RenderInfo) {
    const defs = d3.select<SVGElement, unknown>("#GanttDefinitions");
    defs.selectAll("*").remove();

    buildDefs(defs, renderInfo);
}

function buildDefs(defs: D3_SELECTION, renderInfo: RenderInfo) {

    let todaysLineY: number = config.viewModeSliderHeight + config.zoomSliderHeight + config.headerHeight;
    
    if (renderInfo.state.viewMode === ViewMode.Year) {
        todaysLineY -= d3.select<SVGPathElement, unknown>("#Years").node().getBBox().height;
    } else if (renderInfo.state.viewMode === ViewMode.Month) {
        todaysLineY -= d3.select<SVGPathElement, unknown>("#Months").node().getBBox().height;
    } else if (renderInfo.state.viewMode === ViewMode.Day) {
        todaysLineY -= d3.select<SVGPathElement, unknown>("#Days").node().getBBox().height;
    }

    defs.append("clipPath")
        .attr("id", "LabelsClip")
        .append("rect")
        .attr("x", 0)
        .attr("y", config.viewModeSliderHeight + config.zoomSliderHeight + config.headerHeight + 1)
        .attr("width", config.svgWidth - config.scrollBarThickness)
        .attr("height", config.chartHeight - 2);
    defs.append("clipPath")
        .attr("id", "ChartClip")
        .append("rect")
        .attr("x", config.labelsWidth - 1)
        .attr("y", config.svgHeight - config.chartHeight)
        .attr("width", config.chartWidth + 2)
        .attr("height", config.chartHeight);
    defs.append("clipPath")
        .attr("id", "TodayLineClip")
        .append("rect")
        .attr("x", config.labelsWidth)
        .attr("y", todaysLineY)
        .attr("width", config.chartWidth)
        .attr("height", config.svgHeight - todaysLineY);
}
