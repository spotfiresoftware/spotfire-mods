/**
 * Prepare some dom elements that will persist  throughout mod lifecycle
 */
const modContainer = d3.select("#mod-container");
//const xScale = d3.select("#x-scale");
//const yScale = d3.select("#y-scale");

/**
 * A container for X axis labels.
 * Instead of figuring out the layout in special cases when labels don't fit, we delegate
 * this job to the DOM layout engine.
 */
//const xLabelsContainer = modContainer.append("div").attr("class", "x-axis-label-container");
/**
 * @param {Spotfire.Size} size
 * @param {number} xScaleHeight
 * @param {number} yScaleWidth
 * @param {number} xTitleHeight
 */
function renderAxis(size, xScaleHeight, yScaleWidth, xTitleHeight){

    //var container = d3.select('.elementClassName').node();
    //const width = container.getBoundingClientRect().width;
    //const height = container.getBoundingClientRect().height;

    const margin = { top: 20, right: 40, bottom: 20, left: 79}

    const width = size.width - (margin.left + margin.right);
    const height = size.height - (margin.top + margin.bottom);

    var svg = d3.select("#mod-container")
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        ;

    var xscale = d3.scaleLinear()
        .domain([0, 100])
        .range([margin.left, width]);

    var yscale = d3.scaleLinear()
            .domain([0, 100])
            .range([height, 0]);

    var x_axis = d3.axisBottom()
            .scale(xscale);

    var y_axis = d3.axisLeft()
            .scale(yscale);

        svg.append("g")
        .attr("transform", "translate(" + margin.left +", " + margin.top + ")")
        .call(y_axis);

    var xAxisTranslate = height/2 - margin.top;

        svg.append("g")
                .attr("transform", "translate(" + margin.left + ", " + xAxisTranslate  +")")
                .call(x_axis)
}