/**
 * Renders the Y and X axis for the mod using d3
 * @param {Spotfire.Mod} mod
 * @param {Spotfire.Size} size
 * @param {Spotfire.DataViewHierarchyNode[]} leafNodes
 * @param {*} modProperty
 * @param {number} totalValue
 * @param {number} maxYValue
 */
function renderAxis(mod, size, leafNodes, modProperty, totalValue, maxYvalue){
    // Variables
    const context = mod.getRenderContext();
    const styling = context.styling;
    const { xAxisMode, 
            chartMode,
            } = modProperty;

    const xOffset = leafNodes.length - 2;
    const widthX = d3.select("#canvas").style('width').slice(0, -2);
    const widthY = d3.select("#y-scale").style('width').slice(0, -2) - 1;
    const heightY = d3.select("#y-scale").style('height').slice(0, -2);
    var ScaleTickNumber = size.height / (styling.scales.font.fontSize * 4 + 6);

    // Remove previous content in svg
   // d3.selectAll("#y-scale > *").remove();
   // d3.selectAll("#x-scale > *").remove();

    // Svg container for the scales
    var svgX = d3.select("#x-scale")
        .style('color', styling.scales.tick.stroke);
    
    var svgY = d3.select("#y-scale")
        .style('color', styling.scales.tick.stroke);

    // Render x axis different depending on configuration
    if (xAxisMode.value() === "percentage"){
        var xFormat = d3.format(".0%");
        xscale = d3.scaleLinear()
        .domain([0, 1])
        .range([0, widthX]);
    } else if (xAxisMode.value() === "numeric"){
        var xFormat = d3.format("");
        var xscale = d3.scaleLinear()
        .domain([0, totalValue])
        .range([0, widthX]);
    }
    
    var x_axis = d3.axisBottom()
            .ticks(ScaleTickNumber)
            .tickSize(5)
            .tickFormat(xFormat)
            .tickPadding(styling.scales.tick.stroke != "none" ? 3 : 9)
            .scale(xscale); 

    // Render y axis different depending on chart mode
    if (chartMode.value() === "marimekko"){
        var yFormat = d3.format(".0%");
        yscale = d3.scaleLinear()
            .domain([1, 0])
            .range([-xOffset, heightY]);
    } else {
        var yFormat = d3.format("");
        var yscale = d3.scaleLinear()
            .domain([(maxYvalue), 0])
            .range([-xOffset, heightY]);
    }

    var y_axis = d3.axisLeft()
            .ticks(ScaleTickNumber)
            .tickFormat(yFormat)
            .scale(yscale);

    // Append x axis to svg
    svgX.append("g")
        .attr("id", "x-axis")
        .attr("transform", "translate(-1, " + xOffset + ")")
        .call(x_axis)
        .selectAll("text")
        .style('color', styling.scales.font.color)
        .style('font-size', styling.scales.font.fontSize)
        .style('font-family', styling.scales.font.fontFamily)
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

    // Append y axis to svg
    svgY.append("g")
        .attr("id", "y-axis")
        .attr("transform", "translate(" + widthY + ", " + xOffset + ")")
        .call(y_axis)
        .selectAll("text")
        .style('color', styling.scales.font.color)
        .style('font-size', styling.scales.font.fontSize)
        .style('font-family', styling.scales.font.fontFamily)
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
                }
            ])
            .then((clickedItem) => {
                if (clickedItem.text === "Percentage") {
                    xAxisMode.set("percentage");
                } else if (clickedItem.text === "Numeric") {
                    xAxisMode.set("numeric");
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
                })
            ];
            }
        );
    };

}
