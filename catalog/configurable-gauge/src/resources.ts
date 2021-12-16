export const resources = {
    warningMinGreaterThanMax: (label: string, minValue: any, maxValue: any) =>
        `${label} has a min value (${minValue}) that is greater than its max value (${maxValue})`,
    warningMinEqualToMax: (label: string, minValue: any, maxValue: any) =>
        `${label} has a min value (${minValue}) that is identical to its max value (${maxValue})`,
    settingArcWidth: "Arc width:",
    settingAngle: "Gauge angle:",
    settingsBackgroundOpacity: "Background opacity:",
    settingsScaleTicksOpacity: "Scale ticks opacity:",
    settingsShowPercent: "Show percent:",
    settingsShowMinMax: "Show min and max:"
};
