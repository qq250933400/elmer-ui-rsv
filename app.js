require("./dist/ServerApp");
const path = require("path");

global.startServer({
    htmlCode: path.resolve("./public/views/router.html"),
    htmlCodeFromFile: true,
    config: {
        source: path.resolve(__dirname, "./public/appSource.json")
    },
    handler: {
        loginForm: {
            userName: "elmer",
            password: "123456"
        }
    }
});
