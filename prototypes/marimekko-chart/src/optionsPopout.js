/**
 * Function initializes the popout and sets/creates and updates the components for the settings popout given the property
 * @param {Spotfire.Mod} mod
 * @param {Spotfire.ModProperty<string>} labelMode
 * @param {Spotfire.ModProperty<boolean>} chartMode
 * @param {Spotfire.ModProperty<boolean>} labelBars
 * @param {Spotfire.ModProperty<boolean>} labelSeg
 * @param {Spotfire.ModProperty<boolean>} numeric
 * @param {Spotfire.ModProperty<boolean>} percentage
 * @param {Spotfire.ModProperty<boolean>} reverse
 * @param {Spotfire.ModProperty<boolean>} sort
 * @param {Spotfire.ModProperty<boolean>} category
 */
 function initializeSettingsPopout(mod, labelMode, chartMode, labelBars, labelSeg, numeric, percentage, reverse, sort, category) {
    const tooltip = mod.controls.tooltip;
    const popout = mod.controls.popout;
    const factory = popout.components;
    const section = popout.section;

    // Select the dom-container
    const modContainer = d3.select("#mod-container");

    // Select the settings icon svg and set the default opacity
    const settingsIcon = modContainer.select("#settings-icon");

    // Set the onclick behaviour for the icon
    settingsIcon.node().onclick = (e) => {
        
        tooltip.hide();
        popout.show(
            {
                x: e.x,
                y: e.y + 5,
                alignment: "Top",
                autoClose: true,
                // Track the change events and update the mod-properties and component properties values
                onChange: (e) => {
                    if (e.name === "label-mode") {
                        labelMode.set(e.value);
                    } else if (e.name === "chart") {
                        chartMode.set(e.value);
                    } else if (e.name === "label-bars") {
                        labelBars.set(e.value);
                    }  else if (e.name === "label-segment") {
                        labelSeg.set(e.value);
                    } else if (e.name === "sort") {
                        sort.set(e.value);
                    } else if (e.name === "reverse") {
                        reverse.set(e.value);
                    } else if (e.name === "numeric") {
                        numeric.set(e.value);
                    } else if (e.name === "percentage") {
                        percentage.set(e.value);
                    } else if (e.name === "category") {
                        category.set(e.value);
                    } 
                }
            },
            // Pass the popout sectors the the mod by creating the components with the assigned properties
            () => createPopoutComponents()
        );
    };

    /**
     * Function creates and sets the popout components sections by given properties values object and returns the array with sections
     * @return {PopoutSection[]} popout section components
     */
    function createPopoutComponents() {
        return [
            section({
                heading: "Appeareance",
                children: [
                    factory.radioButton({
                        name: "chart",
                        text: "Marimekko Chart",
                        value: false,
                        checked: chartMode.value() === false
                    }),
                    factory.radioButton({
                        name: "chart",
                        text: "Mekko Chart",
                        value: true,
                        checked: chartMode.value() === true
                    }),
                ]
            }),
            section({
                children: [
                    factory.checkbox({
                        name: "sort",
                        text: "Sort bars by value",
                        checked: sort.value() === true,
                        enabled: true
                    }),
                    factory.checkbox({
                        name: "reverse",
                        text: "Reverse scale",
                        checked: reverse.value() === true,
                        enabled: true
                    })
                ]
            }),
            section({
                heading: "Show labels for",
                children: [
                    factory.radioButton({
                        name: "label-mode",
                        text: "All",
                        value: "all",
                        checked: labelMode.value() === "all"
                    }),
                    factory.radioButton({
                        name: "label-mode",
                        text: "None",
                        value: "none",
                        checked: labelMode.value() === "none"
                    }),
                    factory.radioButton({
                        name: "label-mode",
                        text: "Marked",
                        value: "marked",
                        checked: labelMode.value() === "marked"
                    }),
                    factory.checkbox({
                        name: "label-bars",
                        text: "Bars",
                        checked: labelBars.value() === true,
                        enabled: true
                    }),
                    factory.checkbox({
                        name: "label-segment",
                        text: "Segments",
                        checked: labelSeg.value() === true,
                        enabled: true
                    })
                ]
            }),
            section({
                heading: "Label contains",
                children: [
                    factory.checkbox({
                        name: "category",
                        text: "Category",
                        checked: category.value() === true,
                        enabled: true
                    }),
                    factory.checkbox({
                        name: "numeric",
                        text: "Numeric Value",
                        checked: numeric.value() === true,
                        enabled: true
                    }),
                    factory.checkbox({
                        name: "percentage",
                        text: "Percentages",
                        checked: percentage.value() === true,
                        enabled: true
                    })
                ]
            })
        ];
    }

    settingsIcon.transition("add labels").duration(250).style("opacity", "1");

    // Control the visibility of the popout based on the user's mouse
    modContainer
        .on("mouseover", function () {
            settingsIcon.style("opacity", "1").style("visibility", "visible");
        })
        .on("mouseleave", function () {
            settingsIcon.style("opacity", "0").style("visibility", "hidden");
        });
}