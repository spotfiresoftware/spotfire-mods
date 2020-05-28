const path = require("path");
const webpack = require("webpack");
const CopyPlugin = require("copy-webpack-plugin");

module.exports = {
    mode: "development",
    entry: "./src/index.js",
    output: {
        path: path.resolve(__dirname, "dist"),
        filename: "bundle.js"
    },
    plugins: [
        new webpack.NamedModulesPlugin(),
        new CopyPlugin([{ from: "static" }])
    ],
    devtool: "inline-source-map"
};
