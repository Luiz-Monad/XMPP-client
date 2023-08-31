const webpack = require('webpack');
const path = require('path');
const NodePolyfillPlugin = require('node-polyfill-webpack-plugin');

module.exports = {
    devtool: 'cheap-source-map',

    resolve: {
        fallback: {
            path: require.resolve('path-browserify'),
            crypto: require.resolve('crypto-browserify'),
            os: require.resolve('os-browserify'),
            stream: require.resolve('stream-browserify'),
            fs: false,
            'mock-aws-s3': false,
            'aws-sdk': false,
            nock: false,
            util: false,
            assert: false,
            child_process: false,
        }
    },

    context: path.join(__dirname, './src/ts'),

    entry: {
        'app': './app.ts'
    },

    output: {
        path: path.join(__dirname, 'public', 'js'),
        filename: '[name].js',
        chunkFilename: '[name].js'
    },

    stats: {
        colors: true,
        reasons: true,
    },

    plugins: [
        new webpack.ProvidePlugin({
            _: 'lodash',
            $: 'jquery',
            jQuery: 'jquery',
            Buffer: ['buffer', 'Buffer'],
            jQueryOem: path.join(__dirname, './src/js/libraries/jquery.oembed.js'),
        }),
        new webpack.LoaderOptionsPlugin({
            debug: true
        }),
        new NodePolyfillPlugin(),
    ],

    optimization: {
        minimize: false,
        nodeEnv: 'development',
        splitChunks: {
            chunks: 'all',
            name(module, chunks, cacheGroupKey) {
                const allChunksNames = chunks.map((item) => item.name).join('~');
                return `${cacheGroupKey}-${allChunksNames}`;
            },
            cacheGroups: {
                '0-polyfill': {
                    test: /[\\/]node_modules[\\/]/,
                    priority: -10,
                    reuseExistingChunk: true,
                },
                '1-vendor': {
                    test: /[\\/]src[\\/]js[\\/]libraries[\\/]/,
                    priority: -20,
                    enforce: true
                },
                '2-default': {
                    test: /[\\/]src[\\/]/,
                    priority: -30,
                    enforce: true
                },
            },
        },
    },

    module: {
        rules: [
            {
                test: /\.ts(x?)$/,
                exclude: /(node_modules)/,
                use: [
                    'babel-loader',
                    'ts-loader',
                ],
            },
            {
                test: /\.js(x?)$/,
                exclude: /(node_modules)/,
                loader: 'babel-loader'
            },
            {
                test: /\.jade$/,
                exclude: /(node_modules)/,
                loader: 'pug-loader'
            },
            {
                test: /\.json$/,
                exclude: /(node_modules)/,
                loader: 'json-loader'
            }
        ]
    },

    node: {
        global: true,
    },

};
