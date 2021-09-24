import * as d3 from "d3";
import { Tooltip, DataView, StylingInfo } from "spotfire/spotfire-api-1-2";
import { config } from "./global-settings";
import { renderGantt } from "./Components/gantt";
import { GanttData } from "./custom-types";
import { addHandlersSelection } from "./Components/ui-input";
import { getTranslation, textWidth } from "./utils";
import { RenderState } from "./interfaces";

/**
 * Main svg container
 */
const svg = d3.select("#mod-container").append("svg").attr("xmlns", "http://www.w3.org/2000/svg");

export async function render(
    data: GanttData[],
    dataView: DataView,
    state: RenderState,
    minDate: Date,
    maxDate: Date,
    tooltip: Tooltip,
    styling: StylingInfo,
    windowSize: Spotfire.Size,
    interactive: boolean
) {
    if (state.preventRender) {
        // Early return if the state currently disallows rendering.
        return;
    }

    const onSelection = (dragSelectActive: boolean) => {
        state.preventRender = dragSelectActive;
    };

    const lvl0Elements = data.filter((d) => d.level === 0).length;
    let gapsHeight = 0;

    if (lvl0Elements > 0) {
        gapsHeight = config.spaceBetweenGroups * (lvl0Elements - 1);
    }

    if(!interactive) {
        config.zoomSliderHeight = 0;
        config.viewModeSliderHeight = 0;
    }

    const maxHeight = windowSize.height;
    const svgHeight =
        config.viewModeSliderHeight +
        config.zoomSliderHeight +
        config.headerHeight +
        data.length * config.rowHeight +
        gapsHeight;

    config.svgHeight = svgHeight > maxHeight ? maxHeight : svgHeight;
    config.svgWidth = windowSize.width;

    config.labelsWidth = 0;
    data.map((d) => {
        const labelWidth = Math.floor(
            textWidth(d.text, styling.scales.font.fontSize, styling.scales.font.fontFamily, 8 + d.level * 8).widht + 32
        );
        if (labelWidth > config.labelsWidth) {
            config.labelsWidth = labelWidth;
        }
    });

    if (config.labelsWidth > config.maxLabelsWidthPercentage * config.svgWidth) {
        config.labelsWidth = config.maxLabelsWidthPercentage * config.svgWidth;
    }

    config.chartWidth = config.svgWidth - config.labelsWidth - config.scrollBarThickness;
    config.chartHeight = config.svgHeight - config.viewModeSliderHeight - config.zoomSliderHeight - config.headerHeight;
    config.minDate = minDate;
    config.maxDate = maxDate;

    svg.attr("viewBox", `0, 0, ${config.svgWidth}, ${config.svgHeight}`);
    svg.selectAll("*").remove();

    await (document as any).fonts.ready;

    renderGantt(svg, data, state, tooltip, styling, interactive);

    svg.on("click", (e) => {
        const header = e.target.closest("#Header");
        const labels = e.target.closest("#LabelsContainer");
        const zoomSlider = e.target.closest("#ZoomSlider");
        const viewModeSlider = e.target.closest("#ViewModeSlider");
        if (
            (header && header.classList.contains("skip-unmark")) ||
            (labels && labels.classList.contains("skip-unmark")) ||
            zoomSlider ||
            viewModeSlider ||
            e.target.classList.contains("marking-element")
        ) {
            return;
        }

        dataView.clearMarking();
    });

    /**
     * This will add rectangle selection elements to DOM.
     * The callback will check the selection bounding box against each point and mark those that intersect the box.
     */
    addHandlersSelection((result) => {
        let { x, y, width, height, ctrlKey, dragSelectActive } = result;

        const yValue = getTranslation(d3.select("#Bars").attr("transform"))[1];
        y = y - yValue;

        onSelection(dragSelectActive);
        data.forEach((d) => {
            if (d.x >= x && d.x <= x + width && d.y >= y && d.y <= y + height) {
                d.mark(ctrlKey);
            }
        });
    });
}
