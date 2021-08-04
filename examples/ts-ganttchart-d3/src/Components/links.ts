import * as d3 from "d3";
import { RenderState } from "../interfaces";
import { D3_SELECTION, GanttData } from "../custom-types";
import { config } from "../global-settings";
import { dateDiffInDays, p2s } from "../utils";

export function renderLinks(parent: D3_SELECTION, data: GanttData[], state: RenderState) {

    const unitWidth = config.chartWidth / dateDiffInDays(state.startDate, state.endDate, true);

    const linksContainer = parent.append("g").attr("id", "LinksContainer").style("pointer-events", "none")
    .attr("clip-path", "url(#ChartClip)");
    const links = linksContainer.append("g").attr("id", "Links");

    buildLinks(links, data, unitWidth);
}


export function updateLinks(data: GanttData[], state: RenderState) {

    const unitWidth = config.chartWidth / dateDiffInDays(state.startDate, state.endDate, true);
    const links = d3.select("#Links");
    links.selectAll("*").remove();
 
    buildLinks(links, data, unitWidth);
}

function buildLinks(links, data: GanttData[], unitWidth) {
    
    const x0 = config.labelsWidth;
    const y0: number =
        config.viewModeSliderHeight + config.zoomSliderHeight + config.headerHeight + config.rowHeight / 2;
    const map = {};
    data.forEach((v, i) => {
        map[v.taskId] = i;
    });

    data.map((s, i) => {
        if (!s.end || !s.start || !s.links) {
            return null;
        }
        s.links.map((l) => {
            const j = map[l.target];
            const e = data[j];

            if (!e || !e.start || !e.end) return null;

            const gap = 12;
            const arrow = 6;
            const y1 = y0 + i * config.rowHeight;
            const y2 = y0 + j * config.rowHeight;

            let vgap = config.barHeight / 2 + 4;
            if (y1 > y2) {
                vgap = -vgap;
            }

            const daysFromMinX1 = dateDiffInDays(config.minDate, s.end);
            const daysFromMinX2 = dateDiffInDays(config.minDate, e.start);
            const x1 = x0 + daysFromMinX1 * unitWidth + 35;
            const x2 = x0 + daysFromMinX2 * unitWidth - 35;
            const p1 = [
                [x1, y1],
                [x1 + gap, y1]
            ];
            if (x2 - x1 >= 2 * gap) {
                p1.push([x1 + gap, y2]);
            } else {
                p1.push([x1 + gap, y2 - vgap]);
                p1.push([x2 - gap, y2 - vgap]);
                p1.push([x2 - gap, y2]);
            }
            p1.push([x2 - arrow, y2]);
            const p2 = [
                [x2 - arrow, y2 - arrow],
                [x2, y2],
                [x2 - arrow, y2 + arrow]
            ];

            const p3 = [
                [x1, y1 - 4],
                [x1, y1 + 4]
            ];

            const link = links.append("g");

            link.append("polyline")
                .attr("points", p2s(p1))
                .style("stroke", "#C2C6D1")
                .style("stroke-width", "1.5px")
                .style("fill", "none");
            link.append("polygon").attr("points", p2s(p2)).style("fill", "#C2C6D1");
            link.append("polyline")
                .attr("points", p2s(p3))
                .style("stroke", "#C2C6D1")
                .style("stroke-width", "1.5px")
                .style("fill", "none");
        });
    });
}

