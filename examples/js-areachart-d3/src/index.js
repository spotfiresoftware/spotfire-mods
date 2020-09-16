/*
 * Copyright © 2020. TIBCO Software Inc.
 * This file is subject to the license terms contained
 * in the license file that is distributed with this file.
 */

//@ts-check

// Manually import the array polyfills because the API is using functions not supported in IE11.
import "core-js/es/array";

//@ts-ignore
import * as d3 from "d3";

import { addHandlersSelection } from "./ui-input.js";

import {
    createTable,
    createRowId,
    createPoint,
    createHierarchyId,
    createGroup,
    axisDisplayName,
    is,
    stack,
    markGroup,
    createTextLine,
    invalidateTooltip
} from "./extended-api.js";

const Spotfire = window.Spotfire;

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
 * @type {Spotfire.OnLoadCallback}
 */
const init = async (mod) => {
    /**
     * Read metadata and write mod version to DOM
     */
    const modMetaData = mod.metadata;
    console.log("Mod version:", modMetaData.version ? "v" + modMetaData.version : "unknown version");

    /**
     * Initialize render context - should show 'busy' cursor.
     * A necessary step for printing (another step is calling render complete)
     */
    const context = mod.getRenderContext();

    const styling = context.styling;
    const { tooltip, popout } = mod.controls;
    const { radioButton } = popout.components;
    const { section } = popout;

    let state = { render: true };
    const setState = ({ dragSelectActive }) => {
        state = { ...state, render: dragSelectActive != true };
    };

    /**
     * Create reader function which is actually a one time listener for the provided values.
     * @type {Spotfire.Reader}
     */
    const reader = mod.createReader(
        mod.visualization.data(),
        mod.windowSize(),
        mod.property("chartType"),
        mod.property("curveType")
    );

    /**
     * Creates a function that is part of the main read-render loop.
     * It checks for valid data and will print errors in case of bad data or bad renders.
     * It calls the listener (reader) created earlier and adds itself as a callback to complete the loop.
     * @param {Spotfire.DataView} dataView
     * @param {Spotfire.Size} windowSize
     * @param {Spotfire.AnalysisProperty<string>} chartType
     * @param {Spotfire.AnalysisProperty<string>} curveType
     */
    const onChange = async (dataView, windowSize, chartType, curveType) => {
        try {
            invalidateTooltip(tooltip);

            await render({
                dataView,
                windowSize,
                chartType,
                curveType
            });
            context.signalRenderComplete();

            // Everything went well this time. Clear any error.
            mod.controls.errorOverlay.hide("catch");
        } catch (e) {
            mod.controls.errorOverlay.show(
                e.message || e || "☹️ Something went wrong, check developer console",
                "catch"
            );
        }
    };

    /**
     * Initiates the read-render loop
     */
    reader.subscribe(onChange);

    /**
     * Renders the chart.
     * @param {RenderOptions} options - Render Options
     * @typedef {Object} RenderOptions
     * @property {Spotfire.DataView} dataView - dataView
     * @property {Spotfire.Size} windowSize - windowSize
     * @property {Spotfire.ModProperty<string>} chartType - chartType
     * @property {Spotfire.ModProperty<string>} curveType - curveType
     */
    async function render({ dataView, windowSize, chartType, curveType }) {
        /**
         * The DataView can contain errors which will cause rowCount method to throw.
         */
        let errors = await dataView.getErrors();
        if (errors.length > 0) {
            // Data view contains errors. Display these and clear the chart to avoid
            // getting a flickering effect with an old chart configuration later (TODO).
            mod.controls.errorOverlay.show(errors, "dataView");
            return;
        }

        mod.controls.errorOverlay.hide("dataView");

        /**
            // Return and wait for next call to render when reading data was aborted.
            // Last rendered data view is still valid from a users perspective since
            // a document modification was made during an progress indication.
         * Hard abort if row count exceeds an arbitrary selected limit
         */
        const rowCount = await dataView.rowCount();
        const limit = 1250;
        if (rowCount > limit) {
            mod.controls.errorOverlay.show(
                `☹️ Cannot render - too many rows (rowCount: ${rowCount}, limit: ${limit}) `,
                "rowCount"
            );
            return;
        } else {
            mod.controls.errorOverlay.hide("rowCount");
        }

        if (state.render === false) {
            return;
        }

        const allRows = await dataView.allRows();
        if (allRows == null) {
            // Return and wait for next call to render when reading data was aborted.
            // Last rendered data view is still valid from a users perspective since
            // a document modification was made during an progress indication.
            return;
        }
        const colorHierarchy = await dataView.hierarchy("Color");
        const xHierarchy = await dataView.hierarchy("X");
        const pointsTable = createTable(createRowId, createPoint)(allRows);
        const xGroup = (await xHierarchy.root()).leaves();
        const xTable = createTable(createHierarchyId, createGroup)(xGroup);
        const colorGroup = (await colorHierarchy.root()).leaves();
        const colorTable = createTable(createHierarchyId, createGroup)(colorGroup);

        const normalize = is(chartType)("percentStacked");
        const stacked = normalize || is(chartType)("stacked");

        stacked && stack(pointsTable)(xTable)(normalize);

        const xAxisMeta = await mod.visualization.axis("X");
        const yAxisMeta = await mod.visualization.axis("Y");
        const colorAxisMeta = await mod.visualization.axis("Color");
        const xAxisDisplayNames = axisDisplayName(xAxisMeta);
        const yAxisDisplayNames = axisDisplayName(yAxisMeta);
        const colorAxisDisplayNames = axisDisplayName(colorAxisMeta);

        // console.log("xGroup", xGroup);
        // console.log("xTable", xTable);
        // console.log("colorHierarchy", colorHierarchy);
        // console.log("colorGroup", colorGroup);
        // console.log("colorTable", colorTable);
        // console.log("pointsTable", pointsTable);
        // console.log("xAxisDisplayNames", xAxisDisplayNames);

        const margin = { top: 20, right: 40, bottom: 40, left: 80 };

        const { curveMarked, curveUnmarked } = createCurveFunction_placeholder(curveType.value());
        const { xScale, yScale, line, area, fillOpacity, yScaleTickFormat } = createOtherFunctions_placeholder(
            chartType.value()
        );

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
            .attr("x", margin.left)
            .attr("y", margin.top)
            .attr("width", windowSize.width - margin.left)
            .attr("height", windowSize.height - (margin.bottom + margin.top));

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
        // svg.append("g").attr("class", "hover-circles");

        /**
         * X axis group.
         */
        svg.append("g")
            .attr("transform", `translate(0,${windowSize.height - margin.bottom})`)
            .call(
                d3
                    .axisBottom(xScale)
                    .tickSize(styling.scales.tick.stroke != "none" ? 5 : 0)
                    .tickPadding(styling.scales.tick.stroke != "none" ? 3 : 9)
            )
            .selectAll("text")
            .remove();

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
        const step = xScale.step() - 4;
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
            .style("max-width", step + "px")
            .style("color", styling.scales.font.color)
            .style("font-family", styling.scales.font.fontFamily)
            .style("font-size", styling.scales.font.fontSize + "px")
            .attr("tooltip", (d) => xTable.select(d).name)
            .html((d) => {
                return xTable.select(d).name;
            })
            .on("mouseover", (d) => tooltip.show(xTable.select(d).name))
            .on("mouseout", (d) => tooltip.hide());

        /**
         * Create aggregated groups, sort by sum and draw each one of them.
         */
        const groups = colorTable.values.map(createTempGroup_placeholder);
        groups.sort((a, b) => b.sum - a.sum).forEach(draw);

        /**
         * Select all area svg elements by class name and add click and hover events for marking and show/hide tooltip.
         */
        d3.selectAll(".interactive-area")
            .on("click", function (d, i, e) {
                console.log(d, i, e, this);
                markGroup(colorTable)(d3.select(this).attr("mod-Color"))(d3.event);
            })
            .on("mouseover", function () {
                tooltip.show(createLineHoverString({ Color: d3.select(this).attr("mod-Color") }));
            })
            .on("mouseout", function () {
                tooltip.hide();
            });

        /**
         * This will add rectangle selection elements to DOM.
         * The callback will check the selection bounding box against each point and mark those that intersect the box.
         */
        addHandlersSelection((result) => {
            setState(result);

            const { x, y, width, height, ctrlKey, altKey } = result;

            pointsTable.values.forEach((row) => {
                const xPos = xScale(row.X_ID);
                const yPos = is(chartType)("overlapping") ? yScale(row.Y) : yScale(row.y1);
                if (xPos >= x && xPos <= x + width && yPos >= y && yPos <= y + height) {
                    ctrlKey ? row.__row.mark("ToggleOrAdd") : row.__row.mark();
                }
            });
        });

        /**
         * Draws a group.
         */
        function draw(group) {
            drawUnmarkedArea(svg.select(".unmarked-area"), group);
            drawUnmarkedLine(svg.select(".unmarked-line"), group);

            drawMarkedArea(svg.select(".marked-area"), group);
            drawMarkedLine(svg.select(".marked-line"), group);
            drawMarkedCircles(svg.select(".marked-circles"), group);

            drawHoverLine(svg.select(".hover-line"), group);

            group.dangerousFlag && drawUnmarkedCircles(svg.select(".unmarked-circles"), group);
        }

        /**
         * Draws unmarked area.
         */
        function drawUnmarkedArea(parent, { name, rows, unmarkedColor }) {
            const opacity = unmarkedColor === "black" ? 0 : fillOpacity;

            parent
                .append("path")
                .attr("class", "interactive-area")
                .attr("fill", unmarkedColor)
                .attr("fill-opacity", opacity)
                .attr("d", area.curve(curveUnmarked)(rows))
                .attr("mod-Color", name)
                .attr("tooltip", createLineHoverString({ Color: name }));
        }

        /**
         * Draws marked line.
         */
        function drawUnmarkedLine(parent, { rows, unmarkedColor }) {
            if (unmarkedColor === "black") return;

            parent
                .append("path")
                .style("pointer-events", "none")
                .attr("fill", "none")
                .attr("stroke", unmarkedColor)
                .attr("stroke-width", 1.5)
                .attr("d", line.curve(curveUnmarked)(rows));
        }

        /**
         * Draws marked area. Uses a precalculated markedSegments variable and draws only those that are longer
         * than 1 element (can't draw a segment if it's a point).
         */
        function drawMarkedArea(parent, { rows, markedSegments, markedColor }) {
            const maxIndex = rows.length - 1;
            const selectRow = (index) => rows[index];
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
                if (curveType.value() == "rounded") {
                    const extendedSegment = extendSegment(segment, 0, maxIndex);
                    return area.curve(curveMarked)(extendedSegment.map(selectRow));
                }

                return area.curve(curveMarked)(segment.map(selectRow));
            }
        }

        /**
         * Draws marked line. Same principles as with marked areas apply here.
         */
        function drawMarkedLine(parent, { rows, markedSegments, markedColor }) {
            const maxIndex = rows.length - 1;
            const selectRow = (index) => rows[index];
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
                if (curveType.value() == "rounded") {
                    const extendedSegment = extendSegment(segment, 0, maxIndex);
                    return line.curve(curveMarked)(extendedSegment.map(selectRow));
                }

                return line.curve(curveMarked)(segment.map(selectRow));
            }
        }

        /**
         * Draws hover line.
         */
        function drawHoverLine(parent, group) {
            const { rows, name } = group;

            const d = line.curve(curveUnmarked)(rows);
            const hoverGroup = parent.append("g");

            hoverGroup
                .append("path")
                .attr("class", "line-hover line-hover-bg")
                .attr("d", d)
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

            function handleMouseOver() {
                g.attr("visibility", "visible");
                tooltip.show(createLineHoverString({ Color: name }));
            }

            function handleMouseOverPoint(d) {
                g.attr("visibility", "visible");
                tooltip.show(createPointHoverString(d));
            }

            function handleMouseOut() {
                g.attr("visibility", "hidden");
                tooltip.hide();
            }
            function handleClick() {
                d3.event.ctrlKey
                    ? rows.forEach((row) => row.__row.mark("ToggleOrAdd"))
                    : rows.forEach((row) => row.__row.mark());
            }
        }

        /**
         * Draws unmarked circles.
         */
        function drawUnmarkedCircles(parent, { rows }) {
            parent
                .append("g")
                .selectAll("circle")
                .data(rows)
                .enter()
                .append("circle")
                .style("pointer-events", "none")
                .attr("cx", (d) => xScale(d.X_ID))
                .attr("cy", (d) => yScale(d.y1))
                .attr("fill", (d) => d.hexCode)
                .attr("stroke", "#333")
                .attr("stroke-width", "0.5")
                .attr("r", 3);
        }

        /**
         * Draws marked circles. Uses only the end points of a marked segment.
         */
        function drawMarkedCircles(parent, { rows, markedSegments }) {
            markedSegments.forEach((segment) => {
                const segmentLength = segment.length;
                const endPoints = segment
                    .filter((_, index) => index == 0 || index == segmentLength - 1)
                    .map((i) => rows[i]);
                parent
                    .append("g")
                    .selectAll("circle")
                    .data(endPoints)
                    .enter()
                    .append("circle")
                    .style("pointer-events", "none")
                    .attr("cx", (d) => xScale(d.X_ID))
                    .attr("cy", (d) => yScale(d.y1))
                    .attr("fill", (d) => d.hexCode)
                    .attr("stroke", "#333")
                    .attr("stroke-width", "0.5")
                    .attr("r", 3);
            });
        }

        /**
         * Draws hover circles.
         */
        function drawHoverCircles(parent, group) {
            const { rows } = group;
            const g = parent
                .append("g")
                .selectAll("circle")
                .data(rows)
                .enter()
                .append("circle")
                .style("pointer-events", "all")
                .attr("cx", (d) => xScale(d.X_ID))
                .attr("cy", (d) => yScale(d.y1))
                .attr("fill-opacity", 0)
                .attr("r", 4);
        }

        /**
         * Creates an array of marked segments from a group of points
         * A segment (array) will be represented by indices of consecutive marked points in a group.
         */
        function createMarkedSegments(rows) {
            let lastMarkedIndex = null;
            let lastMarkedLine = [];
            const markedSegments = [];
            for (let i = 0; i < rows.length; i++) {
                let r = rows[i];
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
         */
        function extendSegment(segment, min, max) {
            const first = segment[0];
            const last = segment[segment.length - 1];
            const pre = Math.max(first - 1, min);
            const post = Math.min(last + 1, max);

            return [pre, ...segment, post];
        }

        /**
         * Creates a group that holds an array of points that belong to that group, marked and unmarked colors,
         * as well as marked segments
         *
         * TODO: find proper function name.
         */
        function createTempGroup_placeholder({ points, name = "", sum = 0 }) {
            const rows = points.map(pointsTable.select);
            const rowsMarked = rows.filter((row) => row.marked);
            const rowsUnmarked = rows.filter((row) => !row.marked);
            const markedColor = (rowsMarked.length && rowsMarked[0]).hexCode || "none";
            const unmarkedColor = (rowsUnmarked.length && rowsUnmarked[0]).hexCode || "black";
            const markedSegments = createMarkedSegments(rows);

            /**
             * TODO: find proper condition; rename flag;
             */
            const dangerousFlag = rows.length == 1;

            return { name, rows, markedColor, unmarkedColor, dangerousFlag, markedSegments, sum };
        }

        function createLineHoverString({ Color }) {
            const separator = "\n";
            const c = Color.split(":");
            return createTextLine(colorAxisDisplayNames)(c).join(separator);
        }

        function createPointHoverString({ X, Y_FORMATTED, Color }) {
            const separator = "\n";
            const x = X.split(" >> ");
            const c = Color.split(" >> ");
            return [
                createTextLine(xAxisDisplayNames)(x).join(separator),
                createTextLine(yAxisDisplayNames)([Y_FORMATTED]),
                createTextLine(colorAxisDisplayNames)(c).join(separator)
            ].join(separator);
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
                        checked: is(chartType)("overlapping")
                    }),
                    radioButton({
                        name: chartType.name,
                        text: "Stacked",
                        value: "stacked",
                        checked: is(chartType)("stacked")
                    }),
                    radioButton({
                        name: chartType.name,
                        text: "100% Stacked",
                        value: "percentStacked",
                        checked: is(chartType)("percentStacked")
                    })
                ]
            }),
            section({
                heading: "Curve Type",
                children: [
                    radioButton({
                        name: curveType.name,
                        text: "Linear",
                        value: "linear",
                        checked: is(curveType)("linear")
                    }),
                    radioButton({
                        name: curveType.name,
                        text: "Rounded",
                        value: "rounded",
                        checked: is(curveType)("rounded")
                    })
                ]
            })
        ];

        /**
         * Creates a curve function based on curve type.
         */
        function createCurveFunction_placeholder(curveTypeValue) {
            let curveMarked, curveUnmarked;
            switch (curveTypeValue) {
                case "linear":
                    curveMarked = d3.curveLinear;
                    curveUnmarked = d3.curveLinear;
                    break;
                case "rounded":
                    curveMarked = d3.curveCatmullRomOpen;
                    curveUnmarked = d3.curveCatmullRom;
                    break;
                default:
                    console.warn("shouldn't be here");
            }

            return { curveMarked, curveUnmarked };
        }

        /**
         * Creates other d3 functions and values based on chart type (xScale, yScale, line, area, fillOpacity, yScaleTickFormat)
         * Chart type will change the domain on yScale, and it will also affect fillOpacity (transparent for 'overlapping') and
         * yScaleTickFormat (show percentage for '100% stacked')
         *
         * TODO: find proper function name.
         */
        function createOtherFunctions_placeholder(chartTypeValue) {
            const domain = xTable.keys;
            const rowX = pointsTable.values.map((row) => row.X);
            const rowY = pointsTable.values.map((row) => row.Y);
            const min = Math.min(d3.min(rowY), 0);
            const max = d3.max(rowY);
            let xScale, yScale, line, area, fillOpacity, yScaleTickFormat;

            fillOpacity = 1;
            yScaleTickFormat = null;
            xScale = d3
                .scalePoint()
                .domain(domain)
                .range([margin.left, windowSize.width - margin.right]);

            yScale = d3.scaleLinear().range([windowSize.height - margin.bottom, margin.top]);
            line = d3
                .line()
                .x((d) => xScale(d.X_ID))
                .y((d) => yScale(d.y1));
            area = d3
                .area()
                .x((d) => xScale(d.X_ID))
                .y0((d) => yScale(d.y0))
                .y1((d) => yScale(d.y1));

            switch (chartTypeValue) {
                case "overlapping":
                    fillOpacity = 0.5;
                    yScale.domain([min, max]).nice();
                    break;
                case "stacked":
                    let maxSum = d3.max(xTable.values.map((value) => value.sum));
                    yScale.domain([min, maxSum]).nice();
                    break;
                case "percentStacked":
                    let localMin = min < 0 ? -1 : 0;
                    let localMax = max > 0 ? 1 : 0;
                    yScale.domain([localMin, localMax]);
                    yScaleTickFormat = d3.format(".0%");
                    break;
                default:
                    console.warn("shouldn't reach this");
                    break;
            }
            return { xScale, yScale, line, area, fillOpacity, yScaleTickFormat };
        }

        /**
         * Show popup on X axis click
         * @type {HTMLElement}
         */
        const labelContainer = document.querySelector(".x-axis-label-container");
        labelContainer.onclick = (e) => {
            tooltip.hide();
            popout.show(
                {
                    x: e.x,
                    y: windowSize.height - margin.bottom,
                    autoClose: true,
                    alignment: "Bottom",
                    onChange: (event) => {
                        const { name, value } = event;
                        name == curveType.name && curveType.set(value);
                        name == chartType.name && chartType.set(value);
                    }
                },
                popoutContent
            );
        };
    }
};

/**
 * Trigger init
 */
Spotfire.initialize(init);
