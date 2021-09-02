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
        mod.property<boolean>("showNullValues")
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
        showNullValues: ModProperty<boolean>
    ) {
        const hasSizeExpression = !!sizeAxis.parts.length;
        const hasHierarchyExpression = !!hierarchyAxis.parts.length;
        const hasColorHierarchy = !!colorAxis.parts.length && colorAxis.isCategorical;

        let rootNode: DataViewHierarchyNode;

        if (hasHierarchyExpression) {
            rootNode = (await (await dataView.hierarchy(hierarchyAxisName))!.root()) as DataViewHierarchyNode;
        } else {
            rootNode = (await dataView.allRows())?.[0]?.leafNode(hierarchyAxisName) as DataViewHierarchyNode;
        }

        const plotWarnings = validateDataView(
            rootNode,
            !!showNullValues.value() && hasHierarchyExpression,
            hasSizeExpression
        );

        const settings: RoseChartSettings = {
            containerSelector: "#mod-container",
            size: windowSize,
            clearMarking: dataView.clearMarking,
            style: {
                marking: { color: context.styling.scales.font.color },
                background: { color: context.styling.general.backgroundColor },
                label: {
                    fontFamily: context.styling.general.font.fontFamily,
                    color: context.styling.general.font.color,
                    size: context.styling.general.font.fontSize,
                    style: context.styling.general.font.fontStyle,
                    weight: context.styling.general.font.fontWeight
                }
            },
            onMouseover(node: RoseChartSector | RoseChartSector) {
                // mod.controls.tooltip.show(node.formattedPath());
            },
            onMouseLeave: mod.controls.tooltip.hide
        };

        let data = buildSectors(rootNode, hasSizeExpression);
        render(data, settings);

        renderSettingsButton(mod, labels, showNullValues);
        renderWarningsIcon(mod, plotWarnings);

        context.signalRenderComplete();
    }
});

function buildSectors(rootNode: DataViewHierarchyNode, hasSizeExpression: boolean): RoseChartSlice[] {
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

    return rootNode.leaves().flatMap((leaf, i) => {
        let x0 = pos;
        pos += sectorSize;
        let x1 = pos;
        let y0 = 0;
        return {
            id: leaf.key != null ? "key:" + leaf.key : "null",
            label: leaf.formattedPath(),
            mark: leaf.mark,
            sectors: leaf.rows().map(createSector),
            x0: x0,
            x1: x1
        }

        function createSector(row: DataViewRow) : RoseChartSector {
            const value = getAbsSize(row);

            let y1 = y0 + value / maxLeafSum;

            let sector: RoseChartSector = {
                y0: y0,
                y1: y1,
                color: row.color().hexCode,
                id: row.elementId(),
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
function validateDataView(rootNode: DataViewHierarchyNode, validateHierarchy: boolean, validataSize: boolean) {
    let warnings: string[] = [];
    let issues = 0;
    let rows = rootNode.rows();

    if (validateHierarchy) {
        rowLoop: for (let row of rows) {
            let path = row.categorical(hierarchyAxisName).value().slice();
            let length = path.length;
            let currentIndex = length - 1;
            while (currentIndex >= 1) {
                if (path[currentIndex].value() && !path[currentIndex - 1].value()) {
                    issues++;
                    warnings.push(
                        "Some elements are not visualized. The following path has holes in it: " +
                            row.categorical(hierarchyAxisName).formattedValue()
                    );

                    if (issues == 3) {
                        break rowLoop;
                    }

                    break;
                }

                currentIndex--;
            }
        }
    }

    if (validataSize) {
        rowLoop: for (let row of rows) {
            const size = row.continuous(sizeAxisName).value();
            if (typeof size == "number" && size < 0) {
                warnings.push("The plot contains negative values. These nodes have a red outline.");
                break rowLoop;
            }
        }
    }

    return warnings;
}

/**
 * Get the coloring start level. This is the level where all rows for the child nodes share coloring.
 * @param colorAxis - The color axis.
 * @param hierarchyAxis The hierarchy axis.
 * @returns The level from which to start coloring in the sunburst chart.
 */
function getColoringStartLevel(
    rootNode: DataViewHierarchyNode,
    colorAxis: Axis,
    hierarchyAxis: Axis,
    warnings: string[]
) {
    let coloringStartLevel = 0;

    // If the color axis is continuous or empty the coloring starts from the root.
    if (!colorAxis.isCategorical || !colorAxis.parts.length) {
        return 0;
    }

    const uniqueCount = (arr?: number[]) => arr?.filter((item, i, a) => a.indexOf(item) === i).length || 0;

    const firstLevelWithUniqueColoring = (node: DataViewHierarchyNode): number => {
        if (!node.children) {
            return node.level + 1;
        }

        if (
            Math.max(
                ...node.children
                    .map((child) => child.rows().map((r) => r.categorical(colorAxisName).leafIndex))
                    .map(uniqueCount)
            ) <= 1
        ) {
            // Every child has a unique color. Apply the color information on from the next level.
            return node.level + 1;
        }

        // Recursively find the appropriate level
        return Math.max(...node.children.map(firstLevelWithUniqueColoring));
    };

    // Find the matching expression in the hierarchy axis and use its level as a starting point for the coloring.
    coloringStartLevel = firstLevelWithUniqueColoring(rootNode);

    // Make sure there is an available coloring level.
    if (coloringStartLevel == hierarchyAxis.parts.length) {
        coloringStartLevel = hierarchyAxis.parts.length - 1;
        warnings.push(
            "The color expression generates more values than the hierarchy expression. Some leaves in the hierarchy will appear multiple times."
        );
    }

    return coloringStartLevel;
}

function renderSettingsButton(mod: Mod, labels: ModProperty<string>, showNullValues: ModProperty<boolean>) {
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
                    if (event.name == "showNullValues") {
                        showNullValues.set(event.value);
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
                            name: "labels",
                            value: "marked",
                            checked: labels.value() == "marked",
                            text: "Marked"
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
                            name: "showNullValues",
                            checked: showNullValues.value() || false,
                            text: "Show empty values as missing"
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
