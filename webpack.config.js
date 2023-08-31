const webpack = require('webpack');
const path = require('path');

module.exports = (env, argv) => {
    const mode = argv.mode;
    const isDev = mode === 'development';
    return {
        devtool: !isDev ? 'source-map' : 'cheap-source-map',

        resolve: {
            extensions: ['.ts', '.tsx', '.js', '.json'],
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
            },
            alias: {
                'parselinks': path.resolve(__dirname, './src/js/libraries/parselinks.js'),
                'resampler': path.resolve(__dirname, './src/js/libraries/resampler.js'),
                'templates': path.resolve(__dirname, './src/js/templates.js')
            },
        },

        context: path.join(__dirname, './src/ts'),

        entry: {
            'app': './app.ts',
            'login': './login.ts',
            'logout': './logout.ts',
        },

        output: {
            path: path.join(__dirname, 'public', 'js'),
            filename: '[name].js',
            chunkFilename: '[name].js'
        },

        target: 'web',

        stats: {
            colors: true,
            reasons: true,
        },

        plugins: [
            new webpack.ProvidePlugin({
                _: 'underscore',
                $: 'jquery',
                jQuery: 'jquery',
                Buffer: ['buffer', 'Buffer'],
                jQueryOem: path.join(__dirname, './src/js/libraries/jquery.oembed.js'),
            }),
            new webpack.LoaderOptionsPlugin({
                debug: true
            }),
        ],

        mode: mode,

        optimization: {
            minimize: !isDev,
            nodeEnv: mode,
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
                        {
                            loader: 'ts-loader',
                            options: {
                                configFile: path.join(__dirname, './tsconfig.json'),
                                // transpileOnly: true
                            },
                        },
                    ],
                },
                {
                    test: /\.js(x?)$/,
                    exclude: /(node_modules)/,
                    use: [
                        'babel-loader',
                    ],
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
};

