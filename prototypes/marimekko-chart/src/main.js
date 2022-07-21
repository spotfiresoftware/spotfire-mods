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
    const xTitleDiv = findElem("#x-title");

    const xScaleHeight = 20;
    const yScaleWidth = 60;
    var xTitleHeight = 0;

    const reader = mod.createReader(
        mod.visualization.data(),
        mod.property("x-axis-mode"),
        mod.property("mekko"),
        mod.property("title"),
        mod.property("show-label"),
        mod.property("reverse-bars"),
        mod.property("sort"),
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
     * @param {Spotfire.ModProperty<string>} xAxisMode
     * @param {Spotfire.ModProperty<boolean>} chartMode
     * @param {Spotfire.ModProperty<boolean>} titleMode
     * @param {Spotfire.ModProperty<boolean>} showLabel
     * @param {Spotfire.ModProperty<boolean>} reverseBars
     * @param {Spotfire.ModProperty<boolean>} sort
     * @param {Spotfire.Size} size
     */
    async function render(dataView, xAxisMode, chartMode, titleMode, showLabel, reverseBars, sort, size) {
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

        if(sort.value()){
            xLeaves.sort(sortBars);
        }

        if(reverseBars.value()){
            xLeaves.reverse();
        }

        var categories = xLeaves.map((leafNode) => {
            return leafNode.key;
        });

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
        let maxYValue = calculateMaxYValue(xLeaves);

        
        
     
        renderTitles(xLeaves, totalValue, titleMode);
        renderBars(dataView, xLeaves, totalValue, colorLeaves, chartMode, maxYValue, showLabel);
        renderAxis(xScaleHeight, 
                    yScaleWidth, 
                    xTitleHeight, 
                    size, 
                    categories, 
                    xAxisMode, 
                    chartMode, 
                    titleMode,
                    showLabel,
                    reverseBars,
                    sort,
                    totalValue, 
                    maxYValue, 
                    mod);

        context.signalRenderComplete();
    }

     /**
         * Render the horizontal scale.
         * @param {Spotfire.DataViewHierarchyNode[]} xLeafNodes - The leaf nodes on the x axis
         * @param {number} totalValue - The sum of all values in the graph
         * @param {Spotfire.ModProperty<boolean>} titleMode
         */
      function renderTitles(xLeafNodes, totalValue, titleMode) {
        xTitleDiv.innerHTML = "";
        if (titleMode.value()){
            xTitleHeight = 20;
            xTitleDiv.style.height = xTitleHeight + "px";
            xTitleDiv.style.left = yScaleWidth + "px";
            xTitleDiv.style.bottom = "0px";
            xTitleDiv.style.right = "30px";
            xTitleDiv.style.top = "0px";
    
            let offset = 0;
    
            xLeafNodes.forEach((LeafNode) => {
                let totalBarValue = sumValue(LeafNode.rows(), "Y");
                let barWidth = (totalBarValue / totalValue) * xTitleDiv.offsetWidth;
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
     * @param {number} totalValue
     * @param {Spotfire.DataViewHierarchyNode[]} colorLeaves
     * @param {Spotfire.ModProperty<boolean>} chartMode
     * @param {number} maxYValue
     * @param {Spotfire.ModProperty<boolean>} showLabel
     */
    function renderBars(dataView, xLeafNodes, totalValue, colorLeaves , chartMode, maxYValue, showLabel) {
        canvasDiv.innerHTML = "";
        canvasDiv.style.left = yScaleWidth + "px";
        canvasDiv.style.bottom = xScaleHeight + "px";
        canvasDiv.style.top = xTitleHeight + "px";
        canvasDiv.style.right = "40px";

        //Set width and height to align with axis range
        const canvasHeight = canvasDiv.offsetHeight * 0.98;
        const canvasWidth = canvasDiv.offsetWidth * 0.98 - (xLeafNodes.length - 1);

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
            let barWidth = totalBarValue / totalValue;
            if (chartMode.value()){
                bar.style.height = Math.round((totalBarValue / maxYValue) * canvasHeight) + "px";
            } else {
                bar.style.height =  canvasHeight + "px";
            }
            bar.style.width = Math.round(barWidth * canvasWidth) + "px";
    
            rows.forEach((row) => {
                let y = row.continuous("Y");
                if (y.value() === null) {
                    return;
                }

                let segment = createDiv("segment");
                if (chartMode.value()){
                    segment.style.height = (+y.value() / maxYValue) * canvasHeight + "px";
                } else {
                    segment.style.height = (+y.value() / totalBarValue) * canvasHeight + "px";
                }
                segment.style.backgroundColor = row.color().hexCode;
                segment.style.width = bar.style.width;
                segment.style.marginBottom = "1px";
                
                segment.onmouseover = (e) => {
                    mod.controls.tooltip.show(row);
                    segment.style.outline = "1px solid currentColor";
                };
                segment.onmouseout = (e) => {
                    mod.controls.tooltip.hide();
                    segment.style.outline = "none";
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

                if (showLabel.value()){
                    let label = createDiv("segment-label", "" + +y.value());
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
 * Calculate the maximum value from a hierarchy. If split bars is enabled, the single maximum value from all rows will be used.
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


