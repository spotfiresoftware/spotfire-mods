import { D3_SELECTION, D3_SELECTION_SVGG, GanttData } from "../custom-types";
import { renderLabels, updateLabels } from "./labels";
import { renderBars, updateBars } from "./bars";
import { renderZoomSlider } from "./zoom-slider";
import { renderVerticalScroll, updateVerticalScroll } from "./vertical-scroll";
import { renderTodayLine, updateTodayLine } from "./today";
import { StylingInfo, Tooltip } from "spotfire/spotfire-api-1-2";
import { dateDiffInDays } from "../utils";
import { config } from "../global-settings";
import * as d3 from "d3";
import { renderViewModeSlider } from "./view-mode-slider";
import { renderHeader, updateHeader } from "./header";
import { renderDefs, updateDefs } from "./svg-defs";
import { RenderInfo, RenderState } from "../interfaces";

export function renderGantt(
    parent: D3_SELECTION_SVGG,
    data: GanttData[],
    state: RenderState,
    tooltip: Tooltip,
    styling: StylingInfo,
    interactive: boolean
) {
    const renderInfo: RenderInfo = {
        data: data,
        state: state,
        tooltip: tooltip,
        styling: styling,
        interactive: interactive
    };

    calculateUnitWidth(state);

    if (interactive) {
        renderViewModeSlider(parent, renderInfo);
        renderZoomSlider(parent, renderInfo);
    }

    renderHeader(parent, renderInfo);
    renderDefs(parent, renderInfo);
    renderBars(parent, renderInfo);
    renderLabels(parent, renderInfo);
    renderVerticalScroll(parent, renderInfo);
    renderTodayLine(parent, renderInfo);
}

export function updateGantt(parent: D3_SELECTION, renderInfo: RenderInfo) {
    calculateUnitWidth(renderInfo.state);

    updateHeader(renderInfo);
    updateDefs(renderInfo);
    updateBars(renderInfo);
    updateLabels(renderInfo);
    updateVerticalScroll(parent, renderInfo);
    updateTodayLine(renderInfo);
}

function calculateUnitWidth(state: RenderState) {
    let unitWidth = config.chartWidth / dateDiffInDays(state.startDate, state.endDate, true);

    const timeScale = d3
        .scaleTime()
        .domain([state.startDate, state.endDate])
        .range([config.labelsWidth, config.labelsWidth + config.chartWidth - unitWidth]);

    state.unitWidth = unitWidth;
    state.timeScale = timeScale;
}