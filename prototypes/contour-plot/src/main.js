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
        mod.property("showLines"),
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
        const { popout } = mod.controls;
        function showPopout(e) {
            popout.show(
                {
                    x: e.x,
                    y: e.y,
                    autoClose: true,
                    alignment: "Bottom",
                    onChange: popoutChangeHandler
                },
                popoutContent
            );
        }

        const { section } = popout;
        const { checkbox } = popout.components;
        const popoutContent = () => [
            section({
                heading: "Contour Plot Settings",
                children: [
                    checkbox({
                        name: "smooth",
                        text: "Enable smoothing",
                        checked: smooth.value(),
                        enabled: true
                    }),
                    checkbox({
                        name: "showLines",
                        text: "Show contour lines",
                        checked: showLines.value(),
                        enabled: true
                    }),
                ]
            })
        ];

        function popoutChangeHandler({name, value}) {
            if (name === "showLines") {
                showLines.set(value);
            }
            if (name === "smooth") {
                smooth.set(value);
            }
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

        // Space reserved for scales
        var margin = 40;

        var svg = d3
            .create("svg")
            .attr("viewBox", [0, 0, windowSize.width, windowSize.height])
            .attr("width", windowSize.width)
            .attr("height", windowSize.height);

        var xAxis = await drawAxisX(windowSize, margin, dataView);
        var yAxis = await drawAxisY(windowSize, margin, dataView);
        svg.append("g").call(xAxis);
        svg.append("g").call(yAxis);

        let contours, color;
        await drawContour(svg, dataView, windowSize, margin, segments.value(), smooth.value(), showLines.value());

        //&container.children.clear();
        container.innerHTML = "";
        container.appendChild(svg.node());
        container.addEventListener("click", (e) => {
            dataView.clearMarking();
            showPopout(e, showLines);
        });

        context.signalRenderComplete();
    }
});
