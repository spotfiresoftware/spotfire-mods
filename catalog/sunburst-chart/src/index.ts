import * as d3 from "d3";
import { Axis, DataView, DataViewHierarchyNode, DataViewRow, Mod, ModProperty, Size } from "spotfire-api";
import { generalErrorHandler } from "./generalErrorHandler";
import { interactionLock } from "./interactionLock";
import { resources } from "./resources";
import { render, SunBurstHierarchyNode, SunBurstSettings } from "./sunburst";

const hierarchyAxisName = "Hierarchy";
const colorAxisName = "Color";
const sizeAxisName = "Size";

enum InteractionMode {
    drilldown = "drilldown",
    mark = "mark"
}

window.Spotfire.initialize(async (mod) => {
    const context = mod.getRenderContext();

    const reader = mod.createReader(
        mod.visualization.data(),
        mod.windowSize(),
        mod.visualization.axis(hierarchyAxisName),
        mod.visualization.axis(colorAxisName),
        mod.visualization.axis(sizeAxisName),
        mod.property<string>("labels"),
        mod.property<boolean>("showNullValues"),
        mod.property<string>("interactionMode"),
        mod.property<string>("rootNode"),
        mod.property<boolean>("sortByValue")
    );

    let interaction = interactionLock();
    reader.subscribe(generalErrorHandler(mod, 10000, interaction)(onChange));

    let totalSize = 0;

    function findNode(jsonPath: string | null, rootNode: DataViewHierarchyNode | null) {
        if (jsonPath == null || rootNode == null) {
            return undefined;
        }
        let path = jsonToPath(jsonPath);
        let node: DataViewHierarchyNode | undefined = rootNode;
        if (path.length == 0) {
            return undefined;
        }

        path.forEach((key) => {
            node = node?.children?.find((c) => c.key == key);
        });
        return node;
    }

    async function onChange(
        dataView: DataView,
        windowSize: Size,
        hierarchyAxis: Axis,
        colorAxis: Axis,
        sizeAxis: Axis,
        labels: ModProperty<string>,
        showNullValues: ModProperty<boolean>,
        interactionMode: ModProperty<string>,
        rootNodePath: ModProperty<string>,
        sortByValue: ModProperty<boolean>
    ) {
        const hasSizeExpression = !!sizeAxis.parts.length;
        const hasHierarchyExpression = !!hierarchyAxis.parts.length;
        const hasColorHierarchy = !!colorAxis.parts.length && colorAxis.isCategorical;

        let hierarchyRoot = await (await dataView.hierarchy(hierarchyAxisName))!.root();
        let rootNode = findNode(rootNodePath.value(), hierarchyRoot);

        if (!rootNode) {
            if (hasHierarchyExpression && hierarchyRoot) {
                rootNode = hierarchyRoot;
            } else {
                rootNode = (await dataView.allRows())?.[0]?.leafNode(hierarchyAxisName) as DataViewHierarchyNode;
            }
        }

        const plotWarnings = validateDataView(
            rootNode,
            !showNullValues.value() && hasHierarchyExpression,
            hasSizeExpression
        );

        const coloringFromLevel = getColoringStartLevel(rootNode, colorAxis, hierarchyAxis, plotWarnings);

        const getAbsSize = (r: DataViewRow) =>
            hasSizeExpression ? Math.abs(r.continuous(sizeAxisName).value<number>() || 0) : 1;
        const getRealSize = (r: DataViewRow) =>
            hasSizeExpression ? r.continuous(sizeAxisName).value<number>() || 0 : 1;

        let hierarchy: d3.HierarchyNode<SunBurstHierarchyNode> = d3
            .hierarchy<SunBurstHierarchyNode>(rootNode, flattenColorsIfColorSplits)
            .sum((d: SunBurstHierarchyNode) =>
                !d.children && !d.hasVirtualChildren ? d!.rows().reduce((p, c) => p + getAbsSize(c), 0) : 0
            );

        if (sortByValue.value()) {
            hierarchy.sort((a, b) => (b.value || 0) - (a.value || 0));
        }

        // Compute fill color after sorting
        hierarchy.eachAfter((n) => {
            var d = n.data;
            d.actualValue = d!.rows().reduce((p, c) => p + getRealSize(c), 0);
            n.data.fill = getFillColor(n);
        });

        totalSize = hierarchy.value || 0;

        const breadcrumbs = jsonToPath(rootNodePath.value() || "{}");
        if (breadcrumbs.length) {
            breadcrumbs.unshift(resources.breadCrumbRoot);
        }

        const settings: SunBurstSettings = {
            animationSpeed: context.interactive ? 250 : 0,
            breadcrumbs: breadcrumbs,
            breadCrumbClick(i) {
                const p = breadcrumbs.slice(0, i + 1);

                // Remove (all) from path.
                p.shift();
                rootNodePath.set(JSON.stringify({ path: p }));
            },
            containerSelector: "#mod-container",
            size: windowSize,
            clearMarking: () => {
                if (currentInteractionMode() == InteractionMode.drilldown) {
                    var currentPath = rootNodePath.value();
                    if (currentPath) {
                        let json = JSON.parse(currentPath) as { path: (string | null)[] };
                        json.path.pop();
                        rootNodePath.set(JSON.stringify(json));
                    }
                } else dataView.clearMarking();
            },
            mark(node: SunBurstHierarchyNode) {
                if (d3.event.ctrlKey) {
                    node.mark("ToggleOrAdd");
                } else {
                    node.mark();
                }
            },
            click(node: SunBurstHierarchyNode) {
                if (currentInteractionMode() == InteractionMode.drilldown) {
                    if (node.children && node.children.length) {
                        rootNodePath.set(JSON.stringify({ path: getPathToNode(node) }));
                    }
                } else {
                    if (d3.event.ctrlKey) {
                        node.mark("ToggleOrAdd");
                    } else {
                        node.mark();
                    }
                }
            },
            getId(node: SunBurstHierarchyNode) {
                function hash(s: string) {
                    return s.split("").reduce(function (a, b) {
                        a = (a << 5) - a + b.charCodeAt(0);
                        return a & a;
                    }, 0);
                }
                return hash(pathToJson(getPathToNode(node))).toString();
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
                    size: parseInt("" + context.styling.general.font.fontSize),
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

        renderSettingsButton(mod, labels, showNullValues, interactionMode, sortByValue);
        renderWarningsIcon(mod, plotWarnings);

        context.signalRenderComplete();

        function currentInteractionMode(): InteractionMode {
            if (interactionMode.value() == InteractionMode.drilldown) {
                return d3.event.altKey ? InteractionMode.mark : InteractionMode.drilldown;
            }
            return d3.event.altKey ? InteractionMode.drilldown : InteractionMode.mark;
        }

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

        function getFillColor(d3Node: d3.HierarchyNode<SunBurstHierarchyNode>) {
            let node = d3Node.data;
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
                !showNullValues.value() &&
                rows[0]
                    .categorical(hierarchyAxisName)
                    .value()
                    .slice(0, node.level + 1)
                    .find((pathElement) => pathElement.value() == null)
            ) {
                return "transparent";
            }

            const hasMarking = rootNode!.rows().findIndex((r) => r.isMarked()) >= 0;
            // This node does not have a unique color amongst its children.
            if (node.level + 1 <= coloringFromLevel) {
                if (node.rows().findIndex((r) => r.isMarked()) >= 0 || !hasMarking) {
                    // Any child marked or no marked rows in the data view;
                    return "rgb(208,208,208)";
                }

                // Dataview has marked rows, but not any rows for this node.
                return "rgba(208,208,208, 0.2)";
            }

            if (hasMarking) {
                let firstMarkedInTree = findFirstRow(d3Node, (r) => r.isMarked());
                if (firstMarkedInTree) {
                    return firstMarkedInTree.color().hexCode;
                }
            }

            let colorAsNode: d3.HierarchyNode<SunBurstHierarchyNode> | undefined = d3Node;
            while (colorAsNode && colorAsNode.children) {
                colorAsNode = colorAsNode.children.find((n) => n.data.rows().length > 0);
            }

            if (!colorAsNode) {
                colorAsNode = d3Node;
            }

            // Attempt to use the marked color if any of the underlying rows are marked.
            let firstMarkedRow = colorAsNode.data.rows().findIndex((r) => r.isMarked());
            if (firstMarkedRow == -1) {
                firstMarkedRow = 0;
            }

            return colorAsNode.data.rows()[firstMarkedRow].color().hexCode;
        }
    }
});

function findFirstRow(
    node: d3.HierarchyNode<SunBurstHierarchyNode>,
    predicate: (row: DataViewRow) => boolean
): DataViewRow | undefined {
    if (!node.children) {
        return node.data.rows().find(predicate);
    }

    let found: DataViewRow | undefined;
    node.children.every((c) => {
        found = findFirstRow(c, predicate);
        return !found;
    });

    return found;
}

function jsonToPath(str: string): (string | null)[] {
    let json = JSON.parse(str) as { path: (string | null)[] };
    return json.path || [];
}

function pathToJson(path: (string | null)[]): string {
    return JSON.stringify({ path });
}

function getPathToNode(d: SunBurstHierarchyNode): (string | null)[] {
    let path = [d.key];
    let node = d.parent as SunBurstHierarchyNode | undefined;
    while (node && node.level >= 0) {
        path.push(node.key);
        node = node.parent;
    }
    return path.reverse();
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
                    warnings.push(resources.warningEmptyPath(row.categorical(hierarchyAxisName).formattedValue()));

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
                warnings.push(resources.warningNegativeValues);
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

    // If the color axis is continuous or empty, the coloring starts from the root.
    if (!colorAxis.parts.length || !colorAxis.isCategorical) {
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
        warnings.push(resources.warningSplittingColorAxis);
    }

    return coloringStartLevel;
}

function renderSettingsButton(
    mod: Mod,
    labels: ModProperty<string>,
    showNullValues: ModProperty<boolean>,
    interactionMode: ModProperty<string>,
    sortByValue: ModProperty<boolean>
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
                    if (event.name == "showNullValues") {
                        showNullValues.set(event.value);
                    }
                    if (event.name == "interactionMode") {
                        interactionMode.set(event.value);
                    }
                    if (event.name == "sortByValue") {
                        sortByValue.set(event.value);
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
                            value: "all",
                            checked: labels.value() == "all",
                            text: resources.popoutLabelsAll
                        }),
                        mod.controls.popout.components.radioButton({
                            enabled: true,
                            name: "labels",
                            value: "marked",
                            checked: labels.value() == "marked",
                            text: resources.popoutLabelsMarked
                        }),
                        mod.controls.popout.components.radioButton({
                            enabled: true,
                            value: "off",
                            name: "labels",
                            checked: labels.value() == "off",
                            text: resources.popoutLabelsNone
                        })
                    ]
                }),
                mod.controls.popout.section({
                    heading: resources.popoutInteractionModeHeading,
                    children: [
                        mod.controls.popout.components.radioButton({
                            enabled: true,
                            name: "interactionMode",
                            value: InteractionMode.mark,
                            checked: interactionMode.value() != InteractionMode.drilldown,
                            tooltip: resources.popoutInteractionModeMarkTooltip,
                            text: resources.popoutInteractionModeMark
                        }),
                        mod.controls.popout.components.radioButton({
                            enabled: true,
                            name: "interactionMode",
                            value: InteractionMode.drilldown,
                            checked: interactionMode.value() == InteractionMode.drilldown,
                            tooltip: resources.popoutInteractionModeDrillDownTooltip,
                            text: resources.popoutInteractionModeDrillDown
                        })
                    ]
                }),
                mod.controls.popout.section({
                    children: [
                        mod.controls.popout.components.checkbox({
                            enabled: true,
                            name: "showNullValues",
                            checked: showNullValues.value() || false,
                            text: resources.popoutShowNullValues
                        })
                    ]
                }),
                mod.controls.popout.section({
                    children: [
                        mod.controls.popout.components.checkbox({
                            enabled: true,
                            name: "sortByValue",
                            checked: sortByValue.value() || false,
                            text: resources.popoutSortByValue
                        })
                    ]
                })
            ]
        );
    };
}

function renderWarningsIcon(mod: Mod, warnings: string[]) {
    let warningButton = document.querySelector<HTMLElement>(".warnings");
    warningButton?.classList.toggle("visible", mod.getRenderContext().interactive && !!warnings.length);

    warningButton!.onmouseenter = () => {
        mod.controls.tooltip.show(resources.warningsTooltip(warnings));
    };
    warningButton!.onmouseleave = () => {
        mod.controls.tooltip.hide();
    };

    document.body.onclick = () => mod.controls.tooltip.hide();
}
