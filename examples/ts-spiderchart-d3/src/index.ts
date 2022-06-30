import { Data, Options, render } from "./render";
import { createLabelPopout } from "./popout";
import { buildColorSeries, Point } from "./series";
import { DataView, Mod, ModProperty } from "spotfire-api";
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
    const reader = mod.createReader(
        mod.visualization.data(),
        mod.windowSize(),
        mod.property<string>("curveType"),
        mod.property<boolean>("xLabelsRotation"),
        mod.property<boolean>("yAxisNormalization"),
        mod.property<boolean>("enableColorFill")
    );

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
     * @param {ModProperty<string>} curveType
     * @param {ModProperty<boolean>} xLabelsRotation
     * @param {ModProperty<boolean>} yAxisNormalization
     * @param {ModProperty<boolean>} enableColorFill
     */
    async function onChange(
        dataView: DataView,
        windowSize: Spotfire.Size,
        curveType: ModProperty<string>,
        xLabelsRotation: ModProperty<boolean>,
        yAxisNormalization: ModProperty<boolean>,
        enableColorFill: ModProperty<boolean>
    ) {
        let data = await buildData(mod, dataView);

        var popoutClosedEventEmitter = new events.EventEmitter();

        const config: Partial<Options> = {
            curveType: curveType.value()!,
            xLabelsRotation: xLabelsRotation.value()!,
            yAxisNormalization: yAxisNormalization.value()!,
            enableColorFill: enableColorFill.value()!,
            onLabelClick: context.isEditing
                ? createLabelPopout(
                      mod.controls,
                      curveType,
                      xLabelsRotation,
                      yAxisNormalization,
                      enableColorFill,
                      popoutClosedEventEmitter
                  )
                : null,
            labelOffset: context.styling.scales.font.fontSize * 2
        };

        await render(
            state,
            data,
            windowSize,
            config,
            {
                scales: context.styling.scales.font,
                stroke: context.styling.scales.line.stroke
            },
            mod.controls.tooltip,
            popoutClosedEventEmitter
        );

        context.signalRenderComplete();
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
            } catch (e: any) {
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
        )
    };

    function createPointTooltip(point: Point) {
        return point.tooltip();
    }
}
