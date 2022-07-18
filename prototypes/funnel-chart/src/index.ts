import { DataViewRow, Mod, ModProperty } from "spotfire-api";
import { generalErrorHandler } from "./generalErrorHandler";
import * as d3 from "d3";
import { interactionLock } from "./interactionLock";
import { resources } from "./resources";
import { funnel, FunnelData, FunnelSettings, LabelFor } from "./funnelChart";


enum InteractionMode {
    drilldown = "drilldown",
    mark = "mark"
}

enum LabelPosition {
    outside = "outside",
    inside = "inside"
}
// BUGG : COLOR BY AMOUNT is not showing correct label when choosing name, probably retrieve data another way
window.Spotfire.initialize(async (mod) => {
    const context = mod.getRenderContext();

    const reader = mod.createReader(
        mod.visualization.data(),
        mod.windowSize(),
        mod.property<string>("labels"),
        mod.property<boolean>("showOnlyMarked"),
        mod.property<boolean>("sortByValue"),
        mod.property<boolean>("showProcessName"),
        mod.property<boolean>("showProcessQuantity"),
        mod.property<boolean>("showProcessPercentage"),
        mod.property<string>("labelPosition")
    );

    let interaction = interactionLock();
    reader.subscribe(generalErrorHandler(mod, 10000, interaction)(onChange));

    /**
     * Render the bar chart.
     * This visualization is a simplified example to highlight how the mod API can be used. It is not a fully functioning visualization.
     *
     * @param {Spotfire.Size} size
     * @param {Spotfire.DataView} dataView
     * @param {Spotfire.ModProperty<string>} yAxisMode
     */
    async function onChange(
        dataView: Spotfire.DataView,
        size: Spotfire.Size,
        labels: ModProperty<string>,
        showOnlyMarked: ModProperty<boolean>,
        sortByValue: ModProperty<boolean>,
        showProcessName: ModProperty<boolean>,
        showProcessQuantity: ModProperty<boolean>,
        showProcessPercentage: ModProperty<boolean>,
        labelPosition: ModProperty<string>,
    ) {
        /**
         * Check for any errors.
         */
        const tooltip = mod.controls.tooltip;

        let errors = await dataView.getErrors();
        if (errors.length > 0) {
            mod.controls.errorOverlay.show(errors, "dataView");
            // TODO clear DOM
            return;
        }
        mod.controls.errorOverlay.hide("dataView");
        mod.controls.tooltip.hide();
        // Get the leaf nodes for the x hierarchy. We will iterate over them to
        // render the bars.
        let colorHierarchy = await dataView.hierarchy("Color");
        if (colorHierarchy == null) {
            return;
        }

        let colorRoot = await colorHierarchy.root();
        if (colorRoot == null) {
            // Return and wait for next call to render when reading data was aborted.
            // Last rendered data view is still valid from a users perspective since
            // a document modification was made during a progress indication.
            return;
        }
        let dataViewYAxis = await dataView.continuousAxis("Y");
        if (dataViewYAxis == null) {
            mod.controls.errorOverlay.show("No data on y axis.", "y");
            return;
        } else {
            mod.controls.errorOverlay.hide("y");
        }

        let dataViewXAxis = await dataView.categoricalAxis("X");
        if (dataViewXAxis == null) {
            mod.controls.errorOverlay.show("No data on x axis.", "x");
            return;
        } else {
            mod.controls.errorOverlay.hide("x");
        }

        let dataRows: DataViewRow[] | null = await dataView.allRows();
        if (dataRows == null) {
            return;
        }
        dataRows.forEach(row => {
            if (row == null) {
                return;
            }
        })

        let data : FunnelData[] = [];

        let colorLeaves = colorRoot.leaves();
        if (colorLeaves === undefined){
            return;
        }
        
        colorLeaves.map((leaf: any, idx: number) => {
            let rows = leaf.rows();
            
            if (rows === undefined) {
                return;
            }

            if (dataRows === null) {
                return;
            }
            data.push({
                    colors: {
                        backGround: rows[0].color().hexCode != null ? rows[0].color().hexCode : "#FFFFFF",
                        marking: context.styling.scales.font.color
                    },
                    value: dataRows[idx].continuous("Y").value() !== null  ? dataRows[idx].continuous("Y").value() : 1,
                    clearMarking: dataView.clearMarking,
                    label: dataRows !== null ? dataRows[idx].categorical("X").formattedValue() : "Null",
                    isMarked: rows[0].isMarked(),
                    displayValues: false,
                    row: rows[0],
                    mark() {
                        if (d3.event.ctrlKey) {
                            rows[0].mark("ToggleOrAdd");
                            d3.event.stopPropagation();
                            return;
                        }
                        rows[0].mark();
                        d3.event.stopPropagation();
                    }
            } as FunnelData);
        });

        renderSettingsButton(
            mod,
            labels,
            showOnlyMarked,
            sortByValue,
            showProcessName,
            showProcessQuantity,
            showProcessPercentage,
            labelPosition,
        );

        let settings: FunnelSettings = {
            showOnlyMarked: showOnlyMarked.value() || false,
            labelsFor: labels.value(),
            tooltip: tooltip,
            labelSettings: {
                labelOutside: labelPosition.value() == LabelPosition.outside,
                showName: showProcessName.value() || false,
                showQuantity: showProcessQuantity.value() || false,
                showPercentage: showProcessPercentage.value() || false,
                multiLine:
                    (showProcessName.value() && (showProcessQuantity.value() || showProcessPercentage.value())) ||
                    false,
                color: context.styling.general.font.color,
                size: context.styling.general.font.fontSize,
                family: context.styling.general.font.fontFamily,
                style: context.styling.general.font.fontStyle
            }
        };

        funnel(size, data, settings);
        context.signalRenderComplete();
    }
});

