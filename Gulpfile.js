const { series, parallel, src, dest, watch } = require('gulp');
const batch = require('gulp-batch');
const browserify = require('browserify');
const buffer = require('vinyl-buffer');
const concat = require('gulp-concat');
const concatCss = require('gulp-concat-css');
const fs = require('fs');
const jade = require('gulp-jade');
const merge = require('merge-stream');
const mkdirp = require('mkdirp');
const source = require('vinyl-source-stream');
const stylus = require('gulp-stylus');
const templatizer = require('templatizer');
const gitrev = require('git-rev');
const webpack = require("webpack-stream");
const gutil = require("gulp-util");
const { exec } = require('child_process');

function getConfig() {
    const config = fs.readFileSync('./dev_config.json');
    return JSON.parse(config);
}

function lazy(func) {
    let executed = false;
    let result;  
    return function() {
        if (!executed) {
            executed = true;
            result = func.apply(this, arguments);
        }
        return result;
    };
}

let startTask;
let compileTask;
let watchTask
let resourcesTask;
let clientTask;
let configTask;
let manifestTask;
let jadeTemplatesTask;
let jadeViewsTask;
let cssTask;
let stylusTask;
let serverTask;

compileTask = lazy(() => parallel(resourcesTask(), clientTask(), configTask(), manifestTask()));

startTask = lazy(() => (cb) => {
    const cmd = 'node ./src/server.js';
    exec(cmd, (err, stdout, stderr) => {
        if (err) {
            console.error(`Error running Docker command: ${err}`);
            cb(err);
        } else {
            console.log(`Docker command output: ${stdout}`);
            cb();
        }
    });
})

watchTask = lazy(() => () => {
    watch([
        './src/**',
        '!./src/js/templates.js',
        './dev_config.json'
    ], batch(function (events, done) {
        console.log('==> Recompiling Kaiwa');
        compile(done);
    }));
});

resourcesTask = lazy(() => () => {
    return src('./src/resources/**')
        .pipe(dest('./public'));
});

clientTask = lazy(() => parallel(jadeTemplatesTask(), jadeViewsTask(), (cb) => {
    webpack(Object.assign({
            plugins: []
        }, require('./webpack.config.js')), null, function(err, stats) {
            if(err) return cb(JSON.stringify(err));
            gutil.log("[webpack]", stats.toString());
            return stats;
        })
        .pipe(dest('./public/js'))
        .on('end', cb);
}));

configTask = lazy(() => (cb) => {
    const config = getConfig();
    gitrev.short(function (commit) {
        config.server.softwareVersion = {
            "name": config.server.name,
            "version": commit
        }
        config.server.baseUrl = config.http.baseUrl
        mkdirp('./public', function (error) {
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

manifestTask = lazy(() => (cb) => {
    const pkg = require('./package.json');
    const config = getConfig();

    fs.readFile('./src/manifest/manifest.cache', 'utf-8', function (error, content) {
        if (error) {
            cb(error);
            return;
        }

        mkdirp('./public', function (error) {
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

jadeTemplatesTask = lazy(() => (cb) => {
    templatizer('./src/jade/templates', './src/js/templates.js', cb);
});

jadeViewsTask = lazy(() => series(cssTask(), () => {
    const config = getConfig();
    return src([
        './src/jade/views/*',
        '!./src/jade/views/layout.jade'
    ])
        .pipe(jade({
            locals: {
                config: config
            }
        }))
        .pipe(dest('./public/'));
}));

cssTask = lazy(() => series(stylusTask(), () => {
    return src([
            './build/css/*.css',
            './src/css/*.css'
        ])
        .pipe(concatCss('app.css'))
        .pipe(dest('./public/css/'));
}));

stylusTask = lazy(() => () => {
    return src('./src/stylus/client.styl')
        .pipe(stylus())
        .pipe(dest('./build/css'));
});

serverTask = lazy(() => (cb) => {
    const config = getConfig();
    const cmd = config.server.cmd.join(' ');
    exec(cmd, (err, stdout, stderr) => {
        if (err) {
            console.error(`Error running Docker command: ${err}`);
            cb(err);
        } else {
            console.log(`Docker command output: ${stdout}`);
            cb();
        }
    });
});
  
exports.compile = compileTask();
exports.start = startTask();
exports.watch = watchTask();
exports.resources = resourcesTask();
exports.client = clientTask();
exports.config = configTask();
exports.manifest = manifestTask();
exports.jadeTemplates = jadeTemplatesTask();
exports.jadeViews = jadeViewsTask();
exports.css = cssTask();
exports.stylus = stylusTask();
exports.server = serverTask();
