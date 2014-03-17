#!/usr/bin/env node

var _USAGE = "\n\
    Usage:\n\
        node bin/Watch.js [--help]\n\
                          [--verbose]\n\
                          [--action script]\n\
                          [--delay n]\n\
                          watch-target-file [watch-target-file ...]\n\
";

var _CONSOLE_COLOR = {
        RED:    "\u001b[31m",
        YELLOW: "\u001b[33m",
        CLEAR:  "\u001b[0m"
    };

var fs      = require("fs");
var Watch   = require("../lib/Watch");
var Process = require("child_process");
var argv    = process.argv.slice(2);
var options = _parseCommandLineOptions(argv, {
        help:   false,               // show help
        paths:  [],                  // WatchTargetPathStringArray: [dir, file, ...]
        delay:  1000,                // delay time (unit ms)
        action: "",                  // npm run {{action}}
        verbose: false,              // verbose
        ignoreDir: [".watchignore"]  // ignore dir name
    });

if (options.help) {
    console.log(_CONSOLE_COLOR.YELLOW + _USAGE + _CONSOLE_COLOR.CLEAR);
    return;
}

Watch(options.paths, {
    "delay":     options.delay,
    "action":    options.action,
    "verbose":   options.verbose,
    "ignoreDir": options.ignoreDir
}, function(err) { // @arg Error:
    if (!err) {
        var command = "npm run " + options.action;

        Process.exec(command, function(err, stdout, stderr) {
                        console.log(_CONSOLE_COLOR.YELLOW + "    command  " + _CONSOLE_COLOR.CLEAR + command);
                     });
    }
});

function _parseCommandLineOptions(argv, options) {
    for (var i = 0, iz = argv.length; i < iz; ++i) {
        switch (argv[i]) {
        case "-h":
        case "--help":
            options.help = true;
            break;
        case "-v":
        case "--verbose":
            options.verbose = true;
            break;
        case "--delay":
            options.delay = argv[++i];
            break;
        case "--action":
            options.action = argv[++i];
            break;
        default:
            if (Watch.isFile(argv[i])) {
                options.paths.push(argv[i]);
            } else if (Watch.isDir(argv[i])) {
                options.paths.push(argv[i].replace(/\/+$/, "") + "/");
            } else {
                console.log(_CONSOLE_COLOR.RED + "invalid path: " + argv[i] + _CONSOLE_COLOR.CLEAR);
            }
        }
    }
    return options;
}

