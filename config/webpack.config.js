require("../init/global_vars");
const path = require("path");
const merge = require("webpack-merge");

const common = require("./webpack.common.config");

const IncludePackages = [
    "elmer-ui-core",
    "elmer-common",
    "elmer-common-ui",
    "elmer-validation",
    "elmer-worker",
    "elmer-redux",
    "elmer-loader",
    "elmer-virtual-dom"
];

function _externals() {
    let manifest = require("../package.json");
    let dependencies = manifest.dependencies;
    let externals = {};
    for(let p in dependencies) {
        if(IncludePackages.indexOf(p)<0) {
            externals[p] = 'commonjs ' + p;
        }
    }
    return externals;
}

let externals = _externals();

module.exports = merge(common, {
    entry: {
        "ServerApp": "./src/index.ts",
        "ClientApp": "./src/client.ts"
    },
    target: "node",
    output: {
        path: path.resolve("dist"),
        // filename: "app.entry.bundle.min.js",
        chunkFilename: '[name].[id].[chunkhash:8].js',
        publicPath: "",
        globalObject: "this"
    },
    externals: externals,
    node: {
        console: true,
        global: true,
        Buffer: true,
        __filename: true,
        __dirname: true,
        setImmediate: true
    }
});
