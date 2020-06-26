//@ts-check - Get type warnings from the TypeScript language server. Remove if not wanted.

/**
 * Get access to the Spotfire Mod API by providing a callback to the initialize method.
 * @param {Spotfire.Mod} mod - mod api
 */
Spotfire.initialize(async (mod) => {
    /**
     * Create the read function - its behavior is similar to native requestAnimationFrame
     */
    const reader = mod.createReader(
        mod.visualization.data(),
        mod.windowSize(),
        mod.property("myProperty")
    );

    /**
     * Initiate the read loop
     */
    reader.subscribe(render);

    /**
     * @param {Spotfire.DataView} dataView
     * @param {Spotfire.Size} windowSize
     * @param {Spotfire.Property} prop
     */
    async function render(dataView, windowSize, prop) {
        /**
         * Get rows from dataView
         */
        const rows = await dataView.allRows(() => true);

        /**
         * Print out to document
         */
        const container = document.querySelector("#mod-container");

        container.innerHTML = "";
        printResult(`windowSize: ${windowSize.width}x${windowSize.height}`);
        printResult(printResult(`should render: ${rows.length} rows`));
        printResult(printResult(`${prop.name}: ${prop.value}`));

        function printResult(text) {
            let div = document.createElement("div");
            div.textContent = text;
            container.appendChild(div);
        }
    }
});
