/**
 *
 * @param {Spotfire.Size} size
 * @param {any[]} data
 * @param {Spotfire.Mod} mod
 */
function pieChart(size, data, mod) {
    const width = size.width - 40;
    const height = size.height - 40;
    const radius = Math.min(width, height) / 2 - 40;

    d3.select("#chart-area svg").attr("width", width).attr("height", height);
    const g = d3.select("#chart-area svg g").attr("transform", `translate(${width / 2}, ${height / 2})`);

    const pie = d3.pie().value((d) => d.value);

    const arc = d3
        .arc()
        .padAngle(0.1 / data.length)
        .innerRadius(radius * 0.5)
        .outerRadius(radius);

    // Join new data
    const path = g.selectAll("path").data(pie(data), (d) => {
        return d.data.id;
    });

    let newPaths = path
        .enter()
        .append("path")
        .on("click", function (d) {
            d.data.mark();
        })
        .on("mouseenter", function (d) {
            mod.controls.tooltip.show(d.data.tooltip());
        })
        .on("mouseleave", function (d) {
            mod.controls.tooltip.hide();
        })
        .attr("fill", (d) => "transparent");

    path.merge(newPaths)
        .transition()
        .duration(300)
        .attr("fill", (d) => d.data.color)
        .attrTween("d", tweenArc)
        .attr("stroke", "none");

    function tweenArc(elem) {
        let prevValue = this.__prev || {};
        let newValue = elem;
        this.__prev = elem;

        var i = d3.interpolate(prevValue, newValue);

        return function (value) {
            return arc(i(value));
        };
    }

    path.exit().transition().duration(300).attr("fill", "transparent").remove();
}
