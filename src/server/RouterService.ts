import { Common } from "elmer-common";
import {
    autowired,
    ElmerServiceRequest,
    ElmerVirtualRender,
    routerServiceConfig,
    TypeRouterConfig,
    TypeServiceConfig
} from "elmer-ui-core";
import { IRouter } from "elmer-ui-core/lib/interface/IDeclareComponentOptions";
import { RouterService as RouterServiceModel } from "elmer-ui-core/lib/widget/router/RouterService";
import { HtmlParse, IVirtualElement } from "elmer-virtual-dom";

type TypeRouterServiceOptions = {
    path?: string;
};

export class RouterService extends Common {
    private config:TypeRouterConfig<any, TypeRouterServiceOptions>;
    private serviceConfig: TypeServiceConfig<any, TypeRouterServiceOptions>;
    private entryHtml: string;
    private routerModel: RouterServiceModel = new RouterServiceModel();
    private renderHandler: any;
    @autowired(HtmlParse)
    private htmlHelper: HtmlParse;
    @autowired(ElmerVirtualRender)
    private virtualRender: ElmerVirtualRender;
    constructor() {
        super();
        this.routerModel.setBindRouteComponent({});
    }
    init(handler:any): void {
        this.config = routerServiceConfig.getRouterConfig();
        this.serviceConfig = this.config.service;
        this.entryHtml = global["RouterHtmlCode"];
        this.renderHandler = handler;
    }
    checkAndSendAJAX(locationUrl: string): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            const htmlCode = this.entryHtml || "";
            if(!this.isEmpty(htmlCode)) {
                const nodeData:IVirtualElement = this.htmlHelper.parse(htmlCode);
                const routers:IRouter[] = [];
                if(nodeData.children.length > 0) {
                    this.virtualRender.setComponentData(this.renderHandler, nodeData);
                    this.virtualRender.render();
                    nodeData.children.map((rootItem:IVirtualElement) => {
                        if(rootItem.tagName === "eui-router") {
                            if(rootItem.children.length > 0) {
                                rootItem.children.map((item:IVirtualElement) => {
                                    let tRoute = this.getRouterRules(item);
                                    if(tRoute) {
                                        routers.push(tRoute);
                                    }
                                    tRoute = null;
                                });
                            }
                        }
                    });
                }
                this.routerModel.initConfig(routers, false);
                const curRouter = this.routerModel.checkRoutersVisible(locationUrl, null, null);
                const apiData = this.routerModel.getRouterRequests(curRouter);
                this.routerModel.ajaxAll(apiData).then(() => {
                    console.log("ajaxAll Completed in then liftmethod");
                    resolve();
                }).catch((err:any) => {
                    reject(err);
                });
            } else {
                reject();
            }
        });
    }
    private getRouterRules(nodeData:IVirtualElement): undefined | IRouter {
        if(nodeData) {
            if(nodeData.tagName === "eui-route") {
                return {
                    path: nodeData.props.path,
                    component: nodeData.props.component,
                    props: nodeData.props.props
                };
            }
        }
    }
}
