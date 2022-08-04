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

    const modContainer = findElem("#mod-container");
    const canvasDiv = findElem("#canvas");
    const xTitleDiv = findElem("#x-title");
    const scale = findElem("#scale");

    const xScaleHeight = 20;
    const yScaleWidth = 60;
    var xTitleHeight = 0;

    const reader = mod.createReader(
        mod.visualization.data(),
        mod.property("x-axis-mode"),
        mod.property("label-mode"),
        mod.property("mekko"),
        mod.property("label-bars"),
        mod.property("label-segment"),
        mod.property("numeric"),
        mod.property("percentage"),
        mod.property("category"),
        mod.property("reverse-bars"),
        mod.property("reverse-segment"),
        mod.property("sort-bars"),
        mod.property("sort-segment"),
        mod.windowSize()
    );

    // This Mod does not rely on data outside the
    // mod itself so no read errors are expected.
    reader.subscribe(render);

    /**
     * Render the Marimekko Chart.
     * @param {Spotfire.DataView} dataView
     * @param {Spotfire.ModProperty<string>} xAxisMode
     * @param {Spotfire.ModProperty<string>} labelMode
     * @param {Spotfire.ModProperty<boolean>} chartMode
     * @param {Spotfire.ModProperty<boolean>} labelBars
     * @param {Spotfire.ModProperty<boolean>} labelSeg
     * @param {Spotfire.ModProperty<boolean>} numeric
     * @param {Spotfire.ModProperty<boolean>} percentage
     * @param {Spotfire.ModProperty<boolean>} category
     * @param {Spotfire.ModProperty<boolean>} reverseBars
     * @param {Spotfire.ModProperty<boolean>} reverseSeg
     * @param {Spotfire.ModProperty<boolean>} sortBar
     * @param {Spotfire.ModProperty<boolean>} sortSeg
     * @param {Spotfire.Size} size
     */
    async function render(dataView, 
                        xAxisMode, 
                        labelMode, 
                        chartMode, 
                        labelBars, 
                        labelSeg, 
                        numeric, 
                        percentage, 
                        category, 
                        reverseBars, 
                        reverseSeg, 
                        sortBar,
                        sortSeg, 
                        size) {

        if (state.preventRender) {
            // Early return if the state currently disallows rendering.
            return;
        }

        const onSelection = ({ dragSelectActive }) => {
            state.preventRender = dragSelectActive;
        };

        let modProperty = {
            xAxisMode: xAxisMode, 
            chartMode: chartMode, 
            labelMode: labelMode,
            labelBars: labelBars,
            labelSeg: labelSeg,
            numeric: numeric,
            percentage: percentage,
            category: category,
            reverseBars: reverseBars,
            reverseSeg: reverseSeg,
            sortBar: sortBar,
            sortSeg: sortSeg
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
        const zLimit = 1000;
        const colorLimit = 40;
        const colorCount = (await dataView.hierarchy("Color")).leafCount;
        const zCount = (await dataView.hierarchy("Z")).leafCount;
        if (colorCount > colorLimit || zCount > zLimit) {
            canvasDiv.remove();
                        mod.controls.errorOverlay.show("The resulting data view exceeded the size limit.", "dataViewSize1");
            if (zCount > zLimit) {
                mod.controls.errorOverlay.show(
                    `Maximum allowed Z axis values is ${zLimit}. Try aggregating the expression further.`,
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

        modContainer.onclick = (e) => {
            if (e.target === xTitleDiv ||
                e.target === modContainer ||
                e.target === canvasDiv ||
                e.target === scale) {
                dataView.clearMarking();
            }
        };

        // Get the leaf nodes for the x hierarchy. We will iterate over them to
        // render the bars.
        let Hierarchy = await dataView.hierarchy("Z");
        let Root = await Hierarchy.root();
        if (Root == null) {
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

        let dataViewXAxis = await dataView.continuousAxis("X");
        if (dataViewXAxis == null) {
            mod.controls.errorOverlay.show("No data on x axis.", "x");
            return;
        } else {
            mod.controls.errorOverlay.hide("x");
        }

        // Hide tooltip
        mod.controls.tooltip.hide();

        let Leaves = Root.leaves();
        let orderLeaves = Leaves;
        if(sortBar.value()){
            orderLeaves = [...Leaves].sort(sortBars);
        }
        if(reverseBars.value()){
            orderLeaves = [...Leaves].reverse();
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

        if (labelBars.value() && (numeric.value() || percentage.value())) {
            xTitleHeight = 20;
        } else {
            xTitleHeight = 0;
        }
        let totalValue = calculatedValue(Leaves);
        let maxYValue = calculateMaxYValue(Leaves); 
        
        context.isEditing && 
            initializeSettingsPopout(mod, modProperty);
        
        renderTitles(orderLeaves, labelBars, category, totalValue, labelMode);
        renderBars(dataView, orderLeaves, colorLeaves, modProperty, totalValue, maxYValue);
        renderAxis(mod, size, modProperty, totalValue, maxYValue, xScaleHeight, yScaleWidth, xTitleHeight);
        
        /**Mark segments after drawn rectangular selection*/
        rectangleMarking((result) => {
            onSelection(result);

            const { x, y, width, height, ctrlKey } = result;

            Leaves.forEach((leaf) => {
                leaf.rows()
                    .forEach((row) => {
                        const xId = row.categorical("Z").leafIndex;
                        const yId = Leaves[row.categorical("Z").leafIndex].rows().indexOf(row);
                        //console.log(`${xId},${yId}`);
                        let rowSegment = document.getElementById(`${xId},${yId}`);
                        //console.log(rowSegment);
                        if (rowSegment) {
                            const divRect = rowSegment.getBoundingClientRect();
                            if (
                                x < divRect.x + divRect.width &&
                                x + width > divRect.x &&
                                y < divRect.y + divRect.height &&
                                y + height > divRect.y
                            ) {
                                ctrlKey ? row.mark("ToggleOrAdd") : row.mark();
                            }
                        }
                    });
            });
        });

        context.signalRenderComplete();
    }

     /**
         * Render the horizontal scale.
         * @param {Spotfire.DataViewHierarchyNode[]} LeafNodes - The leaf nodes on the x axis
         * @param {Spotfire.ModProperty<boolean>} labelBars - Decides if titles should be rendered
         * @param {Spotfire.ModProperty<boolean>} category
         * @param {number} totalValue - The sum of all values in the graph
         * @param {Spotfire.ModProperty<string>} labelMode
         */
      function renderTitles(LeafNodes, labelBars, category, totalValue, labelMode) {
        xTitleDiv.innerHTML = "";
        if (labelBars.value() && category.value() && (labelMode.value() === "all" || labelMode.value() === "marked")){
            xTitleDiv.style.height = xTitleHeight + "px";
            xTitleDiv.style.left = yScaleWidth + "px";
            xTitleDiv.style.bottom = "0px";
            xTitleDiv.style.right = "20px";
            xTitleDiv.style.top = "0px";

            //Set with to align with x axes range
            let width = xTitleDiv.offsetWidth * 0.98;
            let offset = 0;
    
            LeafNodes.forEach((LeafNode) => {
                let totalWidthValue = sumValue(LeafNode.rows(), "X");
                let barWidth = (totalWidthValue / totalValue) * width - 1;
                if ((labelMode.value() === "all" || (labelMode.value() === "marked" && LeafNode.markedRowCount() > 0))){
                    xTitleDiv.appendChild(createBarLabel(LeafNode, barWidth, offset));
                }
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
     * @param {Spotfire.DataViewHierarchyNode[]} LeafNodes
     * @param {Spotfire.DataViewHierarchyNode[]} colorLeaves
     * @param {*} modProperty
     * @param {number} totalValue
     * @param {number} maxYValue
     */
    function renderBars(dataView, LeafNodes, colorLeaves, modProperty, totalValue, maxYValue) {
        canvasDiv.innerHTML = "";
        canvasDiv.style.left = yScaleWidth + "px";
        canvasDiv.style.bottom = xScaleHeight + "px";
        canvasDiv.style.top = xTitleHeight + "px";
        canvasDiv.style.right = "20px";

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
            sortBar,
            sortSeg } = modProperty;

        //Set width and height to align with axis range
        const canvasHeight = canvasDiv.offsetHeight * 0.98;
        const canvasWidth = canvasDiv.offsetWidth * 0.98;

        LeafNodes.forEach((leafNode) => canvasDiv.appendChild(renderBar(leafNode)));

        /**
         * Renders bars/segments for a single x axis node.
         * @param {Spotfire.DataViewHierarchyNode} LeafNode
         */
        function renderBar(LeafNode) {
            let fragment = document.createDocumentFragment();
            let rows = LeafNode.rows();

            fragment.appendChild(renderStackedBar(rows));

            return fragment;
        }

        /**
         * Render a stacked bar in the bar chart from a set of source rows.
         * @param {Spotfire.DataViewRow[]} rows
         */
        function renderStackedBar(rows) {
            let bar = createDiv("bar");
            var isMarked = 0; 

            var totalWidthValue = sumValue(rows, "X");
            var totalHeightValue = sumValue(rows, "Y");
            let percentageWidth = totalWidthValue / totalValue;

            let height;
            if (chartMode.value()){
                height = (totalHeightValue / maxYValue) * canvasHeight;
            } else {
                height = canvasHeight;
            }
            bar.style.height =  height + "px";
            bar.style.width = percentageWidth * canvasWidth - 1 + "px";

            let orderedRows = rows;
            if(sortSeg.value()){
                orderedRows = [...rows].sort(sortSegments);
            }
            if (reverseSeg.value()) {
                orderedRows = [...rows].reverse();
            }

            orderedRows.forEach((row) => {
                let y = row.continuous("Y");
                if (y.value() === null || y.value() < 1) {
                    return;
                }

                let segment = createDiv("segment");
                segment.id = `${row.categorical("Z").leafIndex},${rows.indexOf(row)}`;
                
                let percentSeg = ((+y.value() / totalHeightValue) * 100).toFixed(1);
                let percentageHeight = chartMode.value() ? +y.value() / maxYValue : +y.value() / totalHeightValue;
                segment.style.height = (percentageHeight * canvasHeight) - 1 + "px";
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
                        row.mark("Add");
                    } else {
                        row.mark(mode);
                    }
                };

                

                /** All possible combinations of showing labels for segments */
                if(labelSeg.value() && (labelMode.value() === "all" || (labelMode.value() === "marked" && row.isMarked()))){
                    if (category.value() && numeric.value() && percentage.value()){
                        let labelText = `${colorLeaves[rows.indexOf(row)].key}: ${+y.value()} (${percentSeg}%)`;
                        renderLabel(labelText);
                    } else if(category.value() && numeric.value()){
                        let labelText = `${colorLeaves[rows.indexOf(row)].key}: ${+y.value()}`;
                        renderLabel(labelText);
                    } else if (category.value() && percentage.value()){
                        let labelText = `${colorLeaves[rows.indexOf(row)].key}: ${percentSeg}%`;
                        renderLabel(labelText);
                    } else if (numeric.value() && percentage.value()){
                        let labelText = `${+y.value()} (${percentSeg}%)`;
                        renderLabel(labelText);
                    } else if(category.value()){
                        let labelText = `${colorLeaves[rows.indexOf(row)].key}`;
                        renderLabel(labelText);
                    } else if (numeric.value()){
                        let labelText = `${+y.value()}`;
                        renderLabel(labelText);
                    } else if (percentage.value()){
                        let labelText = `${percentSeg}%`;
                        renderLabel(labelText);
                    }
                }

                isMarked += row.isMarked() ? 1 : 0;

                /**
                 * Render a segment label for the segment
                 * @param {string} labelText
                 */
                 function renderLabel(labelText){
                    let label = createDiv("segment-label", labelText);
                    label.style.color = (getContrastYIQ(row.color().hexCode) === 'dark') ? context.styling.general.font.color : 'white';
                    label.style.fontSize = context.styling.scales.font.fontSize + "px";
                    label.style.fontFamily = context.styling.scales.font.fontFamily;
                    label.style.lineHeight = segment.style.height;
                    label.style.height = segment.style.height;
                    label.style.width = segment.style.width;
                    segment.appendChild(label);
                }

                /**
                 * Decide if text should be light or dark
                 * CAN THIS BE DONE DIFFERENTLY?? DOES THIS ALREADY EXIST??
                 * @param {string} hexcolor  
                 */
                function getContrastYIQ(hexcolor){
                    hexcolor = hexcolor.replace("#", "");
                    var r = parseInt(hexcolor.substr(0,2),16);
                    var g = parseInt(hexcolor.substr(2,2),16);
                    var b = parseInt(hexcolor.substr(4,2),16);
                    var yiq = ((r*299)+(g*587)+(b*114))/1000;
                    return (yiq >= 160) ? 'dark' : 'light';
                }

                bar.appendChild(segment);
            });

            if(labelBars.value() && (labelMode.value() === "all" || (labelMode.value() === "marked" && isMarked > 0))){
                if(numeric.value() && percentage.value()){
                    let labelText = `${totalWidthValue} (${(percentageWidth * 100).toFixed(1)}%)`;
                    renderBarValue(labelText);
                } else if (numeric.value()){
                    let labelText = `${totalWidthValue}`;
                    renderBarValue(labelText);
                } else if (percentage.value()){
                    let labelText = `${(percentageWidth * 100).toFixed(1)}%`;
                    renderBarValue(labelText);
                }
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
            return bar;
        }
    }
});

/**
 * Calculate the maximum value from a hierarchy.
 * @param {Spotfire.DataViewHierarchyNode[]} Leaves
 */
 function calculateMaxYValue(Leaves) {
    let maxYValue = 0;
    Leaves.forEach((node) => {
        let sum = sumValue(node.rows(), "Y");
        maxYValue = Math.max(maxYValue, sum);
    });
    return maxYValue;
}

/**
 * Calculate total value of the dataset to get percentages.
 * @param {Spotfire.DataViewHierarchyNode[]} Leaves
 */
 function calculatedValue(Leaves) {
    let totalValue = 0;
    Leaves.forEach((node) => {
        let sum = sumValue(node.rows(), "X");
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
    if(sumValue(b.rows() ,"X") < sumValue(a.rows() ,"X")){
        return -1;
    } else if (sumValue(a.rows() ,"X") < sumValue(b.rows() ,"X")){
        return 1;
    } else {
        return 0;
    }
}

/**
     * Sorts segments depending on value
     * @param {Spotfire.DataViewRow} a
     * @param {Spotfire.DataViewRow} b
     */
 function sortSegments(a, b){
    if(+b.continuous("Y").value() < +a.continuous("Y").value()){
        return -1;
    } else if (+a.continuous("Y").value() < +b.continuous("Y").value()){
        return 1;
    } else {
        return 0;
    }
}