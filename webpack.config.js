const webpack = require('webpack');
const path = require('path');
const NodePolyfillPlugin = require('node-polyfill-webpack-plugin');
const ts = require('typescript');

const tsconfigPath = path.resolve(__dirname, 'tsconfig.json');
const tsconfig = ts.readConfigFile(tsconfigPath, ts.sys.readFile);
const tsoptions = tsconfig.config.compilerOptions;
const jsLibraries = Object.entries(tsoptions.paths);
const aliases = {};
for (const [key, value] of jsLibraries) {
    aliases[key] = path.resolve(path.posix.join(__dirname, tsoptions.baseUrl, value[0]));
}

module.exports = (env, argv) => {
    const mode = argv.mode;
    const isDev = mode === 'development';
    return {
        devtool: !isDev ? 'source-map' : 'eval-source-map', //'cheap-source-map',

        resolve: {
            extensions: ['.ts', '.tsx', '.js', '.json'],
            fallback: {
                path: require.resolve('path-browserify'),
                crypto: require.resolve('crypto-browserify'),
                os: require.resolve('os-browserify'),
                stream: require.resolve('stream-browserify'),
                fs: false,
                util: false,
                assert: false,
            },
            alias: aliases,
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
            }),
            new webpack.LoaderOptionsPlugin({
                debug: true
            }),
            new NodePolyfillPlugin(),
        ],

        mode: mode,

        optimization: {
            minimize: !isDev,
            nodeEnv: mode,
            splitChunks: {
                chunks: 'all',
                name(module, chunks, cacheGroupKey) {
                    const allChunksNames = chunks[0].name;
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
                                configFile: tsconfigPath,
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
