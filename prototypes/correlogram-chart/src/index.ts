import { Axis, DataView } from "spotfire-api";
import { generalErrorHandler } from "./generalErrorHandler";
import { interactionLock } from "./interactionLock";
import { render, PairPlotData } from "./correlogram";

const markerByAxisName = "MarkerBy";
const measureNamesAxisName = "MeasureNames";
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

    async function onChange(
        dataView: DataView,
        measureAxis: Axis,
        measureNamesAxis: Axis
    ) {
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
        if (error.find(e => e.includes("basetrowid")))
        {
            showIdentifierSelection();
            return;
        }

        mod.controls.errorOverlay.hide("MeasureNames");

        const measures = (await (await dataView.hierarchy(measureNamesAxisName))!.root())?.leaves();
        const columnNamesLeafIndices = measures?.map((l) => l.leafIndex) || [];
        var rows = await dataView.allRows();
        if (!measures || !rows) {
            return;
        }

        var points: (number | null)[][] = [];
        var colors: string[] = [];
        var measureCount = columnNamesLeafIndices.length;
        for (var i = 0; i < rows.length; i += measureCount) {
            points.push(rows.slice(i, i + measureCount).map((r) => r.continuous(measureAxisName).value()));
            colors.push(rows[i].color().hexCode)
        }

        var data: PairPlotData = {
            measures: measures.map((m) => m.formattedValue()),
            points,
            colors,
            mark: (index: number) => rows![index * measureCount].mark()
        };

        render(data);
        context.signalRenderComplete();
    }

    function showMeasureSelection()
    {

    }

    function showIdentifierSelection()
    {

    }

    function resetMandatoryExpressions()
    {
        const div = document.getElementById("resetMandatoryExpressions")!;
        div.style.display = "block"
        div.querySelector("button")?.addEventListener("click", () => {
            div.style.display = "none";
            mod.visualization.axis(measureNamesAxisName).setExpression("<[Axis.Default.Names]>");

        })

    }
});
