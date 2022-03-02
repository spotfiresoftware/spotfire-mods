// @ts-ignore
import * as d3 from "d3";
import { rectangularSelection } from "./rectangularMarking";

export type ComplexNumber = [real: number, imaginary: number];

export interface SmithSettings {
    canvas: HTMLCanvasElement;
    size: { width: number; height: number };
    gridDensity?: number;
    showExtras?: boolean;
    clearMarking?(): void;
    mouseLeave?(): void;
}

export interface Point {
    r: ComplexNumber;
    color: string;
    mark(): void;
    mouseOver(): void;
    isMarked: boolean;
}

/**
 * Render the Smith chart into the provided SVG.
 * @param settings Visualization settings
 * @param points Points to visualize
 */
export function render(settings: SmithSettings, points: Point[]) {
    const { canvas } = settings;

    let radius = Math.min(settings.size.width, settings.size.height) / 2;

    canvas.width = settings.size.width;
    canvas.height = settings.size.height;

    let padding = 3;
    radius -= padding;
    const context = canvas.getContext("2d")!;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    bg(context);

    if (settings.showExtras) {
        for (const p of points) {
            if (!p.isMarked) {
                continue;
            }

            context.fillStyle = p.color;
            context.strokeStyle = p.color;
            context.lineWidth = 1;

            const z = rToz(p.r);
            const rc = rCircle(z[0]);
            const ic = iCircle(z[1]);

            context.beginPath();
            context.arc(rc.cx * radius + centerX, rc.cy * radius * -1 + centerY, rc.r * radius, 0, 2 * Math.PI, false);
            context.stroke();

            // The extra cy check is due to a rendering issue in the canvas when the circle becomes to great to render properly, render as a straight line instead.
            if (z[1] != 0 && ic.cy > -50000) {
                context.beginPath();
                context.arc(
                    ic.cx * radius + centerX,
                    ic.cy * radius * -1 + centerY,
                    ic.r * radius,
                    0,
                    2 * Math.PI,
                    false
                );
                context.stroke();
            } else {
                context.beginPath();
                context.moveTo(centerX - radius, centerY);
                context.lineTo(centerX + radius, centerY);
                context.stroke();
            }
        }
    }

    for (const p of points) {
        context.fillStyle = p.color;
        context.strokeStyle = p.color;
        context.lineWidth = 1;

        context.beginPath();
        context.arc(p.r[0] * radius + centerX, p.r[1] * radius * -1 + centerY, 1, 0, 2 * Math.PI, false);
        context.fill();
    }

    rectangularSelection(canvas, points, {
        mark(d: Point) {
            d.mark();
        },
        clearMarking: () => settings.clearMarking?.(),
        getCenter(p) {
            return [p.r[0] * radius + centerX, p.r[1] * radius * -1 + centerY];
        }
    });

    /**
     * Render the background grid.
     * @param svg Visualization svg
     */
    function bg(context: CanvasRenderingContext2D) {
        const realCircles = Array.from(range(0, settings.gridDensity ?? 10.1, 0.2)).map(rCircle);
        const imaginaryCircles = Array.from(
            range(
                settings.gridDensity ? settings.gridDensity * -0.5 : -5,
                settings.gridDensity ? settings.gridDensity * 0.5 : 5.1,
                0.2
            )
        ).map(iCircle);

        context.fillStyle = "#222222";
        context.strokeStyle = "#222222";
        context.lineWidth = 1;

        // Add a circle as a clip path
        context.beginPath();
        context.arc(centerX, centerY, radius, 0, 2 * Math.PI, false);
        context.clip();

        context.beginPath();
        context.arc(centerX, centerY, radius, 0, 2 * Math.PI, false);
        context.stroke();

        context.beginPath();
        context.moveTo(centerX - radius, centerY);
        context.lineTo(centerX + radius, centerY);
        context.stroke();

        context.beginPath();
        context.moveTo(centerX, centerY - radius);
        context.lineTo(centerX, centerY + radius);
        context.stroke();

        for (let index = 0; index < realCircles.length; index++) {
            const circle = realCircles[index];
            context.beginPath();
            context.strokeStyle = index % 5 == 0 ? "rgba(2,2,2, 0.6)" : "rgba(2,2,2,0.3)";
            context.arc(
                circle.cx * radius + centerX,
                circle.cy * radius + centerY,
                circle.r * radius,
                0,
                2 * Math.PI,
                false
            );
            context.stroke();
        }

        for (let index = 0; index < imaginaryCircles.length; index++) {
            const circle = imaginaryCircles[index];
            context.beginPath();
            context.strokeStyle = index % 5 == 0 ? "rgba(2,2,2, 0.6)" : "rgba(2,2,2,0.3)";
            context.arc(
                circle.cx * radius + centerX,
                circle.cy * radius * -1 + centerY,
                circle.r * radius,
                0,
                2 * Math.PI,
                false
            );
            context.stroke();
        }
    }
}

interface Circle {
    cx: number;
    cy: number;
    r: number;
}

// r = reflection coefficient
// z = normalized load impedance
// z = (1 + r) / (1 - r)

/**
 * Calculates the circle on the r-plane where Re(z) = k
 * @param step
 * @returns
 */
function rCircle(step: number): Circle {
    return {
        cx: step / (step + 1),
        cy: 0,
        r: 1 / (step + 1)
    };
}

/**
 * Calculates the circle on the r-plane where Im(z) = k
 * @param step
 * @returns
 */
function iCircle(step: number) {
    return {
        cx: 1,
        cy: 1 / step,
        r: Math.abs(1 / step)
    };
}

/**
 * Calculate z from r
 * @returns
 */
function rToz([rx, ry]: ComplexNumber) {
    const denominator = rx ** 2 - 2 * rx + 1 + ry ** 2;
    return [(1 - rx ** 2 - ry ** 2) / denominator, (2 * ry) / denominator];
}

function* range(start: number, end: number, step: number) {
    for (let i = start; i < end; i += step) {
        yield i;
    }
}
