import { DataViewHierarchyNode, DataViewRow, MarkingOperation } from "spotfire-api";

export interface Serie {
    index: number;
    sum: number;
    mark(mode?: MarkingOperation): void;
    points: Point[];
}

export interface Point {
    tooltip(): DataViewRow;
    mark(mode?: MarkingOperation): void;
    xIndex: number;
    index: number;
    color: string;
    Y: number;
    Y_Formatted: string;
    marked: boolean;
    virtual: boolean;
}

export function buildColorSeries(
    colorLeaves: DataViewHierarchyNode[],
    xLeaves: DataViewHierarchyNode[],
    hasX: boolean,
    getTooltip: (point: Point) => DataViewRow,
    yMinValue: number
): Serie[] {
    const numberOrZero = (val: any) => (typeof val == "number" ? val : 0);

    let colorSeries: Serie[] = colorLeaves.map((colorLeaf) => ({
        mark: (m) => colorLeaf.mark(m),
        index: colorLeaf.leafIndex!,
        sum: colorLeaf.rows().reduce((sum, row) => sum + numberOrZero(row.continuous("Y").value()), 0),
        points: colorLeaf.rows().map((row) => createPoint(row, colorLeaf))
    }));

    colorSeries.forEach((serie) => {
        if (serie.points.length == 0) {
            return;
        } else if (serie.points.length == 1) {
            serie.points.push({ ...serie.points[0], Y: 0, xIndex: serie.points[0].xIndex + 1, virtual: true });
            return;
        }

        // Gap fill for missing values
        for (var pointIndex = 1; pointIndex < serie.points.length; pointIndex++) {
            let leftPoint: Point;
            const rightPoint = serie.points[pointIndex];
            leftPoint = serie.points[pointIndex - 1];
            const xGap = rightPoint.xIndex - leftPoint.xIndex;
            if (xGap > 1) {
                serie.points.splice(pointIndex, 0, createEmptyX(serie, leftPoint.xIndex + 1, leftPoint, rightPoint));
            }
        }

        let first = serie.points[0];
        if (first.xIndex != 0) {
            serie.points.splice(0, 0, { ...first, Y: 0, xIndex: first.xIndex - 1, virtual: true });
        }
        const lastX = serie.points[serie.points.length - 1];
        if (lastX.xIndex < xLeaves.length - 1) {
            serie.points.push({ ...lastX, Y: 0, xIndex: lastX.xIndex + 1, virtual: true });
        }
    });

    return colorSeries;

    function createPoint(row: DataViewRow, colorLeaf: DataViewHierarchyNode): Point {
        return {
            tooltip() {
                return row;
            },
            mark: (m) => row.mark(m),
            xIndex: hasX ? row.categorical("X").leafIndex : 0,
            Y: numberOrZero(row.continuous("Y").value()),
            Y_Formatted: row.continuous("Y").formattedValue(),
            marked: row.isMarked(),
            color: row.color().hexCode,
            index: colorLeaf.leafIndex!,
            virtual: false
        };
    }

    function createEmptyX(serie: Serie, xIndex: number, leftPoint: Point, rightPoint: Point): Point {
        return {
            tooltip() {
                return getTooltip(this);
            },
            mark: () => {},
            xIndex,
            Y: yMinValue,
            Y_Formatted: "-",
            index: serie.index,
            marked: false,
            color: "",
            virtual: true
        };
    }
}
