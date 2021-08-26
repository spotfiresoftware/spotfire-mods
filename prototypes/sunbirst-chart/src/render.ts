// @ts-ignore
import * as d3 from "d3";
import { FontInfo, Size, Tooltip } from "spotfire-api";
import { overlap } from "./helper";
import { RenderState } from "./index";
import { Serie, Point } from "./series";

type D3_SELECTION = d3.Selection<SVGGElement, unknown, HTMLElement, any>;
type D3_SERIE_SELECTION = d3.Selection<SVGGElement, Serie, SVGGElement | null, unknown>;

/**
 * Main svg container
 */
const svg = d3.select("#mod-container").append("svg").attr("xmlns", "http://www.w3.org/2000/svg");

export interface Options {
    /** The opacity of the area of the blob */
    opacityArea: number;
    /** The opacity of the circles of each blob */
    opacityCircles: number;
    /** The opacity of the grid lines */
    opacityLines: number;
    /** The width of the stroke around each blob */
    strokeWidth: number;
    /** How many levels or inner circles should there be drawn */
    levels: number;
    /** The size of the colored circles of each blob */
    dotRadius: number;
    /** The distance between the axis labels and the axis */
    labelOffset: number;
    /** Minimum size of a box. Defaults to 300 */
    minBoxSize: number;
    /** If true a circular radar chart is drawn, else a polygonal spider chart will be drawn */
    curveType: string;
    /** If true the x labels will be rotated in order to align with the axis */
    xLabelsRotation: boolean;
    /** If true the y axis avlues will be normalized */
    yAxisNormalization: boolean;
    /** If true the color fill for blobs will be disabled */
    enableColorFill: boolean;
    onLabelClick: null | ((x: number, y: number) => void);
}

const defaultConfig: Options = {
    opacityArea: 0.35,
    opacityCircles: 0.03,
    opacityLines: 0.3,
    strokeWidth: 2,
    levels: 5,
    dotRadius: 4,
    curveType: "Rounded",
    xLabelsRotation: false,
    yAxisNormalization: false,
    enableColorFill: true,
    labelOffset: 20,
    minBoxSize: 300,
    onLabelClick: null
};

export interface Data {
    yDomain: { min: number; max: number };
    xScale: string[];
    series: Serie[];
    clearMarking(): void;
}

/**
 * Renders the chart.
 * @param {RenderState} state
 * @param {Spotfire.DataView} dataView - dataView
 * @param {Spotfire.Size} windowSize - windowSize
 * @param {Partial<Options>} config - config
 * @param {Object} styling - styling
 * @param {Tooltip} tooltip - tooltip
 * @param {any} popoutClosedEventEmitter - popoutClosedEventEmitter
 */
