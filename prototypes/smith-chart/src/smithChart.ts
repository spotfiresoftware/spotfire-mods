// @ts-ignore
import * as d3 from "d3";
import { ModProperty } from "spotfire-api";
import { rectangularSelection } from "./rectangularMarking";

export type ComplexNumber = [real: number, imaginary: number];

const fullCircle = Math.PI*2;
const halfCircle = Math.PI;

export interface SmithSettings {
    canvas: Canvas;
    size: { width: number; height: number };
    gridDensity?: number;
    showExtras?: boolean;
    showOuterScales?: boolean;
    showInnerScales?: boolean;
    zoom?: ModProperty <number>;
    xCoord?: ModProperty<number>;
    yCoord?: ModProperty <number>;
    clearMarking?(): void;
    mouseLeave(): void;
}

export interface Point {
    r: ComplexNumber;
    color: string;
    mark(toggle: boolean): void;
    tooltip(): void;
    mouseOver(): void;
    isMarked: boolean;
}

interface RenderedPoint {
    cx: number;
    cy: number;
    r: number;
    point: Point;
}

export type Canvas = ReturnType<typeof createCanvases>;

export function createCanvases(parent: HTMLElement) {
    return {
        bg: createCanvas(),
        main: createCanvas(),
        hightlight: createCanvas(true)
    };

    function createCanvas(transparent?: boolean) {
        const canvas = document.createElement("canvas");
        canvas.style.position = "absolute";
        canvas.style.left = "0";
        canvas.style.top = "0";
        canvas.style.right = "0";
        canvas.style.bottom = "0";
        if (transparent) {
            canvas.style.pointerEvents = "none";
        }

        parent.appendChild(canvas);

        return canvas;
    }
}

/**
 * Render the Smith chart into the provided SVG.
 * @param settings Visualization settings
 * @param points Points to visualize
 */
