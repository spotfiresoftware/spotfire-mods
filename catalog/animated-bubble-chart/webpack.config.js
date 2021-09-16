const path = require("path");
const webpack = require("webpack");
const CopyPlugin = require("copy-webpack-plugin");



module.exports = {
    mode: "development",
    entry: "./src/main.ts",
    output: {
        path: path.resolve(__dirname, "dist"),
        filename: "bundle.js"
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: "ts-loader",
                exclude: /node_modules/
            }
        ]
    },
    resolve: {
        extensions: [".tsx", ".ts", ".js"]
    },
    plugins: [new webpack.NamedModulesPlugin(), new CopyPlugin({ patterns: [{ from: "static" }] })],
    devtool: process.argv.includes("production") ? undefined : "inline-source-map"
};
