/*
 * Copyright © 2023. Cloud Software Group, Inc.
 * This file is subject to the license terms contained
 * in the license file that is distributed with this file.
 */

//@ts-check
import * as d3 from "d3";
import { buildColorSeries, ColorSerie, Point } from "./buildSeries.js";
import { invalidateTooltip } from "./extended-api.js";
import { nodeFormattedPathAsArray } from "./extended-api.js";
import { addHandlersSelection } from "./ui-input.js";

/**
 * @typedef {{
 *          colorIndex: number;
 *          markedColor: string;
 *          unmarkedColor: string;
 *          markedSegments: number[][]
 *          name: string;
 *          points: Point[];
 *          sum: number;
 *          }} RenderGroup;
 */

/**
 * Prepare some dom elements that will persist  throughout mod lifecycle
 */
const modContainer = d3.select("#mod-container");

/**
 * Main svg container
 */
const svg = modContainer.append("svg").attr("xmlns", "http://www.w3.org/2000/svg");

/**
 * A container for X axis labels.
 * Instead of figuring out the layout in special cases when labels don't fit, we delegate
 * this job to the DOM layout engine.
 */
const xLabelsContainer = modContainer.append("div").attr("class", "x-axis-label-container");

/**
 * Renders the chart.
 * @param {Object} state
 * @param {Spotfire.Mod} mod
 * @param {Spotfire.DataView} dataView - dataView
 * @param {Spotfire.Size} windowSize - windowSize
 * @param {Spotfire.ModProperty<string>} chartType - chartType
 * @param {Spotfire.ModProperty<boolean>} roundedCurves - roundedCurves
 * @param {Spotfire.ModProperty<boolean>} gapfill - gapfill
 */
