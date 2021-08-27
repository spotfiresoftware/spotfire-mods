import * as d3 from "d3";

export interface SunBurstSettings {
    onMouseover?(data: any): void;
    onMouseLeave?(): void;
    containerSelector: string;
    size: { width: number; height: number };
    totalSize: number;
    getFill(datum: unknown): string;
    mark(datum: unknown): void;
    clearMarking(): void;
    markingStroke: string;
}

export function render(hierarchy: d3.HierarchyNode<unknown>, settings: SunBurstSettings) {
    const { size } = settings;
    const svg = document.querySelector(settings.containerSelector + " svg");
    if (svg) {
        document.querySelector(settings.containerSelector)!.removeChild(svg);
    }

    const radius = Math.min(size.width, size.height) / 2;

    const arc = d3
        .arc<{ x0: number; y0: number; x1: number; y1: number }>()
        .startAngle((d) => d.x0)
        .endAngle((d) => d.x1)
        .padAngle((d) => Math.min((d.x1 - d.x0) / 2, 0.01))
        .padRadius(radius / 2)
        .innerRadius((d) => d.y0)
        .outerRadius((d) => d.y1 - 1);

    const partition = d3.partition().size([Math.PI * 2, radius]);

    const partitionLayout = partition(hierarchy);

    const vis = d3
        .select(settings.containerSelector)
        .append("svg:svg")
        .attr("width", size.width)
        .attr("height", size.height)
        .append("svg:g")
        .attr("id", "container")
        .attr("transform", "translate(" + size.width / 2 + "," + size.height / 2 + ")");

    // Background circle for easier mouse leave detection.
    vis.append("svg:circle").attr("r", radius).style("opacity", 0);

    document.querySelector(settings.containerSelector + " svg")!.addEventListener("click", settings.clearMarking);

    vis.data([hierarchy])
        .selectAll("path")
        .data(partitionLayout.descendants().filter((d) => d.depth))
        .enter()
        .append("svg:path")
        .attr("d", arc)
        .on("click", (d) => {
            settings.mark(d.data);
            d3.event.stopPropagation();
        })
        .style("stroke-width", 2)
        .style("fill", (d) => settings.getFill(d.data))
        .on("mouseover", onMouseover);

    d3.select("#container").on("mouseleave", onMouseleave);

    function onMouseleave(d: any) {
        d3.selectAll("path").on("mouseover", null);

        settings.onMouseLeave?.();

        d3.selectAll("path")
            .transition()
            .duration(500)
            .style("stroke", "transparent")
            .on("end", function () {
                d3.select<any, any>(this).on("mouseover", onMouseover);
            });
    }

    function onMouseover(d: any) {
        let percentage = (100 * d.value) / settings.totalSize;
        let percentageString = percentage.toPrecision(3) + "%";
        if (percentage < 0.1) {
            percentageString = "< 0.1%";
        }

        settings.onMouseover?.(d.data);
        d3.select("#percentage").text(percentageString);
        d3.select("#value").text(d.data.formattedValue());

        let ancestors = getAncestors(d);

        d3.selectAll("path").style("stroke", "transparent");

        vis.selectAll("path")
            .filter((node: any) => ancestors.indexOf(node) >= 0)
            .style("stroke", settings.markingStroke);
    }
}

function getAncestors(node: d3.HierarchyNode<unknown>) {
    let path = [];
    let current = node;
    while (current.parent) {
        path.unshift(current);
        current = current.parent;
    }
    return path;
}
