import { renderText } from "../render-helper";
import { config } from "../global-settings";
import { adjustText } from "../utils";
import * as d3 from "d3";
import { updateBars } from "./bars";
import { RenderInfo } from "../interfaces";
import { D3_SELECTION } from "../custom-types";

export function renderLabels(parent: D3_SELECTION, renderInfo: RenderInfo) {
    const labelsContainer = parent
        .append("g")
        .attr("id", "LabelsContainer")
        .attr("clip-path", "url(#LabelsClip)")
        .attr("class", renderInfo.state.isEditing ? "skip-unmark" : "")
        .style("cursor", renderInfo.state.isEditing ? "pointer" : "default")
        .on("click", (e) => {
            if(config.onScaleClick) {
                config.onScaleClick(e.clientX, e.clientY);
            }
        });
    const labels = labelsContainer.append("g").attr("id", "Labels");

    buildLabels(labels, renderInfo);
}

export function updateLabels(renderInfo: RenderInfo) {
    const labels = d3.select<SVGElement, unknown>("#Labels");
    labels.selectAll("*").remove();

    buildLabels(labels, renderInfo);
}

function buildLabels(labels: D3_SELECTION, renderInfo: RenderInfo) {
    const y = config.viewModeSliderHeight + config.zoomSliderHeight + config.headerHeight;

    let textContainerY = y;
    let rowHeight = config.rowHeight;

    renderInfo.data.map((v, i) => {
        if (i !== 0 && v.level === 0) {
            textContainerY += config.spaceBetweenGroups;
            labels
                .append("path")
                .attr("d", `M${0} ${textContainerY} H${config.svgWidth - config.scrollBarThickness}`)
                .style("fill", "transparent")
                .style("stroke", renderInfo.styling.scales.line.stroke);
        }

        const textPath = labels
            .append("path")
            .attr("d", `M${0} ${textContainerY} h${config.labelsWidth} v${rowHeight} h${-config.labelsWidth}`)
            .style("fill", "transparent");

        const text = renderText(
            labels,
            8 + v.level * 8,
            textContainerY + rowHeight / 2,
            v.text,
            renderInfo.styling,
            "start",
            true
        );

        const textHeight = text.node().getBBox().height;
        if (textHeight + config.minPadding > rowHeight) {
            rowHeight = Math.ceil((textHeight + config.minPadding) / config.minPadding) * config.minPadding;
            text.attr("y", textContainerY + rowHeight / 2);
            textPath.attr("d", `M${0} ${textContainerY} h${config.labelsWidth} v${rowHeight} h${-config.labelsWidth}`);
        }

        if (v.level === 0) {
            text.style("font-size", parseInt(renderInfo.styling.scales.font.fontSize.toString()) + 4);
            text.style("font-weight", "bold");
        }
        if (v.level === 1) {
            text.style("font-size", parseInt(renderInfo.styling.scales.font.fontSize.toString()) + 2);
        }
        textContainerY += rowHeight;
    });

    adjustText("Labels", renderInfo.tooltip);

    config.rowHeight = rowHeight;

    updateBars(renderInfo);
}
