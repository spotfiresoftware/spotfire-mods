import { Data, Options, render } from "./render";
import { createLabelPopout } from "./popout";
import { buildColorSeries, Point } from "./series";
import { renderGantt } from "./gantt-chart";
import { AxisPart, DataView, DataViewHierarchyNode, Mod, ModProperty } from "spotfire-api";
var events = require("events");

const Spotfire = window.Spotfire;
const DEBUG = true;

export interface RenderState {
    preventRender: boolean;
}

Spotfire.initialize(async (mod) => {
    const context = mod.getRenderContext();

    /**
     * Create reader function which is actually a one time listener for the provided values.
     */
    const reader = mod.createReader(mod.visualization.data(), mod.windowSize());

    /**
     * Create a persistent state used by the rendering code
     */
    const state: RenderState = { preventRender: false };

    /**
     * Creates a function that is part of the main read-render loop.
     * It checks for valid data and will print errors in case of bad data or bad renders.
     * It calls the listener (reader) created earlier and adds itself as a callback to complete the loop.
     */
    reader.subscribe(generalErrorHandler(mod)(onChange));

    /**
     * The function that is part of the main read-render loop.
     * It checks for valid data and will print errors in case of bad data or bad renders.
     * It calls the listener (reader) created earlier and adds itself as a callback to complete the loop.
     * @param {Spotfire.DataView} dataView
     * @param {Spotfire.Size} windowSize
     */
    async function onChange(dataView: DataView, windowSize: Spotfire.Size) {
        let tasksHierarchy = await dataView.hierarchy("Task");

        let linksHierarchy = await dataView.hierarchy("Link");

        if (linksHierarchy!.levels.length > 1) {
            mod.controls.errorOverlay.show("Please only use one level on the Link axis.", "limitations");
            return;
        }

        mod.controls.errorOverlay.hide("limitations");

        let root = await tasksHierarchy?.root();

        let tasks = root?.leaves().map((leaf) => {
            let row = leaf.rows()[0];

            if (row) {
                return {
                    id: leaf.key,
                    mark: () => leaf.mark(),
                    text: leaf.formattedValue(),
                    start: row.continuous("start").value(),
                    end: row.continuous("end").value(),
                    percent: row.continuous("percent").value(),
                    links: linksHierarchy?.isEmpty
                        ? []
                        : leaf.rows().map((r) => {
                              return {
                                  target: r.categorical("Link").value()[0].key,
                                  type: "FS",
                              };
                          }),
                };
            }

            return {
                id: leaf.key,
                mark: () => leaf.mark(),
                text: leaf.formattedValue(),
                start: undefined,
                end: undefined,
                percent: 0,
                links: [],
            };
        });

        tasks?.sort((t1: any, t2: any) => t1.start - t2.start);

        renderGantt(tasks);
        context.signalRenderComplete();
        return;
    }
});

/**
 * subscribe callback wrapper with general error handling, row count check and an early return when the data has become invalid while fetching it.
 *
 * The only requirement is that the dataview is the first argument.
 * @param mod - The mod API, used to show error messages.
 * @param rowLimit - Optional row limit.
 */
export function generalErrorHandler<T extends (dataView: Spotfire.DataView, ...args: any) => any>(
    mod: Spotfire.Mod,
    rowLimit = 2000
): (a: T) => T {
    return function (callback: T) {
        return async function callbackWrapper(dataView: Spotfire.DataView, ...args: any) {
            try {
                const errors = await dataView.getErrors();
                if (errors.length > 0) {
                    mod.controls.errorOverlay.show(errors, "DataView");
                    return;
                }
                mod.controls.errorOverlay.hide("DataView");

                /**
                 * Hard abort if row count exceeds an arbitrary selected limit
                 */
                const rowCount = await dataView.rowCount();
                if (rowCount && rowCount > rowLimit) {
                    mod.controls.errorOverlay.show(
                        `☹️ Cannot render - too many rows (rowCount: ${rowCount}, limit: ${rowLimit}) `,
                        "General"
                    );
                    return;
                }

                /**
                 * User interaction while rows were fetched. Return early and respond to next subscribe callback.
                 */
                const allRows = await dataView.allRows();
                if (allRows == null) {
                    return;
                }

                await callback(dataView, ...args);

                mod.controls.errorOverlay.hide("General");
            } catch (e) {
                mod.controls.errorOverlay.show(
                    e.message || e || "☹️ Something went wrong, check developer console",
                    "General"
                );
                if (DEBUG) {
                    throw e;
                }
            }
        } as T;
    };
}

