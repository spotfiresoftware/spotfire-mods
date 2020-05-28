export as namespace Spotfire;

/**
 * Represents an axis of the Mod Visualization.
 * @public
 */
export declare interface Axis extends AxisValues {
    /**
     * Sets the full axis expression to the specified `value`.
     */
    setExpression(value: string): void;
}

/**
 * Represents one element of a multi-part axis expression.
 * @public
 */
export declare interface AxisPart {
    /**
     * Gets the expression of this part.
     */
    expression: string;
    /**
     * Gets the display name of this part.
     */
    displayName: string;
}

/**
 * Represents the values held by an {@link Axis}.
 * @public
 */
export declare interface AxisValues {
    /**
     * Gets the name of this instance.
     */
    name: string;
    /**
     * Gets the {@link AxisPart}s that this axis has. The parts are derived from the current  {@link AxisValues.expression}.
     */
    parts: AxisPart[];
    /**
     * Gets the full expression of this instance, including multi-part delimiters and
     * surrounding "\<\>" brackets if the axis is in categorical mode.
     */
    expression: string;
    /**
     * Gets the mode that this axis is currently in.
     * @deprecated - Use isCategorical
     */
    mode: "categorical" | "continuous";
    /**
     * Gets a value indicating whether the axis is categorical or continuous.
     */
    isCategorical: boolean;
}

/**
 * Represents options describing how to render a button. See {@link PopoutComponentFactory.button}.
 * @public
 */
export declare interface ButtonOptions {
    /**
     * Specifies the name that identifies the component.
     */
    name: string;
    /**
     * Specifies the text to display in the button.
     */
    text: string;
}

/**
 * Represents an element in the `path` of a {@link DataViewCategoricalValue}.
 * @public
 */
export declare interface CategoricalValuePathElement {
    /**
     * Gets the display name of this element.
     */
    name: string;
    /**
     * Gets a key that uniquely identifies this element.
     *
     * In many cases this will be the same as {@link CategoricalValuePathElement.name} or {@link CategoricalValuePathElement.value}.
     * However there are cases when those values can contain duplicates. For instance when working with cube data,
     * or when using formatters and display values.
     *
     * They key is suitable to be used for identifying objects when implementing rendering transitions.
     *
     * The key can be null when the corresponding {@link CategoricalValuePathElement.value} is null.
     */
    key: string | null;
    /**
     * Gets the value of this element, or null if this element represents a missing or invalid data point.
     *
     * The type of the returned value can be determined from the {@link DataViewHierarchy.levels} in the {@link DataViewHierarchy} of
     * the associated {@link DataViewCategoricalAxis}.
     */
    value<T extends DataViewValueType>(): T | null;
}

/**
 * Represents options describing how to render a checkbox. See {@link PopoutComponentFactory.checkbox}.
 * @public
 */
export declare interface CheckboxOptions {
    /**
     * Specifies the name that identifies the component.
     */
    name: string;
    /**
     * Specifies the text to display next to the checkbox.
     */
    text: string;
    /**
     * Specifies the tooltip to display. If undefined, no tooltip is shown.
     */
    tooltip?: string;
    /**
     * Specifies whether the checkbox is checked.
     */
    checked: boolean;
    /**
     * Specifies whether the checkbox is enabled.
     */
    enabled: boolean;
}

/**
 * Represents a data column in a Spotfire data table.
 * @public
 */
export declare interface Column extends ColumnValues {
    /**
     * Provides access to the properties of this instance. See {@link Property}.
     */
    properties(): Readable<PropertyValue[]>;
    /**
     * Provides access to the {@link Property} with the specified `name`.
     */
    property(name: string): Readable<PropertyValue>;
}

/**
 * Represents the values held by a {@link Column}.
 * @public
 */
export declare interface ColumnValues {
    /**
     * Gets the name of this instance.
     */
    name: string;
    /**
     * Gets the data type of this instance.
     */
    dataType: string;
}

/**
 * Represents the data of an event that occurs when a {@link PopoutComponent} has been changed by the user.
 * @public
 */
export declare interface ComponentEvent {
    /**
     * Gets the name that identifies the component tha thas been changed.
     */
    name: string;
    /**
     * Gets the value of the component that has been changed.
     */
    value?: any;
}

/**
 * Represents an item in a context menu shown by calling {@link Controls.showContextMenu}.
 * @public
 */
export declare interface ContextMenuItem {
    /**
     * Specifies the text to show in this item.
     */
    text: string;
    /**
     * Specifies whether this item is enabled.
     */
    enabled: boolean;
    /**
     * Specifies the tooltip to show for this item. If not defined, no tooltip will be shown when hovering the this item.
     */
    tooltip?: string;
    /**
     * Specifies a value indicating whether this item is checked. If not defined, this item will not be rendered in a checked state.
     */
    checked?: boolean;
}

/**
 * Provides access points to launch Spotfire controls and UI component relevant for a Mod Visualization.
 * @public
 */
