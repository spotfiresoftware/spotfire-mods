import { D3_SELECTION, D3_SELECTION_BASE } from "../custom-types";
import { config } from "../global-settings";
import { dateDiffInDays, getDates, increaseBrightness, insideBoundingBox, textWidth } from "../utils";
import { renderText } from "../render-helper";
import * as d3 from "d3";
//@ts-ignore
import * as moment from "moment";
import { RenderInfo } from "../interfaces";
//@ts-ignore
import invert from "invert-color/lib/invert";
import { Tooltip } from "spotfire/spotfire-api-1-2";

export function renderBars(parent: D3_SELECTION, renderInfo: RenderInfo) {
    const y: number = config.viewModeSliderHeight + config.zoomSliderHeight + config.headerHeight;
    const barsContainer = parent.append("g").attr("id", "BarsContainer").attr("clip-path", "url(#ChartClip)");
    const grid = barsContainer.append("g").attr("id", "Grid");
    const bars = barsContainer
        .append("g")
        .attr("id", "Bars")
        .attr("x", config.labelsWidth)
        .attr("y", y)
        .attr("width", config.chartWidth)
        .attr("height", renderInfo.data.length * config.rowHeight);

    buildGrid(grid, renderInfo);
    buildBars(bars, renderInfo);
}

export function updateBars(renderInfo: RenderInfo) {
    const barsContainer = d3.select("#BarsContainer");
    barsContainer.selectAll("*").remove();

    const grid = barsContainer.append("g").attr("id", "Grid");
    buildGrid(grid, renderInfo);

    const bars = barsContainer.append("g").attr("id", "Bars");
    buildBars(bars, renderInfo);
}

function updateGrid(renderInfo: RenderInfo) {
    const grid = d3.select("#Grid");
    grid.selectAll("*").remove();

    buildGrid(grid, renderInfo);
}

function buildGrid(grid: D3_SELECTION_BASE, renderInfo: RenderInfo) {
    let x: number = config.labelsWidth;
    const y: number = config.viewModeSliderHeight + config.zoomSliderHeight + config.headerHeight;
    const dates = getDates(renderInfo.state.startDate, renderInfo.state.endDate);

    const lang = navigator.language;
    moment.locale(lang);

    const lvl0Elements = renderInfo.data.filter((d) => d.level === 0).length;
    let gapsHeight = 0;

    if (lvl0Elements > 0) {
        gapsHeight = config.spaceBetweenGroups * (lvl0Elements - 1);
    }

    dates.map((d, i) => {
        const currentDate = new Date(d);
        const momentDate = moment(currentDate);
        const isoDay = momentDate.isoWeekday();
        const dayOfWeek = momentDate.weekday();

        grid.append("path")
        .attr("d", `M${x} ${y} v${y + renderInfo.data.length * config.rowHeight + gapsHeight}`)
        .style("fill", "transparent")
        .style("pointer-events", "none")
        .style("stroke-width", dayOfWeek === 0 ? "2px" : "1px")
        .style("stroke", renderInfo.styling.scales.line.stroke);

        if (config.showWeekend && (isoDay === 6 || isoDay === 7)) {
            grid.append("path")
                .attr(
                    "d",
                    `M${x} ${y} h${renderInfo.state.unitWidth} v${
                        renderInfo.data.length * config.rowHeight + gapsHeight
                    } h${-renderInfo.state.unitWidth} z`
                )
                .style("pointer-events", "none")
                .style(
                    "fill",
                    renderInfo.styling.general.backgroundColor !== "transparent"
                        ? invert(renderInfo.styling.general.backgroundColor)
                        : renderInfo.styling.scales.font.color
                )
                .style("fill-opacity", "0.1");
        }

        x += renderInfo.state.unitWidth;
    });

    grid.append("path")
        .attr("d", `M${x} ${y} v${y + renderInfo.data.length * config.rowHeight + gapsHeight}`)
        .style("fill", "transparent")
        .style("pointer-events", "none")
        .style("stroke", renderInfo.styling.scales.line.stroke);

    grid.append("path")
        .attr("d", `M${config.labelsWidth} ${config.svgHeight} H${config.svgWidth - config.scrollBarThickness}`)
        .style("fill", "transparent")
        .style("stroke", renderInfo.styling.scales.line.stroke);
}

