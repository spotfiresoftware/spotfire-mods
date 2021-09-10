export const resources = {
    warningEmptyPath: (a: string) => "Some segments are not visualized. The following path has holes in it: " + a,
    warningNegativeValues: "The plot contains negative values. These segments have a red outline.",
    warningSplittingColorAxis:
        "The color expression generates more values than the hierarchy expression. Some leaves in the hierarchy will appear multiple times.",
    popoutLabelsAll: "All",
    popoutLabelsMarked: "Marked rows",
    popoutLabelsNone: "None",
    popoutInteractionModeMark: "Mark",
    popoutInteractionModeMarkTooltip: "Mark data when clicking a sector. ‘Alt’ click for the opposite behavior.",
    popoutInteractionModeDrillDown: "Drill down",
    popoutInteractionModeDrillDownTooltip: "Drill down when clicking a sector. ‘Alt’ click for the opposite behavior.",
    popoutShowNullValues: "Display segments with empty values",
    popoutSortByValue: "Sort segments by value",
    warningsTooltip: (warnings: string[]) => "Warnings:\n" + warnings.join("\n"),
    breadCrumbRoot: "(All)"
};
