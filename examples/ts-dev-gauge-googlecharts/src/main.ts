import { googleGauge } from "./visualization"; 
// Import the Spotfire module
import { Spotfire } from "./api"; 
// Import needed types
import { 
    DataView,
    Size,
	DataViewColorInfo
} from  "spotfire-api"

// Starting point for every mod
Spotfire.initialize(async api => {

    // Used later to inform Spotfire that the render is complete
    let context = api.getRenderContext();

    // Create a reader object that reacts only data and window size changes
    let read = api.reader(api.visualization.data(), api.visualization.windowSize());

    // Initialize the Google visualization 
    let gauge = await googleGauge();

    read(async function onChange(dataView: DataView, size: Size) {

        // Get all the dataview rows
        let rows = await dataView.getAllRows(); 

        // Transform the rows to the google visualization format.
        let data: [string, number][] = rows.map(row => [
            row.categorical("Category").getValue(),
            row.continuous<number>("Measurement").getValue() ?? 0
        ]);

        // Render the visualization using the transformed data 
        gauge.render(data, size);

        // Append color backdrop.
         // There is no color axis in the Mod so this will only add color to marked elements.
        let guages = document.getElementById("chart_div").getElementsByTagName("td");
        rows.forEach((row, index) => {
            guages[index].style.background = getRgbaColor(row.getColor(), 0.5);
        });

        // Inform Spotfire that the render is complete (needed for export)
        context.signalRenderComplete();

        // Wait for another change
        read(onChange);
    });
});

function getRgbaColor(color: DataViewColorInfo | null, alpha: number) {
    if (!color) {
        // When there is no color axis the color hexCode is null for unmarked rows. Using transparent in that case.
        return "rgba(0,0,0,0)";
    }

    let hex = color.hexCode;
    let r = hex.substring(1, 3);
    let g = hex.substring(3, 5);
    let b = hex.substring(5, 7);

    return `rgba(${parseInt(r, 16)},${parseInt(g, 16)},${parseInt(b, 16)},${alpha})`;
}
