export const resources = {
    warningEmptyPath: (a: string) => "Some segments are hidden because one or more levels in the hierarchy contain empty values: " + a,
    warningNegativeValues: "Some segments represent negative values. These segments are shown with red outlines.",
    warningSplittingColorAxis:
        "The color expression generates more values than the hierarchy expression. Some leaves in the hierarchy will appear multiple times.",
    popoutLabelsHeading: "Show labels for",
    popoutLabelsAll: "All",
    popoutLabelsMarked: "Marked rows",
    popoutLabelsNone: "None",
    popoutInteractionModeHeading: "Interaction",
    popoutInteractionModeMark: "Marking mode",
    popoutInteractionModeMarkTooltip: "Click segments to mark data. To drill-down instead, use Alt + click.",
    popoutInteractionModeDrillDown: "Drill-down mode",
    popoutInteractionModeDrillDownTooltip: "Click segments to drill-down into the data. To mark segments instead, use Alt + click.",
    popoutShowNullValues: "Show segments with empty values",
    popoutSortByValue: "Sort segments by value",
    warningsTooltip: (warnings: string[]) => "Warnings:\n" + warnings.join("\n"),
    breadCrumbRoot: "(All)"
};
