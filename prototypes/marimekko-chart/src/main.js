/*
 * Copyright © 2020. TIBCO Software Inc.
 * This file is subject to the license terms contained
 * in the license file that is distributed with this file.
 */

//@ts-check - Get type warnings from the TypeScript language server. Remove if not wanted.

// Get access to the Spotfire Mod API by providing a callback to the initialize method.
Spotfire.initialize(async (mod) => {
    const context = mod.getRenderContext();

    const canvasDiv = findElem("#canvas");
    const yScaleDiv = findElem("#y-scale");
    const xScaleDiv = findElem("#x-scale");
    const xTitleDiv = findElem("#x-title");

    const xScaleHeight = 20;
    const yScaleWidth = 100;
    var xTitleHeight;

    const reader = mod.createReader(
        mod.visualization.data(),
        mod.visualization.axis("Y"),
        mod.visualization.axis("X"),
        mod.property("x-axis-mode"),
        mod.windowSize()
    );

    // This Mod does not rely on data outside the
    // mod itself so no read errors are expected.
    reader.subscribe(render);

    /**
     * Render the Marimekko Chart.
     * This visualization is very simple since the marimekko chart is a very set chart, with few variations in how to visualize the data.
     *
     * Limitations:
     * - The bars cannot handle negative values
     * - Naive rendering of y-axis labels
     *
     * @param {Spotfire.DataView} dataView
     * @param {Spotfire.Axis} yAxis
     * @param {Spotfire.Axis} xAxis
     * @param {Spotfire.ModProperty<string>} xAxisMode
     */
    async function render(dataView, yAxis, xAxis, xAxisMode) {
        /**
         * Check for any errors.
         */
        let errors = await dataView.getErrors();
        if (errors.length > 0) {
            mod.controls.errorOverlay.show(errors, "dataView");
            // TODO clear DOM
            return;
        }

        mod.controls.errorOverlay.hide("dataView");

        // Get the leaf nodes for the x hierarchy. We will iterate over them to
        // render the bars.
        let xHierarchy = await dataView.hierarchy("X");
        let xRoot = await xHierarchy.root();
        if (xRoot == null) {
            // Return and wait for next call to render when reading data was aborted.
            // Last rendered data view is still valid from a users perspective since
            // a document modification was made during a progress indication.
            return;
        }

        let dataViewYAxis = await dataView.continuousAxis("Y");
        if (dataViewYAxis == null) {
            mod.controls.errorOverlay.show("No data on y axis.", "y");
            return;
        } else {
            mod.controls.errorOverlay.hide("y");
        }

        // Hide tooltip
        mod.controls.tooltip.hide();

        let xLeaves = xRoot.leaves();

        let colorHierarchy = await dataView.hierarchy("Color");
        let colorRoot = await colorHierarchy.root();
        if (colorRoot == null) {
            // Return and wait for next call to render when reading data was aborted.
            // Last rendered data view is still valid from a users perspective since
            // a document modification was made during a progress indication.
            return;
        }
        let colorLeaves = colorRoot.leaves();

        let totalValue = calculatedValue(xLeaves);
        renderXScale(xAxis, xAxisMode, xLeaves, totalValue);
        renderBars(dataView, xLeaves, totalValue, colorLeaves);
        renderYScale(yAxis);

        context.signalRenderComplete();
    }

    /**
     * Render the vertical scale.
     * @param {Spotfire.Axis} yAxis - The Y axes
     */
    function renderYScale(yAxis) {
        const stroke = context.styling.scales.line.stroke;

        yScaleDiv.style.width = yScaleWidth + "px";
        yScaleDiv.style.bottom = xScaleHeight + "px";
        yScaleDiv.style.top = xTitleHeight + "px";
        if (stroke === "none") {
            yScaleDiv.style.borderWidth = "0px";
        } else {
            yScaleDiv.style.color = stroke;
            yScaleDiv.style.borderWidth = "1px";
        }

        yScaleDiv.innerHTML = "";

        let max = 100;
        let percent = 0;
        let value = Math.round((max * percent) / 100);
        do {
            yScaleDiv.appendChild(createLabel(value, percent));

            percent += 10;
            value = Math.round((max * percent) / 100);
            if (value === 0) {
                break;
            }
        } while (percent <= 100);

        yScaleDiv.onmouseenter = () => mod.controls.tooltip.show(yAxis.name + ": " + yAxis.expression);
        yScaleDiv.onmouseleave = () => mod.controls.tooltip.hide();

        /**
         * Render a scale label in percentage
         * @param {number} value
         * @param {number} yPosition
         */
        function createLabel(value, yPosition) {
            let label = createDiv("y-scale-label", "" + value);
            label.style.color = context.styling.scales.font.color;
            label.style.fontSize = context.styling.scales.font.fontSize + "px";
            label.style.fontFamily = context.styling.scales.font.fontFamily;
            label.style.bottom = yPosition + "%";
            return label;
        }
    }

    /**
     * Render the horizontal scale.
     * @param {Spotfire.Axis} xAxis - The X axes
     * @param {Spotfire.ModProperty<string>} xAxisMode - Decides if X axis should show title
     * @param {Spotfire.DataViewHierarchyNode[]} xLeafNodes - The leaf nodes on the x axis
     * @param {number} totalValue - The sum of all values in the graph
     */
    function renderXScale(xAxis, xAxisMode, xLeafNodes, totalValue) {
        const stroke = context.styling.scales.line.stroke;
        xScaleDiv.style.height = xScaleHeight + "px";
        xScaleDiv.style.left = yScaleWidth + "px";
        xScaleDiv.style.bottom = "0px";
        xScaleDiv.style.right = "10px";
        xScaleDiv.style.top = "unset";
       
        if (stroke === "none") {
            xScaleDiv.style.borderWidth = "0px";
        } else {
            xScaleDiv.style.color = stroke;
            xScaleDiv.style.borderWidth = "1px";
        }
        
        xScaleDiv.innerHTML = "";
        xTitleDiv.innerHTML = "";

        if (xAxisMode.value() === "percentage") {
            xTitleHeight = 0;
            let max = 100; 
            let percent = 0;
            let value = Math.round((max * percent) / 100);
            do {
                xScaleDiv.appendChild(createLabel(value, percent));

                percent += 10;
                value = Math.round((max * percent) / 100);
                if (value === 0) {
                    break;
                }
            } while (percent <= 100);
        }

        if (xAxisMode.value() === "title") {
            xTitleHeight = 0;
            let offset = 0;
            xLeafNodes.forEach((LeafNode) => {
                let totalBarValue = sumValue(LeafNode.rows(), "Y");
                let barWidth = (totalBarValue / totalValue) * xScaleDiv.offsetWidth;
                xScaleDiv.appendChild(createBarLabel(LeafNode, barWidth, offset));
                offset += barWidth;
            }); 
        }

        if (xAxisMode.value() === "tAndP") {
            let max = 100; 
            let percent = 0;
            let value = Math.round((max * percent) / 100);
            do {
                xScaleDiv.appendChild(createLabel(value, percent));

                percent += 10;
                value = Math.round((max * percent) / 100);
                if (value === 0) {
                    break;
                }
            } while (percent <= 100);

            //When both percentage and titles are shown, the titles show on the top of the graph
            xTitleHeight = 20;
            xTitleDiv.style.height = xTitleHeight + "px";
            xTitleDiv.style.left = yScaleWidth + "px";
            xTitleDiv.style.bottom = "0px";
            xTitleDiv.style.right = "10px";
            xTitleDiv.style.top = "0px";

            let offset = 0;
            xLeafNodes.forEach((LeafNode) => {
                let totalBarValue = sumValue(LeafNode.rows(), "Y");
                let barWidth = (totalBarValue / totalValue) * xTitleDiv.offsetWidth;
                xTitleDiv.appendChild(createBarLabel(LeafNode, barWidth, offset));
                offset += barWidth;
            }); 
        } 

        xScaleDiv.onmouseenter = () => mod.controls.tooltip.show(xAxis.name + ": " + xAxis.expression);
        xScaleDiv.onmouseleave = () => mod.controls.tooltip.hide();
        
        xScaleDiv.oncontextmenu = function (e) {
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
                        text: "Title",
                        checked: xAxisMode.value() === "title",
                        enabled: xAxisMode.value() !== "title"
                    },
                    {
                        text: "Title and Percentage",
                        checked: xAxisMode.value() === "tAndP",
                        enabled: xAxisMode.value() !== "tAndP"
                    }
                ])
                .then((clickedItem) => {
                    if (clickedItem.text === "Percentage") {
                        xAxisMode.set("percentage");
                    } else if (clickedItem.text === "Title") {
                        xAxisMode.set("title");
                    } else if (clickedItem.text === "Title and Percentage") {
                        xAxisMode.set("tAndP");
                    }
                });
        };

        xScaleDiv.onclick = function (e) {
            if (!context.isEditing) {
                return;
            }

            mod.controls.tooltip.hide();
            let factory = mod.controls.popout.components;
            let section = mod.controls.popout.section;
            let box = xScaleDiv.getBoundingClientRect();

            mod.controls.popout.show(
                {
                    x: box.width + box.left,
                    y: e.clientY,
                    autoClose: true,
                    alignment: "Left",
                    onChange(e) {
                        if (e.name === "mode") {
                            xAxisMode.set(e.value);
                        }
                    }
                },
                () => {
                    return [
                        section({
                            heading: "Scale mode",
                            children: [
                                factory.radioButton({
                                    name: "mode",
                                    text: "Percentage",
                                    value: "percentage",
                                    checked: xAxisMode.value() === "percentage"
                                }),
                                factory.radioButton({
                                    name: "mode",
                                    text: "Title",
                                    value: "title",
                                    checked: xAxisMode.value() === "title"
                                }),
                                factory.radioButton({
                                    name: "mode",
                                    text: "Title and Percentage",
                                    value: "tAndP",
                                    checked: xAxisMode.value() === "tAndP"
                                })
                            ]
                        })
                    ];
                }
            );
        };

        /**
         * Render a scale label for percentage
         * @param {number} value
         * @param {number} xPosition
         */
         function createLabel(value, xPosition) {
            let label = createDiv("x-scale-label", "" + value);
            label.style.color = context.styling.scales.font.color;
            label.style.fontSize = context.styling.scales.font.fontSize + "px";
            label.style.fontFamily = context.styling.scales.font.fontFamily;
            label.style.left = xPosition + "%";
            return label;
        }

         /**
         * Render a scale label for titles of the leaf node on the x axis
         * @param {Spotfire.DataViewHierarchyNode} LeafNode
         * @param {number} xPosition
         * @param {number} offset
         */
          function createBarLabel(LeafNode, xPosition, offset) {
            let label = createDiv("x-title-label", "" + LeafNode.key);
            label.style.color = context.styling.scales.font.color;
            label.style.fontSize = context.styling.scales.font.fontSize + "px";
            label.style.fontFamily = context.styling.scales.font.fontFamily;
            label.style.width =  xPosition + "px";
            label.style.left = offset + "px";
            label.style.textAlign = "center";
            return label;
        }
    }

    /**
     * Render all bars on the canvas div.
     * @param {Spotfire.DataView} dataView
     * @param {Spotfire.DataViewHierarchyNode[]} xLeafNodes
     * @param {number} totalValue
     * @param {Spotfire.DataViewHierarchyNode[]} colorLeaves
     */
    function renderBars(dataView, xLeafNodes, totalValue, colorLeaves) {
        canvasDiv.innerHTML = "";
        canvasDiv.style.left = yScaleWidth + "px";
        canvasDiv.style.bottom = xScaleHeight + "px";
        canvasDiv.style.top = xTitleHeight + "px";
        canvasDiv.style.right = "10px";

        canvasDiv.onclick = (e) => {
            if (e.target === canvasDiv) {
                dataView.clearMarking();
            }
        };

        const canvasHeight = canvasDiv.offsetHeight;
        const canvasWidth = canvasDiv.offsetWidth;

        xLeafNodes.forEach((leafNode) => canvasDiv.appendChild(renderBar(leafNode)));

        /**
         * Renders bars/segments for a single x axis node.
         * @param {Spotfire.DataViewHierarchyNode} xLeafNode
         */
        function renderBar(xLeafNode) {
            let fragment = document.createDocumentFragment();
            let rows = xLeafNode.rows();

            fragment.appendChild(renderStackedBar(rows));

            return fragment;
        }

        /**
         * Render a stacked bar in the bar chart from a set of source rows.
         * @param {Spotfire.DataViewRow[]} rows
         */
        function renderStackedBar(rows) {
            let bar = createDiv("bar");

            let totalBarValue = sumValue(rows, "Y");
            let barWidth = totalBarValue / totalValue;
            bar.style.height =  canvasHeight + "px";
            bar.style.width = Math.round(barWidth * canvasWidth) + "px";

            rows.forEach((row) => {
                let y = row.continuous("Y");
                if (y.value() === null) {
                    return;
                }

                let segment = createDiv("segment");
                segment.style.height = (+y.value() / totalBarValue) * canvasHeight + "px";
                segment.style.backgroundColor = row.color().hexCode;
                segment.style.marginBottom = "1px";
                segment.style.marginRight = "1px";
                
                segment.onmouseover = (e) => {
                    mod.controls.tooltip.show(info(row));
                };
                segment.onmouseout = (e) => {
                    mod.controls.tooltip.hide();
                };

                segment.onclick = (e) => {
                    /** @type{Spotfire.MarkingOperation} */
                    let mode = e.ctrlKey ? "Toggle" : "Replace";
                    if (e.shiftKey) {
                        rows.forEach((m) => m.mark(mode));
                    } else if (e.altKey) {
                        colorLeaves[rows.indexOf(row)].mark(mode);
                    } else {
                        row.mark(mode);
                    }
                };

                bar.appendChild(segment);
            });

            /**
             * Get the information shown when hovering over a segment
             * @param {Spotfire.DataViewRow} row 
             */
            function info(row){
                let barName = row.leafNode("X").key;
                let rowValue = +row.continuous("Y").value();
                let rowName = colorLeaves[rows.indexOf(row)].key;
                let barInfo = `${barName}: ${totalBarValue} (${(barWidth * 100).toFixed(2)} %)`;
                let colorInfo = `${rowName}: ${rowValue} (${((rowValue/totalBarValue) * 100).toFixed(2)} %)`;
                return barInfo + `\n` + colorInfo;
            }

            return bar;
        }
    }
});



