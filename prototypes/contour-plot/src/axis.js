/*
 * Copyright © 2020. TIBCO Software Inc.
 * This file is subject to the license terms contained
 * in the license file that is distributed with this file.
 */

/**
 * Get access to the Spotfire Mod API by providing a callback to the initialize method.
 * @param {Spotfire.Mod} mod - mod api
 */

async function drawAxisX(svg, windowSize, margin, dataView) {
    var categories = (await dataView.allRows()).map((row) => {
        return row.categorical("X").formattedValue();
    });
    var x = d3
        .scaleBand()
        .domain([...new Set(categories)])
        .range([margin, windowSize.width]);

    var tickCount = Math.round(windowSize.width / windowSize.height * 20);
    var skip = Math.round(x.domain().length / tickCount);
    var tickValues = x.domain().filter((d, i) => !(i % skip));

    var xAxis = (g) =>
        g
            .attr("transform", `translate(0, ${margin})`)
            .call(d3.axisTop(x).scale(x).tickValues(tickValues))
            .call((g) => g.select(".domain").remove());
    svg.append("g").call(xAxis);
}

async function drawAxisY(svg, windowSize, margin, dataView) {
    var categories = (await dataView.allRows()).map((row) => {
        return row.categorical("Y").formattedValue();
    });

    var y = d3
        .scaleBand()
        .domain([...new Set(categories)])
        .range([margin, windowSize.height])

    var tickCount = Math.round(windowSize.height / windowSize.width * 10);
    var skip = Math.round(y.domain().length / tickCount);
    var tickValues = y.domain().filter((d, i) => !(i % skip));

    var yAxis = (g) =>
        g
            .attr("transform", `translate(${margin}, 0)`)
            .call(
                d3
                    .axisLeft(y)
                    .scale(y)
                    .tickValues(tickValues)
            )
            .call((g) => g.select(".domain").remove());
    svg.append("g").call(yAxis);
}
