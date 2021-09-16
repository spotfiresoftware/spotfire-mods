export interface Totals {
    pixelTotals: number;
    fractionTotals: number;
}
export interface Description {
    value: number;
    unit: string;
    visible: boolean;
}

/**
 * Creates a grid layout with fixed and flexible columns and rows
 * If the fixed distances don't fit into the available space they will be proportionally scaled down to fit.
 *
 * @param   {Number} width          Width of the grid in pixels
 * @param   {Number} height         Height of the grid in pixels
 * @param   {String} columnDescr    List of column distances in pixels (px) or fractional units (fr). E.g. "10px 1fr 2fr 10px"
 * @param   {String} rowDescr       List of row distances expresed in pixels (px) or fractional units (fr) E.g "20px 1 fr 10px"
 *
 * @example
 * // fixed 10px margin with flexible main content area and sidebar
 * let grid = new Grid(500, 500, "10px 3fr 1fr 10px", "10px 1fr 10px")
 */

export class Grid {
    private columns: Description[];
    private rows: Description[];
    private cumulativeColDist: number[];
    private cumulativeRowDist: number[];

    constructor(
        width: number,
        height: number,
        columnDescription: string,
        rowDescription: string
    ) {
        const regExp = RegExp(/^(\d+(.\d+)?(px|fr)\s)*(\d+(.\d+)?(px|fr))?$/);
        if (!regExp.test(columnDescription)) {
            throw new Error(
                `Invalid column specification:\"${columnDescription}\"`
            );
        }
        if (!regExp.test(rowDescription)) {
            throw new Error(`Invalid row specification: ${rowDescription}"`);
        }

        let columnDescriptions = columnDescription.split(" ");
        this.columns = columnDescriptions.map((description) => this.parseDescription(description)
        );

        let rowDescriptions = rowDescription.split(" ");
        this.rows = rowDescriptions.map((description) => this.parseDescription(description)
        );

        this.cumulativeColDist = this.calculateCumulativeDistances(
            this.columns,
            width
        );
        this.cumulativeRowDist = this.calculateCumulativeDistances(
            this.rows,
            height
        );
    }

    calculateCumulativeDistances(
        elements: Description[],
        availableSpace: number
    ) {
        let totals = elements.reduce(this.calculateTotals2, {
            pixelTotals: 0,
            fractionTotals: 0,
        });

        let remainingPixels = Math.max(availableSpace - totals.pixelTotals, 0);
        let pixelsPerFraction = remainingPixels / totals.fractionTotals;

        let pixelScaling = totals.pixelTotals > availableSpace
            ? availableSpace / totals.pixelTotals
            : 1;

        return elements.reduce(calculateRelativePixels, [0]);

        function calculateRelativePixels(
            relativeDistances: number[],
            element: Description,
            currentIndex: number
        ) {
            let adjustedValue = 0;

            switch (element.unit) {
                case "px":
                    adjustedValue = element.value * pixelScaling;
                    break;
                case "fr":
                    adjustedValue = element.value * pixelsPerFraction;
                    break;
            }

            relativeDistances.push(
                relativeDistances[currentIndex] + adjustedValue
            );
            return relativeDistances;
        }
    }

    calculateTotals2(totals: Totals, element: Description) {
        switch (element.unit) {
            case "px":
                totals.pixelTotals += element.value;
                break;
            case "fr":
                totals.fractionTotals += element.value;
                break;
        }
        return totals;
    }

    private parseDescription(description: string) {
        let components = description.match(/(\d+(?:.\d+)?)([a-z]+)/);
        let distance = {
            value: parseFloat(components![1]),
            unit: components![2],
            visible: true,
        };
        return distance;
    }

    /**
     * @param {String} areaReference a cell or area identifier using spreadsheet notation
     *
     * @returns {{x1: Number, x2: Number, y1: Number, y2: Number, width: Number, height: Number}} a rectangle in the grid coordinate system with (0,0) in the top left corner and (width, height) in the bottom right corner
     *
     * @example
     * let content = grid.getCoords("B2");
     * let header = grid.getCoords("A1:C1");
     */
    public getCoords(areaReference: string) {
        const regExp = RegExp(/^[a-z]|[A-Z]\d+(:[a-z]\d+)?$/);
        if (!regExp.test(areaReference)) {
            throw new Error(`Invalid area reference:\"${areaReference}\"`);
        }

        let splitReference = areaReference.toLowerCase().split(":");

        let topLeftIdentifier = splitReference[0];
        let topLeftColumnIdentifier = topLeftIdentifier.substring(0, 1);
        let topLeftRowIdentifier = topLeftIdentifier.substring(
            1,
            topLeftIdentifier.length
        );

        let y1Index = parseInt(topLeftRowIdentifier) - 1;
        let x1Index = topLeftColumnIdentifier.charCodeAt(0) - 97;

        var y2Index;
        var x2Index;

        if (splitReference.length > 1) {
            let bottomRightIdentifier = splitReference[1];
            let bottomRightColumnIdentifier = bottomRightIdentifier.substring(
                0,
                1
            );
            let bottomRightRowIdentifier = bottomRightIdentifier.substring(
                1,
                bottomRightIdentifier.length
            );

            y2Index = parseInt(bottomRightRowIdentifier);
            x2Index = bottomRightColumnIdentifier.charCodeAt(0) - 96;
        } else {
            y2Index = y1Index + 1;
            x2Index = x1Index + 1;
        }

        if (x1Index > this.cumulativeColDist.length - 1 ||
            x2Index > this.cumulativeColDist.length - 1) {
            throw new Error(`column reference outside grid: ${areaReference}`);
        }
        if (y1Index > this.cumulativeRowDist.length - 1 ||
            y2Index > this.cumulativeRowDist.length - 1) {
            throw new Error(`column reference outside grid: ${areaReference}`);
        }

        let coords = {
            x1: this.cumulativeColDist[x1Index],
            y1: this.cumulativeRowDist[y1Index],
            x2: this.cumulativeColDist[x2Index],
            y2: this.cumulativeRowDist[y2Index],
            width: this.cumulativeColDist[x2Index] -
                this.cumulativeColDist[x1Index],
            height: this.cumulativeRowDist[y2Index] -
                this.cumulativeRowDist[y1Index],
        };

        return coords;
    }
}
