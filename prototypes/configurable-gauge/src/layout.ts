export function grid(width: number, height: number, count: number) {
    let isWide = width >= height;

    let min = isWide ? height : width;
    let max = isWide ? width : height;

    let rowCount = 1;
    while (rowCount < count) {
        const w = max / Math.ceil(count / rowCount);

        if (w >= min / (rowCount + 1)) {
            break;
        }

        rowCount++;
    }

    let colCount = Math.ceil(count / rowCount);

    while (count % colCount == 1 && rowCount > 1) {
        rowCount--;
        colCount = Math.ceil(count / rowCount);
    }

    return isWide ? [rowCount, colCount] : [colCount, rowCount];
}
