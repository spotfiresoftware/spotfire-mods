export const resources = {
    warningEmptyPath: (a: string) => "Some segments are not visualized. The following path has holes in it: " + a,
    warningNegativeValues: "The plot contains negative values. These segments have a red outline.",
    warningSplittingColorAxis:
        "The color expression generates more values than the hierarchy expression. Some leaves in the hierarchy will appear multiple times.",
    popoutLabelsHeading: "Show labels for",
    popoutLabelsAll: "All",
    popoutLabelsMarked: "Marked rows",
    popoutLabelsNone: "None",
    popoutInteractionModeMark: "Mark",
    popoutInteractionModeMarkTooltip: "Click segments to mark data. Use Alt + click for drill down mode.",
    popoutInteractionModeHeading: "Interaction",
    popoutInteractionModeDrillDown: "Drill down",
    popoutInteractionModeDrillDownTooltip: "Click segments to drill down into the data. Use Alt + click for marking mode.",
    popoutShowNullValues: "Display segments with empty values",
    popoutSortByValue: "Sort segments by value",
    warningsTooltip: (warnings: string[]) => "Warnings:\n" + warnings.join("\n"),
    breadCrumbRoot: "(All)"
};
