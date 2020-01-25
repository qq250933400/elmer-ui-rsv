import { Common } from "elmer-common";
import { defineContext, getContext } from "elmer-redux";
import { autowired, Component, ElmerVirtualRender } from "elmer-ui-core";
import { IDeclareComponent } from "elmer-ui-core/lib/interface/IDeclareComponentOptions";
import { InjectModel } from "elmer-ui-core/lib/middleware";
import { HtmlParse, IVirtualElement, VirtualElement, VirtualElementOperate, VirtualElementsDiff } from "elmer-virtual-dom";
import { ServerRenderPlugin } from "./ServerRenderPlugin";

const autoCloseTagName = /^(input|img|br|hr|link|meta|col|command|track|wbr|source|embed|frame|iframe)$/i;

export type TypeServerRenderOptions = {
    renderComponent: any,
    lineBeginSpaceLength: number;
    lineSpaceStep?: number;
    contextStore?: any;
};

export class ServerRender extends Common {
    private htmlCode: string | IVirtualElement;
    private renderComponent: Component;
    private virtualDomList: any= {};
    private isNeedParse: boolean = true;
    private htmlParseData:IVirtualElement;
    private nodeData:IVirtualElement;
    private lineBeforeSpaceLength: number = 4;
    private lineSpaceStep: number = 2;
    private contextStore:any;

    @autowired(HtmlParse)
    private htmlParse:HtmlParse;

    @autowired(VirtualElementsDiff)
    private virtualDiff:VirtualElementsDiff;

    @autowired(VirtualElement)
    private virtualDom:VirtualElement;

    @autowired(ElmerVirtualRender)
    private virtualRender:ElmerVirtualRender;

    @autowired(InjectModel)
    private injectModel:InjectModel;

    @autowired(ServerRenderPlugin)
    private renderPlugin: ServerRenderPlugin;