function buildBars(bars: D3_SELECTION_BASE, renderInfo: RenderInfo) {
    const unitWidth = config.chartWidth / dateDiffInDays(renderInfo.state.startDate, renderInfo.state.endDate, true);
    const y: number = config.viewModeSliderHeight + config.zoomSliderHeight + config.headerHeight;
    let x = config.labelsWidth;
    let rowHeight = config.rowHeight;

    const lang = navigator.language;
    moment.locale(lang);

    const getFormattedDateTime = (dateTime: Date) =>
        dateTime.toLocaleDateString(lang, {
            month: "numeric",
            day: "numeric"
        });

    let barY = y + (config.rowHeight - config.barHeight) / 2;
    renderInfo.data.map((v, i) => {
        const bar = bars.append("g");
        const daysFromMin = dateDiffInDays(renderInfo.state.startDate, v.start);
        let barDays = dateDiffInDays(v.start, v.end);
        const barX = x + daysFromMin * unitWidth;
        if (barDays === 0) {
            barDays = 0.5;
        }
        const barWidth = barDays * unitWidth;

        if (i !== 0 && v.level === 0) {
            barY += config.spaceBetweenGroups;
        }

        const startText = renderText(
            bar,
            barX - 4,
            barY + config.barHeight / 2,
            getFormattedDateTime(v.start),
            renderInfo.styling,
            "end"
        );

        const endText = renderText(
            bar,
            barX + barWidth + 4,
            barY + config.barHeight / 2,
            getFormattedDateTime(v.end),
            renderInfo.styling,
            "start"
        );

        const textHeight = endText.node().getBBox().height;
        if (textHeight + config.minPadding > rowHeight) {
            rowHeight = Math.ceil((textHeight + config.minPadding) / config.minPadding) * config.minPadding;
            barY = y + (rowHeight - config.barHeight) / 2;
            startText.attr("y", barY + config.barHeight / 2);
            endText.attr("y", barY + config.barHeight / 2);
        }

        v.x = barX;
        v.y = barY;
        v.width = barWidth;
        v.heigth = config.barHeight;

        const overdue = config.showOverdue ? v.percent < 1 && v.end < new Date() : false;
        const color = v.color;

        if (overdue) {
            renderWarningIcon(
                bar,
                barX +
                    barWidth +
                    textWidth(
                        getFormattedDateTime(v.end),
                        renderInfo.styling.scales.font.fontSize,
                        renderInfo.styling.scales.font.fontFamily,
                        8
                    ).widht,
                barY + config.barHeight / 2 - 8,
                renderInfo.tooltip
            );
        }

        bar.append("rect")
            .attr("x", barX)
            .attr("y", barY)
            .attr("width", barWidth)
            .attr("height", config.barHeight)
            .style("fill", increaseBrightness(color, 40));

        bar.append("rect")
            .attr("x", barX)
            .attr("y", barY)
            .attr("width", barWidth * v.percent)
            .attr("height", config.barHeight)
            .style("fill", color);

        bar.append("rect")
            .attr("x", barX - 3)
            .attr("y", barY - 3)
            .attr("width", barWidth + 6)
            .attr("height", config.barHeight + 6)
            .classed("bar-hover", true)
            .classed("marking-element", true)
            .style("fill", "transparent")
            .style(
                "stroke",
                renderInfo.styling.general.backgroundColor !== "transparent"
                    ? invert(renderInfo.styling.general.backgroundColor)
                    : renderInfo.styling.scales.font.color
            )
            .on("mouseover", v.showTooltip)
            .on("mouseout", v.hideTooltip)
            .on("click", (e) => {
                v.mark(e.ctrlKey);
            });

        barY += rowHeight;
    });

    const texts = d3.selectAll("#Bars text");

    texts.each(function (_, i) {
        let textElement = d3.select(this as SVGPathElement);
        let gridElement = d3.select<SVGPathElement, unknown>("#Grid");
        let textBoundingBox = textElement.node().getBBox();
        const gridBoundingBox = gridElement.node().getBBox();
        while (!insideBoundingBox(textBoundingBox, gridBoundingBox) && textElement.text() !== "") {
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

    config.rowHeight = rowHeight;
}

function renderWarningIcon(parent: D3_SELECTION_BASE, x: number, y: number, tooltip: Tooltip) {
    const icon = parent
        .append("g")
        .attr("transform", `translate(${x} ${y})`)
        .style("cursor", "pointer")
        .on("mouseover", () => {
            tooltip.show("Overdue task");
        })
        .on("mouseout", () => {
            tooltip.hide();
        });
    const iconG = icon.append("g").attr("transform", `translate(72 -308)`);
    iconG
        .append("path")
        .attr(
            "d",
            "M-56.21,320.76l-3.25-5.5-3.241-5.509a1.52,1.52,0,0,0-1.991-.59l-.037.019a1.5,1.5,0,0,0-.591.572l-3.236,5.5-3.237,5.5a1.462,1.462,0,0,0,.506,2.005l.06.034a1.534,1.534,0,0,0,.751.2h12.95A1.521,1.521,0,0,0-56,321.484h0A1.4,1.4,0,0,0-56.21,320.76Z"
        )
        .attr("fill", "#fab632");
    iconG.append("path").attr("d", "M-65,318h2v2h-2Z").attr("fill", "#fff");
    iconG.append("path").attr("d", "M-65,314h2v3h-2Z").attr("fill", "#fff");
}
