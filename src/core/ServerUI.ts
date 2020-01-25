import { Common } from "elmer-common";
import { defineGlobalState, getGlobalState } from "elmer-ui-core";
import { TypeConfigSourceContent, TypeStartServerOptions } from "../paramTypes";
import { ReadJSONFromFile, ReadTextFromFile, TypeLocationInformation } from "../server/static";
import { ServerRender } from "./ServerRender";
// tslint:disable: no-var-requires
const path = require("path");
const fs = require("fs");
// tslint:enable: no-var-requires

export type TypeServerUIConfig = {
    title?: string;
    template?: string;
    styles?: string[];
    scripts?: string[];
    copyRight?: string;
    description?: string;
};

export class ServerUI extends Common {
    constructor() {
        super();
        if(!getGlobalState("RenderInServer")) {
            defineGlobalState​​("RenderInServer", true);
        }
    }
    render(htmlCode: string, owner: any, storeRender?:any, location?: TypeLocationInformation): string {
        try {
            const config = this.getConfig();
            const templateCode = this.getTemplate(config, location);
            const renderComponent = owner || {};
            const render = new ServerRender({
                renderComponent,
                lineBeginSpaceLength: 0
            });
            const configOptions:TypeStartServerOptions = global["startOptions"];
            let renderHtmlCode = htmlCode;
            if(configOptions.htmlCodeFromFile) {
                renderHtmlCode = ReadTextFromFile(htmlCode);
            }
            renderComponent.render = ((code)=> {
                return () => {
                    if(this.isEmpty(code) && !this.isEmpty(configOptions.htmlCode)) {
                        return configOptions.htmlCode;
                    } else {
                        return code;
                    }
                };
            })(renderHtmlCode);
            this.extend(renderComponent, {
                location: global["location"]
            });
            const applicationCode = render.render();
            const result = templateCode.replace(/\{\{\s*application\s*\}\}/, applicationCode);
            // tslint:disable-next-line: no-parameter-reassignment
            storeRender = render;
            return result;
        } catch(e) {
            // tslint:disable-next-line: no-console
            console.error(e);
            throw e;
        }
    }
    getConfig():TypeServerUIConfig {
        const sourceConfig = this.getSourceFromBuildConfig();
        const configFile = path.resolve(__dirname, "../../package.json");
        let result:TypeServerUIConfig = {};
        if(fs.existsSync(configFile)) {
            const ct = fs.readFileSync(configFile, "utf8");
            const ctData = JSON.parse(ct);
            result = ctData.resource || {};
        }
        if(sourceConfig) {
            result.styles = [
                ...(result.styles || []),
                ...(sourceConfig.cssList || [])
            ];
            result.scripts = [
                ...(result.scripts || []),
                ...(sourceConfig.jsList || [])
            ];
        }
        return result;
    }
    getTemplate(config:TypeServerUIConfig, location?: TypeLocationInformation): string | undefined | null {
        const fileName = config.template;
        let htmlCode:string;
        const initScriptCode = this.getInitScripts(location);
        if(fs.existsSync(fileName)) {
            htmlCode = fs.readFileSync(fileName, "utf8");
            htmlCode = htmlCode.replace(/\{\{\s*title\s*\}\}/, config.title || "");
            htmlCode = htmlCode.replace(/\{\{\s*description\s*\}\}/, config.description || "");
            htmlCode = htmlCode.replace(/\{\{\s*copyRight\s*\}\}/, config.copyRight || "");
            if(config.styles && config.styles.length > 0) {
                const styleList = [];
                config.styles.map((tmpStyleLink: string) => {
                    styleList.push(`<link rel="stylesheet"  href="${tmpStyleLink}" />`);
                });
                htmlCode = htmlCode.replace(/\{\{\s*styles\s*\}\}/, styleList.join("\r\n"));
            } else {
                htmlCode = htmlCode.replace(/\{\{\s*styles\s*\}\}/, "");
            }
            if(config.scripts && config.scripts.length > 0) {
                const scriptList = [];
                config.scripts.map((scriptLink: string) => {
                    scriptList.push(`<script type="text/javascript" src="${scriptLink}"></script>`);
                });
                htmlCode = htmlCode.replace(/\{\{\s*scripts\s*\}\}/, scriptList.join("\r\n") + "\r\n" + initScriptCode);
            } else {
                htmlCode = htmlCode.replace(/\{\{\s*scripts\s*\}\}/, initScriptCode);
            }
            return htmlCode;
        }
        return htmlCode;
    }
    getInitScripts(location?: TypeLocationInformation): string {
        let htmlCode:string = global["RouterHtmlCode"] || "<h5>No data found</h5>";
        const options:TypeStartServerOptions = global["startOptions"] || {
            htmlCode: "",
            rootId: "app"
        };
        const config:TypeStartServerOptions = {
            htmlCode: "<h5>No data found</h5>",
            rootId: "app",
            config: {}
        };
        this.extend(config, options);
        if(config.htmlCodeFromFile) {
            htmlCode = ReadTextFromFile(config.htmlCode);
        }
        return `<script>\r\n
            var rsvHtmlCode = ${JSON.stringify(htmlCode)};
            var onloadEvent = function() {
                var ui = elmerData.getUI();
                var appDom = document.getElementById("${config.rootId}");
                ui.render(appDom, rsvHtmlCode, {
                    location: ${JSON.stringify(location)}
                }, {
                    isRSV: true
                });
            };
            if(window.addEventListener) {
                window.addEventListener("load", onloadEvent);
            } else {
                window.attachEvent("onload", onloadEvent);
            }
        </script>`;
    }
    getSourceFromBuildConfig(): TypeConfigSourceContent | undefined {
        const config:TypeStartServerOptions = global["startOptions"];
        let sourceData:TypeConfigSourceContent;
        if(config && config.config && !this.isEmpty(config.config.source)) {
            if(fs.existsSync(config.config.source)) {
                sourceData = ReadJSONFromFile<TypeConfigSourceContent>(config.config.source);
                let rootPath = path.resolve(__dirname, "../../").replace(/\\/g, "/");
                let sourcePath = sourceData.path.replace(/\\/g, "/");
                let staticPath = sourcePath.replace(rootPath, "");
                if(sourceData.cssList && sourceData.cssList.length>0) {
                    for(let i=0;i<sourceData.cssList.length;i++) {
                        sourceData.cssList[i] = staticPath + "/" + sourceData.cssList[i];
                    }
                }
                if(sourceData.jsList && sourceData.jsList.length>0) {
                    for(let i=0;i<sourceData.jsList.length;i++) {
                        sourceData.jsList[i] = staticPath + "/" + sourceData.jsList[i];
                    }
                }
                rootPath = null;
                staticPath = null;
                sourcePath = null;
            }
        }
        return sourceData;
    }
}
