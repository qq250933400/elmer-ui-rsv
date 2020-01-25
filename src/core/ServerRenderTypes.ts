import { IVirtualElement } from "elmer-virtual-dom";

export type TypeRenderPluginRAttrOptions = {
    attrKey: string;
    attrValue: string;
    domData: IVirtualElement;
    component: any;
};
