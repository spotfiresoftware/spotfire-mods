import * as d3 from "d3";
import { render, Gauge } from "./gauge";
import { DataView, ModProperty } from "spotfire-api";
import { renderSettings } from "./settings";
import { resources } from "./resources";

const Spotfire = window.Spotfire;

Spotfire.initialize(async (mod) => {
    const context = mod.getRenderContext();

    const svg = d3.select("#mod-container").append("svg").attr("xmlns", "http://www.w3.org/2000/svg");

    const gaugeAxisName = "Gauge";
    const minAxisName = "Min";
    const maxAxisName = "Max";
    const valueAxisName = "Value";
    const colorAxisName = "Color";

    const reader = mod.createReader(
        mod.visualization.data(),
        mod.windowSize(),
        mod.visualization.axis(gaugeAxisName),
        mod.visualization.axis(colorAxisName),
        mod.visualization.axis(valueAxisName),
        mod.visualization.axis(minAxisName),
        mod.visualization.axis(maxAxisName),
        mod.property<number>("gaugeWidth"),
        mod.property<number>("gaugeAngle"),
        mod.property<number>("gaugeOpacity"),
        mod.property<number>("ticksOpacity"),
        mod.property<boolean>("showPercent"),
        mod.property<boolean>("showMinMax")
    );

    reader.subscribe(generalErrorHandler(mod)(onChange), (err) => {
        mod.controls.errorOverlay.show(err);
    });

    async function onChange(
        dataView: DataView,
        windowSize: Spotfire.Size,
        gaugeAxis: Spotfire.Axis,
        colorAxis: Spotfire.Axis,
        valueAxis: Spotfire.Axis,
        minAxis: Spotfire.Axis,
        maxAxis: Spotfire.Axis,
        widthProp: ModProperty<number>,
        gaugeAngle: ModProperty<number>,
        opacityProp: ModProperty<number>,
        ticksOpacityProp: ModProperty<number>,
        showPercent: ModProperty<boolean>,
        showMinMax: ModProperty<boolean>
    ) {
        mod.controls.errorOverlay.hide();
        let colorRoot = await (await dataView.hierarchy(colorAxisName))?.root();

        let maxValue = colorRoot!
            .rows()
            .reduce(
                (p, r) => Math.max(p, r.continuous(maxAxis.parts.length ? maxAxisName : valueAxisName).value() || 0),
                0
            );

        let warnings: string[] = [];

        let gauges: Gauge[] = colorRoot!.rows().map((row) => {
            let label: string;
            if (!gaugeAxis.parts.length && !colorAxis.parts.length) {
                label = valueAxis.parts.map((p) => p.displayName).join(" ");
            } else {
                label = row.categorical(gaugeAxis.parts.length ? gaugeAxisName : colorAxisName).formattedValue();
            }

            const minLabel = minAxis.parts.length ? row.continuous(minAxisName).formattedValue() : "0";
            const maxLabel = maxAxis.parts.length ? row.continuous(maxAxisName).formattedValue() : maxValue;

            let min = minAxis.parts.length ? row.continuous(minAxisName).value<number>() || 0 : 0;
            let max = maxAxis.parts.length ? row.continuous(maxAxisName).value<number>() || 0 : maxValue;
            let value = valueAxis.parts.length ? row.continuous(valueAxisName).value<number>() || 0 : 0;

            if (min > max) {
                warnings.push(resources.warningMinGreaterThanMax(label, minLabel, maxLabel));
            }

            if (min == max) {
                warnings.push(resources.warningMinEqualToMax(label, minLabel, maxLabel));
            }

            const percent = (value - min) / (max - min);
            const formattedValue = showPercent.value()
                ? `${parseFloat((percent * 100).toPrecision(3))}%`
                : valueAxis.parts.length
                ? row.continuous(valueAxisName).formattedValue()
                : 0;

            return {
                label,
                minLabel: minLabel,
                maxLabel: maxLabel,
                percent,
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
                }
            } as Gauge;
        });

        if (warnings.length) {
            mod.controls.errorOverlay.show(warnings, "warnings");
        } else {
            mod.controls.errorOverlay.hide("warnings");
        }

        render(gauges, {
            svg,
            clearMarking() {
                dataView.clearMarking();
            },
            mouseLeave() {
                mod.controls.tooltip.hide();
            },
            size: windowSize,
            padAngle: gaugeAngle.value()!,
            showMinMax: showMinMax.value()!,
            arcWidth: widthProp.value() || 20,
            animationSpeed: context.interactive ? 250 : 0,
            style: {
                gauge: {
                    backgroundOpacity: opacityProp.value()!,
                    background: context.styling.scales.line.stroke
                },
                ticks: {
                    backgroundOpacity: ticksOpacityProp.value()!,
                    background: context.styling.scales.tick.stroke
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
                { label: resources.settingArcWidth, type: "range", property: widthProp, max: 100, min: 2, step: 2 },
                { label: resources.settingAngle, type: "range", property: gaugeAngle, max: 90, min: 0, step: 2 },
                {
                    label: resources.settingsBackgroundOpacity,
                    type: "range",
                    property: opacityProp,
                    max: 100,
                    min: 0,
                    step: 2
                },
                {
                    label: resources.settingsScaleTicksOpacity,
                    type: "range",
                    property: ticksOpacityProp,
                    max: 100,
                    min: 0,
                    step: 2
                },
                { label: resources.settingsShowPercent, type: "checkbox", property: showPercent },
                { label: resources.settingsShowMinMax, type: "checkbox", property: showMinMax }
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

                console.error(e);
            }
        } as T;
    };
}
