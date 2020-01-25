// tslint:disable-next-line: no-var-requires
const express = require("express");
const router = express.Router();

import "elmer-common-ui";
import { Request, Response } from "express";
import { ServerRender } from "./core/ServerRender";
import { ServerUI } from "./core/ServerUI";
import { TypeStartServerOptions } from "./paramTypes";
import { RouterService } from "./server/RouterService";
import { ReadLocationFromUrlString } from "./server/static";

const ui = new ServerUI();
const routerService = new RouterService();
// tslint:disable-next-line: prefer-const
let uiRender:ServerRender;

const uiRenderCallByRouter = (request:Request, response:Response) => {
    const option:TypeStartServerOptions = global["startOptions"] || {};
    const renderHandler = option.handler || {};
    let url = request.url || "";
    url = url.replace(/[\s\S]*\/content/i, "");
    const location = ReadLocationFromUrlString(url);
    ui.setValue(global["window"], "location", location);
    ui.setValue(global, "location", location);
    // tslint:disable-next-line: no-console
    console.log("Route: ", location);
    routerService.init(renderHandler);
    routerService.checkAndSendAJAX(location.href).then(() => {
        if(!uiRender) {
            response.send(ui.render(global["RouterHtmlCode"], renderHandler, uiRender, location));
        } else {
            response.send(uiRender.render());
        }
    }).catch((err) => {
        response.send(`<h5>${JSON.stringify(err, null, 4)}</h5>`);
    });
};

router.get(/^\/content\//i, (req, res, next) => {
    uiRenderCallByRouter(req, res);
});
router.get(/^\/content$/i, (req, res, next) => {
    uiRenderCallByRouter(req, res);
});
router.get("/content", (req, res, next) => {
    uiRenderCallByRouter(req, res);
});
router.get("/", (req, res, next) => {
    res.send("<h5>Please entry content module</h5>");
});

module.exports = router;
