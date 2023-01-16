import { Mod, ModProperty } from "spotfire-api";
import { CellContent, ManifestConst, resources } from "./resources";

export function createSettingsButton(
    mod: Mod,
    diagonal: ModProperty<CellContent>,
    upper: ModProperty<CellContent>,
    lower: ModProperty<CellContent>
) {
    const settingsButton = document.querySelector<HTMLElement>(".settings");
    settingsButton?.classList.toggle("visible", mod.getRenderContext().isEditing);
    const pos = settingsButton!.getBoundingClientRect();
    const p = mod.controls.popout;
    const rb = p.components.radioButton;

    function diagBtn(value: CellContent, text: string) {
        return {
            enabled: true,
            name: ManifestConst.Diagonal,
            value,
            checked: diagonal.value() == value,
            text
        };
    }

    function upperBtn(value: CellContent, text: string) {
        return {
            enabled: true,
            name: ManifestConst.Upper,
            value,
            checked: upper.value() == value,
            text
        };
    }

    function lowerBtn(value: CellContent, text: string) {
        return {
            enabled: true,
            name: ManifestConst.Lower,
            value,
            checked: lower.value() == value,
            text
        };
    }

    settingsButton!.onclick = () => {
        p.show(
            {
                x: pos.left + pos.width / 2,
                y: pos.top + pos.height,
                autoClose: true,
                alignment: "Top",
                onChange(event) {
                    event.name == ManifestConst.Diagonal && diagonal.set(event.value);
                    event.name == ManifestConst.Upper && upper.set(event.value);
                    event.name == ManifestConst.Lower && lower.set(event.value);
                }
            },
            () => [
                p.section({
                    heading: resources.diagonal,
                    children: [
                        rb(diagBtn(CellContent.Blank, resources.diagonal_blank)),
                        rb(diagBtn(CellContent.Stats, resources.diagonal_stats)),
                        rb(diagBtn(CellContent.Density, resources.diagonal_density)),
                        rb(diagBtn(CellContent.Histogram, resources.diagonal_histogram)),
                        rb(diagBtn(CellContent.BoxPlot, resources.diagonal_box_plot)),
                        rb(diagBtn(CellContent.ScatterPlot, resources.diagonal_scatter_plot))
                    ]
                }),
                p.section({
                    heading: resources.triangle_lower,
                    children: [
                        rb(lowerBtn(CellContent.ScatterPlot, resources.triangle_scatter)),
                        rb(lowerBtn(CellContent.CorrelationStat, resources.triangle_correlation_stats)),
                        rb(lowerBtn(CellContent.CorrelationColor, resources.triangle_correlation_color)),
                        rb(lowerBtn(CellContent.HeatMap, resources.triangle_heatmap)),
                        rb(lowerBtn(CellContent.ContourPlot, resources.triangle_contour_plot)),
                        rb(lowerBtn(CellContent.Blank, resources.triangle_blank))
                    ]
                }),
                p.section({
                    heading: resources.triangle_upper,
                    children: [
                        rb(upperBtn(CellContent.ScatterPlot, resources.triangle_scatter)),
                        rb(upperBtn(CellContent.CorrelationStat, resources.triangle_correlation_stats)),
                        rb(upperBtn(CellContent.CorrelationColor, resources.triangle_correlation_color)),
                        rb(upperBtn(CellContent.HeatMap, resources.triangle_heatmap)),
                        rb(upperBtn(CellContent.ContourPlot, resources.triangle_contour_plot)),
                        rb(upperBtn(CellContent.Blank, resources.triangle_blank))
                    ]
                })
            ]
        );
    };
}
