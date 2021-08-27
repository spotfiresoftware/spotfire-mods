import * as d3 from "d3";
import { HierarchyRectangularNode } from "d3";
import { DataView, DataViewHierarchyNode, DataViewRow, Size } from "spotfire-api";
export const hierarchyAxisName = "Hierarchy";
export const sizeAxisName = "Size";

// Main function to draw and set up the visualization, once we have the data.
export function render(
    dataView: DataView,
    size: Size,
    rootNode: DataViewHierarchyNode,
    hasSize: boolean,
    colorFromLevel: number
) {
    var svg = document.querySelector("#mod-container svg");
    if (svg) {
        document.querySelector("#mod-container")!.removeChild(svg);
    }

    let radius = Math.min(size.width, size.height) / 2;

    const getSize = (r: DataViewRow) => (hasSize ? r.continuous(sizeAxisName).value<number>() || 0 : 1);

    const arc = d3
        .arc<{ x0: number; y0: number; x1: number; y1: number }>()
        .startAngle((d) => d.x0)
        .endAngle((d) => d.x1)
        .padAngle((d) => Math.min((d.x1 - d.x0) / 2, 0.01))
        .padRadius(radius / 2)
        .innerRadius((d) => d.y0)
        .outerRadius((d) => d.y1 - 1);

    let vis = d3
        .select("#mod-container")
        .append("svg:svg")
        .attr("width", size.width)
        .attr("height", size.height)
        .append("svg:g")
        .attr("id", "container")
        .attr("transform", "translate(" + size.width / 2 + "," + size.height / 2 + ")");

    // Background circle for easier mouse leave detection.
    vis.append("svg:circle").attr("r", radius).style("opacity", 0);

    document.querySelector("#mod-container svg")!.addEventListener("click", dataView.clearMarking);

    let partition = d3.partition().size([Math.PI * 2, radius]);

    let totalSize = rootNode.rows().reduce((p: number, c: DataViewRow) => p + getSize(c), 0);

    let hierarchy = d3
        .hierarchy(rootNode, (d) => d.children)
        .sum((d) => {
            return !d.children ? d.rows().reduce((p, c) => p + getSize(c), 0) : 0;
        });

    let partitionLayout = partition(hierarchy) as HierarchyRectangularNode<DataViewHierarchyNode>;


    let path = vis
        .data([rootNode])
        .selectAll("path")
        .data(partitionLayout.descendants().filter((d) => d.depth))
        .enter()
        .append("svg:path")
        .attr("d", arc)
        .on("click", (d) => {
            d.data.mark();
            d3.event.stopPropagation();
        })
        .style("stroke-width", 2)
        .style("fill", function (d) {
            if (
                d.data
                    .rows()[0]
                    .categorical(hierarchyAxisName)
                    .value()
                    .slice(0, d.depth)
                    .find((pathElement) => pathElement.value() == null)
            ) {
                return "transparent";
            }

            if (d.depth <= colorFromLevel) {
                return "#ddd";
            }

            let firstMarkedRow = d.data.rows().findIndex((r) => r.isMarked());
            if (firstMarkedRow == -1) {
                firstMarkedRow = 0;
            }

            return d.data.rows()[firstMarkedRow].color().hexCode; /* colors[d.name]; */
        })
        .on("mouseover", onMouseover);

    d3.select("#container").on("mouseleave", onMouseleave);

    function onMouseleave(d: any) {
        d3.selectAll("path").on("mouseover", null);

        d3.selectAll("path")
            .transition()
            .duration(500)
            .style("stroke", "transparent")
            .on("end", function () {
                d3.select(this).on("mouseover", onMouseover);
            });
    }

    function onMouseover(d: any) {
        let percentage = (100 * d.value) / totalSize;
        let percentageString = percentage.toPrecision(3) + "%";
        if (percentage < 0.1) {
            percentageString = "< 0.1%";
        }

        d3.select("#percentage").text(percentageString);
        d3.select("#value").text(d.data.formattedValue());

        let ancestors = getAncestors(d);

        d3.selectAll("path").style("stroke", "transparent");

        vis.selectAll("path")
            .filter((node: any) => ancestors.indexOf(node) >= 0)
            .style("stroke", "#888");
    }
}

function getAncestors(node: d3.HierarchyNode<DataViewHierarchyNode>) {
    let path = [];
    let current = node;
    while (current.parent) {
        path.unshift(current);
        current = current.parent;
    }
    return path;
}
