import * as d3 from "d3";
import { ReadableProxy, Size } from "spotfire-api";
import { highlight, markingHandler, markRowforAllTimes } from "./modutils";
import { Grid } from "./Grid";
import { animationControl } from "./animationControl";
import { setIdle } from "./interactionLock";

/**
 * Constants
 */
const defaultTransitionSpeed = 100,
    relativeMarkerSize = 0.1,
    defaultOpacity = 0.8,
    markingOpacity = 0.95,
    defaultAnimationControlHeight = 32,
    yaxiswidth = 60,
    xaxisheight = 32,
    displayedRowsLimit = 100000;

/**
 * Create the graphical elements with attributes that will remain the same through the lifetime of the
 * visualization in order to minimize unnecessary creation of elements in the main
 * interactive visualization loop. Drawing order are controlled via svg group (g) elements.
 */

const modContainer = d3.select("#mod-container");

// svg container
const svg = modContainer
    .append("svg")
    .attr("xmlns", "http://www.w3.org/2000/svg");

// Layer 1: The visualization guide layer
const guideLayer = svg.append("g").attr("id", "guideLayer");
const xAxisScaleGuideGroup = guideLayer
    .append("g")
    .attr("id", "xAxisScaleGuideGroup")
    .style("cursor", "default")
    .style("user-select", "none");
const yAxisScaleGuideGroup = guideLayer
    .append("g")
    .attr("id", "yAxisScaleGuideGroup")
    .style("cursor", "default")
    .style("user-select", "none");

const animationControlGroup = guideLayer
    .append("g")
    .attr("id", "animationControlGroup")
    .style("cursor", "default")
    .style("user-select", "none");

// Layer 2 - background layer
const backgroundLayer = svg.append("g").attr("id", "backgroundLayer");

// Layer 3: The interaction layer
const interactionLayer = svg
    .append("g")
    .attr("id", "interactionLayer")
    .attr("fill", "white")
    .attr("fill-opacity", 0.0);
const xAxisScaleGuideArea = interactionLayer
    .append("rect")
    .attr("id", "xAxisScaleGuideArea");
const yAxisScaleGuideArea = interactionLayer
    .append("rect")
    .attr("id", "yAxisScaleGuideArea");
const markingArea = interactionLayer.append("rect").attr("id", "markingArea");

// Layer 4: The marker layer
const markerLayer = svg.append("g").attr("id", "markerLayer");

// Layer 5: Marking overlay
const markingOverlay: any = svg
    .append("rect")
    .attr("id", "markingOverlay")
    .attr("class", "inactiveMarking");

// Layer 6: Message overlay
const messageLayer: any = svg.append("g").attr("id", "messageOverlay");

let animationControlInstance: ReturnType<typeof animationControl>;

type FIX_TYPE = any;

export function clearCanvas() {
    markerLayer.selectAll("*").remove(); // clear graph display area
}

export interface Bubble {
    x: number;
    y: number;
    size: number;
    color: string;
    id: string;
    label: string;
    isMarked: boolean;
    mark(): void;
}

export interface NumericScale {
    min: number;
    max: number;
}