export function render(settings: SmithSettings, points: Point[]) {
    const { canvas } = settings;

    points.sort((a, b) => {
        if (a.isMarked && b.isMarked) {
            return 0;
        }

        if (a.isMarked) {
            return 1;
        }

        if (b.isMarked) {
            return -1;
        }

        return 0;
    });

    let scaleRadius = settings.zoom?.value() ? Math.min((settings.size.width, settings.size.height)*(100+settings.zoom.value()!))/200:  Math.min(settings.size.width, settings.size.height)/2
    let radius = settings.showOuterScales ? scaleRadius-60 : scaleRadius;

    Object.keys(canvas).forEach((k) => {
        canvas[k as keyof typeof canvas].width = settings.size.width;
        canvas[k as keyof typeof canvas].height = settings.size.height;
    });

    const padding = 3;
    radius -= padding;
    scaleRadius -= padding;

    const bgContext = canvas.bg.getContext("2d")!;
    const mainContext = canvas.main.getContext("2d")!;
    const highlightContext = canvas.hightlight.getContext("2d")!;

    let centerX = settings.xCoord ?  (canvas.main.width / 2) - (settings.xCoord.value()!*0.01*radius) : canvas.main.width / 2;
    let centerY = settings.yCoord ?  canvas.main.height / 2  - (settings.yCoord.value()!*0.01*radius): canvas.main.height / 2;

    bg(bgContext);
    let rendered: RenderedPoint[] = [];

    circleClip(mainContext, centerX, centerY, radius);

    if (settings.showExtras) {
        for (const p of points) {
            if (!p.isMarked) {
                continue;
            }

            mainContext.fillStyle = p.color;
            mainContext.strokeStyle = p.color;
            mainContext.lineWidth = 1;

            const z = rToz(p.r);
            const rc = rCircle(z[0]);
            const ic = iCircle(z[1]);

            mainContext.beginPath();
            mainContext.arc(
                rc.cx * radius + centerX,
                rc.cy * radius * -1 + centerY,
                rc.r * radius,
                0,
                fullCircle,
                false
            );
            mainContext.stroke();

            // The extra cy check is due to a rendering issue in the canvas when the circle becomes to great to render properly, render as a straight line instead.
            if (z[1] != 0 && ic.cy > -50000) {
                mainContext.beginPath();
                mainContext.arc(
                    ic.cx * radius + centerX,
                    ic.cy * radius * -1 + centerY,
                    ic.r * radius,
                    0,
                    fullCircle,
                    false
                );
                mainContext.stroke();
            } else {
                mainContext.beginPath();
                mainContext.moveTo(centerX - radius, centerY);
                mainContext.lineTo(centerX + radius, centerY);
                mainContext.stroke();
            }
        }
    }

    for (const p of points) {
        mainContext.fillStyle = p.color;
        mainContext.strokeStyle = p.color;
        mainContext.lineWidth = 1;

        mainContext.beginPath();
        const cx = p.r[0] * radius + centerX;
        const cy = p.r[1] * radius * -1 + centerY;
        const pointRadius = 2;
        mainContext.arc(cx, cy, pointRadius, 0, fullCircle, false);
        rendered.push({
            cx,
            cy,
            point: p,
            r: pointRadius
        });

        mainContext.fill();
    }

    // Zoom with wheel
    canvas.main.onwheel = (e: WheelEvent) => {
        settings.zoom?.set( Math.min(Math.max( settings.zoom?.value()! - e.deltaY, 0), 400));
    };

    // Move canvas with arrow keys
    document.onkeydown = (e: KeyboardEvent) => {
        var speed = 2;
        switch(e.key){
            case ("ArrowRight") :
                settings.xCoord?.set(Math.min(settings.xCoord.value()!+speed, 100));
                break;
            case ("ArrowLeft") :
                settings.xCoord?.set(Math.max(settings.xCoord.value()!-speed, -100));
                break;
            case ("ArrowUp") : 
                settings.yCoord?.set(Math.max(settings.yCoord.value()!-speed, -100));
                break;
            case ("ArrowDown") : 
                settings.yCoord?.set(Math.min(settings.yCoord.value()!+speed, 100));
                break;
        }
    };

    rectangularSelection(canvas.main, rendered, {
        mark(p, e) {
            p.point.mark(e.ctrlKey);
        },
        clearMarking: () => settings.clearMarking?.(),
        getCenter(p) {
            return [p.cx, p.cy];
        },
        hitTest(p, [x, y]) {
            var a = Math.pow(x - p.cx, 2);
            var b = Math.pow(y - p.cy, 2);
            if (Math.sqrt(a + b) <= p.r) {
                return true;
            }

            return false;
        },
        mouseOver(p) {
            p.point.tooltip();

            highlightContext.fillStyle = "#222222";
            highlightContext.strokeStyle = "#222222";
            highlightContext.lineWidth = 1;

            highlightContext.clearRect(0, 0, settings.size.width, settings.size.height);
            highlightContext.beginPath();
            const pointRadius = 4;
            highlightContext.arc(p.cx, p.cy, pointRadius, 0, 2 * Math.PI, false);
            highlightContext.stroke();
        },
        mouseLeave() {
            highlightContext.clearRect(0, 0, settings.size.width, settings.size.height);
            settings.mouseLeave();
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

        if(settings.showOuterScales)
        {
            // Add a circle as a clip path
            circleClip(context, centerX, centerY, scaleRadius);
            context.fillStyle = "rgb(100, 137, 250)";
            context.strokeStyle = "rgb(100, 137, 250)";

            // Outer scales
            for(let i = 0; i < 4; i++){
                if(i == 3){
                    context.fillStyle = "rgb(255, 78, 51)";
                    context.strokeStyle = "rgb(255, 78, 51)";
                }
                context.beginPath();
                context.arc(centerX, centerY, scaleRadius-(17*i), 0, 2 * Math.PI, false);
                context.stroke();
            }

            // Scale text prep
            context.fillStyle = "#222222";
            context.strokeStyle = "#222222";
            context.save();
            context.translate(centerX, centerY);
            context.textAlign = "center";

            //Scale 1. 180>0>-170
            context.rotate(-halfCircle/2);
            let steps = 36*5;

            for(let i = 0; i < steps; i++){
                if(i%5 == 0){
                    context.fillText(i== 0 ? "±" + (180-(2*i)) : (180-(2*i)).toString(), 0, -scaleRadius+(17*2 + 11));
                    context.lineWidth = 1;
                }
                
                context.beginPath();
                context.moveTo(0, -scaleRadius+(17*3));
                context.lineTo(0, -scaleRadius+(17*2 + 11 + 3));
                context.stroke();
                context.rotate(fullCircle/steps);
                context.lineWidth = 0.5;
            }

            //Scale 2 & 3. 0.0->0.49
            steps = 50*5;
            for(let i = 0; i < steps; i++){
                if(i%5 == 0){
                    context.fillText(i == 0 ? "0,0" : ((steps-i)/500).toString(), 0, -scaleRadius+(17*1 + 11 + 1));
                    context.fillText(i == 0 ? "0,0" :(i/500).toString(), 0, -scaleRadius+(17*0 + 11 + 1));
                    context.lineWidth = 1;
                    context.beginPath();
                    context.moveTo(0, -scaleRadius+(17*1 + 3));
                    context.lineTo(0, -scaleRadius+(17*1 - 3));
                }
                else{
                    context.lineWidth = 0.5;
                    context.beginPath();
                    context.moveTo(0, -scaleRadius+(17*1 + 2));
                    context.lineTo(0, -scaleRadius+(17*1 - 2));
                }
                context.stroke();
                context.rotate(fullCircle/steps);
            }

            context.restore();
        }

        enum Quadrant {
            First,
            Second,
            Third,
            Fourth
        }

        function innerScalesInCircle(text : string[], quadrant: Quadrant){
            // vsvensso: 
            context.save();
            context.translate(centerX, centerY);
            context.rotate(-halfCircle/2);
            var denominator = 16;
            var increase = 0;

            for(let i = 0; i < text.length; i++){
                denominator += quadrant == Quadrant.First || quadrant == Quadrant.Second ? 2+increase : -2+increase;
                context.rotate(quadrant == Quadrant.First || quadrant == Quadrant.Third ? halfCircle/denominator : -halfCircle/denominator);
                context.fillText(text[i], quadrant == Quadrant.First || quadrant == Quadrant.Fourth ? radius-17 : -radius+3, -1, 15);
                increase += quadrant == Quadrant.First || quadrant == Quadrant.Second ? 1 : -0.2/(i+1);
            }

            context.restore();
        }

        if(settings.showInnerScales){
            var text = ["1.2", "1.4", "1.6", "1.8", "2.0"];
            innerScalesInCircle(text, Quadrant.First);
            innerScalesInCircle(text, Quadrant.Second);

            text = ["0.8", "0.6", "0.4"];
            innerScalesInCircle(text, Quadrant.Third);
            innerScalesInCircle(text, Quadrant.Fourth);
        }
        
        // Add a circle as a clip path
        circleClip(context, centerX, centerY, radius);

        // Circle border
        context.beginPath();
        context.arc(centerX, centerY, radius, 0, fullCircle, false);
        context.stroke();

        // Horizontal line through chart
        context.beginPath();
        context.moveTo(centerX - radius, centerY);
        context.lineTo(centerX + radius, centerY);
        context.stroke();

        // Vertical line through chart
        context.beginPath();
        context.moveTo(centerX, centerY - radius);
        context.lineTo(centerX, centerY + radius);
        context.stroke();


        context.save();
        context.translate(centerX, centerY);
        context.rotate(-halfCircle/2);
        // Real circles
        for (let index = 0; index < realCircles.length; index++) {
            const circle = realCircles[index];
            context.beginPath();
            context.strokeStyle = index % 5 == 0 ? "rgba(2,2,2, 0.6)" : "rgba(2,2,2,0.3)";
            context.arc(
                circle.cy * radius,
                circle.cx * radius,
                circle.r * radius,
                0,
                fullCircle,
                false
            );
            context.stroke();

            if(settings.showInnerScales){
                // Horizontal scales 
                if((index % 5 == 0 && index/5 < 7) || index/5 < 1){
                    context.fillText((index/5).toString(),  3,  circle.cx * radius - circle.r * radius - 2);
                }
            }
        }
        context.restore();

        // Imaginary circles
        for (let index = 0; index < imaginaryCircles.length; index++) {
            const circle = imaginaryCircles[index];
            context.beginPath();
            context.strokeStyle = index % 5 == 0 ? "rgba(2,2,2, 0.6)" : "rgba(2,2,2,0.3)";
            context.arc(
                circle.cx * radius + centerX,
                circle.cy * radius * -1 + centerY,
                circle.r * radius,
                0,
                fullCircle,
                false
            );
            context.stroke();
        }

        // Draw a section of dense lines.
        const denseVerticalSection = Array.from(range(0, 0.2, 0.006));
        const clipCircle = imaginaryCircles[Math.floor(imaginaryCircles.length / 2 - 1)];
        let c1 = {
            x: clipCircle.cx * radius + centerX,
            y: clipCircle.cy * radius * -1 + centerY,
            r: clipCircle.r * radius
        };

        for (let index = 0; index < denseVerticalSection.length; index++) {
            const step = denseVerticalSection[index];

            let c2 = { x: centerX + step * radius, y: centerY, r: radius - step * radius };
            let xDistanceBetweenCircles = c1.x - c2.x;
            let yDistanceBetweenCircles = c1.y - c2.y;
            let c1c2Hypotenuse = Math.sqrt(xDistanceBetweenCircles ** 2 + yDistanceBetweenCircles ** 2);
            let c1c2BottomAngle = Math.acos(
                (c1c2Hypotenuse ** 2 + yDistanceBetweenCircles ** 2 - xDistanceBetweenCircles ** 2) /
                    (2 * c1c2Hypotenuse * yDistanceBetweenCircles)
            );

            // Calculate triangle with c1 radius, c2 radius and hypotenuse to get bottom angle
            let a = c1.r;
            let b = c2.r;
            let c = c1c2Hypotenuse;

            let intersectionTriangleBottomAngle = Math.acos((a ** 2 + c ** 2 - b ** 2) / (2 * a * c));

            // From the two circles intersection point we can calculate the angle from which we begin drawing the arc.
            // let intersectionX = c2.x - Math.cos(Math.PI / 2 - c1c2BottomAngle - intersectionTriangleBottomAngle) * c2.r;
            let intersectionY = c1.y - Math.sin(Math.PI / 2 - c1c2BottomAngle - intersectionTriangleBottomAngle) * c1.r;

            let startDrawingAngle = (intersectionY - centerY) / c2.r;

            context.beginPath();
            context.strokeStyle = "#22222";
            context.lineWidth = 1;
            context.arc(
                c2.x,
                centerY,
                c2.r,
                Math.PI - Math.asin(startDrawingAngle),
                Math.PI + Math.asin(startDrawingAngle),
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

function circleClip(context: CanvasRenderingContext2D, centerX: number, centerY: number, radius: number) {
    context.beginPath();
    context.arc(centerX, centerY, radius, 0, 2 * Math.PI, false);
    context.clip();
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
