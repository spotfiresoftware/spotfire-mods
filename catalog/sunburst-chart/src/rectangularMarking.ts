import * as d3 from "d3";

export interface MarkingSettings {
    clearMarking(): void;
    mark(data: unknown): void;
    ignoredClickClasses: string[];
    classesToMark: string;
}

/**
 * Draws rectangular selection
 */
export function rectangularSelection(svg: d3.Selection<d3.BaseType, any, any, any>, settings: MarkingSettings) {
    let firstTarget: any;

    function drawRectangle(x: number, y: number, w: number, h: number) {
        return "M" + [x, y] + " l" + [w, 0] + " l" + [0, h] + " l" + [-w, 0] + "z";
    }

    d3.select(".rectangle").remove();

    const rectangle = svg.append("path").attr("class", "rectangle").attr("visibility", "hidden");

    const startSelection = function (start: [number, number]) {
        rectangle.attr("d", drawRectangle(start[0], start[0], 0, 0)).attr("visibility", "visible");
    };

    const moveSelection = function (start: [number, number], moved: [number, number]) {
        rectangle.attr("d", drawRectangle(start[0], start[1], moved[0] - start[0], moved[1] - start[1]));
    };

    const endSelection = function (start: [number, number], end: [number, number]) {
        rectangle.attr("visibility", "hidden");

        // Ignore rectangular markings that were just a click.
        if (Math.abs(start[0] - end[0]) < 4 || Math.abs(start[1] - end[1]) < 4) {
            if (
                Array.from(firstTarget?.classList).findIndex((c: any) => settings.ignoredClickClasses.includes(c)) == -1
            ) {
                settings.clearMarking();
            }

            return;
        }

        const selectionBox = rectangle.node()!.getBoundingClientRect();
        const markedSectors = svg
            .selectAll<SVGPathElement, unknown>("." + settings.classesToMark)
            .filter(function (this: SVGPathElement) {
                const box = this.getBoundingClientRect();
                return (
                    box.x >= selectionBox.x &&
                    box.y >= selectionBox.y &&
                    box.x + box.width <= selectionBox.x + selectionBox.width &&
                    box.y + box.height <= selectionBox.y + selectionBox.height
                );
            });

        if (markedSectors.size() === 0) {
            return settings.clearMarking();
        }

        markedSectors.each((n: any) => {
            settings.mark(n);
        });
    };

    svg.on("mousedown", function (this: any) {
        if (d3.event.which === 3) {
            return;
        }

        firstTarget = d3.event.target;

        let subject = d3.select(window),
            start = d3.mouse(this);
        startSelection(start);
        subject
            .on("mousemove.rectangle", function () {
                moveSelection(start, d3.mouse(svg.node() as any));
            })
            .on("mouseup.rectangle", function () {
                endSelection(start, d3.mouse(svg.node() as any));
                subject.on("mousemove.rectangle", null).on("mouseup.rectangle", null);
            });
    });
}
