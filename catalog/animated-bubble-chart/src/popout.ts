import { Controls, ModProperty } from "spotfire-api";

export function createLabelPopout(
    controls: Controls,
    showLabel: ModProperty<boolean>,
    xLogScale: ModProperty<boolean>,
    yLogScale: ModProperty<boolean>
) {
    const { checkbox } = controls.popout.components;
    const { section } = controls.popout;

    /**
     * Popout content
     */
    const is = (property: ModProperty) => (value: any) => property.value() == value;

    const popoutContentY = () => [
        section({
            children: [
                checkbox({
                    name: yLogScale.name,
                    text: "Log Scale",
                    checked: is(yLogScale)(true),
                    enabled: true,
                }),
                checkbox({
                    name: showLabel.name,
                    text: "Show labels for marked rows",
                    checked: is(showLabel)(true),
                    enabled: true,
                })
            ]
        })
    ];

    const popoutContentX = () => [
        section({
            children: [
                checkbox({
                    name: xLogScale.name,
                    text: "Log Scale",
                    checked: is(xLogScale)(true),
                    enabled: true,
                })
            ]
        })
    ];

    return function show(x: number, y: number, scale: "X" | "Y") {
        controls.popout.show(
            {
                x: x,
                y: y,
                autoClose: true,
                alignment: "Bottom",
                onChange: event => {
                    const { name, value } = event;
                    name == showLabel.name && showLabel.set(value);
                    name == xLogScale.name && xLogScale.set(value);
                    name == yLogScale.name && yLogScale.set(value);
                }
            },
            scale == "Y"  ? popoutContentY :popoutContentX
        );
    };
}
