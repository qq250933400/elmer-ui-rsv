require("mocha")
const assets = require("assert");
const spiderNode = require("../../src/spider/node");
const SpiderCore = require("../../src/spider/core").default;


const spider = new SpiderCore();

describe("Test Spider module", () => {
    before(()=>{
        process.argv.push("-config");
        process.argv.push("bbbb");
        process.argv.push("--config");
        process.argv.push("aaaa");
        process.argv.push("mode=bbbb");
        process.argv.push("swift");
    });
    describe("Test Spider/node.ts -->method: getArgv", () => {
        it("given -config bbbb and params key is -config then result should be bbbb", () => {
            assets.equal(spiderNode.getArgv("-config"), "bbbb");
        });
        it("given --config aaaa and params key is --config then result should be aaaa", () => {
            assets.equal(spiderNode.getArgv("--config"), "aaaa");
        });
        it("given params key is aaaa then result should be undefined", () => {
            assets.equal(spiderNode.getArgv("aaaa"), undefined);
        });
        it("given mode=bbbb and params key is mode then result should be bbbb", () => {
            assets.equal(spiderNode.getArgv("mode"), "bbbb");
        });
        it("given swift and params key is swift then result should be true", () => {
            assets.deepEqual(spiderNode.getArgv("swift"), true);
        });
    });
    describe("Test Spider/core.ts --> saveDataField", () => {
        it("given key == test and data == 2 and data = 3 then save data shoulde be [2,3]", () => {
            spider.saveDataField("test", 2);
            spider.saveDataField("test", 3);
            assets.equal(JSON.stringify(spider.saveData.test), JSON.stringify([2,3]));
        });
        it("given key == demo.data and data == 2 and data = 3 then save data shoulde be [2,3]", () => {
            spider.saveDataField("demo.data", 2);
            spider.saveDataField("demo.data", 3);
            spider.saveDataField("demo.data", 4);
            assets.equal(JSON.stringify(spider.saveData.demo.data), JSON.stringify([2,3,4]));
        });
        it("when saveData has the attribute of overrideKey === aaaa, given key === overrideKey and value === bbbb  then spider.saveData.overrideKey should be [aaaa,bbbb]", () => {
            spider.setValue(spider.saveData, "overrideKey", "aaaa");
            spider.saveDataField("overrideKey", "bbbb");
            assets.equal(JSON.stringify(spider.saveData.overrideKey), JSON.stringify(["aaaa", "bbbb"]));
        });
        it("when saveData has the attribute of overrideKey1.test === aaaa, given key === overrideKey1.test and value === bbbb  then spider.saveData.overrideKey1.test should be [aaaa,bbbb]", () => {
            spider.setValue(spider.saveData, "overrideKey1.test", "aaaa");
            spider.saveDataField("overrideKey1.test", "bbbb");
            assets.equal(JSON.stringify(spider.saveData.overrideKey1.test), JSON.stringify(["aaaa", "bbbb"]));
        });
        it("when saveData has the attribute of arraydata === [11,22], given key === arraydata and value === [33] then spider.arraydata should be [11,22,33] ", () => {
            spider.setValue(spider.saveData, "arraydata", [11,22]);
            spider.saveDataField("arraydata", [33]);
            assets.equal(JSON.stringify(spider.saveData.arraydata), JSON.stringify([11,22,33]));
        });
        it("setValue should be ok, given key === city.北京市.东城区 and value = 1 then a.city.北京市.东城区 should be 1", () => {
            const a = {};
            spider.setValue(a, "city.北京市", {});
            spider.setValue(a, "city.北京市.东城区", 1);
            spider.setValue(a, "ha", "mine");
            assets.equal(spider.getValue(a, "city.北京市.东城区"), 1);
        });
    });
});
