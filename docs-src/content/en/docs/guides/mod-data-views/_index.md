---
title: "Mod Data Views"
linkTitle: "Mod Data Views"
weight: 4
description: >
  This document gives an introduction to the mod data views.
---

## Data view definition ##

A mod can create a single aggregated data view.

The data view is declared in the mod manifest. Its contents is specified as a number of axes. The Spotfire UI will provide controls to set actual columns/expressions used to build the data view in runtime.

In the simplest form, the data view definition part of a mod manifest could look like this.

    "dataViewDefinition": {  
        "axes": [  
            {
                "name": "Y",  
                "mode": "continuous" 
            }  
        ]  
    }

This specifies that the mod will have a single continuous axis called Y, that will compute a single aggregated value, e.g. Sum(Sales). Continuous axes are typically rendered on a continuous scale.

<!-- ![Bar Chart 1](BarChart1.png) -->
<img src="BarChart1.PNG">

The "mode" parameter can be "continuous", "categorical" or "dual". Dual means that the axis supports both continuous and categorical mode and can be switched between them.

A categorical axis always splits the aggregation. The columns/expressions on the axes are used in the group by clause in the aggregated query generated for the visualization. Categorical axes are typically rendered on a categorical, or discrete, scale.

If we continue the example above we could add a categorical x axis to the visualization.

    "dataViewDefinition": {  
        "axes": [  
            {
                "name": "X",  
                "mode": "categorical",  
            },
            {
                "name": "Y",  
                "mode": "continuous",  
            }
        ]  
    }

That could be rendered like this:

<!-- ![Bar Chart 2](BarChart2.png) -->
<img src="BarChart2.PNG">

It is always possible to add more columns to the expression on a categorical axis. This will split the aggregation further, and Spotfire usually renders this as a hierarchy.

<!-- ![Bar Chart 3](BarChart3.png) -->
<img src="BarChart3.PNG">

## Consuming data from JavaScript ##

### The data view object ###

On the javascript side data is retrieved via a [DataView] object. The data view has methods for retrieving data rows and information about the current axes that has data mapped to them. The methods on the data view are asynchronous so you need to await their result.

To retrieve the value for an axis in a data row, there is a [get][DataViewRow-get] method that takes the axis name as argument. So to get the value for a "Y" axis you would do the following:

    let yValue = row.get("Y");

The value retrieved by the get method can be of two types depending on the mode of the axes. Either it is a [DataViewContinuousValue], or it is a [DataViewCategoricalValue]. Both these types have a **getValue** function, so to list all values of a data view in csv like format, you could do this:

    async function logDataView(dataView)
    {
        // Print axes names
        const axes = await dataView.getAxes();
        console.log(axes.map(axis => axis.name).join(","));
       
        // Print the row values.
        const rows = await dataView.getAllRows();
        rows.forEach(row => {
            console.log(axes.map(axis => row.get(axis.name).getValue()).join(","));
        });
    }

For the simple bar chart above showing sales per fruit, the output would be:

    X,Y
    Apples,16000
    Oranges,31000 

### DataViewContinuousValue and DataViewCategoricalValue ###

A [DataViewContinuousValue] is a simple object with methods to retrieve the actual value ([getValue][DataViewContinuousValue-getValue]), check it's validity ([isValid][DataViewContinuousValue-isValid]), and to get a string representation of it ([getFormattedValue][DataViewContinuousValue-getFormattedValue]).

A [DataViewCategoricalValue] on the other hand is a bit more complicated. Since categorical axes form hierarchies, each [DataViewCategoricalValue] is made up from parts describing the path in the hierarchy. However, a Mod developer may choose to ignore this and treat the whole path as a single value as seen in the simple code example above. The [getValue][DataViewCategoricalValue-getValue] function returns a string for the whole path in this case. For the third bar chart example above, the output from the logDataView function would be:

    X,Y
    Apples >> Spain,2500
    Apples >> USA,13500
    Oranges >> Spain,12000
    Oranges >> USA,19000

If, on the other hand, you want to access all parts of the path this can be done via the [path][DataViewCategoricalValue-path] property that returns an array of [CategoricalValuePathElement] objects. There is also a [leafIndex][DataViewCategoricalValue-leafIndex] property, which is the index of this value among the leaves in the hierarchy generated for the axis. This leads us to the next subject.

### Hierarchies ###

Another way to access the data in the data view is to go via hierarchies. These are represented by [DataViewHierarchy] objects that can be retrieved for all categorical axes. Either via the [hierarchy][DataViewCategoricalAxis-hierarchy] property on the axis you get via getAxis, or via the [getHierarchy][DataView-getHierarchy] function on the data view.

The hierarchy is tree structure with some metadata about the levels, and methods to retrieve the root of the tree ([root][DataViewHierarchy-root]), or the array of leaf nodes ([leaves][DataViewHierarchy-leaves]). If you care about the hierarchical structure, you would traverse from the root. If not, you would just use the leaves.

