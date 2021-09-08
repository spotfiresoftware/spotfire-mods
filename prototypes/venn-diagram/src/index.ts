import { DataView } from "spotfire-api";
import { generalErrorHandler } from "./generalErrorHandler";

const Spotfire = window.Spotfire;

export interface RenderState {
    preventRender: boolean;
}

Spotfire.initialize(async (mod) => {
    const context = mod.getRenderContext();

    const reader = mod.createReader(mod.visualization.data(), mod.windowSize());

    reader.subscribe(generalErrorHandler(mod)(onChange));

    /**
     * The function that is part of the main read-render loop.
     * It checks for valid data and will print errors in case of bad data or bad renders.
     * It calls the listener (reader) created earlier and adds itself as a callback to complete the loop.
     * @param {Spotfire.DataView} dataView
     * @param {Spotfire.Size} windowSize
     * @param {ModProperty<string>} curveType
     */
    async function onChange(dataView: DataView, windowSize: Spotfire.Size) {
        console.log(dataView, windowSize);
        
        context.signalRenderComplete();
    }
});
