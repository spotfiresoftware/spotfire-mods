import * as d3 from "d3";

//@ts-ignore
import * as venn from "./venn-lib";

export interface Circle {
    sets: number[];
    color?: string;
    label?: string;
    tooltip?: string;
    size: number;
    rows: any;
}

interface Settings {
    click(d: Circle | null): void;
    size: { width: number; height: number };
    onMouseover(d: Circle): void;
    getColor(set: number[]): string;
}

export function render(circles: Circle[], settings: Settings) {
    var chart = venn.VennDiagram().width(settings.size.width).height(settings.size.height).colours(settings.getColor);

    var div = d3.select("#venn").on("click", () => settings.click(null));
    div.selectAll("*").remove();
    div.datum(circles).call(chart);

    div.selectAll("path").style("stroke-opacity", 0).style("stroke", "#fff").style("stroke-width", 3);

    div.selectAll<any, Circle>("g")
        .on("mouseover", function (d: Circle, i) {
            // sort all the areas relative to the current item
            venn.sortAreas(div, d);

            settings.onMouseover(d);

            // highlight the current path
            var selection = d3.select(this).transition("tooltip").duration(400);
            selection
                .select("path")
                .style("fill-opacity", d.sets.length == 1 ? 0.4 : 0.1)
                .style("stroke-opacity", 1);
        })

        .on("click", function (d: Circle, i) {
            // sort all the areas relative to the current item
            venn.sortAreas(div, d);
            settings.click(d);
            d3.event.stopPropagation();
        })

        .on("mouseout", function (d, i) {
            var selection = d3.select(this).transition("tooltip").duration(400);
            selection
                .select("path")
                .style("fill-opacity", d.sets.length == 1 ? 0.25 : 0.0)
                .style("stroke-opacity", 0);
        });
}
