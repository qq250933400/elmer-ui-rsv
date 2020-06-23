import { IVirtualElement } from "elmer-virtual-dom";

export type TypeSpiderConfiguration = {
    links: string[];
    test: string|RegExp|Function;
    host?: string;
    formatLink?: Function;
    rules: TypeSpiderConfigurationRule[];
    taskName?: string;
    description?: string;
};

/**
 * 定义请求url返回内容类型，根据不同类型使用不同数据读取方式，方便于系统解析
 */
export type TypeSpiderHttpResonseDataType = "Html" | "Text" | "Json" | "Binary";

export type TypeSpiderAfterRequestCallbackResultData = {
    data?: any;
    rules: TypeSpiderConfigurationRule[];
    dataType?: TypeSpiderHttpResonseDataType;
};
export type TypeSpiderAfterRequestCallbackResult = {
    data?: TypeSpiderAfterRequestCallbackResultData[] | IVirtualElement[];
    resultType?: "Links" | "Link" | "VirtualDom";
};
export type TypeSpiderAfterRequestOptions = {
    reqLink?: string;
    htmlCode?: string;
    bodyDom?:IVirtualElement;
    rules?: TypeSpiderConfigurationRule[];
    dataKey?: string;
};

export type TypeSpiderConfigurationRule = {
    id?: string;
    test: RegExp | string | Function;
    dataKey?: string;
    dataType?: TypeSpiderHttpResonseDataType;
    dataTest?: RegExp | string | Function;
    isSave?: boolean;
    isData?: boolean;
    isLink?: boolean;
    isNextKey?: boolean;
    rules?: TypeSpiderConfigurationRule[];
    break?: boolean;
    saveToApi?: boolean; // 当isData === true 时生效
    afterRequest?(options?: TypeSpiderAfterRequestOptions):TypeSpiderAfterRequestCallbackResult;
    submit?(data?: any, saveKey?: string):Promise<any>;
};

export default (config:TypeSpiderConfiguration):TypeSpiderConfiguration => {
    return config;
};