export async function render(state, mod, dataView, windowSize, chartType, roundedCurves, gapfill) {
    if (state.preventRender) {
        // Early return if the state currently disallows rendering.
        return;
    }

    // The margins around the chart canvas.
    const margin = { top: 20, right: 40, bottom: 40, left: 80 };

    // The position and size of the chart canvas.
    const canvas = { 
        top: margin.top,
        left: margin.left,
        width: windowSize.width - (margin.left + margin.right),
        height: windowSize.height - (margin.top + margin.bottom)

    };
    if (canvas.height < 0 || canvas.width < 0) {
        // Abort rendering if the window is not large enough to render anything.
        svg.selectAll("*").remove();
        xLabelsContainer.selectAll("*").remove();
        return;
    }

    const onSelection = ({ dragSelectActive }) => {
        state.preventRender = dragSelectActive;
    };

    const context = mod.getRenderContext();
    const styling = context.styling;
    const { tooltip, popout } = mod.controls;
    const { radioButton, checkbox } = popout.components;
    const { section } = popout;

    invalidateTooltip(tooltip);

    /**
     * The DataView can contain errors which will cause rowCount method to throw.
     */
    let errors = await dataView.getErrors();
    if (errors.length > 0) {
        svg.selectAll("*").remove();
        mod.controls.errorOverlay.show(errors, "dataView");
        return;
    }

    mod.controls.errorOverlay.hide("dataView");

    // Return and wait for next call to render when reading data was aborted.
    // Last rendered data view is still valid from a users perspective since
    // a document modification was made during a progress indication.
    // Hard abort if row count exceeds an arbitrary selected limit
    const xLimit = 10000;
    const colorLimit = 100;
    const colorCount = (await dataView.hierarchy("Color")).leafCount;
    const xCount = (await dataView.hierarchy("X")).leafCount;
    if (colorCount > colorLimit || xCount > xLimit) {
        svg.selectAll("*").remove();

        mod.controls.errorOverlay.show("The resulting data view exceeded the size limit.", "dataViewSize1");
        if (xCount > xLimit) {
            mod.controls.errorOverlay.show(
                `Maximum allowed X axis values is ${xLimit}. Try aggregating the expression further.`,
                "dataViewSize2"
            );
        } else {
            mod.controls.errorOverlay.hide("dataViewSize2");
        }

        if (colorCount > colorLimit) {
            mod.controls.errorOverlay.show(
                `Maximum number of colors is limited to ${colorLimit} for readability reasons.`,
                "dataViewSize3"
            );
        } else {
            mod.controls.errorOverlay.hide("dataViewSize3");
        }

        return;
    } else {
        mod.controls.errorOverlay.hide("dataViewSize1");
        mod.controls.errorOverlay.hide("dataViewSize2");
        mod.controls.errorOverlay.hide("dataViewSize3");
    }

    const colorHierarchy = await dataView.hierarchy("Color");
    const xHierarchy = await dataView.hierarchy("X");

    // By awaiting one hierarchy root, all rows will be fetched.
    const colorRoot = await colorHierarchy.root();
    const xRoot = await xHierarchy.root();
    if (colorRoot == null) {
        // Return and wait for next call to render when reading data was aborted.
        // Last rendered data view is still valid from a users perspective since
        // a document modification was made during a progress indication.
        return;
    }

    const colorLeaves = colorRoot.leaves();
    const xLeaves = xRoot.leaves();

    const colorSeries = buildColorSeries(
        colorLeaves,
        xLeaves,
        !xHierarchy.isEmpty,
        !!(await dataView.continuousAxis("Y")),
        chartType.value(),
        gapfill.value()
    );

    const colorAxisMeta = await mod.visualization.axis("Color");

    const { curveMarked, curveUnmarked } = buildD3CurveFunctions(roundedCurves.value());
    const { xScale, yScale, line, area, fillOpacity, yScaleTickFormat } = buildD3Scales(chartType.value());

    /**
     * Maximum number of Y scale ticks is an approximate number
     * To get the said number we divide total available height by font size with some arbitrary padding
     */
    const yScaleTickNumber = windowSize.height / (styling.scales.font.fontSize * 2 + 6);

    /**
     * Sets the viewBox to match windowSize
     */
    svg.attr("viewBox", [0, 0, windowSize.width, windowSize.height]);
    svg.selectAll("*").remove();

    /**
     * Creates a clipping region that will be used to mask out everything outside of it.
     */
    svg.append("defs")
        .append("clipPath")
        .attr("id", "clipPath")
        .append("rect")
        .attr("x", canvas.left)
        .attr("y", canvas.top)
        .attr("width", canvas.width)
        .attr("height", canvas.height);

    /**
     * Background rectangle - used to catch click events and clear marking.
     */
    svg.append("rect")
        .attr("fill", "#000")
        .attr("fill-opacity", 0)
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", windowSize.width)
        .attr("height", windowSize.height)
        .on("click", () => dataView.clearMarking());

    /**
     * Prepare groups that will hold all elements of an area chart.
     * The groups are drawn in a specific order for the best user experience:
     * - 'unmarked-area', 'unmarked line' - contains all areas and lines drawn with their respective 'unmarked' color
     * - 'marked-area', 'marked-line' - contains areas and lines that we consider 'marked' (consecutive marked points)
     * - 'unmarked-circles' - contains circles that represent unmarked points; only appear in a special case when 'X axis expression' == 'Color axis expression'
     * - 'marked-circles' - contains circles that represent marked points; will show only edge points if the whole group is marked;
     * - 'hover-line' - contains all lines; lines are hidden by default but show up with an outline when hovered
     */
    svg.append("g").attr("class", "unmarked-area").attr("clip-path", "url(#clipPath)");
    svg.append("g").attr("class", "unmarked-line").attr("clip-path", "url(#clipPath)");
    svg.append("g").attr("class", "marked-area").attr("clip-path", "url(#clipPath)");
    svg.append("g").attr("class", "marked-line").attr("clip-path", "url(#clipPath)");

    svg.append("g").attr("class", "hover-line").attr("clip-path", "url(#clipPath)");

    /**
     * Compute the suitable ticks to show
     */
    const scaleWidth = xScale.range()[1] - xScale.range()[0];
    const minLabelWidth = 20;
    const maxCount = scaleWidth / minLabelWidth;
    const drawEvery = Math.ceil(xCount / maxCount);
    const drawXScaleLabel = [0, xCount - 1];
    let drawIndex = drawEvery;
    while (drawIndex < xCount) {
        if (xCount - drawIndex > drawEvery) {
            drawXScaleLabel.push(drawIndex);
        }
        drawIndex += drawEvery;
    }

    drawXScaleLabel.push(xCount - 1);
    var labelWidth = scaleWidth / Math.ceil(xCount / drawEvery) - 4;
    console.log(drawXScaleLabel);
    /**
     * X axis group.
     */
    var xScaleD3 = svg
        .append("g")
        .attr("transform", `translate(0,${windowSize.height - margin.bottom})`)
        .call(
            d3
                .axisBottom(xScale)
                .tickSize(5)
                .tickPadding(styling.scales.tick.stroke != "none" ? 3 : 9)
        );
    xScaleD3.selectAll("text").remove();

    xScaleD3
        .selectAll("g.tick line")
        .attr("y2", (_, i) => (styling.scales.tick.stroke != "none" && drawXScaleLabel.includes(i) ? 5 : 0));
    /**
     * Y Axis group.
     */
    svg.append("g")
        .attr("transform", `translate(${margin.left},0)`)
        .call(
            d3
                .axisLeft(yScale)
                .tickFormat(yScaleTickFormat)
                .ticks(yScaleTickNumber)
                .tickSize(styling.scales.tick.stroke != "none" ? 5 : 0)
                .tickPadding(styling.scales.tick.stroke != "none" ? 3 : 9)
        )
        .selectAll("text")
        .attr("tooltip", (d) => d)
        .on("mouseover", function (d) {
            if (isNaN(d)) return;
            tooltip.show(d);
        })
        .on("mouseout", function () {
            tooltip.hide();
        });

    svg.append("g").attr("class", "unmarked-circles");
    svg.append("g").attr("class", "marked-circles");

    /**
     * Style all strokes and text using current theme.
     */
    svg.selectAll("path").attr("stroke", styling.scales.line.stroke);
    svg.selectAll("line").attr("stroke", styling.scales.tick.stroke);
    svg.selectAll("text")
        .attr("fill", styling.scales.font.color)
        .attr("font-family", styling.scales.font.fontFamily)
        .attr("font-size", styling.scales.font.fontSize);

    /**
     * Draws X labels as divs (not SVG)
     */
    xLabelsContainer.selectAll("*").remove();
    xLabelsContainer
        .style("bottom", `${margin.bottom - 35}px`)
        .style("width", "100px")
        .style("height", "30px");
    xLabelsContainer
        .append("div")
        .attr("class", "x-axis-label-background")
        .style("width", windowSize.width + "px")
        .style("height", styling.scales.font.fontSize * 2 + "px")
        .style("background-color", styling.general.font.color);
    xLabelsContainer
        .selectAll(".x-axis-label")
        .data(xScale.domain())
        .enter()
        .append("div")
        .attr("class", "x-axis-label-parent")
        .style("left", (d) => xScale(d) + "px")
        .append("div")
        .attr("class", "x-axis-label")
        .style("max-width", (_, i) => `${drawXScaleLabel.includes(i) ? labelWidth : 0}px`)
        .style("color", styling.scales.font.color)
        .style("font-family", styling.scales.font.fontFamily)
        .style("font-size", styling.scales.font.fontSize + "px")
        .attr("tooltip", (xIndex) => xLeaves[xIndex].formattedPath())
        .html((xIndex) => xLeaves[xIndex].formattedPath())
        .on("mouseover", (xIndex) => tooltip.show(xLeaves[xIndex].formattedPath()))
        .on("mouseout", () => tooltip.hide());

    /**
     * Create aggregated groups, sort by sum and draw each one of them.
     */
    colorSeries.sort((a, b) => b.sum - a.sum).forEach(splitAndDraw);

    /**
     * Select all area svg elements by class name and add click and hover events for marking and show/hide tooltip.
     */
    d3.selectAll(".interactive-area")
        .on("mouseover", function (colorIndex) {
            tooltip.show(createColorSerieTooltip(colorIndex));
        })
        .on("mouseout", function () {
            tooltip.hide();
        });

    /**
     * This will add rectangle selection elements to DOM.
     * The callback will check the selection bounding box against each point and mark those that intersect the box.
     */
    addHandlersSelection((result) => {
        onSelection(result);

        const { x, y, width, height, ctrlKey } = result;

        colorSeries.forEach((serie) => {
            serie.points
                .filter((p) => !p.gapFilled)
                .forEach((p) => {
                    const xPos = xScale(p.xIndex);
                    const yPos = chartType.value() == "overlapping" ? yScale(p.Y) : yScale(p.y1);
                    if (xPos >= x && xPos <= x + width && yPos >= y && yPos <= y + height) {
                        ctrlKey ? p.mark("ToggleOrAdd") : p.mark();
                    }
                });
        });
    });

    /**
     * Draws a group.
     * @param {ColorSerie} serie
     */
    function draw(serie) {
        // Use fact that a serie will have color depending on marking only.
        const markedPoint = serie.points.find((p) => p.marked && !p.gapFilled);
        const unmarkedPoint = serie.points.find((p) => !p.marked && !p.gapFilled);

        const group = {
            sum: serie.sum,
            colorIndex: serie.colorIndex,
            markedColor: markedPoint ? markedPoint.color : "none",
            unmarkedColor: unmarkedPoint ? unmarkedPoint.color : "black",
            markedSegments: createMarkedSegments(serie.points),
            name: colorLeaves[serie.colorIndex].formattedValue(),
            points: serie.points
        };

        drawUnmarkedArea(svg.select(".unmarked-area"), group);
        drawUnmarkedLine(svg.select(".unmarked-line"), group);
        drawMarkedArea(svg.select(".marked-area"), group);
        drawMarkedLine(svg.select(".marked-line"), group);
        drawMarkedCircles(svg.select(".marked-circles"), group);
        drawHoverLine(svg.select(".hover-line"), group);
        if (serie.points.length == 1) {
            drawUnmarkedCircles(svg.select(".unmarked-circles"), group);
        }
    }

    /**
     * Draws a group.
     * @param {ColorSerie} serie
     */
    function splitAndDraw(serie) {
        let holes = [];
        let points = serie.points;
        for (var i = 0; i < points.length - 1; i++) {
            if (points[i + 1].xIndex - points[i].xIndex > 1) {
                holes.push(i + 1);
            }
        }

        holes.push(points.length);
        let start = 0;
        let series = holes.map((end) => {
            let points = serie.points.slice(start, end);
            start = end;
            return {
                ...serie,
                points
            };
        });

        series.forEach(draw);
    }

    /**
     * Draws unmarked area.
     * @param {RenderGroup} group
     */
    function drawUnmarkedArea(parent, group) {
        const { points, unmarkedColor } = group;
        const opacity = unmarkedColor === "black" ? 0 : fillOpacity;

        let interactiveArea = parent
            .append("path")
            .attr("class", "interactive-area")
            .attr("fill", unmarkedColor)
            .attr("fill-opacity", opacity)
            .attr("d", area.curve(curveUnmarked)(points));
        interactiveArea.on("click", function () {
            group.points.forEach((p) => (d3.event.ctrlKey ? p.mark("ToggleOrAdd") : p.mark()));
        });
    }

    /**
     * Draws marked line.
     */
    function drawUnmarkedLine(parent, { points, unmarkedColor }) {
        if (unmarkedColor === "black") return;

        parent
            .append("path")
            .style("pointer-events", "none")
            .attr("fill", "none")
            .attr("stroke", unmarkedColor)
            .attr("stroke-width", 1.5)
            .attr("d", line.curve(curveUnmarked)(points));
    }

    /**
     * Draws marked area. Uses a precalculated markedSegments variable and draws only those that are longer
     * than 1 element (can't draw a segment if it's a point).
     */
    function drawMarkedArea(parent, { points, markedSegments, markedColor }) {
        const maxIndex = points.length - 1;
        const selectRow = (index) => points[index];
        markedSegments.forEach((segment) => {
            if (segment.length <= 1) return;

            parent
                .append("path")
                .style("pointer-events", "none")
                .attr("fill", markedColor)
                .attr("fill-opacity", fillOpacity)
                .attr("stroke", "none")
                .attr("d", createPathStringFromSegment(segment));
        });

        /**
         * Creates a path string from a segment.
         * In the special case of 'rounded' curve type we need to extend the segment left and right by 1
         * to create the correct curve function.
         */
        function createPathStringFromSegment(segment) {
            if (roundedCurves.value()) {
                const extendedSegment = extendSegment(segment, 0, maxIndex);
                return area.curve(curveMarked)(extendedSegment.map(selectRow));
            }

            return area.curve(curveMarked)(segment.map(selectRow));
        }
    }

    /**
     * Draws marked line. Same principles as with marked areas apply here.
     * @param {RenderGroup} group
     */
    function drawMarkedLine(parent, group) {
        const { points, markedSegments, markedColor } = group;
        const maxIndex = points.length - 1;
        const selectRow = (index) => points[index];
        markedSegments.forEach((segment) => {
            if (segment.length <= 1) return;

            parent
                .append("path")
                .style("pointer-events", "none")
                .attr("fill", "none")
                .attr("stroke", markedColor)
                .attr("stroke-width", 1.5)
                .attr("stroke-linejoin", "round")
                .attr("stroke-linecap", "round")
                .attr("d", createPathStringFromSegment(segment));
        });
        function createPathStringFromSegment(segment) {
            if (roundedCurves.value()) {
                const extendedSegment = extendSegment(segment, 0, maxIndex);
                return line.curve(curveMarked)(extendedSegment.map(selectRow));
            }

            return line.curve(curveMarked)(segment.map(selectRow));
        }
    }

    /**
     * Draws hover line.
     * @param {RenderGroup} group
     */
    function drawHoverLine(parent, group) {
        const d = line.curve(curveUnmarked)(group.points);
        const hoverGroup = parent.append("g");

        hoverGroup
            .append("path")
            .attr("class", "line-hover line-hover-bg")
            .attr("d", d)
            .data([group.colorIndex])
            .on("mouseover", handleMouseOver)
            .on("mouseout", handleMouseOut)
            .on("click", handleClick);

        drawHoverCircles(hoverGroup, group);

        hoverGroup
            .selectAll("circle")
            .on("mouseover", handleMouseOverPoint)
            .on("mouseout", handleMouseOut)
            .on("click", handleClick);

        const g = parent.append("g").attr("visibility", "hidden");
        g.append("path").attr("class", "line-hover line-hover-casing").attr("d", d);
        g.append("path").attr("class", "line-hover line-hover-fill").attr("d", d);

        drawUnmarkedLine(g, group);
        drawMarkedLine(g, group);
        drawMarkedCircles(g, group);

        function handleMouseOver(colorIndex) {
            g.attr("visibility", "visible");
            tooltip.show(createColorSerieTooltip(colorIndex));
        }

        function handleMouseOverPoint(data) {
            g.attr("visibility", "visible");
            tooltip.show(data.tooltip);
        }

        function handleMouseOut() {
            g.attr("visibility", "hidden");
            tooltip.hide();
        }

        function handleClick() {
            group.points.forEach((p) => (d3.event.ctrlKey ? p.mark("ToggleOrAdd") : p.mark()));
        }
    }

    /**
     * Draws unmarked circles.
     * @param {RenderGroup} group
     */
    function drawUnmarkedCircles(parent, group) {
        parent
            .append("g")
            .selectAll("circle")
            .data(group.points)
            .enter()
            .append("circle")
            .style("pointer-events", "none")
            .attr("cx", (p) => xScale(p.xIndex))
            .attr("cy", (p) => yScale(p.y1))
            .attr("fill", (p) => p.color)
            .attr("stroke", "#333")
            .attr("stroke-width", "0.5")
            .attr("r", 3);
    }

    /**
     * Draws marked circles. Uses only the end points of a marked segment.
     * @param {RenderGroup} group
     */
    function drawMarkedCircles(parent, group) {
        const { points, markedSegments } = group;
        markedSegments.forEach((segment) => {
            const segmentLength = segment.length;
            const endPoints = segment
                .filter((_, index) => index == 0 || index == segmentLength - 1)
                .map((i) => points[i]);
            parent
                .append("g")
                .selectAll("circle")
                .data(endPoints)
                .enter()
                .append("circle")
                .style("pointer-events", "none")
                .attr("cx", (p) => xScale(p.xIndex))
                .attr("cy", (p) => yScale(p.y1))
                .attr("fill", (p) => p.color)
                .attr("stroke", "#333")
                .attr("stroke-width", "0.5")
                .attr("r", 3);
        });
    }

    /**
     * Draws hover circles.
     * @param {RenderGroup} group
     */
    function drawHoverCircles(parent, group) {
        parent
            .append("g")
            .selectAll("circle")
            .data(group.points)
            .enter()
            .append("circle")
            .style("pointer-events", "all")
            .attr("cx", (p) => xScale(p.xIndex))
            .attr("cy", (d) => yScale(d.y1))
            .attr("fill-opacity", 0)
            .attr("r", 4);
    }

    /**
     * Creates an array of marked segments from a group of points
     * A segment (array) will be represented by indices of consecutive marked points in a group.
     * @param {Point[]} points
     */
    function createMarkedSegments(points) {
        let lastMarkedIndex = null;
        let lastMarkedLine = [];
        const markedSegments = [];
        for (let i = 0; i < points.length; i++) {
            let r = points[i];
            if (r.marked) {
                if (lastMarkedIndex == i - 1) {
                    lastMarkedLine.push(i);
                } else {
                    lastMarkedLine = [];
                    lastMarkedLine.push(i);
                    markedSegments.push(lastMarkedLine);
                }
                lastMarkedIndex = i;
            }
        }
        return markedSegments;
    }

    /**
     * Extends a segment left and right by adding new elements. Clamps to [min, max].
     * @param {number[]} segment
     * @param {number} min
     * @param {number} max
     */
    function extendSegment(segment, min, max) {
        const first = segment[0];
        const last = segment[segment.length - 1];
        const pre = Math.max(first - 1, min);
        const post = Math.min(last + 1, max);

        return [pre, ...segment, post];
    }


    /**
     * @param {number} colorIndex
     * @returns {string}
     */
    function createColorSerieTooltip(colorIndex) {
        return nodeFormattedPathAsArray(colorLeaves[colorIndex])
            .map((val, i) => colorAxisMeta.parts[i].displayName + ": " + val)
            .join("\n");
    }

    /**
     * Popout content
     */
    const popoutContent = () => [
        section({
            heading: "Chart Type",
            children: [
                radioButton({
                    name: chartType.name,
                    text: "Overlapping",
                    value: "overlapping",
                    checked: chartType.value() == "overlapping"
                }),
                radioButton({
                    name: chartType.name,
                    text: "Stacked",
                    value: "stacked",
                    checked: chartType.value() == "stacked"
                }),
                radioButton({
                    name: chartType.name,
                    text: "100% Stacked",
                    value: "percentStacked",
                    checked: chartType.value() == "percentStacked"
                })
            ]
        }),
        section({
            heading: "Appearance",
            children: [
                checkbox({
                    name: roundedCurves.name,
                    text: "Rounded curves",
                    checked: roundedCurves.value(),
                    enabled: true,
                    tooltip: "Create rounded curves (cubic splines) when creating the areas."
                }),
                checkbox({
                    name: gapfill.name,
                    text: "Fill gap on empty or missing value",
                    checked: gapfill.value(),
                    enabled: true,
                    tooltip:
                        "Fill gaps in the X axis when the data contains empty (null) values or when there is no data point."
                })
            ]
        })
    ];

    /**
     * Creates a curve function based on curve type.
     */
    function buildD3CurveFunctions(roundedCurves) {
        let curveMarked, curveUnmarked;
        if (roundedCurves) {
            curveMarked = d3.curveCatmullRomOpen.alpha(0.2);
            curveUnmarked = d3.curveCatmullRom.alpha(0.2);
        } else {
            curveMarked = d3.curveLinear;
            curveUnmarked = d3.curveLinear;
        }

        return { curveMarked, curveUnmarked };
    }

    /**
     * Creates other d3 functions and values based on chart type (xScale, yScale, line, area, fillOpacity, yScaleTickFormat)
     * Chart type will change the domain on yScale, and it will also affect fillOpacity (transparent for 'overlapping') and
     * yScaleTickFormat (show percentage for '100% stacked')
     */
    function buildD3Scales(chartTypeValue) {
        const domain = xLeaves.map((n) => n.leafIndex);
        const max = Math.max(...colorSeries.map((serie) => Math.max(...serie.points.map((p) => p.y1))));
        const min = Math.min(...colorSeries.map((serie) => Math.min(...serie.points.map((p) => p.y1))), 0);
        let xScale,
            yScale,
            line,
            area,
            fillOpacity = 1,
            yScaleTickFormat = null;

        xScale = d3
            .scalePoint()
            .domain(domain)
            .range([margin.left, windowSize.width - margin.right]);

        yScale = d3.scaleLinear().range([windowSize.height - margin.bottom, margin.top]);
        line = d3
            .line()
            .x((d) => xScale(d.xIndex))
            .y((d) => yScale(d.y1));
        area = d3
            .area()
            .x((d) => xScale(d.xIndex))
            .y0((d) => yScale(d.y0))
            .y1((d) => yScale(d.y1));

        switch (chartTypeValue) {
            case "overlapping":
                fillOpacity = 0.5;
                yScale.domain([min, max]).nice();
                break;
            case "stacked":
                yScale.domain([min, max]).nice();
                break;
            case "percentStacked":
                let localMin = min < 0 ? -1 : 0;
                let localMax = max > 0 ? 1 : 0;
                yScale.domain([localMin, localMax]);
                yScaleTickFormat = d3.format(".0%");
                break;
            default:
                console.error(`Unknown chart type '${chartTypeValue}'`);
                break;
        }
        return { xScale, yScale, line, area, fillOpacity, yScaleTickFormat };
    }

    /**
     * Show popup on X axis click
     * @type {HTMLElement}
     */
    const labelContainer = document.querySelector(".x-axis-label-container");
    labelContainer.classList.toggle("editable", context.isEditing);
    labelContainer.onclick = (e) => {
        if (!context.isEditing) {
            return;
        }

        tooltip.hide();
        popout.show(
            {
                x: e.x,
                y: windowSize.height - margin.bottom,
                autoClose: true,
                alignment: "Bottom",
                onChange: (event) => {
                    const { name, value } = event;
                    name == roundedCurves.name && roundedCurves.set(value);
                    name == chartType.name && chartType.set(value);
                    name == gapfill.name && gapfill.set(value);
                }
            },
            popoutContent
        );
    };
}
