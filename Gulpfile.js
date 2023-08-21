const { series, parallel, src, dest, watch } = require('gulp');
const batch = require('gulp-batch');
const concatCss = require('gulp-concat-css');
const fs = require('fs');
const jade = require('gulp-jade');
const mkdirp = require('mkdirp');
const stylus = require('gulp-stylus');
const templatizer = require('templatizer');
const gitrev = require('git-rev');
const webpack = require("webpack-stream");
const gutil = require("gulp-util");
const { exec } = require('child_process');
const once = require('once')

function getConfig() {
    const config = fs.readFileSync('./dev_config.json');
    return JSON.parse(config);
}

const tasks = {}
const task = (name, fn) => {
    if (fn) {
        tasks[name] = once(fn);
        return;
    }
    return () => {
        const t = tasks[name]()
        t.displayName = name
        return t
    }
}

const compileTask = task('compile')
const startTask = task('start')
const watchTask = task('watch')
const resourcesTask = task('resources')
const clientTask = task('client')
const webpackTask = task('webpack')
const configTask = task('config')
const manifestTask = task('manifest')
const jadeTemplatesTask = task('jadeTemplates')
const jadeViewsTask = task('jadeViews')
const jadeTask = task('jade')
const cssTask = task('css')
const concatCssTask = task('concatCss')
const stylusTask = task('stylus')
const serverTask = task('server')

task('compile', () => parallel(resourcesTask(), clientTask(), configTask(), manifestTask()));

task('start', () => (cb) => {
    const cmd = 'node ./src/server.js';
    exec(cmd, (err, stdout) => {
        if (err) {
            console.error(`Error running Docker command: ${err}`);
            cb(err);
        } else {
            console.log(`Docker command output: ${stdout}`);
            cb();
        }
    });
})

task('watch', () => (cb) => {
    watch([
        './src/**',
        '!./src/js/templates.js',
        './dev_config.json'
    ], batch(function (events, done) {
        console.log('==> Recompiling Kaiwa');
        compileTask()(done);
    }, cb));
});

task('resources', () => (cb) => {
    return src('./src/resources/**')
        .pipe(dest('./public'))
        .on('end', cb);
});

task('client', () => parallel(jadeTemplatesTask(), jadeViewsTask(), webpackTask()));

task('webpack', () => (cb) => {
    webpack(Object.assign({
            plugins: []
        }, require('./webpack.config.js')), null, function(err, stats) {
            if(err) return cb(JSON.stringify(err));
            gutil.log("[webpack]", stats.toString());
            return stats;
        })
        .pipe(dest('./public/js'))
        .on('end', cb);
});

task('config', () => (cb) => {
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

task('manifest', () => (cb) => {
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

task('jadeTemplates', () => (cb) => {
    templatizer('./src/jade/templates', './src/js/templates.js', cb);
});

task('jadeViews', () => series(cssTask(), jadeTask()));

task('jade', () => (cb) => {
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
        .pipe(dest('./public/'))
        .on('end', cb);
});

task('css', () => series(stylusTask(), concatCssTask()));

task('concatCss', () => (cb) => {
    return src([
            './build/css/*.css',
            './src/css/*.css'
        ])
        .pipe(concatCss('app.css'))
        .pipe(dest('./public/css/'))
        .on('end', cb);
});

task('stylus', () => (cb) => {
    return src('./src/stylus/client.styl')
        .pipe(stylus())
        .pipe(dest('./build/css'))
        .on('end', cb);
});

task('server', () => (cb) => {
    const config = getConfig();
    const cmd = config.server.cmd.join(' ');
    exec(cmd, (err, stdout) => {
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
exports.webpack = webpackTask();
exports.config = configTask();
exports.manifest = manifestTask();
exports.jadeTemplates = jadeTemplatesTask();
exports.jadeViews = jadeViewsTask();
exports.jade = jadeTask();
exports.css = cssTask();
exports.concatCss = concatCssTask();
exports.stylus = stylusTask();
exports.server = serverTask();
