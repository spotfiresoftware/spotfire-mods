// @ts-ignore
import * as d3 from "d3";
import { DataViewRow } from "spotfire-api";
import { setBusy, setIdle } from "./interactionLock";

// /**
//  * Adds a tooltip to a D3 selection object
//  * @param {Spotfire.mod} mod
//  * @param {Array<Spotfire.Axis>} items
//  */
export function highlight(
    mod: Spotfire.Mod,
    tooltipDisplayAxes: Spotfire.Axis[]
) {
    function highlight(selection: any) {
        selection.on("mouseenter", showTooltip).on("mouseleave", hideTooltip);
    }

    function hideTooltip() {
        setIdle();
        // d3.select("#HighlightShape").remove();
        d3.select(".highlighter").remove();
        mod.controls.tooltip.hide();
    }

    /**
     * Show the tooltip
     * @param {Spotfire.DataViewRow} row
     * @param {Int} i
     */
    function showTooltip(this: any, _: any, row: DataViewRow) {
        setBusy();
        d3.select(this)
            .clone()
            .raise()
            .style("fill", "None")
            .style("stroke", "black")
            .classed("highlighter", true);

        let tooltipItems: string[] = [];
        tooltipDisplayAxes.forEach((axis) => {
            if (axis.expression == "") {
                return;
            }
            if (axis.expression == "<>") {
                return;
            }

            let tooltipItemText = getDisplayName(axis);
            tooltipItemText += ": ";

            if (axis.isCategorical) {
                tooltipItemText += row.categorical(axis.name).formattedValue();
            } else {
                tooltipItemText += row.continuous(axis.name).formattedValue();
            }
            if (!tooltipItems.includes(tooltipItemText)) {
                tooltipItems.push(tooltipItemText);
            }
        });
        let tooltipText = tooltipItems.join("\n");

        mod.controls.tooltip.show(tooltipText);
    }

    /**
     *
     * @param {Spotfire.Axis} axis
     */
    function getDisplayName(axis: Spotfire.Axis) {
        return axis.parts
            .map((node) => {
                return node.displayName;
            })
            .join();
    }

    return highlight;
}

// /**
//  * Creates a new D3 dragbehavior to handle marking selections
//  * @param {d3.Selection} svg
//  * @param {d3.Selection} markingRect
//  * @param {d3.Selection} referenceSelection
//  * @param {Spotfire.DataView} dataView
//  * @param {Array<Number>} [fixRect] [fixedX, fixedY, fixedWidth, fixedHeight]
//  * @returns {d3.DragBehavior}
//  */
export function markingHandler(
    svg: any, //d3.Selection<SVGSVGElement, unknown, HTMLElement, any>,
    markingRect: any, // d3.Selection<SVGRectElement, unknown, HTMLElement, any>,
    referenceSelection: any, // d3.Selection<SVGGElement, unknown, HTMLElement, any>,
    dataView: Spotfire.DataView,
    fixRect?: (number | undefined)[]
) {
    let fixX = fixRect ? fixRect[0] : undefined;
    let fixY = fixRect ? fixRect[1] : undefined;
    let fixedWidth = fixRect ? fixRect[2] : undefined;
    let fixedHeight = fixRect ? fixRect[3] : undefined;
    var x0 = 0;
    var y0 = 0;
    var x1 = 0;
    var y1 = 0;
    // @ts-ignore
    var marking = false;

    function dragstarted(this: any, e: any) {
        marking = false;
        x0 = e.x;
        y0 = e.y;
        x1 = x0;
        y1 = y0;

        markingRect
            .attr("x", fixX || x0)
            .attr("y", fixY || y0)
            .attr("height", fixedHeight || 0)
            .attr("width", fixedWidth || 0)
            .attr("class", "activeMarking");
    }

    function dragged(this: any, e: any) {
        x1 = e.x;
        y1 = e.y;

        // Begin marking when mouse moved a bit.
        marking = marking || Math.max(Math.abs(x0 - x1), Math.abs(y0 - y1)) > 2;

        if (!fixedWidth) {
            markingRect
                .attr("width", Math.abs(x1 - x0))
                .attr("x", x1 > x0 ? fixX || x0 : fixX || x1);
        }
        if (!fixedHeight) {
            markingRect
                .attr("height", Math.abs(y1 - y0))
                .attr("y", y1 > y0 ? fixY || y0 : fixY || y1);
        }
    }

    function dragended(e: any) {
        if (!marking) {
            return;
        }

        marking = false;
        var rpos = svg.node()!.createSVGRect();
        var boundingRect = markingRect.node()!.getBoundingClientRect();
        rpos.x = boundingRect.x;
        rpos.y = boundingRect.y;
        rpos.height = boundingRect.height;
        rpos.width = boundingRect.width;

        var nodes = svg
            .node()!
            .getIntersectionList(rpos, referenceSelection.node());

        if (nodes.length < 1) {
            dataView.clearMarking();
        } else {
            nodes.forEach((element: any) => {
                /**@type {Spotfire.DataViewRow} */
                // @ts-ignore
                var d = element.__data__;
                markRowforAllTimes(
                    d,
                    dataView,
                    e.ctrlKey || e.metaKey
                );
            });
        }
        markingRect.attr("class", "inactiveMarking");
    }

    return d3
        .drag()
        .filter(function (e: any) {
            return e.which == 1;
        })
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended);
}

export async function markRowforAllTimes(
    row: DataViewRow,
    dataView: Spotfire.DataView,
    toggle: boolean
) {
    let mode: Spotfire.MarkingOperation = toggle ? "ToggleOrAdd" : "Replace";

    if (!(await dataView.categoricalAxis("AnimateBy"))) {
        row.mark(mode);
    }

    const axes = (await dataView.axes())
        .filter((a) => a.isCategorical && a.name != "AnimateBy")
        .map((a) => a.name);
    (await dataView.allRows())
        ?.filter((sibling) => {
            for (var i = 0; i < axes.length; i++) {
                if (
                    row.categorical(axes[i]).leafIndex !=
                    sibling.categorical(axes[i]).leafIndex
                ) {
                    return false;
                }
            }
            return true;
        })
        .forEach((r) => r.mark(mode));
}
