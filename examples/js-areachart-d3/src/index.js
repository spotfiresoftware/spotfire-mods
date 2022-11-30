/*
 * Copyright © 2023. Cloud Software Group, Inc.
 * This file is subject to the license terms contained
 * in the license file that is distributed with this file.
 */

//@ts-check

// Manually import the array polyfills because the API is using functions not supported in IE11.
import "core-js/es/array";
import { render } from "./render.js";

const Spotfire = window.Spotfire;
const DEBUG = false;

Spotfire.initialize(async (mod) => {
    /**
     * Read metadata and write mod version to DOM
     */
    const modMetaData = mod.metadata;
    console.log("Mod version:", modMetaData.version ? "v" + modMetaData.version : "unknown version");

    /**
     * Initialize render context - should show 'busy' cursor.
     * A necessary step for printing (another step is calling render complete)
     */
    const context = mod.getRenderContext();

    /**
     * Create reader function which is actually a one time listener for the provided values.
     * @type {Spotfire.Reader}
     */
    const reader = mod.createReader(
        mod.visualization.data(),
        mod.windowSize(),
        mod.property("chartType"),
        mod.property("roundedCurves"),
        mod.property("gapfill")
    );

    /**
     * Create a persistent state used by the rendering code
     */
    const state = {};

    /**
     * Initiates the read-render loop
     */
    reader.subscribe(onChange);

    /**
     * The function that is part of the main read-render loop.
     * It checks for valid data and will print errors in case of bad data or bad renders.
     * It calls the listener (reader) created earlier and adds itself as a callback to complete the loop.
     * @param {Spotfire.DataView} dataView
     * @param {Spotfire.Size} windowSize
     * @param {Spotfire.AnalysisProperty<string>} chartType
     * @param {Spotfire.AnalysisProperty<boolean>} roundedCurves
     * @param {Spotfire.AnalysisProperty<boolean>} gapfill
     */
    async function onChange(dataView, windowSize, chartType, roundedCurves, gapfill) {
        try {
            await render(state, mod, dataView, windowSize, chartType, roundedCurves, gapfill);

            context.signalRenderComplete();

            // Everything went well this time. Clear any error.
            mod.controls.errorOverlay.hide("catch");
        } catch (e) {
            mod.controls.errorOverlay.show(
                e.message || e || "☹️ Something went wrong, check developer console",
                "catch"
            );
            if (DEBUG) {
                throw e;
            }
        }
    }
});
