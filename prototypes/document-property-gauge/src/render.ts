// @ts-ignore
import * as d3 from "d3";

/**
 * Main svg container
 */
const svg = d3.select("#mod-container").append("svg").attr("xmlns", "http://www.w3.org/2000/svg");

export interface Settings {
    size: { width: number; height: number };
}

export interface Gauge {
    label: string;
    value: number;
    max: number;
}

export async function render(gauges: Gauge[], settings: Settings) {}
