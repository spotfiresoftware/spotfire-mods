/*
 * Copyright © 2020. TIBCO Software Inc.
 * This file is subject to the license terms contained
 * in the license file that is distributed with this file.
 */

import { googleGauge } from "./visualization";
// Import the Spotfire module
import { Spotfire } from "./api";
// Import needed types

// Starting point for every mod
Spotfire.initialize(async api => {
    // Used later to inform Spotfire that the render is complete
    let context = api.getRenderContext();

    // Create a reader object that reacts only data and window size changes
    let reader = api.createReader(api.visualization.data(), api.windowSize());

    // Initialize the Google visualization
    let gauge = await googleGauge();

    reader.subscribe(async function render(dataView, size) {
        let errors = await dataView.getErrors();
        if (errors.length > 0) {
            // Data view contains errors. Display these and clear the chart to avoid
            // getting a flickering effect with an old chart configuration later.
            api.controls.errorOverlay.show(errors, "DataView");
            gauge.clear();
            return;
        }

        api.controls.errorOverlay.hide("DataView");
        let rows = await dataView.allRows();
        if (rows == null) {
            // Return and wait for next call to render when reading data was aborted.
            // Last rendered data view is still valid from a users perspective since
            // a document modification was made during an progress indication.
            return;
        }

        // Transform the rows to the google visualization format.
        let data: [string, number][] = rows.map(row => [
            row.categorical("Category").formattedValue(),
            row.continuous("Measurement").value() ?? 0
        ]);

        // Render the visualization using the transformed data
        gauge.render(data, size);

        // Add marking highlight using the marking color, if marking is enabled.
        let marking = await dataView.marking();
        let gauges = gauge.element.getElementsByTagName("td");
        rows.forEach((row, index) => {
            gauges[index].style.background =
                row.isMarked() && marking
                    ? "radial-gradient(" + marking.colorHexCode + " 50%, transparent 100%)"
                    : "transparent";
        });

        // Inform Spotfire that the render is complete (needed for export)
        context.signalRenderComplete();
    });
});
