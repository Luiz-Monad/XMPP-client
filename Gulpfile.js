const { series, parallel, src, dest, watch } = require('gulp');
const batch = require('gulp-batch');
const concatCss = require('gulp-concat-css');
const fs = require('fs');
const jade = require('gulp-jade');
const { mkdirp } = require('mkdirp');
const stylus = require('gulp-stylus');
const templatizer = require('templatizer');
const gitrev = require('git-rev');
const gutil = require("gulp-util");
const once = require('once');
const { executer } = require('./executer');

function getConfig() {
    const config = fs.readFileSync('./dev_config.json');
    return JSON.parse(config);
}

const tasks = {};
const task = (name) => (fn) => {
    if (fn) {
        tasks[name] = once(fn);
        return;
    }
    const t = tasks[name]();
    t.displayName = name;
    return t
};

const startTask = task('start');
const watchTask = task('watch');
const compileTask = task('compile');
const watchRecompileTask = task('watchRecompile');
const resourcesTask = task('resources');
const clientTask = task('client');
const webpackTask = task('webpack');
const webpackWatchTask = task('webpackWatch');
const configTask = task('config');
const manifestTask = task('manifest');
const jadeTemplatesTask = task('jadeTemplates');
const jadeViewsTask = task('jadeViews');
const jadeTask = task('jade');
const cssTask = task('css');
const concatCssTask = task('concatCss');
const stylusTask = task('stylus');
const nodeRunTask = task('nodeRun');
const nodeWatchTask = task('nodeWatch');
const serverTask = task('server');

startTask(() => parallel(serverTask(), series(compileTask(), nodeRunTask())))

watchTask(() => series(parallel(watchRecompileTask(), nodeWatchTask())))

compileTask(() => parallel(resourcesTask(), clientTask(), configTask(), manifestTask()));

watchRecompileTask(() => (cb) => {
    const keepRunning = (fn) => (done) => {
        fn();
        done();
    };
    watch([
        './src/**',
        '!./src/css/client.css',
        '!./src/js/templates.js',
        './package.json',
        './dev_config.json',
        './webpack.config.js',
        './tsconfig.json',
        './babel.config.json',
    ], keepRunning(batch({}, (events, done) => {
        console.log('==> Recompiling Kaiwa');
        const cmd = ['yarn', 'run', 'gulp', 'compile'];
        executer(cmd, () => {
            console.log('==> Done!');
            done()
        });
    })));
});

resourcesTask(() => (cb) => {
    src('./src/resources/**')
        .pipe(dest('./public'))
        .on('end', cb);
});

clientTask(() => parallel(jadeTemplatesTask(), jadeViewsTask(), webpackTask()));

configTask(() => (cb) => {
    const config = getConfig();
    gitrev.short(function (commit) {
        config.server.softwareVersion = {
            "name": config.server.name,
            "version": commit,
        }
        config.server.baseUrl = config.http.baseUrl
        mkdirp('./public').then((error) => {
            if (error) {
                cb(error);
                return;
            }
            fs.writeFile(
                './public/config.js',
                'var SERVER_CONFIG = ' + JSON.stringify(config.server) + ';',
                cb);
        });
    })
});

manifestTask(() => (cb) => {
    const pkg = require('./package.json');
    const config = getConfig();

    fs.readFile('./src/manifest/manifest.cache', 'utf-8', (error, content) => {
        if (error) {
            cb(error);
            return;
        }

        mkdirp('./public').then((error) => {
            if (error) {
                cb(error);
                return;
            }

            const manifest = content.replace(
                '#{version}',
                pkg.version + config.isDev ? ' ' + Date.now() : '');
            fs.writeFile('./public/manifest.cache', manifest, cb);
        });
    });
});

jadeTemplatesTask(() => (cb) => {
    templatizer('./src/jade/templates', './src/js/templates.js', cb);
});

jadeViewsTask(() => series(cssTask(), jadeTask()));

jadeTask(() => (cb) => {
    const config = getConfig();
    src([
        './src/jade/views/*',
        '!./src/jade/views/layout.jade'
    ])
        .pipe(jade({
            locals: {
                config: config
            }
        }))
        .pipe(dest('./public/'))
        .on('end', cb);
});

cssTask(() => series(stylusTask(), concatCssTask()));

concatCssTask(() => (cb) => {
    src([
        './src/css/*.css'
    ])
        .pipe(concatCss('app.css'))
        .pipe(dest('./public/css/'))
        .on('end', cb);
});

stylusTask(() => (cb) => {
    src('./src/stylus/client.styl')
        .pipe(stylus())
        .pipe(dest('./src/css'))
        .on('end', cb);
});

nodeRunTask(() => (cb) => {
    const cmd = ['node', './src/server.js'];
    executer(cmd, cb)
})

nodeWatchTask(() => (cb) => {
    const cmd = ['node', '--watch-preserve-output', './src/server.js'];
    executer(cmd, cb)
})

serverTask(() => (cb) => {
    const config = getConfig();
    executer(config.server.cmd, cb)
});

webpackTask(() => (cb) => {
    const cmd = [
        'yarn', 'run',
        'webpack-cli',
        '--progress',
        '--mode', 'production'
    ];
    webpack = executer(cmd, cb);
})

webpackWatchTask(() => (cb) => {
    let webpack;
    const keepRunning = (fn) => (done) => {
        fn();
        done();
    };
    const start = () => {
        const cmd = [
            'yarn', 'run',
            'webpack-cli', 'watch',
            '--progress',
            '--mode', 'development'
        ];
        webpack = executer(cmd, () => {
            console.log('==> start watch done!');
        });
    };
    const stop = () => {
        if (webpack) {
            webpack.treekill();
            webpack = null;
        }
    };
    watch([
        './webpack.config.js',
        './tsconfig.json',
        './babel.config.json',
    ], keepRunning(batch({}, (events, done) => {
        console.log('==> Rewatching Kaiwa');
        stop();
        start();
        done();
    })));
    start();
})

exports.compile = compileTask();
exports.start = startTask();
exports.watch = watchTask();
exports.watchRecompile = watchRecompileTask()
exports.resources = resourcesTask();
exports.client = clientTask();
exports.webpack = webpackTask();
exports.webpackWatch = webpackWatchTask();
exports.config = configTask();
exports.manifest = manifestTask();
exports.jadeTemplates = jadeTemplatesTask();
exports.jadeViews = jadeViewsTask();
exports.jade = jadeTask();
exports.css = cssTask();
exports.concatCss = concatCssTask();
exports.stylus = stylusTask();
exports.nodeRun = nodeRunTask();
exports.nodeWatch = nodeWatchTask();
exports.server = serverTask();
