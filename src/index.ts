import "../init/global_vars";
import app from "./app";
import { TypeStartServerOptions } from "./paramTypes";
import { ReadTextFromFile } from "./server/static";

export * from "./server/static";
// tslint:disable: no-var-requires no-console

const http = require("http");

const normalizePort = (val) => {
    let portVal = val;
    if(!isNaN(val)) {
        portVal = parseInt(val, 10);
    }
    if(portVal >= 0) {
        return portVal;
    }
    return false;
};

const port = normalizePort(process.env.PORT || process.env.npm_package_env_PORT || 3000);

const onError = (error) => {
    if(error.syscall !== "listen") {
        throw error;
    }
    const bind = typeof port === "string" ? "Pipe " + port : "Port " + port;
    switch(error.code) {
        case "EACCES":
            console.error(bind + " require elevated privileges");
            process.exit(1);
            break;
        case "EADDRINUSE":
            console.error(bind + " is already in use");
            process.exit(1);
            break;
        default:
            throw error;
    }
};

export const StartServer = (options:TypeStartServerOptions): void => {
    if(!options || options.htmlCode === undefined || options.htmlCode === null || options.htmlCode.length<=0) {
        console.log(options, "Parameters");
        throw new Error("options参数必须设置htmlCode属性，htmlCode通常用于设置Router代码,代码渲染才可以正确指向正确的Page");
    }
    global["RouterHtmlCode"] = options.htmlCode;
    if(options.htmlCodeFromFile) {
        options.htmlCodeFromFile = false;
        global["RouterHtmlCode"] = ReadTextFromFile(options.htmlCode);
    }
    global["startOptions"] = options;
    const server = http.createServer(app);
    console.log("Start Listen http://localhost:" + port);
    server.listen(port);
    server.on("error", onError);
    server.on("listening", () => {
        const addr = server.address();
        const bind = typeof addr === "string" ? "Pipe " + addr : "Port " + addr.port;
        console.log("Listening on " + bind);
    });
};
global["startServer"] = StartServer;



export default StartServer;

// tslint:enable: no-var-requires no-console
