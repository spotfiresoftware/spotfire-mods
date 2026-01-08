// @ts-ignore
import { Serie } from "./series";

export interface Data {
    yDomain: { min: number; max: number };
    xScale: string[];
    series: Serie[];
    clearMarking(): void;
}