const path = require('path');
const { merge } = require("webpack-merge");
const common = require("./webpack.common.js");

module.exports = merge(common, {
    mode: 'production',
    /*hints disabled due to bundle size
     *ongoing issue to reduce bundle size/split
     * https://github.com/Dorset-Council-UK/GIFramework-Maps/issues/42*/
    performance: {
        hints: false
    }
});