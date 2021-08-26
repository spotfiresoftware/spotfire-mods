import { Controls, ModProperty } from "spotfire-api";

export function createLabelPopout(
    controls: Controls,
    curveType: ModProperty<string>,
    xLabelsRotation: ModProperty<boolean>,
    yAxisNormalization: ModProperty<boolean>,
    enableColorFill: ModProperty<boolean>,
    popoutClosedEventEmitter: any
) {
    const { radioButton, checkbox } = controls.popout.components;
    const { section } = controls.popout;

    /**
     * Popout content
     */
    const is = (property: ModProperty) => (value: any) => property.value() == value;

    const popoutContent = () => [
        section({
            heading: "Curve Type",
            children: [
                radioButton({
                    name: curveType.name,
                    text: "Rounded",
                    value: "Rounded",
                    checked: is(curveType)("Rounded")
                }),
                radioButton({
                    name: curveType.name,
                    text: "Linear",
                    value: "Linear",
                    checked: is(curveType)("Linear")
                })
            ]
        }),
        section({
            children: [
                checkbox({
                    name: xLabelsRotation.name,
                    text: "Rotate X-axis labels",
                    checked: is(xLabelsRotation)(true),
                    enabled: true
                })
            ]
        }),
        section({
            children: [
                checkbox({
                    name: yAxisNormalization.name,
                    text: "Normalize Y-axis values",
                    checked: is(yAxisNormalization)(true),
                    enabled: true
                })
            ]
        }),
        section({
            children: [
                checkbox({
                    name: enableColorFill.name,
                    text: "Color fill",
                    checked: is(enableColorFill)(true),
                    enabled: true
                })
            ]
        })
    ];

    return function show(x: number, y: number) {
        controls.popout.show(
            {
                x: x,
                y: y,
                autoClose: true,
                alignment: "Bottom",
                onChange: (event) => {
                    const { name, value } = event;
                    name == curveType.name && curveType.set(value);
                    name == xLabelsRotation.name && xLabelsRotation.set(value);
                    name == yAxisNormalization.name && yAxisNormalization.set(value);
                    name == enableColorFill.name && enableColorFill.set(value);
                },
                onClosed: () => {
                    popoutClosedEventEmitter.emit("popoutClosed");
                }
            },
            popoutContent
        );
    };
}
