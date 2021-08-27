import { render, SunBurstSettings } from "./sunburst";
import { Axis, DataViewHierarchyNode, DataViewRow } from "spotfire-api";
import { generalErrorHandler } from "./generalErrorHandler";
import * as d3 from "d3";

window.Spotfire.initialize(async (mod) => {
    const context = mod.getRenderContext();

    const hierarchyAxisName = "Hierarchy";
    const sizeAxisName = "Size";

    const reader = mod.createReader(
        mod.visualization.data(),
        mod.windowSize(),
        mod.visualization.axis(hierarchyAxisName),
        mod.visualization.axis("Color"),
        mod.visualization.axis(sizeAxisName)
    );

    reader.subscribe(
        generalErrorHandler(
            mod,
            10000
        )(async (dataView, windowSize, hierarchyAxis, colorAxis, sizeAxis) => {
            const hasSizeExpression = !!sizeAxis.expression;
            const rootNode = await (await dataView.hierarchy(hierarchyAxisName))?.root()!;

            if (!rootNode) {
                return;
            }

            const coloringFromLevel = getColoringStartLevel(rootNode, colorAxis, hierarchyAxis);

            const getSize = (r: DataViewRow) =>
                hasSizeExpression ? r.continuous(sizeAxisName).value<number>() || 0 : 1;

            let hierarchy = d3.hierarchy(rootNode).sum((d) => {
                return !d!.children ? d!.rows().reduce((p, c) => p + getSize(c), 0) : 0;
            });

            let totalSize = rootNode.rows().reduce((p: number, c: DataViewRow) => p + getSize(c), 0);

            const settings: SunBurstSettings = {
                containerSelector: "#mod-container",
                size: windowSize,
                totalSize: totalSize,
                markingStroke: context.styling.scales.font.color,
                clearMarking: dataView.clearMarking,
                mark(node: DataViewHierarchyNode) {
                    node.mark();
                },
                getFill(node: DataViewHierarchyNode) {
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

                    let firstMarkedRow = node.rows().findIndex((r) => r.isMarked());
                    if (firstMarkedRow == -1) {
                        firstMarkedRow = 0;
                    }

                    return node.rows()[firstMarkedRow].color().hexCode;
                },
                getLabel(node: DataViewHierarchyNode, availablePixels: number) {
                    let label = node.formattedValue();
                    if (label.length > availablePixels / 15) {
                        return label.slice(0, availablePixels / 15 - 3) + "...";
                    }

                    return label;
                },
                onMouseover(node: DataViewHierarchyNode) {
                    mod.controls.tooltip.show(node.formattedPath());
                },
                onMouseLeave: mod.controls.tooltip.hide
            };

            render(hierarchy, settings);

            context.signalRenderComplete();
        })
    );
});

/**
 * Get the coloring start level. This is the level where all rows for the child nodes share coloring.
 * @param colorAxis - The color axis.
 * @param hierarchyAxis The hierarchy axis.
 * @returns The level from which to start coloring in the sunburst chart.
 */
function getColoringStartLevel(rootNode: DataViewHierarchyNode, colorAxis: Axis, hierarchyAxis: Axis) {
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
        throw "Coloring could not be applied. The expression on the color axis must be included on the hierarchy axis.";
    }

    return coloringStartLevel;
}
