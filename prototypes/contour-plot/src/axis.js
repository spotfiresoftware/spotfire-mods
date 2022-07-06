/*
 * Copyright © 2020. TIBCO Software Inc.
 * This file is subject to the license terms contained
 * in the license file that is distributed with this file.
 */

/**
 * Get access to the Spotfire Mod API by providing a callback to the initialize method.
 * @param {Spotfire.Mod} mod - mod api
 */

async function drawAxisX(windowSize, margin, dataView) {
    if (dataView.categoricalAxis("X")) {
        var categories = (await dataView.allRows()).map((row) => {
            return row.categorical("X").formattedValue();
        });
        var x = d3
            .scaleBand()
            .domain([...new Set(categories)])
            .range([margin, windowSize.width]);

        var tickCount = Math.round(windowSize.width / windowSize.height * 10);
        var skip = Math.round(x.domain().length/tickCount);
        var tickValues = x.domain().filter((d,i) => !(i%skip));

        var xAxis = (g) =>
            g
                .attr("transform", `translate(0, ${margin})`)
                .call(d3.axisTop(x).scale(x).tickValues(tickValues))
                .call((g) => g.select(".domain").remove());
        return xAxis;
    } else {
        var xValues = (await dataView.allRows()).map((row) => {
            return row.continuous("X").value();
        });

        var min = xValues.reduce((n, acc) => Math.min(n, acc), Number.MAX_VALUE);
        var max = xValues.reduce((n, acc) => Math.max(n, acc), Number.MIN_VALUE);
        var x = d3.scaleLinear([min, max], [margin, windowSize.width]);
        var xAxis = (g) =>
            g
                .attr("transform", `translate(0, ${margin})`)
                .call(
                    d3
                        .axisTop(x)
                        .scale(x)
                        .ticks((windowSize.width / windowSize.height) * 10)
                )
                .call((g) => g.select(".domain").remove());
        return xAxis;
    }
}

async function drawAxisY(windowSize, margin, dataView) {
    if (dataView.categoricalAxis("Y")) {
        var categories = (await dataView.allRows()).map((row) => {
            return row.categorical("Y").formattedValue();
        });

        var y = d3
            .scaleBand()
            .domain([...new Set(categories)])
            .range([margin, windowSize.height])

        var tickCount = Math.round(windowSize.height / windowSize.width * 10);
        var skip = Math.round(y.domain().length/tickCount);
        var tickValues = y.domain().filter((d,i) => !(i%skip));

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
        return yAxis;
    } else {
        var yValues = (await dataView.allRows()).map((row) => {
            return row.continuous("Y").value();
        });

        var min = yValues.reduce((n, acc) => Math.min(n, acc), Number.MAX_VALUE);
        var max = yValues.reduce((n, acc) => Math.max(n, acc), Number.MIN_VALUE);

        var y = d3.scaleLinear().domain([min, max]).range([margin, windowSize.height]);
        var yAxis = (g) =>
            g
                .attr("transform", `translate(${margin}, 0)`)
                .call(
                    d3
                        .axisLeft(y)
                        .scale(y)
                        .ticks((windowSize.height / windowSize.width) * 10)
                )
                .call((g) => g.select(".domain").remove());
        return yAxis;
    }
}
