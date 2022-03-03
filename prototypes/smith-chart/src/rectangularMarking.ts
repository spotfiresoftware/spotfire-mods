export interface MarkingSettings<T> {
    /**
     * Callback to clear the marking.
     */
    clearMarking(): void;

    /**
     * Marking callback that will be invoked for each marked element.
     * @param datum d3 Data object bound to the marked element.
     */
    mark(datum: T): void;

    /**
     * Get the calculated center of a datum object. The default is to take the center of the bounding box.
     * @param datum  d3 Data object bound to the marked element.
     */
    getCenter(datum: T): [x: number, y: number];

    hitTest(datum: T, coordinates: [x: number, y: number]): boolean;
}

/**
 * Draws rectangular selection
 */
export function rectangularSelection<T>(canvas: HTMLCanvasElement, data: T[], settings: MarkingSettings<T>) {
    function drawRectangle(x: number, y: number, w: number, h: number) {
        return "M" + [x, y] + " l" + [w, 0] + " l" + [0, h] + " l" + [-w, 0] + "z";
    }

    document.querySelector(".rectangle-marking")?.remove();

    // make a simple rectangle
    let svg2 = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg2.classList.add("rectangle-marking");
    let rectangle = document.createElementNS("http://www.w3.org/2000/svg", "path");
    rectangle.classList.add("rectangle");
    rectangle.style.visibility = "hidden";
    svg2.appendChild(rectangle);
    document.body.appendChild(svg2);

    const startSelection = function (start: [number, number]) {
        rectangle.setAttribute("d", drawRectangle(start[0], start[0], 0, 0));
        rectangle.style.visibility = "visible";
    };

    const moveSelection = function (start: [number, number], moved: [number, number]) {
        rectangle.setAttribute("d", drawRectangle(start[0], start[1], moved[0] - start[0], moved[1] - start[1]));
    };

    const endSelection = function (start: [number, number], end: [number, number]) {
        rectangle.style.visibility = "hidden";

        // Ignore rectangular markings that were just a click.
        if (Math.abs(start[0] - end[0]) < 4 || Math.abs(start[1] - end[1]) < 4) {
            // detect object clicked, starting with last in array because this will be uppermost
            for (let i = data.length - 1; i >= 0; i--) {
                var obj = data[i];

                if (settings.hitTest(obj, end)) {
                    settings.mark(obj);
                    return;
                }
            }

            settings.clearMarking();
            return;
        }

        const selectionBox = rectangle.getBoundingClientRect();
        const markedSectors = data.filter(partOfMarking);

        if (markedSectors.length === 0) {
            return settings.clearMarking();
        }

        markedSectors.forEach(settings.mark);

        function partOfMarking(d: T) {
            let [centerX, centerY] = settings.getCenter(d);

            return (
                centerX >= selectionBox.x &&
                centerY >= selectionBox.y &&
                centerX <= selectionBox.x + selectionBox.width &&
                centerY <= selectionBox.y + selectionBox.height
            );
        }
    };

    canvas.onmousedown = function (this: any, event) {
        if (event.which === 3) {
            return;
        }

        let start: [number, number] = [event.clientX, event.clientY];
        startSelection(start);
        window.onmousemove = function (event) {
            moveSelection(start, [event.clientX, event.clientY]);
        };

        window.onmouseup = function (event) {
            endSelection(start, [event.clientX, event.clientY]);
            window.onmousemove = null;
            window.onmouseup = null;
        };
    };
}
