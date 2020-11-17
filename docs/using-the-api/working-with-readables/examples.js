//@ts-check

// Replace the `subscribeExample` function to switch example
Spotfire.initialize(subscribeExample);

/**
 * Example of a subscribe callback with a 3 second sleep.
 * @param {Spotfire.Mod} mod
 */
async function subscribeExample(mod) {
    const reader = mod.createReader(mod.visualization.data());

    reader.subscribe(async function render(dataView) {
        log(
            "Subscribe callback invoked, ",
            (await dataView.allRows()).length,
            " rows. Start 3 seconds sleep."
        );

        await sleep(3000);

        log(
            "Render callback finished.",
            "Has the reader while the callback was executed: ",
            await reader.hasExpired()
        );
    });
}

/**
 * Example of once callback.
 * It will be ready to invoke the callback as soon as it has been scheduled again.
 * In contrast to the subscribe callback, it will not wait for the callback to be completed before it is invoked again.
 * @param {Spotfire.Mod} mod
 */
async function onceExample(mod) {
    let loopsRunning = 0;
    let count = 0;
    const reader = mod.createReader(mod.visualization.data());

    reader.once(async function render(dataView) {
        loopsRunning++;
        let id = ++count;

        await dataView.allRows();
        log(
            "Render callback invoked with id: " + id,
            ". Currently " + loopsRunning + " loops active.",
            "schedule once() again and start 3 seconds sleep."
        );

        reader.once(render);

        await sleep(3000);

        log("Render callback finished with id:" + id);

        loopsRunning--;
    });
}

/**
 * Example of DataView.hasExpired
 * Note: A transaction should not be done directly in a once/subscribe callback. It should be triggered by user action.
 * @param {Spotfire.Mod} mod
 */
async function hasExpiredExample(mod) {
    const reader = mod.createReader(mod.property("myProperty"));

    reader.once(async function render(prop) {
        log("Render callback invoked ", prop.value());

        mod.transaction(
            () => {
                prop.set("next value" + Math.random());
            },
            async () => {
                log(
                    "Transaction complete. Reader has expired: ",
                    await reader.hasExpired()
                );
            }
        );

        log("End of callback. Reader has expired: ", await reader.hasExpired());
    });
}

/**
 * Example of early return due to an expired reader.
 * @param {Spotfire.Mod} mod
 */
async function earlyReturnIfHasExpiredExample(mod) {
    const reader = mod.createReader(mod.property("myProperty"));

    document.body.onclick = () => {
        log("Set new value for myProperty ");
        mod.property("myProperty").set("next value" + Math.random());
    };

    reader.subscribe(async function slowRender(prop) {
        log("Slow render started ", prop.value());
        await sleep(3000);

        if (await reader.hasExpired()) {
            log("Reader has expired, return early to enter new loop");
            return;
        }

        await sleep(3000);

        log("End of slow rendering");
    });

    function sleep(ms) {
        return new Promise((res) => setTimeout(res, ms));
    }

    function log(...messages) {
        let div = document.createElement("div");
        div.textContent = messages.join(" ");
        document.body.appendChild(div);
        div.scrollIntoView();
    }
}

/**
 * Set up with a setup in a once callback and upcoming updates handled in a subscribe callback.
 * @param {Spotfire.Mod} mod
 */
async function setupInOnceExample(mod) {
    const setupReader = mod.createReader(
        mod.visualization.data(),
        mod.windowSize(),
        mod.property("myProperty")
    );

    setupReader.once((dv, size, prop) => {
        log("All values are read", prop.value());

        const propertyReader = mod.createReader(mod.property("myProperty"));
        propertyReader.subscribe((myProperty) => {
            log("Property has changed to", myProperty.value());
        });

        const renderReader = mod.createReader(
            mod.visualization.data(),
            mod.windowSize()
        );
        renderReader.subscribe(async function render(dataView, windowSize) {
            log("Render", (await dataView.allRows()).length, windowSize.height);
        });

        setInterval(() => prop.set("New value" + Math.random()), 2000);
    });
}

/**
 * Set up with a setup in a once callback and upcoming updates handled in a subscribe callback.
 * @param {Spotfire.Mod} mod
 */
async function setupInOnceExample(mod) {
    const setupReader = mod.createReader(
        mod.visualization.data(),
        mod.windowSize(),
        mod.property("myProperty")
    );

    setupReader.once((dv, size, prop) => {
        log("All values are read", prop.value());

        const propertyReader = mod.createReader(mod.property("myProperty"));
        propertyReader.subscribe((myProperty) => {
            log("Property has changed to", myProperty.value());
        });

        const renderReader = mod.createReader(
            mod.visualization.data(),
            mod.windowSize()
        );
        renderReader.subscribe(async function render(dataView, windowSize) {
            log("Render", (await dataView.allRows()).length, windowSize.height);
        });

        setInterval(() => prop.set("New value" + Math.random()), 2000);
    });
}

/**
 * Example of reading a property
 * @param {Spotfire.Mod} mod
 */
async function whatChangedExample(mod) {
    let reader = readerWithChangeChecker(
        mod.createReader(
            mod.visualization.data(),
            mod.windowSize(),
            mod.property("myProperty")
        )
    );

    reader.subscribe(async (dataview, size, prop) => {
        console.log("Dataview", reader.hasValueChanged(dataview));
        console.log("size", reader.hasValueChanged(size));
        console.log("property", reader.hasValueChanged(prop));
        await dataview.allRows();
        setTimeout(() => prop.set("New value" + Math.random()), 2000);
    });

    /**
     * Wrap a reader with an additional method called `hasChanged`.
     * It allows you to check whether a value is new or unchanged since the last time the subscribe loop was called.
     * @function
     * @template A
     * @param {A} reader
     * @returns {A & {hasValueChanged(value: any):boolean}}
     */
    function readerWithChangeChecker(reader) {
        let previousValues = [];
        let currentValues = [];
        function compareWithPreviousValues(cb) {
            return function compareWithPreviousValues(...values) {
                previousValues = currentValues;
                currentValues = values;
                return cb(...values);
            };
        }

        return {
            ...reader,
            subscribe(cb) {
                // @ts-ignore
                reader.subscribe(compareWithPreviousValues(cb));
            },
            hasValueChanged(value) {
                return previousValues.indexOf(value) == -1;
            }
        };
    }
}


/**
 * Example of reading a property
 * @param {Spotfire.Mod} mod
 */
async function readPropertyExample(mod) {
    // This does not fetch any value from the server
    const myPropertyReadable = mod.property("myProperty");
    console.log(myPropertyReadable);

    // This fetches the latest value from the server.
    const myProperty = await mod.property("myProperty");

    console.log(myProperty);
}


function sleep(ms) {
    return new Promise((res) => setTimeout(res, ms));
}

function log(...messages) {
    let div = document.createElement("div");
    div.textContent = messages.join(" ");
    document.body.appendChild(div);
    div.scrollIntoView();
}
