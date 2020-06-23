import "colors";
import { Common, queueCallFunc, TypeQueueCallParam } from "elmer-common";
import { HtmlParse, IVirtualElement, VirtualElement } from "elmer-virtual-dom";
import HttpHelper, { TypeHttpResonse } from "../server/httpHelper";
import sLog from "../server/Log";
import {
    TypeSpiderAfterRequestCallbackResultData,
    TypeSpiderConfiguration,
    TypeSpiderConfigurationRule,
    TypeSpiderHttpResonseDataType
} from "./config";

// tslint:disable-next-line: no-var-requires
const fs = require("fs");

type TypeRequestLinkOptions = {
    saveDataKey?: string;
    dataType?: TypeSpiderHttpResonseDataType;
};

export default class SpiderCore extends Common {
    /**
     * 输出文件
     */
    output: string;

    private config: TypeSpiderConfiguration;
    private http: HttpHelper;
    // tslint:disable-next-line: typedef
    private log = sLog;
    private htmlParse: HtmlParse;
    private virtalDom: VirtualElement;
    private saveData: any = {};
    private outFileName: string;
    constructor(config:TypeSpiderConfiguration) {
        super();
        this.config = config;
        this.http = new HttpHelper();
        this.htmlParse = new HtmlParse();
        this.virtalDom = new VirtualElement();
    }
    /**
     * 开始爬虫任务
     */
    start(): void {
        const links: string[] = this.config.links || [];
        try {
            this.log("开始爬虫任务...", "PASS");
            if(!this.isEmpty(this.config.taskName)) {
                this.log(this.config.taskName, "DEBUG");
                this.log(this.config.description, "DEBUG");
            }
            this.createOutFileName();
            this.saveData = {};
            if(links && links.length>0) {
                const linkRParam: TypeQueueCallParam[] = [];
                links.forEach((link:string, index:number) => {
                    linkRParam.push({
                        id: "rootLinks_" + index,
                        params: {
                            link,
                            rule: {
                                test: this.config.test,
                                rules: this.config.rules,
                                isData: false,
                                isLink: false
                            }
                        }
                    });
                });
                // tslint:disable-next-line: no-floating-promises
                queueCallFunc(linkRParam, (options, param):Promise<any> => {
                    return new Promise((resolve,reject):void => {
                        this.requestLink(param.link, [param.rule], {
                            saveDataKey: ""
                        }, (success) => {
                            if(success) {
                                resolve("complete");
                            } else {
                                reject("fail");
                            }
                        });
                    });
                }).then((result:any) => {
                    // console.log(this.saveData);
                    this.log("保存数据", "PASS");
                    this.createOutput();
                    this.log("爬虫任务结束。", "PASS");
                }).catch((error) => {
                    this.log(error.message, "ERROR");
                    // tslint:disable-next-line: no-console
                    console.log(error);
                });
            } else {
                throw new Error("未发现抓取入口页面。");
            }
        } catch (e) {
            this.log(e.message, "ERROR");
            // tslint:disable-next-line: no-console
            console.log(e);
        }
    }
    /**
     * 将数据保存到spider结果，遇到重复数据更新为数组保存
     * @param saveKey 保存数据key
     * @param saveData 保存的数据
     */
    saveDataField(saveKey: string, saveData: any): void {
        try {
            if(!this.isEmpty(saveKey)) {
                const keyArr = saveKey.split(".");
                if(keyArr.length > 1) { // 多层节点保存值
                    const lKey = keyArr[keyArr.length - 1];keyArr.splice(keyArr.length - 1, 1);
                    const pKey = keyArr.join(".");
                    const pData = this.getValue(this.saveData, pKey);
                    if(pData) { // 保存节点存在
                        if(pData[lKey]) { // 保存节点已经存在
                            if(!this.isArray(pData[lKey])) { // 当保存节点不是数组时，修改为数组用于保存新数据
                                if(this.isObject(pData[lKey])) { // 存在节点是一个object对象
                                    if(Object.keys(pData[lKey]).length > 0) { // 有至少一个attribute时遍历存储为数组
                                        pData[lKey] = [
                                            ...pData[lKey]
                                        ];
                                    } else { // 一个attribute都没有即时一个空对象，直接修改为数组
                                        pData[lKey] = [];
                                    }
                                } else { // 其他非object对象数据，例如string,number,bool
                                    pData[lKey] = [pData[lKey]];
                                }
                            }
                        } else { // 节点不存在创建新节点为数组
                            pData[lKey] = [];
                        }
                        if(this.isArray(saveData)) {
                            pData[lKey].push(...saveData);
                        } else {
                            pData[lKey].push(saveData);
                        }
                    } else { // 原有节点不存在直接保存
                        this.setValue(this.saveData,saveKey, [saveData]);
                    }
                } else {
                    if(this.isEmpty(this.saveData[saveKey])) {
                        this.saveData[saveKey] = [];
                    } else {
                        if(!this.isArray(this.saveData[saveKey])) {
                            if(this.isObject(this.saveData[saveKey])) {
                                if(Object.keys(this.saveData[saveKey]).length>0) {
                                    this.saveData[saveKey] = [
                                        ...this.saveData[saveKey]
                                    ];
                                } else {
                                    this.saveData[saveKey] = []; // 节点设置为空对象的时候
                                }
                            } else {
                                this.saveData[saveKey] = [this.saveData[saveKey]];
                            }
                        }
                    }
                    if(this.isArray(saveData)) {
                        this.saveData[saveKey].push(...saveData);
                    } else {
                        this.saveData[saveKey].push(saveData);
                    }
                }
            } else {
                if(Object.keys(this.saveData).length < 0) {
                    this.saveData = [];
                } else {
                    this.saveData = [
                        ...this.saveData
                    ];
                }
                if(this.isArray(saveData)) {
                    this.saveData.push(...saveData);
                } else {
                    this.saveData.push(saveData);
                }
            }
        } catch(e) {
            this.log(e.message + ["[", saveKey, "]"].join(""), "ERROR");
        }
    }
    createOutput():void {
        this.isEmpty(this.outFileName) && this.createOutFileName();
        const saveData = JSON.stringify(this.saveData, null, 4);
        fs.writeFileSync(this.outFileName, saveData, "utf8");
    }
    private createOutFileName(): void {
        const fTypeM = this.output.match(/(\.[a-z0-9]{1,})$/i);
        const fType = fTypeM ? fTypeM[1] : "";
        const newFileName = this.output.replace(/\.[a-z0-9]{1,}$/i, (new Date()).format("YYYYMMDDHis")) + fType;
        this.outFileName = newFileName;
    }
    private matchRegExp(dom:IVirtualElement|string|number|Object,reg:RegExp):IVirtualElement[]|string {
        const result:IVirtualElement[] = [];

        if(!this.isEmpty((<IVirtualElement>dom).tagName) && (<IVirtualElement>dom).children && (<IVirtualElement>dom).children.length>0) {
            (<IVirtualElement>dom).children.forEach((item:IVirtualElement) => {
                const childrenMatch = this.matchRegExp(item, reg);
                const keys = Object.keys(item.props);
                let tagCode = `<${item.tagName} `;
                const attrList: string[] = [];
                keys.map((myKey:string) => {
                    attrList.push(`${myKey}="${JSON.stringify(item.props[myKey])}"`);
                });
                tagCode += attrList.join(" ") + ">";
                if(reg.test(tagCode)) {
                    result.push(item);
                }
                if((<IVirtualElement[]>childrenMatch).length>0) {
                    result.push(...(<IVirtualElement[]>childrenMatch));
                }
            });
        } else {
            if(reg.test(dom.toString())) {
                return dom.toString();
            }
        }
        return result;
    }
    private getSaveDataKey(...keys: any[]): string {
        let result: string;
        if(arguments.length > 0) {
            for(let i=0;i<arguments.length;i++) {
                if(!this.isEmpty(arguments[i])) {
                    if(!this.isEmpty(result)) {
                        result += "." + arguments[i];
                    } else {
                        result = arguments[i];
                    }
                }
            }
        }
        return result;
    }
    private checkSaveNode(domResult:IVirtualElement[] | string | number | object, rule: TypeSpiderConfigurationRule, parentSaveKey:string): void {
        let dataResult:any;
        if(rule.isSave  && !rule.isData) {
            if(this.isArray(domResult) && !this.isEmpty(domResult[0].tagName)) {
                dataResult = [];
                domResult.map((myItem:IVirtualElement) => {
                    let curResult:any;
                    if(this.isString(rule.dataTest)) {
                        curResult = this.virtalDom.getElementsByClassName(rule.dataTest, myItem);
                    } else if(this.isRegExp(rule.dataTest)) {
                        curResult = this.matchRegExp(myItem, rule.dataTest);
                    } else if(this.isFunction(rule.dataTest)) {
                        curResult = rule.dataTest(myItem);
                    }
                    if(!this.isEmpty(dataResult)) {
                        if(domResult.length > 1) {
                            dataResult.push(curResult);
                        } else {
                            dataResult = curResult;
                        }
                        this.setValue(this.saveData, this.getSaveDataKey(parentSaveKey,rule.dataKey, dataResult), {});
                    }
                });
            } else {
                if(this.isRegExp(rule.dataTest)) {
                    dataResult = this.matchRegExp(domResult, rule.dataTest);
                } else if(this.isFunction(rule.dataTest)) {
                    dataResult = rule.dataTest(domResult);
                }
                if(!this.isEmpty(dataResult)) {
                    this.setValue(this.saveData, this.getSaveDataKey(parentSaveKey,rule.dataKey, dataResult), {});
                }
            }
        }
        return dataResult;
    }
    /**
     * 请求新页面
     * @param link [string] 请求地址
     * @param rule [TypeSpiderConfigurationRule] 页面匹配规则
     * @param fn [Function] 请求结束回调函数
     */
    private requestLink(link: string, rules: TypeSpiderConfigurationRule[],options: TypeRequestLinkOptions, fn?: Function): void {
        this.log("请求页面：" + link, "INFO");
        const rule = rules[0];
        const dataType: TypeSpiderHttpResonseDataType = options.dataType || "Html";
        if(rules && rules.length >0) {
            this.http.get(link)
                .then((resp:TypeHttpResonse) => {
                    if(resp.status.toString() === "200") {
                        let bodyText = resp.text;
                        if(dataType === "Html") {
                            let bodyMatch = bodyText.match(/\<body\s*\>([\s\S]*)\<\/body\s*\>/);
                            if(bodyMatch) {
                                bodyText = bodyMatch[1];
                                const dom = this.htmlParse.parse(bodyText);
                                let domList:any;
                                let saveResult:any;
                                this.virtalDom.init(dom);
                                if(this.isString(rule.test)) {
                                    domList = this.virtalDom.getElementsByClassName(rule.test);
                                } else if(this.isRegExp(rule.test)) {
                                    domList = this.matchRegExp(dom, rule.test);
                                } else if(this.isFunction(rule.test)) {
                                    domList = rule.test(dom);
                                }
                                if(rule.isSave) {
                                    saveResult = this.checkSaveNode(domList, rule, options.saveDataKey);
                                }
                                const ajaxFn = (notMatchDom?: boolean) => {
                                    let nextKey = options.saveDataKey;
                                    if(!this.isEmpty(saveResult) && (this.isString(saveResult) || this.isNumeric(saveResult))) {
                                        nextKey = this.getSaveDataKey(nextKey, saveResult);
                                    }
                                    if(typeof rule.afterRequest === "function") {
                                        // 调用自定义解析方法
                                        const afterResult = rule.afterRequest({
                                            htmlCode: resp.text,
                                            bodyDom: dom,
                                            reqLink: link,
                                            rules,
                                            dataKey: nextKey
                                        });
                                        const afterRule = rules.length>1 ? [rules[1]] : [];
                                        if(afterResult.resultType === "VirtualDom") {
                                            this.checkContentByRule(afterRule, <IVirtualElement[]>afterResult.data, rule.isData, nextKey, fn);
                                        } else {
                                            const linkList: TypeSpiderAfterRequestCallbackResultData[] = <TypeSpiderAfterRequestCallbackResultData[]>(afterResult.data || []);
                                            if(linkList.length >0) {
                                                const linkParam: TypeQueueCallParam[] = [];
                                                linkList.forEach((myLink: TypeSpiderAfterRequestCallbackResultData) => {
                                                    linkParam.push({
                                                        id: "linkRequest" + linkParam.length,
                                                        params: myLink
                                                    });
                                                });
                                                // tslint:disable-next-line: no-floating-promises
                                                queueCallFunc(linkParam, (myOption, param:TypeSpiderAfterRequestCallbackResultData): Promise<any> => {
                                                    return new Promise<any>((resolve, reject) => {
                                                        this.requestLink(param.data, param.rules, {
                                                            saveDataKey: options.saveDataKey,
                                                            dataType: param.dataType
                                                        }, () => {
                                                            resolve("request complete");
                                                        });
                                                    });
                                                }).then(() => {
                                                    fn(true);
                                                }).catch(() => {
                                                    fn(false);
                                                });
                                            } else {
                                                fn();
                                            }
                                        }
                                    } else {
                                        if(notMatchDom) {
                                            this.log("请求页面结束（没有查询到符合规则的数据）!", "WARN");
                                        }
                                        fn(); // 没有配置页面解析方法，直接执行下一个任务
                                    }
                                };
                                if(domList && domList.length>0) {
                                    let nextKey = this.getSaveDataKey(options.saveDataKey, rule.dataKey);
                                    if(!this.isEmpty(saveResult) && (this.isString(saveResult) || this.isNumeric(saveResult))) {
                                        nextKey = this.getSaveDataKey(nextKey, saveResult);
                                    }
                                    this.checkContentByRule(rule.rules, domList, rule.isData, nextKey, ajaxFn);
                                } else {
                                    ajaxFn(true);
                                }
                            } else {
                                this.log(bodyText, "ERROR");
                                typeof fn === "function" && fn(false);
                            }
                            bodyMatch = null;
                        } else {
                            // goto json load module
                            this.checkJsonContentByRules(
                                rules.splice(0,1),
                                JSON.parse(bodyText),
                                rule.isData,
                                this.getSaveDataKey(options.saveDataKey, rule.dataKey)
                            ).then(() => {
                                fn();
                            }).catch((error) => {
                                this.log(error.message, "ERROR");
                                // tslint:disable-next-line: no-console
                                console.log(error);
                                fn();
                            });
                        }
                    } else {
                        this.log(resp.statusType.toString(), "ERROR");
                        typeof fn === "function" && fn(false);
                    }
                }).catch((err) => {
                    this.log(err, "ERROR");
                    // tslint:disable-next-line: no-console
                    console.log(err);
                    typeof fn === "function" && fn(false);
                });
        } else {
            this.log(`请求失败：[${link}], 配置错误：`, "ERROR");
            // tslint:disable-next-line: no-console
            console.log(rules);
        }
    }
    private checkJsonContentByRules(rules: TypeSpiderConfigurationRule[], jsonData:any, isMatchData: boolean, saveDataKey: string):Promise<any> {
        return new Promise<any>((resolve, reject):void => {
            if(rules && rules.length > 0 && jsonData) {
                const linkParam: TypeQueueCallParam[] = [];
                const jsonParam: TypeQueueCallParam[] = [];
                const submitApiParam: TypeQueueCallParam[] = [];
                let linkComplete = false;
                let jsonComplete = false;
                let ruleNextKey:string;
                for(let i=0;i<rules.length;i++) {
                    const rule = rules[i];
                    let checkResult:any;
                    let dataResult:any;
                    if(this.isString(rule.test)) {
                        checkResult = this.getValue(jsonData, rule.test);
                    } else if(this.isRegExp(rule.test)) {
                        const cM = JSON.stringify(jsonData).match(rule.test);
                        if(cM) {
                            checkResult = cM[1];
                        }
                    } else if(this.isFunction(rule.test)) {
                        checkResult = rule.test(jsonData);
                    }
                    if(rule.isSave && !rule.isData && (!this.isEmpty(rule.dataKey) || !this.isEmpty(saveDataKey))) {
                        if(this.isString(rule.dataTest)) {
                            dataResult = this.getValue(jsonData, rule.dataTest);
                        } else if(this.isRegExp(rule.dataTest)) {
                            const cM = JSON.stringify(jsonData).match(rule.dataTest);
                            if(cM) {
                                dataResult = cM[1];
                            }
                        } else if(this.isFunction(rule.test)) {
                            dataResult = rule.test(jsonData);
                        }
                        if(this.isString(dataResult) || this.isNumeric(dataResult)) {
                            this.setValue(this.saveData, this.getSaveDataKey(saveDataKey, dataResult), {});
                        } else {
                            this.setValue(this.saveData, this.getSaveDataKey(saveDataKey, rule.dataKey), dataResult);
                        }
                    }
                    let nextKey = this.getSaveDataKey(this.getSaveDataKey(saveDataKey, ruleNextKey), rule.dataKey);
                    if(this.isString(dataResult) || this.isNumeric(dataResult)) {
                        nextKey = this.getSaveDataKey(nextKey, dataResult);
                        ruleNextKey = this.getSaveDataKey(rule.dataKey, dataResult);
                    } else {
                        ruleNextKey = rule.dataKey;
                    }
                    if(rule.isLink) {
                        if(rule.rules && rule.rules.length>0) {
                            linkParam.push({
                                id: "JsonHttpRequest" + linkParam.length,
                                params: {
                                    rules: rule.rules,
                                    saveDataKey: nextKey,
                                    link: checkResult,
                                    dataType: rule.dataType
                                }
                            });
                        }
                    } else {
                        if(!rule.isData && !isMatchData && rule.rules && rule.rules.length>0) {
                            jsonParam.push({
                                id: "jsonNormalParams" + jsonParam.length,
                                params: {
                                    rules: rule.rules,
                                    saveDataKey: nextKey,
                                    checkResult,
                                    isData: !isMatchData ? rule.isData : true,
                                }
                            });
                        } else {
                            if(rule.isData || isMatchData) {
                                this.saveDataField(nextKey, checkResult);
                                this.createOutput();
                                if(rule.saveToApi) {
                                    submitApiParam.push({
                                        id: "submitApiParam" + submitApiParam.length,
                                        params: {
                                            data: checkResult,
                                            key: nextKey,
                                            rule
                                        }
                                    });
                                }
                            }
                        }
                    }
                }
                const checkAllComplete = () => {
                    if(linkComplete && jsonComplete) {
                        resolve("json_load_complete");
                    }
                };
                this.doSubmitToApi(submitApiParam, ():void => { // 优先执行更新数据到API，延迟请求时间，减少被封几率
                    if(linkParam.length <= 0) {
                        linkComplete = true;
                        checkAllComplete();
                    } else {
                        queueCallFunc(linkParam, (xOption, param):Promise<any> => {
                            return new Promise<any>((xresolve) => {
                                this.requestLink(param.link, param.rules, {
                                    saveDataKey: param.saveDataKey,
                                    dataType: param.dataType
                                }, () => {
                                    xresolve();
                                });
                            });
                        }).then(() => {
                            linkComplete = true;
                            checkAllComplete();
                        }).catch((err) => {
                            this.log(err, "ERROR");
                            linkComplete = true;
                            checkAllComplete();
                        });
                    }
                    if(jsonParam.length > 0) {
                        queueCallFunc(jsonParam, (xOption, param) => {
                            return this.checkJsonContentByRules(param.rules, param.checkResult, param.isData, param.saveDataKey);
                        }).then(() => {
                            jsonComplete = true;
                            checkAllComplete();
                        }).catch(() => {
                            jsonComplete = true;
                            checkAllComplete();
                        });
                    } else {
                        jsonComplete = true;
                        checkAllComplete();
                    }
                });
            } else {
                reject({
                    message: jsonData ? "配置解析规则错误" : "解析数据不存在"
                });
            }
        });
    }
    /**
     * 解析虚拟dom树
     * @param rules 解析规则
     * @param domList 虚拟dom树
     * @param isMatchData 标识解析内容是否作为最终数据输出
     * @param saveDataKey 保存数据key
     * @param fn 解析结束的回调
     */
    private checkContentByRule(rules: TypeSpiderConfigurationRule[], domList:IVirtualElement[], isMatchData: boolean, saveDataKey?: string, fn?: Function): void {
        if(domList && domList.length>0 && rules && rules.length>0) {
            const linkRParam: TypeQueueCallParam[] = [];
            const checkParam: TypeQueueCallParam[] = [];
            const submitApiParam: TypeQueueCallParam[] = [];
            let ajaxCompleted = false;
            let normalComplted = false;
            const checkAllComplete = () => {
                if(ajaxCompleted && normalComplted) {
                    typeof fn === "function" && fn();
                }
            };
            for(let i=0;i<domList.length;i++) {
                const item:IVirtualElement = domList[i];
                let isGoOut = false;
                let ruleNextKey: string;
                for(let z=0;z<rules.length;z++) {
                    const rule: TypeSpiderConfigurationRule = rules[z];
                    let myResult:any;
                    let dataResult:any;
                    if(this.isString(rule.test)) {
                        myResult = this.virtalDom.getElementsByClassName(rule.test, item);
                    } else if(this.isRegExp(rule.test)) {
                        myResult = this.matchRegExp(item, rule.test);
                    } else if(this.isFunction(rule.test)) {
                        myResult = rule.test(item);
                    }
                    if(rule.isSave) {
                        dataResult = this.checkSaveNode(myResult, rule, this.getSaveDataKey(saveDataKey, ruleNextKey));
                    }
                    let nextSaveKey = this.getSaveDataKey(saveDataKey, ruleNextKey, rule.dataKey);
                    if(this.isString(dataResult) || this.isNumeric(dataResult)) {
                        nextSaveKey = this.getSaveDataKey(nextSaveKey, dataResult);
                        ruleNextKey = this.getSaveDataKey(rule.dataKey, dataResult);
                    } else {
                        ruleNextKey = rule.dataKey;
                    }
                    if(rule.isLink) {
                        if(this.isString(myResult)) {
                            if(rule.rules && rule.rules.length > 0) {
                                linkRParam.push({
                                    id: "cLink" + linkRParam.length,
                                    params: {
                                        link: myResult,
                                        rules: rule.rules,
                                        saveDataKey: nextSaveKey
                                    }
                                });
                            }
                        } else {
                            this.log("匹配超链接错误，匹配内容不是文本数据");
                        }
                    } else {
                        if(!rule.isData && !isMatchData && rule.rules && rule.rules.length>0) {
                            const subResult = this.isArray(myResult) ? myResult : [myResult];
                            checkParam.push({
                                id: "checkParams" + checkParam.length,
                                params: {
                                    rules: rule.rules,
                                    isData: rule.isData,
                                    checkResult: subResult,
                                    saveDataKey: nextSaveKey
                                }
                            });
                        } else {
                            if(rule.isData || isMatchData) {
                                this.saveDataField(nextSaveKey, myResult);
                                this.createOutput(); // 及时保存文件
                                if(rule.saveToApi) {
                                    submitApiParam.push({
                                        id: "submitApiParam" + submitApiParam.length,
                                        params: {
                                            data: myResult,
                                            key: nextSaveKey,
                                            rule
                                        }
                                    });
                                }
                            }
                        }
                    }
                    if(rule.break) {
                        isGoOut = true;
                        break;
                    }
                }
                if(isGoOut) {
                    break;
                }
            }
            this.doSubmitToApi(submitApiParam, () => { // 有发数据到API优先执行，增加刷新目标网站时间，减少被封的几率
                if(linkRParam.length > 0) {
                    // tslint:disable-next-line: no-floating-promises
                    queueCallFunc(linkRParam, (myOption, param):Promise<any> => {
                        return new Promise((resolve, reject):void => {
                            const myRules: TypeSpiderConfigurationRule[] = param.rules || [];
                            this.requestLink(param.link, myRules, {
                                saveDataKey: param.saveDataKey,
                            }, (success, domBody:IVirtualElement) => {
                                resolve("pass");
                            });
                        });
                    }).then(() => {
                        ajaxCompleted = true;
                        checkAllComplete();
                    }).catch(() => {
                        ajaxCompleted = true;
                        checkAllComplete();
                    });
                } else {
                    ajaxCompleted = true;
                    checkAllComplete();
                }
                if(checkParam.length > 0) {
                    // tslint:disable-next-line: no-floating-promises
                    queueCallFunc(checkParam, (myOption, param):Promise<any> => {
                        return new Promise((resolve, reject):void => {
                            if(param.rules && param.rules.length>0) {
                                this.checkContentByRule(param.rules, param.checkResult, param.isData, param.saveDataKey, () => {
                                    resolve("pass");
                                });
                            } else {
                                this.log("解析失败：未配置解析数据规则。" + saveDataKey, "ERROR");
                                // tslint:disable-next-line: no-console
                                console.log(param.rules);
                                reject("No config rule found");
                            }
                        });
                    }).then(() => {
                        normalComplted = true;
                        checkAllComplete();
                    }).catch(() => {
                        normalComplted = true;
                        checkAllComplete();
                    });
                } else {
                    normalComplted = true;
                    checkAllComplete();
                }
            });
        } else {
            typeof fn === "function" && fn(true);
        }
    }
    private doSubmitToApi(params: TypeQueueCallParam[], fn:Function):void {
        if(params.length > 0) {
            queueCallFunc(params, (option, param):Promise<any> => {
                const rule: TypeSpiderConfigurationRule = param.rule;
                if(rule && typeof rule.submit === "function") {
                    return new Promise<any>((resolve, reject) => {
                        rule.submit(param.data, param.key)
                            .then((resp) => {
                                if(resp.statusCode === 200) {
                                    this.log(`数据提交成功。[${param.key}]`, "PASS");
                                } else {
                                    this.log(`数据提交失败：${resp.message}。 [${param.key}]`, "ERROR");
                                }
                                resolve();
                            }).catch((err) => {
                                this.log("数据提交失败：" + err.message + ` [${param.key}]`, "ERROR");
                                reject();
                            });
                    });
                } else {
                    this.log("提交数据错误，未配置请求API方法。", "ERROR");
                    // tslint:disable-next-line: no-console
                    console.log(rule);
                }
            }).then(() => {
                fn();
            }).catch(() => {
                fn();
            });
        } else {
            fn();
        }
    }
}
