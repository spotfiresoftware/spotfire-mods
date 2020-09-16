export as namespace Spotfire;

/**
 * Predicate to determine if a current read operation for {@link DataView.allRows} should be aborted when there is new, non-streaming, data available. If this predicate returns true the {@link DataView.allRows} promise will be rejected and no rows will be returned.
 * @public
 */
export declare type AbortPredicate = (currentRowCount: number) => boolean;

/**
 * Represents a property owned by the Spotfire document.
 * These can be either document properties, data table properties or data column properties.
 * @public
 */
export declare interface AnalysisProperty<T extends AnalysisPropertyDataType = AnalysisPropertyDataType> extends AnalysisPropertyValue<T> {
    /**
     * Set the value of this instance.
     * @param value - The value to set.
     */
    set(value: T | T[] | null): void;
}

/**
 * Represents the data types possible to store in a document, table or column {@link AnalysisProperty}.
 * @public
 */
export declare type AnalysisPropertyDataType = string | number | boolean | Date | TimeSpan | Time;

/**
 * Represents the values held by a {@link AnalysisProperty}.
 * @public
 */
export declare interface AnalysisPropertyValue<T extends AnalysisPropertyDataType = AnalysisPropertyDataType> {
    /**
     * Gets the name of this instance.
     */
    name: string;
    /**
     * Gets the value held by this instance. Will throw if the value is a list, i.e. {@link AnalysisPropertyValue.isList} returns true;
     */
    value<T2 extends T>(): T2 | null;
    /**
     * Gets the value held by this instance. Will throw if the value is not a list, i.e. {@link AnalysisPropertyValue.isList} returns false;
     */
    valueList<T2 extends T>(): T2[];
    /**
     * Get the Spotfire internal data type of the property.
     */
    dataType: DataType;
    /**
     * Gets a value indicating whether the property is a list.
     */
    isList: boolean;
}

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
     * Gets a value indicating whether the axis is categorical or continuous.
     */
    isCategorical: boolean;
}

/**
 * Represents a data column in a Spotfire data table.
 * @public
 */
export declare interface Column extends ColumnValues {
    /**
     * Provides access to the properties of this instance. See {@link AnalysisProperty}.
     */
    properties(): Readable<AnalysisPropertyValue[]>;
    /**
     * Provides access to the {@link AnalysisProperty} with the specified `name`.
     */
    property(name: string): Readable<AnalysisPropertyValue>;
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
    dataType: DataType;
}

/**
 * Represents an object with methods to show a context menu.
 * @public
 */
export declare interface ContextMenu {
    /**
     * Shows a context menu with the specified `items`. The context menu closes when the user clicks one of the
     * items or outside the context menu.
     * @param x - The horizontal pixel coordinate where to show the context menu.
     * @param y - The vertical pixel coordinate where to show the context menu.
     * @param items - Defines the content of the context menu.
     * @returns A Promise that, when resolved, provides the {@link ContextMenuItem} that was clicked by the user,
     * or `undefined` if the user clicked outside the context menu.
     */
    show(x: number, y: number, items: ContextMenuItem[]): Promise<ContextMenuItem>;
}

