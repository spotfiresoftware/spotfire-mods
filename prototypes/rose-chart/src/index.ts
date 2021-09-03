import { render, RoseChartSector, RoseChartSettings, RoseChartSlice } from "./roseChart";
import { Axis, DataView, DataViewHierarchyNode, DataViewRow, Mod, ModProperty, Size } from "spotfire-api";
import { generalErrorHandler } from "./generalErrorHandler";
import * as d3 from "d3";
import { interactionLock } from "./interactionLock";

const hierarchyAxisName = "Hierarchy";
const colorAxisName = "Color";
const sizeAxisName = "Size";

window.Spotfire.initialize(async (mod) => {
    const context = mod.getRenderContext();

    const reader = mod.createReader(
        mod.visualization.data(),
        mod.windowSize(),
        mod.visualization.axis(hierarchyAxisName),
        mod.visualization.axis(colorAxisName),
        mod.visualization.axis(sizeAxisName),
        mod.property<string>("labels"),
        mod.property<boolean>("showCircles")
    );

    let interaction = interactionLock();
    reader.subscribe(generalErrorHandler(mod, 10000, interaction)(onChange));

    async function onChange(
        dataView: DataView,
        windowSize: Size,
        hierarchyAxis: Axis,
        colorAxis: Axis,
        sizeAxis: Axis,
        labels: ModProperty<string>,
        showCircles: ModProperty<boolean>
    ) {
        const hasSizeExpression = !!sizeAxis.parts.length;
        const hasColorExpression = !!colorAxis.parts.length && colorAxis.isCategorical;
        const hasHierarchyExpression = !!hierarchyAxis.parts.length;

        let rootNode: DataViewHierarchyNode;

        if (hasHierarchyExpression) {
            rootNode = (await (await dataView.hierarchy(hierarchyAxisName))!.root()) as DataViewHierarchyNode;
        } else {
            rootNode = (await dataView.allRows())?.[0]?.leafNode(hierarchyAxisName) as DataViewHierarchyNode;
        }

        const plotWarnings = validateDataView(rootNode, hasSizeExpression);

        const settings: RoseChartSettings = {
            containerSelector: "#mod-container",
            size: windowSize,
            clearMarking: dataView.clearMarking,
            style: {
                marking: { color: context.styling.scales.font.color },
                background: { color: context.styling.general.backgroundColor },
                circles: { color: showCircles.value() ? context.styling.scales.line.stroke : "transparent" },
                label: {
                    fontFamily: context.styling.general.font.fontFamily,
                    color: context.styling.general.font.color,
                    size: context.styling.general.font.fontSize,
                    style: context.styling.general.font.fontStyle,
                    weight: context.styling.general.font.fontWeight
                }
            },
            onMouseover(node: RoseChartSector | RoseChartSlice) {
                mod.controls.tooltip.show(node.label);
            },
            onMouseLeave: mod.controls.tooltip.hide
        };

        let data = buildChartSlices(rootNode, hasSizeExpression, hasColorExpression, labels);
        render(data, settings);

        renderSettingsButton(mod, labels, showCircles);
        renderWarningsIcon(mod, plotWarnings);

        context.signalRenderComplete();
    }
});

function buildChartSlices(
    rootNode: DataViewHierarchyNode,
    hasSizeExpression: boolean,
    hasColorExpression: boolean,
    labels: ModProperty<string>
): RoseChartSlice[] {
    let sectorSize = (2 * Math.PI) / rootNode.leaves().length;
    let pos = 0;

    const getAbsSize = (r: DataViewRow) =>
        hasSizeExpression ? Math.abs(r.continuous(sizeAxisName).value<number>() || 0) : 1;
    let maxLeafSum = (rootNode.leaves() || []).reduce((pMax, node) => {
        let sum = node.rows().reduce((p, c) => p + getAbsSize(c), 0);
        if (sum > pMax) {
            return sum;
        }

        return pMax;
    }, 0);

    function createId(leaf: DataViewHierarchyNode) {
        let parts = [];
        let node: DataViewHierarchyNode | undefined = leaf;
        while (node) {
            parts.push(node.key != null ? "v:" + node.key : "null");
            node = node.parent;
        }

        return parts.join("-");
    }

    return rootNode.leaves().flatMap((leaf, i) => {
        let x0 = pos;
        pos += sectorSize;
        let x1 = pos;
        let y0 = 0;
        return {
            id: createId(leaf),
            label: labels.value() == "all" ? leaf.formattedPath() : "",
            mark() {
                if (d3.event.ctrlKey) {
                    leaf.mark("ToggleOrAdd");
                    return;
                }

                leaf.mark();
            },
            sectors: leaf.rows().map(createSector),
            x0: x0,
            x1: x1
        };

        function createSector(row: DataViewRow): RoseChartSector {
            const value = getAbsSize(row);

            let y1 = y0 + value / maxLeafSum;

            let sector: RoseChartSector = {
                y0: y0,
                y1: y1,
                color: row.color().hexCode,
                id: row.elementId(),
                label:
                    (hasColorExpression
                        ? row.categorical(colorAxisName).formattedValue()
                        : row.categorical(hierarchyAxisName).formattedValue()) +
                    ": " +
                    (hasSizeExpression ? row.continuous(sizeAxisName).formattedValue() : 1),
                value: value,
                mark() {
                    if (d3.event.ctrlKey) {
                        row.mark("ToggleOrAdd");
                        return;
                    }

                    row.mark();
                }
            };

            y0 = y1;

            return sector as any;
        }
    });
}

/**
 * Validate that no empty path element is followed by a value and that all values are positive.
 * @param rootNode - The hierarchy root.
 * @param warnings - The warnings array
 */
function validateDataView(rootNode: DataViewHierarchyNode, validateSize: boolean) {
    let warnings: string[] = [];
    let rows = rootNode.rows();

    if (validateSize) {
        rowLoop: for (let row of rows) {
            const size = row.continuous(sizeAxisName).value();
            if (typeof size == "number" && size < 0) {
                warnings.push("The plot contains negative values.");
                break rowLoop;
            }
        }
    }

    return warnings;
}

function renderSettingsButton(mod: Mod, labels: ModProperty<string>, showCircles: ModProperty<boolean>) {
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
                    if (event.name == "showCircles") {
                        showCircles.set(event.value);
                    }
                }
            },
            () => [
                mod.controls.popout.section({
                    heading: "Labels",
                    children: [
                        mod.controls.popout.components.radioButton({
                            enabled: true,
                            name: "labels",
                            value: "all",
                            checked: labels.value() == "all",
                            text: "All"
                        }),
                        mod.controls.popout.components.radioButton({
                            enabled: true,
                            value: "off",
                            name: "labels",
                            checked: labels.value() == "off",
                            text: "Off"
                        })
                    ]
                }),
                mod.controls.popout.section({
                    children: [
                        mod.controls.popout.components.checkbox({
                            enabled: true,
                            name: "showCircles",
                            checked: showCircles.value() || false,
                            text: "Show circles"
                        })
                    ]
                })
            ]
        );
    };
}

function renderWarningsIcon(mod: Mod, warnings: string[]) {
    let warningButton = document.querySelector<HTMLElement>(".warnings");
    warningButton?.classList.toggle("visible", !!warnings.length);

    warningButton!.onmouseenter = () => {
        mod.controls.tooltip.show("Warnings:\n" + warnings.join("\n"));
    };
    warningButton!.onmouseleave = () => {
        mod.controls.tooltip.hide();
    };

    document.body.onclick = () => mod.controls.tooltip.hide();
}
