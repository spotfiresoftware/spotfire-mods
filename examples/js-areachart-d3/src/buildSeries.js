/*
 * Copyright © 2023. Cloud Software Group, Inc.
 * This file is subject to the license terms contained
 * in the license file that is distributed with this file.
 */

//@ts-check

/**
 * Creating JSDoc type definitions may provide code completion and
 * other means of development support depending on the choice of IDE
 * @typedef {{colorIndex: number;
 *          sum: number;
 *          points: Point[];
 *         }} ColorSerie;
 *
 * @typedef {{
 *          mark(operation?: Spotfire.MarkingOperation) : void;
 *          xIndex: number;
 *          colorIndex: number;
 *          color: string;
 *          Y: number;
 *          Y_Formatted: string;
 *          y0: number;
 *          y1: number;
 *          marked: boolean;
 *          gapFilled: boolean;
 *          tooltip: Spotfire.DataViewRow;
 *          }} Point
 */

/**
 * Builds color series used for rendering.
 * This is the only method that reads data from the Mod API.
 * @param {Spotfire.DataViewHierarchyNode[]} colorLeaves
 * @param {Spotfire.DataViewHierarchyNode[]} xLeaves
 * @param {boolean} hasX
 * @param {boolean} hasY
 * @param {"stacked" | "percentStacked" | "overlapping"} stackMode
 * @param {boolean} gapfill
 * @returns {ColorSerie[]}
 */
export function buildColorSeries(colorLeaves, xLeaves, hasX, hasY, stackMode, gapfill) {
    function value(row) {
        let val = hasY ? row.continuous("Y").value() : null;
        return typeof val == "number" ? val : null;
    }

    let colorSeries = colorLeaves.map((colorLeaf) => ({
        colorIndex: colorLeaf.leafIndex,
        sum: colorLeaf.rows().reduce((sum, row) => sum + value(row), 0),
        points: colorLeaf.rows().map((row) => ({
            mark: (operation) => row.mark(operation),
            xIndex: hasX ? row.categorical("X").leafIndex : 0,
            Y: value(row),
            Y_Formatted: hasY ? row.continuous("Y").formattedValue() : "",
            y0: 0,
            y1: value(row),
            marked: row.isMarked(),
            color: row.color().hexCode,
            colorIndex: colorLeaf.leafIndex,
            gapFilled: false,
            tooltip: row
        }))
    }));

    colorSeries.forEach((serie) => {
        if (serie.points.length == 0) {
            return;
        }

        if (gapfill) {
            const allMarked = !serie.points.find((p) => !p.marked);

            // Gap fill for missing values
            for (var pointIndex = 1; pointIndex < serie.points.length; pointIndex++) {
                const leftPoint = serie.points[pointIndex - 1];
                const rightPoint = serie.points[pointIndex];
                if (rightPoint.xIndex - leftPoint.xIndex > 1) {
                    serie.points.splice(pointIndex, 0, {
                        mark: () => {},
                        xIndex: leftPoint.xIndex + 1,
                        Y: null,
                        Y_Formatted: "-",
                        y0: null,
                        y1: null,
                        colorIndex: serie.colorIndex,
                        marked: allMarked,
                        color: !leftPoint.marked ? leftPoint.color : rightPoint.color,
                        gapFilled: true,
                        tooltip: undefined
                    });
                }
            }
        } else {
            // Remove points with empty Y value.
            serie.points = serie.points.filter((p) => p.Y != null);
        }
    });

    if (stackMode != "overlapping") {
        colorSeries.reverse();
        xLeaves.forEach((x) => {
            let base = 0;
            let sum = 1;
            if (stackMode == "percentStacked") {
                sum = x.rows().reduce((total, row) => total + Math.abs(row.continuous("Y").value()), 0);
                if (sum == 0) {
                    // Remove point
                    colorSeries.forEach(
                        (serie) => (serie.points = serie.points.filter((p) => p.xIndex != x.leafIndex))
                    );
                    return;
                }
            }
            colorSeries.forEach((serie) => {
                let point = serie.points.find((p) => p.xIndex == x.leafIndex);
                if (point) {
                    point.y0 = base;
                    // @ts-ignore
                    base += point.y1;
                    point.y1 = base;
                    if (stackMode == "percentStacked") {
                        point.y0 /= sum;
                        point.y1 /= sum;
                    }
                }
            });
        });
        colorSeries.reverse();
    }

    return colorSeries;
}
