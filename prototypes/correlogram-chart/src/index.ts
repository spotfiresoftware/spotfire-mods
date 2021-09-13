import { Axis, DataView, ModProperty } from "spotfire-api";
import { generalErrorHandler } from "./generalErrorHandler";
import { interactionLock } from "./interactionLock";
import { render, PairPlotData } from "./correlogram";

const markerByAxisName = "MarkerBy";
const measureNamesAxisName = "MeasureNames";
const countAxisName = "Count";
const diagonalPropertyName = "Diagonal";
const colorAxisName = "Color";
const measureAxisName = "Measures";

type Diagonal = "measure-name" | "histogram" | "line" | "statistics" | "box-plot";

window.Spotfire.initialize(async (mod) => {
    const context = mod.getRenderContext();

    const reader = mod.createReader(
        mod.visualization.data(),
        mod.property(diagonalPropertyName),
        mod.visualization.axis(measureAxisName),
        mod.visualization.axis(measureNamesAxisName),
        mod.visualization.axis(countAxisName),
        mod.visualization.axis(colorAxisName),
        mod.windowSize()
    );

    let interaction = interactionLock();
    reader.subscribe(onChange);

    async function onChange(
        dataView: DataView,
        diagonalProperty: ModProperty<Diagonal>,
        measureAxis: Axis,
        measureNamesAxis: Axis,
        countAxis: Axis,
        colorAxis: Axis
    ) {
        if (measureAxis.parts.length < 2) {
            mod.controls.errorOverlay.show("Select two or more measures.", "Measures");
            return;
        }

        mod.controls.errorOverlay.hide("Measures");

        if (
            (measureAxis.parts.length > 1 && measureNamesAxis.expression != "<[Axis.Default.Names]>") ||
            (diagonalProperty.value() != "measure-name" && countAxis.expression != "Count()")
        ) {
            resetMandatoryExpressions();
            return;
        }

        if (colorAxis.isCategorical && colorAxis.parts.find((p) => p.expression.includes("[Axis.Default.Names]"))) {
            mod.controls.errorOverlay.show(
                "'(Column Names)' is invalid as color expression since this will yield multi colored markers.",
                "color"
            );
            return;
        }

        mod.controls.errorOverlay.hide("color");

        const measures = (await (await dataView.hierarchy(measureNamesAxisName))!.root())?.leaves();
        const columnNamesLeafIndices = measures?.map((l) => l.leafIndex) || [];
        const rows = await dataView.allRows();
        if (!measures || !rows) {
            return;
        }

        var measureCount = columnNamesLeafIndices.length;
        var markerCount = rows.length / measureCount;

        const colors = rows.slice(0, markerCount).map((r) => r.color().hexCode);
        const count = null;countAxis.expression ? rows.slice(0, markerCount).map((r) => r.continuous(countAxisName).value() as number) : null;
        const points = transpose<number>(
            createChunks(
                rows.map((r) => r.continuous(measureAxisName).value()),
                markerCount
            )
        );

        var data: PairPlotData = {
            measures: measures.map((m) => m.formattedValue()),
            points,
            colors,
            count,
            mark: (index: number) => rows![index].mark()
        };

        render(data);
        context.signalRenderComplete();
    }

    function transpose<T>(m: T[][]) {
        return m[0].map((_, i) => m.map((x) => x[i]));
    }

    function createChunks(arr: any[], chunkSize: number) {
        var results = [];
        while (arr.length) {
            results.push(arr.splice(0, chunkSize));
        }

        return results;
    }

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
