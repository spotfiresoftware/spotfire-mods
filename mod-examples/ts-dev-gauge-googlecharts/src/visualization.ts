import { findElem, maxInList } from "./util";
import { Size } from "spotfire-api";

const visualizationElementId = "#chart_div";

/**
 * This function loads the google gauge visualization asynchronously and returns an API with a render function.
 */
export function googleGauge(): Promise<{ render: typeof render }> {
    let chart: google.visualization.LineChart;

    return new Promise(resolve => {
        google.charts.load("current", { packages: ["gauge"] });
        google.charts.setOnLoadCallback(() => {
            chart = new (google.visualization as any).Gauge(findElem(visualizationElementId));
            // Resolve the promise when the charting library is loaded.
            resolve({
                render
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
}


