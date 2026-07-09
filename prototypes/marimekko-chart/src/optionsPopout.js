/**
 * Function initializes the popout and sets/creates and updates the components for the settings popout given the property
 * @param {Spotfire.Mod} mod
 * @param {*} modProperty
 */
 function initializeSettingsPopout(mod, modProperty) {
    const tooltip = mod.controls.tooltip;
    const popout = mod.controls.popout;
    const factory = popout.components;
    const section = popout.section;
    const { xAxisMode, 
        chartMode,
        titleMode, 
        labelMode,
        labelBars,
        labelSeg,
        numeric,
        percentage,
        category,
        reverseBars,
        reverseSeg,
        sortBar,
        sortSeg } = modProperty;

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
                    } else if (e.name === "title-mode") {
                        titleMode.set(e.value);
                    } else if (e.name === "label-bars") {
                        labelBars.set(e.value);
                    }  else if (e.name === "label-segment") {
                        labelSeg.set(e.value);
                    } else if (e.name === "sort-bar") {
                        sortBar.set(e.value);
                    } else if (e.name === "sort-segment") {
                        sortSeg.set(e.value);
                    } else if (e.name === "reverseBars") {
                        reverseBars.set(e.value);
                    } else if (e.name === "reverseSeg") {
                        reverseSeg.set(e.value);
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
                        value: "marimekko",
                        checked: chartMode.value() === "marimekko"
                    }),
                    factory.radioButton({
                        name: "chart",
                        text: "Mekko Chart",
                        value: "mekko",
                        checked: chartMode.value() === "mekko"
                    }),
                    factory.checkbox({
                        name: "title-mode",
                        text: "Show category labels",
                        checked: titleMode.value() === true,
                        enabled: true
                    })
                ]
            }),
            section({
                heading: "Sorting",
                children: [
                    factory.checkbox({
                        name: "sort-bar",
                        text: "Sort bars by value",
                        checked: sortBar.value() === true,
                        enabled: true
                    }),
                    factory.checkbox({
                        name: "reverseBars",
                        text: "Reverse bars order",
                        checked: reverseBars.value() === true,
                        enabled: sortBar.value()
                    }),
                    factory.checkbox({
                        name: "sort-segment",
                        text: "Sort bar segments by value",
                        checked: sortSeg.value() === true,
                        enabled: true
                    }),
                    factory.checkbox({
                        name: "reverseSeg",
                        text: "Reverse bar segments order",
                        checked: reverseSeg.value() === true,
                        enabled: sortSeg.value()
                    }),
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
                        text: "Marked rows",
                        value: "marked",
                        checked: labelMode.value() === "marked"
                    }),
                    factory.radioButton({
                        name: "label-mode",
                        text: "None",
                        value: "none",
                        checked: labelMode.value() === "none"
                    })
                ]
            }),
            section({
                heading: "Types of labels",
                children: [
                    factory.checkbox({
                        name: "label-bars",
                        text: "Complete bars",
                        checked: labelBars.value() === true,
                        enabled: !(labelMode.value() === "none")
                    }),
                    factory.checkbox({
                        name: "label-segment",
                        text: "Bar segments",
                        checked: labelSeg.value() === true,
                        enabled: !(labelMode.value() === "none")
                    }),
                    factory.checkbox({
                        name: "percentage",
                        text: "Percentage",
                        checked: percentage.value() === true,
                        enabled: !(labelMode.value() === "none") && (labelBars.value() || labelSeg.value())
                    }),
                    factory.checkbox({
                        name: "numeric",
                        text: "Value",
                        checked: numeric.value() === true,
                        enabled: !(labelMode.value() === "none") && (labelBars.value() || labelSeg.value())
                    }),
                    factory.checkbox({
                        name: "category",
                        text: "Category",
                        checked: category.value() === true,
                        enabled: !(labelMode.value() === "none") && (labelBars.value() || labelSeg.value())
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