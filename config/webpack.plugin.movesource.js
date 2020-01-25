require("colors");
const path = require("path");
const fs = require("fs");

function WebpackPluginMoveSource(options) {
    var dOptions = {
        configFileName: path.resolve(__dirname, "../public/appSource.json"),
        srcPath: path.resolve(__dirname, "../dist"),
        desPath: path.resolve(__dirname, "../public/static"),
        ignore: [/^server/i]
    };
    if(options) {
        for(var key in options) {
            dOptions[key] = options[key];
        }
    }
    this.options = dOptions;
}
WebpackPluginMoveSource.prototype.moveSource = function(fileInfo) {
    let srcPath = this.options.srcPath;
    let desPath = this.options.desPath;
    let filePath = fileInfo.path;
    let desCopyPath = "";
    let desFileName = "";
    filePath = filePath.replace(/\\/g, "/");
    srcPath = srcPath.replace(/\\/g, "/");
    desPath = desPath.replace(/\\/g, "/");
    desCopyPath = filePath.replace(srcPath, "").replace(/^\//, "./");
    desCopyPath = path.resolve(desPath, desCopyPath);
    desFileName = path.resolve(desCopyPath, fileInfo.name);
    if(!fs.existsSync(desCopyPath)) {
        // create folder when the destination folder structure not same as source folder
        fs.mkdirSync(desCopyPath);
    }
    if(fs.existsSync(desFileName)) {
        // delete the file from destination folder when the name same as the copy file;
        fs.unlinkSync(desFileName);
    }
    fs.copyFileSync(fileInfo.fileName, desFileName);
    console.log(`[Copy][Moved] ${fileInfo.fileName}`.green);
}
WebpackPluginMoveSource.prototype.getIgnoreChunks = function(allChunks) {
    const ignoreData = this.options.ignore || [];
    const ignoreChunks = [];
    if(allChunks.length>0) { // 查找过滤条件符合的chunk
        allChunks.map((checkChunk) => {
            const chunkName = checkChunk.name;
            for(let i=0;i<ignoreData.length;i++) {
                const ignoreRule = ignoreData[i];
                const ignoreRuleType = Object.prototype.toString.call(ignoreRule);
                if(ignoreRuleType === "[object RegExp]") {
                    if(ignoreRule.test(chunkName)) {
                        ignoreChunks.push(checkChunk);
                        break;
                    }
                } else if(ignoreRuleType === "[object String]") {
                    if(ignoreRule === chunkName) {
                        ignoreChunks.push(checkChunk);
                        break;
                    }
                }
            }
        })
    }
    return ignoreChunks;
};
WebpackPluginMoveSource.prototype.InIgnoreList = function(ignoreChunks, checkFileName) {
    const ignoreChunkList = ignoreChunks || [];
    const srcPath = this.options.srcPath;
    const ignoreData = this.options.ignore || [];
    // find out the module that module information and ignore rule has matched
    for(let i=0;i<ignoreChunkList.length;i++) {
        const checkChunk = ignoreChunkList[i];
        const checkFileList = checkChunk.files || [];
        if(checkFileList.length > 0) {
            for(let j=0;j<checkFileList.length;j++) {
                const ignoreFile = checkFileList[j];
                const lIgnoreFile = path.resolve(srcPath, ignoreFile);
                if(lIgnoreFile === checkFileName) {
                    return true;
                }
            }
        }
    }
    // 重新使用ignore规则检查 范围更广
    for(let z=0;z<ignoreData.length;z++) {
        const ignoreRule = ignoreData[z];
        const ignoreRuleType = Object.prototype.toString.call(ignoreRule);
        if(ignoreRuleType === "[object RegExp]") {
            if(ignoreRule.test(checkFileName)) {
                return true;
            }
        } else if(ignoreRuleType === "[object String]") {
            if(path.resolve(srcPath, ignoreRule) === checkFileName) {
                return true;
            }
        }
    }
    return false;
}
WebpackPluginMoveSource.prototype.scanDir = function(searchPath, fn) {
    const list = fs.readdirSync(searchPath);
    if(list && list.length>0) {
        list.map((tmpPath) => {
            const lPath = path.resolve(searchPath, tmpPath);
            const lstat = fs.lstatSync(lPath);
            if(lstat.isDirectory()) {
                this.scanDir(lPath, fn);
            } else {
                typeof fn === "function" && fn({
                    path: searchPath,
                    fileName: lPath,
                    name: tmpPath
                });
            }
        })
    }
}
WebpackPluginMoveSource.prototype.apply = function(compiler) {
    const self = this;
    const allChunks = [];
    compiler.plugin("done", function(stats) {
        console.log("[Copy] " + self.options.srcPath);
        const desPath = self.options.desPath;
        const srcPath = self.options.srcPath;
        let ignoreChunks = [];
        if(fs.existsSync(desPath) && fs.existsSync(srcPath)) {
            // delete target folder, make sure the target folder is clean;
            fs.rmdirSync(desPath, {
                recursive: true
            });
            
            ignoreChunks = self.getIgnoreChunks(allChunks);
            self.scanDir(srcPath, (resp) => {
                if(!self.InIgnoreList(ignoreChunks, resp.fileName)){
                    self.moveSource(resp);
                } else {
                    console.log(`[Copy][Ignore] ${resp.fileName}`.yellow);
                }
            });
            console.log("[Copy] Write source list to project resource config.".blue);
            const configData = {
                cssList: [],
                jsList: [],
                path: desPath
            };
            allChunks.map((myChunk) => {
                let isIgnore = false;
                for(let i = 0;i<ignoreChunks.length; i++) {
                    const iChunk = ignoreChunks[i];
                    if(iChunk.name === myChunk.name) {
                        isIgnore = true;
                        break;
                    }
                }
                if(!isIgnore) {
                    // add timestamp notice browser file was update
                    let time = (new Date()).getTime();
                    let myFileList = myChunk.files || [];
                    myFileList.map((myFileName) => {
                        if(/\.js$/.test(myFileName)) {
                            configData.jsList.push(myFileName + "?timestamp=" + time);
                        } else if(/\.css$/i.test(myFileName)) {
                            configData.cssList.push(myFileName  + "?timestamp=" + time);
                        }
                    });
                }
            });
            fs.writeFileSync(self.options.configFileName, JSON.stringify(configData, null, 4), "utf8");
            console.log("[Copy] Create resource file success!".bgGreen);
        } else {
            console.log("[Copy][srcPath] ", srcPath);
            console.log("[Copy][desPath] ", desPath);
            console.error("The srcPath or desPath is dose't exists, Please check the path attribute of the plugin options parameter.".red);
        }
        console.log("[Copy] done!!!".bgYellow);
    });
    compiler.plugin("emit", function(compliation, callback) {
        compliation.chunks.map((chunkItem) => {
            allChunks.push({
                hash: chunkItem.hash,
                name: chunkItem.name,
                files: JSON.parse(JSON.stringify(chunkItem.files))
            });
        });
        callback();
    });
};

module.exports = WebpackPluginMoveSource;