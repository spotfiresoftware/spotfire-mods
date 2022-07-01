import { Mod, ModProperty } from "spotfire-api";
import { DiagonalContent, ManifestConst, resources, TriangleContent } from "./resources";

export function createSettingsButton(
    mod: Mod,
    diagonal: ModProperty<DiagonalContent>,
    upper: ModProperty<TriangleContent>,
    lower: ModProperty<TriangleContent>
) {
    const settingsButton = document.querySelector<HTMLElement>(".settings");
    settingsButton?.classList.toggle("visible", mod.getRenderContext().isEditing);
    const pos = settingsButton!.getBoundingClientRect();
    const p = mod.controls.popout;
    const rb = p.components.radioButton;

    function diagBtn(value: DiagonalContent, text: string) {
        return {
            enabled: true,
            name: ManifestConst.Diagonal,
            value,
            checked: diagonal.value() == value,
            text
        };
    }

    function upperBtn(value: TriangleContent, text: string) {
        return {
            enabled: true,
            name: ManifestConst.Upper,
            value,
            checked: upper.value() == value,
            text
        };
    }

    function lowerBtn(value: TriangleContent, text: string) {
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
                        rb(diagBtn(DiagonalContent.Blank, resources.diagonal_blank)),
                        rb(diagBtn(DiagonalContent.Distribution, resources.diagonal_distribution)),
                        rb(diagBtn(DiagonalContent.Histogram, resources.diagonal_histogram)),
                        rb(diagBtn(DiagonalContent.BoxPlot, resources.diagonal_box_plot)),
                        rb(diagBtn(DiagonalContent.ScatterPlot, resources.diagonal_scatter_plot))
                    ]
                }),
                p.section({
                    heading: resources.triangle_lower,
                    children: [
                        rb(lowerBtn(TriangleContent.ScatterPlot, resources.triangle_scatter)),
                        rb(lowerBtn(TriangleContent.CorrelationStat, resources.triangle_correlation_stats)),
                        rb(lowerBtn(TriangleContent.CorrelationColor, resources.triangle_correlation_color)),
                        rb(lowerBtn(TriangleContent.Blank, resources.triangle_blank))
                    ]
                }),
                p.section({
                    heading: resources.triangle_upper,
                    children: [
                        rb(upperBtn(TriangleContent.ScatterPlot, resources.triangle_scatter)),
                        rb(upperBtn(TriangleContent.CorrelationStat, resources.triangle_correlation_stats)),
                        rb(upperBtn(TriangleContent.CorrelationColor, resources.triangle_correlation_color)),
                        rb(upperBtn(TriangleContent.Blank, resources.triangle_blank))
                    ]
                })
            ]
        );
    };
}
