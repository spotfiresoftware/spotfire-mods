//@ts-ignore
import { render, Component, ComponentChildren, h } from "preact";
import { useState } from "preact/hooks";
import { ModProperty } from "spotfire-api";

const settingsIcon =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><path d="M16 10.66a2.078 2.078 0 0 1-3.63.34h-.47v3.9H9.15l.29-.3-.36-.66-.06-.11-.07-.13-.02-.03a.21.21 0 0 0-.04-.06 1.088 1.088 0 0 0 .08-.31c.03-.01.07-.03.11-.04h.93v-3.15l-.83-.15a3.964 3.964 0 0 1-.43-.11 1.748 1.748 0 0 1 .11-.18l.1-.15.04-.05.02-.05.06-.11.36-.66-.53-.54-.92-.91-.54-.54-.66.37-.11.06-.37.19c-.04-.12-.08-.22-.11-.3l-.01-.02v-.97H2.91v.98l-.1.33-.52-.28-.22-.12H2V5h4v-.26a2.027 2.027 0 0 1-.94-2.25A2.003 2.003 0 1 1 8 4.73V5h3.9v4h.47a1.972 1.972 0 0 1 1.73-1 2.01 2.01 0 0 1 1.9 2.66z"></path><path d="M8.65 10.88c-.1-.03-.21-.06-.34-.1l-.52-.16a2.044 2.044 0 0 0-.28-.64l.33-.58c.05-.09.11-.19.17-.28l.04-.06.08-.12.06-.11-.91-.91-.11.06-.13.07-.95.5a2.99 2.99 0 0 0-.63-.29l-.11-.57a1.275 1.275 0 0 0-.12-.41l-.05-.17V7H3.92v.11l-.33 1.15c-.23.11-.41.17-.64.29l-.28-.18-.01-.01-.05-.02L2 8.02l-.19-.1h-.05l-.51.56-.34.3.06.11.56 1.09a2.39 2.39 0 0 0-.22.58l-.62.16a3.771 3.771 0 0 1-.69.24v1.27l.11.05 1.2.33c.05.19.16.41.22.58l-.56 1.1-.06.11.85.86h.05l.69-.38.45-.22a2.041 2.041 0 0 0 .58.22l.34 1.02.04.07.01.03h1.26l.05-.1.33-1.02a2.594 2.594 0 0 0 .64-.28l.51.28.68.36.61-.63.19-.19-.06-.11-.05-.05a4.025 4.025 0 0 0-.24-.46l-.28-.58a2.242 2.242 0 0 0 .28-.63l.54-.17a3.388 3.388 0 0 0 .51-.17H9v-1.29a3.502 3.502 0 0 1-.35-.08zm-4.12 2.44a1.82 1.82 0 0 1 0-3.64 1.82 1.82 0 0 1 0 3.64z"></path></svg>';

interface ComponentBase {
    label: string;
    type: "text" | "range" | "checkbox";
    property: ModProperty;
}

interface TextInput extends ComponentBase {
    type: "text";
}

interface CheckboxInput extends ComponentBase {
    type: "checkbox";
}

interface RangeInput extends ComponentBase {
    type: "range";
    min: number;
    max: number;
    step: number;
}

type Components = TextInput | CheckboxInput | RangeInput;

function Settings(props: { children: ComponentChildren }) {
    const [isOpen, setIsOpen] = useState(false);

    let className = "settings-area " + (isOpen ? "" : "tucked-away");
    return (
        <div>
            <div className={className}>{props.children}</div>
            <div className="icon-button settings" title="Settings" onClick={() => setIsOpen(!isOpen)}>
                <Icon icon={settingsIcon} />
            </div>
        </div>
    );
}

export function renderSettings(components: Components[]) {
    let c = components.map((c) => {
        if (c.type == "checkbox") {
            return (
                <span>
                    <label>
                        {c.label}
                        <input
                            type="checkbox"
                            checked={c.property.value<boolean>()!}
                            onChange={(e: any) => {
                                c.property.set(e.target!.checked!);
                            }}
                        ></input>
                    </label>
                </span>
            );
        }

        if (c.type == "range") {
            return (
                <span>
                    {c.label}
                    <input
                        type="range"
                        max={c.max}
                        min={c.min}
                        value={c.property.value<number>()!}
                        step={c.step}
                        onChange={function (this: HTMLInputElement, e: any) {
                            const { value } = e.target;
                            let p = parseInt(value);
                            console.log(this, e, c, p);
                            c.property.set(p);
                        }}
                    ></input>
                </span>
            );
        }

        if (c.type == "text") {
            return (
                <span>
                    {c.label}
                    <input
                        type="text"
                        value={c.property.value<number>()!}
                        onChange={(e: any) => {
                            const { value } = e.target;
                            let p = parseInt(value);
                            c.property.set(p);
                        }}
                    ></input>
                </span>
            );
        }
    });

    render(<Settings>{c}</Settings>, document.querySelector("#settings-area")!);
}

interface IconProps {
    icon: string;
}

class Icon extends Component<IconProps> {
    shouldComponentUpdate() {
        return false;
    }

    componentDidMount(this: Component<IconProps>) {
        (this.base as Element).innerHTML = this.props.icon;
    }

    render() {
        return <div />;
    }
}