export declare interface Controls {
    /**
     * Shows a context menu with the specified `items`. The context menu closes when the user clicks one of the
     * items or outside the context menu.
     * @param x - The horizontal pixel coordinate where to show the context menu.
     * @param y - The vertical pixel coordinate where to show the context menu.
     * @param items - Defines the content of the context menu.
     * @returns A Promise that, when resolved, provides the {@link ContextMenuItem} that was clicked by the user,
     * or `undefined` if the user clicked outside the context menu.
     */
    showContextMenu(x: number, y: number, items: ContextMenuItem[]): Promise<ContextMenuItem>;
    /**
     * Gets an object with methods to show and hide a Spotfire tooltip.
     */
    tooltip: Tooltip;
    /**
     * Gets an object with methods to show and hide the Spotfire progress indicator.
     */
    progress: Progress;
    /**
     * Gets an object that can be used to create and show a Spotfire popout dialog.
     */
    popout: PopoutControl;
}

/**
 * Represents a data table in the Spotfire document.
 * @public
 */
export declare interface DataTable extends DataTableValues {
    /**
     * Provides access to the columns of this instance. See {@link Column}.
     */
    columns(): Readable<Column[]>;
    /**
     * Provides access to the {@link Column} with the specified `name`.
     */
    column(name: string): ReadableProxy<Column>;
    /**
     * Provides access to the properties of this instance. See {@link Property}.
     */
    properties(): Readable<PropertyValue[]>;
    /**
     * Provides access to the {@link Property} with the specified `name`.
     */
    property(name: string): Readable<PropertyValue>;
}

/**
 * Represents the values held by a {@link DataTable}.
 * @public
 */
export declare interface DataTableValues {
    /**
     * Gets the name of this instance.
     */
    name: string;
    /**
     * Gets the number of columns in this instance.
     */
    columnCount: number;
}

/**
 * Represents the data type of a value.
 * @public
 */
export declare interface DataType {
    /**
     * Gets the name of this DataType.
     */
    name: "String" | "Integer" | "Real" | "Date" | "DateTime" | "Time" | "Currency" | "Binary" | "Boolean" | "LongInteger" | "TimeSpan" | "SingleReal";
    /**
     * Gets a value indicating whether the data type is numeric or not, that is,
     * Integer, Currency, Real, LongInteger, or SingleReal.
     */
    isNumeric(): boolean;
    /**
     * Gets a value indicating whether the data type represents time or not, that is, Time, Date, or DateTime.
     */
    isTime(): boolean;
}

/**
 * Represents a view of the data from which the visualization can be rendered.
 *
 * This object contains the result of the query made by Spotfire against the DataTable
 * currently used by the Mod Visualization, using the Filtering, Marking, expressions
 * on the Axes and other relevant settings.
 * @public
 */
export declare interface DataView {
    /**
     * The rows property can be used to asynchronously iterate all rows via the `for await ()` syntax.
     * This is an alternative way to {@link DataView.getAllRows} method to access the rows of a dataview.
     *
     * __NOTE:__ This approach comes with a number of limitations.
     * The rows can only be iterated once.
     * {@link DataView.getAllRows} will not work when using the iterator.
     * {@link DataViewHierarchy.populateWithRows} will not work when using the iterator.
     *
     * In older JavaScript environments the iterator can be retrieved via the `getIterator()` method.
     * @example
     * ```
     * const rows = [];
     * for await (const row of dataView.rows) {
     *     rows.push(row);
     * }
     * ```
     */
    rows: {
        [Symbol.asyncIterator](): AsyncIterator<DataViewRow>;
        /**
         * Gets the total number of rows of the {@link DataView}.
         */
        getCount(): Promise<number>;
        /**
         * Gets the row iterator. The iterator is used to retrieve rows from the data view. The iterator can only be retrieved and consumed once per data view.
         *
         * Using the iterator directly allows much more flexibility compared to the {@link DataView.getAllRows} helper function.
         * It is possible to check if the dataView is valid and abort the fetch if needed. It is also possible to track progress since the total row count is
         * known via the {@link DataView.rows.getCount} property.
         * @example
         * ```
         * let iterator = dataView.rows.getIterator();
         * let rows = [];
         * let row = await iterator.next()
         * while(!row.done) {
         *     rows.push(row.value);
         *     row = await iterator.next()
         * }
         * ```
         */
        getIterator(): DataViewRowIterator;
    };
    /**
     * Mark a set of rows.
     * The full set will be the union of all mark operations performed within one transaction (see {@link Mod.transaction}).
     * All mark operations must have the same marking operation.
     * @param rows - The rows to be selected.
     */
    mark(rows: DataViewRow[], markingOperation?: MarkingOperation): void;
    /**
     * Clears the current marking
     */
    clearMarking(): void;
    /**
     * Gets a value indicating if marking is enabled in the visualization.
     */
    markingEnabled(): Promise<boolean>;
    /**
     * Gets a value indicating if the dataView is valid.
     * When valid, the contents of the dataView can be accessed
     * using getAllRows or getIterator.
     * When not valid, use getError to get a description of the issue.
     * @deprecated Use hasExpired (for cancellation of data) or hasError (for configuration errors);
     */
    isValid(): Promise<boolean>;
    /**
     * Gets a value indicating whether the dataView has expired.
     * The dataview has expired when there has been changes to the document,
     * for example marking or filtering.
     * When true, there will be a new dataview available on the next read.
     */
    hasExpired(): Promise<boolean>;
    /**
     * Gets a value indicating if the dataView has any errors.
     * When true, use {@link DataView.getError} to get a description of the issue.
     */
    hasError(): Promise<boolean>;
    /**
     * Gets an error message when {@link DataView.hasError} returns true.
     */
    getError(): Promise<string>;
    /**
     * Gets all categorical axes.
     * Categorical axes are defined in the manifest file as categorical or dual.
     * Axes with empty expressions are omitted.
     * @deprecated Use getAxis(name)
     */
    getCategoricalAxes(): Promise<DataViewCategoricalAxis[]>;
    /**
     * Gets all continuous axes.
     * Continuous axes are defined in the manifest file.
     * Axes with empty expressions are omitted.
     * @deprecated Use getAxis(name)
     */
    getContinuousAxes(): Promise<DataViewContinuousAxis[]>;
    /**
     * Gets metadata for a specific axis in the {@link DataView}.
     * Axes with empty expressions returns null.
     * @param name - The axis name.
     */
    getAxis(name: string): Promise<DataViewAxis | null>;
    /**
     * Gets metadata of all axes currently present in the {@link DataView}.
     * Axes with empty expression are omitted.
     */
    getAxes(): Promise<DataViewAxis[]>;
    /**
     * Gets a hierarchy for a categorical axis.
     *
     * If the axis has an empty expression the hierarchy will contain one single root node.
     * If there is no categorical axis with the specified name, a null value will be resolved.
     *
     * @param name - The name of the axis to get the hierarchy for.
     * @param populateWithRows - Optional. If set to true, all available data in the dataview will be retrieved. If set to false the populateWithRows function must be called (and awaited)  in order for the row methods to be available in the hierarchy.
     */
    getHierarchy(name: string, populateWithRows?: boolean): Promise<DataViewHierarchy | null>;
    /**
     * Gets all rows from the data view as one asynchronous operation.
     * The getAllRows function has a built in cache and can be called multiple times with the same dataView and it will return the same list of rows.
     */
    getAllRows(): Promise<DataViewRow[]>;
}

