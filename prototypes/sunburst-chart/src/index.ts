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
            const coloringFromLevel = getColoringStartLevel(colorAxis, hierarchyAxis);
            const hasSizeExpression = !!sizeAxis.expression;
            const rootNode = await (await dataView.hierarchy(hierarchyAxisName))?.root()!;

            if (!rootNode) {
                return;
            }

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
                        return "#ddd"; // TODO Other color when part of marking?
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
                }
            };

            render(hierarchy, settings);

            context.signalRenderComplete();
        })
    );
});

/**
 * Get the coloring start level by matching the color axis expression with the hierarchy axis.
 * @param colorAxis - The color axis.
 * @param hierarchyAxis The hierarchy axis.
 * @returns The level from which to start coloring in the sunburst chart.
 */
function getColoringStartLevel(colorAxis: Axis, hierarchyAxis: Axis) {
    let coloringStartLevel = 0;

    // If the color axis is continuous or empty the coloring starts from the root.
    if (!colorAxis.isCategorical || !colorAxis.parts.length) {
        return 0;
    }

    // Multiple expressions will yield misguiding color results in the plot.
    if (colorAxis.parts.length > 1) {
        throw "The color axis can only be one level";
    }

    // Find the matching expression in the hierarchy axis and use its level as a starting point for the coloring.
    coloringStartLevel = hierarchyAxis.parts.findIndex((p1) => colorAxis.parts[0].expression == p1.expression);

    if (coloringStartLevel == -1) {
        throw "All expressions of the Color axis must also be part of the hierarchy axis";
    }

    return coloringStartLevel;
}
