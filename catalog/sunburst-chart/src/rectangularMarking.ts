import * as d3 from "d3";

export interface MarkingSettings {
    /**
     * Callback to clear the marking.
     */
    clearMarking(): void;

    /**
     * Marking callback that will be invoked for each marked element.
     * @param datum d3 Data object bound to the marked element.
     */
    mark(datum: unknown): void;

    /**
     * Get the calculated center of a datum object. The default is to take the center of the bounding box.
     * @param datum  d3 Data object bound to the marked element.
     */
    getCenter?(datum: unknown): {x: number, y: number};

    /**
     * CSS Classes to ignore. Checks the parent of the marked element to see if any parent has an ignored class.
     */
    ignoredClickClasses: string[];

    /**
     * The CSS selector to use when filtering elements to mark.
     * @example Single class selector
     * ```
     * markingSelector: ".marker"
     * ```
     * @example Multiple classes
     * ```
     * markingSelector: ".marker, .sector"
     * ```
     */
    markingSelector: string;

    /**
     * Whether or not to allow centroid marking. It means only the center of the element needs to be part of the marking.
     */
    centerMarking?: boolean;
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
            let elem = firstTarget;
            let clearMarking = true;
            while (elem) {
                const elemClasses: string[] = Array.from(elem?.classList || []);
                if (elemClasses.find((c) => settings.ignoredClickClasses.includes(c))) {
                    clearMarking = false;
                    break;
                }

                elem = elem.parentNode;
            }

            if (clearMarking) {
                settings.clearMarking();
            }

            return;
        }

        const selectionBox = rectangle.node()!.getBoundingClientRect();
        const markedSectors = svg
            .selectAll<SVGPathElement, unknown>(settings.markingSelector)
            .filter(settings.centerMarking ? partOfMarking : fullyPartOfMarking);

        if (markedSectors.size() === 0) {
            return settings.clearMarking();
        }

        markedSectors.each((n: any) => {
            settings.mark(n);
        });

        function fullyPartOfMarking(this: SVGPathElement) {
            const box = this.getBoundingClientRect();
            return (
                box.x >= selectionBox.x &&
                box.y >= selectionBox.y &&
                box.x + box.width <= selectionBox.x + selectionBox.width &&
                box.y + box.height <= selectionBox.y + selectionBox.height
            );
        }

        function partOfMarking(this: SVGPathElement, d: unknown) {
            let centerX: number;
            let centerY : number;

            if(settings.getCenter) {
                let center = settings.getCenter(d);
                centerX = center.x;
                centerY = center.y;
            } else {
                const box = this.getBoundingClientRect();
                centerX = box.x + box.width / 2;
                centerY = box.y + box.height / 2;
            }

            return (
                centerX >= selectionBox.x &&
                centerY >= selectionBox.y &&
                centerX <= selectionBox.x + selectionBox.width &&
                centerY <= selectionBox.y + selectionBox.height
            );
        }
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
