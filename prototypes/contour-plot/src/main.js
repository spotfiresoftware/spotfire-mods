/*
 * Copyright © 2020. TIBCO Software Inc.
 * This file is subject to the license terms contained
 * in the license file that is distributed with this file.
 */

// //@ts-check - Get type warnings from the TypeScript language server. Remove if not wanted.

/**
 * Get access to the Spotfire Mod API by providing a callback to the initialize method.
 * @param {Spotfire.Mod} mod - mod api
 */
Spotfire.initialize(async (mod) => {
    /**
     * Store the context.
     */
    const context = mod.getRenderContext();

    /**
     * Create the read function.
     */
    const reader = mod.createReader(
        mod.visualization.data(),
        mod.windowSize(),
        mod.visualization.axis("X"),
        mod.visualization.axis("Y"),
        mod.visualization.axis("Z"),
        mod.visualization.axis("Color"),
        mod.property("segments"),
        mod.property("smooth"),
        mod.property("showLines")
    );

    /**
     * Initiate the read loop
     */
    reader.subscribe(render);
    /**
     * @param {Spotfire.DataView} dataView
     * @param {Spotfire.Size} windowSize
     * @param {Spotfire.Axis} X
     * @param {Spotfire.Axis} Y
     * @param {Spotfire.Axis} Z
     * @param {Spotfire.Axis} Color
     * @param {Spotfire.AnalysisProperty<integer>} segments
     * @param {Spotfire.AnalysisProperty<integer>} smooth
     * @param {Spotfire.AnalysisProperty<boolean>} showLines

     */
    async function render(dataView, windowSize, xAxis, yAxis, zAxis, colorAxis, segments, smooth, showLines) {
        function segmentChangeHandler(e) {
            segments.set(e.target.value);
        }

        function smoothChangeHandler(e) {
            smooth.set(this.checked);
        }

        function showLineChangeHandler(e) {
            showLines.set(this.checked);
        }
        /**
         * Check the data view for errors
         */
        let errors = await dataView.getErrors();
        if (errors.length > 0) {
            // Showing an error overlay will hide the mod iframe.
            // Clear the mod content here to avoid flickering effect of
            // an old configuration when next valid data view is received.
            mod.controls.errorOverlay.show(errors);
            return;
        }
        mod.controls.errorOverlay.hide();

        /**
         * Print out to document
         */
        const container = document.querySelector("#mod-container");
        const segmentCountInput = document.getElementById("segment-input");
        segmentCountInput.addEventListener("change", segmentChangeHandler);
        const smoothInput = document.getElementById("smooth-input");
        smoothInput.addEventListener("change", smoothChangeHandler);
        const showLineInput = document.getElementById("showlines-input");
        showLineInput.addEventListener("change", showLineChangeHandler);

        // Space reserved for scales
        var margin = 32;
        // Space taken up by the control panel
        var margin_top = 50;

        var svgWindowSize = {
            width: windowSize.width,
            height: windowSize.height - margin_top
        };

        var svg = d3
            .create("svg")
            .attr("id", "chart-area")
            .attr("viewBox", [0, 0, windowSize.width, windowSize.height])
            .attr("width", windowSize.width)
            .attr("height", windowSize.height);

        var [xAxis, xScale] = await drawAxisX(svgWindowSize, margin, dataView);
        var [yAxis, yScale] = await drawAxisY(svgWindowSize, margin, dataView);
        svg.append("g").call(xAxis);
        svg.append("g").call(yAxis);

        await drawContour(mod, svg, dataView, xScale, yScale, svgWindowSize, margin, segments.value(), smooth.value(), showLines.value());

        var old_svg = document.getElementById("chart-area");
        if (old_svg) {
            container.removeChild(old_svg);
            segmentCountInput.removeEventListener("change", segmentChangeHandler);
            smoothInput.removeEventListener("change", smoothChangeHandler);
            showLineInput.removeEventListener("change", showLineChangeHandler);
        }
        container.appendChild(svg.node());
        document.getElementById("chart-area").addEventListener("click", (e) => {
            dataView.clearMarking();
        });

        context.signalRenderComplete();
    }
});
