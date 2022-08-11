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
        mod.property("title-label"),
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
     * @param {Spotfire.ModProperty<string>} chartMode
     * @param {Spotfire.ModProperty<boolean>} titleMode
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
                        titleMode, 
                        labelBars, 
                        labelSeg, 
                        numeric, 
                        percentage, 
                        category, 
                        reverseBars, 
                        reverseSeg, 
                        sortBar,
                        sortSeg, 
                        size)
    {
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
            titleMode: titleMode, 
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
        const xLimit = 1000;
        const colorLimit = 100;
        const colorCount = (await dataView.hierarchy("Color")).leafCount;
        const xCount = (await dataView.hierarchy("Categories")).leafCount;
        if (colorCount > colorLimit || xCount > xLimit) {
            canvasDiv.remove();
                        mod.controls.errorOverlay.show("The resulting data view exceeded the size limit.", "dataViewSize1");
            if (xCount > xLimit) {
                mod.controls.errorOverlay.show(
                    `Maximum number of categories is limited to ${xLimit}. Try aggregating the expression further.`,
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

        //Clear marking of segments
        modContainer.onclick = (e) => {
            if (e.target === xTitleDiv ||
                e.target === modContainer ||
                e.target === canvasDiv ||
                e.target === scale) {
                dataView.clearMarking();
            }
        };

        // Get the leaf nodes for the category hierarchy. We will iterate over them to
        // render the bars.
        let Hierarchy = await dataView.hierarchy("Categories");
        let Root = await Hierarchy.root();
        if (Root == null) {
            // Return and wait for next call to render when reading data was aborted.
            // Last rendered data view is still valid from a users perspective since
            // a document modification was made during a progress indication.
            return;
        }

        // Only stop visualization if both Y and X are not set
        let dataViewYAxis = await dataView.continuousAxis("Y");
        let dataViewXAxis = await dataView.continuousAxis("X");
        if (dataViewYAxis == null && dataViewXAxis == null) {
            mod.controls.errorOverlay.show("No data to visualize.", "dataViewSize4");
            return;
        } else {
            mod.controls.errorOverlay.hide("dataViewSize4");
        }

        // Hide tooltip
        mod.controls.tooltip.hide();

        //The visualization cannot handle negative values
        let Leaves = Root.leaves();
        if (lowestValue(Leaves, "Y", dataViewYAxis) < 0 || lowestValue(Leaves, "X", dataViewXAxis) < 0){
            mod.controls.errorOverlay.show("The data contains negative values which this mod can not visualize, please filter out the negative data and try again!", "dataViewSize5")
        } else {
            mod.controls.errorOverlay.hide("dataViewSize5");
        }
        
        // Set order of bars
        let orderLeaves = Leaves;
        if(sortBar.value()){
            orderLeaves = [...Leaves].sort(sortBars);
        }
        if(reverseBars.value()){
            orderLeaves = [...Leaves].sort(sortBars).reverse();
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
        let categoricalColorCount = colorHierarchy ? colorHierarchy.leafCount : 0;
        
        // Create space for bar labels
        if ((labelMode.value() === "all" || 
            (labelMode.value() === "marked" && markedElem(Leaves))) 
            && (labelBars.value() && (numeric.value() || percentage.value()))) {
            xTitleHeight = 15 * size.height/(canvasDiv.offsetHeight);
        } else if (titleMode.value()){
            xTitleHeight = 10;
        } else {
            xTitleHeight = 0;
        }
        
        let maxXValue = (dataViewXAxis == null) ? 0 : calculatedValue(Leaves);
        let maxYValue = (dataViewYAxis == null) ? 0 : calculateMaxYValue(Leaves); 
        
        // Options menu not visible when viewing
        context.isEditing && 
            initializeSettingsPopout(mod, modProperty);
        
        renderTitles(orderLeaves, titleMode, dataViewXAxis, maxXValue);
        renderBars(orderLeaves, colorLeaves, modProperty, maxXValue, maxYValue, dataViewYAxis, dataViewXAxis, categoricalColorCount);
        renderAxis(mod, size, modProperty, maxXValue, maxYValue, xScaleHeight, yScaleWidth, xTitleHeight);
        
        // Mark segments after drawn rectangular selection
        rectangleMarking((result) => {
            onSelection(result);

            const { x, y, width, height, ctrlKey } = result;

            Leaves.forEach((leaf) => {
                leaf.rows()
                    .forEach((row) => {
                        const xId = row.categorical("Categories").leafIndex;
                        const yId = Leaves[row.categorical("Categories").leafIndex].rows().indexOf(row);
                        let rowSegment = document.getElementById(`${xId},${yId}`);
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
         * @param {Spotfire.ModProperty<boolean>} titleMode 
         * @param {Spotfire.DataViewContinuousAxis} dataViewXAxis
         * @param {number} maxXValue - The sum of all values in the graph
         */
      function renderTitles(LeafNodes, titleMode, dataViewXAxis, maxXValue) {
        xTitleDiv.innerHTML = "";
        if (titleMode.value()){
            xTitleDiv.style.height = xTitleHeight + "px";
            xTitleDiv.style.left = yScaleWidth + "px";
            xTitleDiv.style.bottom = "0px";
            xTitleDiv.style.right = "20px";
            xTitleDiv.style.top = "0px";

            // Set width to align with x axis range
            let width = xTitleDiv.offsetWidth * 0.98;
            let offset = 0;
            const setWidth = width / LeafNodes.length;
    
            LeafNodes.forEach((LeafNode) => {
                let percentageWidth = (dataViewXAxis !== null) ? sumValue(LeafNode.rows(), "X") / maxXValue * width : 0;
                let barWidth = (dataViewXAxis === null) ? setWidth - 1 : percentageWidth - 1;
                xTitleDiv.appendChild(createBarLabel(LeafNode, barWidth, offset));
                offset += barWidth;
            });
        } 

        /**
         * Render a scale label for titles of the leaf node on the x axis
         * @param {Spotfire.DataViewHierarchyNode} LeafNode
         * @param {number} xPosition
         * @param {number} offset
         */
        function createBarLabel(LeafNode, xPosition, offset) {
            let label = createDiv("bar-category-label", "" + LeafNode.key);
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
     * @param {Spotfire.DataViewHierarchyNode[]} LeafNodes
     * @param {Spotfire.DataViewHierarchyNode[]} colorLeaves
     * @param {*} modProperty
     * @param {number} maxXValue
     * @param {number} maxYValue
     * @param {Spotfire.DataViewContinuousAxis} dataViewYAxis
     * @param {Spotfire.DataViewContinuousAxis} dataViewXAxis
     * @param {number} categoricalColorCount
     */
    function renderBars(LeafNodes, colorLeaves, modProperty, maxXValue, maxYValue, dataViewYAxis, dataViewXAxis, categoricalColorCount) {
        canvasDiv.innerHTML = "";
        canvasDiv.style.left = yScaleWidth + "px";
        canvasDiv.style.bottom = xScaleHeight + "px";
        canvasDiv.style.top = xTitleHeight + "px";
        canvasDiv.style.right = "20px";

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

        // Set width and height to align with axis range
        const canvasHeight = canvasDiv.offsetHeight * 0.98;
        const canvasWidth = canvasDiv.offsetWidth * 0.98;
        const setWidth = canvasWidth / LeafNodes.length;

        LeafNodes.forEach((leafNode) => {
            canvasDiv.appendChild(renderBar(leafNode));
        });

        /**
         * Renders bars/segments for a single x axis node.
         * @param {Spotfire.DataViewHierarchyNode} LeafNode
         */
        function renderBar(LeafNode) {
            let fragment = document.createDocumentFragment();
            let rows = LeafNode.rows();

            // If Y axis is not set, render chart with 100% bars for every category
            if (dataViewYAxis == null) {
                // Render bars side by side. We need to add one bar per color to
                // keep all groups equally wide. So we create a sparse array where
                // we store the rows per color index, and render a bar for each
                // element in the array.
                let bars = new Array(categoricalColorCount).fill(null);
                rows.forEach((row) => {
                    let colorValue = row.categorical("Color");
                    bars[colorValue.leafIndex] = row;
                });

                bars.forEach((row) => {
                    fragment.appendChild(renderStackedBar(row ? [row] : []));
                });
            } else {
                fragment.appendChild(renderStackedBar(rows));
            }

            return fragment;
        }

        /**
         * Render a stacked bar in the bar chart from a set of source rows.
         * @param {Spotfire.DataViewRow[]} rows
         */
        function renderStackedBar(rows) {
            let bar = createDiv("bar");

            var totalWidthValue = (dataViewXAxis !== null) ? sumValue(rows, "X") : 0;
            var totalHeightValue = (dataViewYAxis !== null) ? sumValue(rows, "Y") : 0;
            let percentageWidth = totalWidthValue / maxXValue;

            let height = (chartMode.value() == "mekko" || dataViewXAxis === null) ? 
                (totalHeightValue / maxYValue) * canvasHeight 
                : canvasHeight;
            bar.style.height =  height + "px";

            // Bar width is constant if X axis is not set
            let width = (dataViewXAxis === null) ? setWidth : percentageWidth * canvasWidth;
            bar.style.width = width - 1 + "px";
            
            // Set order of bar segments
            let orderedRows = rows;
            if(sortSeg.value()){
                orderedRows = [...rows].sort(sortSegments);
            }
            if(reverseSeg.value()) {
                orderedRows = [...rows].sort(sortSegments).reverse();
            }

            // Draw segments
            orderedRows.forEach((row) => {
                let segment = createDiv("segment");
                segment.id = `${row.categorical("Categories").leafIndex},${rows.indexOf(row)}`;
                let y, percentageHeight, percentageSeg;

                // Only possible with Y axis set
                if (dataViewYAxis !== null){
                    y = row.continuous("Y");
                    if (y.value() === null || y.value() < 1) {
                        return;
                    }

                    percentageSeg = ((+y.value() / totalHeightValue) * 100).toFixed(1);
                    percentageHeight = (chartMode.value() == "mekko" || dataViewXAxis === null) ? +y.value() / maxYValue : +y.value() / totalHeightValue;
                } 
                
                segment.style.height = (dataViewYAxis !== null) ? (percentageHeight * canvasHeight) - 1 + "px" : canvasHeight + "px";
                segment.style.backgroundColor = row.color().hexCode;
                segment.style.width = bar.style.width;
                segment.style.marginBottom = "1px";
                
                // Hover over segment event 
                segment.onmouseover = (e) => {
                    mod.controls.tooltip.show(row);
                    segment.style.outline = "1px solid currentColor";
                };
                segment.onmouseout = (e) => {
                    mod.controls.tooltip.hide();
                    segment.style.outline = "none";
                };

                // Click on segment
                segment.onclick = (e) => {
                    /** @type{Spotfire.MarkingOperation} */
                    let mode = e.ctrlKey ? "Toggle" : "Replace";
                    if (e.shiftKey) {
                        row.mark("Add");
                    } else {
                        row.mark(mode);
                    }
                };

                let segValue = (dataViewYAxis === null) ? +row.continuous("X").value : +y.value();
                // All possible combinations of showing labels for segments 
                if(labelSeg.value() && (labelMode.value() === "all" || (labelMode.value() === "marked" && row.isMarked()))){
                    if (category.value() && numeric.value() && percentage.value()){
                        let labelText = `${colorLeaves[rows.indexOf(row)].key}, ${segValue} (${percentageSeg}%)`;
                        renderLabel(labelText);
                    } else if(category.value() && numeric.value()){
                        let labelText = `${colorLeaves[rows.indexOf(row)].key}, ${segValue}`;
                        renderLabel(labelText);
                    } else if (category.value() && percentage.value()){
                        let labelText = `${colorLeaves[rows.indexOf(row)].key} (${percentageSeg}%)`;
                        renderLabel(labelText);
                    } else if (numeric.value() && percentage.value()){
                        let labelText = `${segValue} (${percentageSeg}%)`;
                        renderLabel(labelText);
                    } else if(category.value()){
                        let labelText = `${colorLeaves[rows.indexOf(row)].key}`;
                        renderLabel(labelText);
                    } else if (numeric.value()){
                        let labelText = `${segValue}`;
                        renderLabel(labelText);
                    } else if (percentage.value()){
                        let labelText = `${percentageSeg}%`;
                        renderLabel(labelText);
                    }
                }

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
                 * Decide if label text should be light or dark
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

            // The possible combinations for the complete bar label
            if(labelBars.value() && (labelMode.value() === "all" || (labelMode.value() === "marked" && markedElemInRow(rows)))){
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
                label.style.width = bar.style.width;
                bar.appendChild(label); 
            }
            return bar;
        }
    }
});

/**
 * Gets the lowest data value, used to determine if any value is lower than 0
 * @param {Spotfire.DataViewHierarchyNode[]} Leaves
 * @param {string} axis 
 * @param {Spotfire.DataViewContinuousAxis} dataViewAxis
 */
function lowestValue(Leaves, axis, dataViewAxis) {
    let lowestValue = 0;
    if (dataViewAxis !== null) {
        Leaves.forEach((leaf) => 
            leaf.rows().forEach((row) => {
                lowestValue = Math.min(row.continuous(axis).value(), lowestValue);
            }

        ));
    }
    return lowestValue;
}

/**
 * Check if any segment is marked
 * @param {Spotfire.DataViewHierarchyNode[]} Leaves 
 * @returns {boolean}
 */
function markedElem(Leaves) {
    let isMarked = 0;
    Leaves.forEach((leaf) =>
        leaf.rows().forEach((row) => {
            isMarked += row.isMarked() ? 1 : 0;
        }
    ));
    return (isMarked > 0) ? true: false;
}

/**
 * Check if any segment is marked
 * @param {Spotfire.DataViewRow[]} rows 
 * @returns {boolean}
 */
 function markedElemInRow(rows) {
    let isMarked = 0;
    rows.forEach((row) => {
        isMarked += row.isMarked() ? 1 : 0;
    })
    return (isMarked > 0) ? true: false;
}

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
 * @param {Spotfire.DataViewRow[]} rows 
 * @param {string} axis 
 */
function sumValue(rows, axis) {
    return rows.reduce((p, c) => +c.continuous(axis).value() + p, 0);
}

/**
 * Calculate the max value for an axis from a set of rows. Null values are treated as 0.
 * @param {Spotfire.DataViewRow[]} rows 
 * @param {string} axis 
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
 * @param {string} className
 * @param {string | HTMLElement} [content] 
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
     * Helper function for sort to sort bars depending on value
     * @param {Spotfire.DataViewHierarchyNode} a
     * @param {Spotfire.DataViewHierarchyNode} b
     */
function sortBars(a, b){
    if(sumValue(b.rows() ,"X") < sumValue(a.rows() ,"X")){
        return 1;
    } else if (sumValue(a.rows() ,"X") < sumValue(b.rows() ,"X")){
        return -1;
    } else {
        return 0;
    }
}

/**
     * Helper function for sort to sort segments depending on value
     * @param {Spotfire.DataViewRow} a
     * @param {Spotfire.DataViewRow} b
     */
function sortSegments(a, b){
    if(+b.continuous("Y").value() < +a.continuous("Y").value()){
        return 1;
    } else if (+a.continuous("Y").value() < +b.continuous("Y").value()){
        return -1;
    } else {
        return 0;
    }
}