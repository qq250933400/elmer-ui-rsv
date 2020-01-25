require("../init/global_vars");  // define elmer-ui needs all global vars
require("mocha");
const assets = require("assert");

describe("Test init application", () => {
    it("Init action", () => {
        assets.equal(typeof global["window"], "object");
    })
});