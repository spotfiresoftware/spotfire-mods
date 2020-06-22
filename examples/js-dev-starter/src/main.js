//@ts-check - Get type warnings from the TypeScript language server. Remove if not wanted.

/**
 * Get access to the Spotfire Mod API by providing a callback to the initialize method.
 * @param {Spotfire.Mod} mod - mod api
 */
Spotfire.initialize(async mod => {
    /**
     * Create the read function - its behavior is similar to native requestAnimationFrame
     */
    const readerLoop = mod.reader(
        mod.visualization.data(),
        mod.visualization.windowSize(),
        mod.visualization.property("myProperty")
    );

    /**
     * Initiate the read loop
     */
    readerLoop(async function onChange(dataView, windowSize, prop) {
        await render(dataView, windowSize, prop);
        readerLoop(onChange);
    });

    /**
     * @param {Spotfire.DataView} dataView
     * @param {Spotfire.Size} windowSize
     * @param {Spotfire.Property} prop
     */
    async function render(dataView, windowSize, prop) {

        /**
         * Get rows from dataView
         */
        const rows = await dataView.getAllRows();

        /**
         * Print out to document
         */
        const container = document.querySelector("#mod-container");
        container.innerHTML += `windowSize: ${windowSize.width}x${windowSize.height}<br/>`;
        container.innerHTML += `should render: ${rows.length} rows<br/>`;
        container.innerHTML += `${prop.name}: ${prop.value}`;
    }
});