/**
 * Contains metadata computed for an {@link Axis}.
 * @public
 */
export declare interface DataViewAxis {
    /**
     * Gets the name of this axis.
     */
    name: string;
    /**
     * Gets a value indicating whether this axis is categorical or continuous.
     */
    isCategorical: boolean;
}

/**
 * Represents metadata computed for a categorical {@link Axis}.
 * @public
 */
export declare interface DataViewCategoricalAxis extends DataViewAxis {
    /**
     * Gets a value indicating that this axis is categorical.
     */
    isCategorical: true;
    /**
     * Gets the hierarchy of this axis.
     */
    hierarchy: DataViewHierarchy;
}

/**
 * Represents a value of a categorical axis for one row in a data view.
 * @public
 */
export declare interface DataViewCategoricalValue extends DataViewValue {
    /**
     * Gets an array representing the full path of the value in the hierarchy defined by the axis expression.
     * The first element is the top level of the hierarchy and the last element is the leaf level.
     */
    path: CategoricalValuePathElement[];
    /**
     * Gets a string representing the full path. The root is not included.
     * @param separator - The separator used to create the full path. The default separator is "\>\>".
     */
    getValue(separator?: string): string;
    /**
     * Gets the index among the leaf nodes of the associated {@link DataViewHierarchy} of this {@link DataViewCategoricalAxis}.
     * This can for example be used to determine the position on a scale where to render the visual element.
     */
    leafIndex: number;
}

/**
 * Color information for a row.
 * @public
 */
export declare interface DataViewColorInfo {
    /** The hex code for the color. */
    hexCode: string;
}

/**
 * Represents metadata computed for continuous {@link Axis}.
 * @public
 */
export declare interface DataViewContinuousAxis extends DataViewAxis {
    /**
     * Gets a value indicating that this axis is continuous.
     */
    isCategorical: false;
    /**
     * Gets the data type of the values computed by this axis.
     */
    dataType: DataType;
}

/**
 * Represents a value of a continuous axis for one row in a data view.
 * @public
 */
export declare interface DataViewContinuousValue<T extends DataViewValueType> extends DataViewValue {
    /**
     * Returns a boolean that is true if this value is valid and false otherwise.
     * A value can be invalid if it cannot be computed for instance due to missing/invalid data.
     */
    isValid(): boolean;
    /**
     * Gets the value of this instance. The type depending on the type of the
     * expression on the associated {@link DataViewContinuousAxis}.
     *
     * This method will return `null` when {@link DataViewContinuousValue.isValid} returns false.
     */
    getValue(): T | null;
    /**
     * Gets a formatted string that can be used to display this value. The formatting settings in Spotfire
     * are used to create this string.
     */
    getFormattedValue(): string;
}

/**
 * Represents a hierarchy for a {@link DataViewCategoricalAxis}.
 * @public
 */
export declare interface DataViewHierarchy {
    /**
     * Gets the name of this hierarchy, the same as the associated {@link DataViewCategoricalAxis}.
     */
    name: string;
    /**
     * Gets a value indicating whether the hierarchy is empty, i.e. the axis expression is empty, or not.
     * For convenience, an empty hierarchy will have one single node that may contain all rows in the dataview, if {@link DataViewHierarchy.populateWithRows} have been called.
     */
    isEmpty: boolean;
    /**
     * Gets the levels of this hierarchy. The root node has no corresponding level.
     */
    levels: DataViewHierarchyLevel[];
    /**
     * Gets the total number of leaf nodes in the hierarchy.
     */
    leafCount: number;
    /**
     *  Gets the virtual root node of the hierarchy. The level of the root node is -1. Spotfire does not usually render the root node in visualization.
     */
    root(): Promise<DataViewHierarchyNode>;
    /**
     * Gets all leaf nodes this hierarchy. Contains only the root node for axes with empty expression.
     */
    leaves(): Promise<DataViewHierarchyNode[]>;
    /**
     * Promise to populate the hierarchy with rows. This need to be called before accessing any row based functions on hierarchy nodes.
     */
    populateWithRows(): Promise<void>;
}

