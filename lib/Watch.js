// @name: Watch.js
// @require: Sort.js

(function(global) {

// --- variable --------------------------------------------
var _inNode = "process" in global;
var fs      = require("fs");
var Sort    = require("../node_modules/uupaa.sort.js/lib/Sort");

// --- define ----------------------------------------------
// console color
var _YELLOW = "\u001b[33m";
var _CLR    = "\u001b[0m";

// --- interface -------------------------------------------
function Watch(paths,      // @arg PathArray:
               options,    // @arg Object: { action, verbose, ... }
               callback) { // @arg Function: callback(err:Error):void
                           // @help: Watch
//{@assert
    _if(!Array.isArray(paths),  "invalid Watch(paths)");
    _if(!_isObject(options),    "invalid Watch(,options)");
    _if(!_isFunction(callback), "invalid Watch(,,callback)");
//}@assert

    this._options = options || {};

    if (this._options.verbose) {
        console.log("  --- watch ---");
    }
    paths.forEach(function(path) {
        if (Watch_isFile(path)) {
            Watch_file(path, function(diff) { // { path: { dir, size, mtime }, ... }
                callback(null, diff);
            });
        } else if (Watch_isDir(path)) {
            Watch_dir(path, function(diff) { // { path: { dir, size, mtime }, ... }
                callback(null, diff);
            }, options);
        }
    });
}
Watch["name"] = "Watch";
Watch["repository"] = "https://github.com/uupaa/Watch.js";

//Watch.dir     = Watch_dir;      // Watch.dir(dir:String, fn:Function, options:Object):void
//Watch.scanDir = Watch_scanDir;  // Watch.scanDir(dir:String, options:Object):Object
Watch.isFile = Watch_isFile;
Watch.isDir  = Watch.isDir;

// --- implement -------------------------------------------
function Watch_file(watchFilePath, // @arg String: watch file path
                    callback) {    // @arg Function: callback(null):void
    var timerID = 0;

    console.log("    file    " + watchFilePath);

    fs.watchFile(watchFilePath, _watchdogCallback);

    function _watchdogCallback() {
        if (timerID) {
            clearTimeout(timerID); timerID = 0;
        }
        timerID = setTimeout(function() {
            clearTimeout(timerID); timerID = 0;

            callback(null);
        }, 1000);
    }
}

function Watch_dir(watchRoorDir, // @arg String: watch root dir
                   callback,     // @arg Function: callback(diff:Object):void
                   options) {    // @arg Object: { ... }
                                 //      diff - Object: { path: { dir, size, mtime }, ... }
    var timerID = 0;
    var keepDirTrees = Watch_scanDir(watchRoorDir, options); // { dirs, files }

    for (var path in keepDirTrees.dirs) {
        console.log("    dir     " + path);
        fs.watch(path, _watchdogCallback);
    }

    function _watchdogCallback() {
        if (timerID) {
            clearTimeout(timerID); timerID = 0;
        }

        // -> sleep(1000)
        // -> scanDir(watchRootDir)
        // -> get diff
        // -> callback(diff)
        // -> sleep...

        timerID = setTimeout(function() {
            var currentDirTrees = Watch_scanDir(watchRoorDir, options); // { dirs, files }
            var diff = _diff(currentDirTrees, keepDirTrees); // { path: { dir, size, mtime }, ... }

            keepDirTrees = currentDirTrees;

            clearTimeout(timerID); timerID = 0;

            callback(diff);
        }, 2000);
    }
}

function Watch_scanDir(scanRootDir, // @arg String: scan root dir
                       options) {   // @arg Object: { ... }
                                    // @ret Object: { dirs: {}, files: {} }
                                    //     dirs - Object: { dir:Boolean, size:Intger, mtime:Integre }
                                    //     files - Object: { dir:Boolean, size:Intger, mtime:Integre }
    var result = { dirs: {}, files: {} };
    var stat = fs.statSync(scanRootDir);
    var ignoreDir = options.ignoreDir || [];
    var found = false;

    if ( stat.isDirectory() ) {
        // found .watchignore ?
        if (ignoreDir.length) {
            found = ignoreDir.some(function(value) {
                        return Watch_isFile(scanRootDir + value);
                    });
        }
        if (found) {
            // ignore dir
        } else {
            result.dirs[scanRootDir] = {
                dir:   true,
                size:  stat.size,
                mtime: +stat.mtime
            };
            _readDir(result, scanRootDir, options);
        }
    }
    return result;
}

function _readDir(result,    // @arg Object: { dirs: {}, files: {} }
                  dir,       // @arg DirString:
                  options) { // @arg Object: { ... }
                             // @recursive:
    var fileList = fs.readdirSync(dir);
    var ignoreDir = options.ignoreDir || [];
    var ignoreFileNamePostFix = options.ignoreFileNamePostFix || [];

    Sort.nat(fileList).forEach(function(fname) {
        var path = dir + fname;
        var stat = fs.statSync(path);
        var found = false;

        if ( stat.isFile() ) {
            if (ignoreFileNamePostFix.length) {
                found = ignoreFileNamePostFix.some(function(value) {
                            return path.lastIndexOf(value) === path.length - value.length;
                        });
            }
            if (found) {
                // found *.min.js
            } else {
                result.files[path] = { dir: false, size: stat.size, mtime: +stat.mtime };
            }
        } else if ( stat.isDirectory() ) {
            path += "/";
            // found .watchignore
            if (ignoreDir.length) {
                found = ignoreDir.some(function(value) {
                            return Watch_isFile(path + value);
                        });
            }

            if (found) {
                // ignore dir
            } else {
                result.dirs[path] = { dir: true, size: stat.size, mtime: +stat.mtime };
                _readDir(result, path, options); // recursive call
            }
        }
    });
}

function Watch_isFile(path) { // @arg String
                         // @ret Boolean:
    return fs.existsSync(path) && fs.statSync(path).isFile();
}

function Watch_isDir(path) { // @arg String
                        // @ret Boolean:
    return fs.existsSync(path) && fs.statSync(path).isDirectory();
}

function _diff(curt,   // @arg Object: current dir tree. { dirs, files }
               last) { // @arg Object: last dir tree.    { dirs, files }
                       // @ret Object: diff dir tree.    { path: { dir, size, mtime }, ... }
    var result = {};

    for (var path in curt.files) {
        if ( !_match( path, curt.files[path], last.files[path] ) ) {
            result[path] = curt.files[path];
        }
    }
    return result;
}

function _match(path,
                a,    // @arg Object: { dir, size, mtime }
                b) {  // @arg Object: { dir, size, mtime }
    if (a && b) {
        if (a.dir === b.dir) {
            if (a.size === b.size) {
                if (a.mtime === b.mtime) {
                    return true;
                }
            }
        }
        console.log("    " + _YELLOW + "changed " + _CLR + path);
    }
    return false;
}

//{@assert
function _isFunction(target) {
    return target !== undefined && (typeof target === "function");
}
function _isObject(target) {
    return target && (target.constructor === ({}).constructor);
}
function _if(booleanValue, errorMessageString) {
    if (booleanValue) {
        throw new Error(errorMessageString);
    }
}
//}@assert

// --- export ----------------------------------------------
//{@node
if (_inNode) {
    module["exports"] = Watch;
}
//}@node
if (global["Watch"]) {
    global["Watch_"] = Watch; // already exsists
} else {
    global["Watch"]  = Watch;
}

})((this || 0).self || global);

