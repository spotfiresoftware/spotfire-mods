## API Reference
[Full documentation can be found here.](./spotfire-api.md)

## Usage
The spotfire mod API can be used to create Mod visualizations in Spotfire. Mods are based on web technology and run in a sandboxed iframe.

The API is initialized by calling the `initialize` method on the globally available Spotfire object.
```javascript
Spotfire.initialize(async (api) => {
   console.log("Mod API loaded.");
});
```
When the mod is initialized, an [api](interfaces/modapi.html) object is passed as an argument.


### Reading data
Mod API methods used to read content are async.
```javascript
let read = api.reader(api.mod.data());
read(function onData(dataView) {
    console.log(dataView.getRowCount());
    read(onData);
});

```

## Use types in JavaScript files
```
/** @type {Spotfire.DataView} */
let dataView;
```

## Limitations
- Sandbox
- Ajax calls
- Origin null