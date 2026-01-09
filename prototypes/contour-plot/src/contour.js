// Transform value n in scale [a,b] to scale [c, d]
function transformScale(n, a, b, c, d) {
    var oldRange = a - b;
    var newRange = c - d;
    return ((n - a) * newRange) / oldRange + c;
}

async function drawContour(mod, svg, dataView, windowSize, margin, segments, smooth, showLines) {
    var dataWidth = (await dataView.categoricalAxis("X")).hierarchy.leafCount;
    var dataHeight = (await dataView.categoricalAxis("Y")).hierarchy.leafCount;

    // Transfer point from gridspace to screenspace.
    function transform({ type, value, coordinates }) {
        return {
            type,
            value,
            coordinates: coordinates.map((rings) => {
                return rings.map((points) => {
                    return points.map(([x, y]) => [
                        transformScale(x, 0, dataWidth, margin, windowSize.width),
                        transformScale(y, 0, dataHeight, 0, windowSize.height - margin)
                    ]);
                });
            })
        };
    }

    var data = (await dataView.allRows()).map((row) => ({
        x: row.categorical("X").formattedValue(),
        y: row.categorical("Y").formattedValue(),
        weight: row.continuous("Z").value(),
        isMarked: row.isMarked(),
        row: row
    }));

    // Get all the colors from the color axis
    var colors = (await dataView.allRows()).map((row) => ({
        z: row.continuous("Z").value(),
        color: row.color().hexCode
    }));

    // Sort them in order of weight
    colors.sort((a, b) => a.z - b.z);

    // Use this sorted color list to create a gradient
    var color = d3
        .scaleLinear()
        .domain(colors.map((v) => v.z))
        .range(colors.map((v) => v.color))
        .interpolate(d3.interpolateRgb.gamma(2.2));

    var values = data.map(d => d.weight);
    values.sort((a, b) => a - b);

    // Thresholds are based on interpolateBasis, which avoids datasets with extreme differences in values from placing all contours around such a spike.
    var thresholds = d3.quantize(d3.interpolateBasis(values), segments);
    var contours = d3
        .contours()
        .size([dataWidth, dataHeight])
        .smooth(smooth)
        .thresholds(thresholds)(data.map((d) => d.weight))
        .map(transform);

    // Calculate contour value range for tooltip.
    // The midpoint ("value") is used to pick the color.
    for (var i = 0; i < thresholds.length; i++) {
        contours[i].low = thresholds[i];
        if (i + 1 < thresholds.length) {
            contours[i].high = thresholds[i + 1]
            contours[i].value = (contours[i].low + contours[i].high) / 2.0;
        } else {
            contours[i].value = contours[i].low;
        }
    }

    // Draw the countours.
    svg.append("g")
        .attr("stroke", showLines ? "white" : "none")
        .attr("stroke-opacity", 0.5)
        .attr("transform", `translate(0, ${margin})`)
        .selectAll("path")
        .data(contours)
        .join("path")
        .attr("fill", (d) => color(d.value))
        .attr("d", d3.geoPath());

    // Tooltip and selection highlight event listener.
    var contours = svg.selectAll("path");
    contours.on("mouseenter", function (e) {
        var lowRounded = Math.round(e.low * 100) / 100;
        var highRounded = Math.round(e.high * 100) / 100;
        var midRounded = Math.round(e.value * 100) / 100;
        var tooltip = `Min: ${lowRounded}\nMid: ${midRounded}\nMax: ${highRounded}`
        mod.controls.tooltip.show(tooltip);
        d3.select(this).attr("class", "hover")
    });

    contours.on("mouseout", function (e) {
        d3.select(this).attr("class", null);
    });

    // Mark all rows with values within the contour threshhold.
    // If ctrl or shift key is held when clicked add instead of replace markings.
    contours.on("mousedown", async function (e) {
        var rows = await dataView.allRows();
        var markingOperator = event.ctrlKey || event.shiftKey ? "Add" : "Replace";
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
