// tslint:disable-next-line: no-var-requires
const fs = require("fs");

export type TypeLocationInformation = {
    href: string;
    hash: string;
    query: string;
    search: string;
};

export const ReadJSONFromFile = <T>(fileName:string): T => {
    let result:T;
    if(fs.existsSync(fileName)) {
        const txt = fs.readFileSync(fileName, "utf8");
        if(txt !== undefined && txt !== null && txt.length>0) {
            result = JSON.parse(txt);
        }
    }
    return result;
};

export const ReadTextFromFile = (fileName:string):string|undefined => {
    let result:string;
    if(fs.existsSync(fileName)) {
        result = fs.readFileSync(fileName, "utf8");
    }
    return result;
};

export const ReadLocationFromUrlString = (url: string) => {
    const result:TypeLocationInformation = {
        href:url,
        hash: "",
        query: "",
        search: ""
    };
    if(url !== undefined && url !== null && url.length > 0) {
        const qIndex = url.indexOf("?");
        const hIndex = url.indexOf("#");
        let qUrl = url;
        if(hIndex > 0) {
            result.hash = qUrl.substr(hIndex + 1);
            qUrl = qUrl.substr(hIndex + 1);
        }
        if(qIndex >= 0) {
            result.query = qUrl.substr(qIndex + 1);
            result.search = result.query;
        }
    }
    return result;
};
