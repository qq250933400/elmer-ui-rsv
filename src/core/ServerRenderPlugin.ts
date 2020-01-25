import { Common } from "elmer-common";
import { connect, ReduxController } from "elmer-redux";
import { autowired, Component, defineGlobalState, getGlobalState, Injectable, IPropCheckRule } from "elmer-ui-core";
import { I18nController } from "elmer-ui-core/lib/i18n/i18nController";
import { IComponent } from "elmer-ui-core/lib/interface/IComponent";
import { IVirtualElement } from "elmer-virtual-dom";
import { TypeRenderPluginRAttrOptions } from "./ServerRenderTypes";

@Injectable("ServerRenderPlugin")
export class ServerRenderPlugin extends Common {
    @autowired(ReduxController, "ReduxController")
    private reduxController: ReduxController;
    @autowired(I18nController)
    private i18nController: I18nController;
    constructor() {
        super();
        this.reduxController.checkInitStateData(getGlobalState, defineGlobalState);
    }
    /**
     * 渲染dom属性扩展
     * @param dom 渲染dom元素
     * @param attrKey 属性名称
     * @param attrValue 属性值
     * @param domData 虚拟dom数据
     */
    injectRenderDomAttribute(attrResultList: Set<string>, classList:Set<string>,options: TypeRenderPluginRAttrOptions): boolean {
        if(attrResultList && options) {
            const attrKey: string = options.attrKey, attrValue: any = options.attrValue, domData: IVirtualElement = options.domData;
            if(domData.tagName === "input" && (/checkbox/.test(domData.props.type) || /radio/.test(domData.props.type))) {
                if(attrKey === "checked") {
                    if((/\s*(true|1)\s*/i.test(attrValue) || /\s*(false|0)\s*/i.test(attrValue))) {
                        if(/\s*(true|1)\s*/i.test(attrValue)) {
                            attrResultList.add("checked='checked'");
                        }
                    } else if(/checked/i.test(attrValue) || this.isEmpty(attrValue)) {
                        if(!this.isEmpty(attrValue)) {
                            attrResultList.add("checked='checked'");
                        }
                    }
                    return true;
                }
            }
            if(/^class\.[a-z0-9\-_]*$/i.test(attrKey)) {
                const myClassName = attrKey.replace(/^class\./,"");
                if(attrValue) {
                    classList.add(myClassName);
                } else {
                    classList.delete(myClassName);
                }
                return true;
            } else if(/^disabled$/.test(attrKey)) {
                if(this.isString(attrValue) && (/\s*(true|1)\s*/i.test(attrValue) || /\s*(false|0)\s*/i.test(attrValue))) {
                    if(/\s*(true|1)\s*/i.test(attrValue)) {
                        attrResultList.add("disabled='disabled'");
                    } else {
                        attrResultList.delete("disabled='disabled'");
                    }
                } else if(typeof attrValue === "boolean") {
                    if(attrValue) {
                        attrResultList.add("disabled='disabled'");
                    } else {
                        attrResultList.delete("disabled='disabled'");
                    }
                }
                return true;
            } else if(/^(id|name|style|class)$/i.test(attrKey)) {
                return this.isEmpty(attrValue);
            }
        }
        return false;
    }
    /**
     * 初始化自定义组件前生命周期函数
     * @param ComponentFactory [Component] 自定义组件原型
     * @param nodeData [IVirtualElement] 自定义组件虚拟Dom数据
     * @param props [object] 传递到自定义组件的属性
     */
    beforeInitComponent(ComponentFactory: Component,nodeData:IVirtualElement, props: any): void {
        const reduxParam = (<any>ComponentFactory).prototype.reduxParams;
        if(reduxParam && (reduxParam.mapStateToProps || reduxParam.mapDispatchToProps)) {
            // 在初始化Component的时候在做connect操作，防止没有使用的组件但是定义了connect,在declareComponent的时候增加不必要的redux watch
            connect((<any>ComponentFactory),reduxParam.mapStateToProps, reduxParam.mapDispatchToProps, getGlobalState, defineGlobalState);

            const stateValue = this.reduxController.getStateByConnectSelector((<any>ComponentFactory).prototype.selector);
            const dispatchValue= this.reduxController.getDispatchByConnectSelector((<any>ComponentFactory).prototype.selector);
            stateValue && this.extend(props, stateValue, true);
            dispatchValue && this.extend(props, dispatchValue, true);
        }
        this.setDefaultValue(props, (<any>ComponentFactory).propType);  // 在创建组件object之前对props做默认值检查
    }
    /**
     * 初始化自定义组件结束
     * @param ComponentFactory [Component] 自定义组件原型
     * @param component [object] 自定义组件对象
     * @param nodeData [IVirtualElement] 自定义组件虚拟dom数据
     */
    initComponent(ComponentFactory: Component, component:any, nodeData:IVirtualElement): void {
        // 初始化Redux
        const reduxParam = (<any>ComponentFactory).prototype.reduxParams;
        this.i18nController.initI18nTranslate(component);
        if(reduxParam && (reduxParam.mapStateToProps || reduxParam.mapDispatchToProps)) {
           this.reduxController.checkInitComponents(component, (<any>ComponentFactory).prototype.selector, nodeData);
        }
    }
    setDefaultValue(props:any, checkRules: any): void {
        if(this.isObject(props) && this.isObject(checkRules)) {
            // const propsKey = Object.keys(props);
            Object.keys(checkRules).map((propKey:string) => {
                if(this.isObject(checkRules[propKey])) {
                    const tmpCheckRule:IPropCheckRule = checkRules[propKey];
                    if(this.isEmpty(props[propKey])) {
                        if(tmpCheckRule.defaultValue !== undefined) {
                            delete props[propKey];
                            this.defineReadOnlyProperty(props, propKey, tmpCheckRule.defaultValue);
                        }
                    }
                    if(typeof tmpCheckRule.rule === "function" && tmpCheckRule.rule["type"] === "number") {
                        if(!isNaN(props[propKey]) && this.isString(props[propKey])) {
                            const curValue = /\./.test(props[propKey]) ? parseFloat(props[propKey]) : parseInt(props[propKey], 10);
                            delete props[propKey];
                            this.defineReadOnlyProperty(props, propKey, curValue);
                        }
                    }
                }
            });
        }
    }
    checkPropTypes(targetComponent:IComponent, ComponentClass:any): void {
        const propTypes = ComponentClass["propType"] || {};
        const propKeys = Object.keys(propTypes) || [];
        if(propKeys.length>0) {
            this.checkPropTypesCallBack(targetComponent, propTypes);
        }
    }
    protected checkPropTypesCallBack(target: any,checkRules: any): void {
        Object.keys(checkRules).map((tmpKey: any) => {
            let checkRuleData:IPropCheckRule|Function  = checkRules[tmpKey];
            if(this.isFunction(checkRuleData)) {
                this.doCheckPropType(target, tmpKey, checkRuleData);
            } else if(this.isObject(checkRuleData)) {
                let checkData:IPropCheckRule = checkRuleData;
                if(this.isFunction(checkData.rule)) {
                    this.doCheckPropType(target, tmpKey, <Function>checkData.rule);
                }
                // 定义propertyKey 自动mapping值到组件定义属性上
                if(!this.isEmpty(checkData.propertyKey)) {
                    target[checkData.propertyKey] = target.props[tmpKey];
                }
                // 定义stateKey自动mapping值到state属性上
                if(!this.isEmpty(checkData.stateKey)) {
                    target.state[checkData.stateKey] = target.props[tmpKey];
                }
                checkData = null;
            }
            checkRuleData = null;
        });
    }
    /**
     * 做prop数据类型检查
     * @param target any 检查component
     * @param propertyKey prop属性关键词
     * @param checkCallBack 数据类型检查规则
     */
    protected doCheckPropType(target: any, propertyKey: string, checkCallBack: Function): void {
        const propValue = target.props[propertyKey];
        this.isFunction(checkCallBack) && checkCallBack(propValue, {
            error: (msg: any) => {
                const tagName = target.humpToStr(target["selector"]);
                const sMsg = "组件【eui-"+tagName+"】属性【"+propertyKey+"】设置错误：" + msg;
                // tslint:disable-next-line:no-console
                console.error(sMsg);
            },
            propertyName: propertyKey,
            propertyValue: propValue
        });
    }
}
