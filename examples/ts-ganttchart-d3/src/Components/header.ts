//@ts-ignore
import * as moment from "moment";
import {
    D3_SELECTION,
    D3_SELECTION_SVGG,
    HeaderOptions,
    HeaderTypeInfo,
    TextToRender,
    ViewMode
} from "../custom-types";
import { config } from "../global-settings";
import * as d3 from "d3";
import { adjustText, getDates } from "../utils";
import { renderText } from "../render-helper";
import { Moment } from "node_modules/moment/ts3.1-typings/moment";
import { RenderInfo } from "../interfaces";
import { Tooltip } from "spotfire/spotfire-api-1-2";

let yearMonthMinHeight = 24;
let daysMinHeight = 18;
const heightScale = d3
    .scaleQuantize()
    .domain([yearMonthMinHeight, 128])
    .range(d3.range(yearMonthMinHeight + 1, 125, 8));
const minWidthScale = d3.scaleQuantize().domain([6, 96]).range(d3.range(24, 70, 8));

export function renderHeader(parent: D3_SELECTION, renderInfo: RenderInfo) {
    const headerContainer = parent
        .append("g")
        .attr("id", "Header")
        .attr("class", renderInfo.state.isEditing ? "skip-unmark" : "")
        .style("cursor", renderInfo.state.isEditing ? "pointer" : "default")
        .on("click", (e) => {
            if (config.onScaleClick) {
                config.onScaleClick(e.clientX, e.clientY);
            }
        });

    buildHeader(headerContainer, renderInfo);
}

export function updateHeader(renderInfo: RenderInfo) {
    const headerContainer = d3.select<SVGPathElement, unknown>("#Header");

    const previousHeight = headerContainer.node().getBBox().height;
    headerContainer.selectAll("*").remove();

    buildHeader(headerContainer, renderInfo);
    const currentHeight = headerContainer.node().getBBox().height;
    renderInfo.state.verticalScrollPosition -= previousHeight - currentHeight;
}

