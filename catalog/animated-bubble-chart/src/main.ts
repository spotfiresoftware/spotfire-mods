import { DataViewRow } from "spotfire-api";
import { AnimationControl } from "./animationControl";
import { Bubble, clearCanvas, render } from "./index";
import { tooltip } from "./modutils";
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

    let animationControl = new AnimationControl(animationSpeedProperty);

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
            try {
                const errors = await dataView.getErrors();
                if (errors.length > 0) {
                    clearCanvas();
                    mod.controls.errorOverlay.show(errors, "DataView");
                } else {
                    mod.controls.errorOverlay.hide("DataView");

                    const hasX = !!(await dataView.continuousAxis("X"));
                    const hasY = !!(await dataView.continuousAxis("Y"));
                    const hasSize = !!(await dataView.continuousAxis("Size"));

                    let animateLeaves =
                        (
                            await (
                                await dataView.hierarchy("AnimateBy")
                            )?.root()
                        )?.leaves() || [];

                    let frames = animateLeaves.map((leaf) => ({
                        name: leaf.formattedValue(),
                        bubbleFactory: () =>
                            leaf
                                .rows()
                                .filter(rowFilter)
                                .sort(sortContinuousAxis("Size"))
                                .map(rowToBubble),
                    }));

                    function rowToBubble(row: DataViewRow): Bubble {
                        let tooltipText: string;
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
                            mark(toggle?: boolean) {
                                row.leafNode("MarkerBy")?.mark(
                                    toggle ? "ToggleOrAdd" : "Replace"
                                );
                            },
                            get tooltip() {
                                if (!tooltipText) {
                                    tooltipText = tooltip(row, axes);
                                }

                                return tooltipText;
                            },
                        };
                    }

                    let scales = await minMax(["X", "Y", "Size"]);

                    animationControl.speed(
                        context.interactive ? animationSpeed.value()! : 0
                    );
                    animationControl.update(frames, (a) => {
                        return render(
                            dataView,
                            scales,
                            a,
                            windowSize,
                            mod,
                            !!showLabels.value(),
                            !!xLogScale.value(),
                            !!yLogScale.value(),
                            createLabelPopout(
                                mod.controls,
                                showLabels,
                                xLogScale,
                                yLogScale
                            )
                        );
                    });

                    context.signalRenderComplete();

                    mod.controls.errorOverlay.hide("General");

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
                            hasSize
                                ? (b.continuous<number>(axisName).value() ||
                                      0) -
                                  (a.continuous<number>(axisName).value() || 0)
                                : 1;
                    }

                    async function minMax<T extends ReadonlyArray<string>>(
                        axisNames: T
                    ): Promise<{
                        X: { min: number; max: number };
                        Y: { min: number; max: number };
                        Size: { min: number; max: number };
                    }> {
                        let scales: {
                            [K: string]: { min: number; max: number };
                        } = {};
                        let m: {
                            [K: string]: { min: number; max: number };
                        } = {};

                        let exists = await Promise.all(
                            axisNames.map(async (a) =>
                                dataView.continuousAxis(a)
                            )
                        );

                        for (const a of axisNames) {
                            scales[a] = { min: 0, max: 0 };
                            m[a] = { min: Infinity, max: -Infinity };
                        }

                        for (const row of (
                            (await dataView.allRows()) || []
                        ).filter(rowFilter)) {
                            for (const a of exists) {
                                if (a) {
                                    let v =
                                        row
                                            .continuous<number>(a.name)
                                            .value() || 0;
                                    const name = a.name;
                                    if (v < m[name].min) {
                                        m[name].min = v;
                                    }

                                    if (v > m[name].max) {
                                        m[name].max = v;
                                    }
                                }
                            }
                        }

                        for (const a of exists) {
                            if (a) {
                                const name = a.name;

                                scales[name].min = m[name].min;
                                scales[name].max = m[name].max;
                            }
                        }

                        return scales as any;
                    }
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
