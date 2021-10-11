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
        mod.property<number>("gaugeMin"),
        mod.property<number>("gaugeMax"),
        mod.property<number>("gaugeWidth"),
        mod.property<number>("gaugeOpacity"),
        mod.property<boolean>("showPercent")
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
     * @param dataView
     * @param windowSize
     * @param minProp
     * @param maxProp
     * @param widthProp
     * @param opacityProp
     * @param showPercent
     */
    async function onChange(
        dataView: DataView,
        windowSize: Spotfire.Size,
        minProp: ModProperty<number>,
        maxProp: ModProperty<number>,
        widthProp: ModProperty<number>,
        opacityProp: ModProperty<number>,
        showPercent: ModProperty<boolean>
    ) {
        mod.controls.errorOverlay.hide();
        let colorRoot = await (await dataView.hierarchy("Color"))?.root();

        let gauges: Gauge[] = colorRoot!.rows().map((row) => {
            const percent =
                ((row.continuous("Y").value<number>() || 0) - minProp.value()!) / (maxProp.value()! - minProp.value()!);
            const formattedValue = showPercent.value()
                ? `${(percent * 100).toPrecision(3)}%`
                : row.continuous("Y").formattedValue();

            return {
                label: row.categorical("X").formattedValue(),
                formattedValue,
                color: row.color().hexCode,
                key: row.elementId(),
                mark: () => {
                    if (d3.event.ctrlKey) {
                        row.mark("ToggleOrAdd");
                    } else {
                        row.mark();
                    }
                },
                mouseOver() {
                    mod.controls.tooltip.show(row);
                },
                percent
            } as Gauge;
        });

        render(gauges, {
            click(d) {
                if (d) {
                    d.mark();
                } else {
                    dataView.clearMarking();
                }
            },
            mouseLeave() {
                mod.controls.tooltip.hide();
            },
            size: windowSize,
            minValue: minProp.value()!,
            maxValue: maxProp.value()!,
            gaugeWidth: widthProp.value() || 20,
            animationSpeed: 250,
            style: {
                gauge: {
                    backgroundOpacity: opacityProp.value()!,
                    background: context.styling.scales.line.stroke
                },
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

        let minValueInput = document.querySelector("#gaugeMin") as HTMLInputElement;
        let maxValueInput = document.querySelector("#gaugeMax") as HTMLInputElement;
        let widthRangeSlider = document.querySelector("#width") as HTMLInputElement;
        let gaugeOpacitySlider = document.querySelector("#gaugeOpacity") as HTMLInputElement;
        let showPercentCheckbox = document.querySelector("#showPercent") as HTMLInputElement;

        settingsIcon?.classList.toggle("hidden", !context.isEditing);

        let currentFocus = document.querySelector(":focus");

        if (currentFocus != maxValueInput) {
            minValueInput.value = "" + minProp.value();
        }

        if (currentFocus != maxValueInput) {
            maxValueInput.value = "" + maxProp.value();
        }

        if (currentFocus != widthRangeSlider) {
            widthRangeSlider.value = "" + widthProp.value();
        }

        if (currentFocus != widthRangeSlider) {
            gaugeOpacitySlider.value = "" + opacityProp.value();
        }

        if (currentFocus != showPercentCheckbox) {
            showPercentCheckbox.checked = showPercent.value()!;
        }

        settingsArea.onclick = () => {
            settingsArea.classList.remove("tucked-away");
        };

        settingsIcon.onclick = () => {
            settingsArea.classList.toggle("tucked-away");
            minValueInput.onchange = () => {
                if (!minValueInput.value.length) {
                    return;
                }

                minProp.set(parseInt(minValueInput.value) ?? minProp.value() ?? 0);
            };

            maxValueInput.onchange = () => {
                if (!maxValueInput.value.length) {
                    return;
                }

                maxProp.set(parseInt(maxValueInput.value) ?? maxProp.value() ?? 0);
            };

            maxValueInput.onblur = (e) => {
                settingsArea.classList.add("tucked-away");
            };

            widthRangeSlider.onchange = () => {
                widthProp.set(parseInt(widthRangeSlider.value));
            };

            gaugeOpacitySlider.onchange = () => {
                opacityProp.set(parseInt(gaugeOpacitySlider.value) || 0);
            };

            showPercentCheckbox.onchange = () => {
                showPercent.set(showPercentCheckbox.checked);
            };

            widthRangeSlider.onblur = (e) => {
                settingsArea.classList.add("tucked-away");
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
