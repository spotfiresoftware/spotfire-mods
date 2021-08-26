import { hierarchyAxisName, render } from "./sunburst";
import { Axis } from "spotfire-api";
import { generalErrorHandler } from "./generalErrorHandler";

window.Spotfire.initialize(async (mod) => {
    const context = mod.getRenderContext();

    const reader = mod.createReader(
        mod.visualization.data(),
        mod.windowSize(),
        mod.visualization.axis("Hierarchy"),
        mod.visualization.axis("Color"),
        mod.visualization.axis("Size")
    );

    reader.subscribe(
        generalErrorHandler(
            mod,
            10000
        )(async (dataView, windowSize, hierarchyAxis, colorAxis, sizeAxis) => {
            const coloringFromLevel = getColoringStartLevel(colorAxis, hierarchyAxis);
            const rootNode = await (await dataView.hierarchy(hierarchyAxisName))?.root()!;
            const hasSizeExpression = !!sizeAxis.expression;

            render(dataView, windowSize, rootNode!, hasSizeExpression, coloringFromLevel);
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