/**
 * Represents the levels of a hierarchy.
 * @public
 */
export declare interface DataViewHierarchyLevel {
    /**
     * The name of the hierarchy level, derived from the expression on the {@link Axis}.
     */
    name: string;
    /**
     * Gets the data type of the values in this level of the hierarchy.
     */
    dataType: DataType;
}

/**
 * Represents a node in a {@link DataViewHierarchy}.
 * @public
 */
export declare interface DataViewHierarchyNode {
    /**
     * Gets the display name of this node.
     */
    name: string;
    /**
     * Gets the full name of this node, including the name of the parents, root omitted.
     * @param separator - The separator. The default separator is "\>\>".
     */
    fullName(separator?: string): string;
    /**
     * Gets the key for this hierarchy node. The key is guaranteed to be unique for the node among its siblings.
     *
     * In many cases this will be the same as {@link DataViewHierarchyNode.name} or {@link DataViewHierarchyNode.value}.
     * However there are cases when those values can contain duplicates. For instance when working with cube data,
     * or when using formatters and display values.
     *
     * They key is suitable to be used for identifying objects when implementing rendering transitions.
     *
     * The key can be null when the corresponding {@link DataViewHierarchyNode.value} is null.
     */
    key: string | null;
    /**
     * Gets the value of this node, or null if this node represents a missing or invalid data point.
     *
     * The type of the returned value can be determined from the {@link DataViewHierarchy.levels} in the associated {@link DataViewHierarchy}.
     */
    value<T extends DataViewValueType>(): T | null;
    /**
     * Gets the parent of the hierarchy node, or `undefined` for root level nodes.
     */
    parent?: DataViewHierarchyNode;
    /**
     * Gets the children of this node, or `undefined` if this node is a leaf node.
     */
    children?: DataViewHierarchyNode[];
    /**
     * Gets the leaf nodes of this hierarchy node.
     */
    leaves(): DataViewHierarchyNode[];
    /**
     * Gets the index of the leaf node among all leaf nodes in the hierarchy. This is undefined for non leaf nodes.
     */
    leafIndex?: number;
    /**
     * Marks all {@link DataViewRow}s corresponding to the sub tree of the hierarchy spanned from this node.
     * This function will throw if {@link DataViewHierarchy.populateWithRows} has not been called.
     * See {@link DataView.mark} for more details.
     * @param operation - The marking operation.
     */
    mark(operation?: MarkingOperation): void;
    /**
     * Gets the number of {@link DataViewRow}s corresponding to the sub tree of the hierarchy spanned from this node.
     */
    rowCount(): number;
    /**
     * Gets the number of leaf nodes in the sub tree of the hierarchy spanned from this node.
     */
    leafCount(): number;
    /**
     * Gets the number of marked {@link DataViewRow}s in the sub tree of the hierarchy spanned from this node.
     * This function will throw if {@link DataViewHierarchy.populateWithRows} has not been called.
     */
    markedRowCount(): number;
    /**
     * Gets the level in the hierarchy where this node occurs. The root node of the hierarchy tree has level -1.
     */
    level: number;
    /**
     * Gets the {@link DataViewRow}s corresponding to the sub tree of the hierarchy spanned from this node.
     * This function will throw if {@link DataViewHierarchy.populateWithRows} has not been called.
     */
    rows(): DataViewRow[];
}

/**
 * Represents an object that provides access to a {@link DataView}.
 * @public
 */
export declare type DataViewProxy = DataViewProxyMethods & Readable<DataView>;

/**
 * Represents the methods available on a {@link DataViewProxy}.
 * @public
 */
export declare interface DataViewProxyMethods {
    /**
     * Clears the current marking
     */
    clearMarking(): void;
}

/**
 * Represents a row of data in a {@link DataView}. Each row can be thought of as a data point that the mod visualization renders.
 * @public
 */
export declare interface DataViewRow {
    /**
     * Gets a value indicating whether this row is marked.
     */
    isMarked(): boolean;
    /**
     * Gets a {@link DataViewCategoricalValue} representing the value of the axis with the specified `axisName`.
     * @param axisName - The name of the axis to get the value for.
     */
    categorical(axisName: string): DataViewCategoricalValue;
    /**
     * Gets a {@link DataViewContinuousValue} representing the value of the axis with the specified `axisName`.
     * @param axisName - The name of the axis to get the value for.
     */
    continuous<T extends DataViewValueType = DataViewValueType>(axisName: string): DataViewContinuousValue<T>;
    /**
     * Gets the {@link DataViewColorInfo} for the row.
     * Will return null for unmarked rows when there is no color axis defined in the manifest.
     * If there is a color axis defined in the manifest the underlying data value can be retrieved by using {@link DataViewRow.categorical}("Color") or {@link DataViewRow.continuous}("Color"), depending on the mode of the color axis.
     */
    getColor(): DataViewColorInfo | null;
    /**
     * Performs the specified marking operation in the current marking.
     *
     * **Note** All mark operations within one {@link Mod.transaction} must have the same {@link MarkingOperation}.
     *
     * See {@link DataView.mark} for more details.
     * @param operation - The {@link MarkingOperation} to perform. If omitted, a `Replace` is performed.
     */
    mark(operation?: MarkingOperation): void;
}

