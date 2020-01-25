const ExtractTextWebpackPlugin =  require("extract-text-webpack-plugin");
const ProgresBarPlugin = require("progress-bar-webpack-plugin");
const webpack = require("webpack");
// const copyWebpackPlugin = require("copy-webpack-plugin");
const path = require("path");
const chalk = require("chalk");
const { CleanWebpackPlugin } = require("clean-webpack-plugin");
const UglifyJSPlugin = require("uglifyjs-webpack-plugin");
const { HtmlParse } = require("elmer-virtual-dom");

const WebpackPluginMoveSource = require("./webpack.plugin.movesource");

const htmlParse = new HtmlParse();

// const babelOptions = {
//     presets: [
//         ["env", {
//             "target": {
//                 "browsers": ["last 2 version", "safari >= 7"]
//             }
//         }]
//     ]
// };

module.exports = {
    resolve: {
        extensions: [".ts", ".js", ".json"]
    },
    plugins: [
        new ExtractTextWebpackPlugin("css/style[chunkhash:8].css", {
            allChunks:false
        }),
        new webpack.DefinePlugin({
            template: function(path) {
                return require(path)
            }
        }),
        new ProgresBarPlugin({
            format: '    build [:bar]  ' + chalk.green.bold(":percent") + "(:elapsed seconds)",
            clear: true
        }),
        // new copyWebpackPlugin(["dist"], {
        //     root: path.resolve(__dirname, "../"),
        //     verbose: true,
        //     dry: false
        // }),
        new UglifyJSPlugin({
            uglifyOptions: {
                ie8: true
            }
        }),
        new CleanWebpackPlugin({
            dry: false,
            verbose: true,
            cleanStaleWebpackAssets: false,
            protectWebpackAssets: false,
            cleanOnceBeforeBuildPatterns: ["**/*", "./css","./app.js","./application.js"],
            cleanAfterEveryBuildPatterns: ["*.d.ts","./lib"]
        }),
        new WebpackPluginMoveSource()
    ],
    module: {
        rules: [
            {
                test: /\.ts$/,
                enforce: "pre",
                use: [
                    { loader: "tslint-loader" }
                ]
            }, {
                test: /\.ts(x?)$/,
                use: [
                    {
                        loader: "babel-loader",
                        // options: babelOptions
                    },{
                        loader: "ts-loader"
                    },{
                        loader: path.resolve(__dirname,"../node_modules/elmer-loader/lib/loader/TpLoader.js"),
                        options: {
                            name: "htmlParse", parse: function(htmlCode) {
                                return htmlParse.parse(htmlCode);
                            }
                        }
                    }
                ]
            }, {
                test: /\.js$/,
                use: [
                    { 
                        loader: path.resolve(__dirname,"../node_modules/elmer-loader/lib/loader/TpLoader.js"),
                        options: {
                            name: "htmlParse", parse: function(htmlCode) {
                                return htmlParse.parse(htmlCode);
                            }
                        }
                    }
                ]
            },
            {
                test:/\.css$/i,
                use: ExtractTextWebpackPlugin.extract({
                    fallback: "style-loader",
                    use: [
                        "css-loader",
                        'postcss-loader'
                    ],
                    filename: "[name][hash:8].css"
                })
            },
            {
                test: /\.less$/i,
                use: ExtractTextWebpackPlugin.extract({
                    use: [
                        "css-loader",
                        'postcss-loader',
                        'less-loader'
                    ],
                    filename: "[name][hash:8].css"
                })
            },
            {
                test: /\.(woff|woff2|ttf|eot)$/i,
                use: [
                    {
                        loader: "url-loader?limit=400&outputPath=font/&publicPath=../font/"
                    }
                ]
            },{
                test: /\.(jpg|bmp|gif|png|svg)/,
                use: [
                    {loader: 'url-loader?limit=400&outputPath=img/&publicPath=../img/'}
                ]
            },{
                test: /\.(html|htm)$/i,
                use: [
                    {
                        loader: path.resolve("./node_modules/elmer-loader/lib/loader/HtmlLoader.js"),
                        options: {
                            parse: function(source) {
                                return htmlParse.parse(source)
                            }
                        }
                    }
                ]
            }, {
                test: /\.d\.ts$/i,
                loader: "ignore-loader"
            }

        ]
    },
    mode: "production"
}