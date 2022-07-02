export const resources = {
    diagonal: "Diagonal cells",
    diagonal_blank: "Blank",
    diagonal_scatter_plot: "Scatter Plot",
    diagonal_stats: "Statistics",
    diagonal_histogram: "Histogram",
    diagonal_density: "Density",
    diagonal_box_plot: "Box plot",
    triangle_upper: "Upper cells",
    triangle_lower: "Lower cells",
    triangle_blank: "Blank",
    triangle_scatter: "Scatter plot",
    triangle_correlation_stats: "Correlation coeffifient (numeric)",
    triangle_correlation_color: "Correlation coeffifient (color coded)",
    triangle_heatmap: "Heat map",
    triangle_contour_plot: "Contour plot"
};

export const enum CellContent {
    // Do not change. These are stored as mod propertis.
    Blank = 0,
    Stats = 1,
    ScatterPlot = 2,
    Histogram = 3,
    Density = 4,
    BoxPlot = 5,
    CorrelationStat = 6,
    CorrelationColor = 7,
    HeatMap = 8,
    ContourPlot = 9
}

export const ManifestConst = {
    // Do not change. As defined in mod manifest.
    MeasureAxis: "Measures",
    ColorAxis: "Color",
    CountAxis: "Count",
    ColumnNamesAxis: "ColumnNames",
    Diagonal: "Diagonal",
    Upper: "Upper",
    Lower: "Lower"
};
