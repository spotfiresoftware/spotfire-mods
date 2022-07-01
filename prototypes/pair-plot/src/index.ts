import { Axis, DataView, Mod, ModProperty, Size } from "spotfire-api";
import { render, PairPlotData } from "./pair-plot";
import { ManifestConst, resources, CellContent } from "./resources";
import { createSettingsButton } from "./settings";

export function createTimerLog() {
    let times = [{ desc: "start", t: Date.now() }];
    return {
        add: (desc: string) => times.push({ desc, t: Date.now() }),
        log: () => {
            times.forEach((_, i) => {
                if (i > 0) {
                    console.log(times[i].desc, times[i].t - times[i - 1].t, "ms");
                }
            });

            console.log("Total", times[times.length - 1].t - times[0].t, "ms");
        }
    };
}

function getSelectValues(select) {
    var result = [];
    var options = select && select.options;
    var opt;
  
    for (var i=0, iLen=options.length; i<iLen; i++) {
      opt = options[i];
  
      if (opt.selected) {
        result.push(opt.value || opt.text);
      }
    }
    return result;
  }

window.Spotfire.initialize(async (mod) => {
    const context = mod.getRenderContext();

    document.querySelector("#resetMandatoryExpressions button")!.addEventListener("click", () => {
        const columns = getSelectValues(document.querySelector("select#columns"));
        document.querySelector("#resetMandatoryExpressions")!.classList.toggle("hidden", true);
        mod.visualization.axis(ManifestConst.ColumnNamesAxis).setExpression("<[Axis.Default.Names]>");
        mod.visualization.axis(ManifestConst.CountAxis).setExpression("Count()");
        mod.visualization.axis(ManifestConst.MeasureAxis).setExpression(columns.map(name => `[${name}]`).join(","));
    });

    const reader = mod.createReader(
        mod.visualization.data(),
        mod.property(ManifestConst.Diagonal),
        mod.property(ManifestConst.Upper),
        mod.property(ManifestConst.Lower),
        mod.visualization.axis(ManifestConst.MeasureAxis),
        mod.visualization.axis(ManifestConst.ColumnNamesAxis),
        mod.visualization.axis(ManifestConst.CountAxis),
        mod.visualization.axis(ManifestConst.ColorAxis),
        mod.windowSize()
    );

    reader.subscribe(onChange);

    async function onChange(
        dataView: DataView,
        diagonalContent: ModProperty<CellContent>,
        upperContent: ModProperty<CellContent>,
        lowerContent: ModProperty<CellContent>,
        measureAxis: Axis,
        measureNamesAxis: Axis,
        countAxis: Axis,
        colorAxis: Axis,
        size: Size
    ) {
        let timerLog = createTimerLog();
        // if (measureAxis.parts.length < 2) {
        //     mod.controls.errorOverlay.show("Select two or more measures.", "Measures");
        //     return;
        // }

        // mod.controls.errorOverlay.hide("Measures");

        if (colorAxis.isCategorical && colorAxis.parts.find((p) => p.expression.includes("[Axis.Default.Names]"))) {
            mod.controls.errorOverlay.show(
                "'(Column Names)' is invalid as color expression since this will yield multi colored markers.",
                "color"
            );
            return;
        }

        mod.controls.errorOverlay.hide("color");

        // Ideally would these axes expressions be set by the manifest.
        const showConfigError =
            measureAxis.parts.length < 2 ||
            (measureAxis.parts.length > 1 && measureNamesAxis.expression != "<[Axis.Default.Names]>") ||
            countAxis.expression.toLowerCase() != "count()";

        document.getElementById("resetMandatoryExpressions")!.classList.toggle("hidden", !showConfigError);
        document.getElementById("content")!.classList.toggle("hidden", showConfigError);

        if (showConfigError) {
            let columnsSelect = document.querySelector("select#columns");
            let columns = await (
                await (await mod.visualization.mainTable()).columns()
            ).filter((c) => c.dataType.isNumber());
            columns.forEach((c) => {
                const option = document.createElement("option");
                option.value = c.name;
                option.text = c.name;
                columnsSelect?.appendChild(option);
            });


            return;
        }

        const measures = (await (await dataView.hierarchy(ManifestConst.ColumnNamesAxis))!.root())?.leaves();
        const columnNamesLeafIndices = measures?.map((l) => l.leafIndex) || [];
        const rows = await dataView.allRows();
        if (!measures || rows == null) {
            return;
        }

        timerLog.add(`Read all data (${rows.length} rows).`);

        var measureCount = columnNamesLeafIndices.length;
        var markerCount = rows!.length / measureCount;

        // Color and count axes will have the same value for all "column names", i.e. it is sufficient to retrieve the first occurance.
        const marked = rows!.slice(0, markerCount).map((r) => r.isMarked());
        const colors = rows!.slice(0, markerCount).map((r) => r.color().hexCode);
        const count = countAxis.expression
            ? rows!.slice(0, markerCount).map((r) => r.continuous(ManifestConst.CountAxis).value() as number)
            : null;

        const tooltips = rows!.slice(0, markerCount).map((r) => () => mod.controls.tooltip.show(r));
        timerLog.add("Read colors");

        const tallSkinny = rows!.map((r, i) => r.continuous(ManifestConst.MeasureAxis).value());
        const points = transpose<number>(arrayToMatrix(tallSkinny, markerCount));

        var data: PairPlotData = {
            measures: measures!.map((m) => m.formattedValue()),
            points,
            colors,
            count,
            marked,
            mark: (index: number) => rows![index].mark(),
            tooltips,
            hideTooltips: () => mod.controls.tooltip.hide()
        };
        timerLog.add("Transpose");

        render(data, diagonalContent.value(), upperContent.value(), lowerContent.value(), size, () =>
            dataView.hasExpired()
        );

        timerLog.add("Render");
        //timerLog.log();

        createSettingsButton(mod, diagonalContent, upperContent, lowerContent);

        context.signalRenderComplete();
    }

    function transpose<T>(m: T[][]) {
        return m[0].map((_, i) => m.map((x) => x[i]));
    }

    function arrayToMatrix(arr: any[], chunkSize: number) {
        var results = [];
        while (arr.length) {
            results.push(arr.splice(0, chunkSize));
        }

        return results;
    }
});
