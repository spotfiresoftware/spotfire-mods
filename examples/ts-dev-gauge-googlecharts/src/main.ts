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
    let reader = api.createReader(
        api.visualization.data(),
        api.windowSize()
    );

    // Initialize the Google visualization
    let gauge = await googleGauge();

    reader.subscribe(async function onChange(dataView, size) {
        // Get all the dataview rows
        let rows = await dataView.allRows();

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