Each node in the tree can be mapped to rows in the data view. The following sample shows show how to traverse the data view for a bar chart above from the x hierarchy:

    async function logViaHierarchy(dataView)
    {
        const xHierarchy = await dataView.getHierarchy("X", true);
        const root = await xHierarchy.root();
        log(root, "");

        function log(node, indent) {
            console.log(indent + node.name);
            indent += "    ";
            if(node.children) {
                node.children.forEach(node => log(node, indent));
            } 
            else {
                node.rows().forEach(row => console.log(indent + row.get("Y").getValue()))
            }
        }
    }

This would produce the following output (the root has no name):

    Apples
         Spain
             2500
         USA
             13500
     Oranges
         Spain
             12000
         USA
             19000

## Using the Spotfire color axis ##

Mods can use the same color axis as is used by the native Spotfire visualizations. You do this by specifying a "colorAxis" entry in the data view definition section of the manifest:

    "dataViewDefinition": {
        "colorAxis": {
            "mode": "dual"
        }

The "mode" and other properties for the color axis are specified the same way as for other axes.

On the Javascript side you access the data values for the color axis by referring to it by its name, "Color".
The actual color computed for each row can be retrieved via the [getColor][DataViewRow-getColor] function on a row. It returns an object with the color hexcode.

## Specifying data types for continuous axis ##

Categorical axes basically treats all data types the same way. The data is ordered and its string representation is used.
For continuous axis it is possible to specify what data types should be supported. By default, they allow only numeric data. You may also choose to allow date and time data by specifying it in the manifest, in the axis section.

    "dataTypes": {
        "allowDateTime": true,
        "allowNumeric": true
    }

## Using multiple measures on continuous axes ##

By default you can only have a single measure on a continuous axis. However Spotfire allows having one axis with multiple measures on it. To turn this on, you set the "allowMultipleMeasures" flag to true for the axis in the manifest.

When an axis has multiple measures, Spotfire will place each measure on its own row in the data view. This also requires the special "(Column Names)" expression, [Axis.Default.Names] in the expression language, to be used on a categorical axis in the visualization.


## Using non-aggregating expressions on a continuous axes ##

Mod data views are always aggregated, and by default the expressions used on them must be aggregating. To enable non-aggregating expressions, you can set the "allowNonAggregatingMeasures" flag to true for the axis in the manifest. The Spotire UIs will then add a (None) option to the aggregation methods. Note that the data view is still aggregated, so the values on the axes will be used to group by in the aggregation.

## Data view sort order ##

By default, the rows in data views are ordered by the categorical axes (or more specifically by the axes that are used to group by when performing the aggregation), in the order in which they are declared. So for instance if you declare a "Column" axis followed by a "Row" axis, the data view will first be sorted by the values on the "Column" axis and then by the "Row" axis.

The color axis is currently always last.


[DataView]: /documentation/interfaces/dataview.html
[DataView-getHierarchy]: /documentation/interfaces/dataview.html#gethierarchy
[DataViewRow-get]: /documentation/interfaces/dataviewrow.html#get
[DataViewRow-getColor]: /documentation/interfaces/dataviewrow.html#getcolor
[DataViewContinuousValue-getValue]: /documentation/interfaces/dataviewcontinuousvalue.html#getvalue
[DataViewContinuousValue-isValid]: /documentation/interfaces/dataviewcontinuousvalue.html#isvalid
[DataViewContinuousValue-getFormattedValue]: /documentation/interfaces/dataviewcontinuousvalue.html#getformattedvalue
[DataViewContinuousValue]: /documentation/interfaces/dataviewcontinuousvalue.html
[DataViewCategoricalValue]: /documentation/interfaces/dataviewcategoricalvalue.html
[DataViewCategoricalValue-path]: /documentation/interfaces/dataviewcategoricalvalue.html#path
[DataViewCategoricalValue-getValue]: /documentation/interfaces/dataviewcategoricalvalue.html#getvalue
[DataViewCategoricalValue-leafIndex]: /documentation/interfaces/dataviewcategoricalvalue.html#leafindex
[CategoricalValuePathElement]: /documentation/interfaces/categoricalvaluepathelement.html
[DataViewHierarchy]: /documentation/interfaces/dataviewhierarchy.html
[DataViewHierarchy-root]: /documentation/interfaces/dataviewhierarchy.html#root
[DataViewHierarchy-leaves]: /documentation/interfaces/dataviewhierarchy.html#leaves
[DataViewCategoricalAxis]: /documentation/interfaces/dataviewcategoricalaxis.html
[DataViewCategoricalAxis-hierarchy]: /documentation/interfaces/dataviewcategoricalaxis.html#hierarchy
