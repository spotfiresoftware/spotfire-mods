import * as d3 from "d3";

export interface SunBurstSettings {
    onMouseover?(data: any): void;
    onMouseLeave?(): void;
    containerSelector: string;
    size: { width: number; height: number };
    totalSize: number;
    getFill(datum: unknown): string;
    getLabel(datum: unknown, availablePixels: number): string;
    mark(datum: unknown): void;
    clearMarking(): void;
    markingStroke: string;
}

export function render(hierarchy: d3.HierarchyNode<unknown>, settings: SunBurstSettings) {
    const { size } = settings;
    const prevSvg = document.querySelector(settings.containerSelector + " svg");
    if (prevSvg) {
        document.querySelector(settings.containerSelector)!.removeChild(prevSvg);
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

    const container = d3
        .select(settings.containerSelector)
        .append("svg:svg")
        .attr("width", size.width)
        .attr("height", size.height)
        .on("click", settings.clearMarking)
        .append("svg:g")
        .attr("transform", "translate(" + size.width / 2 + "," + size.height / 2 + ")");

    const visibleSectors = partitionLayout
        .descendants()
        .filter((d) => d.depth && settings.getFill(d.data) !== "transparent");

    const sectors = container.append("svg:g").attr("id", "container");

    sectors
        .data([hierarchy])
        .selectAll("path")
        .data(visibleSectors)
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

    container
        .append("g")
        .attr("pointer-events", "none")
        .attr("text-anchor", "middle")
        .attr("font-size", 10)
        .attr("font-family", "sans-serif")
        .selectAll("text")
        .data(visibleSectors.filter((d) => ((d.y0 + d.y1) / 2) * (d.x1 - d.x0) > 12))
        .join("text")
        .attr("transform", function (d) {
            const x = (((d.x0 + d.x1) / 2) * 180) / Math.PI;
            const y = (d.y0 + d.y1) / 2;
            return `rotate(${x - 90}) translate(${y},0) rotate(${x < 180 ? 0 : 180})`;
        })
        .attr("dy", "0.35em")
        .text((d) => settings.getLabel(d.data, (d.y0 + d.y1) / 2 - 20));
    d3.select("#container").on("mouseleave", onMouseleave);

    function onMouseleave(d: any) {
        d3.select("#explanation").style("visibility", "hidden");
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
        d3.select("#explanation").style("visibility", "visible");
        d3.select("#percentage").text(percentageString);
        d3.select("#value").text(d.data.formattedValue());

        let ancestors = getAncestors(d);

        d3.selectAll("path").style("stroke", "transparent");

        sectors
            .selectAll("path")
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