/**
 * Represents an item in a context menu shown by calling {@link ContextMenu.show}.
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
     * Gets an object with methods to show a context menu.
     */
    contextMenu: ContextMenu;
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
    popout: Popout;
    /**
     * Gets an object that can be used to show an error overlay native Spotfire style.
     */
    errorOverlay: ErrorOverlay;
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
     * Provides access to the properties of this instance. See {@link AnalysisProperty}.
     */
    properties(): Readable<AnalysisPropertyValue[]>;
    /**
     * Provides access to the {@link AnalysisProperty} with the specified `name`.
     */
    property(name: string): Readable<AnalysisPropertyValue>;
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
    name: "String" | "Integer" | "LongInteger" | "Real" | "SingleReal" | "Currency" | "Boolean" | "Date" | "DateTime" | "Time" | "TimeSpan" | "Binary";
    /**
     * Gets a value indicating whether the data type is numeric or not, that is,
     * Integer, Currency, Real, LongInteger, or SingleReal.
     */
    isNumber(): boolean;
    /**
     * Gets a value indicating whether the data type is represents by Date or not, that is, Date, or DateTime.
     */
    isDate(): boolean;
    /**
     * Gets a value indicating whether the data type is represents by {@link Time} or not.
     */
    isTime(): boolean;
    /**
     * Gets a value indicating whether the data type is represents by {@link TimeSpan} or not.
     */
    isTimeSpan(): boolean;
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
     * Mark a set of rows.
     * The full set will be the union of all mark operations performed within one transaction (see {@link Mod.transaction}).
     * All mark operations must have the same marking operation.
     * @param rows - The rows to be selected.
     * @param operation - Optional {@link MarkingOperation}. Default value is `Replace`.
     */
    mark(rows: DataViewRow[], markingOperation?: MarkingOperation): void;
    /**
     * Clears the current marking
     */
    clearMarking(): void;
    /**
     * Gets the marking information, or null if marking is not enabled.
     */
    marking(): Promise<MarkingInfo | null>;
    /**
     * Gets a value indicating whether the dataView has expired.
     * The dataview has expired when there has been changes to the document,
     * for example marking or filtering.
     * When true, there will be a new dataview available on the next read.
     */
    hasExpired(): Promise<boolean>;
    /**
     * Gets any errors generated while creating the dataview.
     * Returns empty array if none occurred.
     */
    getErrors(): Promise<string[]>;
    /**
     * Gets metadata for a specific categorical axis in the {@link DataView}.
     * Categorical axes are defined in the manifest file as categorical or dual.
     * When this method fails to return a valid axis getting the corresponding call to {@link DataViewRow.categorical} will throw an error.
     * Returns null for axes with empty expressions or for dual mode axes that currently are in continuous mode.
     * Throws if the axis does not exist or the axes mode is continuous.
     * @param name - The axis name.
     */
    categoricalAxis(name: string): Promise<DataViewCategoricalAxis | null>;
    /**
     * Gets metadata for a specific continuous axis in the {@link DataView}.
     * Continuous axes are defined in the manifest file as continuous or dual.
     * When this method fails to return a valid axis getting the corresponding call to {@link DataViewRow.continuous} will throw an error.
     * Returns null for axes with empty expressions or for dual mode axes that currently are in categorical mode.
     * Throws if the axis does not exist or the axes mode is categorical.
     * @param name - The axis name.
     */
    continuousAxis(name: string): Promise<DataViewContinuousAxis | null>;
    /**
     * Gets metadata of all axes currently present in the {@link DataView}.
     * Axes with empty expression are omitted.
     */
    axes(): Promise<DataViewAxis[]>;
    /**
     * Gets a hierarchy for a categorical axis.
     *
     * If the axis has an empty expression the hierarchy will contain one single root node.
     * Returns null for dual mode axes that currently are in continuous mode.
     * Throws if the axis does not exist or the axes mode is continuous.
     * @param name - The name of the axis to get the hierarchy for.
     * @param populateWithRows - Optional. If set to true, all available data in the dataview will be retrieved. If set to false the populateWithRows function must be called (and awaited)  in order for the row methods to be available in the hierarchy.
     */
    hierarchy(name: string, populateWithRows?: boolean): Promise<DataViewHierarchy | null>;
    /**
     * Gets the total number of rows of the {@link DataView} without actually getting all the rows. Use this function to determine whether or not the mod will be able to handle the amount of data rows.
     * When there are errors in the mod configuration there will be no rows available and this method will return undefined.
     */
    rowCount(): Promise<number | undefined>;
    /**
     * Gets all rows from the data view as one asynchronous operation.
     * The allRows function has a built in cache and can be called multiple times with the same dataView and it will return the same list of rows.
     * @param abortPredicate - Optional. Predicate to determine whether the operation should be aborted when there is new, non-streaming, data available. If this predicate returns true the promise will be rejected.
     * The default behavior is that reading will be aborted when new non-streaming update is available.
     * @returns null if reading data was aborted, otherwise a {@link DataViewRow}[].
     */
    allRows(abortPredicate?: AbortPredicate): Promise<DataViewRow[] | null>;
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
     * Gets a value indicating whether this axis is an instance of {@link DataViewContinuousAxis} or {@link DataViewCategoricalAxis} .
     */
    isCategorical: boolean;
}

