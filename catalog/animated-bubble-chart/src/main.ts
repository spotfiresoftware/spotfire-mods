import { clearCanvas, render } from "./index";
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

                    await render(
                        dataView,
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
