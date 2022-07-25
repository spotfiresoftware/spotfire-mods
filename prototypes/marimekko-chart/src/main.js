/*
 * Copyright © 2020. TIBCO Software Inc.
 * This file is subject to the license terms contained
 * in the license file that is distributed with this file.
 */

//@ts-check - Get type warnings from the TypeScript language server. Remove if not wanted.

// Get access to the Spotfire Mod API by providing a callback to the initialize method.
Spotfire.initialize(async (mod) => {
    const context = mod.getRenderContext();
    const state = {};

    const canvasDiv = findElem("#canvas");
    const xTitleDiv = findElem("#x-title");

    const xScaleHeight = 20;
    const yScaleWidth = 60;
    var xTitleHeight = 0;

    const reader = mod.createReader(
        mod.visualization.data(),
        mod.property("x-axis-mode"),
        mod.property("mekko"),
        mod.property("title"),
        mod.property("numeric-segment"),
        mod.property("percentage-segment"),
        mod.property("reverse-bars"),
        mod.property("sort"),
        mod.windowSize()
    );

    // This Mod does not rely on data outside the
    // mod itself so no read errors are expected.
    reader.subscribe(render);

    /**
     * Render the Marimekko Chart.
     * @param {Spotfire.DataView} dataView
     * @param {Spotfire.ModProperty<string>} xAxisMode
     * @param {Spotfire.ModProperty<boolean>} chartMode
     * @param {Spotfire.ModProperty<boolean>} titleMode
     * @param {Spotfire.ModProperty<boolean>} numericSeg
     * @param {Spotfire.ModProperty<boolean>} percentageSeg
     * @param {Spotfire.ModProperty<boolean>} reverseBars
     * @param {Spotfire.ModProperty<boolean>} sort
     * @param {Spotfire.Size} size
     */
    async function render(dataView, xAxisMode, chartMode, titleMode, numericSeg, percentageSeg, reverseBars, sort, size) {

        const onSelection = ({ dragSelectActive }) => {
            state.preventRender = dragSelectActive;
        };
        
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

            // Return and wait for next call to render when reading data was aborted.
        // Last rendered data view is still valid from a users perspective since
        // a document modification was made during a progress indication.
        // Hard abort if row count exceeds an arbitrary selected limit
        const xLimit = 10000;
        const colorLimit = 20;
        const colorCount = (await dataView.hierarchy("Color")).leafCount;
        const xCount = (await dataView.hierarchy("X")).leafCount;
        if (colorCount > colorLimit || xCount > xLimit) {
            canvasDiv.remove();

            mod.controls.errorOverlay.show("The resulting data view exceeded the size limit.", "dataViewSize1");
            if (xCount > xLimit) {
                mod.controls.errorOverlay.show(
                    `Maximum allowed X axis values is ${xLimit}. Try aggregating the expression further.`,
                    "dataViewSize2"
                );
            } else {
                mod.controls.errorOverlay.hide("dataViewSize2");
            }

            if (colorCount > colorLimit) {
                mod.controls.errorOverlay.show(
                    `Maximum number of colors is limited to ${colorLimit} for readability reasons.`,
                    "dataViewSize3"
                );
            } else {
                mod.controls.errorOverlay.hide("dataViewSize3");
            }

            return;
        } else {
            mod.controls.errorOverlay.hide("dataViewSize1");
            mod.controls.errorOverlay.hide("dataViewSize2");
            mod.controls.errorOverlay.hide("dataViewSize3");
        }

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

        if(sort.value()){
            xLeaves.sort(sortBars);
        }

        if(reverseBars.value()){
            xLeaves.reverse();
        }

        let colorHierarchy = await dataView.hierarchy("Color");
        let colorRoot = await colorHierarchy.root();
        if (colorRoot == null) {
            // Return and wait for next call to render when reading data was aborted.
            // Last rendered data view is still valid from a users perspective since
            // a document modification was made during a progress indication.
            return;
        }
        let colorLeaves = colorRoot.leaves();

        if (numericSeg.value() || percentageSeg.value()) {
            xTitleHeight = 20;
        } else {
            xTitleHeight = 0;
        }
        let totalValue = calculatedValue(xLeaves);
        let maxYValue = calculateMaxYValue(xLeaves);     
        renderTitles(xLeaves, titleMode, totalValue);
        renderBars(dataView, 
                    xLeaves,  
                    colorLeaves, 
                    chartMode, 
                    numericSeg, 
                    percentageSeg, 
                    titleMode,
                    totalValue,
                    maxYValue);
       renderAxis(mod, 
                    size,  
                    xAxisMode, 
                    chartMode, 
                    titleMode,
                    numericSeg,
                    percentageSeg,
                    reverseBars,
                    sort,
                    totalValue, 
                    maxYValue, 
                    xScaleHeight, 
                    yScaleWidth, 
                    xTitleHeight);

        /**Mark segments after drawn rectangular selection*/
        rectangleMarking((result) => {
            onSelection(result);

            const { x, y, width, height, ctrlKey } = result;

            xLeaves.forEach((leaf) => {
                leaf.rows()
                    .forEach((row) => {
                        const xId = row.categorical("X").leafIndex;
                        const yId = xLeaves[row.categorical("X").leafIndex].rows().indexOf(row);
                        let rowSegment = document.getElementById(`${xId},${yId}`);
                        const xPos = rowSegment.getBoundingClientRect().left;
                        const yPos = rowSegment.getBoundingClientRect().top;
                        if (xPos >= x && xPos <= x + width && yPos >= y && yPos <= y + height) {
                            ctrlKey ? row.mark("ToggleOrAdd") : row.mark();
                        }
                    });
            });
        });

        context.signalRenderComplete();
    }

     /**
         * Render the horizontal scale.
         * @param {Spotfire.DataViewHierarchyNode[]} xLeafNodes - The leaf nodes on the x axis
         * @param {Spotfire.ModProperty<boolean>} titleMode - Decides if titles should be rendered
         * @param {number} totalValue - The sum of all values in the graph
         */
      function renderTitles(xLeafNodes, titleMode, totalValue) {
        xTitleDiv.innerHTML = "";
        if (titleMode.value()){
            xTitleDiv.style.height = xTitleHeight + "px";
            xTitleDiv.style.left = yScaleWidth + "px";
            xTitleDiv.style.bottom = "0px";
            xTitleDiv.style.right = "30px";
            xTitleDiv.style.top = "0px";

            //Set with to align with x axes rangegit 
            let width = xTitleDiv.offsetWidth * 0.98 - (xLeafNodes.length - 2);
            let offset = 0;
    
            xLeafNodes.forEach((LeafNode) => {
                let totalBarValue = sumValue(LeafNode.rows(), "Y");
                let barWidth = (totalBarValue / totalValue) * width;
                xTitleDiv.appendChild(createBarLabel(LeafNode, barWidth, offset));
                offset += barWidth;
            });
        } else {
            xTitleHeight = 0;
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
     * @param {Spotfire.DataViewHierarchyNode[]} colorLeaves
     * @param {Spotfire.ModProperty<boolean>} chartMode
     * @param {Spotfire.ModProperty<boolean>} numericSeg
     * @param {Spotfire.ModProperty<boolean>} percentageSeg
     * @param {Spotfire.ModProperty<boolean>} titleMode
     * @param {number} totalValue
     * @param {number} maxYValue
     */
    function renderBars(dataView, xLeafNodes, colorLeaves, chartMode, numericSeg, percentageSeg, titleMode, totalValue, maxYValue) {
        canvasDiv.innerHTML = "";
        canvasDiv.style.left = yScaleWidth + "px";
        canvasDiv.style.bottom = xScaleHeight + "px";
        canvasDiv.style.top = xTitleHeight + "px";
        canvasDiv.style.right = "40px";

        //Set width and height to align with axis range
        const canvasHeight = canvasDiv.offsetHeight * 0.98;
        const canvasWidth = canvasDiv.offsetWidth * 0.98 - (xLeafNodes.length - 2);

        canvasDiv.onclick = (e) => {
            if (e.target === canvasDiv) {
                dataView.clearMarking();
            }
        };

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
            let percentage = totalBarValue / totalValue;
            let height;
            if (chartMode.value()){
                height = Math.round((totalBarValue / maxYValue) * canvasHeight);
            } else {
                height = canvasHeight;
            }
            bar.style.height =  height + "px";
            bar.style.width = Math.round(percentage * canvasWidth) + "px";

            if(numericSeg.value() && percentageSeg.value()){
                let labelText = `${totalBarValue} (${(percentage * 100).toFixed(1)}%)`;
                renderBarValue(labelText);
            } else if (numericSeg.value()){
                let labelText = `${totalBarValue}`;
                renderBarValue(labelText);
            } else if (percentageSeg.value()){
                let labelText = `${(percentage * 100).toFixed(1)}%`;
                renderBarValue(labelText);
            }

            /**
             * Renders a bar label containing the bar value
             * @param {string} labelText 
             */
            function renderBarValue(labelText){
                let label = createDiv("bar-label", labelText);
                label.style.color = context.styling.scales.font.color;
                label.style.fontSize = context.styling.scales.font.fontSize + "px";
                label.style.fontFamily = context.styling.scales.font.fontFamily;
                label.style.marginTop = canvasHeight - height + "px";
                label.style.width = bar.style.width;
                bar.appendChild(label); 
            }

            rows.forEach((row) => {
                let y = row.continuous("Y");
                if (y.value() === null) {
                    return;
                }

                let segment = createDiv("segment");
                segment.id = `${row.categorical("X").leafIndex},${rows.indexOf(row)}`;
                let percentageMekko = +y.value() / maxYValue;
                let percentageMarimekko = +y.value() / totalBarValue;
                if (chartMode.value()){
                    segment.style.height = (percentageMekko) * canvasHeight + "px";
                } else {
                    segment.style.height = (percentageMarimekko) * canvasHeight + "px";
                }
                segment.style.backgroundColor = row.color().hexCode;
                segment.style.width = bar.style.width;
                segment.style.marginBottom = "1px";
                
                /** Hover over segment event */
                segment.onmouseover = (e) => {
                    mod.controls.tooltip.show(row);
                    segment.style.outline = "1px solid currentColor";
                };
                segment.onmouseout = (e) => {
                    mod.controls.tooltip.hide();
                    segment.style.outline = "none";
                };

                /** Click on segment */
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

                /** All possible combinations of showing labels for segments */
                if (titleMode.value() && numericSeg.value() && percentageSeg.value()){
                    let labelText = `${colorLeaves[rows.indexOf(row)].key}: ${+y.value()} (${(percentageMarimekko * 100).toFixed(1)}%)`;
                    renderLabel(labelText);
                } else if(titleMode.value() && numericSeg.value()){
                    let labelText = `${colorLeaves[rows.indexOf(row)].key}: ${+y.value()}`;
                    renderLabel(labelText);
                } else if (titleMode.value() && percentageSeg.value()){
                    let labelText = `${colorLeaves[rows.indexOf(row)].key}: ${(percentageMarimekko * 100).toFixed(1)}%`;
                    renderLabel(labelText);
                } else if(titleMode.value()){
                    let labelText = `${colorLeaves[rows.indexOf(row)].key}`;
                    renderLabel(labelText);
                } else if (numericSeg.value()){
                    let labelText = `${+y.value()}`;
                    renderLabel(labelText);
                } else if (percentageSeg.value()){
                    let labelText = `${(percentageMarimekko * 100).toFixed(1)}%`;
                    renderLabel(labelText);
                }

                /**
                 * Render a segment label for the segment
                 * @param {string} labelText
                 */
                 function renderLabel(labelText){
                    let label = createDiv("segment-label", labelText);
                    label.style.color = context.styling.scales.font.color;
                    label.style.fontSize = context.styling.scales.font.fontSize + "px";
                    label.style.fontFamily = context.styling.scales.font.fontFamily;
                    label.style.lineHeight = segment.style.height;
                    label.style.height = segment.style.height;
                    label.style.width = bar.style.width;
                    segment.appendChild(label);
                }

                bar.appendChild(segment);
            });
            return bar;
        }
    }
});

/**
 * Calculate the maximum value from a hierarchy.
 * @param {Spotfire.DataViewHierarchyNode[]} xLeaves
 */
 function calculateMaxYValue(xLeaves) {
    let maxYValue = 0;
    xLeaves.forEach((node) => {
        let sum = sumValue(node.rows(), "Y");
        maxYValue = Math.max(maxYValue, sum);
    });
    return maxYValue;
}

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
 * Calculate the total value for an axis from a set of rows. Null values are treated as 0.
 * @param {Spotfire.DataViewRow[]} rows Rows to calculate the total value from
 * @param {string} axis Name of Axis to use to calculate the value.
 */
function sumValue(rows, axis) {
    return rows.reduce((p, c) => +c.continuous(axis).value() + p, 0);
}

/**
 * Calculate the max value for an axis from a set of rows. Null values are treated as 0.
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

/**
     * Sorts bars depending on value
     * @param {Spotfire.DataViewHierarchyNode} a
     * @param {Spotfire.DataViewHierarchyNode} b
     */
function sortBars(a, b){
    if(sumValue(b.rows() ,"Y") < sumValue(a.rows() ,"Y")){
        return -1;
    } else if (sumValue(a.rows() ,"Y") < sumValue(b.rows() ,"Y")){
        return 1;
    } else {
        return 0;
    }
}