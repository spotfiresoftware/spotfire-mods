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

export interface GaugeMeasurements extends GaugeArc {
    showMinMax: boolean;
    showLabels: boolean;
    width: number;
}

export interface GaugeArc {
    tickRadius: number;
    radius: number;
    innerRadius: number;
    paddingRadians: number;
    maxAngle: number;
}

export function gaugeRadius(width: number, height: number, paddingRadians: number) {
    if (paddingRadians < 0 || paddingRadians > Math.PI / 2) {
        throw new Error("Invalid pad angle");
    }

    const maxAngle = Math.PI / 2 - paddingRadians;

    // Radius can never be greater than half the width
    let maxRadius = width / 2;

    // Radius can be greater than half the height when there is a pad angle
    let maxHeightRadius = height / (1 + Math.sin(maxAngle));

    let r = Math.max(Math.min(maxRadius, maxHeightRadius), 10);

    return r;
}

export function toPaddingRadians(angleInDegrees: number = 40) {
    if (angleInDegrees < 0 || angleInDegrees > 90) {
        throw new Error("Invalid pad angle '" + angleInDegrees + "'");
    }

    return (angleInDegrees * 2 * Math.PI) / 360;
}

export function gaugeArc(width: number, height: number, padAngle: number, arcWidth: number): GaugeArc {
    let paddingRadians = toPaddingRadians(padAngle);

    let tickRadius = gaugeRadius(width, height, paddingRadians);
    let radius = tickRadius - Math.min(tickRadius / 10, 10);
    let innerRadius = radius - (radius * arcWidth) / 100;
    let maxAngle = Math.PI - paddingRadians;

    return {
        tickRadius,
        radius,
        innerRadius,
        paddingRadians,
        maxAngle
    };
}

export function labelsFitSpace(width: number, height: number, labelSize: number) {
    return height / 2 > labelSize && labelSize * 0.7 * 6 < width;
}

export function scaleFitSpace(width: number, height: number, labelSize: number) {
    return height / 2 > labelSize * 2 && labelSize * 0.7 * 8 < width;
}
