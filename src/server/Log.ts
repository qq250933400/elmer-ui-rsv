type TypeLogLevel = "INFO" | "WARN" | "ERROR" | "DEBUG" | "PASS";

export type TypeLog = (msg: string, level?: TypeLogLevel) => {};

export default (msg: string, level?: TypeLogLevel):void => {
    const lStr = ["[", (new Date()).format("YYYY-MM-DD H:i:s"), "] ", msg].join("");
    // tslint:disable no-console
    switch(level) {
        case "INFO": {
            console.log(lStr.white);
            break;
        }
        case "DEBUG": {
            console.log(lStr.blue);
            break;
        }
        case "WARN": {
            console.log(lStr.yellow);
            break;
        }
        case "ERROR": {
            console.log(lStr.red);
            break;
        }
        case "PASS": {
            console.log(lStr.green);
            break;
        }
        default:
            console.log(lStr.white);
    }
};
