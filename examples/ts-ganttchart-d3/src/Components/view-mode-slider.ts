import { D3_SELECTION, D3_SELECTION_SVGG, ViewMode } from "../custom-types";
import { config } from "../global-settings";
import { getTranslation, insideBoundingBox, textWidth } from "../utils";
import * as d3 from "d3";
import { renderText } from "../render-helper";
import { updateGantt } from "./gantt";
import { RenderInfo } from "../interfaces";

const viewModeSliderMinWidth = 146;
const sliderLinesGap = 2;
const textPadding = 8;
const textY = 18;
const thumbY = 2;

export function renderViewModeSlider(parent: D3_SELECTION_SVGG, renderInfo: RenderInfo) {
    const textMeasures = textWidth(
        "YearMonthDay",
        renderInfo.styling.scales.font.fontSize,
        renderInfo.styling.scales.font.fontFamily,
        textPadding
    );
    const viewModeSliderWidth = Math.min(config.chartWidth, Math.max(viewModeSliderMinWidth, textMeasures.widht));
    const viewModeSliderLineWidth = (viewModeSliderWidth - sliderLinesGap) / 2;
    const centerX = config.labelsWidth + config.chartWidth / 2;
    const dayX = centerX + viewModeSliderLineWidth - 4;
    const monthX = centerX - 4;
    const yearX = centerX - viewModeSliderLineWidth - 5;
    const viewModeScale = d3.scaleQuantize().domain([yearX, dayX]).range([yearX, monthX, monthX, dayX]);
    const viewModeTypeScale = d3.scaleOrdinal<number, ViewMode, never>().domain([yearX, monthX, dayX]).range([ViewMode.Year, ViewMode.Month, ViewMode.Day]);
    const thumbX = renderInfo.state.viewMode === ViewMode.Day ? dayX : renderInfo.state.viewMode === ViewMode.Month ? monthX : yearX;

    const viewModeSliderContainer = parent.append("g").attr("id", "ViewModeSlider");
    
    renderText(viewModeSliderContainer, centerX - viewModeSliderLineWidth - 1, textY, "Year", renderInfo.styling, "middle", false, "hanging");
    renderText(viewModeSliderContainer, centerX + 1, textY, "Month", renderInfo.styling, "middle", false, "hanging");
    renderText(viewModeSliderContainer, centerX + viewModeSliderLineWidth + 1, textY, "Day", renderInfo.styling, "middle", false, "hanging");

    const texts = d3.selectAll("#ViewModeSlider text");

    texts.each(function (_, i) {
        let textElement = d3.select(this as SVGPathElement);
        let textBoundingBox = textElement.node().getBBox();
        const svgBoundingBox = parent.node().getBoundingClientRect();
        while (!insideBoundingBox(textBoundingBox, svgBoundingBox) && textElement.text() !== "") {
            const text = textElement.text();
  
            if (text.length > 4) {
                textElement.text(text.slice(0, -4) + "...");
            } else if (!text.includes("...")) {
                textElement.text(text.slice(0, -1));
            } else {
                textElement.text(text.slice(0, -3));
            }
            textBoundingBox = textElement.node().getBBox();
        }
    });

    viewModeSliderContainer
        .append("rect")
        .attr("x", centerX - viewModeSliderLineWidth - 1)
        .attr("y", 6)
        .attr("width", viewModeSliderLineWidth)
        .attr("height", 1)
        .style("fill", renderInfo.styling.scales.font.color);

    viewModeSliderContainer
        .append("rect")
        .attr("x", centerX + 1)
        .attr("y", 6)
        .attr("width", viewModeSliderLineWidth)
        .attr("height", 1)
        .style("fill", renderInfo.styling.scales.font.color);

    viewModeSliderContainer
        .append("rect")
        .attr("x", centerX - viewModeSliderLineWidth - 1)
        .attr("y", -5)
        .attr("width", 2 * viewModeSliderLineWidth + 2)
        .attr("height", 20)
        .style("cursor", "pointer")
        .style("fill", "transparent")
        .on("click", (evt) => {
            var dim = parent.node().getBBox();
            var x = evt.clientX - dim.x;
            const viewModeX = viewModeScale(x);
            renderInfo.state.viewMode = viewModeTypeScale(viewModeX);
            thumb.attr("transform", `translate(${viewModeX}, ${thumbY})`);
            updateGantt(parent, renderInfo);
        });

    const thumb = viewModeSliderContainer
        .append("g")
        .attr("transform", `translate(${thumbX}, ${thumbY})`)
        .style("cursor", "pointer");

    thumb
        .append("g")
        .style("fill", renderInfo.styling.scales.font.color)
        .append("path")
        .attr(
            "d",
            "M7,0H2C0.895,0,0,0.923,0,2.062v4.156c0,0.709,0.228,1.037,0.876,1.705L4.5,12l3.624-4.078C8.772,7.255,9,6.926,9,6.218V2.062C9,0.923,8.105,0,7,0z"
        );
    thumb
        .append("g")
        .style("fill", "#D8D9DC")
        .append("path")
        .attr(
            "d",
            "M7,1H2C1.449,1,1,1.477,1,2.062V6.22c0,0.313,0,0.397,0.594,1.009L4.5,10.5l2.877-3.239C8,6.617,8,6.533,8,6.22V2.062C8,1.477,7.551,1,7,1z"
        );

    const thumbDragBehaviour = d3
        .drag()
        .on("drag", (event) => {
            const currentX = getTranslation(thumb.attr("transform"))[0];
            const rightMargin = dayX;
            const leftMargin = yearX;

            if (currentX + event.dx > leftMargin && currentX + event.dx < rightMargin) {
                thumb.attr("transform", `translate(${currentX + event.dx}, ${thumbY})`);
            }
        })
        .on("end", (event) => {
            const currentX = getTranslation(thumb.attr("transform"))[0];     
            const viewModeX = viewModeScale(currentX);
            renderInfo.state.viewMode = viewModeTypeScale(viewModeX);
            thumb.attr("transform", `translate(${viewModeX}, ${thumbY})`);
            updateGantt(parent, renderInfo);
        });
    thumb.call(thumbDragBehaviour);

    config.viewModeSliderHeight = Math.floor(viewModeSliderContainer.node().getBBox().height + 8);
}