import { DataViewRow } from "spotfire-api";
import { Bubble, clearCanvas, render } from "./index";
import { continueOnIdle } from "./interactionLock";
import { createLabelPopout } from "./popout";

window.Spotfire.initialize(async (mod) => {
    const context = mod.getRenderContext();

    const animationSpeedProperty = mod.property<number>("animationSpeed");
    /**
     * Create reader function which is actually a one time listener for the provided values.
     */
    const reader = mod.createReader(
        mod.visualization.data(),
        mod.windowSize(),
        mod.property<boolean>("showLabels"),
        mod.property<boolean>("xLogScale"),
        mod.property<boolean>("yLogScale"),
        animationSpeedProperty,
        mod.visualization.axis("X"),
        mod.visualization.axis("Y"),
        mod.visualization.axis("Color"),
        mod.visualization.axis("MarkerBy"),
        mod.visualization.axis("Size")
    );

    /**
     * Creates a function that is part of the main read-render loop.
     * It checks for valid data and will print errors in case of bad data or bad renders.
     * It calls the listener (reader) created earlier and adds itself as a callback to complete the loop.
     */
    reader.subscribe(
        async (
            dataView,
            windowSize,
            showLabels,
            xLogScale,
            yLogScale,
            animationSpeed,
            ...axes
        ) => {
            await continueOnIdle();

            try {
                const errors = await dataView.getErrors();
                if (errors.length > 0) {
                    clearCanvas();
                    mod.controls.errorOverlay.show(errors, "DataView");
                } else {
                    mod.controls.errorOverlay.hide("DataView");
                    mod.controls.errorOverlay.hide("General");

                    const hasX = !!(await dataView.continuousAxis("X"));
                    const hasY = !!(await dataView.continuousAxis("Y"));
                    const hasSize = !!(await dataView.continuousAxis("Size"));

                    async function minMax(axisName: string) {
                        if (!(await dataView.continuousAxis(axisName))) {
                            return { min: 0, max: 0 };
                        }

                        let min = Infinity;
                        let max = -Infinity;

                        for (const row of (await dataView.allRows()) || []) {
                            let v =
                                row.continuous<number>(axisName).value() || 0;
                            if (v < min) {
                                min = v;
                            }

                            if (v > max) {
                                max = v;
                            }
                        }

                        return { min, max };
                    }

                    let animateLeaves =
                        (
                            await (
                                await dataView.hierarchy("AnimateBy")
                            )?.root()
                        )?.leaves() || [];

                    let bubbles = animateLeaves[0]
                        .rows()
                        .filter(rowFilter)
                        .sort(sortContinuousAxis("Size"))
                        .map(rowToBubble);

                    /** Filter out rows that can't be visualized.
                     * This includes null values and 0 for log scales */
                    function rowFilter(row: Spotfire.DataViewRow) {
                        if (
                            !hasX ||
                            (xLogScale && !row.continuous("X").value()) ||
                            row.continuous("X").value() == null
                        ) {
                            return false;
                        }

                        if (
                            !hasY ||
                            (yLogScale && !row.continuous("Y").value()) ||
                            row.continuous("Y").value() == null
                        ) {
                            return false;
                        }

                        return true;
                    }

                    /**
                     * Sort large bubbles at the back
                     */
                    function sortContinuousAxis(
                        axisName: string
                    ): (a: DataViewRow, b: DataViewRow) => number {
                        return (a, b) =>
                            (b.continuous<number>(axisName).value() || 0) -
                            (a.continuous<number>(axisName).value() || 0);
                    }

                    function rowToBubble(row: DataViewRow): Bubble {
                        return {
                            id: row.elementId(false, ["AnimateBy"]),
                            x: hasX
                                ? row.continuous<number>("X").value() || 0
                                : 0,
                            y: hasY
                                ? row.continuous<number>("Y").value() || 0
                                : 0,
                            size: hasSize
                                ? row.continuous<number>("Size").value() || 0
                                : 0,
                            label: row.leafNode("MarkerBy")!.formattedPath(),
                            isMarked: row.isMarked(),
                            color: row.color().hexCode,
                            mark() {},
                        };
                    }

                    let scales = {
                        x: await minMax("X"),
                        y: await minMax("Y"),
                        size: await minMax("Size"),
                    };

                    await render(
                        dataView,
                        bubbles,
                        scales,
                        true,
                        windowSize,
                        axes,
                        mod,
                        !!showLabels.value(),
                        !!xLogScale.value(),
                        !!yLogScale.value(),
                        animationSpeedProperty,
                        animationSpeed.value() || 1000,
                        createLabelPopout(
                            mod.controls,
                            showLabels,
                            xLogScale,
                            yLogScale
                        )
                    );

                    context.signalRenderComplete();

                    mod.controls.errorOverlay.hide("General");
                }
            } catch (e: any) {
                console.error(e);
                mod.controls.errorOverlay.show(
                    e.message ||
                        "☹️ Something went wrong, check developer console",
                    "General"
                );
            }
        }
    );
});