/**
 * Provides a way to iterate through the rows of a {@link DataView}.
 * @public
 */
export declare interface DataViewRowIterator {
    /**
     * Steps this instance to the next {@link DataViewRow} of the associated {@link DataView}.
     */
    next(): Promise<DataViewRowIteratorResult>;
}

/**
 * Represents the result of stepping a {@link DataViewRowIterator} to the next row of the associated {@link DataView}.
 * @public
 */
export declare type DataViewRowIteratorResult = {
    value: DataViewRow;
    done: false;
} | {
    value: undefined;
    done: true;
};

/**
 * Represents a value of a continuous or categorical axis for one row in a data view.
 * @public
 */
export declare interface DataViewValue {
    /**
     * Gets a value indicating whether this is a {@link DataViewCategoricalValue}.
     */
    isCategorical: boolean;
    /**
     * Gets the name of the axis associated with this value.
     */
    axisName: string;
}

/**
 * Represents the type of a {@link DataView} value. The actual type that a given value has depends on the
 * type of the expression on the associated axis.
 * @public
 */
export declare type DataViewValueType = number | string | boolean | Date;

/**
 * From readableArray, an array of Readable of some value type, extract an array of this value type.
 * @public
 */
export declare type ExtractValueType<readableArray extends ReadonlyArray<Readable<any>>> = {
    [contentName in keyof readableArray]: readableArray[contentName] extends Readable<infer contentNameType> ? contentNameType : never;
};

/**
 * Represents information about a font that is used in the Mod Visualization.
 * @public
 */
export declare interface FontInfo {
    /**
     * Gets the value to use for the `font-family` CSS property.
     */
    fontFamily: string;
    /**
     * Gets the font size in pixels.
     */
    fontSize: number;
    /**
     * Gets the value to use for the `font-style` CSS property.
     */
    fontStyle: string;
    /**
     * Gets the value to use for the `font-weight` CSS property.
     */
    fontWeight: string;
    /**
     * Gets the value to use for the `color` CSS property.
     */
    color: string;
}

/**
 * Represents the general styling information that applies to the Mod Visualization.
 * @public
 */
declare interface GeneralStylingInfo {
    /**
     * Gets and object describing the font that shall be used by the Mod Visualization.
     */
    font: FontInfo;
    /**
     * Gets the value to use for the `background-color` CSS property of the Mod Visualization.
     */
    backgroundColor: string;
}

/**
 * Initializes the Mod API. The specified `onLoaded` callback is called when the initialization is complete.
 * @example
 * ```
 * Spotfire.initialize(async (mod) => {
 *  console.log("Mod API loaded.");
 * });
 * ```
 * [[include:initialize.md]]
 * @public
 * @param onLoaded - Callback that is called when the mod API is initialized and ready to be interacted with.
 */
export declare function initialize(onLoaded: OnLoadCallback): void;

/**
 * Represents the styling information that applies to scale lines in the Mod Visualization.
 * @public
 */
declare interface LineStylingInfo {
    /**
     * Gets the stroke to use for scale lines. This value is valid a CSS color or the value `"none"`.
     */
    stroke: string;
}

/**
 * Specifies how a Marking shall be modified.
 * <pre>
 * - "Replace" - replaces the current marking.
 * - "Add" - adds to the current marking.
 * - "Subtract" - removes the current marking.
 * - "Toggle" - toggles marking on each item in the set.
 * - "Intersect" - marks the intersection of the current marking and the specified set.
 * - "ToggleOrAdd" - will behave like toggle if all or no rows in the set are marked, otherwise it is an add operation. This is the default Spotfire behavior for control marking.
 * </pre>
 * @public
 */
export declare type MarkingOperation = "Replace" | "Add" | "Subtract" | "Toggle" | "Intersect" | "ToggleOrAdd";

/**
 * Extract from T the keys of all properties with function values.
 * @public
 */
export declare type MethodKeys<T> = {
    [P in keyof T]: T[P] extends Function ? P : never;
}[keyof T];

/**
 * Represents the entire Mod API and exposes methods for interacting with and reading data from
 * the Mod Visualization and the Spotfire document.
 *
 * Reading content from the Mod is made with the{@link Mod.reader} method.
 * @public
 */
