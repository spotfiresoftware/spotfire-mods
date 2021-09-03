import { render, SunBurstHierarchyNode, SunBurstSettings } from "./sunburst";
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

    let totalSize = 0;

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

        const coloringFromLevel = getColoringStartLevel(rootNode, colorAxis, hierarchyAxis, plotWarnings);

        const getAbsSize = (r: DataViewRow) =>
            hasSizeExpression ? Math.abs(r.continuous(sizeAxisName).value<number>() || 0) : 1;
        const getRealSize = (r: DataViewRow) =>
            hasSizeExpression ? r.continuous(sizeAxisName).value<number>() || 0 : 1;

        function flattenColorsIfColorSplits(node: SunBurstHierarchyNode): any {
            if (!hasHierarchyExpression && hasColorHierarchy && !node.virtualLeaf) {
                const fakeNodes = node.rows().map((r) => rowToSunBurstHierarchyLeaf(r, node));
                node.hasVirtualChildren = true;
                return fakeNodes;
            }

            return node.level == hierarchyAxis.parts.length - 2 && hasColorHierarchy
                ? node.children?.flatMap((child) => child.rows().map((r) => rowToSunBurstHierarchyLeaf(r, child)))
                : node.children;

            function rowToSunBurstHierarchyLeaf(r: DataViewRow, child: SunBurstHierarchyNode) {
                return {
                    formattedPath: () => child.formattedPath(),
                    formattedValue: () => child.formattedValue(),
                    key: r.elementId(),
                    leafCount: () => 1,
                    level: node.level + 1,
                    mark: (operation?: any) => r.mark(operation),
                    markedRowCount: () => (r.isMarked() ? 1 : 0),
                    parent: node,
                    rows: () => [r],
                    virtualLeaf: true
                } as SunBurstHierarchyNode;
            }
        }

        const hierarchy: d3.HierarchyNode<SunBurstHierarchyNode> = d3
            .hierarchy<SunBurstHierarchyNode>(rootNode, flattenColorsIfColorSplits)
            .eachAfter((n) => {
                var d = n.data;
                d.actualValue = d!.rows().reduce((p, c) => p + getRealSize(c), 0);

                if (!d.key) {
                    // The entire path of keys is needed to identify a node.
                    let calculatedKey = "";
                    let currentNode: SunBurstHierarchyNode | undefined = d;
                    while (currentNode) {
                        calculatedKey += (currentNode.key ? `key:${currentNode.key}` : "null") + "|";
                        currentNode = currentNode.parent;
                    }

                    d.key = calculatedKey;
                }
            })
            .sum((d: SunBurstHierarchyNode) =>
                !d.children && !d.hasVirtualChildren ? d!.rows().reduce((p, c) => p + getAbsSize(c), 0) : 0
            );

        totalSize = hierarchy.value || 0;

        const settings: SunBurstSettings = {
            containerSelector: "#mod-container",
            size: windowSize,
            clearMarking: dataView.clearMarking,
            mark(node: SunBurstHierarchyNode) {
                if (d3.event.ctrlKey) {
                    node.mark("ToggleOrAdd");
                    return;
                }

                node.mark();
            },
            getFill(node: SunBurstHierarchyNode) {
                let rows = node.rows();

                // Empty leaf nodes are empty
                if (!rows.length) {
                    return "transparent";
                }

                // Use faux color leaf node to retrieve color
                if (!hasHierarchyExpression) {
                    return node.rows()[0].color().hexCode;
                }

                // When the path has empty values, make sure all children are transparent. This is also a warning.
                if (
                    showNullValues.value() &&
                    rows[0]
                        .categorical(hierarchyAxisName)
                        .value()
                        .slice(0, node.level + 1)
                        .find((pathElement) => pathElement.value() == null)
                ) {
                    return "transparent";
                }

                // This node does not have a unique color amongst its children.
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

                // Attempt to use the marked color if any of the underlying rows are marked.
                let firstMarkedRow = node.rows().findIndex((r) => r.isMarked());
                if (firstMarkedRow == -1) {
                    firstMarkedRow = 0;
                }

                return node.rows()[firstMarkedRow].color().hexCode;
            },
            getId(node: SunBurstHierarchyNode) {
                return node.key;
            },
            getLabel(node: SunBurstHierarchyNode, availablePixels: number) {
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
            getCenterText(node: SunBurstHierarchyNode) {
                let percentage = 0;
                try {
                    percentage = (100 * node.rows().reduce((p, r) => p + getAbsSize(r), 0)) / totalSize;
                } catch (_) {
                    // The dataview might become disposed and will throw when reading old rows.
                }
                let percentageString = percentage.toPrecision(3) + "%";
                if (percentage < 0.1) {
                    percentageString = "< 0.1%";
                }

                return {
                    value: percentageString,
                    text: node.formattedPath()
                };
            },
            onMouseover(node: SunBurstHierarchyNode) {
                mod.controls.tooltip.show(node.formattedPath());
            },
            onMouseLeave: mod.controls.tooltip.hide
        };

        render(hierarchy, settings);

        renderSettingsButton(mod, labels, showNullValues);
        renderWarningsIcon(mod, plotWarnings);

        context.signalRenderComplete();
    }
});

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

    // If the color axis is empty the coloring starts from the root.
    if (!colorAxis.parts.length) {
        return 0;
    }

    // If the color axis is continuous, only color leaf nodes.
    if (!colorAxis.isCategorical) {
        return hierarchyAxis.parts.length - 1;
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
