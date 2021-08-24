//@ts-ignore
import { SVGGantt } from "gantt";

const data = [
    {
        id: 1,
        type: "group",
        text: "1 Waterfall model",
        start: new Date("2018-10-10T09:24:24.319Z"),
        end: new Date("2018-12-12T09:32:51.245Z"),
        percent: 0.71,
        links: [],
    },
    {
        id: 11,
        parent: 1,
        text: "1.1 Requirements",
        start: new Date("2018-10-21T09:24:24.319Z"),
        end: new Date("2018-11-22T01:01:08.938Z"),
        percent: 0.29,
        links: [
            {
                target: 12,
                type: "FS",
            },
        ],
    },
    {
        id: 12,
        parent: 1,
        text: "1.2 Design",
        start: new Date("2018-11-05T09:24:24.319Z"),
        end: new Date("2018-12-12T09:32:51.245Z"),
        percent: 0.78,
    },
];

export function renderGantt(data: any) {

    document.querySelector("#mod-container")!.innerHTML = "";

    new SVGGantt("#mod-container", data, {
        viewMode: "week",
        onClick(item) {
            item.mark();
        }
    });
}