/**
 * Calculate total value of the dataset to get percentages.
 * @param {Spotfire.DataViewHierarchyNode[]} xLeaves
 */
 function calculatedValue(xLeaves) {
    let totalValue = 0;
    xLeaves.forEach((node) => {
        let sum = sumValue(node.rows(), "Y");
        totalValue = totalValue + sum;
    });

    return totalValue;
}

/**
 * Calculate the total value for an axis from a set of rows. Null values are treated a 0.
 * @param {Spotfire.DataViewRow[]} rows Rows to calculate the total value from
 * @param {string} axis Name of Axis to use to calculate the value.
 */
function sumValue(rows, axis) {
    return rows.reduce((p, c) => +c.continuous(axis).value() + p, 0);
}

/**
 * Calculate the max value for an axis from a set of rows. Null values are treated a 0.
 * @param {Spotfire.DataViewRow[]} rows Rows to calculate the max value from
 * @param {string} axis Name of Axis to use to calculate the value.
 */
function maxValue(rows, axis) {
    return rows.reduce((p, c) => Math.max(+c.continuous(axis).value(), p), 0);
}

/** @returns {HTMLElement} */
function findElem(selector) {
    return document.querySelector(selector);
}

/**
 * Create a div element.
 * @param {string} className class name of the div element.
 * @param {string | HTMLElement} [content] Content inside the div
 */
function createDiv(className, content) {
    let elem = document.createElement("div");
    elem.classList.add(className);
    if (typeof content === "string") {
        elem.appendChild(document.createTextNode(content));
    } else if (content) {
        elem.appendChild(content);
    }

    return elem;
}