export async function render(
    state: RenderState,
    data: Data,
    windowSize: Size,
    config: Partial<Options>,
    styling: {
        scales: FontInfo;
        stroke: string;
    },
    tooltip: Tooltip,
    popoutClosedEventEmitter: any
) {
    if (state.preventRender) {
        // Early return if the state currently disallows rendering.
        return;
    }

    const onSelection = (dragSelectActive: boolean) => {
        state.preventRender = dragSelectActive;
    };

    /**
     * The constant that contains all the options related to the way the chart is drawn
     */
    const cfg: Options = {
        ...defaultConfig,
        ...config
    };

    let popoutClosed = false;

    popoutClosedEventEmitter.on("popoutClosed", onPopoutClosed);

    const yDomain = [data.yDomain.min, data.yDomain.max];
    const colorSeries = data.series;

    /**
     * Calculating the position and size of the chart
     */
    const diameter = Math.max(Math.min(windowSize.height, windowSize.width), cfg.minBoxSize);
    const padding = 70;
    const labelTextSize = 10;
    const radius = diameter / 2 - padding - cfg.labelOffset - labelTextSize;

    const yRange = [0, radius];
    const yScale = cfg.yAxisNormalization
        ? d3.scaleLinear().domain([0, 100]).range(yRange)
        : d3.scaleLinear().domain(yDomain).range(yRange).nice();
    const angleSlice = (Math.PI * 2) / data.xScale.length;

    const xAxisData = data.xScale;
    let opacityValue = 0;
    let xMin = radius;

    /**
     * Sets the viewBox to match windowSize
     */
    svg.attr("viewBox", `0, 0, ${diameter}, ${diameter}`);
    svg.style("width", "100%");
    svg.style("height", diameter + "px");
    svg.selectAll("*").remove();

    /**
     * The radial line function
     */
    const radarLine = d3
        .lineRadial<Point>()
        .curve(d3.curveLinearClosed)
        .radius(function (d) {
            if (d.virtual) {
                return 0;
            }
            return yScale(d.Y) || 0;
        })
        .angle(function (d) {
            return d.xIndex * angleSlice;
        });

    if (cfg.curveType == "Rounded") {
        radarLine.curve(d3.curveCardinalClosed);
    }

    /**
     * Sort color serie by sum.
     */
    colorSeries.sort((a, b) => b.sum - a.sum);
    if (cfg.yAxisNormalization) {
        colorSeries.forEach((i) =>
            i.points.forEach((j) => (j.Y = ((j.Y - data.yDomain.min) / (data.yDomain.max - data.yDomain.min)) * 100))
        );
    }

    /**
     * Drawing the chart
     */
    draw(colorSeries);

    /**
     * Draw the rectangular selection
     */
    drawRectangularSelection();

    d3.selectAll(".x-axis-labels").on("click", function () {
        const mouse = d3.mouse(document.body);
        cfg.onLabelClick?.(mouse[0], mouse[1]);
    });

    /**
     * Draws a group.
     * @param series - Data series
     */
    function draw(series: Serie[]) {
        /**
         * Append a g element where the current group will be drawn.
         * Translating the position of the chart according to the colon, row and diameter of it
         * and adding the radius, padding, label offset and label text sized
         */
        const svgChart = svg
            .append("g")
            .attr(
                "transform",
                "translate(" +
                    (radius + padding + cfg.labelOffset + labelTextSize) +
                    "," +
                    (radius + padding + cfg.labelOffset + labelTextSize) +
                    ")"
            );

        drawGrid(svgChart, series);
        if (radius * angleSlice > styling.scales.fontSize) {
            /**
             * Create the straight lines radiating outward from the center
             */
            const axis = svgChart.selectAll(".axis").data(xAxisData).enter().append("g").attr("class", "axis");
            drawXAxis(axis);
            drawXAxisLabels(axis);
        }

        /**
         * Create a wrapper for the blobs
         */
        const svgRadarBlobs = svgChart
            .selectAll(".radar-blobs")
            .data(series)
            .enter()
            .append("g")
            .attr("class", "radar-blobs");

        if (cfg.enableColorFill) {
            drawBlobsBackground(svgRadarBlobs);
        }
        drawBlobsOutline(svgRadarBlobs);
        drawYAxisLabels(svgChart);
        svgRadarBlobs.each(function (this, d) {
            drawHoverLine(d3.select(this), radarLine(d.points), colorForSerie(d));
        });
        drawBlobsCircles(svgRadarBlobs);
    }

    /**
     * Draws the chart grid
     * @param svgChart - Group container
     * @param series - Data series
     */
    function drawGrid(svgChart: D3_SELECTION, series: Serie[]) {
        /**
         * Draw the Circular or Poligonal grid (selected in the config)
         */
        if (cfg.curveType == "Rounded") {
            svgChart
                .selectAll(".levels")
                .data(d3.range(1, cfg.levels + 1).reverse())
                .enter()
                .append("circle")
                .attr("class", "grid-circle")
                .attr("r", function (d: number, i: number) {
                    return (radius / cfg.levels) * d;
                })
                .style("fill", styling.scales.color)
                .style("stroke", styling.scales.color)
                .style("fill-opacity", opacitiyForGridCircles)
                .style("opacity", cfg.opacityLines);
        } else {
            svgChart
                .selectAll(".levels")
                .data(d3.range(1, cfg.levels + 1).reverse())
                .enter()
                .append("polygon")
                .attr("class", "grid-circle")
                .attr("points", function (d: number, i: number) {
                    let numberOfData = colorSeries.length === 0 ? 5 : xAxisData.length;
                    let angle = (2 * Math.PI) / numberOfData;
                    let r = (radius / cfg.levels) * d;
                    let points = "";
                    for (let i = 0; i < numberOfData; i++) {
                        let x = Math.sin(angle * i - Math.PI) * r;
                        let y = Math.cos(angle * i - Math.PI) * r;
                        points += x + "," + y + " ";
                    }
                    return points;
                })
                .style("fill", styling.scales.color)
                .style("stroke", styling.scales.color)
                .style("fill-opacity", opacitiyForGridCircles)
                .style("opacity", cfg.opacityLines);
        }
    }

    /**
     * Draws the labels of the y axis.
     * @param svgChart - Group container
     */
    function drawYAxisLabels(svgChart: D3_SELECTION) {
        /**
         * Grid labels
         */
        svgChart
            .selectAll(".y-axis-labels")
            .data(d3.range(1, cfg.levels + 1).reverse())
            .enter()
            .append("text")
            .attr("class", "y-axis-labels")
            .attr("x", 4)
            .attr("y", function (d: number) {
                return (-d * radius) / cfg.levels;
            })
            .attr("dy", "-0.4em")
            .style("font-size", 0.9 * styling.scales.fontSize)
            .attr("fill", "#737373")
            .text(function (d: number, i: number) {
                return colorSeries.length === 0
                    ? ""
                    : cfg.yAxisNormalization
                    ? (d * 100) / cfg.levels + "%"
                    : Math.floor(yScale.invert((d * radius) / cfg.levels) * 100) / 100;
            })
            .on("mouseover", (d) => {
                colorSeries.length === 0
                    ? tooltip.hide()
                    : cfg.yAxisNormalization
                    ? tooltip.show((d * 100) / cfg.levels + "%")
                    : tooltip.show((Math.floor(yScale.invert((d * radius) / cfg.levels) * 100) / 100).toString());
            })
            .on("mouseout", () => tooltip.hide());

        svg.selectAll("path,line").attr("stroke", styling.stroke);

        svg.selectAll("text")
            .attr("fill", styling.scales.color)
            .attr("font-family", styling.scales.fontFamily)
            .attr("font-size", styling.scales.fontSize);
    }

    /**
     * Draws the x axis.
     * @param axis - Axis container
     */
    function drawXAxis(axis: d3.Selection<SVGGElement, string, SVGGElement, unknown>) {
        /**
         * Append the lines
         */
        axis.append("line")
            .attr("x1", 0)
            .attr("y1", 0)
            .attr("x2", function (d: string, i: number) {
                let x2 = radius * Math.cos(angleSlice * i - Math.PI / 2);
                if (Math.abs(x2) < xMin) {
                    xMin = x2;
                }
                return x2;
            })
            .attr("y2", function (d: string, i: number) {
                return radius * Math.sin(angleSlice * i - Math.PI / 2);
            })
            .attr("class", "line")
            .style("stroke", styling.scales.color)
            .style("stroke-width", "2px")
            .style("opacity", cfg.opacityLines);
    }

    /**
     * Draws the x axis labels.
     * @param axis - Axis container
     */
    function drawXAxisLabels(axis: d3.Selection<SVGGElement, string, SVGGElement, unknown>) {
        /**
         * Append the labels at each axis
         */
        let xLabels = axis
            .append("g")
            .attr("transform", function (_d, i) {
                if (!cfg.xLabelsRotation) {
                    return null;
                }
                let centerAngle = angleSlice * i - Math.PI / 2;
                let x2 = radius * Math.cos(centerAngle);
                if (x2 < 0) {
                    return "rotate(" + (centerAngle * (180 / Math.PI) - 180) + ")";
                }
                return "rotate(" + centerAngle * (180 / Math.PI) + ")";
            })
            .append("text")
            .attr("class", "x-axis-labels" + (config.onLabelClick ? " x-axis-labels-editable" : ""))
            .attr("text-anchor", function (_d: string, i: number) {
                let x2 = radius * Math.cos(angleSlice * i - Math.PI / 2);
                if (x2 > xMin) {
                    return "start";
                } else if (x2 < xMin) {
                    return "end";
                }
                if (cfg.xLabelsRotation) {
                    return "start";
                }

                return "middle";
            })
            .attr("x", function (_d: string, i: number) {
                let x2 = radius * Math.cos(angleSlice * i - Math.PI / 2);
                if (cfg.xLabelsRotation) {
                    return radius + cfg.labelOffset;
                }
                return x2 + (cfg.labelOffset * x2) / radius;
            })
            .attr("y", function (_d: string, i: number) {
                if (cfg.xLabelsRotation) {
                    return null;
                }
                let y2 = radius * Math.sin(angleSlice * i - Math.PI / 2);
                let yPadding = (cfg.labelOffset * y2) / radius;
                return y2 + yPadding;
            })

            .attr("transform", function (_d, i) {
                let x2 = radius * Math.cos(angleSlice * i - Math.PI / 2);
                if (!cfg.xLabelsRotation || x2 >= 0) {
                    return null;
                }
                return "scale(-1, -1) rotate(180, " + d3.select(this).attr("x") + ", 0)";
            })
            .attr("dy", "0.35em")
            .attr("fill", styling.scales.color)
            .style("font-family", styling.scales.fontFamily)
            .style("font-size", styling.scales.fontSize + "px")

            .on("mouseover", (d) => {
                tooltip.show(d);
            })
            .on("mouseout", () => tooltip.hide());

        let previousElement: d3.Selection<HTMLElement | null, unknown, null, undefined> | null;

        if (cfg.xLabelsRotation) {
            xLabels
                .append("tspan")
                .text(function (d) {
                    return d;
                })
                .each(function () {
                    let currentElement = d3.select(this);
                    let currentNode = currentElement.node();
                    let svgNode = svg.node();
                    if (!currentNode || !svgNode) {
                        return;
                    }
                    let currentText = currentElement.text();
                    let currentElementBoundingRect = currentNode.getBoundingClientRect();
                    const svgElementBoundingRect = svgNode.getBoundingClientRect();

                    while (
                        currentElementBoundingRect.top < svgElementBoundingRect.top ||
                        currentElementBoundingRect.right > svgElementBoundingRect.right ||
                        currentElementBoundingRect.bottom > svgElementBoundingRect.bottom ||
                        currentElementBoundingRect.left < svgElementBoundingRect.left
                    ) {
                        if (currentText.length <= 1) {
                            return;
                        }

                        currentText = currentText.slice(0, -1);
                        currentElement.text(currentText + "...");
                        currentElementBoundingRect = currentNode.getBoundingClientRect();
                    }
                });
        } else {
            xLabels
                .append("tspan")
                .text(function (d) {
                    return d;
                })
                .each(function () {
                    let currentElement = d3.select(this);
                    let currentElementParent = d3.select(this.parentElement);
                    let currentText = currentElement.text();
                    let currentNode = currentElement.node();
                    let previousNode = previousElement?.node();
                    var previousText = previousElement?.text();
                    let svgNode = svg.node();

                    if (!currentNode || !svgNode) {
                        return;
                    }

                    if (previousNode) {
                        var currentElementBoundingRect = currentNode.getBoundingClientRect();
                        var previousElemenetBoundingRect = previousNode.getBoundingClientRect();
                        const svgElementBoundingRect = svgNode.getBoundingClientRect();

                        while (
                            overlap(currentElementBoundingRect, previousElemenetBoundingRect) ||
                            currentElementBoundingRect.top < svgElementBoundingRect.top ||
                            currentElementBoundingRect.right > svgElementBoundingRect.right ||
                            currentElementBoundingRect.bottom > svgElementBoundingRect.bottom ||
                            currentElementBoundingRect.left < svgElementBoundingRect.left
                        ) {
                            if (currentText.length <= 1 && previousText!.length <= 1) {
                                previousElement = currentElementParent;
                                return;
                            }

                            if (currentText.length > 1) {
                                if (currentText.slice(-3) === "...") {
                                    currentText = currentText.slice(0, -4);
                                } else {
                                    currentText = currentText.slice(0, -1);
                                }
                                currentElement.text(currentText + "...");
                                currentElementBoundingRect = currentNode.getBoundingClientRect();
                            }

                            if (previousText!.length > 1) {
                                if (previousText!.slice(-3) === "...") {
                                    previousText = previousText!.slice(0, -4);
                                } else {
                                    previousText = previousText!.slice(0, -1);
                                }
                                previousElement!.text(previousText + "...");
                                previousElemenetBoundingRect = previousNode.getBoundingClientRect();
                            }
                        }
                    }

                    previousElement = currentElementParent;
                });
        }
    }

    /**
     * Calculates the opacity of the grid circles
     */
    function opacitiyForGridCircles() {
        return (opacityValue += cfg.opacityCircles);
    }

    /**
     * Draws the background of the blobs
     * @param svgRadarBlobs - Wrapper for the blobs
     */
    function drawBlobsBackground(svgRadarBlobs: d3.Selection<SVGGElement, Serie, SVGGElement, unknown>) {
        /**
         * Append the backgrounds
         */
        svgRadarBlobs
            .append("path")
            .attr("class", "radar-area")
            .attr("d", function (d) {
                return radarLine(d.points);
            })
            .style("fill", colorForSerie)
            .style("fill-opacity", cfg.opacityArea)
            .on("click", function (this: SVGPathElement, d) {
                mark(d);
                d3.select(this).attr("mod-Color");
                d3.event.stopPropagation();
            });
    }

    /**
     * Draws the outline of the blobs
     * @param svgRadarBlobs - Wrapper for the blobs
     */
    function drawBlobsOutline(svgRadarBlobs: d3.Selection<SVGGElement, Serie, SVGGElement, unknown>) {
        /**
         * Create the outlines
         */
        svgRadarBlobs
            .append("path")
            .attr("class", "radar-stroke")
            .attr("d", function (d: Serie) {
                return radarLine(d.points);
            })
            .style("stroke-width", cfg.strokeWidth + "px")
            .style("stroke", colorForSerie)
            .style("fill", "none")
            .on("click", function (d) {
                mark(d);
                d3.select(this).attr("mod-Color");
                d3.event.stopPropagation();
            });
    }

    /**
     * Draws the circles of the blobs
     * @param svgRadarBlobs - Wrapper for the blobs
     */
    function drawBlobsCircles(svgRadarBlobs: d3.Selection<SVGGElement, Serie, SVGGElement, unknown>) {
        /**
         * Append the circles
         */
        svgRadarBlobs
            .selectAll(".radar-circle")
            .data(function (d) {
                return d.points.filter((p) => !p.virtual);
            })
            .enter()
            .append("circle")
            .attr("class", "radar-circle")
            .attr("r", cfg.dotRadius)
            .attr("cx", calculatePointXPosition)
            .attr("cy", calculatePointYPosition)
            .style("fill", function (d) {
                return d.color;
            })
            .on("mouseover", function (d) {
                tooltip.show(d.tooltip());
            })
            .on("mouseout", function () {
                tooltip.hide();
            })
            .on("click", mark);
    }

    function calculatePointYPosition(d: Point) {
        return (yScale(d.Y) || 0) * Math.sin(angleSlice * d.xIndex - Math.PI / 2);
    }

    function calculatePointXPosition(d: Point) {
        return (yScale(d.Y) || 0) * Math.cos(angleSlice * d.xIndex - Math.PI / 2);
    }

    /**
     * Draws hover line.
     */
    function drawHoverLine(parent: D3_SERIE_SELECTION, hoverLinePath: string | null, hoverLinePathColor: string) {
        if (!hoverLinePath) {
            return;
        }
        const hoverGroup = parent.append("g");

        hoverGroup
            .append("path")
            .attr("class", "line-hover line-hover-bg")
            .attr("d", hoverLinePath)
            .on("mouseover", handleMouseOver)
            .on("mouseout", handleMouseOut)
            .on("click", mark);

        const g = parent.append("g").attr("visibility", "hidden").attr("class", "line-hover-container");
        g.append("path").attr("class", "line-hover line-hover-casing").attr("d", hoverLinePath);
        g.append("path").attr("class", "line-hover line-hover-fill").attr("d", hoverLinePath);
        g.append("path")
            .attr("d", hoverLinePath)
            .style("pointer-events", "none")
            .style("fill", "none")
            .style("stroke-width", cfg.strokeWidth + "px")
            .style("stroke", hoverLinePathColor);

        function handleMouseOver() {
            g.attr("visibility", "visible");
        }

        function handleMouseOut() {
            g.attr("visibility", "hidden");
        }
    }

    /**
     * Draws rectangular selection
     */
    function drawRectangularSelection() {
        function drawRectangle(x: number, y: number, w: number, h: number) {
            return "M" + [x, y] + " l" + [w, 0] + " l" + [0, h] + " l" + [-w, 0] + "z";
        }

        const rectangle = svg.append("path").attr("class", "rectangle").attr("visibility", "hidden");

        const startSelection = function (start: [number, number]) {
            rectangle.attr("d", drawRectangle(start[0], start[0], 0, 0)).attr("visibility", "visible");
        };

        const moveSelection = function (start: [number, number], moved: [number, number]) {
            rectangle.attr("d", drawRectangle(start[0], start[1], moved[0] - start[0], moved[1] - start[1]));
        };

        const endSelection = function (start: [number, number], end: [number, number]) {
            rectangle.attr("visibility", "hidden");

            // Ignore rectangular markings that were just a click.
            if (Math.abs(start[0] - end[0]) < 2 || Math.abs(start[1] - end[1]) < 2) {
                if (
                    d3.select(d3.event.target.parentNode).classed("radar-blobs") ||
                    d3.select(d3.event.target).classed("line-hover line-hover-bg") ||
                    d3.select(d3.event.target.parentNode).classed("x-axis-labels") ||
                    d3.select(d3.event.target).classed("x-axis-labels") ||
                    popoutClosed
                ) {
                    popoutClosed = false;
                    return;
                }
                return data.clearMarking();
            }

            const selectionBox = rectangle.node()!.getBoundingClientRect();
            const svgRadarMarkedCircles = svg.selectAll<SVGCircleElement, Point>(".radar-circle").filter(function () {
                const box = this.getBoundingClientRect();
                return (
                    box.x >= selectionBox.x &&
                    box.y >= selectionBox.y &&
                    box.x + box.width <= selectionBox.x + selectionBox.width &&
                    box.y + box.height <= selectionBox.y + selectionBox.height
                );
            });

            if (svgRadarMarkedCircles.size() === 0) {
                return data.clearMarking();
            }

            svgRadarMarkedCircles.each(mark);
        };

        svg.on("mousedown", function (this) {
            onSelection(true);
            if (d3.event.which === 3) {
                return;
            }
            let subject = d3.select(window),
                start = d3.mouse(this);
            startSelection(start);
            subject
                .on("mousemove.rectangle", function () {
                    moveSelection(start, d3.mouse(svg.node()!));
                })
                .on("mouseup.rectangle", function () {
                    endSelection(start, d3.mouse(svg.node()!));
                    subject.on("mousemove.rectangle", null).on("mouseup.rectangle", null);
                });
        });
        svg.on("mouseup", function (this) {
            onSelection(false);
        });
    }

    function onPopoutClosed() {
        popoutClosed = true;
    }
}

function mark(d: Serie | Point) {
    d3.event.ctrlKey ? d.mark("ToggleOrAdd") : d.mark();
}

/**
 * Find a suitable color for the entire serie. Use the color from a marked row, if avaialble.
 * @param serie
 */
export function colorForSerie(serie: Serie) {
    if (serie.points.length == 0) {
        return "transparent";
    }

    let firstMarkedPoint = serie.points.find((p) => p.marked);

    if (firstMarkedPoint) {
        return firstMarkedPoint.color;
    }

    let firstRealPoint = serie.points.find((p) => !p.virtual);

    if (firstRealPoint) {
        return firstRealPoint.color;
    }

    return "transparent";
}
