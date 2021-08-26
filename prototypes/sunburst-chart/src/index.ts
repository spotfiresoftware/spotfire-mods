import { hierarchyAxisName, render } from "./sunburst";
import { Axis, DataView } from "spotfire-api";

window.Spotfire.initialize(async (mod) => {
    const context = mod.getRenderContext();

    const reader = mod.createReader(
        mod.visualization.data(),
        mod.windowSize(),
        mod.visualization.axis("Hierarchy"),
        mod.visualization.axis("Color"),
        mod.visualization.axis("Size")
    );

    reader.subscribe(
        generalErrorHandler(
            mod,
            10000
        )(async function onChange(
            dataView: DataView,
            windowSize: Spotfire.Size,
            hierarchyAxis: Axis,
            colorAxis: Axis,
            sizeAxis: Axis
        ) {
            const coloringFromLevel = getColoringLevel(colorAxis, hierarchyAxis);

            mod.controls.errorOverlay.hide("axis-configuration");

            let root = await (await dataView.hierarchy(hierarchyAxisName))?.root();

            const hasSize = !!sizeAxis.expression;

            await render(dataView, windowSize, root!, hasSize, coloringFromLevel);

            context.signalRenderComplete();
        })
    );
});

function getColoringLevel(colorAxis: Axis, hierarchyAxis: Axis) {
    let coloringFromLevel = 0;
    if (colorAxis.isCategorical) {
        if (colorAxis.parts.length > 1) {
            throw "The color axis can only be one level";
        }

        if (colorAxis.parts.length == 1) {
            coloringFromLevel = hierarchyAxis.parts.findIndex((p1) => colorAxis.parts[0].expression == p1.expression);
        }

        if (coloringFromLevel == -1) {
            throw "All expressions of the Color axis must also be part of the hierarchy axis";
        }
    }

    return coloringFromLevel;
}

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
                console.error(e);
            }
        } as T;
    };
}
