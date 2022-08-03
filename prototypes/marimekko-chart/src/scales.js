/**
 * Renders the y and x axis for the mod using d3
 * @param {Spotfire.Mod} mod
 * @param {Spotfire.Size} size
 * @param {*} modProperty
 * @param {number} totalValue
 * @param {number} maxYValue
 * @param {number} xScaleHeight
 * @param {number} yScaleWidth
 * @param {number} xTitleHeight
 */
function renderAxis(mod, size, modProperty, totalValue, maxYvalue, xScaleHeight, yScaleWidth, xTitleHeight){
    //variables
    const context = mod.getRenderContext();
    const styling = context.styling;
    const { xAxisMode, 
        chartMode,
        labelMode,
        labelBars,
        labelSeg,
        numeric,
        percentage,
        category,
        reverseBars,
        reverseSeg,
        sortBar } = modProperty;

    const margin = { top: xTitleHeight, right: 22, bottom: xScaleHeight + 1, left: yScaleWidth - 1}
    var width = size.width - margin.right;
    var height = size.height;

    //remove previous content in svg
    d3.selectAll("#scale > *").remove();

    //svg container for the scales
    var svg = d3.select("#scale")
        .attr("width", width)
        .attr("height", height)
        .style('font-size', styling.scales.font.fontSize)
        .style('font-family', styling.scales.font.fontFamily)
        .style('color', styling.scales.tick.stroke)
        .on("click", () => dataView.clearMarking());

    //render x axis different depending on configuration
    if (xAxisMode.value() === "percentage"){
        var xFormat = d3.format(".0%");
        xscale = d3.scaleLinear()
        .domain([0, 1.02])
        .range([margin.left, width]);
    } else if (xAxisMode.value() === "numeric"){
        var xFormat = null;
        var xscale = d3.scaleLinear()
        .domain([0, totalValue * 1.02])
        .range([margin.left, width]);
    }
    
    var x_axis = d3.axisBottom()
            .tickSize(5)
            .tickFormat(xFormat)
            .tickPadding(styling.scales.tick.stroke != "none" ? 3 : 9)
            .scale(xscale); 

    //render y axis different depending on chart mode
    if (!chartMode.value()){
        var yFormat = d3.format(".0%");
        var yScaleTickNumber = 10;
        yscale = d3.scaleLinear()
            .domain([1.02, 0])
            .range([margin.top, height - margin.bottom]);
    } else {
        var yFormat = d3.format("");
        var yScaleTickNumber = size.height / (styling.scales.font.fontSize * 2 + 6);
        var yscale = d3.scaleLinear()
            .domain([(maxYvalue * 1.02), 0])
            .range([margin.top, height - margin.bottom]);
    }

    var y_axis = d3.axisLeft()
            .ticks(yScaleTickNumber)
            .tickFormat(yFormat)
            .tickSizeOuter([0])
            .scale(yscale);

    //append y axis to svg
    svg.append("g")
        .attr("id", "y-axis")
        .attr("transform", "translate(" + margin.left +",0)")
        .call(y_axis)
        .selectAll("text")
        .style('color', styling.scales.font.color)
        .attr("tooltip", (d) => d)
        .on("mouseover", function (d) {
            d3.select(this).style("cursor", "pointer");
            if(!chartMode.value()){d = d * 100 + "%";}
            mod.controls.tooltip.show(d);
        })
        .on("mouseout", function () {
            d3.select(this).style("cursor", "default");
            mod.controls.tooltip.hide();
        });
    
    var xVerticalPlacement = height - margin.bottom;

    //append x axis to svg
    svg.append("g")
        .attr("id", "x-axis")
        .attr("transform", "translate( 0, " + xVerticalPlacement + ")")
        .call(x_axis)
        .selectAll("text")
        .style('color', styling.scales.font.color)
        .attr("tooltip", (d) => d)
        .on("mouseover", function (d) {
            d3.select(this).style("cursor", "pointer");
            if(xAxisMode.value() === "percentage"){d = d * 100 + "%";}
            mod.controls.tooltip.show(d);
        })
        .on("mouseout", function () {
            d3.select(this).style("cursor", "default");
            mod.controls.tooltip.hide();
        });

    /**
     * Show popup on X axis click
     * @type {HTMLElement}
     */
    const xAxisSelect = document.querySelector("#x-axis");
    xAxisSelect.classList.toggle("editable", context.isEditing);

    xAxisSelect.oncontextmenu = function (e) {
        e.preventDefault(); // Prevents browser native context menu from being shown.
        e.stopPropagation(); // Prevents default mod context menu to be shown.

        mod.controls.contextMenu
            .show(e.clientX, e.clientY, [
                {
                    text: "Percentage",
                    checked: xAxisMode.value() === "percentage",
                    enabled: xAxisMode.value() !== "percentage"
                },
                {
                    text: "Numeric",
                    checked: xAxisMode.value() === "numeric",
                    enabled: xAxisMode.value() !== "numeric"
                },
                {
                    text: "Marimekko Chart",
                    checked: !chartMode.value(),
                    enabled: chartMode.value()
                },
                {
                    text: "Mekko Chart",
                    checked: chartMode.value(),
                    enabled: !chartMode.value()
                },
                {
                    text: "Sort bars by value",
                    checked: sortBar.value(),
                    enabled: true
                },
                {
                    text: "Reverse Bars",
                    checked: reverseBars.value(),
                    enabled: true
                },
                {
                    text: "Reverse Segments",
                    checked: reverseSeg.value(),
                    enabled: true
                },
            ])
            .then((clickedItem) => {
                if (clickedItem.text === "Percentage") {
                    xAxisMode.set("percentage");
                } else if (clickedItem.text === "Numeric") {
                    xAxisMode.set("numeric");
                }
                if (clickedItem.text === "Marimekko Chart") {
                    chartMode.set(false);
                } else if (clickedItem.text === "Mekko Chart") {
                    chartMode.set(true);
                }
                if (clickedItem.text === "Sort bars by value") {
                    sortBar.set(!sortBar.value());
                } 
                if (clickedItem.text === "Reverse Bars") {
                    reverseBars.set(!reverseBars.value());
                }
                if (clickedItem.text === "Reverse Segments") {
                    reverseSeg.set(!reverseSeg.value());
                }
            });
    };

    xAxisSelect.onclick = (e) => {
        if (!context.isEditing) {
            return;
        }

        mod.controls.tooltip.hide();
        let factory = mod.controls.popout.components;
        let section = mod.controls.popout.section;
        let box = xAxisSelect.getBoundingClientRect();
        mod.controls.popout.show(
            {
                x: e.clientX,
                y: box.top,
                autoClose: true,
                alignment: "Bottom",
                onChange: (e) => {
                if (e.name === "scale") {
                    xAxisMode.set(e.value);
                } else if (e.name === "chart") {
                    chartMode.set(e.value);
                } else if (e.name === "sort") {
                    sortBar.set(e.value);
                } else if (e.name === "reverseBars") {
                    reverseBars.set(e.value);
                } else if (e.name === "reverseSeg") {
                    reverseSeg.set(e.value);
                }
                }
            },
            () => {
            return [
                section({
                    heading: "Scale mode",
                    children: [
                        factory.radioButton({
                            name: "scale",
                            text: "Percentage",
                            value: "percentage",
                            checked: xAxisMode.value() === "percentage"
                        }),
                        factory.radioButton({
                            name: "scale",
                            text: "Numeric",
                            value: "numeric",
                            checked: xAxisMode.value() === "numeric"
                        })
                    ]
                }),
                section({
                    heading: "Chart Type",
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
                        })
                    ]
                }),
                section({
                    children: [
                        factory.checkbox({
                            name: "sort",
                            text: "Sort bars by value",
                            checked: sortBar.value() === true,
                            enabled: true
                        })
                    ]
                }),
                section({
                    children: [
                        factory.checkbox({
                            name: "reverseBars",
                            text: "Reverse bars",
                            checked: reverseBars.value() === true,
                            enabled: true
                        }),
                        factory.checkbox({
                            name: "reverseSeg",
                            text: "Reverse segments",
                            checked: reverseSeg.value() === true,
                            enabled: true
                        }),
                    ]
                })
            ];
            }
        );
    };

    /**
     * Show popup on Y axis click
     * @type {HTMLElement}
     */
    const yAxisSelect = document.querySelector("#y-axis");
    yAxisSelect.classList.toggle("editable", context.isEditing);

    yAxisSelect.oncontextmenu = function (e) {
    e.preventDefault(); // Prevents browser native context menu from being shown.
    e.stopPropagation(); // Prevents default mod context menu to be shown.

    mod.controls.contextMenu
        .show(e.clientX, e.clientY, [
            {
                text: "Show labels for all",
                checked: labelMode.value() === "all",
                enabled: labelMode.value() !== "all"
            },
            {
                text: "Hide labels",
                checked: labelMode.value() === "none",
                enabled: labelMode.value() !== "none"
            },
            {
                text: "Show labels for marked",
                checked: labelMode.value() === "marked",
                enabled: labelMode.value() !== "marked"
            },
            {
                text: "Show labels for complete bars",
                checked: labelBars.value(),
                enabled: true
            },
            {
                text: "Show labels for segments",
                checked: labelSeg.value(),
                enabled: true
            },
            {
                text: "Show categories",
                checked: category.value(),
                enabled: true
            },
            {
                text: "Show percentages",
                checked: percentage.value(),
                enabled: true
            },
            {
                text: "Show numeric values",
                checked: numeric.value(),
                enabled: true
            }
            
        ])
        .then((clickedItem) => {
            if (clickedItem.text === "Show labels for all") {
                labelMode.set("all");
            } else if (clickedItem.text === "Hide labels") {
                labelMode.set("none");
            } else if (clickedItem.text === "Show labels for marked") {
                labelMode.set("marked");
            }
            if (clickedItem.text === "Show labels for complete bars") {
                labelBars.set(!labelBars.value());
            }
            if (clickedItem.text === "Show labels for segments") {
                labelSeg.set(!labelSeg.value());
            }
            if (clickedItem.text === "Show categories") {
                category.set(!category.value());
            }
            if (clickedItem.text === "Show numeric values") {
                numeric.set(!numeric.value());
            }
            if (clickedItem.text === "Show percentages") {
                percentage.set(!percentage.value());
            }
            
        });
    };

    yAxisSelect.onclick = function (e) {
    if (!context.isEditing) {
        return;
    }

    mod.controls.tooltip.hide();
    let factory = mod.controls.popout.components;
    let section = mod.controls.popout.section;
    let box = yAxisSelect.getBoundingClientRect();

    mod.controls.popout.show(
        {
            x: box.width + box.left,
            y: e.clientY,
            autoClose: true,
            alignment: "Left",
            onChange(e) {
                if (e.name === "label-mode") {
                    labelMode.set(e.value);
                } else if (e.name === "label-bars") {
                    labelBars.set(e.value);
                } else if (e.name === "label-segment") {
                    labelSeg.set(e.value);
                } else if (e.name === "numeric") {
                    numeric.set(e.value);
                } else if (e.name === "percentage") {
                    percentage.set(e.value);
                } else if (e.name === "category") {
                    category.set(e.value);
                }
            }
        },
        () => {
            return [
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
    );
    };
}

