/*
 * Copyright © 2023. Cloud Software Group, Inc.
 * This file is subject to the license terms contained
 * in the license file that is distributed with this file.
 */

import { findElem, maxInList } from "./util";
import { Size } from "spotfire-api";

const visualizationElementId = "#chart_div";

/**
 * This function loads the google gauge visualization asynchronously and returns an API with a render function.
 */
export function googleGauge(): Promise<{ render: typeof render; clear: () => void; element: HTMLElement }> {
    let chart: google.visualization.LineChart;
    let element = findElem(visualizationElementId);

    return new Promise((resolve) => {
        google.charts.load("current", { packages: ["gauge"] });
        google.charts.setOnLoadCallback(() => {
            chart = new (google.visualization as any).Gauge(element);
            // Resolve the promise when the charting library is loaded.
            resolve({
                render,
                clear,
                element
            });
        });
    });

    /** Render the visualization */
    function render(data: [string, number][], size: Size) {
        let maxValue = maxInList(data);

        let options = {
            width: size.width,
            height: size.height,
            redFrom: maxValue * 0.9,
            redTo: maxValue,
            yellowFrom: maxValue * 0.75,
            yellowTo: maxValue * 0.9,
            max: maxValue
        };

        let dataTable = google.visualization.arrayToDataTable([["Label", "Value"], ...data]);

        chart.draw(dataTable, options);
    }

    /** Clear the visualization */
    function clear() {
        render([], { width: 0, height: 0 });
    }
}
