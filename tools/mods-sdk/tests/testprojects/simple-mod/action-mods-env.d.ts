// This file is auto-generated and will be overwritten on build.
/// <reference types="@spotfire/mods-api/action-mods/api.d.ts" />

interface MyScriptParameters {
    /** The loaded {@link Spotfire.Dxp.Application.Document}. */
    document: Spotfire.Dxp.Application.Document;

    /** The current {@link Spotfire.Dxp.Application.AnalysisApplication}. */
    application: Spotfire.Dxp.Application.AnalysisApplication;

    message: string;
}

type RegisteredEntryPoints = "myScript";

/**
 * Registers the entry point in the global scope so it can be reached by Spotfire
 * in cases where the script file is bundled or minified.
 * @param name The name of the entry point, needs to match the name specified in the manifest.
 * @param f The entry point function.
 **/
declare function RegisterEntryPoint(
    name: RegisteredEntryPoints,
    f: Function
): void;

/**
 * Registers the entry point in the global scope so it can be reached by Spotfire
 * in cases where the script file is bundled or minified.
 * @param name The name of the entry point, needs to match the name specified in the manifest.
 * @param f The entry point function.
 * @deprecated The specified entry point is not registered.
 */
declare function RegisterEntryPoint(name: string, f: Function): void;
