import { createRoot } from "react-dom/client";
import { App } from "./App";
import { flushSync } from "react-dom";

const container = document.querySelector<HTMLDivElement>("#mod-container")!;
const root = createRoot(container);

Spotfire.initialize(async (mod: Spotfire.Mod) => {
    const reader = mod.createReader(mod.visualization.data(), mod.windowSize(), mod.property("myProperty"));
    const context = mod.getRenderContext();

    reader.subscribe(render);

    async function render(dataView: Spotfire.DataView, windowSize: Spotfire.Size, prop: Spotfire.ModProperty<string>) {
        const errors = await dataView.getErrors();
        if (errors.length > 0) {
            mod.controls.errorOverlay.show(errors);
            return;
        }
        mod.controls.errorOverlay.hide();

        const xHierarchy = await dataView.hierarchy("X");
        if (!xHierarchy) {
            mod.controls.errorOverlay.show("Cannot find hierarchy in data view for axis 'X'.");
            return;
        }
        const xRoot = await xHierarchy.root();

        if (xRoot == null) {
            return;
        }

        // Use flushSync so that we know rendering has completed after this call and we can signal render complete.
        flushSync(() => {
            root.render(<App xRoot={xRoot} windowSize={windowSize} prop={prop} />);
        });

        context.signalRenderComplete();
    }
});
