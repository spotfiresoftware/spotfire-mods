import { render, SunBurstSettings } from "./sunburst";
import { Axis, DataView, DataViewHierarchyNode, DataViewRow, Mod, ModProperty, Size } from "spotfire-api";
import { generalErrorHandler } from "./generalErrorHandler";
import * as d3 from "d3";

const hierarchyAxisName = "Hierarchy";
const sizeAxisName = "Size";

window.Spotfire.initialize(async (mod) => {
    const context = mod.getRenderContext();

    const reader = mod.createReader(
        mod.visualization.data(),
        mod.windowSize(),
        mod.visualization.axis(hierarchyAxisName),
        mod.visualization.axis("Color"),
        mod.visualization.axis(sizeAxisName),
        mod.property<string>("labels")
    );

    reader.subscribe(generalErrorHandler(mod, 10000)(onChange));

    async function onChange(
        dataView: DataView,
        windowSize: Size,
        hierarchyAxis: Axis,
        colorAxis: Axis,
        sizeAxis: Axis,
        labels: ModProperty<string>
    ) {
        const hasSizeExpression = !!sizeAxis.expression;
        const rootNode = await (await dataView.hierarchy(hierarchyAxisName))?.root()!;

        if (!rootNode) {
            return;
        }

        let plotWarnings: string[] = [];

        validateHierarchyPaths(rootNode, plotWarnings);

        const coloringFromLevel = getColoringStartLevel(rootNode, colorAxis, hierarchyAxis, plotWarnings);

        const getSize = (r: DataViewRow) => (hasSizeExpression ? r.continuous(sizeAxisName).value<number>() || 0 : 1);

        let hierarchy = d3.hierarchy(rootNode).sum((d) => {
            return !d!.children ? d!.rows().reduce((p, c) => p + getSize(c), 0) : 0;
        });

        let totalSize = rootNode.rows().reduce((p: number, c: DataViewRow) => p + getSize(c), 0);

        const settings: SunBurstSettings = {
            containerSelector: "#mod-container",
            size: windowSize,
            totalSize: totalSize,
            clearMarking: dataView.clearMarking,
            mark(node: DataViewHierarchyNode) {
                node.mark();
            },
            getFill(node: DataViewHierarchyNode) {
                let rows = node.rows();
                if (!rows.length) {
                    return "transparent";
                }

                if (
                    rows[0]
                        .categorical(hierarchyAxisName)
                        .value()
                        .slice(0, node.level + 1)
                        .find((pathElement) => pathElement.value() == null)
                ) {
                    return "transparent";
                }

                if (node.level + 1 <= coloringFromLevel) {
                    if (
                        node.rows().findIndex((r) => r.isMarked()) >= 0 ||
                        rootNode.rows().findIndex((r) => r.isMarked()) == -1
                    ) {
                        // Any child marked or no marked rows in the data view;
                        return "rgb(208,208,208)";
                    }

                    // Dataview has marked rows, but not any rows for this node.
                    return "rgba(208,208,208, 0.2)";
                }

                let firstMarkedRow = node.rows().findIndex((r) => r.isMarked());
                if (firstMarkedRow == -1) {
                    firstMarkedRow = 0;
                }

                return node.rows()[firstMarkedRow].color().hexCode;
            },
            getLabel(node: DataViewHierarchyNode, availablePixels: number) {
                if (labels.value() == "off") {
                    return "";
                }

                if (labels.value() == "marked" && node.markedRowCount() == 0) {
                    return "";
                }
                const fontSize = context.styling.general.font.fontSize;
                const fontWidth = fontSize * 0.7;

                let label = node.formattedValue();
                if (label.length > availablePixels / fontWidth) {
                    return label.slice(0, Math.max(1, availablePixels / fontWidth - 2)) + "…";
                }

                return label;
            },
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
            onMouseover(node: DataViewHierarchyNode) {
                mod.controls.tooltip.show(node.formattedPath());
            },
            onMouseLeave: mod.controls.tooltip.hide
        };

        render(hierarchy, settings);

        renderSettingsButton(mod, labels);
        renderWarningsIcon(mod, plotWarnings);

        context.signalRenderComplete();
    }
});

/**
 * Validate that no empty path element is followed by a value.
 * @param rootNode - The hierarchy root.
 * @param warnings - The warnings array
 */
function validateHierarchyPaths(rootNode: DataViewHierarchyNode, warnings: string[]) {
    let issues = 0;
    rowLoop: for (let row of rootNode.rows()) {
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
                    .map((child) => child.rows().map((r) => r.categorical("Color").leafIndex))
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
    if (coloringStartLevel >= hierarchyAxis.parts.length) {
        warnings.push(
            "Coloring could not be applied. The expression on the color axis must be included on the hierarchy axis."
        );
        coloringStartLevel = 9999;
    }

    return coloringStartLevel;
}

function renderSettingsButton(mod: Mod, labels: ModProperty<string>) {
    let settingsButton = document.querySelector<HTMLElement>(".settings");
    settingsButton?.classList.toggle("visible", mod.getRenderContext().isEditing);
    let pos = settingsButton!.getBoundingClientRect();

    settingsButton!.onclick = () => {
        mod.controls.popout.show(
            {
                x: pos.left + pos.width / 2,
                y: pos.top + pos.height / 2,
                autoClose: true,
                alignment: "Top",
                onChange(event) {
                    if (event.name == "labels") {
                        labels.set(event.value);
                    }
                },
                onClosed() {
                    settingsButton!.onclick = null;
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
