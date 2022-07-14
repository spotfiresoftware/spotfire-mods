import { createCanvases, Point, render } from "./smithChart";
import { DataView, ModProperty } from "spotfire-api";
import { generalErrorHandler } from "./generalErrorHandler";
import { renderSettings } from "./settings";
import { resources } from "./resources";

const Spotfire = window.Spotfire;

Spotfire.initialize(async (mod) => {
    const context = mod.getRenderContext();

    const canvas = createCanvases(document.querySelector("#mod-container")!);

    const pointAxisName = "Point";
    const colorAxisName = "Color";
    const rRealAxisName = "rReal";
    const rImaginaryAxisName = "rImaginary";

    const reader = mod.createReader(
        mod.visualization.data(),
        mod.windowSize(),
        mod.property("gridDensity"),
        mod.property("extras"),
        mod.property("outerScales"),
        mod.property("innerScales"),
        mod.property("zoom"),
        mod.property("xCoord"),
        mod.property("yCoord")
    );

    reader.subscribe(generalErrorHandler(mod, 40000)(onChange), (err) => {
        mod.controls.errorOverlay.show(err);
    });

    async function onChange(
        dataView: DataView,
        windowSize: Spotfire.Size,
        densityProp: ModProperty<number>,
        extrasProp: ModProperty<boolean>,
        outerScalesProp: ModProperty<boolean>,
        innerScalesProp: ModProperty<boolean>,
        zoomProp: ModProperty<number>,
        xCoordProp: ModProperty<number>,
        yCoordProp: ModProperty<number>
    ) {

        mod.controls.errorOverlay.hide();
        let colorRoot = await (await dataView.hierarchy(colorAxisName))?.root();

        let warnings: string[] = [];

        let points: Point[] = colorRoot!.rows().map((row) => {
            // TODO Add warning for invalid numbers.
            return {
                color: row.color().hexCode,
                label: row.categorical(pointAxisName).formattedValue(),
                r: [row.continuous(rRealAxisName).value<number>(), row.continuous(rImaginaryAxisName).value<number>()],
                isMarked: row.isMarked(),
                mark: (toggle: boolean) => {
                    row.mark(toggle ? "ToggleOrAdd" : "Replace");
                },
                tooltip() {
                    mod.controls.tooltip.show(row.categorical(pointAxisName).formattedValue());
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
                canvas,
                size: windowSize,
                gridDensity: densityProp.value()!,
                showExtras: extrasProp.value()!,
                showOuterScales: outerScalesProp.value()!,
                showInnerScales : innerScalesProp.value()!,
                zoom : zoomProp,
                xCoord: xCoordProp,
                yCoord: yCoordProp,
                clearMarking: dataView.clearMarking,
                mouseLeave: () => mod.controls.tooltip.hide()
            },
            points
        );

        if (context.isEditing) {
            renderSettings([
                { label: resources.gridDensity, type: "range", property: densityProp, max: 20, min: 0, step: 1 },
                { label: resources.extras, type: "checkbox", property: extrasProp },
                { label: resources.outerScales, type: "checkbox", property: outerScalesProp},
                { label: resources.innerScales, type: "checkbox", property: innerScalesProp},
                { label: resources.xCoord, type: "range", property: xCoordProp, max: 100, min: -100, step: 1 },
                { label: resources.yCoord, type: "range", property: yCoordProp, max: 100, min: -100, step: 1 },
                { label: resources.zoom, type: "range", property: zoomProp, max: 400, min: 0, step: 20 }
            ]);
        }

        context.signalRenderComplete();
    }
});