export function buildHeader(headerContainer: D3_SELECTION_SVGG, renderInfo: RenderInfo) {
    const labelsWidth = config.labelsWidth;
    let x: number = labelsWidth;
    const dates = getDates(renderInfo.state.startDate, renderInfo.state.endDate);

    const lang = navigator.language;
    moment.locale(lang);

    const yearsOptions: HeaderOptions = {
        format: "yyyy",
        headerContainer: headerContainer,
        heightScale: heightScale,
        minHeight: yearMonthMinHeight + 1,
        state: renderInfo.state,
        styling: renderInfo.styling,
        type: "Years",
        y: config.viewModeSliderHeight + config.zoomSliderHeight
    };
    const years = headerFactory(yearsOptions, renderInfo.tooltip);
    const yearsHeight = years.node().getBBox().height;
    if (renderInfo.state.viewMode === ViewMode.Day || renderInfo.state.viewMode === ViewMode.Month) {
        const monthOptions: HeaderOptions = {
            format: "MMMM",
            headerContainer: headerContainer,
            heightScale: heightScale,
            minHeight: yearMonthMinHeight + 1,
            state: renderInfo.state,
            styling: renderInfo.styling,
            type: "Months",
            y: config.viewModeSliderHeight + config.zoomSliderHeight + yearsHeight
        };
        const months = headerFactory(monthOptions, renderInfo.tooltip);
        const monthsHeight = months.node().getBBox().height;

        if (renderInfo.state.viewMode === ViewMode.Day) {
            const daysHeight = config.viewModeSliderHeight + config.zoomSliderHeight + monthsHeight + yearsHeight;
            const dayHeader = headerContainer.append("g").attr("id", "Days");

            let x1 = labelsWidth;
            let x2 = labelsWidth;

            let textToRender: TextToRender = undefined;

            dates.map((d, i) => {
                const currentDate = moment(new Date(d));
                const dayOfWeek = currentDate.weekday();

                if (i === 0) {
                    textToRender = {
                        text: currentDate.format("D"),
                        x: x + 8,
                        position: "start"
                    };
                } else if (
                    (renderInfo.state.unitWidth < minWidthScale(renderInfo.styling.scales.font.fontSize) &&
                        dayOfWeek === 0) ||
                    renderInfo.state.unitWidth >= minWidthScale(renderInfo.styling.scales.font.fontSize)
                ) {
                    x2 = x;

                    const dayTextPath = dayHeader
                        .append("path")
                        .attr("d", `M${x1} ${daysHeight} H${x2} v${daysMinHeight} H${x1} z`)
                        .style("fill", "transparent")
                        .style("stroke", renderInfo.styling.scales.line.stroke);
                    const dayText = renderText(
                        dayHeader,
                        textToRender.x,
                        daysHeight,
                        textToRender.text,
                        renderInfo.styling,
                        textToRender.position,
                        true
                    );

                    const textHeight = dayText.node().getBBox().height;
                    if (textHeight + 2 > daysMinHeight) {
                        daysMinHeight =
                            Math.ceil((textHeight + config.minPadding) / config.minPadding) * config.minPadding;
                    }
                    dayText.attr("y", daysHeight + daysMinHeight / 2);
                    dayTextPath.attr("d", `M${x1} ${daysHeight} H${x2} v${daysMinHeight} H${x1} z`);
                    x1 = x;

                    textToRender = {
                        text: currentDate.format("D"),
                        x: x + 8,
                        position: "start"
                    };
                }

                if (i === dates.length - 1) {
                    x2 = labelsWidth + config.chartWidth;
                    const dayTextPath = dayHeader
                        .append("path")
                        .attr("d", `M${x1} ${daysHeight} H${x2} v${daysMinHeight} H${x1} z`)
                        .style("fill", "transparent")
                        .style("stroke", renderInfo.styling.scales.line.stroke);
                    const dayText = renderText(
                        dayHeader,
                        textToRender.x,
                        daysHeight,
                        textToRender.text,
                        renderInfo.styling,
                        textToRender.position,
                        true
                    );

                    const textHeight = dayText.node().getBBox().height;
                    if (textHeight + 2 > daysMinHeight) {
                        daysMinHeight =
                            Math.ceil((textHeight + config.minPadding) / config.minPadding) * config.minPadding;
                    }
                    dayText.attr("y", daysHeight + daysMinHeight / 2);
                    dayTextPath.attr("d", `M${x1} ${daysHeight} H${x2} v${daysMinHeight} H${x1} z`);
                }

                x += renderInfo.state.unitWidth;
            });

            const firstUnit = d3.select<SVGPathElement, unknown>("#Days text");
            let textBoundingBox = firstUnit.node().getBBox();
            if (textBoundingBox.x <= labelsWidth + 8) {
                firstUnit.style("text-anchor", "start");
                firstUnit.attr("x", labelsWidth + 8);
            }

            const lastUnit = d3.select<SVGPathElement, unknown>("#Days text:last-of-type");
            textBoundingBox = lastUnit.node().getBBox();
            if (textBoundingBox.x + textBoundingBox.width >= labelsWidth + config.chartWidth - 8) {
                lastUnit.style("text-anchor", "end");
                lastUnit.attr("x", labelsWidth + config.chartWidth - 8);
            }

            adjustText("Days", renderInfo.tooltip);
        }
    }

    config.headerHeight = headerContainer.node().getBBox().height;
    config.chartHeight = config.svgHeight - config.viewModeSliderHeight - config.zoomSliderHeight - config.headerHeight;

    headerContainer
        .append("path")
        .attr(
            "d",
            `M${0} ${config.viewModeSliderHeight + config.zoomSliderHeight + config.headerHeight} H${
                config.svgWidth - config.scrollBarThickness
            }`
        )
        .style("fill", "transparent")
        .style("stroke", renderInfo.styling.scales.line.stroke);
}

