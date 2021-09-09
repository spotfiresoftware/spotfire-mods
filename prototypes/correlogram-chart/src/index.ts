import { Axis, DataView } from "spotfire-api";
import { generalErrorHandler } from "./generalErrorHandler";
import { interactionLock } from "./interactionLock";
import { render, PairPlotData } from "./correlogram";

const markerByAxisName = "MarkerBy";
const measureNamesAxisName = "MeasureNames";
const countAxisName = "Count";
const colorAxisName = "Color";
const measureAxisName = "Measures";

enum InteractionMode {
    drilldown = "drilldown",
    mark = "mark"
}

window.Spotfire.initialize(async (mod) => {
    const context = mod.getRenderContext();

    const reader = mod.createReader(
        mod.visualization.data(),
        mod.visualization.axis(measureAxisName),
        mod.visualization.axis(measureNamesAxisName),
        mod.windowSize(),
        mod.visualization.axis(markerByAxisName),
        mod.visualization.axis(colorAxisName)
    );

    let interaction = interactionLock();
    reader.subscribe(onChange);

    async function onChange(dataView: DataView, measureAxis: Axis, measureNamesAxis: Axis) {
        if (measureAxis.parts.length < 2) {
            mod.controls.errorOverlay.show("Select two or more measures.", "Measures");
            return;
        }

        mod.controls.errorOverlay.hide("Measures");

        if (measureAxis.parts.length > 1 && measureNamesAxis.expression != "<[Axis.Default.Names]>") {
            resetMandatoryExpressions();
            return;
        }

        let error = await dataView.getErrors();
        if (error.find((e) => e.includes("baserowid"))) {
            showIdentifierSelection();
            return;
        }

        mod.controls.errorOverlay.hide("MeasureNames");

        const measures = (await (await dataView.hierarchy(measureNamesAxisName))!.root())?.leaves();
        const columnNamesLeafIndices = measures?.map((l) => l.leafIndex) || [];
        const rows = await dataView.allRows();
        if (!measures || !rows) {
            return;
        }

        var measureCount = columnNamesLeafIndices.length;
        var valueCount = rows.length / measureCount;
        const points = transpose(
            chunkArray(
                rows.map((r) => r.continuous(measureAxisName).value()),
                valueCount
            )
        );

        // TODO Warn about column names on color.
        // This is not possible since two different measures are combined into one element!
        const colors = rows.slice(0, valueCount).map((r) => r.color().hexCode);

        var data: PairPlotData = {
            measures: measures.map((m) => m.formattedValue()),
            points,
            colors,
            mark: (index: number) => rows![index].mark()
        };

        render(data);
        context.signalRenderComplete();
    }
    function transpose(m: number[][]) {
        return m[0].map((x, i) => m.map((x) => x[i]));
    }
    function chunkArray(arr: any[], size: number) {
        var results = [];
        while (arr.length) {
            results.push(arr.splice(0, size));
        }

        return results;
    }
    function showMeasureSelection() {}

    function showIdentifierSelection() {}

    function resetMandatoryExpressions() {
        const div = document.getElementById("resetMandatoryExpressions")!;
        div.style.display = "block";
        div.querySelector("button")?.addEventListener("click", () => {
            div.style.display = "none";
            mod.visualization.axis(measureNamesAxisName).setExpression("<[Axis.Default.Names]>");
            mod.visualization.axis(countAxisName).setExpression("Count()");
        });
    }
});
