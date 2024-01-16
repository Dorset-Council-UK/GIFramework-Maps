const path = require('path');
const { merge } = require("webpack-merge");
const common = require("./webpack.common.js");

const prodConfig = {
    mode: 'production',
    devtool: 'hidden-source-map',
    /*hints disabled due to bundle size
     *ongoing issue to reduce bundle size/split
     * https://github.com/Dorset-Council-UK/GIFramework-Maps/issues/42*/
    performance: {
        hints: false
    }
};

module.exports = [merge(common.mapBundle, prodConfig), merge(common.managementBundle, prodConfig), merge(common.themeSwitcherBundle, prodConfig)]