function headerFactory(options: HeaderOptions, tooltip: Tooltip) {
    const labelsWidth = config.labelsWidth;
    let x: number = labelsWidth;
    const dates = getDates(options.state.startDate, options.state.endDate);

    const lang = navigator.language;
    moment.locale(lang);

    let x1 = labelsWidth;
    let x2 = labelsWidth;

    const header = options.headerContainer.append("g").attr("id", options.type);
    let textToRender: TextToRender = undefined;

    dates.map((d, i) => {
        const currentDate = moment(new Date(d));
        const typeInfo = getTypeInfo(options.type, currentDate);

        if (typeInfo.dayOfUnit === typeInfo.halfOfUnitDay) {
            textToRender = {
                text: currentDate.format(options.format),
                x: x + options.state.unitWidth / 2,
                position: "middle"
            };
        } else if (i === 0 && typeInfo.dayOfUnit > typeInfo.halfOfUnitDay) {
            textToRender = {
                text: currentDate.format(options.format),
                x: x,
                position: "start"
            };
        }

        if (typeInfo.dayOfUnit === 1) {
            x2 = x;
            renderTextPathPair(header, x1, x2, textToRender, options);
            textToRender = undefined;
            x1 = x;
        }

        if (i === dates.length - 1) {
            x2 = labelsWidth + config.chartWidth;
            if (textToRender === undefined && typeInfo.dayOfUnit < typeInfo.halfOfUnitDay) {
                textToRender = {
                    text: currentDate.format(options.format),
                    x: x2,
                    position: "end"
                };
            }
            renderTextPathPair(header, x1, x2, textToRender, options);
        }

        x += options.state.unitWidth;
    });

    const firstUnit = d3.select<SVGPathElement, unknown>("#" + options.type + " text");
    let textBoundingBox = firstUnit.node().getBBox();
    if (textBoundingBox.x <= labelsWidth + 8) {
        firstUnit.style("text-anchor", "start");
        firstUnit.attr("x", labelsWidth + 8);
    }

    const lastUnit = d3.select<SVGPathElement, unknown>("#" + options.type + " text:last-of-type");
    textBoundingBox = lastUnit.node().getBBox();
    if (textBoundingBox.x + textBoundingBox.width >= labelsWidth + config.chartWidth - 8) {
        lastUnit.style("text-anchor", "end");
        lastUnit.attr("x", labelsWidth + config.chartWidth - 8);
    }

    adjustText(options.type, tooltip);

    return header;
}

function getTypeInfo(type: string, currentDate: Moment): HeaderTypeInfo {
    let dayOfUnit = 0;
    let halfOfUnitDay = 0;

    if (type === "Years") {
        dayOfUnit = currentDate.dayOfYear();
        halfOfUnitDay = 183;
    } else if (type === "Months") {
        dayOfUnit = currentDate.date();
        halfOfUnitDay = Math.floor(currentDate.daysInMonth() / 2);
    }

    return {
        dayOfUnit: dayOfUnit,
        halfOfUnitDay: halfOfUnitDay
    };
}

function renderTextPathPair(
    header: D3_SELECTION_SVGG,
    x1: number,
    x2: number,
    textToRender: TextToRender,
    options: HeaderOptions
) {
    if (textToRender === undefined) {
        return;
    }

    const unitPath = header
        .append("path")
        .attr("d", `M${x1} ${options.y} H${x2} v${options.minHeight} H${x1} z`)
        .style("fill", "transparent")
        .style("stroke", options.styling.scales.line.stroke);

    const unitText = renderText(
        header,
        textToRender.x,
        options.y,
        textToRender.text,
        options.styling,
        textToRender.position,
        true
    );

    const textHeight = unitText.node().getBBox().height;
    if (textHeight + 8 > options.minHeight) {
        options.minHeight = Math.ceil((textHeight + config.minPadding) / config.minPadding) * config.minPadding;
    }
    unitText.attr("y", options.y + options.minHeight / 2);

    let pathD = `M${x1} ${options.y} H${x2} v${options.minHeight} H${x1} z`;

    // Create round borders for year header
    const radius = 8;

    if(options.y === config.viewModeSliderHeight + config.zoomSliderHeight) {

        if (
            x1 === config.labelsWidth &&
            x2 === config.svgWidth - config.scrollBarThickness
        ) {
            pathD = `M${x1 + radius} ${options.y} H${x2 - radius} q${radius + ",0 " + radius + "," + radius} v${
                options.minHeight - radius
            } H${x1} v${radius - options.minHeight} q${"0," + -radius + " " + radius + "," + -radius} z`;
        } else if (x1 === config.labelsWidth) {
            pathD = `M${x1 + radius} ${options.y} H${x2} v${options.minHeight} H${x1} v${radius - options.minHeight} q${
                "0," + -radius + " " + radius + "," + -radius
            } z`;
        } else if (
            x2 === config.svgWidth - config.scrollBarThickness
        ) {
            pathD = `M${x1} ${options.y} H${x2 - radius} q${radius + ",0 " + radius + "," + radius} v${
                options.minHeight - radius
            } H${x1} z`;
        }

    }
    
    unitPath.attr("d", pathD);
}
