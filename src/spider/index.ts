// tslint:disable-next-line: ordered-imports
import { StaticCommon as utils } from "elmer-common";
import { BaseBuilder } from "elmer-ui-core/lib/builder";
import "elmer-ui-core/lib/profil/string.profill";
import log from "../server/Log";
import { ReadJSONFromFile } from "../server/static";
import SpiderCore from "./core";
import { getArgv, getFolder } from "./node";
import YeilieWangConfig from "./ylw.config";
// tslint:disable-next-line: no-var-requires
const path = require("path");
// tslint:disable-next-line: no-var-requires
const fs = require("fs");

const mode = getArgv("mode");
const configFile:string = <string>getArgv("-config");
const output = <string>getArgv("-output");
const configJSON = ReadJSONFromFile(configFile);
try {
    // --- config checking
    const outFileName = path.resolve(path.resolve(__dirname, "../../"), output);
    const outFolder = getFolder(outFileName);
    const bBuilder = new BaseBuilder(fs);
    if(utils.isEmpty(output)) {
        throw new Error("输出文件未设置!");
    }
    if(!bBuilder.isExists(outFolder)) {
        fs.mkdirSync(outFolder);
    }
    // --- config checking end
    if(mode === "default") {
        const spider = new SpiderCore(YeilieWangConfig);
        spider.output = outFileName;
        spider.start();
    } else {
        if(utils.isEmpty(configJSON)) {
            throw new Error("爬虫数据规则配置文件不存在。");
        } else {
            // tslint:disable-next-line: no-console
            console.log("Start spider");
        }
    }
} catch (e) {
    log(e.message, "ERROR");
}
