import * as d3 from "d3";
import { Point, render, setup } from "./smithChart";
import { DataView, ModProperty } from "spotfire-api";
import { generalErrorHandler } from "./generalErrorHandler";
import { renderSettings } from "./settings";
import { resources } from "./resources";

const Spotfire = window.Spotfire;

Spotfire.initialize(async (mod) => {
    const context = mod.getRenderContext();

    const svg = d3.select("#mod-container").append("svg").attr("xmlns", "http://www.w3.org/2000/svg").call(setup);

    const pointAxisName = "Point";
    const colorAxisName = "Color";
    const rRealAxisName = "rReal";
    const rImaginaryAxisName = "rImaginary";

    const reader = mod.createReader(mod.visualization.data(), mod.windowSize(), mod.property("gridDensity"));

    reader.subscribe(generalErrorHandler(mod)(onChange), (err) => {
        mod.controls.errorOverlay.show(err);
    });

    async function onChange(dataView: DataView, windowSize: Spotfire.Size, densityProp: ModProperty<number>) {
        mod.controls.errorOverlay.hide();
        let colorRoot = await (await dataView.hierarchy(colorAxisName))?.root();

        let warnings: string[] = [];

        let points: Point[] = colorRoot!.rows().map((row) => {
            // TODO Add warning for invalid numbers.
            return {
                color: row.color().hexCode,
                label: row.categorical(pointAxisName).formattedValue(),
                r: [row.continuous(rRealAxisName).value<number>(), row.continuous(rImaginaryAxisName).value<number>()],
                mark: () => {
                    row.mark();
                },
                mouseOver() {
                    mod.controls.tooltip.show(row);
                }
            } as Point;
        });

        if (warnings.length) {
            mod.controls.errorOverlay.show(warnings, "warnings");
        } else {
            mod.controls.errorOverlay.hide("warnings");
        }

        render(
            {
                svg,
                size: windowSize,
                gridDensity: densityProp.value()!,
                clearMarking: dataView.clearMarking
            },
            points
        );

        if (context.isEditing) {
            renderSettings([
                { label: resources.gridDensity, type: "range", property: densityProp, max: 20, min: 0, step: 1 }
            ]);
        }

        context.signalRenderComplete();
    }
});
