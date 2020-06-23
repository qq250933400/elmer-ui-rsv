import { StaticCommon as utils } from "elmer-common";
import { IVirtualElement } from "elmer-virtual-dom";
import HttpHelper from "../server/httpHelper";
import createConfig, { TypeSpiderAfterRequestCallbackResultData } from "./config";

const bURL = "http://yinglie.chinamartyrs.gov.cn";
const http = new HttpHelper();
const filterIlligleChars = (str: string): string => {
    return str.replace(/^\s*/, "")
        .replace(/\s*$/, "")
        .replace(/^[\r\n\t]*/, "")
        .replace(/[\r\n\t]*$/, "")
        .replace(/：$/, "");
};

const getQuery = (link: string, key: string): string => {
    const myLink = link.replace(/^.*\?/, "");
    return utils.getQuery(key, myLink);
};
const isBreak = false;

const submitApi = (data, key) => {
    return new Promise<any>((resolve, reject) => {
        // /api/test/updateBlackList
        http.post({
            url: "https://bj.uzhutm.com/public/index.php/api/test/updateBlackList",
            // url: "http://localhost/api/public/index.php/api/test/updateBlackList",
            data: {
                data,
                key
            }
        }).then((resp):void => {
            const jsonData = JSON.parse(resp.text);
            if(jsonData.statusCode !== 200) {
                reject({
                    statusCode: 500,
                    message: jsonData.message
                });
            } else {
                resolve({
                    statusCode: 200,
                    message: "Success"
                });
            }
        }).catch((error) => {
            reject({
                statusCode: 500,
                message: error.message
            });
        });
    });
};

export default createConfig({
    links: ["http://yinglie.chinamartyrs.gov.cn/LieShiYingMingLu/index.html"],
    test: ".region,.region1",
    taskName: "英烈网商标禁注词抓取",
    description: "抓取禁注词用于检测注册商标名称是否属于禁注词.",
    rules: [
        {
            test: "a", // 匹配首页省份链接
            isData: false,
            break: isBreak,
            rules: [{
                isLink: true,
                break: isBreak,
                test: (link: IVirtualElement) => {
                    const url = link.props.href || "";
                    const queryString = url.replace(/^.*\?/, "");
                    const id = utils.getQuery("id", queryString);
                    return `http://yinglie.chinamartyrs.gov.cn/LieShiYingMingLu/${id}/province.html`;
                },
                rules: [
                    {
                        test: ".shiji",
                        dataKey: "city",  //
                        break: isBreak,
                        rules: [
                            {
                                isSave: true,
                                isNextKey: true,
                                id: "nextTest",
                                dataTest: (dom:IVirtualElement) => {
                                    return filterIlligleChars(dom.children[0].innerHTML);
                                },
                                test: (dom:IVirtualElement) => {
                                    return dom.children[0];
                                }
                            },
                            {
                                test: "a", // 匹配城市链接
                                isSave: false,
                                break: isBreak,
                                rules: [
                                    {
                                        test: "text",
                                        isSave: true,
                                        break: isBreak,
                                        isNextKey: true,
                                        id: "test",
                                        dataTest: (dom: IVirtualElement) => {
                                            return filterIlligleChars(dom.innerHTML);
                                        },

                                    },
                                    {
                                        isLink: true,
                                        break: isBreak,
                                        test: (dom: IVirtualElement) => {
                                            const str = dom.props.href;
                                            const queryString = str.replace(/^.*\?/, "");
                                            const id = utils.getQuery("id", queryString);
                                            const pid = utils.getQuery("pid", queryString);
                                            return `http://yinglie.chinamartyrs.gov.cn/LieShiYingMingLu/${pid}/${id}/page1.html?mypage=${id}`;
                                        },
                                        rules: [{
                                            test: ".province-c1-ml a",
                                            break: isBreak,
                                            afterRequest: (options) => {
                                                const tMatch = options.htmlCode.match(/\s{1,}totalPage\s*=\s*([0-9]{1,})\s*;/);
                                                const lMatch = options.htmlCode.match(/\s{1,}lastPage\s*=\s*([0-9]{1,})\s*;/);
                                                const id = getQuery(options.reqLink, "mypage");
                                                if (!tMatch) {
                                                    return {};
                                                } else {
                                                    const totalPage = parseInt(tMatch[1], 10);
                                                    const lastPage = lMatch ? parseInt(lMatch[1], 10) : totalPage;
                                                    const links: TypeSpiderAfterRequestCallbackResultData[] = [];

                                                    // if (totalPage > 1) {
                                                    //     for (let i = 2; i <= lastPage; i++) {
                                                    //         const newLink = options.reqLink.replace(/\/page1.html\?.*$/, `/page${i}.html`);
                                                    //         links.push({
                                                    //             data: newLink,
                                                    //             dataType: "Html",
                                                    //             rules: [options.rules[1]]
                                                    //         });
                                                    //         // break;
                                                    //     }
                                                    //     if (lastPage <= totalPage) {
                                                    //         for (let i = lastPage + 1; i < totalPage; i++) {
                                                    //             const ajaxLink = `http://yinglie.chinamartyrs.gov.cn/LieShiYingMingLu/getMatyrListByRegion.action?search.condition=${id}&search.pageNO=${i}&search.pageSize=110`;
                                                    //             links.push({
                                                    //                 data: ajaxLink,
                                                    //                 dataType: "Json",
                                                    //                 rules: [options.rules[2]]
                                                    //             });
                                                    //         }
                                                    //     }
                                                    // }
                                                    return {
                                                        data: links
                                                    };
                                                }
                                            },
                                            rules: [
                                                {
                                                    isData: true,
                                                    saveToApi: false,
                                                    submit: submitApi,
                                                    test: (dom:IVirtualElement):any => {
                                                        const result = [];
                                                        dom.children.forEach((item:IVirtualElement) => {
                                                            result.push(filterIlligleChars(item.children[0].innerHTML));
                                                        });
                                                        return result;
                                                    }
                                                }
                                            ]
                                        }, {
                                            test: ".province-c1-ml>a",
                                            break: true,
                                            saveToApi: true,
                                            rules: [
                                                {
                                                    isData: false,
                                                    saveToApi: true,
                                                    test: (dom: IVirtualElement) => {
                                                        const data = [];
                                                        dom.children.map((a: IVirtualElement) => {
                                                            data.push(filterIlligleChars(a.children[0].innerHTML));
                                                        });
                                                        return data;
                                                    },
                                                    submit: submitApi
                                                }
                                            ]
                                        }, { // Json Response
                                            isData: false,
                                            break: isBreak,
                                            saveToApi: true,
                                            submit: submitApi,
                                            test: (data) => {
                                                const result = [];
                                                if (utils.isArray(data)) {
                                                    data.forEach((item) => {
                                                        result.push(item.name);
                                                    });
                                                }
                                                return result;
                                            }
                                        }]
                                    }
                                ]
                            }
                        ]
                    }
                ]
            }]
        }
    ]
});
