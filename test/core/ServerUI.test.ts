require("mocha")
const assets = require("assert");
import { ServerUI, TypeServerUIConfig } from "../../src/core/ServerUI";
import { StaticCommon } from "elmer-common";

const ui = new ServerUI();

describe("ServerUI Testting", () => {
    describe("Read config Testting", () => {
        const config = ui.getConfig();
        it("entry html template", () => {
            assets.equal(StaticCommon.isEmpty(config.template), false);
        });
        it("Import styles", () => {
            assets.equal(StaticCommon.isArray(config.styles), true);
        });
        it("Import scripts", () => {
            assets.equal(StaticCommon.isArray(config.scripts), true);
        });
        it("getTemplate function test", () => {
            const htmlCode = ui.getTemplate(config);
            assets.equal(StaticCommon.isEmpty(htmlCode), false);
        });
        it("render function test", () => {
            const renderResult = ui.render("<eui-button>Haha</eui-button>", {});
            assets.equal(StaticCommon.isEmpty(renderResult), false);
            console.log(renderResult);
        })
    });
})