function renderSettingsButton(
    mod: Mod,
    labels: ModProperty<string>,
    showOnlyMarked: ModProperty<boolean>,
    sortByValue: ModProperty<boolean>,
    showProcessName: ModProperty<boolean>,
    showProcessQuantity: ModProperty<boolean>,
    showProcessPercentage: ModProperty<boolean>,
    labelPosition: ModProperty<string>,
) {
    let settingsButton = document.querySelector<HTMLElement>(".settings");
    settingsButton?.classList.toggle("visible", mod.getRenderContext().isEditing);
    let pos = settingsButton!.getBoundingClientRect();
    settingsButton!.onclick = () => {
        mod.controls.popout.show(
            {
                x: pos.left + pos.width / 2,
                y: pos.top + pos.height,
                autoClose: true,
                alignment: "Top",
                onChange(event) {
                    if (event.name == "labels") {
                        labels.set(event.value);
                    }
                    if (event.name == "showOnlyMarked") {
                        showOnlyMarked.set(event.value);
                    }
                    if (event.name == "sortByValue") {
                        sortByValue.set(event.value);
                    }
                    if (event.name == "showName") {
                        showProcessName.set(event.value);
                    }
                    if (event.name == "showQuantity") {
                        showProcessQuantity.set(event.value);
                    }
                    if (event.name == "showPercentage") {
                        showProcessPercentage.set(event.value);
                    }
                    if (event.name == "LabelPosition") {
                        labelPosition.set(event.value);
                    }
                }
            },
            () => [
                mod.controls.popout.section({
                    heading: resources.popoutLabelsHeading,
                    children: [
                        mod.controls.popout.components.radioButton({
                            enabled: true,
                            name: "labels",
                            value: LabelFor.all,
                            checked: labels.value() == LabelFor.all,
                            text: resources.popoutLabelsAll
                        }),
                        mod.controls.popout.components.radioButton({
                            enabled: true,
                            name: "labels",
                            value: LabelFor.marked,
                            checked: labels.value() == LabelFor.marked,
                            text: resources.popoutLabelsMarked
                        }),
                        mod.controls.popout.components.radioButton({
                            enabled: true,
                            value: LabelFor.none,
                            name: "labels",
                            checked: labels.value() == LabelFor.none,
                            text: resources.popoutLabelsNone
                        })
                    ]
                }),
                mod.controls.popout.section({
                    heading: "Show in Labels",
                    children: [
                        mod.controls.popout.components.checkbox({
                            enabled: true,
                            name: "showName",
                            checked: showProcessName.value() || false,
                            text: resources.showInLabelName
                        }),
                        mod.controls.popout.components.checkbox({
                            enabled: true,
                            name: "showQuantity",
                            checked: showProcessQuantity.value() || false,
                            text: resources.showInLabelQuantity
                        }),
                        mod.controls.popout.components.checkbox({
                            enabled: true,
                            name: "showPercentage",
                            checked: showProcessPercentage.value() || false,
                            text: resources.showInLabelPercentage
                        })
                    ]
                }),
                mod.controls.popout.section({
                    heading: "Label Position",
                    children: [
                        mod.controls.popout.components.radioButton({
                            enabled: true,
                            name: "LabelPosition",
                            value: LabelPosition.outside,
                            checked: labelPosition.value() === LabelPosition.outside,
                            text: resources.showLabelOutsideFunnel
                        }),
                        mod.controls.popout.components.radioButton({
                            enabled: true,
                            name: "LabelPosition",
                            value: LabelPosition.inside,
                            checked: labelPosition.value() === LabelPosition.inside || false,
                            text: resources.showLabelInFunnel
                        })
                    ]
                }),
                mod.controls.popout.section({
                    children: [
                        mod.controls.popout.components.checkbox({
                            enabled: true,
                            name: "showOnlyMarked",
                            checked: showOnlyMarked.value() || false,
                            text: resources.showOnlyMarkedProcesses
                        })
                    ]
                })
            ]
        );
    };
}
