import { StylingInfo } from "spotfire/spotfire-api-1-2";
import { RenderState } from "./interfaces";

export type D3_SELECTION = d3.Selection<SVGElement, unknown, HTMLElement, any>;
export type GanttData = {
    id: string,
    taskId: string,
    text: string,
    level: number,
    start: Date,
    end: Date,
    percent: number,
    isMarked: boolean,
    x: number,
    y: number,
    width: number,
    heigth: number,
    color: string,
    showTooltip: () => void,
    hideTooltip: () => void,
    mark: (e: Event) => void,
}
export type HeaderOptions = {
    headerContainer: D3_SELECTION,
    state: RenderState,
    format: string,
    y: number,
    styling: StylingInfo,
    type: string,
    minHeight: number,
    heightScale: d3.ScaleQuantize<number, never>
}
export type HeaderTypeInfo = {
    dayOfUnit: number,
    halfOfUnitDay: number
}

export enum ViewMode {
    Year,
    Month,
    Day
  }