export async function render(
    dataView: Spotfire.DataView,
    frame: Bubble[],
    scales: {
        y: NumericScale;
        x: NumericScale;
        size: NumericScale;
    },
    animation: boolean,
    windowSize: Size,
    toolTipDisplayAxes: Spotfire.Axis[],
    mod: Spotfire.Mod,
    showLabels: boolean,
    xLogScale: boolean,
    yLogScale: boolean,
    animationSpeedProperty: ReadableProxy<Spotfire.ModProperty<number>>,
    animationSpeed: number,
    onScaleClick: (x: number, y: number, axis: "X" | "Y") => void
) {
    animationControlInstance =
        animationControlInstance || animationControl(animationSpeedProperty);
    let context = mod.getRenderContext();
    document.querySelector("#extra_styling")!.innerHTML = `
    .tick { color: ${context.styling.scales.tick.stroke} }
    .domain { color: ${context.styling.scales.line.stroke} }
    .bottomGraphBorder { color: ${context.styling.scales.line.stroke} }
    .leftGraphBorder { color: ${context.styling.scales.line.stroke} }
    .animation-tray { fill: ${context.styling.scales.line.stroke} }
    .playbutton { fill: ${context.styling.scales.line.stroke} }
    .animationSpeed { fill: ${context.styling.scales.line.stroke} }
    .dot.marked { stroke: ${context.styling.general.font.color}}
    .label { fill: ${context.styling.general.font.color}; font-size: ${context.styling.general.font.fontSize}px; font-weight: ${context.styling.general.font.fontWeight}; font-style: ${context.styling.general.font.fontStyle};}
    .message { fill: ${context.styling.general.font.color}; font-size: ${context.styling.general.font.fontSize}px; font-weight: ${context.styling.general.font.fontWeight}; font-style: ${context.styling.general.font.fontStyle};}
    #animationSpeedLabel { color: ${context.styling.general.font.color}; font-size: ${context.styling.general.font.fontSize}px; font-weight: ${context.styling.general.font.fontWeight}; font-style: ${context.styling.general.font.fontStyle};}
    `;

    if (!frame.length) {
        clearCanvas();
        return;
    }

    //Calculate positions for all elements of the visualization
    let modHeight = windowSize.height;
    let modWidth = windowSize.width;
    let maxMarkerSize =
        (relativeMarkerSize * Math.min(modHeight, modWidth)) / 2;
    let innerMargin = maxMarkerSize;

    let animationControlHeight = 0;
    if (animation) { // TODO Check if an animation axis exists
        animationControlHeight = defaultAnimationControlHeight;
    } else {
        animationControlHeight = 0;
    }

    let grid = new Grid(
        modWidth,
        modHeight,
        `${yaxiswidth}px ${innerMargin}px 1fr ${innerMargin}px`,
        `${innerMargin}px 1fr ${innerMargin}px ${xaxisheight}px ${animationControlHeight}px`
    );

    let xAxesArea = grid.getCoords("c4");
    let yAxisArea = grid.getCoords("a2");
    let bubbleArea = grid.getCoords("b1:d3");
    let bubbleDrawingArea = grid.getCoords("c2");
    let animationControlArea = grid.getCoords("b5:d5");

    // set the viewbox of the svg element to match the available drawing area
    svg.attr("viewBox", "0 0 " + modWidth + " " + modHeight);

    var xScale = xLogScale
        ? d3
              .scaleLog()
              .domain([scales.x.min, scales.x.max])
              .range([0, xAxesArea.width])
        : d3
              .scaleLinear()
              .domain([scales.x.min, scales.x.max])
              .range([0, xAxesArea.width])
              .nice();

    // Add x-axis scale guide
    xAxisScaleGuideGroup
        .attr("transform", `translate(${xAxesArea.x1},${xAxesArea.y1})`)
        .call(d3.axisBottom(xScale).ticks(10, "r"));

    // Add/update line that extends the x-axis scale guide to the corner of the drawing area
    let bottomGraphBorder: any = guideLayer.select(".bottomGraphBorder");
    if (bottomGraphBorder.empty())
        bottomGraphBorder = guideLayer
            .append("line")
            .attr("class", "bottomGraphBorder");

    bottomGraphBorder
        .attr("x1", bubbleArea.x1)
        .attr("y1", bubbleArea.y2 + 0.5)
        .attr("x2", bubbleDrawingArea.x2)
        .attr("y2", bubbleArea.y2 + 0.5)
        .attr("stroke-width", 1)
        .attr("stroke", "currentColor");

    // Add one dimensional marking by dragging on the x-axis area
    xAxisScaleGuideArea
        .on("contextmenu", function () {
            onScaleClick(...d3.mouse(document.body), "X");
            d3.event.preventDefault();
            d3.event.stopPropagation();
            return false;
        })
        .attr("x", xAxesArea.x1)
        .attr("y", xAxesArea.y1)
        .attr("width", xAxesArea.width)
        .attr("height", xAxesArea.height)
        .call(
            markingHandler(svg, markingOverlay, markerLayer, dataView, [
                undefined,
                1,
                undefined,
                bubbleArea.height,
            ]) as FIX_TYPE
        );

    var yScale = yLogScale
        ? d3
              .scaleLog()
              .domain([scales.y.min, scales.y.max])
              .range([yAxisArea.height, 0])
        : d3
              .scaleLinear()
              .domain([scales.y.min, scales.y.max])
              .range([yAxisArea.height, 0])
              .nice();

    // Add y-axis scale guide
    yAxisScaleGuideGroup
        .attr("transform", `translate(${yAxisArea.x2},${yAxisArea.y1})`)

        .call(d3.axisLeft(yScale).ticks(10, "r"));

    // Add/update line that connects the y scale with lower left hand corner of graph area
    var leftGraphBorder: any = guideLayer.select(".leftGraphBorder");

    if (leftGraphBorder.empty())
        leftGraphBorder = guideLayer
            .append("line")
            .attr("class", "leftGraphBorder");

    leftGraphBorder
        .attr("x1", bubbleArea.x1 + 0.5)
        .attr("y1", bubbleDrawingArea.y1)
        .attr("x2", bubbleArea.x1 + 0.5)
        .attr("y2", bubbleArea.y2)
        .attr("stroke-width", 1)
        .attr("stroke", "currentColor");

    // Add one dimensional marking by dragging on the y-axis area
    yAxisScaleGuideArea
        .on("contextmenu", function () {
            onScaleClick(...d3.mouse(document.body), "Y");
            d3.event.preventDefault();
            d3.event.stopPropagation();
            return false;
        })
        .attr("x", yAxisArea.x1)
        .attr("y", yAxisArea.y1)
        .attr("width", yAxisArea.width)
        .attr("height", yAxisArea.height)
        .call(
            markingHandler(svg, markingOverlay, markerLayer, dataView, [
                bubbleArea.x1 + 0.5,
                undefined,
                bubbleArea.width - 0.5,
                undefined,
            ]) as FIX_TYPE
        );

    // Add rectangle marking by dragging in the bubblechart area
    markingArea
        .attr("x", bubbleArea.x1)
        .attr("y", bubbleArea.y1)
        .attr("width", bubbleArea.width)
        .attr("height", bubbleArea.height)
        .on("click", () => {
            if (!d3.event.defaultPrevented) {
                dataView.clearMarking();
            }
        })
        .call(
            markingHandler(
                svg,
                markingOverlay,
                markerLayer,
                dataView
            ) as FIX_TYPE
        );

    // Calculate markersize scale
    var sizeScale = d3
        .scaleSqrt()
        .domain([scales.size.min, scales.size.max])
        .range([2, maxMarkerSize]);

    let animationEnabled = animation;

    if (animationEnabled) {
        animationControlGroup.attr("class", "enabled");

        // render animation scale
        let animationScale = d3
            .scaleLinear()
            .domain([0, 10 - 1]) // TODO animation scale
            .range([0, animationControlArea.width])
            .clamp(true);

        // TODO: When can we keep the instance and when do we need to cleanup and replace?
        animationControlInstance.update(
            animationScale,
            AnimationValueChanged,
            animationSpeed
        );

        // render animation controls
        animationControlGroup
            .attr(
                "transform",
                `translate (${animationControlArea.x1} ${animationControlArea.y1})`
            )
            .call(animationControlInstance.render);

        d3.scaleLinear().tickFormat(5);
    } else {
        animationControlGroup.attr("class", "disabled");
    }

    await updateBubbleChart(
        animationControlInstance.isPlaying() ? animationSpeed : 0
    );

    async function AnimationValueChanged(
        value: number,
        changedByUser: boolean
    ) {
        try {
            if (changedByUser) {
                await updateBubbleChart();
            } else {
                await updateBubbleChart(animationSpeed);
            }
        } catch (err) {
            console.log(err);
        }
    }

    function getKey(row: any): string {
        return row.key;
    }

    function showMessage(message: String) {
        messageLayer.selectAll("*").remove();
        messageLayer
            .append("text")
            .attr("class", "message")
            .attr("x", bubbleDrawingArea.x1)
            .attr("y", bubbleDrawingArea.y2)
            .attr("dy", ".3em")
            .text(message);
    }

    function hideMessage() {
        messageLayer.selectAll("*").remove();
    }

    function updateBubbleChart(transitionDuration = defaultTransitionSpeed) {
        let displayRows = frame;

        // animateLeaves![animationIndex].rows().filter(rowFilter);

        let rowCount = displayRows.length;
        if (rowCount > displayedRowsLimit) {
            markerLayer.selectAll("*").remove(); // clear all markers and labels
            showMessage(
                `☹️ Cannot render - too many bubbles (Number of bubbles: ${rowCount}, limit: ${displayedRowsLimit}) `
            );
            return Promise.resolve();
        }
        hideMessage();

        let allOrNoneMarked = !(
            displayRows.find((r) => r.isMarked) &&
            displayRows.find((r) => !r.isMarked)
        );
        let opacity = allOrNoneMarked ? defaultOpacity : markingOpacity;

        // prepare the tooltip
        let hl = highlight(mod, toolTipDisplayAxes);

        markerLayer.attr(
            "transform",
            `translate (${bubbleDrawingArea.x1} ${bubbleDrawingArea.y1})`
        );

        updateLabels();
        updateBackground();

        return updateDots();

        function updateBackground() {
            let bgText =
                animation
                    ? "TODO Label for animation"
                    : "";

            backgroundLayer
                .selectAll(".backgroundText")
                .data([null])
                .enter()
                .append("text")
                .attr("class", "backgroundText");

            let fontSize = Math.min(
                (1.8 * bubbleDrawingArea.width) / bgText.length,
                bubbleDrawingArea.height
            );

            backgroundLayer
                .selectAll(".backgroundText")
                .attr("x", bubbleDrawingArea.x1 + bubbleDrawingArea.width / 2)
                .attr("y", bubbleDrawingArea.y1 + bubbleDrawingArea.height / 2)
                .attr("text-anchor", "middle")
                .attr("alignment-baseline", "middle")
                .style("color", context.styling.scales.font.color)
                .style("font-size", fontSize + "px")
                .text(bgText);
        }

        function updateDots() {
            let dots = markerLayer
                .selectAll<SVGCircleElement, Bubble>(".dot")
                .data(displayRows, getKey);

            // add new dots if needed
            let newdots = dots
                .enter()
                .append("circle")
                .attr("cx", (row: Bubble) => xScale(row.x) || 0)
                .attr("cy", (row: Bubble) => yScale(row.y) || 0)
                .attr("r", 0)
                .attr("fill", "transparent");

            // @ts-ignore
            let allDots = dots.merge(newdots);

            // update attributes on all dots
            let transitionEnd = allDots
                .attr("id", getKey)
                .attr("class", (r) => `dot ${r.isMarked ? "marked" : ""}`)
                .call(
                    markingHandler(
                        svg,
                        markingOverlay,
                        markerLayer,
                        dataView
                    ) as FIX_TYPE
                )
                .style("fill-opacity", opacity)
                .transition()
                .ease(d3.easeLinear)
                .duration(transitionDuration)
                .attr("cx", (row: Bubble) => xScale(row.x) || 0)
                .attr("cy", (row: Bubble) => yScale(row.y) || 0)
                .attr("r", radius)
                .style("fill", (row: Bubble) => row.color)
                .end()
                .catch(() => {
                    // Interrupted transitions lead to a rejected promise.
                });

            allDots
                .on("click", function (row: Bubble) {
                    setIdle();
                    markRowforAllTimes(
                        row,
                        dataView,
                        d3.event.ctrlKey || d3.event.metaKey
                    );

                    d3.event.preventDefault();
                })
                .call(hl);

            // move marked elements to the top
            allDots.filter((row: Bubble) => row.isMarked).raise();

            // remove any dots no longer needed.
            dots.exit()
                .transition()
                .duration(transitionDuration)
                .style("fill-opacity", 0)
                .attr("r", 0)
                .remove();
            return transitionEnd;
        }

        function radius(row: Bubble) {
            return sizeScale(row.size) || 0;
        }

        function updateLabels() {
            const labelDX = (row: Bubble) =>
                radius(row) +
                (xScale(row.x) || 0);

            const labelDY = (row: Bubble) =>
                (yScale(row.y) || 0) -
                radius(row);

            const labelText = (row: Bubble) => {
                return showLabels && row.isMarked
                    ? row.label
                    : "";
            };

            //re-use current labels
            let labels = markerLayer
                .selectAll<SVGTextElement, Bubble>(".label")
                .data(displayRows, (d) => getKey(d) + "_label");

            // add new dots if needed
            let newLabels = labels
                .enter()
                .append("text")
                .attr("dx", labelDX)
                .attr("dy", labelDY)
                .text(labelText);

            // @ts-ignore
            let allLabels = labels.merge(newLabels);

            // update attributes on all labels
            allLabels
                .attr("id", (d) => getKey(d) + "_label")
                .attr("class", (r) => `label ${r.isMarked ? "marked" : ""}`)
                .call(
                    markingHandler(
                        svg,
                        markingOverlay,
                        markerLayer,
                        dataView
                    ) as FIX_TYPE
                )
                .style("fill-opacity", opacity)
                .transition()
                .ease(d3.easeLinear)
                .duration(transitionDuration)
                .attr("dx", labelDX)
                .attr("dy", labelDY)
                .text(labelText);

            allLabels
                .on("click", function (row: Bubble) {
                    row.mark();
                    // markRowforAllTimes(
                    //     row,
                    //     dataView,
                    //     d3.event.ctrlKey || d3.event.metaKey
                    // );
                })
                .call(hl);

            // move marked elements to the top
            allLabels.filter((row: Bubble) => row.isMarked).raise();

            // remove any labels no longer needed.
            labels.exit().remove();
        }
    }
}