/**
 * Represents metadata computed for a categorical {@link Axis}.
 * @public
 */
export declare interface DataViewCategoricalAxis extends DataViewAxis {
    /**
     * Gets the hierarchy of this axis.
     */
    hierarchy: DataViewHierarchy;
}

/**
 * Represents a value of a categorical axis for one row in a data view.
 * @public
 */
export declare interface DataViewCategoricalValue {
    /**
     * Gets an array representing the full path of the value in the hierarchy defined by the axis expression.
     * The first element is the top level of the hierarchy and the last element is the leaf level.
     */
    value(): DataViewCategoricalValuePathElement[];
    /**
     * Gets a formatted string that can be used to display this value.
     * This string is built by concatenating the {@link DataViewCategoricalValuePathElement.formattedValue} for each element found in the {@link DataViewCategoricalValue.value} array.
     * @param separator - The separator used for concatenation. The default separator is " » ".
     */
    formattedValue(separator?: string): string;
    /**
     * Gets the index among the leaf nodes of the associated {@link DataViewHierarchy} of this {@link DataViewCategoricalAxis}.
     * This, for example, can be used to determine the position on a scale where to render the visual element.
     */
    leafIndex: number;
}

/**
 * Represents an element in the `path` of a {@link DataViewCategoricalValue}.
 * @public
 */
export declare interface DataViewCategoricalValuePathElement {
    /**
     * Gets a formatted string that can be used to display this value.
     * The formatting settings in Spotfire are used to create this string.
     */
    formattedValue(): string;
    /**
     * Gets a key that uniquely identifies this element.
     *
     * In many cases this will be the same as {@link DataViewCategoricalValuePathElement.formattedValue} and {@link DataViewCategoricalValuePathElement.value}.
     * However there are cases when those values can contain duplicates. For instance when working with cube data,
     * or when using formatters and display values.
     *
     * They key is suitable to be used for identifying objects when implementing rendering transitions.
     *
     * The key can be null when the corresponding {@link DataViewCategoricalValuePathElement.value} is null.
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
 * Color information for a {@link DataViewRow}.
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
     * Gets the data type of the values computed by this axis.
     */
    dataType: DataType;
}

/**
 * Represents a value of a continuous axis for one row in a data view.
 * @public
 */
