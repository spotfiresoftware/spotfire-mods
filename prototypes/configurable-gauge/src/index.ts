import * as d3 from "d3";
import { render, Gauge } from "./render";
import { DataView, ModProperty } from "spotfire-api";

const Spotfire = window.Spotfire;
const DEBUG = true;

Spotfire.initialize(async (mod) => {
    const context = mod.getRenderContext();

    /**
     * Create reader function which is actually a one time listener for the provided values.
     */
    const reader = mod.createReader(
        mod.visualization.data(),
        mod.windowSize(),
        mod.property<number>("gaugeMax"),
        mod.property<number>("gaugeWidth")
    );

    /**
     * Creates a function that is part of the main read-render loop.
     * It checks for valid data and will print errors in case of bad data or bad renders.
     * It calls the listener (reader) created earlier and adds itself as a callback to complete the loop.
     */
    reader.subscribe(generalErrorHandler(mod)(onChange), (err) => {
        mod.controls.errorOverlay.show(err);
    });

    /**
     * The function that is part of the main read-render loop.
     * It checks for valid data and will print errors in case of bad data or bad renders.
     * It calls the listener (reader) created earlier and adds itself as a callback to complete the loop.
     * @param {DataView} dataView
     * @param {Size} windowSize
     * @param {ModProperty} maxProp
     * @param {ModProperty} widthProp
     */
    async function onChange(
        dataView: DataView,
        windowSize: Spotfire.Size,
        maxProp: ModProperty<number>,
        widthProp: ModProperty<number>
    ) {
        mod.controls.errorOverlay.hide();
        let colorRoot = await (await dataView.hierarchy("Color"))?.root();

        let gauges: Gauge[] = colorRoot!.rows().map((row) => ({
            label: row.categorical("X").formattedValue(),
            formattedValue: row.continuous("Y").formattedValue(),
            color: row.color().hexCode,
            key: row.elementId(),
            mark: () => {
                if (d3.event.ctrlKey) {
                    row.mark("ToggleOrAdd");
                } else {
                    row.mark();
                }
            },
            percent: (row.continuous("Y").value<number>() || 0) / (maxProp.value() || 0),
            value: row.continuous("Y").value<number>() || 0
        }));

        render(gauges, {
            click(d) {
                if (d) {
                    d.mark();
                } else {
                    dataView.clearMarking();
                }
            },
            size: windowSize,
            maxValue: maxProp.value() || 0,
            gaugeWidth: widthProp.value() || 20,
            animationSpeed: 250,
            style: {
                marking: { color: context.styling.scales.font.color },
                background: { color: context.styling.general.backgroundColor },
                value: {
                    fontFamily: context.styling.general.font.fontFamily,
                    color: context.styling.general.font.color,
                    size: parseInt("" + context.styling.general.font.fontSize),
                    style: context.styling.general.font.fontStyle,
                    weight: context.styling.general.font.fontWeight
                },
                label: {
                    fontFamily: context.styling.scales.font.fontFamily,
                    color: context.styling.scales.font.color,
                    size: parseInt("" + context.styling.scales.font.fontSize),
                    style: context.styling.scales.font.fontStyle,
                    weight: context.styling.scales.font.fontWeight
                }
            }
        });

        let settingsIcon = document.querySelector(".settings") as HTMLDivElement;
        let settingsArea = document.querySelector(".settings-area") as HTMLDivElement;
        let maxValueInput = document.querySelector("#gaugeMax") as HTMLInputElement;
        let widthRangeSlider = document.querySelector("#width") as HTMLInputElement;

        settingsIcon?.classList.toggle("hidden", !context.isEditing);

        let currentFocus = document.querySelector(":focus");
        if (currentFocus != maxValueInput) {
            maxValueInput.value = "" + maxProp.value();
        }

        if (currentFocus != widthRangeSlider) {
            widthRangeSlider.value = "" + widthProp.value();
        }

        settingsIcon.onclick = () => {
            settingsArea.classList.toggle("hidden");
            maxValueInput.onchange = () => {
                if (!maxValueInput.value) {
                    return;
                }

                maxProp.set(parseInt(maxValueInput.value) || maxProp.value() || 0);
            };

            maxValueInput.onblur = (e) => {
                settingsArea.classList.add("hidden");
            };

            widthRangeSlider.onchange = () => {
                widthProp.set(parseInt(widthRangeSlider.value) || widthProp.value() || 0);
            };

            widthRangeSlider.onblur = (e) => {
                settingsArea.classList.add("hidden");
            };
        };

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
