/**
 * Renders the Y and X axis for the mod using d3
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
    // Variables
    const context = mod.getRenderContext();
    const styling = context.styling;
    const { xAxisMode, 
        chartMode,
        } = modProperty;

    const margin = { top: xTitleHeight, right: 22, bottom: xScaleHeight + 1, left: yScaleWidth - 1}
    var width = size.width - margin.right;
    var height = size.height;

    // Remove previous content in svg
    d3.selectAll("#scale > *").remove();

    // Svg container for the scales
    var svg = d3.select("#scale")
        .attr("width", width)
        .attr("height", height)
        .style('color', styling.scales.tick.stroke);

    // Render x axis different depending on configuration
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
            .tickSizeOuter([0])
            .scale(xscale); 

    // Render y axis different depending on chart mode
    if (chartMode.value() === "marimekko"){
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

    // Append y axis to svg
    svg.append("g")
        .attr("id", "y-axis")
        .attr("transform", "translate(" + margin.left +",0)")
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
    
    var xVerticalPlacement = height - margin.bottom;

    // Append x axis to svg
    svg.append("g")
        .attr("id", "x-axis")
        .attr("transform", "translate( 0, " + xVerticalPlacement + ")")
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