export declare interface Mod {
    /**
     * Gets an object that provides access to Spotfire document.
     */
    document: SpotfireDocument;
    /**
     * Gets an object representing the content in the Mod Visualization and provides methods to read and/or modified it.
     */
    visualization: ModVisualization;
    /**
     * Creates a {@link ReadFunction} that can be called with a callback function to access content specified
     * by the `readables` parameter. The callback will be invoked on the initial call of the {@link ReadFunction} and
     * for subsequent calls whenever the content specified by at least one of the {@link Readable}s has changed.
     *
     * @example Read the {@link DataView} once.
     * ```
     * let read = mod.reader(mod.visualization.data());
     * read((dataView) => {
     *    console.log(await dataView.rows.getCount());
     * });
     * ```
     *
     * @example Read the dataView each time it changes.
     * ```
     * let read = mod.reader(mod.visualization.data());
     * read(async function onChange(dataView) {
     *    console.log(await dataView.rows.getCount());
     *    read(onChange);
     * });
     * ```
     *
     * @example Read the dataView and property X each time any of them changes.
     * ```
     * let read = mod.reader(mod.visualization.data(), mod.visualization.property("X"));
     * read(async function onChange(dataView, xValue) {
     *    console.log(await dataView.rows.getCount());
     *    console.log(xValue);
     *    read(onChange);
     * });
     * ```
     *
     * @example The {@link ReadFunction} returns a promise with the values if no callback is passed.
     * ```
     * let read = mod.reader(mod.visualization.data(), mod.visualization.property("X"));
     * while(true) {
     *    let [dataView, xValue] = await read(); // Only resolves when a value has changed.
     *    console.log(await dataView.rows.getCount());
     *    console.log(xValue);
     * }
     * ```
     * @param readables - A list of requested content. Readables are found in {@link Mod.document} and {@link Mod.visualization}.
     * @returns - function used to read content.
     */
    reader<T extends ReadonlyArray<Readable>>(...readables: T): ReadFunction<ExtractValueType<T>>;
    /**
     * Gets an object that allows showing Spotfire controls and other UI component, like context menus, tooltips, etc.
     */
    controls: Controls;
    /**
     * Performs a set of synchronous modifications in an explicit transaction to the Spotfire document.
     *
     * Use of this method is only needed to make sure that a set of modifications are done as one transaction, thereby resulting in one undo step.
     * Modifications done outside of a transaction action callback will be grouped together in an implicit transaction.
     *
     * @param action - callback with a set of modifications
     * @example
     * ```
     * mod.transaction(() => {
     *     mod.visualization.property("X").set("new value for X");
     *     mod.visualization.property("Y").set("new value for Y");
     * });
     * ```
     */
    transaction(action: () => void): void;
    /**
     * Adds a general error handler.
     * @param errorCallback - callback that will be invoked each time an error occurs.
     */
    onError(errorCallback: (messageCallback: string) => void): void;
    /**
     * Get the Mod's render context. This function should be invoked as soon as possible in the {@link initialize} callback.
     *
     * If this method is called in the {@link initialize} callback, Spotfire will wait for the Mod to finish rendering during
     * an export. The export will be made once the {@link RenderContext.signalRenderComplete} method has been called.
     *
     * If this method is not called in the {@link initialize} callback, Spotfire will _not_ wait for the Mod to finish rendering during
     * an export. Instead, the Mod will be automatically exported after one second.
     */
    getRenderContext(): RenderContext;
    /**
     * Get mod metadata - name, id, version, etc.
     */
    metadata: ModMetadata;
}

/**
 * Represents that metadata of the Mod Visualization, as defined in the mod-manifest-json.
 * @public
 */
export declare interface ModMetadata {
    /**
     * Gets the id of the Mod Visualization, as defined in the mod-manifest-json.
     */
    id: string;
    /**
     * Gets the name of the Mod Visualization, as defined in the mod-manifest-json.
     */
    name: string;
    /**
     * Gets the version of the Mod Visualization, as defined in the mod-manifest-json.
     */
    version: string;
    /**
     * Gets the api version used by the Mod Visualization, as declared in the mod-manifest-json.
     */
    apiVersion: string;
}

/**
 * Represents the content in the Mod Visualization that can be read and/or modified.
 *
 * The content is a combination of state stored by the Mod Visualization in the Spotfire document,
 * its view of the data and relevant UI properties. All values are {@link Readable} objects and are
 * typically accessed using the {@link Mod.reader} method.
 *
 * @public
 */
export declare interface ModVisualization {
    /**
     * Provides access to the {@link Property} with the specified `name`.
     */
    property(name: string): ReadableProxy<Property>;
    /**
     * Provides access to the {@link DataView} that the Mod Visualization is to render.
     */
    data(): DataViewProxy;
    /**
     * Provides access to the {@link DataTable} in the Spotfire document that the Mod Visualization
     * uses as its main table.
     */
    mainTable(): ReadableProxy<DataTable>;
    /**
     * Provides access to the {@link Axis} in the Mod Visualization with the specified `name`. All axes
     * must be declared in the mod-manifest.json.
     */
    axis(name: string): ReadableProxy<Axis>;
    /**
     * Provides read-only access to the current size of the browser window in which the Mod
     * is rendered. That is, the size of the iframe created for the Mod in the Spotfire UI.
     */
    windowSize(): Readable<Size>;
}

/**
 * Represents a function that consumes the {@link Mod} API. See {@link initialize}.
 * @public
 */
export declare type OnLoadCallback = (mod: Mod) => void | Promise<void>;

/**
 * Represents a Page in a Spotfire document.
 * @public
 */
export declare interface Page extends PageValues {
    /**
     * Sets this instance as the active page.
     */
    setAsActive(): void;
}

/**
 * Represents the values held by a {@link Page}.
 * @public
 */
export declare interface PageValues {
    /**
     * Gets the name of this instance.
     */
    name: string;
    /**
     * Gets a value indicating whether this instance is visible.
     */
    visible: boolean;
    /**
     * Gets the zero-based index in this instance in the page collection in the Spotfire document.
     */
    index: number;
}

/**
 * Represents a pop out dialog that is shown by Spotfire. See {@link Controls.popout}.
 * @public
 */
