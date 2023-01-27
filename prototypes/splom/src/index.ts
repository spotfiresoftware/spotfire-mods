import { Axis, AxisPart, DataView, Mod, ModProperty, Size } from "spotfire-api";
import { render, SplomDataset } from "./splom";
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

function getSelectValues(elements: NodeListOf<HTMLInputElement>) {
    var result = [];
    for (var i = 0; i < elements.length; i++) {
        if (elements[i].checked) {
            result.push(elements[i].value);
        }
    }
    return result;
}


/**
 * Gets a function to invoke when the user requests resetting the Mod to the required state. 
 * @param mod 
 * @returns The reset function
 */
function getResetFunction(mod: Mod) {
    return () => {
        const columns = getSelectValues(
            document.querySelectorAll(
                "#column-selection input[type='checkbox']:checked"
            ) as NodeListOf<HTMLInputElement>
        );
        document.querySelector("#resetMandatoryExpressions")!.classList.toggle("hidden", true);
        mod.visualization.axis(ManifestConst.CountAxis).setExpression("Count()");
        mod.visualization.axis(ManifestConst.MeasureAxis).setExpression("<" + columns.map((name) => name.startsWith("[") ? name : `[${name}]`).join(" NEST ") + ">");
    }
}

window.Spotfire.initialize(async (mod) => {
    const context = mod.getRenderContext();

    document.querySelector("#resetMandatoryExpressions button")!.addEventListener("click", getResetFunction(mod));

    const reader = mod.createReader(
        mod.visualization.data(),
        mod.property(ManifestConst.Diagonal),
        mod.property(ManifestConst.Upper),
        mod.property(ManifestConst.Lower),
        mod.visualization.axis(ManifestConst.MeasureAxis),
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
        countAxis: Axis,
        colorAxis: Axis,
        size: Size
    ) {
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
            countAxis.expression.toLowerCase() != "count()";

        document.getElementById("resetMandatoryExpressions")!.classList.toggle("hidden", !showConfigError);
        document.getElementById("content")!.classList.toggle("hidden", showConfigError);

        const columnNameOrExpression = (part: AxisPart) => {
            // There is no API for this, but all simple columns in the axis expression are escaped like [ColumnName].
            // Extract the column name for nicer UI.
            // TODO Handle multiple data tables that are escaped [TableName].[ColumnName]
            const isSimpleColumn = part.expression.startsWith("[")
                && part.expression.endsWith("]")
                && part.expression.lastIndexOf("[") == part.expression.indexOf("[")
                && part.expression.lastIndexOf("]") == part.expression.indexOf("]");
            return isSimpleColumn ? part.expression.substring(1, part.expression.length - 1) : part.expression;
        };


        if (showConfigError) {
            showConfigErrorDialog();
        }

        const measures = measureAxis.parts.map(p => p.displayName);

        const rows = await dataView.allRows();
        if (!measures || !rows) {
            return;
        }

        var measureCount = measures.length;
        // var markerCount = rows!.length / measureCount;

        // Color and count axes will have the same value for all "column names", i.e. it is sufficient to retrieve the first occurance.
        const { marked, colors, dataTypes } = rows.reduce((acc, row) => {
            acc.marked.push(row.isMarked());
            acc.colors.push(row.color().hexCode);
            acc.dataTypes = acc.dataTypes.map((type, idx) => {
                if (type) {
                    return type;
                }

                var value = row.categorical(ManifestConst.MeasureAxis).value()[idx].value();
                return value != null ? typeof value : undefined;
            });

            return acc;
        }, ({ marked: [] as boolean[], colors: [] as string[], dataTypes: new Array(measureCount).fill(undefined) as (string | undefined)[] }));

        const points = rows!.map(r => r.categorical(ManifestConst.MeasureAxis).value().map(p => p.value()));

        console.log(dataTypes);
        var data: SplomDataset = {
            measures,
            dataTypes,
            points,
            colors,
            // count,
            marked,
            mark: (index: number) => rows![index].mark(),
            // tooltips,
            hideTooltips: () => mod.controls.tooltip.hide()
        };

        render(data, diagonalContent.value(), upperContent.value(), lowerContent.value(), size, () =>
            dataView.hasExpired()
        );


        createSettingsButton(mod, diagonalContent, upperContent, lowerContent, showConfigErrorDialog);

        context.signalRenderComplete();

        async function showConfigErrorDialog() {
            const selectionDiv = document.querySelector("#column-selection")!;
            document.getElementById("resetMandatoryExpressions")!.classList.toggle("hidden", false);
            document.getElementById("content")!.classList.toggle("hidden", true);
            selectionDiv.textContent = "";

            const currentMeasures = (await mod.visualization.axis(ManifestConst.MeasureAxis)).parts.map(columnNameOrExpression);
            const addMeasure = (measure: string, isChecked: boolean) => {
                const input = document.createElement("input");
                input.type = "checkbox";
                input.name = "column";
                input.value = measure;
                input.checked = isChecked;

                const label = document.createElement("label");
                label.setAttribute("for", input.id);
                label.textContent = measure;

                const div = document.createElement("div");
                div.replaceChildren(input, label);
                selectionDiv.appendChild(div);
            }

            const columns = await(
                await(await mod.visualization.mainTable()).columns()
            ).filter((c) => !c.dataType.isDate() && !c.dataType.isTime() && !c.dataType.isTimeSpan());

            currentMeasures.forEach(measure => {
                addMeasure(measure, true);
            })

            columns.filter(c => currentMeasures.findIndex(m => c.name == m) == -1).forEach((c, i) => {
                addMeasure(c.name, false);
            });

            return;

        }
    }
});

