// Transform value n in scale [a,b] to scale [c, d]
function transformScale(n, a, b, c, d) {
    var oldRange = a - b;
    var newRange = c - d;
    return ((n - a) * newRange) / oldRange + c;
}

function color(thresholds) {
    return;
}

async function drawContour(svg, dataView, windowSize, margin, segments, smooth, showLines) {
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
    var values = (await dataView.allRows()).map((row) => {
        return row.continuous("Z").value();
    });

    var colors = (await dataView.allRows()).map((row) => {
        return {
            z: row.continuous("Z").value(),
            color: row.color().hexCode
        };
    });

    colors.sort((a, b) => a.z - b.z);

    var min = values.reduce((n, acc) => Math.min(n, acc), Number.MAX_VALUE);
    var max = values.reduce((n, acc) => Math.max(n, acc), Number.MIN_VALUE);

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
        .thresholds(thresholds)(values)
        .map(transform);

    svg.append("g")
        .attr("stroke", showLines ? "#FFFFFF" : "none")
        .attr("stroke-opacity", 0.5)
        .attr("transform", `translate(0, ${margin})`)
        .selectAll("path")
        .data(contours)
        .join("path")
        .attr("fill", (d) => color(d.value))
        .attr("d", d3.geoPath());
}
