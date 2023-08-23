const { series, parallel } = require('gulp');
const { exec } = require('child_process');
const once = require('once')
const { executer } = require('../executer')

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

const startTask = task('start')
const compileTask = task('compile')
const serverTask = task('server')

task('start', () => series(compileTask(), serverTask()))

task('compile', () => (cb) => {
    const cmd = [
        "docker", "build", 
        ".",
        "--tag", "ejabberd-config",
    ]
    executer(cmd, cb)
});

task('server', () => (cb) => {
    const cmd = [
        "docker", "run",
        "--name", "ejabberd",
        "--rm",
        "-p", "5222:5222",
        "-p", "5280:5280",
        "ejabberd-config",
    ];
    executer(cmd, cb)
});

exports.compile = compileTask();
exports.start = startTask();
exports.server = serverTask();
