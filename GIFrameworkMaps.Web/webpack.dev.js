const path = require('path');
const { merge } = require("webpack-merge");
const common = require("./webpack.common.js");

const devConfig = {
    mode: 'development',
    devtool: 'inline-source-map'
};

module.exports = [merge(common.mapBundle, devConfig), merge(common.managementBundle, devConfig), merge(common.themeSwitcherBundle, devConfig)]