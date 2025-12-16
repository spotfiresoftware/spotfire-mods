export function App({
    xRoot,
    windowSize,
    prop,
}: {
    xRoot: Spotfire.DataViewHierarchyNode;
    windowSize: Spotfire.Size;
    prop: Spotfire.ModProperty<string>;
}) {
    return (
        <div>
            <b>windowSize: </b> {windowSize.width}x{windowSize.height}
            <br />
            <b>should render: </b> {xRoot.rows().length} rows
            <br />
            <b>{prop.name}: </b> {prop.value()}
        </div>
    );
}
