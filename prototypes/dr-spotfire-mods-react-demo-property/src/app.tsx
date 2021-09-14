import React from "react";
import { AnalysisProperty } from "spotfire-api";

export interface AppProps {
    currentProperty: string;
    properties: AnalysisProperty[];
    showProperties: (x: number, y: number) => void;
}

export function App(props: AppProps) {
    return (
        <div>
            <DropDown text={props.currentProperty} onClick={props.showProperties} />
            <EditMenu {...props} key={props.currentProperty} />
        </div>
    );
}

function DropDown({ text, onClick }: { text: string; onClick: (x: number, y: number) => void }) {
    return (
        <div className="button__wrap">
            <button className="button"
                onClick={(e) => {
                    let target = e.target;
                    let bBox = (target as HTMLDivElement).getBoundingClientRect();

                    onClick(bBox.left, bBox.top + bBox.height);
                }}
            >
                {!text ? "Select a property" : text}
            </button>
            <div className="button__shadow"></div>
        </div>
    );
}

function EditMenu(props: AppProps) {
    let property = props.properties.find((p) => p.name == props.currentProperty);
    if (!property) {
        return <div>No property selected</div>;
    }

    if (property.dataType.name != "String") {
        return <div>This prototype can only edit string properties {property.value()}</div>;
    }

    if (property.isList) {
        return (
            <div>
                {property.name}
                <input
                    defaultValue={property.valueList().join(", ")}
                    onBlur={(e) => {
                        property?.set(e.target.value.split(","));
                    }}
                ></input>
            </div>
        );
    }

    return (
        <div>
            {property.name} 
            <input
                defaultValue={property.value<string>()!}
                onBlur={(e) => {
                    property?.set(e.target.value);
                }}
            ></input>
        </div>
    );
}