/**
 * Construct a data format suitable for consumption in d3.
 * @param mod The Mod API object
 * @param dataView The mod's DataView
 */
async function buildData(mod: Mod, dataView: DataView): Promise<Data> {
    const allRows = await dataView.allRows();

    const allYValues: Array<number> = allRows!.map((row) => row.continuous<number>("Y").value() || 0);
    const maxValue = Math.max(...allYValues);
    const minValue = Math.min(0, ...allYValues);

    const xHierarchy = await dataView.hierarchy("X");

    const colorLeaves = (await (await dataView.hierarchy("Color"))!.root())!.leaves();
    const xHierarchyLeaves = (await xHierarchy!.root())!.leaves();

    const xAxisData = xHierarchyLeaves.map((leaf) => leaf.formattedPath());

    const xAxisMeta = await mod.visualization.axis("X");
    const yAxisMeta = await mod.visualization.axis("Y");
    const colorAxisMeta = await mod.visualization.axis("Color");

    return {
        clearMarking: dataView.clearMarking,
        yDomain: { min: minValue, max: maxValue },
        xScale: xAxisData,
        series: buildColorSeries(
            colorLeaves,
            xHierarchyLeaves,
            !(xHierarchy?.isEmpty ?? true),
            createPointTooltip,
            minValue
        ),
    };

    function createPointTooltip(point: Point) {
        const separator = "\n";
        let colorValues = getFormattedValues(colorLeaves[point.index]);
        let xValues = getFormattedValues(xHierarchyLeaves[point.xIndex]);
        let yDisplayName = yAxisMeta.parts[0].displayName;

        if (yAxisMeta.parts.length > 1) {
            // Find the corresponding display name for the y axis value.
            let colorLevelForColumnNames = colorAxisMeta.parts.map((p) => p.expression).indexOf("[Axis.Default.Names]");
            let xLevelForColumnNames = xAxisMeta.parts.map((p) => p.expression).indexOf("[Axis.Default.Names]");
            if (colorLevelForColumnNames >= 0) {
                yDisplayName = colorValues[colorLevelForColumnNames];
            }

            if (xLevelForColumnNames >= 0) {
                yDisplayName = xValues[xLevelForColumnNames];
            }
        }

        return [
            createAxisTooltip(xAxisMeta.parts, xValues, separator) ||
                xAxisMeta.parts[0].displayName + ": " + xHierarchyLeaves[point.xIndex].formattedPath(),
            yDisplayName + ": " + point.Y_Formatted,
            colorAxisMeta.parts.length > 0
                ? createAxisTooltip(colorAxisMeta.parts, colorValues, separator) ||
                  colorAxisMeta.parts[0].displayName + ": " + colorLeaves[point.index].formattedPath()
                : "",
        ].join(separator);
    }

    function getFormattedValues(node: DataViewHierarchyNode) {
        let values: string[] = [];
        while (node.parent) {
            values.push(node.formattedValue());
            node = node.parent;
        }

        return values.reverse();
    }

    function createAxisTooltip(axisParts: AxisPart[], formattedValues: string[], separator: string) {
        return axisParts.length == formattedValues.length
            ? formattedValues.map((v, i) => axisParts[i].displayName + ": " + v).join(separator)
            : null;
    }
}
