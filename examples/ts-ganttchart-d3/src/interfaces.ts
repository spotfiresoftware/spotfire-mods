import { StylingInfo, Tooltip } from "spotfire/spotfire-api-1-2";
import { GanttData, ViewMode } from "./custom-types";

export interface RenderState {
    preventRender: boolean;
    dataStartDate: Date;
    dataEndDate: Date;
    startDate: Date;
    endDate: Date;
    unitWidth: number;
    timeScale: d3.ScaleTime<number, number, never>;
    viewMode: ViewMode;
    verticalScrollPosition: number;
    isEditing: boolean;
}

export interface RenderInfo {
    state: RenderState,
    data: GanttData[],
    styling: StylingInfo,
    tooltip: Tooltip,
    interactive: boolean
}