export declare interface Popout {
    /**
     * Closes the pop out dialog.
     */
    close(): void;
}

/**
 * Represents a component of a pop out dialog. See {@link Controls.popout}.
 * @public
 */
export declare interface PopoutComponent {
    /**
     * Gets the type of the control.
     */
    type: string;
}

/**
 * Represents an object with methods that create {@link PopoutComponent}s.
 * @public
 */
export declare interface PopoutComponentFactory {
    /**
     * Groups the specified `children` components into a single row and returns a
     * new {@link PopoutComponent} representing this group.
     * @param children - The components to group together in a row.
     */
    row(children: PopoutComponent[]): PopoutComponent;
    /**
     * Creates a component that renders as a divider.
     */
    divider(): PopoutComponent;
    /**
     * Creates a component that renders as a heading for other components.
     * @param text - The text to display in the heading.
     */
    heading(text: string): PopoutComponent;
    /**
     * Creates a component that renders as a radio button.
     * @param options - Specifies how the radio button shall be rendered.
     */
    radioButton(options: RadioButtonOptions): PopoutComponent;
    /**
     * Creates a component that renders as a checkbox.
     * @param options - Specifies how the checkbox shall be rendered.
     */
    checkbox(options: CheckboxOptions): PopoutComponent;
    /**
     * Creates a component that renders as a button.
     * @param options - Specifies how the button shall be rendered.
     */
    button(options: ButtonOptions): PopoutComponent;
}

/**
 * Represents an object that can be used to create and show a Spotfire popout dialog.
 * @public
 */
export declare interface PopoutControl {
    /**
     * Shows a pop out dialog as specified by the `options` and `controls`.
     * @param options - Specifies where and how to show the pop out dialog.
     * @param components - A callback that shall produce the array of components that the
     * pop out will show. If the pop out is shown with {@link PopoutOptions.autoClose} set to `false`
     * this callback will be invoked every time the user has interacted with one of the {@link PopoutComponent}s
     * so that the pop out can be re-rendered to show the result of the interaction.
     */
    show(options: PopoutOptions, components: () => PopoutComponent[]): Popout;
    /**
     * Gets an object with methods that create {@link PopoutComponent}s.
     */
    components: PopoutComponentFactory;
}

/**
 * Represents options that specifies where and how a pop out dialog shall be shown.
 * @public
 */
export declare interface PopoutOptions {
    /**
     * Specifies the horizontal pixel coordinate of the anchor point of the pop out dialog.
     *
     * The coordinate is specified relative to an origin in the top left corner of the Mod viewport.
     */
    x: number;
    /**
     * Specifies the vertical pixel coordinate of the anchor point of the pop out dialog.
     *
     * The coordinate is specified relative to an origin in the top left corner of the Mod viewport.
     */
    y: number;
    /**
     * Specifies how to position of the popout in relation to the anchor point specified by `x` and `y`.
     *
     * The alignment value specifies which edge of the pop out that shall be closest to the anchor point. For example,
     * to show the pop out below the anchor point, specify `Top`.
     */
    alignment?: "Left" | "Right" | "Top" | "Bottom";
    /**
     * Specifies whether to automatically close the popout when one of the components in it is clicked.
     */
    autoClose: boolean;
    /**
     * Specifies the callback to invoke when a component in the pop out dialog is changed.
     */
    onChange(event: ComponentEvent): void;
    /**
     * Specifies the callback to invoke when the pop out dialog has been closed.
     * This callback is optional and can be left unassigned.
     */
    onClosed?(): void;
}

/**
 * Represents an object with methods to show and hide the Spotfire progress indicator.
 * @public
 */
export declare interface Progress {
    /**
     * Shows the progress indicator.
     */
    show(): void;
    /**
     * Hides the progress indicator.
     */
    hide(): void;
}

/**
 * Represents a property owned by the Mod Visualization or by the Spotfire document, its data tables and data columns.
 * The Mod manifest defines the properties owned by the Mod Visualization.
 * @public
 */
export declare interface Property<ValueType extends PropertyDataType = any> extends PropertyValue<ValueType> {
    /**
     * Set the value of this instance.
     * @param value - The value to set.
     */
    set(value: PropertyDataType): void;
}

/**
 * Represents the data types possible to store in a {@link Property}.
 * @public
 */
export declare type PropertyDataType = string | number | boolean;

/**
 * Represents the values held by a {@link Property}.
 * @public
 */
export declare interface PropertyValue<T = string> {
    /**
     * Gets the name of this instance.
     */
    name: string;
    /**
     * Gets the value held by this instance.
     */
    value: T;
}

/**
 * Represents options describing how to render a radio button. See {@link PopoutComponentFactory.radioButton}.
 * @public
 */
export declare interface RadioButtonOptions {
    /**
     * Specifies the name that identifies the component.
     */
    name: string;
    /**
     * Specifies the text to display next to the radio button.
     */
    text: string;
    /**
     * Specifies the tooltip to display. If undefined, no tooltip is shown.
     */
    tooltip?: string;
    /**
     * Specifies whether the radio button is checked.
     */
    checked: boolean;
    /**
     * Specifies the value represented by the radio button.
     */
    value: any;
}

/**
 * Represents a value in the Mod API that can be accessed and/or modified. These values can
 * be passed to the {@link Mod.reader} function in order to get updates when the value is changed.
 * @public
 */