    constructor(options:TypeServerRenderOptions) {
        super();
        this.renderComponent = options.renderComponent;
        this.lineBeforeSpaceLength = options.lineBeginSpaceLength;
        this.lineSpaceStep = options.lineSpaceStep || 2;
        this.contextStore = options.contextStore;
        typeof this.renderComponent.$init === "function" && this.renderComponent.$init();
    }
    render(): string {
        let renderResult = "";
        typeof this.renderComponent.$before === "function" && this.renderComponent.$before();
        if(
            !(<any>this.renderComponent).template ||
            this.isEmpty((<any>this.renderComponent).template.url) ||
            ((<any>this.renderComponent).template && !this.isEmpty((<any>this.renderComponent).template.url) && (<any>this.renderComponent).template.fromLoader)
            ) {
            const htmlCode = this.renderComponent.render();
            this.setHtmlCode(htmlCode);
            renderResult = this.renderHtml();
            // this.afterRender();
        } else {
            let ajaxHtmlCode = "";
            let ajaxHtmlCodeLoadCompleted = false;
            let beginTime = (new Date()).getTime();
            let endTime = beginTime;
            let timeout = (<any>this.renderComponent).template.timeout || 6000;
            // 异步加载模版信息
            this.renderComponent.loadTemplate((<any>this.renderComponent).template.url, (<any>this.renderComponent).template.isEndPoint, (<any>this.renderComponent).template.ajaxType).then((resp:any) => {
                ajaxHtmlCodeLoadCompleted = true;
                ajaxHtmlCode = resp;
                this.setHtmlCode(ajaxHtmlCode);
            }).catch((err:any) => {
                ajaxHtmlCodeLoadCompleted = true;
                ajaxHtmlCode = err.statusText || err.message || "<h6>Load Template fail.</h6>";
            });
            while(!ajaxHtmlCodeLoadCompleted) {
                endTime = (new Date()).getTime();
                const effTime = (endTime - beginTime);
                if(effTime > timeout) {
                    break;
                }
            }
            beginTime = null;
            endTime = null;
            timeout = null;
            this.setHtmlCode(ajaxHtmlCode);
            renderResult = this.renderHtml();
            // this.afterRender();
        }
        return renderResult;
    }
    private setHtmlCode(nHtmlCode: any): void {
        let htmlCodeData = null;
        if(this.getType(nHtmlCode) === "[object Module]") {
            htmlCodeData = nHtmlCode.default;
            if(this.isString(htmlCodeData)) {
                this.isNeedParse = this.htmlCode !== htmlCodeData;
            } else {
                this.isNeedParse = false;
                this.htmlParseData = htmlCodeData;
            }
        } else {
            htmlCodeData = nHtmlCode;
            if(this.isString(htmlCodeData)) {
                this.isNeedParse = this.htmlCode !== htmlCodeData;
            } else {
                this.htmlParseData = htmlCodeData;
                this.isNeedParse = false;
            }
        }
        this.htmlCode = htmlCodeData || "";
    }
    private renderHtml(): string {
        let sourceDom = this.virtualDom.create("VirtualRoot");
        let oldDom:IVirtualElement = this.nodeData || this.virtualDom.create("VirtualRoot");
        if(!this.htmlParseData || this.isNeedParse) {
            if(!this.isEmpty(this.htmlCode)) {
                if(this.isString(this.htmlCode)) {
                    this.htmlParseData = this.htmlParse.parse(this.htmlCode, (<any>this.renderComponent).selector);
                    sourceDom = JSON.parse(JSON.stringify(this.htmlParseData));
                } else {
                    // tslint:disable-next-line:no-console
                    console.error(this.htmlCode, "----This Component don't need to parse code");
                }
            } else {
                this.htmlParseData = sourceDom;
            }
        } else {
            sourceDom = JSON.parse(JSON.stringify(this.htmlParseData));//
        }
        // -----虚拟dom渲染，先将逻辑和数据渲染到虚拟dom上
        typeof this.renderComponent.$beforeVirtualRender === "function" && this.renderComponent.$beforeVirtualRender(sourceDom);
        this.virtualRender.setComponentData(this.renderComponent, sourceDom);
        this.virtualRender.render();
        // -----在做diff操作前需先判断从父组件传过来影响显示或隐藏的属性
        if(this.renderComponent.props && (!this.isEmpty(this.renderComponent.props.if) || !this.isEmpty(this.renderComponent.props.show))) {
            sourceDom.children.map((tmpSource:IVirtualElement, index:number) => {
                if(!this.isEmpty(this.renderComponent.props.if)) {
                    tmpSource.props.if = this.renderComponent.props.if;
                }
                if(!this.isEmpty(this.renderComponent.props.show)) {
                    tmpSource.props.show = this.renderComponent.props.show;
                }
            });
        }
        typeof this.renderComponent.$afterVirtualRender === "function" && this.renderComponent.$afterVirtualRender(sourceDom);
        const updateChildren = this.renderComponent.props ? this.renderComponent.props.children : [];
        this.replaceContent(sourceDom, updateChildren); // 替换元素需提前做否则影响渲染过程
        typeof this.renderComponent.$beforeDiff === "function" && this.renderComponent.$beforeDiff(sourceDom);
        this.virtualDiff.diff(sourceDom, oldDom, (<any>this.renderComponent).selector);
        typeof this.renderComponent.$afterDiff === "function" && this.renderComponent.$afterDiff(sourceDom);
        const beforeRenderResult = this.isFunction(this.renderComponent["$beforeRender"]) ? this.renderComponent["$beforeRender"](sourceDom, oldDom) : null;
        oldDom = null;
        if(beforeRenderResult === null || beforeRenderResult === undefined || beforeRenderResult) {
            this.nodeData = sourceDom;
            // -------------渲染虚拟dom获取最终生成的html代码, 和客户端渲染的差别是不需要渲染事件，不需要渲染样式，不需要生成真实dom元素
            // this.renderNodeDataToDOM(sourceDom, this.virtualTarget, true);
            return this.renderNodeDataToCode(sourceDom, this.lineBeforeSpaceLength);
        } else {
            return "";
        }
    }
    private replaceContent(checkItem:IVirtualElement, children: IVirtualElement[]): void {
        // 当前component接收到children的时候才需要执行此方法，为减少循环提升性能
        if(children && children.length>0) {
            for(let i=0;i<checkItem.children.length;i++) {
                const uItem = checkItem.children[i];
                if(uItem.status !== "DELETE") {
                    // --- 检测Item是否包含Content元素，检测到，替换为children
                    if(/\<content\s*\>\s*\<\/content\s*\>/.test(uItem.innerHTML) || /\<content\s*\/\>/.test(uItem.innerHTML) || uItem.tagName === "content") {
                        // 检测到当前dom是content元素或者包含content元素，
                        // 其他dom结构不用再做，
                        if(uItem.tagName === "content") {
                            for(let j=0,mLen = children.length;j<mLen;j++) {
                                children[j].isContent = true;
                            }
                            this.virtualDom.init(checkItem);
                            this.virtualDom.replaceAt(children, i);
                            this.virtualDom.clear();
                        } else {
                            // 执行下一层搜索
                            this.replaceContent(checkItem.children[i], children);
                        }
                        break;
                    }
                }
            }
        }
    }
    private renderNodeDataToCode(nodeData:IVirtualElement, spaceLen?: number): string {
        let result = "";
        nodeData.children.map((itemNode:IVirtualElement, index:number) => {
            if(nodeData.isContent) {
                itemNode.isContent = nodeData.isContent;
            }
            result += this.nodeDateToCode(itemNode, spaceLen);
        });
        return result;
    }
    private nodeDateToCode(nodeData:IVirtualElement, spaceLen?: number): string {
        let result = "";
        let tagName = nodeData.tagName;
        let currentSpaceLength = spaceLen || 0;
        let currentSpaceStr = " ".repeat(currentSpaceLength);
        // tslint:disable: quotemark
        if(!this.isEmpty(tagName) && nodeData.status !== "DELETE") {
            let defineComponent = this.getValue(global, `elmerData.components.${tagName}`);
            if((defineComponent === undefined || defineComponent === null) && this.isArray((<any>this.renderComponent).components)) {
                let components:IDeclareComponent[] = <IDeclareComponent[]>(<any>this.renderComponent).components;
                for(const key in components) {
                    if(components[key].selector === nodeData.tagName) {
                        defineComponent = components[key].component;
                        break;
                    }
                }
                components = null;
            }
            if(this.isFunction(defineComponent)) {
                result = this.renderUserComponent(nodeData, <any>defineComponent, currentSpaceLength);
            } else {
                if (!this.isEmpty(tagName) && !/^\<\!--/i.test(tagName) && !/^text$/i.test(tagName) && !/^content$/i.test(tagName)) {
                    const dataProps = nodeData.props || {};
                    const attrCode = this.renderAttributeCode(nodeData);
                    if(!/^script$/i.test(tagName)) {
                        result += `${currentSpaceStr}<${tagName} ${attrCode}`;
                        if(!autoCloseTagName.test(tagName)) {
                            result += ">";
                            result += '\r\n';
                            if (/^html$/i.test(dataProps.dataType) || /^html$/i.test(dataProps["data-type"]) || tagName === "style") {
                                result += nodeData.innerHTML;
                            } else {
                                result += this.renderNodeDataToCode(nodeData, currentSpaceLength + this.lineSpaceStep);
                            }
                            result += `${currentSpaceStr}</${tagName}>`;
                        } else {
                            result += "/>";
                        }
                    } else {
                        result += "<noscript>Error: Script not allow in htmlCode.</noscript>";
                    }
                    result += '\r\n';
                } else {
                    if(/^\<\!--/i.test(tagName)) {
                        result += `${currentSpaceStr}<!--${nodeData.innerHTML || ''}-->` + '\r\n';
                    } else {
                        result += currentSpaceStr + (nodeData.innerHTML || "").replace(/^[\s\r\n]*/, "").replace(/[\s\r\n]*$/,"") + '\r\n';
                    }
                }
            }
        }
        tagName = null;
        currentSpaceLength = null;
        currentSpaceStr = null;
        // tslint:enable: quotemark
        return result;
    }
    private renderAttributeCode(domData: IVirtualElement): string {
        if(domData.props && (domData.status === VirtualElementOperate.APPEND || domData.status === VirtualElementOperate.UPDATE)) {
            let hasVisibleCheck = false;
            let hasVisibleCheckValue = null;
            let lastCheckProps = {};
            const changeProps = domData.status === VirtualElementOperate.UPDATE ? domData.changeAttrs : domData.props;
            const attrKeyList = changeProps ? Object.keys(changeProps) : [];
            const attrResultList = new Set<string>();
            const classList = new Set<string>();
            attrKeyList.map((attrKey: string) => {
                const attrKeyValue = this.humpToStr(attrKey);
                if(!/^\s*(show|em\:show)$\s*/i.test(attrKeyValue)) {
                    if(attrKeyValue !== "class") {
                        if(!/class\./.test(attrKey)) {
                            if (!this.renderPlugin.injectRenderDomAttribute(attrResultList,classList, {
                                attrKey,
                                attrValue: changeProps[attrKey],
                                component: this.renderComponent,
                                domData
                            })) {
                                attrResultList.add([attrKeyValue, "=", JSON.stringify(changeProps[attrKey])].join(""));
                            }
                        } else {
                            lastCheckProps[attrKey] = attrKeyValue;
                        }
                    } else {
                        const classData:string = domData.props[attrKey] || "";
                        const classArr = classData.split(" ");
                        if(classArr && classArr.length>0) {
                            classArr.map((tmpClassName: string) => {
                                if(!this.isEmpty(tmpClassName)) {
                                    classList.add(tmpClassName);
                                }
                            });
                        }
                    }
                } else {
                    hasVisibleCheck = true;
                    hasVisibleCheckValue = domData.props[attrKey];
                }
            });
            // 放到最后做值修改，放在更新class属性时被覆盖掉
            if(hasVisibleCheck) {
                if(hasVisibleCheckValue) {
                    classList.delete("eui-display-none-imp");
                    classList.add("eui-display-block-imp");
                } else {
                    classList.add("eui-display-none-imp");
                    classList.delete("eui-display-block-imp");
                }
            }
            let tmpKeys = Object.keys(lastCheckProps);
            if(tmpKeys.length>0) {
                tmpKeys.map((tmpCheckKey: string) => {
                    const propsValue = domData.props[tmpCheckKey];
                    const propsKey = this.humpToStr(tmpCheckKey);
                    if(!this.renderPlugin.injectRenderDomAttribute(attrResultList, classList, {
                        attrKey: tmpCheckKey,
                        attrValue: propsValue,
                        component: this.renderComponent,
                        domData
                    })) {
                        attrResultList.add([propsKey, "=", JSON.stringify(propsValue)].join(""));
                    }
                });
            }
            tmpKeys = null;
            lastCheckProps = null;
            // 由于服务器只在前端请求的时候渲染一次，只要不切换页面，后续的渲染工作都在客户端，所以不需要对旧的属性是否存在做判断了
            // 删除不存在的属性(不需要做此操作)，和客户端渲染的区别
            if(classList.size > 0) {
                attrResultList.add(["class=", '"', Array.from(classList).join(" "), '"'].join(""));
            }
            // 为了让前端第一次渲染的时候能够match所有的dom需要增加path和class-name属性以便于做判断，
            attrResultList.add("data-rsv-path=" + JSON.stringify(domData.path.join("-")));
            attrResultList.add("data-rsv-class=" + JSON.stringify(this.renderComponent["selector"] || "Root"));
            return attrResultList.size > 0 ? Array.from(attrResultList).join(" ") : "";
        } else {
            // tslint:disable-next-line:no-console
            console.error("渲染dom属性失败：", domData.tagName, "Status: ", domData.status, "props:", domData.props);
            return "";
        }
    }
    private getUserComponentEvents(nodeData:IVirtualElement): any {
        const result = {};
        nodeData.events.map((tmpEvent:any) => {
            if(this.isFunction(tmpEvent.callBack)) {
                result[tmpEvent.eventName] = tmpEvent.callBack.bind(tmpEvent.handler.owner);
            }
        });
        return result;
    }
    private getComponentChildren(nodeData: IVirtualElement): any {
        const children:IVirtualElement[] = [];
        nodeData.children && nodeData.children.map((tmpItem:IVirtualElement) => {
            if((tmpItem.tagName === "text" && !this.isEmpty(tmpItem.innerHTML)) || tmpItem.tagName !== "text") {
                children.push(tmpItem);
            }
        });
        return children;
    }
    private renderUserComponent(nodeData:IVirtualElement, ComponentFactory:Component, lineBeforeSpaceLength:number): string {
        let result = "";
        if(nodeData.status !== "DELETE") {
            let props = nodeData.props || {};
            this.defineReadOnlyProperty(props, "children", this.getComponentChildren(nodeData));
            this.extend(props, this.getUserComponentEvents(nodeData), true);
            this.renderPlugin.beforeInitComponent(ComponentFactory, nodeData, props);

            let component = new (<any>ComponentFactory)(props, getContext(this, (<any>ComponentFactory).contextType, "contextStore"));
            const getChildrenContext = component.getChildrenContext;
            const mapContextData = typeof getChildrenContext === "function" ? getChildrenContext() : null;
            const childContextData = mapContextData ? defineContext(this, {
                contextData: mapContextData,
                saveAttrKey: "contextStore"
            }) : null;
            let render = new ServerRender({
                renderComponent: component,
                lineBeginSpaceLength: lineBeforeSpaceLength,
                contextStore: childContextData
            });
            this.renderPlugin.initComponent(ComponentFactory, component, nodeData);
            // 初始化自定义组件引用的model和service模块
            this.injectModel.inject(component, component["injectModel"], "model", false);
            this.injectModel.inject(component, component["injectService"], "service", true);
            // 当有model或service模块被注入时执行$inject方法
            if((component["model"] && Object.keys(component["model"]).length>0) || (component["service"] && Object.keys(component["service"]).length>0)) {
                this.isFunction(component["$inject"]) && component["$inject"]();
            }
            // 开始渲染自定义组件
            result = render.render();

            this.defineReadOnlyProperty(component, "domData", render.nodeData);
            // 服务端渲染不执行和事件有关的生命周期函数,整个渲染只执行一次
            component = null;
            render = null;
            props = null;
        }
        return result;
    }
}