export declare interface DataViewContinuousValue<T extends DataViewValueType = DataViewValueType> {
    /**
     * Gets the value of this instance. The type depending on the type of the
     * expression on the associated {@link DataViewContinuousAxis}.
     *
     * This method will return `null` when the underlying data value is missing or invalid.
     */
    value<T2 extends DataViewValueType = T>(): T2 | null;
    /**
     * Gets a formatted string that can be used to display this value.
     * The formatting settings in Spotfire are used to create this string.
     */
    formattedValue(): string;
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
     * For convenience, an empty hierarchy will have one single node that may contain all rows in the dataview.
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
     * @param abortPredicate - Optional. Predicate to determine whether the operation should be aborted when there is new, non-streaming, data available. If this predicate returns true the promise will be rejected.
     * The default behavior is that reading will be aborted when new non-streaming update is available.
     * @returns null if reading data was aborted, otherwise a {@link DataViewHierarchyNode}.
     */
    root(abortPredicate?: AbortPredicate): Promise<DataViewHierarchyNode | null>;
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
     * Gets a formatted string that can be used to display this value.
     * The formatting settings in Spotfire are used to create this string.
     */
    formattedValue(): string;
    /**
     * Gets the full path, top down to this node, of the formatted values. The virtual root node is omitted.
     * @param separator - The separator. The default separator is " » ".
     */
    formattedPath(separator?: string): string;
    /**
     * Gets the key for this hierarchy node. The key is guaranteed to be unique for the node among its siblings.
     *
     * In many cases this will be the same as {@link DataViewHierarchyNode.formattedValue} or {@link DataViewHierarchyNode.value}.
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
     * Computes an array of all leaf nodes in the sub tree of the hierarchy spanned from this node.
     */
    leaves(): DataViewHierarchyNode[];
    /**
     * Gets the index of the leaf node among all leaf nodes in the hierarchy. This is undefined for non leaf nodes.
     */
    leafIndex?: number;
    /**
     * Marks all {@link DataViewRow}s corresponding to the sub tree of the hierarchy spanned from this node.
     * See {@link DataView.mark} for more details.
     * @param operation - The marking operation.
     */
    mark(operation?: MarkingOperation): void;
    /**
     * Computes the number of {@link DataViewRow}s corresponding to the sub tree of the hierarchy spanned from this node.
     */
    rowCount(): number;
    /**
     * Computes the number of leaf nodes in the sub tree of the hierarchy spanned from this node.
     */
    leafCount(): number;
    /**
     * Computes the number of marked {@link DataViewRow}s in the sub tree of the hierarchy spanned from this node.
     */
    markedRowCount(): number;
    /**
     * Gets the level in the hierarchy where this node occurs. The root node of the hierarchy tree has level -1.
     */
    level: number;
    /**
     * Computes the {@link DataViewRow}s corresponding to the sub tree of the hierarchy spanned from this node.
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
     * This method will throw an error if there is no categorical axis by that name.
     * Use {@link DataView.categoricalAxis} to check the current existence of a categorical value.
     * @param axisName - The name of the axis to get the value for.
     */
    categorical(axisName: string): DataViewCategoricalValue;
    /**
     * Gets a {@link DataViewContinuousValue} representing the value of the axis with the specified `axisName`.
     * This method will throw an error if there is no continuous axis by that name.
     * Use {@link DataView.continuousAxis} to check the current existence of a continuous value.
     * @param axisName - The name of the axis to get the value for.
     */
    continuous<T extends DataViewValueType>(axisName: string): DataViewContinuousValue<T>;
    /**
     * Gets the {@link DataViewColorInfo} for the row, if a color axis is defined in the mod manifest.
     * The underlying data value can be retrieved by using {@link DataViewRow.categorical}("Color") or {@link DataViewRow.continuous}("Color"), depending on the mode of the color axis.
     */
    color(): DataViewColorInfo;
    /**
     * Performs the specified marking operation in the current marking.
     *
     * **Note** All mark operations within one {@link Mod.transaction} must have the same {@link MarkingOperation}.
     *
     * See {@link DataView.mark} for more details.
     * @param operation - Optional {@link MarkingOperation}. Default value is `Replace`.
     */
    mark(operation?: MarkingOperation): void;
}

/**
 * Represents the type of a {@link DataView} value. The actual type that a given value has depends on the
 * type of the expression on the associated axis.
 * @public
 */
export declare type DataViewValueType = number | string | boolean | Date | Time | TimeSpan;

/**
 * Provides access to show an error overlay covering the entire Mod shown by Spotfire.
 * @public
 */
export declare interface ErrorOverlay {
    /**
     * Show error message. Showing any error message will hide the Mods UI.
     * @param messages - The error messages. Each message will be shown in its own paragraph.
     * @param category - Optional error categorization. Useful if multiple error message are to be shown. Error messages will be sorted based on the category.
     */
    show(messages: string[], category?: string): void;
    /**
     * Show error message. Showing any error message will hide the Mods UI.
     * @param messages - The error message.
     * @param category - Optional error categorization. Useful if multiple error message are to be shown. Error messages will be sorted based on the category.
     */
    show(message: string, category?: string): void;
    /**
     * Clear the error message. If no other error messages are currently visible the Mods UI will be shown.
     * @param category - Optional error categorization.
     */
    hide(category?: string): void;
}

/**
 * From readableArray, an array of Readable of some value type, extract an array of this value type.
 * @public
 */