export declare interface Readable<T = any> extends Promise<T> {
    /**
     * Used internally by the Mod api.
     */
    readableID: string;
    /**
     * Used internally by the Mod api.
     */
    __futureValue?: T;
}

/**
 * Represents an object that provides access to a node of the specified type.
 * It can be used as a {@link Readable} but also acts as a proxy to the node by exposing all its methods.
 * Nodes that represent model state in the Spotfire document can thus be modified without first waiting
 * and materializing them in the browser.
 *
 * A full node will be created by waiting for the promise of by reading the node with {@link Mod.reader}.
 * @public
 */
export declare type ReadableProxy<Node> = Readable<Node> & Pick<Node, MethodKeys<Node>>;

/**
 * Represents a function that is used to read values from the Mod Visualization and Spotfire document.
 * A read function is created by calling the {@link Mod.reader} method.
 * @public
 */
export declare interface ReadFunction<T extends ReadonlyArray<any>> {
    /** Read content and the callback will be invoked when all values have been resolved. At least one new value will be read. */
    (callback: (...values: T) => void, errorCallback?: (error: string) => void): void;
    /** Read all values and retrieve them as a promise. */
    (): Promise<T>;
}

/**
 * Represents contextual information needed when rendering a Mod, either in the UI or as part of an export.
 * @public
 */
export declare interface RenderContext {
    /**
     * Gets a value indicating whether the Mod is interactive.
     *
     * When this value is false the Mod is not interactive. This occurs during export, for instance to an image or to PDF.
     * This property can be used to hide selected controls and to avoid animations when rendering in an export context.
     */
    interactive: boolean;
    /**
     * Gets the image pixel ratio that shall be used when rendering rasterized images and/or using a canvas element.
     */
    imagePixelRatio: number;
    /**
     * Gets information about the currently used theme.
     */
    styling: StylingInfo;
    /**
     * Signals that the mod is ready to be exported.
     *
     * If this method is not called, Spotfire will perform export (and preview generation etc.) of the Mod without knowing
     * if it has finished rendering.
     *
     * The default maximum allowed time for a Mod to finish rendering is 20 seconds.
     */
    signalRenderComplete(): void;
}

/**
 * Represents the styling information that applies to scales in the Mod Visualization.
 * @public
 */
declare interface ScaleStylingInfo {
    /**
     * Gets and object describing the font that shall be used in the scales of the Mod Visualization.
     */
    font: FontInfo;
    /**
     * Gets and object describing the styling information for scale lines in the Mod Visualization.
     */
    line: LineStylingInfo;
    /**
     * Gets and object describing the styling information for scale ticks in the Mod Visualization.
     */
    tick: TickStylingInfo;
}

/**
 * Represents the size of the browser window in which the Mod is rendered. That is, the
 * size of the iframe created for the Mod in the Spotfire UI.
 * @public
 */
export declare interface Size {
    /**
     * Gets the width of the window.
     */
    width: number;
    /**
     * Gets the height of the window.
     */
    height: number;
}

/**
 * Represents the Spotfire document and provides access to read and modify parts of it.
 * @public
 */
export declare interface SpotfireDocument {
    /**
     * Provides access to the {@link DataTable}s in the Spotfire document.
     */
    tables(): Readable<DataTable[]>;
    /**
     * Provides access to the {@link DataTable} with the specified `name` in the Spotfire document.
     */
    table(name: string): ReadableProxy<DataTable>;
    /**
     * Provides access to the `Document Properies` in the Spotfire Document.
     */
    properties(): Readable<Property[]>;
    /**
     * Provides access to the `Document Property` with the specified `name` in the Spotfire Document.
     */
    property(name: string): ReadableProxy<Property>;
    /**
     * Provides access to the {@link Page}s in the Spotfire document.
     */
    pages(): Readable<Page[]>;
    /**
     * Provides access to the active {@link Page} in the Spotfire document. That is, the page that is currently visible.
     */
    activePage(): ReadableProxy<Page>;
    /**
     * Sets the specified {@link Page} as the active page.
     * @param name - The name/title of the page to set as active.
     */
    setActivePage(name: string): void;
}

/**
 * Represents the styling (theme) that affects the look and feel of a Mod Visualization.
 * @public
 */
export declare interface StylingInfo {
    /**
     * Gets an object describing the general aspects of the styling, including the font and background color
     * to use in the Mod Visualization.
     */
    general: GeneralStylingInfo;
    /**
     * Gets an object describing the styling of the scales in the Mod Visualization.
     */
    scales: ScaleStylingInfo;
}

/**
 * Represents the styling information that applies to scale ticks in the Mod Visualization.
 * @public
 */
declare interface TickStylingInfo {
    /**
     * Gets the stroke to use for scale ticks. This value is valid a CSS color or the value `"none"`.
     */
    stroke: string;
}

/**
 * Represent an object with methods to show and hide a Spotfire tooltip.
 * @public
 */
export declare interface Tooltip {
    /**
     * Shows a tooltip with the specified `content` text.
     *
     * The tooltip is shown using the same style and initial delay as native Spotfire visualizations.
     * Once shown, the tooltip will follow the mouse around until {@link Tooltip.hide} is called.
     *
     * Subsequent calls to `show`can be made to update the tooltip text.
     * @param content - The text to show in the tooltip.
     */
    show(content: string): void;
    /**
     * Hides the tooltip that is currently being showed, if any.
     */
    hide(): void;
}

export { }
