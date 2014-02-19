#!/usr/bin/env node

// Usage:
//      node Watch.js --verbose --action build path [...]

var _RED    = "\u001b[31m";
var _YELLOW = "\u001b[33m";
var _CLR    = "\u001b[0m";

var fs      = require("fs");
var Watch   = require("../lib/Watch");
var Process = require("child_process");
var argv    = process.argv.slice(2);
var options = _parseCommandLineOptions({
        paths:  [],                  // WatchTargetPathStringArray: [dir, file, ...]
        action: "",                  // npm run {{action}}
        verbose: false,              // verbose
        ignoreDir: [".watchignore"]  // ignore dir name
    });

Watch(options.paths, {
    "action":    options.action,
    "verbose":   options.verbose,
    "ignoreDir": options.ignoreDir
}, function(err) { // @arg Error:
    if (!err) {
        command = "npm run " + options.action;

        Process.exec(command, function(err, stdout, stderr) {
                        console.log(_YELLOW + "    command  " + _CLR + command);
                     });
    }
});

function _parseCommandLineOptions(options) {
    for (var i = 0, iz = argv.length; i < iz; ++i) {
        switch (argv[i]) {
        case "-v":
        case "--verbose":
            options.verbose = true;
            break;
        case "-a":
        case "--action":
            options.action = argv[++i];
            break;
        default:
            if (Watch.isFile(argv[i])) {
                options.paths.push(argv[i]);
            } else if (Watch.isDir(argv[i])) {
                options.paths.push(argv[i].replace(/\/+$/, "") + "/");
            } else {
                console.log(_RED + "invalid path: " + argv[i] + _CLR);
            }
        }
    }
    return options;
}

