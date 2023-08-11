const path = require('path');

const mapBundle = {
    entry: ['./Scripts/app.ts', './Scripts/CookieControls.ts'],
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: 'ts-loader',
                exclude: /node_modules/,
            },
        ],
    },
    resolve: {
        extensions: ['.tsx', '.ts', '.js'],
    },
    output: {
        filename: 'bundle.js',
        path: path.resolve(__dirname, 'wwwroot/js'),
        publicPath: ''
    }
};

const managementBundle =
{
    entry: {
        broadcast: './Scripts/Management/Broadcast.ts',
        selectwebservice: './Scripts/Management/SelectWebService.ts'
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: 'ts-loader',
                exclude: /node_modules/,
            },
        ],
    },
    resolve: {
        extensions: ['.tsx', '.ts', '.js'],
    },
    output: {
        filename: '[name].js',
        path: path.resolve(__dirname, 'wwwroot/js/management'),
        publicPath: ''
    }
};

module.exports = { mapBundle, managementBundle };