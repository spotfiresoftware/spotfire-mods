import { D3_SELECTION } from "../custom-types";
import { config } from "../global-settings";
import { dateDiffInDays, getDates } from "../utils";
import * as d3 from "d3";
import { updateGantt } from "./gantt";
import { RenderInfo } from "../interfaces";

export function renderZoomSlider(parent: D3_SELECTION, renderInfo: RenderInfo) {
    let x: number = config.labelsWidth;
    const y: number = config.viewModeSliderHeight + config.zoomSliderHeight / 2 - config.scrollBarThickness;
    const allDates = getDates(config.minDate, config.maxDate);
    const thumbWidth = 14;

    const totalDays = dateDiffInDays(config.minDate, config.maxDate, true);
    const currentDays = dateDiffInDays(renderInfo.state.startDate, renderInfo.state.endDate, true);
    const daysFromMin = dateDiffInDays(config.minDate, renderInfo.state.startDate);
    const oneDayWidth = (config.chartWidth - 2 * thumbWidth) / totalDays;
    let zoomSliderWidth = oneDayWidth * currentDays;
    let zoomSliderX = x + thumbWidth + daysFromMin * oneDayWidth;

    const zoomSliderContainer = parent.append("g").attr("id", "ZoomSlider");

    zoomSliderContainer
        .append("rect")
        .attr("x", x)
        .attr("y", y)
        .attr("rx", "2px")
        .attr("ry", "2px")
        .attr("width", config.chartWidth)
        .attr("height", "6px")
        .style("fill", "#F0F1F2");

    const zoomSlider = zoomSliderContainer
        .append("rect")
        .attr("style", "cursor:pointer")
        .attr("width", zoomSliderWidth)
        .attr("height", "6px")
        .attr("opacity", 1)
        .attr("fill", "#C6C8CC")
        .attr("x", zoomSliderX)
        .attr("y", y);

    const leftThumb = zoomSliderContainer
        .append("rect")
        .attr("style", "cursor:pointer; stroke:#8F9299")
        .attr("width", thumbWidth)
        .attr("height", thumbWidth)
        .attr("rx", "4px")
        .attr("ry", "4px")
        .attr("fill", "#F8F8F8")
        .attr("x", x + daysFromMin * oneDayWidth)
        .attr("y", y - 4);

    const rightThumb = zoomSliderContainer
        .append("rect")
        .attr("style", "cursor:pointer; stroke:#8F9299")
        .attr("width", thumbWidth)
        .attr("height", thumbWidth)
        .attr("rx", "4px")
        .attr("ry", "4px")
        .attr("fill", "#F8F8F8")
        .attr("x", zoomSliderX + zoomSliderWidth)
        .attr("y", y - 4);

    const rightThumbDragBehaviour = d3.drag().on("drag", (event) => {
        const currentX = parseFloat(rightThumb.attr("x"));
        const rightMargin = x + config.chartWidth - thumbWidth;
        const leftMargin = parseFloat(leftThumb.attr("x")) + thumbWidth + oneDayWidth;
        let delta = event.dx;

        if(currentX + delta <= leftMargin) {
            delta = -1 * (currentX - leftMargin - 1);
        } else if(currentX + delta >= rightMargin) {
            delta = rightMargin - currentX - 1;
        }

        if (currentX + delta > leftMargin && currentX + delta < rightMargin) {
            zoomSliderWidth += delta;
            rightThumb.attr("x", currentX + delta);
            zoomSlider.attr("width", zoomSliderWidth);

            const endDateScale = d3.scaleQuantize(
                [x + thumbWidth + oneDayWidth, rightMargin],
                allDates
            );
            renderInfo.state.endDate = new Date(endDateScale(currentX + delta));
            updateGantt(parent, renderInfo);
        }
    });
    rightThumb.call(rightThumbDragBehaviour);

    const leftThumbDragBehaviour = d3.drag().on("drag", (event) => {
        const currentX = parseFloat(leftThumb.attr("x"));
        const leftMargin = x;
        const rightMargin = parseFloat(rightThumb.attr("x")) - thumbWidth - oneDayWidth;
        let delta = event.dx;

        if(currentX + delta <= leftMargin) {
            delta = -1 * (currentX - leftMargin - 1);
        } else if(currentX + delta >= rightMargin) {
            delta = rightMargin - currentX - 1;
        }

        if (currentX + delta > leftMargin && currentX + delta < rightMargin) {
            zoomSliderWidth -= delta;
            let zoomSliderX = parseFloat(zoomSlider.attr("x"));
            zoomSliderX += delta;
            leftThumb.attr("x", currentX + delta);
            zoomSlider.attr("width", zoomSliderWidth);
            zoomSlider.attr("x", zoomSliderX);

            const startDateScale = d3.scaleQuantize(
                [leftMargin, x + config.chartWidth - thumbWidth - oneDayWidth],
                allDates
            );
            renderInfo.state.startDate = new Date(startDateScale(currentX + delta));
            updateGantt(parent, renderInfo);
        }
    });
    leftThumb.call(leftThumbDragBehaviour);

    const zoomSliderDragBehaviour = d3.drag().on("drag", (event) => {
        const currentSliderX = parseFloat(zoomSlider.attr("x"));
        const currentLeftThumbX = parseFloat(leftThumb.attr("x"));
        const currentRightThumbX = parseFloat(rightThumb.attr("x"));
        const leftMargin = x + thumbWidth;
        const rightMargin = x + config.chartWidth - thumbWidth;
        let delta = event.dx;

        if(currentSliderX + delta <= leftMargin) {
            delta = -1 * (currentSliderX - leftMargin - 1);
        } else if(currentSliderX + delta >= rightMargin) {
            delta = rightMargin - currentSliderX - 1;
        }

        if (currentSliderX + delta > leftMargin && currentSliderX + zoomSliderWidth + delta < rightMargin) {
            zoomSlider.attr("x", currentSliderX + delta);
            leftThumb.attr("x", currentLeftThumbX + delta);
            rightThumb.attr("x", currentRightThumbX + delta);

            const zoomSliderScale = d3.scaleQuantize([leftMargin, rightMargin], allDates);
            renderInfo.state.startDate = new Date(zoomSliderScale(currentLeftThumbX + delta));
            renderInfo.state.endDate = new Date(zoomSliderScale(currentRightThumbX + delta));
            updateGantt(parent, renderInfo);
        }
    });
    zoomSlider.call(zoomSliderDragBehaviour);
}
