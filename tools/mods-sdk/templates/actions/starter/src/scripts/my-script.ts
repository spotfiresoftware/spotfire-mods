import { addExclamationMark } from "../utils/utils";

/**
 * The entry point of a script. This function will be passed the parameters
 * specified in the manifest.
 */
function myScript({ document, application, message: _message }: MyScriptParameters) {
    const message = addExclamationMark(_message);
    console.log(message);
}

// Registers the entry point such that Spotfire can invoke it in cases where
// the name has been minified or moved into a local scope.
RegisterEntryPoint(myScript);