export declare type ExtractValueType<readableArray extends ReadonlyArray<Readable<any>>> = {
    [readableName in keyof readableArray]: readableArray[readableName] extends Readable<infer readableNameType> ? readableNameType : never;
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
 * Marking information for a {@link DataView}.
 * @public
 */
export declare interface MarkingInfo {
    /** The hex code for the marking. Note that when the mod has a defined color axis, the color should be retrieved via the {@link DataViewRow.color} method. */
    colorHexCode: string;
    /** The name of the marking. */
    name: string;
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
 * Reading content from the Mod is made by using either of the methods {@link Reader.subscribe} or {@link Reader.once} on an instance of a {@link Reader}.
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
     * Provides access to the {@link ModProperty} with the specified `name`.
     */
    property<T extends ModPropertyDataType>(name: string): ReadableProxy<ModProperty<T>>;
    /**
     * Provides read-only access to the current size of the browser window in which the Mod
     * is rendered. That is, the size of the iframe created for the Mod in the Spotfire UI.
     */
    windowSize(): Readable<Size>;
    /**
     * Creates a {@link Reader} that can be used to access content specified by the {@link Readable} parameters.
     * The reader is responsible for combining multiple {@link Readable}s and scheduling a callback to be invoked
     * when one or more of the {@link Readable}s have changed.
     * @param readables - The {@link Readable}s that will be available in the reader.
     */
    createReader<T extends ReadonlyArray<Readable>>(...readables: T): Reader<ExtractValueType<T>>;
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
     * @param onComplete - optional callback that is called when the transaction is committed or rolled back. When there is an error argument in the callback the transaction was rolled back.
     * @example
     * ```
     * mod.transaction(() => {
     *     mod.property("X").set("new value for X");
     *     mod.property("Y").set("new value for Y");
     * },
     * (error) => {
     *     if (error) {
     *         // Show error message.
     *     }
     *     else {
     *         // Handle success, e.g. re-enable action button.
     *     }
     * });
     * ```
     */
    transaction(action: () => void, onComplete?: (error?: string) => void): void;
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
 * Represents a property owned by the Mod Visualization.
 * The Mod manifest defines the properties owned by the Mod Visualization.
 * @public
 */
export declare interface ModProperty<T extends ModPropertyDataType = ModPropertyDataType> extends ModPropertyValue<T> {
    /**
     * Set the value of this instance.
     * @param value - The value to set.
     */
    set(value: T): void;
}

/**
 * Represents the data types possible to store in a mod {@link ModProperty}.
 * @public
 */
export declare type ModPropertyDataType = string | number | boolean;

/**
 * Represents the values held by a {@link ModProperty}.
 * @public
 */
export declare interface ModPropertyValue<T extends ModPropertyDataType = ModPropertyDataType> {
    /**
     * Gets the name of this instance.
     */
    name: string;
    /**
     * Gets the value held by this instance;
     */
    value<T2 extends T>(): T2 | null;
    /**
     * Get the Spotfire internal data type of the property.
     */
    dataType: DataType;
}

/**
 * Represents the content in the Mod Visualization that can be read and/or modified.
 *
 * The content is a combination of state stored by the Mod Visualization in the Spotfire document,
 * its view of the data and relevant UI properties. All values are {@link Readable} objects and are
 * typically accessed using the {@link Reader} object.
 *
 * @public
 */
export declare interface ModVisualization {
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
     * Sets the main {@link DataTable} in the Mod visualization.
     * @param tableName - The name of the {@link DataTable} to be used as main table.
     */
    setMainTable(tableName: string): void;
    /**
     * Sets the main {@link DataTable} in the Mod visualization.
     * @param table - The {@link DataTable} object to be used as main table.
     */
    setMainTable(table: DataTable): void;
    /**
     * Provides access to the {@link Axis} in the Mod Visualization with the specified `name`. All axes
     * must be declared in the mod-manifest.json.
     * @param name - The name of the {@link Axis}.
     */
    axis(name: string): ReadableProxy<Axis>;
}

/**
 * Represents methods that are not available on a {@link ReadableProxy}. To access these methods the {@link ReadableProxy} must be awaited.
 * @public
 */
export declare type OmittedReadableProxyMethods = "value" | "valueList";

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
 * Represents an object that can be used to create and show a Spotfire popout dialog.
 * @public
 */
export declare interface Popout {
    /**
     * Shows a pop out dialog as specified by the `options` and `controls`.
     * @param options - Specifies where and how to show the pop out dialog.
     * @param components - A callback that shall produce the array of components that the
     * pop out will show. If the pop out is shown with {@link PopoutOptions.autoClose} set to `false`
     * this callback will be invoked every time the user has interacted with one of the {@link PopoutComponent}s
     * so that the pop out can be re-rendered to show the result of the interaction.
     */
    show(options: PopoutOptions, components: () => PopoutSection[]): PopoutDialog;
    /**
     * Creates a section that contains a heading and components.
     * @param options - Specifies the heading and the components.
     */
    section(options: PopoutSectionOptions): PopoutSection;
    /**
     *  Gets an object with methods that create {@link PopoutComponent}s.
     */
    components: PopoutComponentFactory;
}

/**
 * Represents options describing how to render a button. See {@link PopoutComponentFactory.button}.
 * @public
 */
export declare interface PopoutButtonOptions {
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
 * Represents options describing how to render a checkbox. See {@link PopoutComponentFactory.checkbox}.
 * @public
 */
export declare interface PopoutCheckboxOptions {
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
 * Represents the data of an event that occurs when a {@link PopoutComponent} has been changed by the user.
 * @public
 */
export declare interface PopoutComponentEvent {
    /**
     * Gets the name that identifies the component that has been changed.
     */
    name: string;
    /**
     * Gets the value of the component that has been changed.
     */
    value?: any;
}

/**
 * Represents an object with methods that create {@link PopoutComponent}s.
 * @public
 */
export declare interface PopoutComponentFactory {
    /**
     * Creates a component that renders as a radio button.
     * @param options - Specifies how the radio button shall be rendered.
     */
    radioButton(options: PopoutRadioButtonOptions): PopoutComponent;
    /**
     * Creates a component that renders as a checkbox.
     * @param options - Specifies how the checkbox shall be rendered.
     */
    checkbox(options: PopoutCheckboxOptions): PopoutComponent;
    /**
     * Creates a component that renders as a button.
     * @param options - Specifies how the button shall be rendered.
     */
    button(options: PopoutButtonOptions): PopoutComponent;
}

/**
 * Represents a pop out dialog that is shown by Spotfire. See {@link Controls.popout}.
 * @public
 */
export declare interface PopoutDialog {
    /**
     * Closes the pop out dialog.
     */
    close(): void;
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
    onChange(event: PopoutComponentEvent): void;
    /**
     * Specifies the callback to invoke when the pop out dialog has been closed.
     * This callback is optional and can be left unassigned.
     */
    onClosed?(): void;
}

/**
 * Represents options describing how to render a radio button. See {@link PopoutComponentFactory.radioButton}.
 * @public
 */
export declare interface PopoutRadioButtonOptions {
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
 * Represents a section of a pop out dialog. See {@link Controls.popout}.
 * @public
 */
export declare interface PopoutSection {
    /**
     * Specifies the heading of the section
     */
    heading?: string;
    /**
     * Specifies the components in the section
     */
    children: PopoutComponent[];
}

/**
 * Represents a section of a pop out dialog. See {@link Controls.popout}.
 * @public
 */
export declare interface PopoutSectionOptions {
    /**
     * Specifies the heading of the section
     */
    heading?: string;
    /**
     * Specifies the components in the section
     */
    children: PopoutComponent[];
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
 * Represents a value in the Mod API that can be accessed and/or modified. These values can
 * be used when creating an instance of a {@link Reader} via the {@link Mod.createReader} method.
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
 * A full node will be created by using a {@link Reader}.
 * @public
 */
export declare type ReadableProxy<Node> = Readable<Node> & Omit<Pick<Node, MethodKeys<Node>>, OmittedReadableProxyMethods>;

/**
 * The reader is responsible for combining multiple {@link Readable}s and scheduling a callback to be invoked
 * when one or more of the {@link Readable}s have changed. Choose one of the appropriate methods;
 * {@link Reader.once} or {@link Reader.subscribe} that suits the needs of the Mod.
 * An instance of the reader is created by calling the {@link Mod.createReader} method.
 * @public
 */
export declare interface Reader<T extends ReadonlyArray<any>> {
    /**
     * Subscribe to changes in the content for the specified readables when the reader was created.
     * @example Subscribe to changes in the {@link DataView}.
     *
     * ```
     * let reader = mod.createReader(mod.visualization.data());
     * reader.subscribe((dataView) => {
     *    console.log(await dataView.rowCount());
     * });
     * ```
     *
     * @param callback - The callback function that is called every time when there is at least one new value to read.
     * The callback function will not be called until the previous callback function has returned.
     * @param onReadError - Optional callback function that will be called if there are errors reading the readables.
     */
    subscribe(callback: (...values: T) => void, onReadError?: (error: string) => void): void;
    /**
     * Read the content once for the readables specified when the reader was created.
     * Any current subscription for this reader will be cancelled.
     * @example Read content of a mod property once.
     *
     * ```
     * let reader = mod.createReader(mod.property("CreatedBy"));
     * reader.once((createdBy) => {
     *    console.log(await createdBy.value());
     * });
     * ```
     *
     * @param callback - The callback function that is called once when there is at least one new value to read.
     * @param onReadError - Optional callback function that will be called if there are errors reading the readables.
     */
    once(callback: (...values: T) => void, onReadError?: (error: string) => void): void;
    /**
     * Checks if any of the readables have a new value available. If this function returns true,
     * the callback in the current subscription, or a new call to {@link Reader.once} is guaranteed
     * to be invoked.
     * The intended use of this method is to cancel rendering of the Mod if there are new values to any of the
     * readables specified when the reader was created.
     */
    hasExpired(): Promise<boolean>;
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
 * Represents the size of an area in the UI, for example the size of the browser window in which the Mod
 * is rendered. See {@link Mod.windowSize}.
 * @public
 */
export declare interface Size {
    /**
     * Gets the width.
     */
    width: number;
    /**
     * Gets the height.
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
     * Provides access to the `Document Properties` in the Spotfire Document.
     */
    properties(): Readable<AnalysisProperty[]>;
    /**
     * Provides access to the `Document Property` with the specified `name` in the Spotfire Document.
     */
    property<T extends AnalysisPropertyDataType = AnalysisPropertyDataType>(name: string): ReadableProxy<AnalysisProperty<T>>;
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
    /**
     * Sets the specified index as the active page index.
     * @param index - The index of the page to set as active.
     */
    setActivePage(index: number): void;
    /**
     * Sets the specified {@link Page} as the active page.
     * @param page - The {@link Page} object to set as active.
     */
    setActivePage(page: Page): void;
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
 * Represents a Time property. The time has no notion of time zone.
 * @public
 */
export declare interface Time {
    /** The total number of milliseconds since midnight. */
    totalMilliseconds: number;
    /** The millisecond part of the instance. */
    milliseconds: number;
    /** The total number of seconds since midnight. */
    totalSeconds: number;
    /** The second part of the instance. */
    seconds: number;
    /** The total number of minutes since midnight. */
    totalMinutes: number;
    /** The minute part of the instance. */
    minutes: number;
    /** The total number of hours since midnight. */
    hours: number;
}

/**
 * Represents a TimeSpan property. A time span is used to measure the time between two points in time.
 * @public
 */
export declare interface TimeSpan {
    /** The total number of milliseconds of the instance. */
    totalMilliseconds: number;
    /** The millisecond part of the instance. */
    milliseconds: number;
    /** The total number of seconds of the instance. */
    totalSeconds: number;
    /** The second part of the instance. */
    seconds: number;
    /** The total number of minutes of the instance. */
    totalMinutes: number;
    /** The minute part of the instance. */
    minutes: number;
    /** The total number of hours of the instance. */
    totalHours: number;
    /** The hour part of the instance. */
    hours: number;
    /** The day part of the instance. */
    days: number;
}

/**
 * Represents an object with methods to show and hide a Spotfire tooltip.
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
