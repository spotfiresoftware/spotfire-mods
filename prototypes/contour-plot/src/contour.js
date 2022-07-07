// Transform value n in scale [a,b] to scale [c, d]
function transformScale(n, a, b, c, d) {
    var oldRange = a - b;
    var newRange = c - d;
    return ((n - a) * newRange) / oldRange + c;
}

async function drawContour(mod, svg, dataView, xScale, yScale, windowSize, margin, segments, smooth, showLines) {
    var dataWidth = (await dataView.categoricalAxis("X")).hierarchy.leafCount;
    var dataHeight = (await dataView.categoricalAxis("Y")).hierarchy.leafCount;
    // Transfer point from gridspace to screenspace
    function transform({ type, value, coordinates }) {
        return {
            type,
            value,
            coordinates: coordinates.map((rings) => {
                return rings.map((points) => {
                    return points.map(([x, y]) => [
                        transformScale(y, 0, dataWidth, margin, windowSize.width),
                        transformScale(x, 0, dataHeight, 0, windowSize.height - margin)
                    ]);
                });
            })
        };
    }

    var data = (await dataView.allRows()).map((row) => {
        var x = dataView.categoricalAxis("X") ? row.categorical("X").formattedValue() : row.continuous("X").value();
        var y = dataView.categoricalAxis("Y") ? row.categorical("Y").formattedValue() : row.continuous("Y").value();

        return {
            x: x,
            y: y,
            weight: row.continuous("Z").value(),
            isMarked: row.isMarked(),
            row: row
        };
    });

    var colors = (await dataView.allRows()).map((row) => {
        if (mod.visualization.axis("Color").isCategorical) {
        }
        else {
        }
        return {
            z: row.continuous("Z").value(),
            color: row.color().hexCode
        };
    });

    colors.sort((a, b) => a.z - b.z);

    var min = data.reduce((acc, d) => Math.min(d.weight, acc), Number.MAX_VALUE);
    var max = data.reduce((acc, d) => Math.max(d.weight, acc), Number.MIN_VALUE);

    var color = d3
        .scaleLinear()
        .domain(colors.map((v) => v.z))
        .range(colors.map((v) => v.color))
        .interpolate(d3.interpolateRgb.gamma(2.2));

    var thresholds = d3.quantize(d3.interpolate(min, max), segments);
    var contours = d3
        .contours()
        .size([dataWidth, dataHeight])
        .smooth(smooth)
        .thresholds(thresholds)(data.map((d) => d.weight))
        .map(transform);

    // Calculate contour value range for tooltip
    for (var i = 0; i < thresholds.length; i++) {
        contours[i].low = thresholds[i];
        if (i+1 < thresholds.length) {
            contours[i].high = thresholds[i+1]
        }
    }



    // Contours
    svg.append("g")
        .attr("stroke", showLines ? "white" : "none")
        .attr("stroke-opacity", 0.5)
        .attr("transform", `translate(0, ${margin})`)
        .selectAll("path")
        .data(contours)
        .join("path")
        .attr("fill", (d) => color(d.value))
        .attr("d", d3.geoPath());

    // Actual values
    svg.append("g")
        .attr("stroke", "rgba(0,0,0,0)")
        .attr("fill", "rgba(0,0,0,0)")
        .attr("pointer-events", "none")
        .attr("stroke-opacity", 0.7)
        .selectAll("circle")
        .data(data)
        .join("rect")
        .attr("stroke", (d) => d.isMarked ? "black" : "rgba(0,0,0,0)")
        .attr("x", (d) => xScale(d.x))
        .attr("y", (d) => yScale(d.y))
        .attr("width", windowSize.width / dataWidth)
        .attr("height", windowSize.height / dataHeight);

    var contours = svg.selectAll("path");
    contours.on("mouseenter", function (e) {
        var lowRounded = Math.round(e.low*100)/100;
        var highRounded = Math.round(e.high*100)/100;
        var tooltip = `Contour: ${lowRounded} - ${highRounded}`
        mod.controls.tooltip.show(tooltip);
        d3.select(this).attr("class", "hover")
    });

    contours.on("mouseout", function (e) {
        d3.select(this).attr("class", null);
    });

    // Mark all rows with values within the contour threshhold
    contours.on("mousedown", async function (e) {
        var rows = await dataView.allRows();
        var markingOperator = event.ctrlKey || event.shiftKey ? "Add" : "Replace";
        console.log(markingOperator);
        mod.transaction(() => {
            rows.map(row => {
                var z = row.continuous("Z").value();
                if (z >= e.low) {
                    if (e.high != undefined) {
                        if (z <= e.high) {
                            row.mark(markingOperator);
                        }
                    } else {
                        row.mark(markingOperator);
                    }
                }
            });
        })
    });
}
