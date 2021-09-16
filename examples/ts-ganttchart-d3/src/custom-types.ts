import { BaseType } from "d3";
import { StylingInfo } from "spotfire/spotfire-api-1-2";
import { RenderState } from "./interfaces";

export type D3_SELECTION = d3.Selection<SVGElement, unknown, HTMLElement, any>;
export type D3_SELECTION_BASE = d3.Selection<BaseType, unknown, HTMLElement, any>;
export type D3_SELECTION_SVGG = d3.Selection<SVGGElement, unknown, HTMLElement, any>;
export type GanttData = {
    id: string,
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
    mark: (ctrlKey: boolean) => void,
}
export type HeaderOptions = {
    headerContainer: D3_SELECTION_SVGG,
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
export type TextToRender = {
    x: number,
    position: string,
    text: string
}
export type SelectionResult = {
    x?: number,
    y?: number,
    width?: number,
    height?: number,
    dragSelectActive?: boolean,
    ctrlKey?: boolean,
    altKey?: boolean
}

export enum ViewMode {
    Year,
    Month,
    Day
  }
