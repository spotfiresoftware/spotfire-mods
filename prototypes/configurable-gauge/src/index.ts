import * as d3 from "d3";
import { render, Gauge } from "./render";
import { DataView, ModProperty } from "spotfire-api";
import { renderSettings } from "./settings";

const Spotfire = window.Spotfire;
const DEBUG = true;

Spotfire.initialize(async (mod) => {
    const context = mod.getRenderContext();

    const reader = mod.createReader(
        mod.visualization.data(),
        mod.windowSize(),
        mod.property<number>("gaugeWidth"),
        mod.property<number>("gaugeOpacity"),
        mod.property<number>("ticksOpacity"),
        mod.property<boolean>("showPercent"),
        mod.property<boolean>("showMinMax"),
        mod.property<boolean>("showShake")
    );

    reader.subscribe(generalErrorHandler(mod)(onChange), (err) => {
        mod.controls.errorOverlay.show(err);
    });

    async function onChange(
        dataView: DataView,
        windowSize: Spotfire.Size,
        widthProp: ModProperty<number>,
        opacityProp: ModProperty<number>,
        ticksOpacityProp: ModProperty<number>,
        showPercent: ModProperty<boolean>,
        showMinMax: ModProperty<boolean>,
        showShake: ModProperty<boolean>
    ) {
        mod.controls.errorOverlay.hide();
        let colorRoot = await (await dataView.hierarchy("Color"))?.root();

        let maxValue = colorRoot!.rows().reduce((p, r) => Math.max(p, r.continuous("Max").value() || 0), 0);

        let gauges: Gauge[] = colorRoot!.rows().map((row) => {
            let min = row.continuous("Min").value<number>() || 0;
            let max = row.continuous("Max").value<number>() || maxValue;
            let value = row.continuous("Value").value<number>() || 0;

            const percent = (value - min) / (max - min);
            const formattedValue = showPercent.value()
                ? `${(percent * 100).toPrecision(3)}%`
                : row.continuous("Value").formattedValue();

            return {
                label: row.categorical("Gauge").formattedValue(),
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
                percent,
                minLabel: row.continuous("Min").formattedValue(),
                maxLabel: row.continuous("Max").formattedValue()
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
            showMinMax: showMinMax.value()!,
            showShake: showShake.value()!,
            gaugeWidth: widthProp.value() || 20,
            animationSpeed: 250,
            style: {
                gauge: {
                    backgroundOpacity: opacityProp.value()!,
                    background: context.styling.scales.line.stroke
                },
                ticks: {
                    backgroundOpacity: ticksOpacityProp.value()!,
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

        if (context.isEditing) {
            renderSettings([
                { label: "Arc width:", type: "range", property: widthProp, max: 100, min: 2, step: 2 },
                { label: "Background opacity:", type: "range", property: opacityProp, max: 100, min: 0, step: 2 },
                { label: "Scale ticks opacity:", type: "range", property: ticksOpacityProp, max: 100, min: 0, step: 2 },
                { label: "Show percent:", type: "checkbox", property: showPercent },
                { label: "Show min and max:", type: "checkbox", property: showMinMax },
                { label: "Shake when full:", type: "checkbox", property: showShake }
            ]);
        }

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
